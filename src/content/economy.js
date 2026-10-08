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
  // Step 8 Batch A — provisional (Step 10 balance): early levels pay a little more than levels 1–5,
  // by stage count (6–8 stages → 20–25)
  'rain-boots': 20,
  'frying-pan': 20,
  'wooden-crate': 20,
  toolbox: 25,
  'bathroom-sink': 20,
  'desk-fan': 25,
  'garden-bench': 25,
  keyboard: 25,
  'watering-can': 25,
  'porcelain-vase': 25,
};
// Step 8 Batch B — provisional (Step 10): 16–25 → 25, 26–40 → 30, 41–50 → 35 (more stages)
for (const id of ['swimming-pool', 'leather-jacket', 'rusty-cleaver', 'toaster', 'coir-doormat', 'garden-grill', 'bathtub', 'retro-radio', 'stone-lion', 'wooden-dresser']) COMPLETION_REWARDS[id] = 25;
for (const id of [
  'aquarium', 'backpack', 'kitchen-stove', 'lawn-mower', 'street-sign', 'table-lamp', 'rowboat', 'game-controller', 'iron-gate', 'sofa',
  'stone-fountain', 'vintage-motorcycle', 'pocket-watch', 'upright-piano', 'knight-armor',
]) COMPLETION_REWARDS[id] = 30;
for (const id of ['cannon', 'shower-cabin', 'bicycle', 'rider-statue', 'chandelier', 'royal-throne', 'stone-patio', 'carousel-horse', 'vintage-tractor', 'vintage-car']) COMPLETION_REWARDS[id] = 35;

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
