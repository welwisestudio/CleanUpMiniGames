// Level 2 · Rug. Stage order from the reference video 01:10–02:20 (REFERENCE-BREAKDOWN §3 L-B):
// pressure washer → squeegee → foam sprayer → scrub brush → pressure washer → squeegee.
// Layers bottom → top on one 1024 canvas (object-local units).

export const rug = {
  id: 'rug',
  title: 'Rug',
  backgrounds: { portrait: 'rug-bg-portrait', landscape: 'rug-bg-landscape' },
  thumbnail: 'rug-thumb',
  thumbnailClean: 'rug-thumb-clean', // hub preview once completed
  menuPreview: { scale: 1.15 }, // hub: a bit bigger (designer review)
  resultPicture: 'rug-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'rug-mask',
    outsideMask: 'rug-mask-outside',
    shadow: 'flat',
    layers: [
      { id: 'clean', texture: 'rug-clean', initial: 'full', static: true },
      { id: 'wet', texture: 'rug-wet', initial: 'full' },
      { id: 'stained', texture: 'rug-stained', initial: 'full' },
      { id: 'scrubbed', texture: 'rug-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'rug-foam', initial: 'empty' },
      { id: 'muddy', texture: 'rug-muddy', initial: 'full' },
      { id: 'sandy', texture: 'rug-sandy', initial: 'full' },
    ],
  },
  stages: [
    { id: 'rinse-dirt', tool: 'washer-lance', mechanic: 'brush', params: { mode: 'reveal', layers: ['sandy'], radius: 78, threshold: 0.96 }, targetSeconds: [8, 12] },
    { id: 'squeegee-1', tool: 'squeegee', mechanic: 'brush', params: { mode: 'reveal', layers: ['muddy'], radius: 30, aspect: 3.4, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'foam-spray', family: 'foam', tool: 'foam-sprayer', mechanic: 'brush', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 92, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'scrub', family: 'scrub', tool: 'scrub-brush', mechanic: 'brush', params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['stained'], radius: 96, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'rinse', tool: 'washer-lance', mechanic: 'brush', params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'stained'], radius: 80, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'squeegee-2', tool: 'squeegee', mechanic: 'brush', params: { mode: 'reveal', layers: ['wet'], radius: 30, aspect: 3.4, threshold: 0.96 }, targetSeconds: [5, 8] },
  ],
};
