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
};

export const FX_CHUNKS = ['fx-chunk-1', 'fx-chunk-2', 'fx-chunk-3', 'fx-chunk-4', 'fx-chunk-5'];
