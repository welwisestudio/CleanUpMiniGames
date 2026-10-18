// Platform-facing product settings (Step 11). Values that need the designer's approval are marked.

// Score sent to YouTube (engagement.sendScore). PROPOSAL, waiting for approval → disabled:
// metric 'levels-completed' = number of DIFFERENT levels completed at least once (0–50); replays do
// not raise it; it is derived from the cloud save, so the best score sent always matches the save.
export const SCORE = { enabled: false, metric: 'levels-completed' };

// Interstitial ads (requestInterstitialAd). Rules (designer, 2026-10-18 — the two extra rules are back):
// on an approved trigger an interstitial is requested only if
//   · at least 30 s have passed since the LAST SUCCESSFUL interstitial (the SDK's request completed —
//     it gives no impression signal); a failed / unavailable / rejected request does NOT reset it;
//   · at least 30 s have passed since the session started;
//   · at least 30 s have passed since the last rewarded ad the player watched (earned).
// Approved triggers: "Skip chest"; Pause → Resume / Restart / Menu; Completed → Next / Restart / Menu;
// entering a level from the menu.
export const INTERSTITIAL = {
  enabled: true,
  minIntervalMs: 30_000, // ≥ 30 s since the last successful interstitial
  firstAfterMs: 30_000, // not in the first 30 s of a session
  afterRewardedMs: 30_000, // not within 30 s after a rewarded ad
  placements: ['chest-skip', 'pause-resume', 'pause-restart', 'pause-menu', 'result-next', 'result-restart', 'result-menu', 'level-start'],
};
