import { test, expect } from '@playwright/test';
import { waitFor, touchDriver, pressButton, snap } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 6 pass 2, focused fix check: Sneaker chisel hand hint on phone touch.
// 1) the hint hand stays on the remaining crust (checked at the start and again after part of
//    the crust is removed), 2) no sample outside the crust, 3) the chisel stage completes by
//    real touch input, 4) it waits for release before the next stage.
const toLocal = (xf, p) => ({ x: (p.x - xf.cx) / xf.k + xf.size / 2, y: (p.y - xf.cy) / xf.k + xf.size / 2 });

async function sampleHint(page, label) {
  const out = [];
  let L = null;
  for (let i = 0; i < 45; i++) {
    const s = await snap(page);
    L = s.level;
    if (L.hintHand) out.push(toLocal(L.xf, L.hintHand));
    await page.waitForTimeout(100);
  }
  const crust = L.targets.crust;
  const tol = L.targets.step * 1.5;
  const outside = out.filter((q) => !crust.some(([x, y]) => Math.abs(x - q.x) <= tol && Math.abs(y - q.y) <= tol));
  console.log(`CHISELHINT ${label}: ${out.length} samples, ${crust.length} crust points, outside ${outside.length} ${JSON.stringify(outside.map((q) => [Math.round(q.x), Math.round(q.y)]))}`);
  return { out, outside };
}

test('sneaker chisel hint stays on the remaining crust; stage completes and waits for release', async ({ page }, info) => {
  test.skip(!info.project.name.includes('touch'), 'phone-touch only');
  test.setTimeout(240_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa=1&hints=always');
  await waitFor(page, (s) => s.scene === 'Menu');
  const drv = await touchDriver(page);
  for (let i = 0; i < 10; i++) {
    const s = await waitFor(page, (x) => x.buttons?.['menu-level-sneaker']);
    if (s.buttons['menu-level-sneaker'].visible) break;
    await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(350);
  }
  await pressButton(page, drv, 'menu-level-sneaker');
  await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageId === 'chisel', { label: 'chisel stage' });

  // 1–2: hint on the full crust
  const a = await sampleHint(page, 'start');
  expect(a.out.length).toBeGreaterThan(10);
  expect(a.outside.length).toBe(0);
  await page.screenshot({ path: 'project/screenshots/step6/pass2/phone-touch/sneaker-chisel-hint-start.png' });

  // remove part of the crust by real touch: a few swipes over the leftmost third only (released)
  let s = await snap(page);
  {
    const L = s.level;
    const xs = L.targets.crust.map(([x]) => x).sort((u, v) => u - v);
    const xCut = xs[Math.floor(xs.length * 0.33)];
    const part = L.targets.crust.filter(([x]) => x <= xCut);
    const ys = [...new Set(part.map(([, y]) => y))].sort((u, v) => u - v);
    const toCss = (lx, ly) => ({ x: L.xf.cx + (lx - L.xf.size / 2) * L.xf.k - L.tool.workOffset.x, y: L.xf.cy + (ly - L.xf.size / 2) * L.xf.k - L.tool.workOffset.y });
    for (let rep = 0; rep < 3; rep++) {
      const path = [];
      ys.forEach((y, i) => {
        const row = part.filter(([, yy]) => yy === y).map(([x]) => x);
        const [x0, x1] = [Math.min(...row), Math.max(...row)];
        for (let t = 0; t <= 6; t++) path.push(toCss(i % 2 ? x1 - ((x1 - x0) * t) / 6 : x0 + ((x1 - x0) * t) / 6, y));
      });
      await drv.down(path[0].x, path[0].y);
      for (const q of path.slice(1)) await drv.move(q.x, q.y);
      await drv.up();
    }
  }
  s = await snap(page);
  console.log(`CHISELPART after partial swipes: ${Math.round(s.level.progress * 100)} %, state ${s.level.state}`);
  expect(s.level.stageId).toBe('chisel');
  expect(s.level.progress).toBeGreaterThan(0);
  expect(s.level.progress).toBeLessThan(0.85);
  if (s.level.stageId === 'chisel' && s.level.state === 'playing') {
    await waitFor(page, (x) => x.level.hintHand, { label: 'idle hint', timeout: 12000 });
    const b = await sampleHint(page, `partial (${Math.round(s.level.progress * 100)} %)`);
    expect(b.outside.length).toBe(0);
    await page.screenshot({ path: 'project/screenshots/step6/pass2/phone-touch/sneaker-chisel-hint-partial.png' });
  }

  // 3–4: finish the chisel stage with the finger held down at completion
  let held = false;
  s = await snap(page);
  if (s.level.stageId === 'chisel' && s.level.state === 'playing') {
    const r = await playStage5(page, drv, { hold: true });
    expect(r.held, 'chisel completed while the finger was down').toBeTruthy();
    held = true;
    for (let k = 0; k < 6; k++) {
      await drv.move(r.held.x + (k % 2 ? 24 : -24), r.held.y);
      await page.waitForTimeout(200);
    }
    const h = await snap(page);
    expect(h.level.state).toBe('pendingRelease');
    expect(h.level.stageId).toBe('chisel');
    expect(h.level.tool.shown).toBe(true);
    console.log(`CHISELHELD 1.2 s after completion with the finger down: state ${h.level.state}, stage ${h.level.stageId}, tool shown ${h.level.tool.shown}`);
    await page.screenshot({ path: 'project/screenshots/step6/pass2/phone-touch/sneaker-chisel-held.png' });
    await drv.up();
  }
  const n = await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageIndex === 1, { label: 'next stage after release' });
  const log = n.level.stageLog[0];
  console.log(`CHISELDONE stage ${log.id} completed in ${log.seconds.toFixed(1)} s (${log.autoCompleted ? 'gentle auto-complete' : 'manual 100 %'}), held at completion: ${held}, next after release: ${n.level.stageId}`);
  expect(held).toBe(true);
  expect(errors).toEqual([]);
});
