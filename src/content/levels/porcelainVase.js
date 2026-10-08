import { LEVEL_META } from '../generated/levelMeta.js';

// Level 15 · Porcelain Vase (CONTENT-MATRIX Batch A, early, 7 stages). Delicate cleaning plus one
// repair: duster → water mist → foam → detail brush on the relief → mist rinse → dry → fill and
// touch up the chips (one spot stage with the paint brush; each patch restores the glaze).

const M = LEVEL_META.levels['porcelain-vase'] ?? { chips: [[420, 560], [620, 470], [520, 720]] };
const CHIP = 84;

export const porcelainVase = {
  id: 'porcelain-vase',
  title: 'Porcelain Vase',
  backgrounds: { portrait: 'bg-studio-portrait', landscape: 'bg-studio-landscape' },
  thumbnail: 'porcelain-vase-thumb',
  thumbnailClean: 'porcelain-vase-thumb-clean',
  resultPicture: 'porcelain-vase-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'porcelain-vase-mask',
    outsideMask: 'porcelain-vase-mask-outside',
    shadow: 'flat',
    regions: {
      chips: { circles: M.chips.map(([x, y]) => [x, y, CHIP / 2]), free: true },
    },
    layers: [
      { id: 'clean', texture: 'porcelain-vase-clean', initial: 'full', static: true },
      { id: 'wet', texture: 'porcelain-vase-wet', initial: 'full' },
      { id: 'grimyWet', texture: 'porcelain-vase-grimy-wet', initial: 'full' },
      { id: 'scrubbed', texture: 'porcelain-vase-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'porcelain-vase-foam', initial: 'empty' },
      { id: 'grimy', texture: 'porcelain-vase-grimy', initial: 'full' },
      { id: 'dusty', texture: 'porcelain-vase-dusty', initial: 'full' },
      // chips stay visible from the start; the touch-up patches cover them
      { id: 'chips', initial: 'decals', decals: M.chips.map(([x, y], i) => ({ texture: `porcelain-vase-chip-${i + 1}`, x, y, size: CHIP })) },
      { id: 'patch', initial: 'empty' },
    ],
  },
  stages: [
    { id: 'dust', tool: 'duster', mechanic: 'brush', params: { mode: 'reveal', layers: ['dusty'], radius: 55, threshold: 0.95 }, targetSeconds: [5, 8] },
    { id: 'wet', tool: 'mist-nozzle', mechanic: 'brush', params: { mode: 'reveal', layers: ['grimy'], radius: 100, threshold: 0.96 }, targetSeconds: [4, 7] },
    { id: 'foam-spray', family: 'foam', tool: 'foam-sprayer', mechanic: 'brush', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 100, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'relief', tool: 'detail-brush', mechanic: 'brush', params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['grimyWet'], radius: 40, threshold: 0.95 }, targetSeconds: [8, 12] },
    { id: 'rinse', tool: 'mist-nozzle', mechanic: 'brush', params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'grimyWet'], radius: 100, threshold: 0.96 }, targetSeconds: [4, 7] },
    { id: 'dry', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['wet'], radius: 110, threshold: 0.96 }, targetSeconds: [4, 7] },
    { id: 'touch-up', tool: 'paint-brush', mechanic: 'spots', params: { region: 'chips', layer: 'patch', stamps: M.chips.map((_, i) => `porcelain-vase-patch-${i + 1}`), fillDistance: 220 }, targetSeconds: [6, 10] },
  ],
};
