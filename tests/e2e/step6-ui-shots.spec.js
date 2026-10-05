import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, pressButton, snap } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Step 6 UI pass: responsive matrix (portrait phone, landscape phone, tablet, square, desktop)
// for the menu, the full-chest offer and the result card (resized live while it is shown).
// Checks that header widgets / card buttons stay inside the screen and do not overlap.
const SIZES = [
  ['phone-portrait', 390, 844],
  ['phone-landscape', 844, 390],
  ['tablet', 768, 1024],
  ['square', 900, 900],
  ['desktop', 1280, 800],
];
const KEY = 'cleanup-dev-save';
const inside = (r, s) => r.x - r.w / 2 >= -1 && r.y - r.h / 2 >= -1 && r.x + r.w / 2 <= s.layout.W + 1 && r.y + r.h / 2 <= s.layout.H + 1;
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;

function checkRects(s, ids, label) {
  const rs = ids.map((id) => [id, s.buttons[id]]).filter(([, r]) => r && r.visible !== false);
  for (const [id, r] of rs) expect(inside(r, s), `${label}: ${id} inside the screen`).toBe(true);
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) expect(overlap(rs[i][1], rs[j][1]), `${label}: ${rs[i][0]} × ${rs[j][0]}`).toBe(false);
}

test('menu, chest offer and result card on the responsive matrix', async ({ page }, info) => {
  test.skip(!info.project.name.includes('desktop'), 'one run is enough (viewports set explicitly)');
  test.setTimeout(240_000);
  const dir = 'project/screenshots/step6/ui';
  for (const [name, w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/?qa=1&devAd=earned');
    await waitFor(page, (s) => s.scene === 'Menu' && s.buttons?.['menu-timed-chest']);
    await page.waitForTimeout(500);
    const s = await snap(page);
    checkRects(s, ['menu-settings', 'menu-timed-chest', 'menu-progress-chest'], `menu ${name}`);
    await page.screenshot({ path: `${dir}/menu-${name}.png` });
  }
  // full-chest offer from the menu on every size
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k) || '{}');
    st.progressChest = { steps: 5, opened: 0 };
    localStorage.setItem(k, JSON.stringify(st));
  }, KEY);
  for (const [name, w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/?qa=1&devAd=earned');
    const drv = mouseDriver(page);
    await waitFor(page, (s) => s.scene === 'Menu' && s.buttons?.['menu-progress-chest']);
    await pressButton(page, drv, 'menu-progress-chest');
    await waitFor(page, (s) => s.rewards.chestOffer);
    await page.waitForTimeout(450);
    checkRects(await snap(page), ['chest-open', 'chest-later'], `offer ${name}`);
    await page.screenshot({ path: `${dir}/chest-offer-${name}.png` });
  }
  // result card: play the rug once (reset chest to 40 % first), then resize through the matrix
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k) || '{}');
    st.progressChest = { steps: 1, opened: 0 };
    localStorage.setItem(k, JSON.stringify(st));
  }, KEY);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?qa=1&devAd=earned');
  const drv = mouseDriver(page);
  await waitFor(page, (s) => s.scene === 'Menu' && s.buttons?.['menu-level-rug']);
  await pressButton(page, drv, 'menu-level-rug');
  await playLevel5(page, drv);
  await page.waitForTimeout(2600);
  for (const [name, w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    checkRects(await snap(page), ['result-x3', 'result-home', 'result-replay', 'result-next'], `result ${name}`);
    await page.screenshot({ path: `${dir}/result-${name}.png` });
  }
  console.log('UISHOTS menu / chest offer / result card: inside the screen, no overlaps on 5 sizes');
});
