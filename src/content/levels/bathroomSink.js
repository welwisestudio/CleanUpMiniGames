import { LEVEL_META } from '../generated/levelMeta.js';

// Level 10 · Bathroom Sink & Faucet (CONTENT-MATRIX Batch A, early, 7 stages). Restoration idea:
// limescale off the faucet and a chrome shine with the polisher. Junk → bin, foam the basin, scrub,
// detail brush on the faucet limescale, mist rinse, dry, polish the chrome.

const M = LEVEL_META.levels['bathroom-sink'] ?? { bounds: [130, 150, 890, 860], basinBounds: [130, 330, 890, 860] };
const [bx0, by0, bx1, by1] = M.bounds;
const [sx0, sy0, sx1, sy1] = M.basinBounds ?? M.bounds;
const W = bx1 - bx0;
const H = by1 - by0;
const SW = sx1 - sx0;
const SH = sy1 - sy0;

export const bathroomSink = {
  id: 'bathroom-sink',
  title: 'Bathroom Sink',
  backgrounds: { portrait: 'bg-wash-portrait', landscape: 'bg-wash-landscape' },
  thumbnail: 'bathroom-sink-thumb',
  thumbnailClean: 'bathroom-sink-thumb-clean',
  resultPicture: 'bathroom-sink-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'bathroom-sink-mask',
    outsideMask: 'bathroom-sink-mask-outside',
    shadow: 'flat',
    regions: {
      basin: { mask: 'bathroom-sink-basin-mask' },
      faucet: { mask: 'bathroom-sink-faucet-mask' },
    },
    focus: { trash: [bx0 - W * 0.05, by0 - H * 0.05, bx1 + W * 0.5, by1 + H * 0.05] },
    layers: [
      { id: 'clean', texture: 'bathroom-sink-clean', initial: 'full', static: true },
      { id: 'dull', texture: 'bathroom-sink-dull', initial: 'full' },
      { id: 'wet', texture: 'bathroom-sink-wet', initial: 'full' },
      { id: 'limescale', texture: 'bathroom-sink-limescale', initial: 'full' },
      { id: 'scummy', texture: 'bathroom-sink-scummy', initial: 'full' },
      { id: 'scrubbed', texture: 'bathroom-sink-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'bathroom-sink-foam', initial: 'empty' },
    ],
  },
  stages: [
    {
      id: 'trash',
      tool: 'trash-bin',
      mechanic: 'dragToTarget',
      focus: 'trash',
      params: {
        target: { texture: 'trash-bin', x: bx1 + W * 0.28, y: by1 - 60, size: 230, mouth: 0.62 },
        items: [
          { texture: 'bathroom-sink-junk-brush', x: sx0 + SW * 0.3, y: sy0 + SH * 0.35, size: 210 },
          { texture: 'bathroom-sink-junk-soap', x: sx0 + SW * 0.62, y: sy0 + SH * 0.3, size: 120 },
          { texture: 'bathroom-sink-junk-tube', x: sx0 + SW * 0.45, y: sy0 + SH * 0.55, size: 190 },
          { texture: 'bathroom-sink-junk-swabs', x: sx0 + SW * 0.72, y: sy0 + SH * 0.55, size: 140 },
          { texture: 'bathroom-sink-junk-tissue', x: sx0 + SW * 0.25, y: sy0 + SH * 0.6, size: 140 },
        ],
      },
      targetSeconds: [6, 10],
    },
    { id: 'foam-spray', family: 'foam', tool: 'foam-sprayer', mechanic: 'brush', region: 'basin', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', clip: 'bathroom-sink-basin-outside', radius: 105, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'scrub', family: 'scrub', tool: 'scrub-brush', mechanic: 'brush', region: 'basin', params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['scummy'], radius: 96, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'limescale', tool: 'detail-brush', mechanic: 'brush', region: 'faucet', outline: true, params: { mode: 'reveal', layers: ['limescale'], radius: 34, threshold: 0.95 }, targetSeconds: [5, 8] },
    { id: 'rinse', tool: 'mist-nozzle', mechanic: 'brush', region: 'basin', params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'scummy'], radius: 100, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'dry', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['wet'], radius: 120, threshold: 0.96 }, targetSeconds: [4, 7] },
    { id: 'polish', family: 'polish', tool: 'polisher', mechanic: 'brush', region: 'faucet', outline: true, params: { mode: 'reveal', layers: ['dull'], radius: 40, threshold: 0.95 }, targetSeconds: [4, 7] },
  ],
};
