import { LEVEL_META } from '../generated/levelMeta.js';

// Level 5 · Sneaker. Stage order from the reference video 06:20–07:56 (REFERENCE-BREAKDOWN §3 L-E):
// chisel → pressure washer → foam sprayer → scrub brush → pressure washer → cloth → eraser.

const R = LEVEL_META.levels.sneaker?.regions ?? { sole: [0, 640, 1024, 1024] };

export const sneaker = {
  id: 'sneaker',
  title: 'Sneaker',
  backgrounds: { portrait: 'sneaker-bg-portrait', landscape: 'sneaker-bg-landscape' },
  thumbnail: 'sneaker-thumb',
  resultPicture: 'sneaker-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'sneaker-mask',
    outsideMask: 'sneaker-mask-outside',
    shadow: 'flat',
    regions: { sole: { rect: R.sole }, scuffs: { mask: 'sneaker-scuffs-mask' } },
    layers: [
      { id: 'clean', texture: 'sneaker-clean', initial: 'full', static: true },
      { id: 'scuffed', texture: 'sneaker-scuffed', initial: 'full' },
      { id: 'wet', texture: 'sneaker-wet', initial: 'full' },
      { id: 'stained', texture: 'sneaker-stained', initial: 'full' },
      { id: 'scrubbed', texture: 'sneaker-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'sneaker-foam', initial: 'empty' },
      { id: 'muddy', texture: 'sneaker-muddy', initial: 'full' },
      { id: 'mud', texture: 'sneaker-mudcrust', initial: 'chunks' },
    ],
  },
  stages: [
    { id: 'chisel', tool: 'chisel', mechanic: 'chunkBreak', params: { layer: 'mud', chunkCount: 22, breakDistance: 170, tipRadius: 38, seed: 5501 }, targetSeconds: [12, 16] },
    { id: 'rinse-mud', tool: 'washer-lance', mechanic: 'brush', params: { mode: 'reveal', layers: ['muddy'], radius: 85, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'foam-spray', tool: 'foam-sprayer', mechanic: 'brush', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 105, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'scrub', tool: 'drill-brush', mechanic: 'brush', toolScale: 1.3, params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['stained'], radius: 70, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'rinse', tool: 'washer-lance', mechanic: 'brush', params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'stained'], radius: 85, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'dry', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['wet'], radius: 120, threshold: 0.96 }, targetSeconds: [4, 6] },
    { id: 'erase', tool: 'eraser', mechanic: 'brush', region: 'scuffs', params: { mode: 'reveal', layers: ['scuffed'], radius: 60, threshold: 0.96 }, targetSeconds: [4, 6] },
  ],
};
