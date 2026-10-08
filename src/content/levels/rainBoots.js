// Level 6 · Rain Boots (CONTENT-MATRIX Batch A, early, 6 stages). Familiar cleaning set on a new
// material (glossy rubber): chisel the dried mud → wash → foam → scrub → rinse → dry.

export const rainBoots = {
  id: 'rain-boots',
  title: 'Rain Boots',
  backgrounds: { portrait: 'bg-wash-portrait', landscape: 'bg-wash-landscape' },
  thumbnail: 'rain-boots-thumb',
  thumbnailClean: 'rain-boots-thumb-clean',
  resultPicture: 'rain-boots-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'rain-boots-mask',
    outsideMask: 'rain-boots-mask-outside',
    shadow: 'flat',
    layers: [
      { id: 'clean', texture: 'rain-boots-clean', initial: 'full', static: true },
      { id: 'wet', texture: 'rain-boots-wet', initial: 'full' },
      { id: 'stained', texture: 'rain-boots-stained', initial: 'full' },
      { id: 'scrubbed', texture: 'rain-boots-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'rain-boots-foam', initial: 'empty' },
      { id: 'muddy', texture: 'rain-boots-muddy', initial: 'full' },
      { id: 'mud', texture: 'rain-boots-mudcrust', initial: 'chunks' },
    ],
  },
  stages: [
    { id: 'chisel', tool: 'chisel', mechanic: 'chunkBreak', params: { layer: 'mud', chunkCount: 22, breakDistance: 170, tipRadius: 38, seed: 6601 }, targetSeconds: [10, 14] },
    { id: 'rinse-mud', family: 'rinse', tool: 'washer-lance', mechanic: 'brush', params: { mode: 'reveal', layers: ['muddy'], radius: 85, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'foam-spray', family: 'foam', tool: 'foam-sprayer', mechanic: 'brush', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 105, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'scrub', family: 'scrub', tool: 'scrub-brush', mechanic: 'brush', params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['stained'], radius: 96, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'rinse', family: 'rinse', tool: 'washer-lance', mechanic: 'brush', params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'stained'], radius: 85, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'dry', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['wet'], radius: 120, threshold: 0.96 }, targetSeconds: [4, 6] },
  ],
};
