import { TOOL_FAMILIES } from './toolFamilies.js';
import { soccerBall } from './levels/soccerBall.js';
import { rug } from './levels/rug.js';
import { goldenTrophy } from './levels/goldenTrophy.js';
import { chair } from './levels/chair.js';
import { sneaker } from './levels/sneaker.js';
import { rainBoots } from './levels/rainBoots.js';
import { fryingPan } from './levels/fryingPan.js';
import { woodenCrate } from './levels/woodenCrate.js';
import { toolbox } from './levels/toolbox.js';
import { bathroomSink } from './levels/bathroomSink.js';
import { deskFan } from './levels/deskFan.js';
import { gardenBench } from './levels/gardenBench.js';
import { keyboard } from './levels/keyboard.js';
import { wateringCan } from './levels/wateringCan.js';
import { porcelainVase } from './levels/porcelainVase.js';
import { TOOLS } from './tools.js';
import { BATCH_B_LEVELS } from './levels/batchB/levels.js';

// Levels are addressed by their permanent string ID. The display order is separate data.
export const LEVELS = {
  [soccerBall.id]: soccerBall,
  [rug.id]: rug,
  [goldenTrophy.id]: goldenTrophy,
  [chair.id]: chair,
  [sneaker.id]: sneaker,
  // Step 8 Batch A (CONTENT-MATRIX levels 6–15)
  [rainBoots.id]: rainBoots,
  [fryingPan.id]: fryingPan,
  [woodenCrate.id]: woodenCrate,
  [toolbox.id]: toolbox,
  [bathroomSink.id]: bathroomSink,
  [deskFan.id]: deskFan,
  [gardenBench.id]: gardenBench,
  [keyboard.id]: keyboard,
  [wateringCan.id]: wateringCan,
  [porcelainVase.id]: porcelainVase,
  // Step 8 Batch B (levels 16–50)
  ...Object.fromEntries(BATCH_B_LEVELS.map((l) => [l.id, l])),
};

// Menu / campaign order (approved first five levels, decision 2026-10-04). Separate from level data.
// Step 8 Batch A appends levels 6–15 in CONTENT-MATRIX order.
export const DISPLAY_ORDER = [
  'soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker',
  'rain-boots', 'frying-pan', 'wooden-crate', 'toolbox', 'bathroom-sink', 'desk-fan', 'garden-bench', 'keyboard', 'watering-can', 'porcelain-vase',
  // Step 8 Batch B: levels 16–50 in campaign order
  ...BATCH_B_LEVELS.map((l) => l.id),
];

export const KNOWN_MECHANICS = ['chunkBreak', 'brush', 'dragToTarget', 'spots', 'points', 'fill'];
export const POINT_MODES = ['hold', 'tap', 'pull', 'screw', 'place', 'repeatedTap'];
export const BRUSH_MODES = ['reveal', 'apply', 'scrub'];

export function getLevel(id) {
  const level = LEVELS[id];
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}

// Next object after `id` in display order, or null at the end.
export function nextLevelId(id) {
  const i = DISPLAY_ORDER.indexOf(id);
  return i >= 0 && i < DISPLAY_ORDER.length - 1 ? DISPLAY_ORDER[i + 1] : null;
}

// Static validation of content data; used by unit tests and at boot in dev.
export function validateCatalog() {
  const errors = [];
  for (const id of DISPLAY_ORDER) if (!LEVELS[id]) errors.push(`display order references unknown level ${id}`);
  for (const level of Object.values(LEVELS)) {
    const layerIds = new Set(level.object.layers.map((l) => l.id));
    const stageIds = new Set();
    if (!level.stages.length) errors.push(`${level.id}: no stages`);
    for (const st of level.stages) {
      if (stageIds.has(st.id)) errors.push(`${level.id}: duplicate stage ${st.id}`);
      stageIds.add(st.id);
      if (!TOOLS[st.tool]) errors.push(`${level.id}/${st.id}: unknown tool ${st.tool}`);
      if (st.family) {
        const fam = TOOL_FAMILIES[st.family];
        if (!fam) errors.push(`${level.id}/${st.id}: unknown tool family ${st.family}`);
        else {
          if (fam.base !== st.tool) errors.push(`${level.id}/${st.id}: tool ${st.tool} is not the base of family ${st.family}`);
          if (fam.options.length !== 3 && fam.options.length !== 1) errors.push(`${st.family}: a family needs 3 options (or 1: a skin-only card)`);
          for (const o of fam.options) if (!TOOLS[o.tool]) errors.push(`${st.family}: unknown tool ${o.tool}`);
          if (fam.options.filter((o) => o.unlock.type === 'default').length !== 1 || fam.options[0].tool !== fam.base) errors.push(`${st.family}: the base tool must be the single default option`);
        }
      }
      if (!KNOWN_MECHANICS.includes(st.mechanic)) errors.push(`${level.id}/${st.id}: unknown mechanic ${st.mechanic}`);
      const p = st.params ?? {};
      if (st.mechanic === 'brush') {
        if (!BRUSH_MODES.includes(p.mode)) errors.push(`${level.id}/${st.id}: bad brush mode ${p.mode}`);
        const refs = [...(p.layers ?? []), p.layer, p.from, p.under, ...(p.clear ?? [])].filter(Boolean);
        for (const r of refs) if (!layerIds.has(r)) errors.push(`${level.id}/${st.id}: unknown layer ${r}`);
        if (!(p.threshold > 0.5 && p.threshold <= 1)) errors.push(`${level.id}/${st.id}: threshold out of range`);
        if (!(p.radius > 0)) errors.push(`${level.id}/${st.id}: radius must be positive`);
        if (p.source && !(p.source.texture && p.source.size > 0)) errors.push(`${level.id}/${st.id}: paint source needs a texture and a size`);
      }
      if (st.mechanic === 'points') {
        if (!POINT_MODES.includes(p.mode)) errors.push(`${level.id}/${st.id}: bad point mode ${p.mode}`);
        if (!p.targets?.length) errors.push(`${level.id}/${st.id}: point targets required`);
        for (const t of p.targets ?? []) {
          if (!(t.r > 0)) errors.push(`${level.id}/${st.id}: point target radius must be positive`);
          if (t.layer && !layerIds.has(t.layer)) errors.push(`${level.id}/${st.id}: unknown layer ${t.layer}`);
        }
      }
      const regionIds = new Set(Object.keys(level.object.regions ?? {}));
      const reg = st.region ?? p.region;
      if (reg && !regionIds.has(reg)) errors.push(`${level.id}/${st.id}: unknown region ${reg}`);
      if (st.focus && !level.object.focus?.[st.focus]) errors.push(`${level.id}/${st.id}: unknown focus ${st.focus}`);
      if (st.mechanic === 'fill') {
        if (!['drain', 'fill'].includes(p.mode)) errors.push(`${level.id}/${st.id}: fill mode must be drain or fill`);
        if (!layerIds.has(p.layer)) errors.push(`${level.id}/${st.id}: unknown layer ${p.layer}`);
        if (!p.region || !regionIds.has(p.region)) errors.push(`${level.id}/${st.id}: fill needs a region`);
      }
      if (st.mechanic === 'dragToTarget') {
        const slotted = p.items?.length && p.items.every((it) => it.slot);
        if (!(p.items?.length && (p.target || slotted))) errors.push(`${level.id}/${st.id}: items and a target (or a slot per item) required`);
        for (const it of p.items ?? []) if (it.fromLayer && !layerIds.has(it.fromLayer)) errors.push(`${level.id}/${st.id}: unknown layer ${it.fromLayer}`);
        for (const k of ['stamp', 'erase']) if (p.onPlace?.[k] && !layerIds.has(p.onPlace[k])) errors.push(`${level.id}/${st.id}: unknown layer ${p.onPlace[k]}`);
      }
      if (st.mechanic === 'spots') {
        if (!layerIds.has(p.layer)) errors.push(`${level.id}/${st.id}: unknown layer ${p.layer}`);
        if (!(level.object.regions?.[p.region]?.circles?.length)) errors.push(`${level.id}/${st.id}: spots need a circles region`);
      }
      if (st.mechanic === 'chunkBreak') {
        if (!layerIds.has(p.layer)) errors.push(`${level.id}/${st.id}: unknown layer ${p.layer}`);
        if (!(p.chunkCount >= 4)) errors.push(`${level.id}/${st.id}: chunkCount too small`);
      }
    }
  }
  return errors;
}
