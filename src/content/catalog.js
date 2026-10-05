import { soccerBall } from './levels/soccerBall.js';
import { rug } from './levels/rug.js';
import { goldenTrophy } from './levels/goldenTrophy.js';
import { chair } from './levels/chair.js';
import { sneaker } from './levels/sneaker.js';
import { TOOLS } from './tools.js';

// Levels are addressed by their permanent string ID. The display order is separate data.
export const LEVELS = {
  [soccerBall.id]: soccerBall,
  [rug.id]: rug,
  [goldenTrophy.id]: goldenTrophy,
  [chair.id]: chair,
  [sneaker.id]: sneaker,
};

// Menu / campaign order (approved first five levels, decision 2026-10-04). Separate from level data.
export const DISPLAY_ORDER = ['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker'];

export const KNOWN_MECHANICS = ['chunkBreak', 'brush', 'dragToTarget', 'spots'];
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
      if (!KNOWN_MECHANICS.includes(st.mechanic)) errors.push(`${level.id}/${st.id}: unknown mechanic ${st.mechanic}`);
      const p = st.params ?? {};
      if (st.mechanic === 'brush') {
        if (!BRUSH_MODES.includes(p.mode)) errors.push(`${level.id}/${st.id}: bad brush mode ${p.mode}`);
        const refs = [...(p.layers ?? []), p.layer, p.from, p.under, ...(p.clear ?? [])].filter(Boolean);
        for (const r of refs) if (!layerIds.has(r)) errors.push(`${level.id}/${st.id}: unknown layer ${r}`);
        if (!(p.threshold > 0.5 && p.threshold <= 1)) errors.push(`${level.id}/${st.id}: threshold out of range`);
        if (!(p.radius > 0)) errors.push(`${level.id}/${st.id}: radius must be positive`);
      }
      const regionIds = new Set(Object.keys(level.object.regions ?? {}));
      const reg = st.region ?? p.region;
      if (reg && !regionIds.has(reg)) errors.push(`${level.id}/${st.id}: unknown region ${reg}`);
      if (st.focus && !level.object.focus?.[st.focus]) errors.push(`${level.id}/${st.id}: unknown focus ${st.focus}`);
      if (st.mechanic === 'dragToTarget' && !(p.items?.length && p.target)) errors.push(`${level.id}/${st.id}: items and target required`);
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
