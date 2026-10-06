import { ASSET_META } from './generated/assetMeta.js';
import { LEVEL_META } from './generated/levelMeta.js';

// Tool catalogue. Pure data: how a tool is held and where it acts.
// All lengths are in OBJECT-LOCAL units (the object canvas: 1024 px, ball radius 440), so tools,
// offsets and jets scale together with the object on every screen size.
//
// kind:
//   'contact' – acts at its working point, which sits above the finger (workOffset).
//   'jet'     – the nozzle sits above the finger; the jet hits `jetLength` above the nozzle.
//   'target'  – not held: a drop target (trash bin) shown in the scene; items are dragged to it.
// displayLength: the tool's longest side in object-local units (reference proportions).
// workingPoint: normalized point on the texture (measured by scripts/prepare_assets.py).
// Step 6: the cleaning radius of every stage matches the visible working head of its tool
// (head widths measured from the sprites; see DECISIONS). A stage may set `toolScale` when a
// close-up framing needs a smaller tool.
// Step 6 (second pass):
//   head        – long soft head [width, length]: the cleaning footprint is an upright ellipse of
//                 that shape (duster), not an oversized circle.
//   holdAngle   – the sprite is held rotated (degrees) around its working point.
//   jetAngle    – jet direction in degrees (-90 = straight up, default). The side-nozzle foam can
//                 is held tilted 55° so its nozzle tube and the foam point up-right at the object.
//   scaleOffset – finger offset and jet length scale with the stage's toolScale (side-held tools
//                 whose body sits beside the finger: drill, foam can).
//   jetUi       – jet length in UI units (screen scale) instead of object units: a larger object
//                 then needs no extra finger room below it (Step 6 UI pass: objects framed larger).

function wp(id) {
  const m = ASSET_META.tools[id] ?? LEVEL_META.tools[`tool-${id}`];
  return m ? { x: m.workingPoint[0], y: m.workingPoint[1] } : { x: 0.5, y: 0.5 };
}

// Long soft head (duster): [width, length] as a share of the sprite's longest side (measured).
function head(id) {
  return LEVEL_META.tools[`tool-${id}`]?.head ?? null;
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
    jetUi: 140, // jet length in UI units (screen scale, Step 6 UI pass), used instead of jetLength
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
    jetUi: 150, // jet length in UI units (screen scale)
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
  // ---- Step 5 tools (levels 2–5) ----
  squeegee: { id: 'squeegee', name: 'Squeegee', kind: 'contact', texture: 'tool-squeegee', workingPoint: wp('squeegee'), displayLength: 560, workOffset: { x: 0, y: -110 }, tiltWithMotion: 3 },
  'detail-brush': { id: 'detail-brush', name: 'Detail brush', kind: 'contact', texture: 'tool-detail-brush', workingPoint: wp('detail-brush'), displayLength: 520, workOffset: { x: 0, y: -110 }, tiltWithMotion: 8 },
  'mist-nozzle': { id: 'mist-nozzle', name: 'Water mist', kind: 'jet', texture: 'tool-mist-nozzle', workingPoint: wp('mist-nozzle'), displayLength: 400, workOffset: { x: 0, y: -60 }, jetLength: 440, jetUi: 140, jetStyle: 'mist' },
  // working point = centre of the fluffy head; the finger holds the handle below it
  duster: { id: 'duster', name: 'Duster', kind: 'contact', texture: 'tool-duster', workingPoint: wp('duster'), head: head('duster'), displayLength: 520, workOffset: { x: 0, y: -190 }, tiltWithMotion: 4 },
  // upright can with a side nozzle tube, held tilted 55°: the finger is on the can body, the foam
  // leaves the nozzle tip and travels up-right to the object, landing almost above the finger
  // (so every edge of the object is reachable on a narrow phone)
  'foam-can': { id: 'foam-can', name: 'Foam spray', kind: 'jet', texture: 'tool-foam-can', workingPoint: wp('foam-can'), displayLength: 380, workOffset: { x: -94, y: -210 }, holdAngle: -55, jetAngle: -55, jetLength: 260, jetStyle: 'foam', scaleOffset: true },
  // side / rear-three-quarter drill (reference): the round brush sticks out to the left and its
  // bristle face rubs the surface; the drill body sits to the right of the finger
  'drill-brush': { id: 'drill-brush', name: 'Drill brush', kind: 'contact', texture: 'tool-drill-brush', workingPoint: wp('drill-brush'), displayLength: 420, workOffset: { x: -90, y: -150 }, tiltWithMotion: 4, scaleOffset: true },
  'putty-knife': { id: 'putty-knife', name: 'Putty knife', kind: 'contact', texture: 'tool-putty-knife', workingPoint: wp('putty-knife'), displayLength: 380, workOffset: { x: 0, y: -110 }, tiltWithMotion: 6 },
  sandpaper: { id: 'sandpaper', name: 'Sandpaper', kind: 'contact', texture: 'tool-sandpaper', workingPoint: wp('sandpaper'), displayLength: 110, workOffset: { x: 0, y: -120 }, tiltWithMotion: 5, squash: true },
  'stain-sponge': { id: 'stain-sponge', name: 'Stain sponge', kind: 'contact', texture: 'tool-stain-sponge', workingPoint: wp('stain-sponge'), displayLength: 200, workOffset: { x: 0, y: -120 }, tiltWithMotion: 5, squash: true },
  eraser: { id: 'eraser', name: 'Eraser', kind: 'contact', texture: 'tool-eraser', workingPoint: wp('eraser'), displayLength: 150, workOffset: { x: 0, y: -120 }, tiltWithMotion: 5, squash: true },
  'trash-bin': { id: 'trash-bin', name: 'Trash bin', kind: 'target', texture: 'trash-bin', displayLength: 300 },
};

export function getTool(id) {
  const tool = TOOLS[id];
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}
