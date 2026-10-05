import { LEVEL_META } from '../generated/levelMeta.js';

// Level 4 · Chair. Stage order from the reference video 04:20–06:12 (REFERENCE-BREAKDOWN §3 L-D):
// trash → duster (chair) → duster (seat close-up) → foam can → drill brush → cloth (new leather)
// → wood putty into the dents → sandpaper → wood-stain sponge.

const M = LEVEL_META.levels.chair ?? { bounds: [200, 80, 820, 940], seatBounds: [260, 480, 760, 640], focus: { seat: [200, 420, 820, 700] }, spots: [[500, 120], [330, 400], [700, 400], [330, 860]] };
const [bx0, by0, bx1, by1] = M.bounds;
const [sx0, sy0, sx1, sy1] = M.seatBounds;
const W = bx1 - bx0;
const seatY = (sy0 + sy1) / 2;

export const chair = {
  id: 'chair',
  title: 'Chair',
  backgrounds: { portrait: 'chair-bg-portrait', landscape: 'chair-bg-landscape' },
  thumbnail: 'chair-thumb',
  resultPicture: 'chair-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'chair-mask',
    outsideMask: 'chair-mask-outside',
    shadow: 'flat',
    regions: {
      seat: { mask: 'chair-seat-mask' },
      frame: { not: 'seat' },
      // Repair spots are `free` circles: NOT intersected with the chair silhouette, because the
      // dent decals (and so the putty patches) partly hang over the chair's edges. The putty then
      // covers the whole hole, and sanding reaches and cleans the whole patch (Step 6 polish).
      spots: { circles: M.spots.map(([x, y]) => [x, y, 44]), free: true },
      // sanding works the putty patch (stamped at 2.3 × the dent radius, ≈ 51 from the centre);
      // the end-of-stage erase uses this region dilated by ~6, so the whole patch is removed
      // without asking the player to sand empty background around it
      spotsSand: { circles: M.spots.map(([x, y]) => [x, y, 54]), free: true },
    },
    focus: {
      seat: M.focus.seat,
      // trash stage: the chair plus the bin standing on the floor to its right (Step 6: the bin
      // is no longer below the chair, so the chair is framed much larger)
      trash: [bx0 - W * 0.18, by0, bx1 + W * 0.62, by1 + 20],
    },
    layers: [
      { id: 'clean', texture: 'chair-clean', initial: 'full', static: true },
      { id: 'sanded', texture: 'chair-sanded', initial: 'full' },
      { id: 'dented', texture: 'chair-dented', initial: 'full' },
      { id: 'seatOld', texture: 'chair-seat-old', initial: 'full' },
      { id: 'scrubbed', texture: 'chair-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'chair-foam', initial: 'empty' },
      { id: 'dustySeat', texture: 'chair-dusty-seat', initial: 'full' },
      { id: 'dustyFrame', texture: 'chair-dusty-frame', initial: 'full' },
      // Damage stays visible from the start (Step 6 polish): the holes and later the putty are
      // ABOVE the dust layers, so dusting never "reveals" them; positions unchanged for putty.
      { id: 'dents', initial: 'decals', decals: M.spots.map(([x, y], i) => ({ texture: `chair-dent-${(i % 3) + 1}`, x, y, size: 70 })) },
      { id: 'putty', initial: 'empty' },
    ],
  },
  stages: [
    {
      id: 'trash',
      tool: 'trash-bin',
      mechanic: 'dragToTarget',
      focus: 'trash',
      params: {
        target: { texture: 'trash-bin', x: bx1 + W * 0.36, y: by1 - 110, size: 260, mouth: 0.62 },
        items: [
          { texture: 'chair-trash-shirt', x: (bx0 + bx1) / 2, y: by0 + (sy0 - by0) * 0.35, size: 300 },
          { texture: 'chair-trash-can', x: sx0 + (sx1 - sx0) * 0.25, y: seatY - 40, size: 120 },
          { texture: 'chair-trash-peel', x: sx0 + (sx1 - sx0) * 0.7, y: seatY - 30, size: 170 },
          { texture: 'chair-trash-shoe', x: bx0 + W * 0.05, y: by1 - 50, size: 200 },
          { texture: 'chair-trash-bottle', x: (bx0 + bx1) / 2 + W * 0.08, y: by1 - 40, size: 180 },
        ],
      },
      targetSeconds: [6, 10],
    },
    { id: 'dust-chair', tool: 'duster', mechanic: 'brush', region: 'frame', params: { mode: 'reveal', layers: ['dustyFrame'], radius: 55, threshold: 0.94 }, targetSeconds: [8, 12] },
    { id: 'dust-seat', tool: 'duster', mechanic: 'brush', region: 'seat', outline: true, focus: 'seat', toolScale: 0.85, params: { mode: 'reveal', layers: ['dustySeat'], radius: 45, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'foam-can', tool: 'foam-can', mechanic: 'brush', region: 'seat', outline: true, focus: 'seat', toolScale: 0.75, params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', clip: 'chair-seat-outside', radius: 46, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'scrub', tool: 'drill-brush', mechanic: 'brush', region: 'seat', outline: true, focus: 'seat', toolScale: 0.85, params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: [], radius: 45, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'wipe-seat', tool: 'cloth', mechanic: 'brush', region: 'seat', outline: true, focus: 'seat', toolScale: 0.4, params: { mode: 'reveal', layers: ['scrubbed', 'foam', 'seatOld'], radius: 55, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'putty', tool: 'putty-knife', mechanic: 'spots', params: { region: 'spots', layer: 'putty', stamps: ['chair-putty-1', 'chair-putty-2', 'chair-putty-3'], base: 'chair-putty-1', fillDistance: 260, source: { texture: 'chair-putty-tub', x: (bx0 + bx1) / 2, y: by1 + 25, size: 170, load: 'chair-putty-1' } }, targetSeconds: [8, 12] },
    { id: 'sand', tool: 'sandpaper', mechanic: 'brush', region: 'spotsSand', outline: 'circles', params: { mode: 'reveal', layers: ['putty', 'dents', 'dented'], radius: 42, threshold: 0.95 }, targetSeconds: [6, 9] },
    { id: 'stain', tool: 'stain-sponge', mechanic: 'brush', region: 'frame', params: { mode: 'reveal', layers: ['dented', 'sanded'], radius: 90, threshold: 0.94 }, targetSeconds: [8, 12] },
  ],
};
