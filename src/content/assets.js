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
  'ui-chest-timed': `${U}ui-chest-timed.webp`,
  'ui-chest-progress': `${U}ui-chest-progress.webp`,
};

// ---- Step 5: levels 2–5, shared tools and UI (scripts/prepare_levels.py) ----
const level = (id, files) => Object.fromEntries(Object.entries(files).map(([k, f]) => [`${id}-${k}`, `assets/${id}/${f}`]));
const common = { 'bg-portrait': 'bg-portrait.webp', 'bg-landscape': 'bg-landscape.webp', thumb: 'thumb.webp', 'result-picture': 'result-picture.webp', mask: 'mask.png', 'mask-outside': 'mask-outside.png', foam: 'tex-foam-full.webp', 'foam-scrubbed': 'tex-foam-scrubbed-full.webp' };
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
  Object.fromEntries(['squeegee', 'detail-brush', 'mist-nozzle', 'duster', 'foam-can', 'drill-brush', 'putty-knife', 'sandpaper', 'stain-sponge', 'eraser'].map((t) => [`tool-${t}`, `assets/shared/tool-${t}.webp`])),
  Object.fromEntries(['icon-gear', 'icon-sound', 'icon-music', 'icon-vibration', 'icon-close', 'ui-toggle-on', 'ui-toggle-off', 'ui-hint-hand'].map((k) => [k, `assets/ui/${k}.webp`])),
);

export const FX_CHUNKS = ['fx-chunk-1', 'fx-chunk-2', 'fx-chunk-3', 'fx-chunk-4', 'fx-chunk-5'];
