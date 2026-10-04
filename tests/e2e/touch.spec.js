import { test, expect } from '@playwright/test';
import { openGame, waitFor, touchDriver, pressButton, playWholeLevel } from './helpers.js';

test('touch (phone 390x844): menu → all 6 stages by finger → result → home → menu → replay from menu', async ({ page }) => {
  const errors = [];
  await openGame(page, errors);
  const finger = await touchDriver(page);

  await pressButton(page, finger, 'menu-level-soccer-ball');
  const { order, result } = await playWholeLevel(page, finger);
  expect(order).toEqual(['chisel', 'dry-brush', 'foam-spray', 'scrub', 'rinse', 'dry']);
  expect(result.coins).toBe(15);
  console.log('touch stage log', JSON.stringify(result.level.stageLog), 'level seconds', result.level.levelSeconds);

  await page.waitForTimeout(1200);
  await pressButton(page, finger, 'result-home');
  await waitFor(page, (s) => s.scene === 'Menu', { label: 'menu after home' });

  // Start again from the menu (all objects open, completion is shown, level restarts cleanly).
  await pressButton(page, finger, 'menu-level-soccer-ball');
  const again = await waitFor(page, (s) => s.level && s.level.state === 'playing', { label: 'second run' });
  expect(again.level.stageIndex).toBe(0);
  expect(again.levels['soccer-ball'].completions).toBe(1);

  expect(errors).toEqual([]);
});
