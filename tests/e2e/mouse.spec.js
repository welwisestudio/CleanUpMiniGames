import { test, expect } from '@playwright/test';
import { openGame, snap, waitFor, mouseDriver, pressButton, playWholeLevel } from './helpers.js';

test('mouse: menu → Soccer Ball → all 6 stages → result → replay → pause → menu', async ({ page }) => {
  const errors = [];
  await openGame(page, errors);
  const mouse = mouseDriver(page);

  await pressButton(page, mouse, 'menu-level-soccer-ball');
  const { order, result } = await playWholeLevel(page, mouse);
  expect(order).toEqual(['chisel', 'dry-brush', 'foam-spray', 'scrub', 'rinse', 'dry']);
  expect(result.level.reward).toEqual({ amount: 15, coinsAfter: 15 });
  expect(result.coins).toBe(15);
  expect(result.levels['soccer-ball']).toEqual({ completed: true, completions: 1 });
  console.log('mouse stage log', JSON.stringify(result.level.stageLog), 'level seconds', result.level.levelSeconds);

  // Replay starts a fresh run at stage 1 / 0 %.
  const runBefore = result.level.runId;
  await page.waitForTimeout(1200); // coin fly
  await pressButton(page, mouse, 'result-replay');
  const replay = await waitFor(page, (s) => s.level && s.level.runId !== runBefore && s.level.state === 'playing', { label: 'replay run' });
  expect(replay.level.stageIndex).toBe(0);
  expect(replay.level.progress).toBe(0);
  expect(replay.coins).toBe(15); // no extra reward for starting a replay

  // Pause → Menu returns to the shelves; progress is kept.
  await pressButton(page, mouse, 'hud-pause');
  await waitFor(page, (s) => s.level?.pauseModal && s.pause.reasons.includes('user'), { label: 'pause modal' });
  await pressButton(page, mouse, 'pause-menu');
  const menu = await waitFor(page, (s) => s.scene === 'Menu', { label: 'menu' });
  expect(menu.coins).toBe(15);
  expect(menu.pause.paused).toBe(false);

  expect(errors).toEqual([]);
});
