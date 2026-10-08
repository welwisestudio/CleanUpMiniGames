// Alternative tools (Step 7, reference REFERENCE-BREAKDOWN §2: three tool-variant cards at the
// bottom of some stages; "Equipped", a coin price or a diamond price; variants can be a different
// tool for the same job, e.g. hand brush vs. cordless drill brush, cloth vs. sponge vs. eraser).
//
// A stage opts in with `family: '<id>'` (its `tool` must be the family's base tool). Every option
// performs the SAME stage job through the same mechanic; options only differ in look and small,
// configured handling modifiers:
//   radius    – multiplier of the stage's cleaning / spray radius (paid tools at most +10 %)
//   toolScale – multiplier of the displayed tool size (so the visible head matches the footprint)
// unlock: { type: 'default' } | { type: 'coins', price } | { type: 'diamonds', price } | { type: 'ad' }
// Every stage stays fully completable with the base tool. Prices follow the reference (5–25 coins,
// 5 diamonds) and are provisional (Step 10 balance).

export const TOOL_FAMILIES = {
  scrub: {
    name: 'Scrub',
    base: 'scrub-brush',
    options: [
      { tool: 'scrub-brush', unlock: { type: 'default' }, card: 0xb9dcff },
      { tool: 'scrub-brush-oval', unlock: { type: 'coins', price: 15 }, radius: 1.05, card: 0xffc6dd },
      { tool: 'drill-brush', unlock: { type: 'diamonds', price: 5 }, radius: 1.1, toolScale: 1.4, card: 0xd9c8ff },
    ],
  },
  foam: {
    name: 'Foam',
    base: 'foam-sprayer',
    options: [
      { tool: 'foam-sprayer', unlock: { type: 'default' }, card: 0xb9dcff },
      { tool: 'foam-gun', unlock: { type: 'coins', price: 15 }, radius: 1.05, card: 0xfff0a8 },
      { tool: 'foam-cannon', unlock: { type: 'ad' }, radius: 1.1, card: 0xd9c8ff },
    ],
  },
  wipe: {
    name: 'Wipe',
    base: 'cloth',
    options: [
      { tool: 'cloth', unlock: { type: 'default' }, card: 0xc9f2c0 },
      { tool: 'wipe-sponge', unlock: { type: 'coins', price: 10 }, radius: 1.05, card: 0xfff0a8 },
      { tool: 'wipe-eraser', unlock: { type: 'diamonds', price: 3 }, radius: 1.1, card: 0xd9c8ff },
    ],
  },
  // ---- Step 8 Batch A families (CONTENT-MATRIX §3.2); levels 1–5 keep their approved cards ----
  // `work` (point-target stages) = hold time / taps multiplier, paid options at most −10 %.
  rinse: {
    name: 'Rinse',
    base: 'washer-lance',
    options: [
      { tool: 'washer-lance', unlock: { type: 'default' }, card: 0xb9dcff },
      { tool: 'turbo-lance', unlock: { type: 'coins', price: 20 }, radius: 1.05, card: 0xffd7a8 },
      { tool: 'gold-washer', unlock: { type: 'ad' }, radius: 1.1, card: 0xd9c8ff },
    ],
  },
  rust: {
    name: 'Rust',
    base: 'wire-brush',
    options: [
      { tool: 'wire-brush', unlock: { type: 'default' }, card: 0xffd7a8 },
      { tool: 'rust-steel-wool', unlock: { type: 'coins', price: 10 }, radius: 1.05, card: 0xd8e6f5 },
      { tool: 'wire-wheel', unlock: { type: 'diamonds', price: 5 }, radius: 1.1, card: 0xd9c8ff },
    ],
  },
  scrape: {
    name: 'Scrape',
    base: 'wide-scraper',
    options: [
      { tool: 'wide-scraper', unlock: { type: 'default' }, card: 0xffd7a8 },
      { tool: 'scrape-putty-knife', unlock: { type: 'coins', price: 10 }, radius: 1.05, card: 0xb9f0e6 },
      { tool: 'pro-scraper', unlock: { type: 'diamonds', price: 4 }, radius: 1.1, card: 0xd9c8ff },
    ],
  },
  sand: {
    name: 'Sand',
    base: 'sandpaper',
    options: [
      { tool: 'sandpaper', unlock: { type: 'default' }, card: 0xffd7a8 },
      { tool: 'sanding-block', unlock: { type: 'coins', price: 10 }, radius: 1.05, card: 0xb9dcff },
      { tool: 'orbital-sander', unlock: { type: 'diamonds', price: 5 }, radius: 1.1, card: 0xd9c8ff },
    ],
  },
  grind: {
    name: 'Grind',
    base: 'angle-grinder',
    options: [
      { tool: 'angle-grinder', unlock: { type: 'default' }, card: 0xb9f0e6 },
      { tool: 'grind-sander', unlock: { type: 'coins', price: 25 }, radius: 1.05, card: 0xe4f7b5 },
      { tool: 'gold-grinder', unlock: { type: 'ad' }, radius: 1.1, card: 0xd9c8ff },
    ],
  },
  spray: {
    name: 'Spray paint',
    base: 'spray-gun',
    options: [
      { tool: 'spray-gun', unlock: { type: 'default' }, card: 0xd8e6f5 },
      { tool: 'airbrush', unlock: { type: 'coins', price: 20 }, radius: 1.05, card: 0xffc6dd },
      { tool: 'gold-spray-gun', unlock: { type: 'ad' }, radius: 1.1, card: 0xd9c8ff },
    ],
  },
  polish: {
    name: 'Polish',
    base: 'polisher',
    options: [
      { tool: 'polisher', unlock: { type: 'default' }, card: 0xfff0a8 },
      { tool: 'orbital-polisher', unlock: { type: 'coins', price: 20 }, radius: 1.05, card: 0xb9dcff },
      { tool: 'gold-polisher', unlock: { type: 'diamonds', price: 6 }, radius: 1.1, card: 0xd9c8ff },
    ],
  },
  screw: {
    name: 'Screw',
    base: 'screwdriver',
    options: [
      { tool: 'screwdriver', unlock: { type: 'default' }, card: 0xffc6c6 },
      { tool: 'e-screwdriver', unlock: { type: 'coins', price: 20 }, work: 0.95, card: 0xffd7a8 },
      { tool: 'gold-screwdriver', unlock: { type: 'diamonds', price: 5 }, work: 0.9, card: 0xd9c8ff },
    ],
  },
  roll: {
    name: 'Roller',
    base: 'paint-roller',
    options: [
      { tool: 'paint-roller', unlock: { type: 'default' }, card: 0xb9dcff },
      { tool: 'wide-roller', unlock: { type: 'coins', price: 15 }, radius: 1.05, card: 0xfff0a8 },
      { tool: 'foam-roller', unlock: { type: 'diamonds', price: 4 }, radius: 1.1, card: 0xffc6dd },
    ],
  },
  hammer: {
    name: 'Hammer',
    base: 'hammer',
    options: [
      { tool: 'hammer', unlock: { type: 'default' }, card: 0xffd7a8 },
      { tool: 'mallet', unlock: { type: 'coins', price: 15 }, card: 0xd8e6f5 },
      { tool: 'gold-hammer', unlock: { type: 'ad' }, card: 0xd9c8ff },
    ],
  },
};

export const TOOL_AD_PLACEMENT = 'tool-unlock';

export function getFamily(id) {
  const f = TOOL_FAMILIES[id];
  if (!f) throw new Error(`Unknown tool family: ${id}`);
  return f;
}

export function familyOption(familyId, toolId) {
  return getFamily(familyId).options.find((o) => o.tool === toolId) ?? null;
}
