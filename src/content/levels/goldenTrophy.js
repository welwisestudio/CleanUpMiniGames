import { LEVEL_META } from '../generated/levelMeta.js';

// Level 3 · Golden Ball Trophy. Stage order from the reference video 02:24–04:04
// (REFERENCE-BREAKDOWN §3 L-C): chisel → dry brush → detail brush (base) → water mist →
// foam sprayer → scrub brush → pressure washer → cloth.

const R = LEVEL_META.levels['golden-trophy']?.regions ?? { ball: [0, 0, 1024, 640], base: [0, 640, 1024, 1024] };

export const goldenTrophy = {
  id: 'golden-trophy',
  title: 'Golden Ball Trophy',
  backgrounds: { portrait: 'golden-trophy-bg-portrait', landscape: 'golden-trophy-bg-landscape' },
  thumbnail: 'golden-trophy-thumb',
  thumbnailClean: 'golden-trophy-thumb-clean', // hub preview once completed
  resultPicture: 'golden-trophy-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'golden-trophy-mask',
    outsideMask: 'golden-trophy-mask-outside',
    regions: { ball: { rect: R.ball }, base: { rect: R.base } },
    layers: [
      { id: 'clean', texture: 'golden-trophy-clean', initial: 'full', static: true },
      { id: 'wet', texture: 'golden-trophy-wet', initial: 'full' },
      { id: 'tarnishWet', texture: 'golden-trophy-tarnish-wet', initial: 'full' },
      { id: 'tarnished', texture: 'golden-trophy-tarnished', initial: 'full' },
      { id: 'scrubbed', texture: 'golden-trophy-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'golden-trophy-foam', initial: 'empty' },
      { id: 'dusty', texture: 'golden-trophy-dusty', initial: 'full' },
      { id: 'mud', texture: 'golden-trophy-mudcrust', initial: 'chunks' },
    ],
  },
  stages: [
    { id: 'chisel', tool: 'chisel', mechanic: 'chunkBreak', params: { layer: 'mud', chunkCount: 26, breakDistance: 170, tipRadius: 38, seed: 3301 }, targetSeconds: [14, 20] },
    { id: 'dry-brush', tool: 'dry-brush', mechanic: 'brush', region: 'ball', params: { mode: 'reveal', layers: ['dusty'], radius: 62, aspect: 2.6, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'detail-brush', tool: 'detail-brush', mechanic: 'brush', region: 'base', outline: true, params: { mode: 'reveal', layers: ['dusty'], radius: 34, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'wet', tool: 'mist-nozzle', mechanic: 'brush', params: { mode: 'reveal', layers: ['tarnished'], radius: 100, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'foam-spray', family: 'foam', tool: 'foam-sprayer', mechanic: 'brush', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 115, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'scrub', family: 'scrub', tool: 'scrub-brush', mechanic: 'brush', params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['tarnishWet'], radius: 106, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'rinse', tool: 'washer-lance', mechanic: 'brush', params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'tarnishWet'], radius: 95, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'dry', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['wet'], radius: 125, threshold: 0.96 }, targetSeconds: [4, 6] },
  ],
};
