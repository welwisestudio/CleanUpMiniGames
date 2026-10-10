// Exports the runtime geometry of every level (layers, masks, regions, stage targets) with the
// file each texture key resolves to, for scripts/validate_registration.py.
// Run: node scripts/export_level_geometry.mjs > <out.json>
import { LEVELS, DISPLAY_ORDER } from '../src/content/catalog.js';
import { IMAGE_ASSETS, levelAssets } from '../src/content/assets.js';

const out = {};
for (const id of DISPLAY_ORDER) {
  const lv = LEVELS[id];
  const files = { ...IMAGE_ASSETS, ...levelAssets(id) };
  const url = (k) => files[k] ?? null;
  const o = lv.object;
  const stages = lv.stages.map((st) => {
    const p = st.params ?? {};
    const pts = [];
    for (const t of p.targets ?? []) pts.push({ kind: 'target', x: t.x, y: t.y, region: p.region ?? null });
    for (const it of p.items ?? []) {
      if (st.mechanic === 'collect' || it.fromLayer) pts.push({ kind: 'item', x: it.x, y: it.y });
      if (it.slot) pts.push({ kind: 'slot', x: it.slot.x, y: it.slot.y });
    }
    return { id: st.id, mechanic: st.mechanic, tool: st.tool, outline: st.outline ?? null, region: st.region ?? p.region ?? null, mode: p.mode ?? null, reveal: p.layers ?? [], apply: p.layer ?? null, from: p.from ?? null, under: p.under ?? null, clear: p.clear ?? [], clearOnFinish: p.clearOnFinish ?? [], layers: [...(p.layers ?? []), p.layer, p.from, ...(p.clear ?? [])].filter(Boolean), points: pts };
  });
  out[id] = {
    canvas: o.canvasSize,
    radius: o.radius ?? null,
    mask: url(o.mask),
    outside: url(o.outsideMask),
    layers: o.layers.map((l) => ({ id: l.id, url: l.texture ? url(l.texture) : null, static: Boolean(l.static), initial: l.initial, decals: (l.decals ?? []).map((d) => ({ x: d.x, y: d.y, size: d.size, url: url(d.texture) })) })),
    regions: Object.fromEntries(Object.entries(o.regions ?? {}).map(([k, r]) => [k, r.mask ? { mask: url(r.mask) } : r.circles ? { circles: r.circles } : r.rect ? { rect: r.rect } : { other: true }])),
    stages,
  };
}
process.stdout.write(JSON.stringify(out));
