import { BATCH_A_ASSETS } from './generated/batchAAssets.js';
import { BATCH_B_ASSETS, BATCH_B_BOOT } from './generated/batchBAssets.js';

// Runtime asset registry (local files only; nothing is fetched from Higgsfield at runtime).
// Sources: Nano Banana 2 masters → Higgsfield Background Remover → scripts/prepare_assets.py.
// See project/ASSET-MANIFEST.md for prompts, job IDs and review results.

const L = 'assets/soccer-ball/';
const U = 'assets/ui/';

export const IMAGE_ASSETS = {
  // Soccer Ball level
  'bg-pitch-portrait': `${L}bg-pitch-portrait.webp`,
  'bg-pitch-landscape': `${L}bg-pitch-landscape.webp`,
  'ball-clean': `${L}ball-clean.webp`,
  'ball-wet': `${L}ball-wet.webp`,
  'ball-stained': `${L}ball-stained.webp`,
  'ball-dusty': `${L}ball-dusty.webp`,
  'ball-mudcrust': `${L}ball-mudcrust.webp`,
  'tex-foam-full': `${L}tex-foam-full.webp`,
  'tex-foam-scrubbed-full': `${L}tex-foam-scrubbed-full.webp`,
  'stamp-foam': `${L}stamp-foam.webp`,
  'mask-outside': `${L}mask-outside.png`,
  'thumb-soccer-ball': `${L}thumb-soccer-ball.webp`,
  'thumb-clean-soccer-ball': `${L}thumb-clean-soccer-ball.webp`,
  'result-picture-soccer-ball': `${L}result-picture-soccer-ball.webp`,
  'tool-chisel': `${L}tool-chisel.webp`,
  'tool-dry-brush': `${L}tool-dry-brush.webp`,
  'tool-foam-sprayer': `${L}tool-foam-sprayer.webp`,
  'tool-scrub-brush': `${L}tool-scrub-brush.webp`,
  'tool-washer-lance': `${L}tool-washer-lance.webp`,
  'tool-cloth': `${L}tool-cloth.webp`,
  'fx-chunk-1': `${L}fx-chunk-1.webp`,
  'fx-chunk-2': `${L}fx-chunk-2.webp`,
  'fx-chunk-3': `${L}fx-chunk-3.webp`,
  'fx-chunk-4': `${L}fx-chunk-4.webp`,
  'fx-chunk-5': `${L}fx-chunk-5.webp`,
  'fx-drop-1': `${L}fx-drop-1.webp`,
  'fx-drop-2': `${L}fx-drop-2.webp`,
  'fx-sparkle': `${L}fx-sparkle.webp`,
  // Shared UI
  'ui-tile-large': `${U}ui-tile-large.webp`,
  'ui-tile-small': `${U}ui-tile-small.webp`,
  'ui-btn-square': `${U}ui-btn-square.webp`,
  'ui-btn-green': `${U}ui-btn-green.webp`,
  'ui-btn-yellow': `${U}ui-btn-yellow.webp`,
  'ui-btn-white': `${U}ui-btn-white.webp`,
  'ui-pill': `${U}ui-pill.webp`,
  'ui-progress-fill': `${U}ui-progress-fill.webp`,
  'ui-result-card': `${U}ui-result-card.webp`,
  'ui-shelf': `${U}ui-shelf.webp`,
  'icon-coin': `${U}icon-coin.webp`,
  'icon-diamond': `${U}icon-diamond.webp`,
  'icon-pause': `${U}icon-pause.webp`,
  'icon-home': `${U}icon-home.webp`,
  'icon-check': `${U}icon-check.webp`,
  'icon-ad': `${U}icon-ad.webp`,
  // Step 6 UI / reward pass (Nano Banana 2; scripts/prepare_levels.py rewards)
  'ui-btn-orange': `${U}ui-btn-orange.webp`,
  'ui-btn-purple': `${U}ui-btn-purple.webp`,
  'icon-ad-clapper': `${U}icon-ad-clapper.webp`,
  'ui-btn-pink': `${U}ui-btn-pink.webp`,
  'icon-replay': `${U}icon-replay.webp`,
  'icon-next': `${U}icon-next.webp`,
  'icon-vip': `${U}icon-vip.webp`,
  // Step 7 alternative tools
  'tool-scrub-brush-oval': 'assets/shared/tool-scrub-brush-oval.webp',
  'tool-foam-gun': 'assets/shared/tool-foam-gun.webp',
  'tool-foam-cannon': 'assets/shared/tool-foam-cannon.webp',
  'ui-chest-timed': `${U}ui-chest-timed.webp`,
  'ui-chest-progress': `${U}ui-chest-progress.webp`,
};

// ---- Step 5: levels 2–5, shared tools and UI (scripts/prepare_levels.py) ----
const level = (id, files) => Object.fromEntries(Object.entries(files).map(([k, f]) => [`${id}-${k}`, `assets/${id}/${f}`]));
const common = { 'bg-portrait': 'bg-portrait.webp', 'bg-landscape': 'bg-landscape.webp', thumb: 'thumb.webp', 'thumb-clean': 'thumb-clean.webp', 'result-picture': 'result-picture.webp', mask: 'mask.png', 'mask-outside': 'mask-outside.png', foam: 'tex-foam-full.webp', 'foam-scrubbed': 'tex-foam-scrubbed-full.webp' };
Object.assign(
  IMAGE_ASSETS,
  level('rug', { ...common, clean: 'rug-clean.webp', wet: 'rug-wet.webp', stained: 'rug-stained.webp', muddy: 'rug-muddy.webp', sandy: 'rug-sandy.webp' }),
  level('golden-trophy', { ...common, clean: 'trophy-clean.webp', wet: 'trophy-wet.webp', 'tarnish-wet': 'trophy-tarnish-wet.webp', tarnished: 'trophy-tarnished.webp', dusty: 'trophy-dusty.webp', mudcrust: 'trophy-mudcrust.webp' }),
  level('chair', {
    ...common,
    clean: 'chair-clean.webp',
    sanded: 'chair-sanded.webp',
    dented: 'chair-dented.webp',
    'seat-old': 'chair-seat-old.webp',
    'dusty-seat': 'chair-dusty-seat.webp',
    'dusty-frame': 'chair-dusty-frame.webp',
    'seat-mask': 'seat-mask.png',
    'seat-outside': 'seat-outside.png',
    'trash-shirt': 'trash-shirt.webp',
    'trash-can': 'trash-can.webp',
    'trash-peel': 'trash-peel.webp',
    'trash-shoe': 'trash-shoe.webp',
    'trash-bottle': 'trash-bottle.webp',
    'dent-1': 'dent-1.webp',
    'dent-2': 'dent-2.webp',
    'dent-3': 'dent-3.webp',
    'putty-1': 'putty-1.webp',
    'putty-2': 'putty-2.webp',
    'putty-3': 'putty-3.webp',
    'putty-tub': 'putty-tub.webp',
  }),
  level('sneaker', { ...common, 'scuffs-mask': 'scuffs-mask.png', clean: 'sneaker-clean.webp', scuffed: 'sneaker-scuffed.webp', wet: 'sneaker-wet.webp', stained: 'sneaker-stained.webp', muddy: 'sneaker-muddy.webp', mudcrust: 'sneaker-mudcrust.webp' }),
  { 'trash-bin': 'assets/chair/trash-bin.webp' },
  // paint masks of the shared paint can / tray (2026-10-11): the paint inside is recoloured to the stage's paint colour
  { 'garden-bench-paint-can-paint-mask': 'assets/garden-bench/paint-can-paint-mask.png', 'garden-bench-paint-tray-paint-mask': 'assets/garden-bench/paint-tray-paint-mask.png' },
  Object.fromEntries(['squeegee', 'detail-brush', 'mist-nozzle', 'duster', 'foam-can', 'drill-brush', 'putty-knife', 'sandpaper', 'stain-sponge', 'eraser'].map((t) => [`tool-${t}`, `assets/shared/tool-${t}.webp`])),
  Object.fromEntries(['icon-gear', 'icon-sound', 'icon-music', 'icon-close', 'icon-store', 'icon-wheel', 'ui-toggle-on', 'ui-toggle-off', 'ui-hint-hand'].map((k) => [k, `assets/ui/${k}.webp`])),
);

// ---- Step 8 Batch A (levels 6–15) ----
// Loaded at boot: the menu thumbnails (dirty / clean) and every tool sprite (the tool cards can
// show any family option). Everything else of a level (layers, masks, foam, parts, its shared
// background family) is loaded when the level opens (LevelScene.preload) and released when
// another lazily loaded level opens.
export const BATCH_A_LEVELS = ['rain-boots', 'frying-pan', 'wooden-crate', 'toolbox', 'bathroom-sink', 'desk-fan', 'garden-bench', 'keyboard', 'watering-can', 'porcelain-vase'];
const BATCH_A_TOOLS = [
  'steel-wool', 'wide-scraper', 'paint-brush', 'wire-brush', 'angle-grinder', 'spray-gun', 'polisher', 'screwdriver', 'paint-roller', 'keycap-puller', 'air-blower', 'cotton-swab', 'hammer',
  'turbo-lance', 'gold-washer', 'wire-wheel', 'pro-scraper', 'sanding-block', 'orbital-sander', 'gold-grinder', 'airbrush', 'gold-spray-gun', 'orbital-polisher', 'gold-polisher',
  'e-screwdriver', 'gold-screwdriver', 'wide-roller', 'foam-roller', 'mallet', 'gold-hammer',
];
Object.assign(
  IMAGE_ASSETS,
  Object.fromEntries(BATCH_A_TOOLS.map((t) => [`tool-${t}`, `assets/shared/tool-${t}.webp`])),
  ...BATCH_A_LEVELS.map((id) => ({ [`${id}-thumb`]: `assets/${id}/thumb.webp`, [`${id}-thumb-clean`]: `assets/${id}/thumb-clean.webp` })),
);

// ---- Step 8 Batch B (levels 16–50) ----
// Boot: light 320 px menu thumbnails and the new tool sprites (the tool cards can show any
// alternative anywhere). Level art is lazy, as in Batch A; some Batch A sprites
// (leaves, junk, screws, dents, paint can / tray) are shared by URL and loaded with the level.
Object.assign(IMAGE_ASSETS, BATCH_B_BOOT);

// Lazily loaded art of a level ({} for levels 1–5, whose art is part of the boot set).
export function levelAssets(levelId) {
  return BATCH_A_ASSETS[levelId] ?? BATCH_B_ASSETS[levelId] ?? {};
}

// Every texture key that is loaded per level (used to release the art of other levels).
export function lazyAssetKeys() {
  const keys = new Set();
  for (const set of [...Object.values(BATCH_A_ASSETS), ...Object.values(BATCH_B_ASSETS)]) for (const k of Object.keys(set)) keys.add(k);
  return keys;
}

export const FX_CHUNKS = ['fx-chunk-1', 'fx-chunk-2', 'fx-chunk-3', 'fx-chunk-4', 'fx-chunk-5'];
