// Starting economy. PROVISIONAL: numbers are tuned at the overall balance step (Step 10).
// All reward values and timers live here (no economy numbers in UI code).

// Reference observations (REFERENCE-BREAKDOWN §0): ball +15, rug +15, trophy +20, chair +20, sneaker +20.
// Replays currently pay the same base reward.
const COMPLETION_REWARDS = {
  'soccer-ball': 15,
  rug: 15,
  'golden-trophy': 20,
  chair: 20,
  sneaker: 20,
};

export const REWARDS = {
  // Post-level boost (rewarded ad), reference multiplier bar: zones x2 | x3 | x5 | x3 | x2 (equal
  // widths); a marker sweeps across them at constant speed (`sweepMs` one way); the player locks it
  // with a tap, then the ad plays. A watched ad pays base × multiplier in total (the base is credited
  // on completion; the ad adds base × (multiplier − 1)). Time share: x2 40 %, x3 40 %, x5 20 %.
  boost: { zones: [2, 3, 5, 3, 2], values: [2, 3, 5], sweepMs: 1100, placement: 'reward-boost' },
  // Small, frequent timed chest in the menu. The first chest opens soon after the first launch,
  // then one every `intervalSec`.
  timedChest: { firstDelaySec: 60, intervalSec: 300, coins: 15 },
  // Level-progress chest: every completed level run adds one step (5 steps = 100 %); at 100 % it
  // is offered for a rewarded ad and is clearly better than the timed chest.
  progressChest: { steps: 5, coins: 150, diamonds: 2, placement: 'chest-progress' },
};

export const economy = {
  completionReward(levelId) {
    return COMPLETION_REWARDS[levelId] ?? 10;
  },
  rewards: REWARDS,
};
