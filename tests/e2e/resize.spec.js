import { test, expect } from '@playwright/test';
import { openGame, snap, waitFor, mouseDriver, pressButton, playStage, playWholeLevel } from './helpers.js';

const SIZES = [
  [1280, 800],
  [390, 844],
  [844, 390],
  [320, 240],
  [1920, 1080],
  [768, 1024],
];

test('window resizing in menu, mid-stroke and mid-stage never breaks the game; level completes', async ({ page }) => {
  const errors = [];
  await openGame(page, errors);
  const mouse = mouseDriver(page);

  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    const s = await waitFor(page, (x) => x.layout && x.layout.W === w && x.layout.H === h, { label: `menu layout ${w}x${h}` });
    expect(s.scene).toBe('Menu');
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await waitFor(page, (x) => x.layout && x.layout.W === 1280 && x.layout.H === 800, { label: 'menu back to 1280x800' });
  await pressButton(page, mouse, 'menu-level-soccer-ball');
  let s = await waitFor(page, (x) => x.level?.state === 'playing');

  // Resize in the middle of a stroke (pointer held down) several times.
  const { x: cx, y: cy } = s.level.object;
  await mouse.down(cx - 100, cy + 60);
  for (const [w, h] of SIZES) {
    await mouse.move(cx, cy + 80);
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(120);
    await mouse.move(cx + 50, cy + 70);
  }
  await mouse.up();
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    s = await waitFor(page, (x) => x.layout && x.layout.W === w && x.layout.H === h, { label: `level layout ${w}x${h}` });
    expect(s.level.state).toBe('playing');
  }

  // Finish one stage at a small landscape size, then the rest at a phone portrait size.
  await page.setViewportSize({ width: 844, height: 390 });
  await waitFor(page, (x) => x.layout.W === 844);
  await playStage(page, mouse);
  await page.setViewportSize({ width: 412, height: 915 });
  await waitFor(page, (x) => x.layout.W === 412 && x.level.state === 'playing');
  for (let i = 0; i < 5; i++) {
    const st = await waitFor(page, (x) => x.level.state === 'playing' || x.level.state === 'result');
    if (st.level.state === 'result') break;
    await playStage(page, mouse);
  }
  s = await waitFor(page, (x) => x.level.state === 'result');
  // Resize while the result card is open; buttons stay reachable.
  await page.setViewportSize({ width: 1600, height: 900 });
  await waitFor(page, (x) => x.layout.W === 1600 && x.layout.H === 900, { label: 'result layout' });
  await page.waitForTimeout(1200);
  await pressButton(page, mouse, 'result-home');
  await waitFor(page, (x) => x.scene === 'Menu');

  expect(errors).toEqual([]);
});
