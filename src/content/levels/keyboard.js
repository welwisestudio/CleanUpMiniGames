import { LEVEL_META } from '../generated/levelMeta.js';

// Level 13 · Keyboard (CONTENT-MATRIX Batch A). Step 9 polish: no keycap removal any more (pulling
// and replacing ten caps was slow and fiddly) — the keyboard is cleaned in place: blow the dust
// out → crevice brush between the keys of the grimy block (outlined) → swab the sticky spill →
// wipe the case → spray cleaner for the last smudges.

const M = LEVEL_META.levels.keyboard ?? { bounds: [80, 260, 950, 780] };
void M;

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
    // the "empty slot" layers of the old keycap stages are not used any more
    layers: [
      { id: 'clean', texture: 'keyboard-clean', initial: 'full', static: true },
      { id: 'smudged', texture: 'keyboard-smudged', initial: 'full' },
      { id: 'dirty', texture: 'keyboard-dirty', initial: 'full' },
      { id: 'dusty', texture: 'keyboard-dusty', initial: 'full' },
    ],
  },
  stages: [
    { id: 'blow', tool: 'air-blower', mechanic: 'brush', params: { mode: 'reveal', layers: ['dusty'], radius: 70, threshold: 0.95 }, targetSeconds: [5, 8] },
    { id: 'crevice', tool: 'crevice-brush', mechanic: 'brush', region: 'cells', params: { mode: 'reveal', layers: ['dirty'], radius: 30, threshold: 0.95 }, targetSeconds: [6, 9] },
    { id: 'swab', tool: 'cotton-swab', mechanic: 'brush', region: 'spill', params: { mode: 'reveal', layers: ['dirty'], radius: 32, threshold: 0.94 }, targetSeconds: [5, 8] },
    { id: 'wipe-case', family: 'wipe', tool: 'cloth', mechanic: 'brush', params: { mode: 'reveal', layers: ['dirty'], radius: 110, threshold: 0.95 }, targetSeconds: [5, 8] },
    { id: 'spray-clean', tool: 'spray-bottle', mechanic: 'brush', params: { mode: 'reveal', layers: ['smudged'], radius: 88, threshold: 0.95 }, targetSeconds: [5, 8] },
  ],
};
