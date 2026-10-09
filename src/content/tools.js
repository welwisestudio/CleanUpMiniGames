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
  // ---- Step 7: alternative tools (content/toolFamilies.js); same job, same mechanic ----
  'scrub-brush-oval': { id: 'scrub-brush-oval', name: 'Oval brush', kind: 'contact', texture: 'tool-scrub-brush-oval', workingPoint: wp('scrub-brush-oval'), displayLength: 320, workOffset: { x: 0, y: -120 }, tiltWithMotion: 10 },
  'foam-gun': { id: 'foam-gun', name: 'Foam gun', kind: 'jet', texture: 'tool-foam-gun', workingPoint: wp('foam-gun'), displayLength: 440, workOffset: { x: 0, y: -60 }, jetLength: 480, jetUi: 140, jetStyle: 'foam' },
  'foam-cannon': { id: 'foam-cannon', name: 'Foam cannon', kind: 'jet', texture: 'tool-foam-cannon', workingPoint: wp('foam-cannon'), displayLength: 460, workOffset: { x: 0, y: -60 }, jetLength: 480, jetUi: 140, jetStyle: 'foam' },
  // drying alternatives: the existing sponge / eraser art at the cloth's footprint size
  'wipe-sponge': { id: 'wipe-sponge', name: 'Sponge', kind: 'contact', texture: 'tool-stain-sponge', workingPoint: wp('stain-sponge'), displayLength: 290, workOffset: { x: 0, y: -130 }, tiltWithMotion: 5, squash: true },
  'wipe-eraser': { id: 'wipe-eraser', name: 'Magic eraser', kind: 'contact', texture: 'tool-eraser', workingPoint: wp('eraser'), displayLength: 270, workOffset: { x: 0, y: -130 }, tiltWithMotion: 5, squash: true },

  // ---- Step 8 Batch A (levels 6–15): new tools, each with one clear job (CONTENT-MATRIX §3.1) ----
  // fx: contact effect while working (sparks / shine / dust / sawdust / chips), jetStyle 'paint' /
  // 'air' for the spray gun and the air blower. Card alternatives reuse the same job and footprint
  // within ±10 % (content/toolFamilies.js).
  'steel-wool': { id: 'steel-wool', name: 'Steel wool', kind: 'contact', texture: 'tool-steel-wool', workingPoint: wp('steel-wool'), displayLength: 200, workOffset: { x: 0, y: -120 }, tiltWithMotion: 5, squash: true, fx: 'dust' },
  'wide-scraper': { id: 'wide-scraper', name: 'Scraper', kind: 'contact', texture: 'tool-wide-scraper', workingPoint: wp('wide-scraper'), displayLength: 400, workOffset: { x: 0, y: -110 }, tiltWithMotion: 6 },
  'paint-brush': { id: 'paint-brush', name: 'Paint brush', kind: 'contact', texture: 'tool-paint-brush', workingPoint: wp('paint-brush'), displayLength: 420, workOffset: { x: 0, y: -110 }, tiltWithMotion: 8 },
  'wire-brush': { id: 'wire-brush', name: 'Wire brush', kind: 'contact', texture: 'tool-wire-brush', workingPoint: wp('wire-brush'), displayLength: 380, workOffset: { x: 0, y: -120 }, tiltWithMotion: 8, fx: 'dust' },
  'angle-grinder': { id: 'angle-grinder', name: 'Angle grinder', kind: 'contact', texture: 'tool-angle-grinder', workingPoint: wp('angle-grinder'), displayLength: 460, workOffset: { x: 0, y: -170 }, tiltWithMotion: 4, fx: 'sparks' },
  'spray-gun': { id: 'spray-gun', name: 'Spray gun', kind: 'jet', texture: 'tool-spray-gun', workingPoint: wp('spray-gun'), displayLength: 420, workOffset: { x: 0, y: -60 }, jetLength: 420, jetUi: 130, jetStyle: 'paint' },
  polisher: { id: 'polisher', name: 'Polisher', kind: 'contact', texture: 'tool-polisher', workingPoint: wp('polisher'), displayLength: 460, workOffset: { x: 0, y: -170 }, tiltWithMotion: 4, fx: 'shine' },
  screwdriver: { id: 'screwdriver', name: 'Screwdriver', kind: 'contact', texture: 'tool-screwdriver', workingPoint: wp('screwdriver'), displayLength: 380, workOffset: { x: 0, y: -110 }, tiltWithMotion: 3 },
  'paint-roller': { id: 'paint-roller', name: 'Paint roller', kind: 'contact', texture: 'tool-paint-roller', workingPoint: wp('paint-roller'), displayLength: 400, workOffset: { x: 0, y: -150 }, tiltWithMotion: 3 },
  'keycap-puller': { id: 'keycap-puller', name: 'Keycap puller', kind: 'contact', texture: 'tool-keycap-puller', workingPoint: wp('keycap-puller'), displayLength: 320, workOffset: { x: 0, y: -110 }, tiltWithMotion: 3 },
  'air-blower': { id: 'air-blower', name: 'Air blower', kind: 'jet', texture: 'tool-air-blower', workingPoint: wp('air-blower'), displayLength: 360, workOffset: { x: 0, y: -60 }, jetLength: 360, jetUi: 110, jetStyle: 'air' },
  'cotton-swab': { id: 'cotton-swab', name: 'Cotton swab', kind: 'contact', texture: 'tool-cotton-swab', workingPoint: wp('cotton-swab'), displayLength: 360, workOffset: { x: 0, y: -110 }, tiltWithMotion: 6 },
  // Step 9: the STRIKE point is the centre of the hammer's striking head (left block of the head,
  // measured on the sprite; skins share the geometry) and it lands where the player points — the
  // head comes down on the dent, the handle hangs below (strike = head drop, ToolController)
  hammer: { id: 'hammer', name: 'Hammer', kind: 'contact', texture: 'tool-hammer', workingPoint: { x: 0.26, y: 0.145 }, displayLength: 360, workOffset: { x: 0, y: -26 }, tiltWithMotion: 2, strike: true },
  // drop targets / parts shown in the tool strip (not held)
  'soak-tub': { id: 'soak-tub', name: 'Soak tub', kind: 'target', texture: 'desk-fan-tub', displayLength: 300 },
  'fan-guard': { id: 'fan-guard', name: 'Fan guard', kind: 'target', texture: 'desk-fan-guard', displayLength: 300 },
  'new-keycaps': { id: 'new-keycaps', name: 'New keycaps', kind: 'target', texture: 'keyboard-cap-clean-1', displayLength: 300 },
  // card alternatives (same job, same mechanic)
  'turbo-lance': { id: 'turbo-lance', name: 'Turbo lance', kind: 'jet', texture: 'tool-turbo-lance', workingPoint: wp('turbo-lance'), displayLength: 760, workOffset: { x: 0, y: -60 }, jetLength: 520, jetUi: 150, jetStyle: 'water' },
  'gold-washer': { id: 'gold-washer', name: 'Gold washer', kind: 'jet', texture: 'tool-gold-washer', workingPoint: wp('gold-washer'), displayLength: 760, workOffset: { x: 0, y: -60 }, jetLength: 520, jetUi: 150, jetStyle: 'water' },
  'rust-steel-wool': { id: 'rust-steel-wool', name: 'Steel wool', kind: 'contact', texture: 'tool-steel-wool', workingPoint: wp('steel-wool'), displayLength: 240, workOffset: { x: 0, y: -120 }, tiltWithMotion: 5, squash: true, fx: 'dust' },
  'wire-wheel': { id: 'wire-wheel', name: 'Wire wheel', kind: 'contact', texture: 'tool-wire-wheel', workingPoint: wp('wire-wheel'), displayLength: 440, workOffset: { x: 0, y: -170 }, tiltWithMotion: 4, fx: 'sparks' },
  'scrape-putty-knife': { id: 'scrape-putty-knife', name: 'Putty knife', kind: 'contact', texture: 'tool-putty-knife', workingPoint: wp('putty-knife'), displayLength: 380, workOffset: { x: 0, y: -110 }, tiltWithMotion: 6 },
  'pro-scraper': { id: 'pro-scraper', name: 'Pro scraper', kind: 'contact', texture: 'tool-pro-scraper', workingPoint: wp('pro-scraper'), displayLength: 400, workOffset: { x: 0, y: -110 }, tiltWithMotion: 6 },
  'sanding-block': { id: 'sanding-block', name: 'Sanding block', kind: 'contact', texture: 'tool-sanding-block', workingPoint: wp('sanding-block'), displayLength: 170, workOffset: { x: 0, y: -120 }, tiltWithMotion: 5, squash: true, fx: 'sawdust' },
  'orbital-sander': { id: 'orbital-sander', name: 'Orbital sander', kind: 'contact', texture: 'tool-orbital-sander', workingPoint: wp('orbital-sander'), displayLength: 400, workOffset: { x: 0, y: -160 }, tiltWithMotion: 3, fx: 'sawdust' },
  'grind-sander': { id: 'grind-sander', name: 'Orbital sander', kind: 'contact', texture: 'tool-orbital-sander', workingPoint: wp('orbital-sander'), displayLength: 420, workOffset: { x: 0, y: -160 }, tiltWithMotion: 3, fx: 'sparks' },
  'gold-grinder': { id: 'gold-grinder', name: 'Gold grinder', kind: 'contact', texture: 'tool-gold-grinder', workingPoint: wp('gold-grinder'), displayLength: 460, workOffset: { x: 0, y: -170 }, tiltWithMotion: 4, fx: 'sparks' },
  airbrush: { id: 'airbrush', name: 'Airbrush', kind: 'jet', texture: 'tool-airbrush', workingPoint: wp('airbrush'), displayLength: 400, workOffset: { x: 0, y: -60 }, jetLength: 420, jetUi: 130, jetStyle: 'paint' },
  'gold-spray-gun': { id: 'gold-spray-gun', name: 'Gold spray gun', kind: 'jet', texture: 'tool-gold-spray-gun', workingPoint: wp('gold-spray-gun'), displayLength: 430, workOffset: { x: 0, y: -60 }, jetLength: 420, jetUi: 130, jetStyle: 'paint' },
  'orbital-polisher': { id: 'orbital-polisher', name: 'Orbital polisher', kind: 'contact', texture: 'tool-orbital-polisher', workingPoint: wp('orbital-polisher'), displayLength: 460, workOffset: { x: 0, y: -170 }, tiltWithMotion: 4, fx: 'shine' },
  'gold-polisher': { id: 'gold-polisher', name: 'Gold polisher', kind: 'contact', texture: 'tool-gold-polisher', workingPoint: wp('gold-polisher'), displayLength: 460, workOffset: { x: 0, y: -170 }, tiltWithMotion: 4, fx: 'shine' },
  'e-screwdriver': { id: 'e-screwdriver', name: 'Power driver', kind: 'contact', texture: 'tool-e-screwdriver', workingPoint: wp('e-screwdriver'), displayLength: 380, workOffset: { x: 0, y: -110 }, tiltWithMotion: 3 },
  'gold-screwdriver': { id: 'gold-screwdriver', name: 'Gold screwdriver', kind: 'contact', texture: 'tool-gold-screwdriver', workingPoint: wp('gold-screwdriver'), displayLength: 380, workOffset: { x: 0, y: -110 }, tiltWithMotion: 3 },
  'wide-roller': { id: 'wide-roller', name: 'Wide roller', kind: 'contact', texture: 'tool-wide-roller', workingPoint: wp('wide-roller'), displayLength: 420, workOffset: { x: 0, y: -150 }, tiltWithMotion: 3 },
  'foam-roller': { id: 'foam-roller', name: 'Foam roller', kind: 'contact', texture: 'tool-foam-roller', workingPoint: wp('foam-roller'), displayLength: 400, workOffset: { x: 0, y: -150 }, tiltWithMotion: 3 },
  mallet: { id: 'mallet', name: 'Rubber mallet', kind: 'contact', texture: 'tool-mallet', workingPoint: { x: 0.5, y: 0.2 }, displayLength: 360, workOffset: { x: 0, y: -26 }, tiltWithMotion: 2, strike: true },
  'gold-hammer': { id: 'gold-hammer', name: 'Gold hammer', kind: 'contact', texture: 'tool-gold-hammer', workingPoint: { x: 0.26, y: 0.155 }, displayLength: 360, workOffset: { x: 0, y: -26 }, tiltWithMotion: 2, strike: true },

  // ---- Step 8 Batch B (levels 16–50): new base tools, each with one clear physical job ----
  // laser cleaner: a short hot beam strips rust / patina / old paint (jetStyle + fx 'laser')
  laser: { id: 'laser', name: 'Laser cleaner', kind: 'jet', texture: 'tool-laser', workingPoint: wp('laser'), displayLength: 400, workOffset: { x: 0, y: -60 }, jetLength: 300, jetUi: 105, jetStyle: 'laser', fx: 'laser', beamTint: 0xff5a3c },
  // spray bottle: a fine mist of cleaner / conditioner / glass cleaner
  'spray-bottle': { id: 'spray-bottle', name: 'Spray bottle', kind: 'jet', texture: 'tool-spray-bottle', workingPoint: wp('spray-bottle'), displayLength: 380, workOffset: { x: 0, y: -60 }, jetLength: 360, jetUi: 115, jetStyle: 'mist' },
  // steam cleaner: hot steam lifts stains, grease and mould
  'steam-cleaner': { id: 'steam-cleaner', name: 'Steam cleaner', kind: 'jet', texture: 'tool-steam-cleaner', workingPoint: wp('steam-cleaner'), displayLength: 420, workOffset: { x: 0, y: -60 }, jetLength: 340, jetUi: 110, jetAngle: -112, jetStyle: 'steam', fx: 'steam' },
  // pump: hold its intake in the water to drain a basin (fill mechanic, mode drain)
  pump: { id: 'pump', name: 'Water pump', kind: 'contact', texture: 'tool-pump', workingPoint: wp('pump'), displayLength: 340, workOffset: { x: 0, y: -120 } },
  // garden hose: hold the jet in the basin to fill it (fill mechanic, mode fill)
  // Step 9: working point = centre of the outlet face (measured); the gun is held tilted 30° and the
  // water leaves the outlet along its axis (up-left), not straight up out of the top of the ring
  hose: { id: 'hose', name: 'Garden hose', kind: 'jet', texture: 'tool-hose', workingPoint: { x: 0.133, y: 0.189 }, displayLength: 360, holdAngle: 30, workOffset: { x: 40, y: -40 }, jetAngle: -132, jetLength: 380, jetUi: 120, jetStyle: 'water' },
  whetstone: { id: 'whetstone', name: 'Whetstone', kind: 'contact', texture: 'tool-whetstone', workingPoint: wp('whetstone'), displayLength: 300, workOffset: { x: 0, y: -120 }, tiltWithMotion: 6, fx: 'sparks' },
  'carpet-beater': { id: 'carpet-beater', name: 'Carpet beater', kind: 'contact', texture: 'tool-carpet-beater', workingPoint: wp('carpet-beater'), displayLength: 460, workOffset: { x: 0, y: -170 }, tiltWithMotion: 3 },
  mop: { id: 'mop', name: 'Mop', kind: 'contact', texture: 'tool-mop', workingPoint: wp('mop'), displayLength: 520, workOffset: { x: 0, y: -200 }, tiltWithMotion: 3 },
  // drop targets
  // Step 9: the skimmer net is held; its net head collects floating debris (collect mechanic)
  'skimmer-net': { id: 'skimmer-net', name: 'Skimmer net', kind: 'contact', texture: 'tool-skimmer-net', workingPoint: wp('skimmer-net'), displayLength: 620, workOffset: { x: 0, y: -260 }, tiltWithMotion: 4 },
  // Step 9 reusable tools for large surfaces / narrow gaps
  'pool-brush': { id: 'pool-brush', name: 'Pool brush', kind: 'contact', texture: 'tool-pool-brush', workingPoint: wp('pool-brush'), displayLength: 640, workOffset: { x: 0, y: -280 }, tiltWithMotion: 3 },
  'wash-mitt': { id: 'wash-mitt', name: 'Wash mitt', kind: 'contact', texture: 'tool-wash-mitt', workingPoint: wp('wash-mitt'), displayLength: 300, workOffset: { x: 0, y: -130 }, tiltWithMotion: 5, squash: true },
  'crevice-brush': { id: 'crevice-brush', name: 'Crevice brush', kind: 'contact', texture: 'tool-crevice-brush', workingPoint: wp('crevice-brush'), displayLength: 360, workOffset: { x: 0, y: -110 }, tiltWithMotion: 8 },
  'gem-set': { id: 'gem-set', name: 'Gems', kind: 'target', texture: 'royal-throne-gem-1', displayLength: 200 },
};

export function getTool(id) {
  const tool = TOOLS[id];
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
}
