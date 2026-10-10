import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Registration regression cases (zone-clipped cleaning): one real stroke across the middle of the
// outlined zone; the dirt must disappear exactly under the tool (inside the green outline) and the
// progress must move. Screenshots: project/screenshots/step9-registration/<project>/<PHASE>-<case>-*.png
const PHASE = process.env.PHASE ?? 'after';
const CASES = [
  ['keyboard', 'crevice'],
  ['cannon', 'sand'],
  ['kitchen-stove', 'steam'],
  ['street-sign', 'laser'],
  // samples: early level, localized zone, large object, laser on a blade mask
  ['frying-pan', 'scrub'],
  ['garden-bench', 'sand'],
  ['swimming-pool', 'scrub'],
  ['rusty-cleaver', 'laser'],
  // visual pass: stages that showed little / no change while working
  ['stone-lion', 'moss-brush'],
  ['shower-cabin', 'steam'],
  ['sofa', 'steam'],
  ['table-lamp', 'steam'],
].filter(([id]) => !process.env.ONLY || process.env.ONLY.split(',').includes(id));

const toCss = (xf, x, y) => ({ x: xf.cx + (x - xf.size / 2) * xf.k, y: xf.cy + (y - xf.size / 2) * xf.k });
const finger = (tool, p) => (tool.kind === 'jet' ? { x: p.x - tool.jet.x - tool.workOffset.x, y: p.y - tool.jet.y - tool.workOffset.y } : { x: p.x - tool.workOffset.x, y: p.y - tool.workOffset.y });

for (const [id, stage] of CASES) {
  test(`registration ${id} / ${stage}: cleaning lands under the tool inside the outline`, async ({ page }, info) => {
    test.setTimeout(400_000);
    const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
    const dir = `project/screenshots/step9-registration/${info.project.name}`;
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (s) => s.scene === 'Menu');
    await openFromMenu(page, drv, id);
    let s;
    for (let i = 0; i < 10; i++) {
      s = await waitFor(page, (x) => x.level && x.level.state === 'playing', { timeout: 30000 });
      if (s.level.stageId === stage) break;
      await playStage5(page, drv);
    }
    expect(s.level.stageId).toBe(stage);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${dir}/${PHASE}-${id}-1-outline.png` });
    // one stroke along the middle row of the zone's work points
    const L = s.level;
    const pts = L.targets.points;
    const ys = [...new Set(pts.map(([, y]) => y))].sort((a, b) => a - b);
    const y = ys[Math.floor(ys.length / 2)];
    const xs = pts.filter(([, yy]) => yy === y).map(([x]) => x).sort((a, b) => a - b);
    const a = finger(L.tool, toCss(L.xf, xs[0], y));
    const b = finger(L.tool, toCss(L.xf, xs[xs.length - 1], y));
    await drv.down(a.x, a.y);
    for (let i = 1; i <= 30; i++) {
      await drv.move(a.x + ((b.x - a.x) * i) / 30, a.y + Math.sin(i / 2) * 6);
      await page.waitForTimeout(30);
    }
    await page.screenshot({ path: `${dir}/${PHASE}-${id}-2-stroke.png` });
    await drv.up();
    await page.waitForTimeout(400);
    const after = await snap(page);
    console.log(`${info.project.name} ${id}/${stage} progress after one stroke ${after.level.progress.toFixed(3)}`);
    await page.screenshot({ path: `${dir}/${PHASE}-${id}-3-after.png` });
    expect(after.level.progress).toBeGreaterThan(0);
  });
}
