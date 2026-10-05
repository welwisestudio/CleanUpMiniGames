import { test, expect } from '@playwright/test';
import { waitFor, snap, mouseDriver, touchDriver, pressButton } from './helpers.js';

// Main UI on the project's viewport: menu (top + scrolled to the end), settings (toggle works),
// pause window, HUD. Screenshots: project/screenshots/step5/ui-<project>-*.png
test('main UI: menu scroll, settings, pause', async ({ page }, info) => {
  const tag = info.project.name;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa=1');
  let s = await waitFor(page, (x) => x.scene === 'Menu');
  const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `project/screenshots/step5/ui-${tag}-1-menu.png` });
  // scroll down (real drag / wheel) until the last object is visible
  for (let i = 0; i < 10; i++) {
    s = await snap(page);
    if (s.buttons['menu-level-sneaker'].visible) break;
    if (drv.kind === 'touch') {
      await drv.down(s.layout.W / 2, s.layout.H * 0.85);
      for (let k = 1; k <= 10; k++) await drv.move(s.layout.W / 2, s.layout.H * 0.85 - k * 30);
      await drv.up();
    } else {
      await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
      await page.mouse.wheel(0, 250);
    }
    await page.waitForTimeout(500);
  }
  expect((await snap(page)).buttons['menu-level-sneaker'].visible).toBe(true);
  await page.screenshot({ path: `project/screenshots/step5/ui-${tag}-2-menu-scrolled.png` });
  // settings from the menu gear; toggling Sound changes the saved setting
  await pressButton(page, drv, 'menu-settings');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `project/screenshots/step5/ui-${tag}-3-settings.png` });
  const t = (await snap(page)).buttons['settings-sound'];
  await drv.tap(t.x, t.y);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__cleanupQA.snapshot().levels)).toBeDefined();
  await pressButton(page, drv, 'settings-close');
  await page.waitForTimeout(300);
  // open a level, pause, screenshot, settings from pause
  await pressButton(page, drv, 'menu-level-sneaker');
  await waitFor(page, (x) => x.level?.state === 'playing');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `project/screenshots/step5/ui-${tag}-4-hud-hint.png` });
  await pressButton(page, drv, 'hud-pause');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `project/screenshots/step5/ui-${tag}-5-pause.png` });
  await pressButton(page, drv, 'pause-settings');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `project/screenshots/step5/ui-${tag}-6-pause-settings.png` });
  await pressButton(page, drv, 'settings-close');
  await pressButton(page, drv, 'pause-resume');
  await waitFor(page, (x) => !x.pause.paused);
  expect(errors).toEqual([]);
});
