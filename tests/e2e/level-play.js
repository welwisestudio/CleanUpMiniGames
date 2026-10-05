import { expect } from '@playwright/test';
import { snap, waitFor } from './helpers.js';

// Plays any stage of any level with REAL pointer input, using only read-only QA geometry:
// the object-local → CSS transform, the stage's valid work area / items / spots and the tool's
// finger offset. Progress is never set directly.

const toCss = (xf, lx, ly) => ({ x: xf.cx + (lx - xf.size / 2) * xf.k, y: xf.cy + (ly - xf.size / 2) * xf.k });

function finger(tool, p) {
  if (tool.kind === 'jet') return { x: p.x - tool.workOffset.x, y: p.y + tool.jetLength - tool.workOffset.y };
  if (tool.kind === 'target') return p;
  return { x: p.x - tool.workOffset.x, y: p.y - tool.workOffset.y };
}

async function dragPath(page, drv, pts, wait = 0) {
  await drv.down(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) {
    await drv.move(p.x, p.y);
    if (wait) await page.waitForTimeout(wait);
  }
  await drv.up();
}

async function areaPass(page, drv, L, pass) {
  const { xf, tool, targets, brush } = L;
  const wide = brush.aspect > 1;
  // a wide blade (squeegee, bristle bar) sweeps up/down, rows spaced by most of its width
  const vertical = wide ? true : pass % 2 === 1;
  const r = brush.mechanic === 'chunkBreak' ? 30 : wide ? brush.radius * brush.aspect * 1.1 : (brush.radius ?? 90) * 1.05;
  const lines = new Map();
  for (const [x, y] of targets.points) {
    const key = Math.round((vertical ? x : y) / r);
    const v = vertical ? y : x;
    const e = lines.get(key) ?? { min: Infinity, max: -Infinity, at: key * r };
    e.min = Math.min(e.min, v);
    e.max = Math.max(e.max, v);
    lines.set(key, e);
  }
  const keys = [...lines.keys()].sort((a, b) => a - b);
  let dir = 1;
  const path = [];
  for (const k of keys) {
    const e = lines.get(k);
    const a = dir > 0 ? e.min : e.max;
    const b = dir > 0 ? e.max : e.min;
    const step = wide ? brush.radius * 0.8 : r * 0.35;
    const n = Math.max(2, Math.ceil(Math.abs(b - a) / step));
    for (let i = 0; i <= n; i++) {
      const v = a + ((b - a) * i) / n;
      const lp = vertical ? { x: e.at, y: v } : { x: v, y: e.at };
      path.push(finger(tool, toCss(xf, lp.x, lp.y)));
    }
    dir = -dir;
  }
  await dragPath(page, drv, path, tool.kind === 'jet' ? 16 : 0);
}

export async function playStage5(page, drv, { maxPasses = 14 } = {}) {
  const s0 = await waitFor(page, (s) => s.level && s.level.state === 'playing', { label: 'stage playing' });
  const idx = s0.level.stageIndex;
  const id = s0.level.stageId;
  for (let pass = 0; pass < maxPasses; pass++) {
    const s = await snap(page);
    if (s.level.stageIndex !== idx || s.level.state !== 'playing') break;
    const L = s.level;
    if (L.targets.kind === 'drag') {
      for (const it of L.targets.items) {
        const a = toCss(L.xf, it.x, it.y);
        const b = toCss(L.xf, L.targets.target.x, L.targets.target.y);
        const path = [];
        for (let i = 0; i <= 12; i++) path.push({ x: a.x + ((b.x - a.x) * i) / 12, y: a.y + ((b.y - a.y) * i) / 12 });
        await dragPath(page, drv, path);
        await page.waitForTimeout(380);
      }
    } else if (L.targets.kind === 'spots') {
      for (const sp of L.targets.spots) {
        // dip the knife into the putty tub first (reference behaviour)
        const cur = (await snap(page)).level.targets;
        if (cur?.needsLoad && cur.tub) {
          const t = toCss(L.xf, cur.tub.x, cur.tub.y);
          const tr = cur.tub.r * 0.4 * L.xf.k;
          const dip = [];
          for (let i = 0; i <= 30; i++) {
            const a = (i / 30) * Math.PI * 4;
            dip.push(finger(L.tool, { x: t.x + Math.cos(a) * tr, y: t.y + Math.sin(a) * tr * 0.6 }));
          }
          await dragPath(page, drv, dip);
        }
        const c = toCss(L.xf, sp.x, sp.y);
        const rr = sp.r * 0.6 * L.xf.k;
        const path = [];
        for (let i = 0; i <= 60; i++) {
          const a = (i / 60) * Math.PI * 6;
          path.push(finger(L.tool, { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr }));
        }
        await dragPath(page, drv, path);
      }
    } else {
      await areaPass(page, drv, L, pass);
    }
    const after = await snap(page);
    if (after.level.stageIndex === idx && after.level.state === 'playing') expect(after.level.progress).toBeGreaterThanOrEqual(L.progress - 1e-9);
  }
  const done = await snap(page);
  expect(done.level.state === 'playing' && done.level.stageIndex === idx, `stage ${id} did not complete (progress ${done.level.progress})`).toBe(false);
  return id;
}

export async function playLevel5(page, drv, { onStage } = {}) {
  const s = await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageIndex === 0, { label: 'level start' });
  const order = [];
  for (let i = 0; i < s.level.stageCount; i++) {
    const st = await waitFor(page, (x) => x.level && ((x.level.state === 'playing' && x.level.stageIndex === i) || x.level.state === 'result'), { label: `stage ${i}`, timeout: 20000 });
    if (st.level.state === 'result') break;
    if (onStage) await onStage(st.level);
    order.push(await playStage5(page, drv));
  }
  const result = await waitFor(page, (x) => x.level && x.level.state === 'result', { label: 'result card', timeout: 15000 });
  return { order, result };
}
