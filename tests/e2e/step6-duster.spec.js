import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 6 polish (focused): Chair duster stage. The frame visibly changes from dusty to clean
// under the duster, and the holes stay visible before, during and after dusting.
// Screenshots: project/screenshots/step6/duster/<project>/
const toCss = (xf, lx, ly) => ({ x: xf.cx + (lx - xf.size / 2) * xf.k, y: xf.cy + (ly - xf.size / 2) * xf.k });

import fs from 'node:fs';

test('chair duster: visible dust removal, holes always visible', async ({ page }, info) => {
  test.setTimeout(240_000);
  const tag = info.project.name;
  const dir = `project/screenshots/step6/duster/${tag}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.goto('/?qa=1');
  await waitFor(page, (s) => s.scene === 'Menu');
  for (let i = 0; i < 10; i++) {
    const s = await waitFor(page, (x) => x.buttons?.['menu-level-chair']);
    if (s.buttons['menu-level-chair'].visible) break;
    await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(350);
  }
  await pressButton(page, drv, 'menu-level-chair');
  await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageId === 'trash');
  await playStage5(page, drv);
  let s = await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageId === 'dust-chair');
  await page.waitForTimeout(900); // framing tween done
  s = await snap(page);
  const L = s.level;
  // hole centres (object-local, from the level data via QA) and some frame points
  const spots = L.repairSpots.map(([x, y]) => toCss(L.xf, x, y));
  expect(spots.length).toBe(4);
  const pts = L.targets.points;
  // left post area (dusted in the partial step) and the far right side (left untouched; the tall
  // duster head reaches ~100 units sideways, so the centre is excluded)
  const [bx0, , bx1] = L.targets.bounds;
  const left = pts.filter(([x]) => x < bx0 + (bx1 - bx0) * 0.25);
  const right = pts.filter(([x]) => x > bx0 + (bx1 - bx0) * 0.7);
  const pick = (arr) => [0.2, 0.4, 0.6, 0.8].map((f) => arr[Math.floor(arr.length * f)]).map(([x, y]) => toCss(L.xf, x, y));
  const leftPts = pick(left);
  const rightPts = pick(right);

  await page.screenshot({ path: `${dir}/chair-02-dust-1-start.png` });

  // partial: real swipes over the left half of the frame only
  const ys = [...new Set(left.map(([, y]) => y))].sort((a, b) => a - b);
  const path = [];
  ys.forEach((y, i) => {
    if (i % 2) return;
    const row = left.filter(([, yy]) => yy === y).map(([x]) => x);
    const [x0, x1] = [Math.min(...row), Math.max(...row)];
    for (let t = 0; t <= 4; t++) {
      const q = toCss(L.xf, (i / 2) % 2 ? x1 - ((x1 - x0) * t) / 4 : x0 + ((x1 - x0) * t) / 4, y);
      path.push({ x: q.x - L.tool.workOffset.x, y: q.y - L.tool.workOffset.y });
    }
  });
  await drv.down(path[0].x, path[0].y);
  for (const q of path.slice(1)) await drv.move(q.x, q.y);
  await drv.up();
  await page.waitForTimeout(500);
  const mid = await snap(page);
  await page.screenshot({ path: `${dir}/chair-02-dust-2-partial.png` });
  expect(mid.level.stageId).toBe('dust-chair');
  expect(mid.level.outline).toBeNull();

  // finish with the pointer held at completion → waits for release
  const r = await playStage5(page, drv, { hold: true });
  expect(r.held).toBeTruthy();
  await page.waitForTimeout(700);
  const h = await snap(page);
  expect(h.level.state).toBe('pendingRelease');
  expect(h.level.tool.shown).toBe(true);
  await page.screenshot({ path: `${dir}/chair-02-dust-3-done-held.png` });
  await drv.up();
  await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageId === 'dust-seat');

  fs.writeFileSync(`${dir}/samples.json`, JSON.stringify({ spots, leftPts, rightPts, partialProgress: mid.level.progress }));
  console.log(`DUSTER ${tag} progress after partial ${Math.round(mid.level.progress * 100)} %, no outline, waited for release`);
  expect(errors).toEqual([]);
});
