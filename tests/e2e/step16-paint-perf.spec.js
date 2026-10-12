import { test } from '@playwright/test';
import fs from 'node:fs';
import { waitFor, mouseDriver, touchDriver, snap, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Painting performance (systems pass 2026-10-12): real strokes on paint stages (paint source, small
// zone brush, large objects) while requestAnimationFrame frame times are recorded under a 4× CPU
// throttle. The earlier stages are played normally to get there (no throttle). Results are written to
// project/screenshots/systems/<project>/paint-perf.json (+ a mid-stroke screenshot).
// Each stage runs twice in the same build: the batched painting path and the old per-stamp path
// (`paintBatch=0`, QA only), with the GPU-work counters of the stage (render passes, Mpx blitted,
// JS ms in the paint code) next to the frame times. PERF_TAG names the run in the json.
const CASES = [
  ['wooden-dresser', 'stain'],
  ['rowboat', 'roll'],
  ['carousel-horse', 'paint'],
];

async function toStage(page, drv, id) {
  for (let i = 0; i < 12; i++) {
    const s = await waitFor(page, (x) => x.level && x.level.state === 'playing', { label: 'playing', timeout: 30000 });
    if (s.level.stageId === id) return s;
    await playStage5(page, drv);
  }
  throw new Error(`stage ${id} not reached`);
}

const stats = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { frames: s.length, mean: +(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1), p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +s[s.length - 1].toFixed(1), over50: a.filter((x) => x > 50).length, over100: a.filter((x) => x > 100).length };
};

test('paint stages stay smooth (frame times under CPU throttle)', async ({ page }, info) => {
  test.setTimeout(1_500_000);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  const dir = `project/screenshots/systems/${info.project.name}`;
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const out = {};
  for (const [mode, q] of [['batched', ''], ['per-stamp', '&paintBatch=0']])
  for (const [level, stage] of CASES) {
    await page.goto(`/?qa=1&devStorage=memory${q}`);
    await waitFor(page, (x) => x.scene === 'Menu');
    await openFromMenu(page, drv, level);
    await toStage(page, drv, stage);
    await page.waitForTimeout(600);
    const p0 = (await snap(page)).level.paintStats;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => {
      window.__fr = [];
      window.__frOn = true;
      let last = performance.now();
      const f = (t) => {
        window.__fr.push(t - last);
        last = t;
        if (window.__frOn) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    const t0 = Date.now();
    let shot = false;
    await playStage5(page, drv, { mid: async () => {
      if (shot) return;
      shot = true;
      await page.screenshot({ path: `${dir}/paint-${level}-${stage}-${mode}.png` });
    } });
    const ms = Date.now() - t0;
    const fr = await page.evaluate(() => {
      window.__frOn = false;
      return window.__fr.slice(2);
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const s = await snap(page);
    const done = !(s.level.stageId === stage && s.level.state === 'playing');
    const p1 = s.level.paintStats;
    const paint = p0 && p1 ? { batch: p1.batch, stamps: p1.stamps - p0.stamps, passes: p1.passes - p0.passes, blitMpx: +(p1.blitMpx - p0.blitMpx).toFixed(1), ms: +(p1.ms - p0.ms).toFixed(1) } : null;
    if (paint) paint.passesPerStamp = +(paint.passes / Math.max(1, paint.stamps)).toFixed(3);
    out[`${mode}:${level}/${stage}`] = { ...stats(fr), stageMs: ms, completed: done, paint };
    console.log(info.project.name, mode, level, stage, JSON.stringify(out[`${mode}:${level}/${stage}`]));
  }
  const file = `${dir}/paint-perf.json`;
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  prev[process.env.PERF_TAG ?? 'run'] = out;
  fs.writeFileSync(file, JSON.stringify(prev, null, 1));
});
