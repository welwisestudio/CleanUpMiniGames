import { test, expect } from '@playwright/test';
import { openGame, snap, waitFor, mouseDriver, pressButton, playStage, pointerFor } from './helpers.js';

// Wrong or idle gestures must not complete an action by themselves.
test('invalid gestures do not advance stages', async ({ page }) => {
  const errors = [];
  await openGame(page, errors);
  const mouse = mouseDriver(page);
  await pressButton(page, mouse, 'menu-level-soccer-ball');

  // --- Stage 1 · chisel ---
  let s = await waitFor(page, (x) => x.level?.state === 'playing' && x.level.stageIndex === 0);
  const { x: cx, y: cy, radius: R } = s.level.object;
  const tool1 = s.level.tool;
  const onBall = pointerFor(tool1, { x: cx, y: cy });
  for (let i = 0; i < 30; i++) await mouse.tap(onBall.x + (i % 5) * 6, onBall.y);
  await mouse.down(onBall.x, onBall.y);
  await page.waitForTimeout(1500); // hold still
  await mouse.up();
  // drag outside the ball (left and right margins, the sky band and below the ball)
  for (const [ax, ay, bx, by] of [
    [cx - R * 1.6, cy - R * 1.1, cx + R * 1.6, cy - R * 1.1],
    [cx - R * 1.6, cy + R * 1.25, cx + R * 1.6, cy + R * 1.25],
  ]) {
    const a = pointerFor(tool1, { x: ax, y: ay });
    const b = pointerFor(tool1, { x: bx, y: by });
    await mouse.down(a.x, a.y);
    for (let i = 1; i <= 20; i++) await mouse.move(a.x + ((b.x - a.x) * i) / 20, a.y + ((b.y - a.y) * i) / 20);
    await mouse.up();
  }
  s = await snap(page);
  expect(s.level.stageIndex).toBe(0);
  expect(s.level.progress).toBe(0);

  // Pressing the pause button is a UI action, never a cleaning stroke.
  await pressButton(page, mouse, 'hud-pause');
  const paused = await waitFor(page, (x) => x.level.pauseModal && x.buttons['pause-resume']);
  // strokes while paused do nothing (drawn across the screen above the modal buttons, never on them)
  const rb = paused.buttons['pause-resume'];
  const yLine = rb.y - rb.h * 1.2;
  await mouse.down(40, yLine);
  for (let i = 0; i <= 30; i++) await mouse.move(40 + (paused.layout.W - 80) * (i / 30), yLine + (i % 2) * 20);
  await mouse.up();
  s = await snap(page);
  expect(s.level.progress).toBe(0);
  await pressButton(page, mouse, 'pause-resume');
  await waitFor(page, (x) => !x.level.pauseModal && !x.pause.paused);

  await playStage(page, mouse);

  // --- Stage 2 · dry brush ---
  s = await waitFor(page, (x) => x.level?.state === 'playing' && x.level.stageIndex === 1);
  const tool2 = s.level.tool;
  const outsideA = pointerFor(tool2, { x: cx - R * 1.7, y: cy - R * 1.3 });
  await mouse.down(outsideA.x, outsideA.y);
  for (let i = 0; i < 25; i++) await mouse.move(outsideA.x + i * 4, outsideA.y);
  await mouse.up();
  s = await snap(page);
  expect(s.level.progress).toBe(0);
  const center2 = pointerFor(tool2, { x: cx, y: cy });
  for (let i = 0; i < 25; i++) await mouse.tap(center2.x, center2.y);
  s = await snap(page);
  expect(s.level.stageIndex).toBe(1);
  expect(s.level.progress).toBeGreaterThan(0);
  expect(s.level.progress).toBeLessThan(0.3);
  await playStage(page, mouse);

  // --- Stage 3 · foam sprayer (jet) ---
  s = await waitFor(page, (x) => x.level?.state === 'playing' && x.level.stageIndex === 2);
  const tool3 = s.level.tool;
  const offBall = pointerFor(tool3, { x: cx - R * 1.6, y: cy - R * 0.5 });
  await mouse.down(offBall.x, offBall.y);
  await page.waitForTimeout(2000);
  await mouse.up();
  s = await snap(page);
  expect(s.level.progress).toBe(0);
  const spot = pointerFor(tool3, { x: cx, y: cy });
  await mouse.down(spot.x, spot.y);
  await page.waitForTimeout(3000); // hold the jet on one spot
  await mouse.up();
  s = await snap(page);
  expect(s.level.stageIndex).toBe(2);
  expect(s.level.progress).toBeGreaterThan(0);
  expect(s.level.progress).toBeLessThan(0.3);

  expect(errors).toEqual([]);
});
