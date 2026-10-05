import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Step 6 UI corrections (focused): hub = approved background / shelves + chests under the
// counters (no emblem); completed screen = x3 button + text alignment. Screenshots and the
// element rectangles go to project/screenshots/step6/ui-fix/<project>/ for the pixel check
// (scripts/check_result_alignment.py).
test('hub chests under the counters; completed screen layout and x3 states', async ({ page }, info) => {
  test.setTimeout(240_000);
  const tag = info.project.name;
  const dir = `project/screenshots/step6/ui-fix/${tag}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa=1&devStorage=memory&devAd=not-earned');
  let s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-coins'] && x.buttons?.['menu-timed-chest']);
  await page.waitForTimeout(500);
  s = await snap(page);
  const B = s.buttons;
  // each chest centred under its counter, below it, above the first shelf row; no overlaps
  for (const [chest, pill] of [['menu-timed-chest', 'menu-coins'], ['menu-progress-chest', 'menu-diamonds']]) {
    expect(Math.abs(B[chest].x - B[pill].x), `${chest} centred under ${pill}`).toBeLessThan(2);
    expect(B[chest].y - B[chest].h / 2, `${chest} below ${pill}`).toBeGreaterThan(B[pill].y + B[pill].h / 2 - 1);
    expect(B[chest].y + B[chest].h / 2, `${chest} above the shelves`).toBeLessThan(B['menu-level-soccer-ball'].y - B['menu-level-soccer-ball'].h / 2 + 1);
    expect(B[chest].x + B[chest].w / 2).toBeLessThan(B['menu-settings'].x - B['menu-settings'].w / 2);
  }
  expect(Math.abs(B['menu-timed-chest'].x - B['menu-progress-chest'].x) * 2).toBeGreaterThan(B['menu-timed-chest'].w + B['menu-progress-chest'].w);
  await page.screenshot({ path: `${dir}/01-hub.png` });
  // completed screen (real play, rug)
  const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await pressButton(page, drv, 'menu-level-rug');
  await playLevel5(page, drv);
  await page.waitForTimeout(2800);
  s = await snap(page);
  expect(s.rewards.x3State).toBe('idle');
  await page.screenshot({ path: `${dir}/02-completed.png` });
  fs.writeFileSync(`${dir}/rects.json`, JSON.stringify({ css: { W: s.layout.W, H: s.layout.H }, buttons: s.buttons }));
  // x3 states: cancelled ad message, then claimed
  await pressButton(page, drv, 'result-x3');
  await waitFor(page, (x) => !x.pause.reasons.includes('adBusy') && x.rewards.x3State === 'idle');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${dir}/03-x3-cancelled.png` });
  await page.evaluate(() => window.__cleanupQA.platformDev.setRewardedOutcome('earned'));
  await page.waitForTimeout(1500);
  await pressButton(page, drv, 'result-x3');
  await waitFor(page, (x) => x.rewards.x3State === 'granted');
  await page.waitForTimeout(1500);
  s = await snap(page);
  expect(s.coins).toBe(45);
  await page.screenshot({ path: `${dir}/04-x3-claimed.png` });
  console.log(`UIFIX ${tag}: chests centred under the counters (Δx < 2 px), clear of the shelves; completed screen captured; x3 cancel → +0, claim → 45 total`);
  expect(errors).toEqual([]);
});
