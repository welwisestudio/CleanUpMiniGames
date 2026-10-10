import fs from 'node:fs';
import { test } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, openFromMenu } from './helpers.js';

// Mobile framing audit (2026-10-10): opens every level (no gameplay) and records where the object
// sits on screen (its bounds rect, the play area) + a screenshot, for a quick framing review.
// Run: FRAMING=1 npx playwright test tests/e2e/step11-framing.spec.js
// Output: project/screenshots/framing/<project>/scan.json, <level>.png
test('framing scan of every level', async ({ page }, info) => {
  test.skip(!process.env.FRAMING, 'framing scan: set FRAMING=1');
  test.setTimeout(1_200_000);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  const dir = `project/screenshots/framing/${info.project.name}`;
  fs.mkdirSync(dir, { recursive: true });
  await page.goto('/?qa=1&devStorage=memory');
  const menu = await waitFor(page, (x) => x.scene === 'Menu');
  const ids = Object.keys(menu.buttons).filter((k) => k.startsWith('menu-level-')).map((k) => k.slice(11));
  const only = process.env.LEVELS ? process.env.LEVELS.split(',') : null;
  const out = {};
  for (const id of ids) {
    if (only && !only.includes(id)) continue;
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (x) => x.scene === 'Menu');
    await openFromMenu(page, drv, id);
    const s = await waitFor(page, (x) => x.level?.id === id && x.level.state === 'playing', { timeout: 30000 });
    await page.waitForTimeout(700);
    const s2 = await waitFor(page, (x) => x.level?.id === id);
    out[id] = { object: s2.buttons.object, layout: s2.layout, xf: s2.level.xf, tool: s2.level.tool.id, cards: (s2.level.toolCards ?? []).filter((c) => c.visible).map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h })), stage: s.level.stageId };
    await page.screenshot({ path: `${dir}/${id}.png` });
  }
  fs.writeFileSync(`${dir}/scan.json`, JSON.stringify(out, null, 1));
});

// Carpet beater (mobile pass 2026-10-10): the player taps the TARGET and the beating head lands on it
// (strike point = head centre, small finger offset, like the hammer) — no tapping below the target.
test('carpet beater strikes with its head where the player taps', async ({ page }, info) => {
  test.setTimeout(300_000);
  const { snap } = await import('./helpers.js');
  const { playStage5 } = await import('./level-play.js');
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (x) => x.scene === 'Menu');
  await openFromMenu(page, drv, 'coir-doormat');
  let s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
  for (let i = 0; i < 4 && s.level.stageId !== 'beat'; i++) {
    await playStage5(page, drv);
    s = await waitFor(page, (x) => x.level?.state === 'playing');
  }
  const L = s.level;
  if (L.stageId !== 'beat') throw new Error('beat stage not reached');
  const toCss = (x, y) => ({ x: L.xf.cx + (x - L.xf.size / 2) * L.xf.k, y: L.xf.cy + (y - L.xf.size / 2) * L.xf.k });
  const t = L.targets.points[0];
  const c = toCss(t.x, t.y);
  // the finger is only the small strike offset away from the target (was 170 object units below it)
  if (Math.abs(L.tool.workOffset.y) > 40) throw new Error(`beater finger offset too large: ${L.tool.workOffset.y}`);
  const f = { x: c.x - L.tool.workOffset.x, y: c.y - L.tool.workOffset.y };
  await drv.down(f.x, f.y);
  await page.waitForTimeout(140);
  await page.screenshot({ path: `project/screenshots/framing/${info.project.name}-beater-hit.png` });
  await drv.up();
  await page.waitForTimeout(200);
  s = await snap(page);
  if (!(s.level.progress > 0)) throw new Error('the tap on the target did not register a hit');
  console.log('beater hit progress', s.level.progress.toFixed(3), 'offset', L.tool.workOffset);
});
