import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 9 fast polish pass — focused checks of the changed shared systems (real mouse / touch):
// hammer head on the dent, pool skim with the net, pool drain / fill, hose direction, laser only on
// the blade, paint reloads, green outline on localized stages, a large-object tool, keyboard.
// Screenshots: project/screenshots/step9/<project>/<NAME>.png (PHASE=before|after prefix).
const PHASE = process.env.PHASE ?? 'after';
const CASES = (process.env.CASES ?? 'hammer,pool,cleaver,paint,outline,large,keyboard').split(',');

const toCss = (xf, x, y) => ({ x: xf.cx + (x - xf.size / 2) * xf.k, y: xf.cy + (y - xf.size / 2) * xf.k });
const finger = (tool, p) => (tool.kind === 'jet' ? { x: p.x - tool.jet.x - tool.workOffset.x, y: p.y - tool.jet.y - tool.workOffset.y } : { x: p.x - tool.workOffset.x, y: p.y - tool.workOffset.y });

async function open(page, drv, id) {
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (s) => s.scene === 'Menu');
  await openFromMenu(page, drv, id);
  return waitFor(page, (x) => x.level?.id === id && x.level.state === 'playing', { timeout: 30000 });
}

async function toStage(page, drv, id) {
  for (let i = 0; i < 14; i++) {
    const s = await waitFor(page, (x) => x.level && x.level.state === 'playing', { label: 'playing', timeout: 30000 });
    if (s.level.stageId === id) return s;
    await playStage5(page, drv);
  }
  throw new Error(`stage ${id} not reached`);
}

const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/step9/${info.project.name}/${PHASE}-${name}.png` });

test('polish checks', async ({ page }, info) => {
  test.setTimeout(900_000);
  const touch = info.project.name.includes('touch');
  const drv = touch ? await touchDriver(page) : mouseDriver(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  if (CASES.includes('hammer')) {
    // toaster: the hammer HEAD lands on the dent when the player taps the dent
    await open(page, drv, 'toaster');
    let s = await toStage(page, drv, 'hammer');
    const L = s.level;
    const t = L.targets.points[0];
    const c = toCss(L.xf, t.x, t.y);
    const f = finger(L.tool, c);
    await drv.down(f.x, f.y);
    await page.waitForTimeout(120);
    await shot(page, info, 'hammer-on-dent');
    await drv.up();
    await page.waitForTimeout(250);
    s = await snap(page);
    console.log('hammer progress after one hit', s.level.progress.toFixed(3));
    if (PHASE === 'after') expect(s.level.progress).toBeGreaterThan(0);
    await playStage5(page, drv);
    await page.waitForTimeout(400);
    await shot(page, info, 'hammer-done');
  }

  if (CASES.includes('pool')) {
    await open(page, drv, 'swimming-pool');
    let s = await snap(page);
    await page.waitForTimeout(700);
    await shot(page, info, 'pool-skim-start');
    await playStage5(page, drv);
    s = await toStage(page, drv, 'drain');
    // hold the pump in the water for ~2 s: the water level visibly drops
    const p = s.level.targets.points[0];
    const f = finger(s.level.tool, toCss(s.level.xf, p.x, p.y));
    await drv.down(f.x, f.y);
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(100);
      await drv.move(f.x + (i % 2), f.y);
    }
    await shot(page, info, 'pool-drain-mid');
    s = await snap(page);
    console.log('drain progress mid', s.level.progress.toFixed(2));
    await drv.up();
    await playStage5(page, drv);
    s = await toStage(page, drv, 'fill');
    const q = s.level.targets.points[0];
    const g = finger(s.level.tool, toCss(s.level.xf, q.x, q.y));
    await drv.down(g.x, g.y);
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(100);
      await drv.move(g.x + (i % 2), g.y);
    }
    await shot(page, info, 'pool-fill-mid');
    await drv.up();
    await playStage5(page, drv);
  }

  if (CASES.includes('cleaver')) {
    // laser over the wooden handle: no progress; over the blade: progress
    await open(page, drv, 'rusty-cleaver');
    await page.waitForTimeout(500);
    await shot(page, info, 'cleaver-start');
    let s = await toStage(page, drv, 'laser');
    const L = s.level;
    const [x0, y0, x1, y1] = await page.evaluate(() => window.__cleanupQA.snapshot().level && null) ?? [0, 0, 0, 0];
    void x0; void y0; void x1; void y1;
    // handle = the right end of the object (cleaver lies horizontally)
    const pts = L.targets.points;
    const xs = pts.map(([x]) => x);
    const maxX = Math.max(...xs);
    const handle = pts.filter(([x]) => x > maxX - 40);
    if (handle.length) {
      const a = finger(L.tool, toCss(L.xf, handle[0][0], handle[0][1]));
      await drv.down(a.x, a.y);
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(60);
        await drv.move(a.x, a.y + (i % 4) * 6);
      }
      await shot(page, info, 'cleaver-laser-handle');
      await drv.up();
      s = await snap(page);
      console.log('laser progress after the handle', s.level.progress.toFixed(3));
      if (PHASE === 'after') expect(s.level.progress).toBeLessThan(0.02);
    }
  }

  if (CASES.includes('paint')) {
    // garden bench roller: count the dips needed
    await open(page, drv, 'garden-bench');
    let s = await toStage(page, drv, 'roll');
    let dips = 0;
    page.on('console', () => {});
    const t0 = Date.now();
    await playStage5(page, drv);
    s = await snap(page);
    dips = await page.evaluate(() => window.__cleanupQA.snapshot().level?.stageLog?.slice(-1)?.[0]?.loads ?? null);
    console.log('roll stage seconds', ((Date.now() - t0) / 1000).toFixed(1), 'dips', dips);
  }

  if (CASES.includes('outline')) {
    // a localized stage shows the green outline around the active zone
    await open(page, drv, 'rusty-cleaver');
    let s = await toStage(page, drv, 'sand');
    await page.waitForTimeout(600);
    await shot(page, info, 'outline-cleaver-handle');
    console.log('outline', JSON.stringify(s.level.outline));
    if (PHASE === 'after') expect(s.level.outline?.kind).toBe('traced');
  }

  if (CASES.includes('large')) {
    await open(page, drv, 'swimming-pool');
    let s = await toStage(page, drv, 'scrub');
    await page.waitForTimeout(500);
    await shot(page, info, 'large-pool-scrub');
    console.log('pool scrub tool', s.level.tool.id);
  }

  if (CASES.includes('keyboard')) {
    await open(page, drv, 'keyboard');
    await page.waitForTimeout(700);
    const s = await snap(page);
    console.log('keyboard stages', s.level.stageCount, s.level.stageId);
    await shot(page, info, 'keyboard-start');
  }
  expect(errors).toEqual([]);
});
