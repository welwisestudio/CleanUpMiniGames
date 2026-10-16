import { SFX, MIX, MUSIC_FILE, CELEBRATION } from '../content/audio.js';

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

  // ---- celebration policy (CELEBRATION in content/audio.js) ------------------------------
  _count(id) {
    this.log[id] = (this.log[id] ?? 0) + 1;
  }

  // Plays a raw clip (level-complete pool); same gates as play().
  _clip(c, group, tag) {
    this.requested += 1;
    this._count(tag);
    if (!this.canPlay || !this.sound || !this.sound.game.cache.audio.exists(c.key)) return false;
    const ok = this.sound.play(c.key, { volume: Math.min(1, MIX[group] * (c.gain ?? 1)), rate: c.rate ?? 1 });
    if (ok) this.played += 1;
    return ok;
  }

  // Stage complete: a short chime only sometimes; otherwise silent.
  stageComplete({ random = Math.random } = {}) {
    if (random() < CELEBRATION.stageChimeChance) return this.play('stage-chime');
    this._count('stage-silent');
    return false;
  }

  // Level complete: always one clip from the pool (never the same one twice in a row); the voiced
  // wow only rarely. Returns { clip: index, wow: boolean }.
  celebrateLevel({ random = Math.random } = {}) {
    const pool = CELEBRATION.levelClips;
    const choices = pool.map((_, i) => i).filter((i) => pool.length < 2 || i !== this.lastLevelClip);
    const i = choices[Math.floor(random() * choices.length) % choices.length];
    this.lastLevelClip = i;
    this._clip(pool[i], 'reward', `level-clip-${i}`);
    const w = CELEBRATION.wow;
    this.completionsSinceWow = (this.completionsSinceWow ?? w.minCompletionsBetween) + 1;
    if (this.completionsSinceWow <= w.minCompletionsBetween || random() >= w.chance) return { clip: i, wow: false };
    this.completionsSinceWow = 0;
    setTimeout(() => this.play('wow'), w.delayMs);
    return { clip: i, wow: true };
  }

  // A reward shown to the player (Wheel): the win jingle only for a big one.
  rewardFor(reward) {
    const b = CELEBRATION.bigReward;
    const big = (reward?.kind === 'tool' && b.tool) || (reward?.kind === 'coins' && reward.amount >= b.coins) || (reward?.kind === 'gems' && reward.amount >= b.gems);
    return this.play(big ? 'reward-big' : 'reward');
  }

  // A short synthesized piano-like note (minigames): sine + soft overtone with a fast attack and a
  // natural decay; same gates as every effect (Sound setting, YouTube mute, pauses).
  tone(freq, { gain = 0.5, dur = 0.7 } = {}) {
    this.requested += 1;
    const ctx = this.sound?.context;
    if (!this.canPlay || !ctx) return false;
    const t0 = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(Math.min(1, MIX.reward * gain), t0 + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    out.connect(this.sound.masterMuteNode ?? ctx.destination); // through Phaser's master (mute) chain
    for (const [mult, g] of [[1, 1], [2, 0.35], [3, 0.12]]) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      og.gain.value = g;
      o.connect(og).connect(out);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }
    this.played += 1;
    this._count('tone');
    return true;
  }

  // A cannon boom (minigames): a low sine thump sweeping 110 → 38 Hz + a short low-passed noise
  // crack. Synthesized (no file); same gates as every effect; volume from the impact group.
  boom(strength = 1) {
    this.requested += 1;
    const ctx = this.sound?.context;
    if (!this.canPlay || !ctx) return false;
    const t0 = ctx.currentTime;
    const out = ctx.createGain();
    const peak = Math.min(1, MIX.impact * 1.6 * strength);
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    out.connect(this.sound.masterMuteNode ?? ctx.destination);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t0);
    o.frequency.exponentialRampToValueAtTime(38, t0 + 0.5);
    o.connect(out);
    o.start(t0);
    o.stop(t0 + 0.95);
    const len = Math.floor(ctx.sampleRate * 0.35);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const n = ctx.createBufferSource();
    n.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.value = 0.55;
    n.connect(lp).connect(ng).connect(out);
    n.start(t0);
    this.played += 1;
    this._count('boom');
    return true;
  }

  // A filtered noise burst (minigames, 2026-10-16): splash / sizzle / whoosh / radio static / clang
  // body without extra files. `freq` = filter centre, `to` = optional sweep target, `q` = filter Q.
  noise({ dur = 0.35, freq = 1200, to = null, q = 0.8, type = 'bandpass', gain = 0.6, attack = 0.01 } = {}) {
    this.requested += 1;
    const ctx = this.sound?.context;
    if (!this.canPlay || !ctx) return false;
    const t0 = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, Math.min(1, MIX.impact * gain)), t0 + attack);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    out.connect(this.sound.masterMuteNode ?? ctx.destination);
    const len = Math.floor(ctx.sampleRate * (dur + 0.05));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = ctx.createBufferSource();
    n.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    n.connect(f).connect(out);
    n.start(t0);
    n.stop(t0 + dur + 0.05);
    this.played += 1;
    this._count('noise');
    return true;
  }

  // A glassy bell / chime (minigames): inharmonic partials with a long soft decay.
  bell(freq, { gain = 0.4, dur = 1.1 } = {}) {
    this.requested += 1;
    const ctx = this.sound?.context;
    if (!this.canPlay || !ctx) return false;
    const t0 = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(Math.min(1, MIX.reward * gain), t0 + 0.005);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    out.connect(this.sound.masterMuteNode ?? ctx.destination);
    for (const [mult, g] of [[1, 1], [2.76, 0.4], [5.4, 0.18], [8.93, 0.08]]) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      og.gain.setValueAtTime(g, t0);
      og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur / (1 + mult * 0.3));
      o.connect(og).connect(out);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }
    this.played += 1;
    this._count('bell');
    return true;
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
