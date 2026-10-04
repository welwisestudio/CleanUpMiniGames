import { Emitter } from './Emitter.js';

// Independent pause reasons. Removing one reason never clears another:
// a host resume does not lift the player's own pause.
export const PAUSE_REASONS = ['user', 'host', 'adBusy', 'navigationBusy', 'assetsLoading'];

export class PauseState extends Emitter {
  constructor() {
    super();
    this._reasons = new Set();
  }

  set(reason, active) {
    if (!PAUSE_REASONS.includes(reason)) throw new Error(`Unknown pause reason: ${reason}`);
    const before = this.isPaused;
    if (active) this._reasons.add(reason);
    else this._reasons.delete(reason);
    if (before !== this.isPaused || active) this.emit('change', this.snapshot());
  }

  has(reason) {
    return this._reasons.has(reason);
  }

  get isPaused() {
    return this._reasons.size > 0;
  }

  snapshot() {
    return { paused: this.isPaused, reasons: [...this._reasons] };
  }
}
