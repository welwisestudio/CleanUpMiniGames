import { soccerBall } from './levels/soccerBall.js';
import { TOOLS } from './tools.js';

// Levels are addressed by their permanent string ID. The display order is separate data.
export const LEVELS = {
  [soccerBall.id]: soccerBall,
};

export const DISPLAY_ORDER = ['soccer-ball'];

export const KNOWN_MECHANICS = ['chunkBreak', 'brush'];
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
      if (st.mechanic === 'chunkBreak') {
        if (!layerIds.has(p.layer)) errors.push(`${level.id}/${st.id}: unknown layer ${p.layer}`);
        if (!(p.chunkCount >= 4)) errors.push(`${level.id}/${st.id}: chunkCount too small`);
      }
    }
  }
  return errors;
}
