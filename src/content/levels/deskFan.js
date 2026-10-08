import { LEVEL_META } from '../generated/levelMeta.js';

// Level 11 · Desk Fan (CONTENT-MATRIX Batch A, sample S1, 8 stages). New: point targets (hold) to
// unscrew and screw in, and parts (lift the guard off into the soak tub, put it back on).
// Unscrew 4 guard screws → guard off into the soak tub → duster on the blades → foam → scrub →
// cloth → guard back on (it soaked clean) → screws in.

const M = LEVEL_META.levels['desk-fan'] ?? { bounds: [190, 90, 830, 950], guard: [510, 380, 600], screws: [[510, 90], [800, 380], [510, 670], [220, 380]] };
const [bx0, by0, bx1, by1] = M.bounds;
const [gx, gy, gd] = M.guard;
const W = bx1 - bx0;
const TUB = { x: bx1 + W * 0.22, y: by1 - 90 };
const SCREW = 46;
const screws = (layer) => M.screws.map(([x, y]) => ({ x, y, r: 40, texture: 'desk-fan-screw', size: SCREW, layer }));

export const deskFan = {
  id: 'desk-fan',
  title: 'Desk Fan',
  backgrounds: { portrait: 'bg-studio-portrait', landscape: 'bg-studio-landscape' },
  thumbnail: 'desk-fan-thumb',
  thumbnailClean: 'desk-fan-thumb-clean',
  resultPicture: 'desk-fan-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'desk-fan-mask',
    outsideMask: 'desk-fan-mask-outside',
    shadow: 'flat',
    // the guard stages show the soak tub beside the fan
    focus: { tub: [bx0 - W * 0.05, by0, bx1 + W * 0.45, by1 + 20] },
    layers: [
      { id: 'clean', texture: 'desk-fan-clean', initial: 'full', static: true },
      { id: 'grimy', texture: 'desk-fan-grimy', initial: 'full' },
      { id: 'scrubbed', texture: 'desk-fan-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'desk-fan-foam', initial: 'empty' },
      { id: 'dusty', texture: 'desk-fan-dusty', initial: 'full' },
      { id: 'guardOld', texture: 'desk-fan-guard-old', initial: 'full' },
      { id: 'screws', initial: 'decals', decals: M.screws.map(([x, y]) => ({ texture: 'desk-fan-screw', x, y, size: SCREW })) },
      { id: 'guard', initial: 'empty' },
      { id: 'screwsNew', initial: 'empty' },
    ],
  },
  stages: [
    { id: 'unscrew', family: 'screw', tool: 'screwdriver', mechanic: 'points', params: { mode: 'hold', action: 'remove', holdMs: 750, targets: screws('screws'), tray: TUB }, targetSeconds: [5, 8] },
    {
      id: 'guard-off',
      tool: 'soak-tub',
      mechanic: 'dragToTarget',
      focus: 'tub',
      params: {
        target: { texture: 'desk-fan-tub', x: TUB.x, y: TUB.y, size: 250, mouth: 0.5 },
        items: [{ texture: 'desk-fan-guard-dusty', x: gx, y: gy, size: gd, angle: 0, fromLayer: 'guardOld' }],
      },
      targetSeconds: [3, 5],
    },
    { id: 'dust', tool: 'duster', mechanic: 'brush', params: { mode: 'reveal', layers: ['dusty'], radius: 55, threshold: 0.95 }, targetSeconds: [6, 9] },
    { id: 'foam-spray', family: 'foam', tool: 'foam-sprayer', mechanic: 'brush', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 100, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'scrub', family: 'scrub', tool: 'scrub-brush', mechanic: 'brush', params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['grimy'], radius: 96, threshold: 0.96 }, targetSeconds: [6, 9] },
    { id: 'wipe', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['foam', 'scrubbed', 'grimy'], radius: 120, threshold: 0.96 }, targetSeconds: [5, 8] },
    {
      id: 'guard-on',
      tool: 'fan-guard',
      mechanic: 'dragToTarget',
      focus: 'tub',
      params: {
        tray: { texture: 'desk-fan-tub', x: TUB.x, y: TUB.y, size: 250 },
        items: [{ texture: 'desk-fan-guard', x: TUB.x, y: TUB.y - 60, size: 230, angle: 0, slot: { x: gx, y: gy, size: gd } }],
        onPlace: { stamp: 'guard' },
      },
      targetSeconds: [3, 5],
    },
    { id: 'screw-in', family: 'screw', tool: 'screwdriver', mechanic: 'points', params: { mode: 'hold', action: 'install', holdMs: 750, targets: screws('screwsNew') }, targetSeconds: [5, 8] },
  ],
};
