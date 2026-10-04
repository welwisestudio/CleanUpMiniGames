// Single audio gate. Step 2 has no sound assets (audio is Step 9): every event is
// routed through the gate and counted, but nothing is played yet.
//
// canPlay = player setting AND platform audio allowed AND NOT paused (any reason)

export const AUDIO_EVENTS = [
  'ui-tap',
  'stage-complete',
  'level-complete',
  'coins',
  'chisel-hit',
  'chunk-fall',
  'brush-loop',
  'spray-loop',
  'scrub-loop',
  'washer-loop',
  'cloth-loop',
];

export class AudioService {
  constructor({ save, pause }) {
    this.save = save;
    this.pause = pause;
    this.platformAudioEnabled = false; // unknown until the platform reports it
    this.requested = 0;
    this.played = 0; // stays 0 until real assets exist
  }

  setPlatformAudio(enabled) {
    this.platformAudioEnabled = Boolean(enabled);
  }

  get canPlay() {
    const sound = this.save.loaded ? this.save.get('settings.sound') : false;
    return Boolean(sound && this.platformAudioEnabled && !this.pause.isPaused);
  }

  play(eventId) {
    if (!AUDIO_EVENTS.includes(eventId)) throw new Error(`Unknown audio event: ${eventId}`);
    this.requested += 1;
    if (!this.canPlay) return false;
    // Step 9: look up the asset for eventId and play it here.
    return false;
  }

  stopAll() {
    /* Step 9 */
  }
}
