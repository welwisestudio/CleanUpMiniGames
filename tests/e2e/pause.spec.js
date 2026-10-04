import { test, expect } from '@playwright/test';
import { openGame, snap, waitFor, mouseDriver, pressButton, pointerFor } from './helpers.js';

// Host (platform) pause and the player's pause are independent reasons.
test('host pause blocks input; host resume does not lift the player pause', async ({ page }) => {
  const errors = [];
  await openGame(page, errors);
  const mouse = mouseDriver(page);
  await pressButton(page, mouse, 'menu-level-soccer-ball');
  let s = await waitFor(page, (x) => x.level?.state === 'playing');
  const tool = s.level.tool;
  const { x: cx, y: cy, radius: R } = s.level.object;

  const stroke = async () => {
    const a = pointerFor(tool, { x: cx - R * 0.8, y: cy });
    await mouse.down(a.x, a.y);
    for (let i = 0; i <= 40; i++) {
      const p = pointerFor(tool, { x: cx - R * 0.8 + (R * 1.6 * i) / 40, y: cy + Math.sin(i) * R * 0.5 });
      await mouse.move(p.x, p.y);
    }
    await mouse.up();
  };

  await page.evaluate(() => window.__cleanupQA.platformDev.setPaused(true));
  await stroke();
  s = await snap(page);
  expect(s.pause.reasons).toContain('host');
  expect(s.level.progress).toBe(0);

  // player pauses too, then the host resumes: still paused, modal still open
  await page.evaluate(() => window.__cleanupQA.platformDev.setPaused(false));
  await pressButton(page, mouse, 'hud-pause');
  await page.evaluate(() => window.__cleanupQA.platformDev.setPaused(true));
  await page.evaluate(() => window.__cleanupQA.platformDev.setPaused(false));
  s = await snap(page);
  expect(s.pause.reasons).toEqual(['user']);
  expect(s.level.pauseModal).toBe(true);

  await pressButton(page, mouse, 'pause-resume');
  await waitFor(page, (x) => !x.pause.paused);
  for (let i = 0; i < 4; i++) await stroke();
  s = await snap(page);
  expect(s.level.progress).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});
