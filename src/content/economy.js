// Economy — every balance number lives here (no economy numbers in UI or service code).
// PROVISIONAL (systems pass 2026-10-12): a sensible first rebalance, not the final Step-10 tuning.
//
// Value anchor: one rewarded ad ≈ 120 coins ≈ 25 diamonds (1 diamond ≈ 5 coins). A multi-ad bundle
// pays clearly more than the same number of single ads. The YouTube version has NO real-money
// purchases: coins and diamonds come from play, chests, the Wheel and rewarded ads only.

// Completion reward per level (base; the post-level boost multiplies it with a rewarded ad).
// Rebalance 2026-10-17 (tiers by campaign position): #1–5 pay 50, #6–15 60, #16–25 70, #26–36 80,
// #37–50 90. Replays pay the same base reward.
const REWARD_TIERS = [
  [50, ['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker']],
  [60, ['rain-boots', 'frying-pan', 'wooden-crate', 'toolbox', 'bathroom-sink', 'desk-fan', 'garden-bench', 'keyboard', 'watering-can', 'porcelain-vase']],
  [70, ['swimming-pool', 'leather-jacket', 'rusty-cleaver', 'toaster', 'coir-doormat', 'garden-grill', 'bathtub', 'retro-radio', 'stone-lion', 'wooden-dresser']],
  [80, ['aquarium', 'backpack', 'kitchen-stove', 'lawn-mower', 'street-sign', 'table-lamp', 'rowboat', 'game-controller', 'iron-gate', 'sofa', 'stone-fountain']],
  [90, ['vintage-motorcycle', 'pocket-watch', 'upright-piano', 'knight-armor', 'cannon', 'shower-cabin', 'bicycle', 'rider-statue', 'chandelier', 'royal-throne', 'stone-patio', 'carousel-horse', 'vintage-tractor', 'vintage-car']],
];
const COMPLETION_REWARDS = {};
for (const [coins, ids] of REWARD_TIERS) for (const id of ids) COMPLETION_REWARDS[id] = coins;

export const REWARDS = {
  // Post-level boost (rewarded ad), reference multiplier bar: zones x2 | x3 | x5 | x3 | x2 (equal
  // widths); a marker sweeps across them at constant speed (`sweepMs` one way); the player locks it
  // with a tap, then the ad plays. A watched ad pays base × multiplier in total (the base is credited
  // on completion; the ad adds base × (multiplier − 1)). Time share: x2 40 %, x3 40 %, x5 20 %.
  boost: { zones: [2, 3, 5, 3, 2], values: [2, 3, 5], sweepMs: 1100, placement: 'reward-boost' },
  // Small, frequent timed chest in the menu. The first chest opens soon after the first launch,
  // then one every `intervalSec`.
  timedChest: { firstDelaySec: 60, intervalSec: 300, coins: 50 },
  // Level-progress chest: every completed level run adds one step (5 steps = 100 %); at 100 % it
  // is offered for a rewarded ad and is clearly better than the timed chest.
  progressChest: { steps: 5, coins: 300, diamonds: 15, placement: 'chest-progress' },
};

// Level access (systems pass 2026-10-12; rebalance 2026-10-17):
// - normal levels: the first `freeLevels` are open; every other normal level is bought with COINS
//   (price by campaign number, curve below) or, when the player cannot afford it, unlocked with a
//   rewarded ad. Nothing unlocks automatically; completed / unlocked levels stay replayable;
// - four VIP levels spread through the list, unlocked ONLY with a rewarded ad (no coins, no gems);
// - the last two levels are bought with GEMS (the existing diamond currency) only (`gems`).
// Pacing target (2026-10-17): playing every level once and buying the next one with the coins earned
// (completion reward + the timed chest, no ads) carries the player to about the Motorcycle (#37);
// from there on the rewarded unlock is the usual way for many levels (model: project/DECISIONS.md).
export const LEVEL_ACCESS = {
  adPlacement: 'level-unlock',
  vipPlacement: 'vip-unlock',
  freeLevels: 1,
  // price(n) = first + (last − first) · t^power, t = (n − 2) / (count − 2); rounded to 10 (< 200)
  // or 25 → level 2: 40 · 10: 40 · 20: 70 · 25: 110 · 30: 170 · 35: 250 · 40: 375 · 47: 575
  priceCurve: { first: 40, last: 700, power: 3 },
  vip: ['porcelain-vase', 'aquarium', 'vintage-motorcycle', 'carousel-horse'], // #15 · #26 · #37 · #48
  // gem levels (price in the existing diamond / gem currency; 1 gem ≈ 5 coins → about the coin price of a level there)
  gems: { 'vintage-tractor': 125, 'vintage-car': 150 }, // #49 · #50
};

// Coin price of the level with campaign number n (1-based) out of `count` levels.
export function levelPrice(n, count, cfg = LEVEL_ACCESS) {
  if (n <= cfg.freeLevels) return 0;
  const { first, last, power } = cfg.priceCurve;
  const t = Math.min(1, Math.max(0, (n - 2) / Math.max(1, count - 2)));
  const v = first + (last - first) * t ** power;
  const step = v < 200 ? 10 : 25;
  return Math.round(v / step) * step;
}

// Tool variant prices (tool id → price in its currency; the currency is the variant's `unlock.type`
// in toolFamilies.js). A variant the player cannot afford can always be unlocked with one rewarded
// ad instead (ToolService.unlockWithAd fallback). Coins 100–350, diamonds 30–60.
export const TOOL_PRICES = {
  'scrub-brush-oval': 150,
  'drill-brush': 50,
  'foam-gun': 150,
  'wipe-sponge': 100,
  'wipe-eraser': 30,
  'turbo-lance': 200,
  'washer-neon': 40,
  'rust-steel-wool': 100,
  'wire-wheel': 50,
  'scrape-putty-knife': 100,
  'pro-scraper': 40,
  'sanding-block': 100,
  'orbital-sander': 50,
  'grind-sander': 250,
  'grinder-industrial': 40,
  airbrush: 200,
  'orbital-polisher': 200,
  'gold-polisher': 60,
  'e-screwdriver': 200,
  'gold-screwdriver': 50,
  'wide-roller': 150,
  'foam-roller': 40,
  mallet: 150,
  'hammer-construction': 30,
  'laser-redblack': 350,
  'laser-gold': 60,
  'detail-toothbrush': 100,
  'deck-brush': 200,
  'gold-pool-brush': 50,
  'pro-squeegee': 150,
  'microfiber-mitt': 150,
  'wool-mitt': 40,
};

// Store (systems pass 2026-10-12). No real-money products. Sections:
// - Diamonds: one rewarded-ad offer;
// - Coins: one rewarded-ad offer + two coin packs paid with diamonds;
// - Ad bundles: watch `ads` rewarded ads (any time, across sessions; progress is saved) → claim the
//   whole pack once. `chest` = a reward chest (`STORE.chest` contents). Optional per bundle:
//   `dailyLimit` (claims per local day) and `cooldownMin` (minutes after a claim before it restarts);
// - Bonus: open the timed chest now for an ad (daily cap).
// `dailyLimit: null` = no cap.
export const STORE = {
  adPlacement: 'store-reward',
  free: {
    gems: { gems: 25, dailyLimit: null },
    coins: { coins: 120, dailyLimit: null },
    chest: { dailyLimit: 3 }, // opens the timed chest now (its usual coins), timer restarts
  },
  coinPacks: [
    { id: 'coins-400', coins: 400, gems: 80 },
    { id: 'coins-1200', coins: 1200, gems: 200 },
  ],
  chest: { coins: 200, gems: 15 },
  bundles: [
    { id: 'bundle-coins', title: 'Coin Stack', ads: 3, reward: { coins: 500 }, dailyLimit: null, cooldownMin: 0 },
    { id: 'bundle-mixed', title: 'Coins + Diamonds', ads: 3, reward: { coins: 300, gems: 50 }, dailyLimit: null, cooldownMin: 0 },
    { id: 'bundle-mega', title: 'Mega Chest Pack', ads: 5, reward: { coins: 600, gems: 60, chest: 1 }, dailyLimit: null, cooldownMin: 0 },
  ],
};

// Wheel of Fortune (systems pass 2026-10-12): one FREE spin per local day; after it every spin costs
// one rewarded ad, with no cap. Segments clockwise from the top; `weight` = chance share. The tool
// segment gives a tool variant; already owned → fallback. Average ad spin ≈ 86 coins + 4 diamonds
// + a chance at the gold laser.
export const WHEEL = {
  adPlacement: 'wheel-spin',
  freePerDay: 1,
  segments: [
    { id: 'coins-75', kind: 'coins', amount: 75, weight: 22 },
    { id: 'gems-10', kind: 'gems', amount: 10, weight: 14 },
    { id: 'coins-120', kind: 'coins', amount: 120, weight: 18 },
    { id: 'tool', kind: 'tool', family: 'laser', tool: 'laser-gold', weight: 8, fallback: { kind: 'gems', amount: 30 } },
    { id: 'coins-200', kind: 'coins', amount: 200, weight: 12 },
    { id: 'gems-15', kind: 'gems', amount: 15, weight: 10 },
    { id: 'coins-400', kind: 'coins', amount: 400, weight: 6 },
    { id: 'gems-30', kind: 'gems', amount: 30, weight: 4 },
  ],
};

export const economy = {
  completionReward(levelId) {
    return COMPLETION_REWARDS[levelId] ?? 40;
  },
  rewards: REWARDS,
  levelAccess: LEVEL_ACCESS,
  toolPrices: TOOL_PRICES,
  store: STORE,
  wheel: WHEEL,
};
