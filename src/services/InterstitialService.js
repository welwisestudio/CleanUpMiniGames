// Interstitial pacing (Step 11). The platform reports only that a request COMPLETED (no impression
// signal), so `lastInterstitialRequestCompleted` is the reference; a rejected request does not reset
// it. Never in the first minutes, never right after a rewarded ad, never while paused.
export class InterstitialService {
  constructor({ platform, pause, config, clock = () => Date.now() }) {
    this.platform = platform;
    this.pause = pause;
    this.config = config;
    this.clock = clock;
    this.sessionStart = clock();
    this.lastInterstitialRequestCompleted = null;
    this.lastRewarded = null;
    this.busy = false;
  }

  noteRewarded() {
    this.lastRewarded = this.clock();
  }

  canShow() {
    const c = this.config;
    const now = this.clock();
    if (!c.enabled || this.busy || !this.platform.capabilities?.interstitial || this.pause?.isPaused) return false;
    if (now - this.sessionStart < c.firstAfterMs) return false;
    if (this.lastInterstitialRequestCompleted !== null && now - this.lastInterstitialRequestCompleted < c.minIntervalMs) return false;
    if (this.lastRewarded !== null && now - this.lastRewarded < c.afterRewardedMs) return false;
    return true;
  }

  // Call only at a natural transition (e.g. result → menu). Resolves with the platform result.
  async maybeShow() {
    if (!this.canShow()) return { result: 'skipped' };
    this.busy = true;
    this.pause?.set('adBusy', true);
    try {
      const r = await this.platform.requestInterstitial();
      if (r.result === 'request-completed') this.lastInterstitialRequestCompleted = this.clock();
      return r;
    } finally {
      this.pause?.set('adBusy', false);
      this.busy = false;
    }
  }
}
