import { LEVEL_META } from '../generated/levelMeta.js';

// Level 13 · Keyboard (CONTENT-MATRIX Batch A, early, 7 stages). Point targets (pull) and parts
// (new keycaps into their slots). Pull the dirty keycaps → blow the crumbs out → brush the grime
// between the switches → swab the sticky spill → wipe the case → new keycaps → final wipe.

const M = LEVEL_META.levels.keyboard ?? { bounds: [80, 260, 950, 780], cells: [[420, 470, 60], [480, 470, 60], [540, 470, 60], [600, 470, 60], [430, 530, 60], [490, 530, 60], [550, 530, 60], [610, 530, 60]] };
const [bx0, by0, bx1, by1] = M.bounds;
const W = bx1 - bx0;
const cells = M.cells;
const pullTargets = cells.map(([x, y, s], i) => ({ x, y, r: s * 0.55, texture: `keyboard-cap-dirty-${i + 1}`, size: s, layer: 'dirty' }));
// new keycaps wait in a row under the keyboard
const capItems = cells.map(([x, y, s], i) => ({
  texture: `keyboard-cap-clean-${i + 1}`,
  x: bx0 + W * (0.14 + (0.72 * i) / Math.max(1, cells.length - 1)),
  y: by1 + 70,
  size: s * 1.05,
  angle: 0,
  slot: { x, y, size: s },
  cut: `keyboard-cap-clean-${i + 1}`,
}));

export const keyboard = {
  id: 'keyboard',
  title: 'Keyboard',
  backgrounds: { portrait: 'bg-studio-portrait', landscape: 'bg-studio-landscape' },
  thumbnail: 'keyboard-thumb',
  thumbnailClean: 'keyboard-thumb-clean',
  resultPicture: 'keyboard-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'keyboard-mask',
    outsideMask: 'keyboard-mask-outside',
    shadow: 'flat',
    regions: {
      cells: { mask: 'keyboard-cells-mask' },
      spill: { mask: 'keyboard-spill-mask' },
    },
    focus: { caps: [bx0, by0, bx1, by1 + 140] },
    layers: [
      { id: 'clean', texture: 'keyboard-clean', initial: 'full', static: true },
      { id: 'smudged', texture: 'keyboard-smudged', initial: 'full' },
      { id: 'dusty', texture: 'keyboard-dusty', initial: 'full' },
      { id: 'removedClean', texture: 'keyboard-removed-clean', initial: 'full' },
      { id: 'removedGunk', texture: 'keyboard-removed-gunk', initial: 'full' },
      { id: 'removedCrumbs', texture: 'keyboard-removed-crumbs', initial: 'full' },
      { id: 'dirty', texture: 'keyboard-dirty', initial: 'full' },
    ],
  },
  stages: [
    { id: 'pull-caps', tool: 'keycap-puller', mechanic: 'points', params: { mode: 'pull', action: 'remove', holdMs: 450, targets: pullTargets }, targetSeconds: [6, 10] },
    { id: 'blow', tool: 'air-blower', mechanic: 'brush', region: 'cells', outline: true, params: { mode: 'reveal', layers: ['removedCrumbs'], radius: 60, threshold: 0.95 }, targetSeconds: [4, 7] },
    { id: 'brush', tool: 'detail-brush', mechanic: 'brush', region: 'cells', outline: true, params: { mode: 'reveal', layers: ['removedGunk'], radius: 34, threshold: 0.95 }, targetSeconds: [5, 8] },
    { id: 'swab', tool: 'cotton-swab', mechanic: 'brush', region: 'spill', outline: true, params: { mode: 'reveal', layers: ['dirty'], radius: 32, threshold: 0.94 }, targetSeconds: [6, 9] },
    { id: 'wipe-case', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['dirty', 'dusty'], radius: 110, threshold: 0.95 }, targetSeconds: [5, 8] },
    { id: 'new-caps', tool: 'new-keycaps', mechanic: 'dragToTarget', focus: 'caps', params: { items: capItems, anySlot: true, onPlace: { erase: 'removedClean' } }, targetSeconds: [8, 12] },
    { id: 'polish', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['smudged'], radius: 110, threshold: 0.95 }, targetSeconds: [4, 7] },
  ],
};
