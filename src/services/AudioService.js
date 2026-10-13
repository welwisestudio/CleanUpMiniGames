import { SFX, MIX, MUSIC_FILE } from '../content/audio.js';

// Single audio gate (Step 9). Every sound goes through here; scenes never touch the sound manager.
//
// - SFX: allowed when the Sound setting is on, the platform allows audio and the game is not paused
//   by the host or an ad (a player pause / Store / chest overlay still has UI sounds);
// - music: ONE looping instance for the whole game (menu, levels, Store, Wheel share it); it plays
//   while the Music setting is on and the platform allows audio, and is paused (not restarted) by
//   the host / an ad; the Music and Sound settings are independent;
// - tool loop: at most ONE sustained tool sound. `toolWork()` is called while a tool really works;
//   the loop starts once (instances are cached per key, never re-created per stroke), keeps playing
//   while work keeps coming and fades out ~0.1 s after the work stops (`update()`); `stopTool()`
//   cuts it on release / stage change / leaving the level;
// - one-shots: a minimum gap per event and at most 3 overlapping copies per file (no harsh stacking).
const HARD_PAUSE = ['host', 'adBusy'];

export const AUDIO_EVENTS = Object.keys(SFX);

export class AudioService {
  constructor({ save, pause }) {
    this.save = save;
    this.pause = pause;
    this.platformAudioEnabled = false; // unknown until the platform reports it
    this.requested = 0;
    this.played = 0;
    this.log = {}; // QA: plays per event
    this.sound = null; // Phaser sound manager (attach)
    this.music = null;
    this.loops = new Map(); // loop key → sound instance (reused)
    this.tool = null; // { key, sound, gain, rate, lastWork, fading }
    this.lastAt = {};
    this.live = new Map(); // file key → playing one-shot count
    pause?.on?.('change', () => this.apply());
    save?.on?.('changed', () => this.apply());
  }

  // Phaser's global sound manager (survives scene changes)
  attach(soundManager) {
    this.sound = soundManager;
    this.apply();
  }

  setPlatformAudio(enabled) {
    this.platformAudioEnabled = Boolean(enabled);
    this.apply();
  }

  _setting(k) {
    return this.save?.loaded ? Boolean(this.save.get(`settings.${k}`)) : false;
  }

  _hardPaused() {
    return HARD_PAUSE.some((r) => this.pause?.has?.(r));
  }

  get canPlay() {
    return Boolean(this._setting('sound') && this.platformAudioEnabled && !this._hardPaused());
  }

  get musicAllowed() {
    return Boolean(this._setting('music') && this.platformAudioEnabled && !this._hardPaused());
  }

  // ---- music ----------------------------------------------------------------------------
  // Starts the single music instance once its file is loaded (idempotent).
  startMusic() {
    if (!this.sound || this.music || !this.sound.game.cache.audio.exists(MUSIC_FILE.key)) return;
    this.music = this.sound.add(MUSIC_FILE.key, { loop: true, volume: MIX.music });
    this.apply();
  }

  apply() {
    const m = this.music;
    if (m) {
      if (this.musicAllowed) {
        if (m.isPaused) m.resume();
        else if (!m.isPlaying) m.play();
      } else if (m.isPlaying) m.pause();
    }
    if (!this.canPlay) this.stopTool();
  }

  // ---- one-shots ------------------------------------------------------------------------
  play(eventId) {
    const e = SFX[eventId];
    if (!e) throw new Error(`Unknown audio event: ${eventId}`);
    this.requested += 1;
    if (!this.canPlay || !this.sound) return false;
    const now = performance.now();
    if (now - (this.lastAt[eventId] ?? -1e9) < (e.minGapMs ?? 45)) return false;
    if ((this.live.get(e.key) ?? 0) >= 3) return false;
    if (!this.sound.game.cache.audio.exists(e.key)) return false;
    this.lastAt[eventId] = now;
    const ok = this.sound.play(e.key, { volume: Math.min(1, MIX[e.group] * e.gain), rate: e.rate ?? 1 });
    if (ok) {
      this.played += 1;
      this.log[eventId] = (this.log[eventId] ?? 0) + 1;
      this.live.set(e.key, (this.live.get(e.key) ?? 0) + 1);
      setTimeout(() => this.live.set(e.key, Math.max(0, (this.live.get(e.key) ?? 1) - 1)), 400);
    }
    return ok;
  }

  // ---- tool loop ------------------------------------------------------------------------
  // Called while the tool really works (valid contact / jet held). spec = content/audio toolSound().
  toolWork(spec) {
    if (!spec) return;
    if (spec.pulse) return void this.play(spec.pulse);
    if (spec.hit) return void this.play(spec.hit);
    if (!spec.loop || !this.canPlay || !this.sound) return;
    const now = performance.now();
    const vol = Math.min(1, MIX.loop * (spec.gain ?? 1));
    let t = this.tool;
    if (t && t.key !== spec.loop) {
      this.stopTool();
      t = null;
    }
    if (!t) {
      let s = this.loops.get(spec.loop);
      if (!s) {
        if (!this.sound.game.cache.audio.exists(spec.loop)) return;
        s = this.sound.add(spec.loop, { loop: true });
        this.loops.set(spec.loop, s);
      }
      s.setRate(spec.rate ?? 1);
      s.setVolume(vol);
      s.play({ loop: true, volume: vol, rate: spec.rate ?? 1, seek: Math.random() * Math.max(0, (s.duration || 0) - 0.2) });
      t = this.tool = { key: spec.loop, sound: s, vol, lastWork: now };
      this.log[spec.loop] = (this.log[spec.loop] ?? 0) + 1;
      this.played += 1;
    }
    t.lastWork = now;
    if (t.sound.volume < t.vol) t.sound.setVolume(t.vol); // a fade was interrupted by new work
  }

  // per frame (LevelScene.update): fade the loop out shortly after the work stops
  update() {
    const t = this.tool;
    if (!t) return;
    const idle = performance.now() - t.lastWork;
    if (idle < 110) return;
    const v = t.vol * Math.max(0, 1 - (idle - 110) / 120);
    if (v <= 0.001) this.stopTool();
    else t.sound.setVolume(v);
  }

  stopTool() {
    const t = this.tool;
    if (!t) return;
    this.tool = null;
    t.sound.stop();
  }

  get toolPlaying() {
    return this.tool?.key ?? null;
  }

  stopAll() {
    this.stopTool();
  }
}
