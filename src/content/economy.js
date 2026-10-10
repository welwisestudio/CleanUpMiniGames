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

// Level access (2026-10-10): sequential progression; a locked normal level can be opened with a
// rewarded ad (`adPlacement`); the last five levels are VIP and are bought with diamonds only.
// PROVISIONAL prices (balance later). Keyed by level id (campaign numbers in the comments).
export const LEVEL_ACCESS = {
  adPlacement: 'level-unlock',
  vip: {
    'royal-throne': 4, // 46
    'stone-patio': 5, // 47
    'carousel-horse': 6, // 48
    'vintage-tractor': 7, // 49
    'vintage-car': 8, // 50
  },
};

// Store (2026-10-10). PROVISIONAL values (balance later). Sections: Diamonds and Coins (3 tiles each,
// the first one free for a rewarded ad, daily-capped so ads cannot be farmed into VIP diamonds) and a
// Bonus section (open the timed chest now for an ad). Diamond packs are real-money products — a
// dev-only placeholder purchase until the platform payments step; coin packs cost diamonds (work now).
export const STORE = {
  adPlacement: 'store-reward',
  free: {
    gems: { gems: 2, dailyLimit: 3 },
    coins: { coins: 40, dailyLimit: 5 },
    chest: { dailyLimit: 3 }, // opens the timed chest now (its usual coins), timer restarts
  },
  gemPacks: [
    { id: 'gems-25', gems: 25, price: '$0.99' },
    { id: 'gems-60', gems: 60, price: '$1.99' },
  ],
  coinPacks: [
    { id: 'coins-300', coins: 300, gems: 5 },
    { id: 'coins-800', coins: 800, gems: 12 },
  ],
};

// Wheel of Fortune (2026-10-10): one rewarded ad = one spin (daily limit). Segments clockwise from
// the top; `weight` = chance share. The tool segment gives a tool variant; already owned → fallback.
export const WHEEL = {
  adPlacement: 'wheel-spin',
  dailyLimit: 5,
  segments: [
    { id: 'coins-25', kind: 'coins', amount: 25, weight: 22 },
    { id: 'gems-2', kind: 'gems', amount: 2, weight: 14 },
    { id: 'coins-50', kind: 'coins', amount: 50, weight: 18 },
    { id: 'tool', kind: 'tool', family: 'laser', tool: 'laser-gold', weight: 8, fallback: { kind: 'gems', amount: 5 } },
    { id: 'coins-100', kind: 'coins', amount: 100, weight: 12 },
    { id: 'gems-3', kind: 'gems', amount: 3, weight: 10 },
    { id: 'coins-150', kind: 'coins', amount: 150, weight: 6 },
    { id: 'gems-5', kind: 'gems', amount: 5, weight: 4 },
  ],
};

export const economy = {
  completionReward(levelId) {
    return COMPLETION_REWARDS[levelId] ?? 10;
  },
  rewards: REWARDS,
  levelAccess: LEVEL_ACCESS,
  store: STORE,
  wheel: WHEEL,
};
