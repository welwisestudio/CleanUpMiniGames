import { LEVEL_META } from '../generated/levelMeta.js';

// Level 12 · Garden Bench (CONTENT-MATRIX Batch A, sample S2, 8 stages). New: paint loading (the
// roller is dipped in the tray, the brush in the can) and active zones (wooden slats vs iron frame;
// the other zone is dimmed). Leaves → bin, scrape the flaking paint, sand the slats, wire-brush the
// frame, wipe, roll the slats, paint the frame black, varnish the slats.

const M = LEVEL_META.levels['garden-bench'] ?? { bounds: [80, 230, 950, 830], slatsBounds: [150, 230, 900, 700] };
const [bx0, by0, bx1, by1] = M.bounds;
const W = bx1 - bx0;
const H = by1 - by0;
const [sx0, sy0, sx1, sy1] = M.slatsBounds ?? M.bounds;
const SW = sx1 - sx0;
const SH = sy1 - sy0;
// paint sources stand on the ground in front of the bench
const TRAY = { texture: 'garden-bench-paint-tray', x: bx0 + W * 0.22, y: by1 + 95, size: 260, opening: { dx: 0.08, dy: 0.05, r: 0.24 }, capacity: 2600, load: 'fx-dot', tint: 0xc98a3c };
const CAN = { texture: 'garden-bench-paint-can', x: bx1 - W * 0.12, y: by1 + 90, size: 190, opening: { dx: 0, dy: -0.12, r: 0.26 }, capacity: 2200, load: 'fx-dot', tint: 0x1d1d22 };

export const gardenBench = {
  id: 'garden-bench',
  title: 'Garden Bench',
  backgrounds: { portrait: 'bg-yard-portrait', landscape: 'bg-yard-landscape' },
  thumbnail: 'garden-bench-thumb',
  thumbnailClean: 'garden-bench-thumb-clean',
  resultPicture: 'garden-bench-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'garden-bench-mask',
    outsideMask: 'garden-bench-mask-outside',
    shadow: 'flat',
    regions: {
      slats: { mask: 'garden-bench-slats-mask' },
      frame: { mask: 'garden-bench-frame-mask' },
    },
    focus: {
      trash: [bx0 - W * 0.02, by0 - H * 0.05, bx1 + W * 0.4, by1 + 30],
      paint: [bx0 - W * 0.02, by0, bx1 + W * 0.02, by1 + 200],
    },
    layers: [
      { id: 'clean', texture: 'garden-bench-clean', initial: 'full', static: true },
      { id: 'painted', texture: 'garden-bench-painted', initial: 'full' },
      { id: 'bare', texture: 'garden-bench-bare', initial: 'full' },
      { id: 'dusty', texture: 'garden-bench-dusty', initial: 'full' },
      { id: 'rusty', texture: 'garden-bench-rusty', initial: 'full' },
      { id: 'weathered', texture: 'garden-bench-weathered', initial: 'full' },
      { id: 'flaking', texture: 'garden-bench-flaking', initial: 'chunks' },
    ],
  },
  stages: [
    {
      id: 'leaves',
      tool: 'trash-bin',
      mechanic: 'dragToTarget',
      focus: 'trash',
      params: {
        target: { texture: 'trash-bin', x: bx1 + W * 0.24, y: by1 - 50, size: 230, mouth: 0.62 },
        items: [
          { texture: 'garden-bench-leaf-1', x: sx0 + SW * 0.25, y: sy0 + SH * 0.65, size: 150 },
          { texture: 'garden-bench-leaf-2', x: sx0 + SW * 0.55, y: sy0 + SH * 0.7, size: 140 },
          { texture: 'garden-bench-leaf-3', x: sx0 + SW * 0.4, y: sy0 + SH * 0.25, size: 110 },
          { texture: 'garden-bench-leaf-4', x: sx0 + SW * 0.75, y: sy0 + SH * 0.35, size: 130 },
          { texture: 'garden-bench-leaf-5', x: bx0 + W * 0.5, y: by1 - 30, size: 150 },
        ],
      },
      targetSeconds: [6, 10],
    },
    { id: 'peel', family: 'scrape', tool: 'wide-scraper', mechanic: 'chunkBreak', fx: 'chips', params: { layer: 'flaking', chunkCount: 20, breakDistance: 120, tipRadius: 48, seed: 1212 }, targetSeconds: [10, 14] },
    { id: 'sand', family: 'sand', tool: 'sandpaper', mechanic: 'brush', fx: 'sawdust', region: 'slats', dim: true, params: { mode: 'reveal', layers: ['weathered'], radius: 60, threshold: 0.95 }, targetSeconds: [7, 10] },
    { id: 'wire-brush', family: 'rust', tool: 'wire-brush', mechanic: 'brush', outline: false, region: 'frame', dim: true, params: { mode: 'reveal', layers: ['rusty'], radius: 40, aspect: 2.0, threshold: 0.94 }, targetSeconds: [7, 10] },
    { id: 'wipe', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['dusty'], radius: 110, threshold: 0.95 }, targetSeconds: [5, 8] },
    { id: 'roll', family: 'roll', tool: 'paint-roller', mechanic: 'brush', region: 'slats', dim: true, focus: 'paint', params: { mode: 'reveal', layers: ['bare'], radius: 38, aspect: 2.6, threshold: 0.95, source: TRAY }, targetSeconds: [8, 12] },
    { id: 'paint-frame', tool: 'paint-brush', mechanic: 'brush', outline: false, region: 'frame', dim: true, focus: 'paint', params: { mode: 'reveal', layers: ['bare'], radius: 30, aspect: 1.8, threshold: 0.94, source: CAN }, targetSeconds: [8, 12] },
    { id: 'varnish', tool: 'stain-sponge', mechanic: 'brush', region: 'slats', params: { mode: 'reveal', layers: ['painted'], radius: 90, threshold: 0.95 }, targetSeconds: [5, 8] },
  ],
};
