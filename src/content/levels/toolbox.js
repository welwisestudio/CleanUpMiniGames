import { LEVEL_META } from '../generated/levelMeta.js';

// Level 9 · Rusty Toolbox (CONTENT-MATRIX Batch A, early, 7 stages). Restoration idea: grind the
// rust down to bright steel and repaint. Junk → bin, dust, pink rust-remover foam, wire brush,
// angle grinder (sparks), spray gun (red), cloth.

const M = LEVEL_META.levels.toolbox ?? { bounds: [120, 220, 900, 800] };
const [bx0, by0, bx1, by1] = M.bounds;
const W = bx1 - bx0;
const H = by1 - by0;

export const toolbox = {
  id: 'toolbox',
  title: 'Toolbox',
  backgrounds: { portrait: 'bg-workshop-portrait', landscape: 'bg-workshop-landscape' },
  thumbnail: 'toolbox-thumb',
  thumbnailClean: 'toolbox-thumb-clean',
  resultPicture: 'toolbox-result-picture',
  object: {
    canvasSize: 1024,
    mask: 'toolbox-mask',
    outsideMask: 'toolbox-mask-outside',
    shadow: 'flat',
    focus: { trash: [bx0 - W * 0.05, by0 - H * 0.15, bx1 + W * 0.55, by1 + H * 0.12] },
    layers: [
      { id: 'clean', texture: 'toolbox-clean', initial: 'full', static: true },
      { id: 'painted', texture: 'toolbox-painted', initial: 'full' },
      { id: 'bright', texture: 'toolbox-bright', initial: 'full' },
      { id: 'stained', texture: 'toolbox-stained', initial: 'full' },
      { id: 'rusty', texture: 'toolbox-rusty', initial: 'full' },
      { id: 'scrubbed', texture: 'toolbox-foam-scrubbed', initial: 'empty' },
      { id: 'foam', texture: 'toolbox-foam', initial: 'empty' },
      { id: 'dusty', texture: 'toolbox-dusty', initial: 'full' },
    ],
  },
  stages: [
    {
      id: 'trash',
      tool: 'trash-bin',
      mechanic: 'dragToTarget',
      focus: 'trash',
      params: {
        target: { texture: 'trash-bin', x: bx1 + W * 0.3, y: by1 - 40, size: 240, mouth: 0.62 },
        items: [
          { texture: 'toolbox-junk-rag', x: bx0 + W * 0.25, y: by0 + H * 0.12, size: 230 },
          { texture: 'toolbox-junk-bolt', x: bx0 + W * 0.62, y: by0 + H * 0.05, size: 130 },
          { texture: 'toolbox-junk-bag', x: bx0 + W * 0.18, y: by0 + H * 0.6, size: 190 },
          { texture: 'toolbox-junk-glove', x: bx0 + W * 0.55, y: by0 + H * 0.55, size: 190 },
          { texture: 'toolbox-junk-wire', x: bx0 + W * 0.85, y: by0 + H * 0.35, size: 150 },
        ],
      },
      targetSeconds: [6, 10],
    },
    { id: 'dust', tool: 'duster', mechanic: 'brush', params: { mode: 'reveal', layers: ['dusty'], radius: 55, threshold: 0.95 }, targetSeconds: [6, 9] },
    { id: 'foam-spray', family: 'foam', tool: 'foam-sprayer', mechanic: 'brush', params: { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 105, threshold: 0.96 }, targetSeconds: [5, 8] },
    { id: 'wire-brush', family: 'rust', tool: 'wire-brush', mechanic: 'brush', params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['rusty'], radius: 44, aspect: 2.0, threshold: 0.95 }, targetSeconds: [7, 10] },
    { id: 'grind', family: 'grind', tool: 'angle-grinder', mechanic: 'brush', params: { mode: 'reveal', layers: ['scrubbed', 'foam', 'stained'], radius: 82, threshold: 0.95 }, targetSeconds: [7, 10] },
    { id: 'spray-paint', family: 'spray', tool: 'spray-gun', mechanic: 'brush', params: { mode: 'reveal', layers: ['bright'], radius: 95, threshold: 0.96, paintTint: 0xe8322a }, targetSeconds: [6, 9] },
    { id: 'wipe', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['painted'], radius: 120, threshold: 0.96 }, targetSeconds: [4, 7] },
  ],
};
