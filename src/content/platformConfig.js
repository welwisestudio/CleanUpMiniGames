// Platform-facing product settings (Step 11). Values that need the designer's approval are marked.

// Score sent to YouTube (engagement.sendScore). PROPOSAL, waiting for approval → disabled:
// metric 'levels-completed' = number of DIFFERENT levels completed at least once (0–50); replays do
// not raise it; it is derived from the cloud save, so the best score sent always matches the save.
export const SCORE = { enabled: false, metric: 'levels-completed' };

// Interstitial ads (requestInterstitialAd). The SDK only reports that the REQUEST completed — there
// is no impression signal — so the interval runs from the last completed request (a rejected
// request does not reset it). Not placed anywhere yet: placements need the designer's approval.
export const INTERSTITIAL = {
  enabled: false,
  firstAfterMs: 120_000, // never in the first 2 minutes of a session
  minIntervalMs: 120_000, // ≥ 2 minutes after the last completed request
  afterRewardedMs: 60_000, // never within 1 minute after a rewarded ad
};
