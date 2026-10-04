import { ASSET_META } from './generated/assetMeta.js';

// Tool catalogue. Pure data: how a tool is held and where it acts.
// All lengths are in OBJECT-LOCAL units (the object canvas: 1024 px, ball radius 440), so tools,
// offsets and jets scale together with the object on every screen size.
//
// kind:
//   'contact' – acts at its working point, which sits above the finger (workOffset).
//   'jet'     – the nozzle sits above the finger; the jet hits `jetLength` above the nozzle.
// displayLength: the tool's longest side in object-local units (reference proportions).
// workingPoint: normalized point on the texture (measured by scripts/prepare_assets.py).

function wp(id) {
  const m = ASSET_META.tools[id];
  return { x: m.workingPoint[0], y: m.workingPoint[1] };
}

export const TOOLS = {
  chisel: {
    id: 'chisel',
    name: 'Chisel',
    kind: 'contact',
    texture: 'tool-chisel',
    workingPoint: wp('chisel'),
    displayLength: 480,
    workOffset: { x: 0, y: -120 },
    tiltWithMotion: 6,
  },
  'dry-brush': {
    id: 'dry-brush',
    name: 'Dry brush',
    kind: 'contact',
    texture: 'tool-dry-brush',
    workingPoint: wp('dry-brush'),
    displayLength: 380,
    workOffset: { x: 0, y: -120 },
    tiltWithMotion: 10,
  },
  'foam-sprayer': {
    id: 'foam-sprayer',
    name: 'Foam sprayer',
    kind: 'jet',
    texture: 'tool-foam-sprayer',
    workingPoint: wp('foam-sprayer'),
    displayLength: 440,
    workOffset: { x: 0, y: -60 },
    jetLength: 480,
    jetStyle: 'foam',
  },
  'scrub-brush': {
    id: 'scrub-brush',
    name: 'Scrub brush',
    kind: 'contact',
    texture: 'tool-scrub-brush',
    workingPoint: wp('scrub-brush'),
    displayLength: 300,
    workOffset: { x: 0, y: -120 },
    tiltWithMotion: 10,
  },
  'washer-lance': {
    id: 'washer-lance',
    name: 'Pressure washer',
    kind: 'jet',
    texture: 'tool-washer-lance',
    workingPoint: wp('washer-lance'),
    displayLength: 760,
    workOffset: { x: 0, y: -60 },
    jetLength: 520,
    jetStyle: 'water',
  },
  cloth: {
    id: 'cloth',
    name: 'Cloth',
    kind: 'contact',
    texture: 'tool-cloth',
    workingPoint: wp('cloth'),
    displayLength: 340,
    workOffset: { x: 0, y: -130 },
    tiltWithMotion: 4,
    squash: true,
  },
};

export function getTool(id) {
  const tool = TOOLS[id];
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}
