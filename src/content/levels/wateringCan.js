import { LEVEL_META } from '../generated/levelMeta.js';

// Level 14 · Dented Watering Can (CONTENT-MATRIX Batch A, early, 7 stages). Point targets (tap):
// hammer the dents out, then wire brush, foam, scrub, rinse, dry, spray-paint it green.

const M = LEVEL_META.levels['watering-can'] ?? { dents: [[380, 520], [600, 480], [480, 660]] };
const DENT = 112;

export const wateringCan = {
  id: 'watering-can',
  title: 'Watering Can',
  backgrounds: { portrait: 'bg-yard-portrait', landscape: 'bg-yard-landscape' },
  thumbnail: 'watering-can-thumb',
  thumbnailClean: 'watering-can-thumb-clean',
  resultPicture: 'watering-can-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'watering-can-mask',
    outsideMask: 'watering-can-mask-outside',
    shadow: 'flat',
    layers: [
      { id: 'clean', texture: 'watering-can-clean', initial: 'full', static: true }, // painted green
      { id: 'bare', texture: 'watering-can-bare', initial: 'full' },
      { id: 'wet', texture: 'watering-can-wet', initial: 'full' },
      { id: 'grimy', texture: 'watering-can-grimy', initial: 'full' },
      { id: 'scrubbed', texture: 'watering-can-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'watering-can-foam', initial: 'empty' },
      { id: 'rusty', texture: 'watering-can-rusty', initial: 'full' },
      // dents stay visible from the start (above the rust) until they are hammered out
      { id: 'dents', initial: 'decals', decals: M.dents.map(([x, y], i) => ({ texture: `watering-can-dent-${i + 1}`, x, y, size: DENT })) },
    ],
  },
  stages: [
    {
      id: 'hammer',
      family: 'hammer',
      tool: 'hammer',
      mechanic: 'points',
      params: { mode: 'tap', action: 'remove', taps: 3, outline: false, targets: M.dents.map(([x, y], i) => ({ x, y, r: DENT * 0.55, texture: `watering-can-dent-${i + 1}`, size: DENT, layer: 'dents' })) },
      targetSeconds: [4, 7],
    },
    { id: 'wire-brush', family: 'rust', tool: 'wire-brush', mechanic: 'brush', params: { mode: 'reveal', layers: ['rusty'], radius: 44, aspect: 2.0, threshold: 0.95 }, targetSeconds: [7, 10] },
    { id: 'foam-spray', family: 'foam', tool: 'foam-sprayer', mechanic: 'brush', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 100, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'scrub', family: 'scrub', tool: 'scrub-brush', mechanic: 'brush', params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['grimy'], radius: 96, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'rinse', family: 'rinse', tool: 'washer-lance', mechanic: 'brush', params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'grimy'], radius: 85, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'dry', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['wet'], radius: 120, threshold: 0.96 }, targetSeconds: [4, 7] },
    { id: 'spray-paint', family: 'spray', tool: 'spray-gun', mechanic: 'brush', params: { mode: 'reveal', layers: ['bare'], radius: 95, threshold: 0.96, paintTint: 0x3fae3a }, targetSeconds: [6, 9] },
  ],
};
