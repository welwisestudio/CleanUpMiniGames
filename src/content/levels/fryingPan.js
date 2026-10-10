// Level 7 · Cast-Iron Frying Pan (CONTENT-MATRIX Batch A, early, 7 stages). Restoration idea:
// rust removal with steel wool, then re-seasoning. Scrape the burnt crust → degreaser foam →
// scrub the cooking surface → steel wool on the rust (rim + handle) → rinse → dry → oil.

export const fryingPan = {
  id: 'frying-pan',
  title: 'Frying Pan',
  backgrounds: { portrait: 'bg-wash-portrait', landscape: 'bg-wash-landscape' },
  thumbnail: 'frying-pan-thumb',
  thumbnailClean: 'frying-pan-thumb-clean',
  resultPicture: 'frying-pan-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'frying-pan-mask',
    outsideMask: 'frying-pan-mask-outside',
    shadow: 'flat',
    regions: {
      inside: { mask: 'frying-pan-inside-mask' },
      rust: { mask: 'frying-pan-rust-mask' },
    },
    layers: [
      { id: 'clean', texture: 'frying-pan-clean', initial: 'full', static: true }, // seasoned
      { id: 'matte', texture: 'frying-pan-matte', initial: 'full' },
      { id: 'wet', texture: 'frying-pan-wet', initial: 'full' },
      { id: 'rusty', texture: 'frying-pan-rusty', initial: 'full' },
      { id: 'greasy', texture: 'frying-pan-greasy', initial: 'full' },
      { id: 'scrubbed', texture: 'frying-pan-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'frying-pan-foam', initial: 'empty' },
      { id: 'crust', texture: 'frying-pan-crust', initial: 'chunks' },
    ],
  },
  stages: [
    { id: 'scrape', tool: 'putty-knife', mechanic: 'chunkBreak', fx: 'chips', params: { layer: 'crust', chunkCount: 18, breakDistance: 160, tipRadius: 40, seed: 7701 }, targetSeconds: [8, 12] },
    { id: 'foam-spray', family: 'foam', tool: 'foam-sprayer', mechanic: 'brush', region: 'inside', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', clip: 'frying-pan-inside-outside', radius: 100, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'scrub', family: 'scrub', tool: 'scrub-brush', mechanic: 'brush', region: 'inside', params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['greasy'], radius: 96, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'steel-wool', tool: 'steel-wool', mechanic: 'brush', outline: false, region: 'rust', params: { mode: 'reveal', layers: ['rusty'], radius: 70, threshold: 0.95 }, targetSeconds: [6, 9] },
    { id: 'rinse', family: 'rinse', tool: 'washer-lance', mechanic: 'brush', region: 'inside', params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'greasy'], radius: 85, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'dry', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['wet', 'rusty'], radius: 120, threshold: 0.96 }, targetSeconds: [4, 7] },
    { id: 'oil', tool: 'stain-sponge', mechanic: 'brush', params: { mode: 'reveal', layers: ['matte'], radius: 90, threshold: 0.95 }, targetSeconds: [5, 8] },
  ],
};
