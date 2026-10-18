// Interstitial pacing (Step 11; placements 2026-10-17). The platform reports only that a request
// COMPLETED (no impression signal), so `lastInterstitialRequestCompleted` is the reference; a
// rejected / unavailable request does not reset it. All pacing lives here (one clock, one place):
// at least `minIntervalMs` (30 s) since the last SUCCESSFUL interstitial, `firstAfterMs` (30 s) since
// the session started and `afterRewardedMs` (30 s) since the last rewarded ad (2026-10-18). (Two calls
// can never overlap, and none is made while the host has the game paused / another ad plays: the
// SDK could not show it then.) Placements are transitions the player just chose (they may come from
// a paused state, e.g. Pause → Menu); the ad itself pauses the game through the 'adBusy' reason.
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

  // a rewarded ad was watched (RewardService.afterRewarded) → no interstitial for `afterRewardedMs`
  noteRewarded() {
    this.lastRewarded = this.clock();
  }

  canShow() {
    const c = this.config;
    const now = this.clock();
    if (!c.enabled || this.busy || !this.platform.capabilities?.interstitial) return false;
    if (this.pause?.has?.('host') || this.pause?.has?.('adBusy')) return false;
    if (c.firstAfterMs && now - this.sessionStart < c.firstAfterMs) return false;
    if (this.lastInterstitialRequestCompleted !== null && now - this.lastInterstitialRequestCompleted < c.minIntervalMs) return false;
    if (c.afterRewardedMs && this.lastRewarded !== null && now - this.lastRewarded < c.afterRewardedMs) return false;
    return true;
  }

  // Call only at an approved transition (config.placements). Resolves with the platform result;
  // never rejects, so callers can always continue with `.then(go, go)`.
  async maybeShow(placement = null) {
    if (placement && this.config.placements && !this.config.placements.includes(placement)) return { result: 'skipped' };
    if (!this.canShow()) return { result: 'skipped' };
    this.lastPlacement = placement;
    this.busy = true;
    this.pause?.set('adBusy', true);
    try {
      const r = await this.platform.requestInterstitial().catch(() => ({ result: 'error' }));
      if (r.result === 'request-completed') this.lastInterstitialRequestCompleted = this.clock();
      return r;
    } finally {
      this.pause?.set('adBusy', false);
      this.busy = false;
    }
  }
}
