import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 6 polish pass (focused): trophy ball dry-brush without outline; chair putty → sanding →
// stain with clean circle targets. Real mouse / touch input; pending-release checked on the
// affected stages. Screenshots: project/screenshots/step6/polish/<project>/
async function openLevel(page, drv, id) {
  await page.goto('/?qa=1');
  await waitFor(page, (s) => s.scene === 'Menu');
  for (let i = 0; i < 10; i++) {
    const s = await waitFor(page, (x) => x.buttons?.[`menu-level-${id}`]);
    if (s.buttons[`menu-level-${id}`].visible) break;
    await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(350);
  }
  await pressButton(page, drv, `menu-level-${id}`);
}

const stageNow = (page, id) => waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageId === id, { label: id, timeout: 20000 });

// plays the current stage with the pointer kept down at completion; checks it waits for release
async function playHeld(page, drv, name, dir) {
  const r = await playStage5(page, drv, { hold: true, mid: () => page.screenshot({ path: `${dir}/${name}-mid.png` }) });
  expect(r.held, `${name}: completed while the pointer was down`).toBeTruthy();
  for (let k = 0; k < 5; k++) {
    await drv.move(r.held.x + (k % 2 ? 20 : -20), r.held.y);
    await page.waitForTimeout(200);
  }
  const h = await snap(page);
  expect(h.level.state).toBe('pendingRelease');
  expect(h.level.tool.shown).toBe(true);
  await page.screenshot({ path: `${dir}/${name}-held.png` });
  const before = h.level.stageIndex;
  await drv.up();
  await waitFor(page, (x) => x.level && (x.level.state === 'result' || (x.level.state === 'playing' && x.level.stageIndex === before + 1)), { label: `${name} after release` });
  return h.level;
}

test('golden trophy: ball dry-brush has no outline; pedestal detail brush keeps it', async ({ page }, info) => {
  test.setTimeout(240_000);
  const dir = `project/screenshots/step6/polish/${info.project.name}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await openLevel(page, drv, 'golden-trophy');
  await stageNow(page, 'chisel');
  await playStage5(page, drv);
  const s = await stageNow(page, 'dry-brush');
  await page.waitForTimeout(900);
  expect((await snap(page)).level.outline, 'dry-brush must have no outline').toBeNull();
  await page.screenshot({ path: `${dir}/trophy-02-dry-brush-start.png` });
  const held = await playHeld(page, drv, 'trophy-02-dry-brush', dir);
  console.log(`POLISH ${info.project.name} trophy dry-brush: outline ${JSON.stringify(s.level.outline)}, waited for release (${held.stageLog.at(-1).autoCompleted ? 'gentle auto-complete' : 'manual 100 %'})`);
  const d = await stageNow(page, 'detail-brush');
  await page.waitForTimeout(600);
  expect((await snap(page)).level.outline?.kind).toBe('traced');
  await page.screenshot({ path: `${dir}/trophy-03-detail-brush-start.png` });
  console.log(`POLISH ${info.project.name} trophy detail-brush (pedestal only): outline ${JSON.stringify((await snap(page)).level.outline)}`);
  expect(d.level.stageId).toBe('detail-brush');
  expect(errors).toEqual([]);
});

test('chair: putty covers the holes, sanding uses circle targets and cleans the whole patch, stain follows', async ({ page }, info) => {
  test.setTimeout(360_000);
  const dir = `project/screenshots/step6/polish/${info.project.name}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await openLevel(page, drv, 'chair');
  for (const id of ['trash', 'dust-chair', 'dust-seat', 'foam-can', 'scrub', 'wipe-seat']) {
    await stageNow(page, id);
    await playStage5(page, drv);
  }
  // putty: dip → load → fill, finger held at the last dent
  await stageNow(page, 'putty');
  await page.screenshot({ path: `${dir}/chair-07-putty-start.png` });
  await playHeld(page, drv, 'chair-07-putty', dir);
  // sanding: clean circle targets, one per repaired spot
  const s = await stageNow(page, 'sand');
  await page.waitForTimeout(700);
  const o = (await snap(page)).level.outline;
  expect(o?.kind, 'sanding shows circle targets').toBe('circles');
  expect(o.shown).toBe(4);
  await page.screenshot({ path: `${dir}/chair-08-sand-start.png` });
  const sandHeld = await playHeld(page, drv, 'chair-08-sand', dir);
  console.log(`POLISH ${info.project.name} chair sand: ${JSON.stringify(o)}, ${s.level.targets.points.length} work points (whole patches incl. the parts over the chair edge), waited for release (${sandHeld.stageLog.at(-1).autoCompleted ? 'gentle auto-complete' : 'manual 100 %'})`);
  // stain: no putty residue; play to the result
  await stageNow(page, 'stain');
  await page.waitForTimeout(700);
  expect((await snap(page)).level.outline).toBeNull();
  await page.screenshot({ path: `${dir}/chair-09-stain-start.png` });
  await playHeld(page, drv, 'chair-09-stain', dir);
  await waitFor(page, (x) => x.level && x.level.state === 'result', { label: 'result' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/chair-99-result.png` });
  console.log(`POLISH ${info.project.name} chair putty → sand → stain → result OK`);
  expect(errors).toEqual([]);
});
