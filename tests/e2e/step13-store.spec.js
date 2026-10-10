import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton } from './helpers.js';

// Store + Wheel of Fortune (2026-10-10), real mouse / touch, persistent dev save:
// Store opens / closes; the coin "+" opens it at the Coins section, the diamond "+" at Diamonds;
// a rewarded store offer: cancel / fail → nothing, success → granted; the Wheel button (under
// Settings) opens the wheel; spin ad cancel / fail → no spin; success → the wheel stops exactly on
// the chosen segment and the reward is saved once; the tool reward is owned, a second tool win
// gives the fallback; everything persists after a reload. Screenshots: project/screenshots/store/<project>/
const KEY = 'cleanup-dev-save';
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/store/${info.project.name}/${name}.png` });
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;

async function seed(page, src) {
  await page.evaluate(({ KEY, src }) => {
    const st = JSON.parse(localStorage.getItem(KEY) || '{}');
    // eslint-disable-next-line no-new-func
    new Function('st', src)(st);
    localStorage.setItem(KEY, JSON.stringify(st));
  }, { KEY, src });
}

async function menu(page) {
  await page.goto('/?qa=1');
  return waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-wheel'], { label: 'menu' });
}

test('store: deep links, rewarded offers, close', async ({ page }, info) => {
  test.setTimeout(300_000);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.goto('/?qa=1');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  let s = await menu(page);
  await page.waitForTimeout(400);
  // menu: Wheel directly below Settings, Store below it; no overlap with the header pills / chests
  const g = s.buttons['menu-settings'];
  const w = s.buttons['menu-wheel'];
  const st = s.buttons['menu-store'];
  // Store next to Settings (same row, left of it); the Wheel CTA below the pair, on the right
  expect(Math.abs(st.y - g.y)).toBeLessThan(2);
  expect(st.x).toBeLessThan(g.x);
  expect(overlap(st, g)).toBe(false);
  expect(w.y).toBeGreaterThan(g.y + g.h / 2);
  expect(w.x).toBeGreaterThan(st.x);
  for (const id of ['menu-coins', 'menu-diamonds', 'menu-timed-chest', 'menu-progress-chest']) {
    expect(overlap(w, s.buttons[id]), `wheel × ${id}`).toBe(false);
    expect(overlap(st, s.buttons[id]), `store × ${id}`).toBe(false);
  }
  // "+" inside each counter: tappable size, not over the value / icon
  for (const id of ['menu-plus-coins', 'menu-plus-gems']) expect(s.buttons[id].h).toBeGreaterThanOrEqual(40);
  await shot(page, info, '01-menu-wheel-store-plus');

  // coin "+" → Store at Coins
  await pressButton(page, drv, 'menu-plus-coins');
  s = await waitFor(page, (x) => x.store && x.buttons?.['store-section-coins'], { label: 'store (coins)' });
  await page.waitForTimeout(300);
  s = await snap(page);
  expect(s.buttons['store-section-coins'].visible).toBe(true);
  expect(s.buttons['store-section-gems'].visible).toBe(false);
  await shot(page, info, '03-store-coins-deeplink');
  await pressButton(page, drv, 'store-close');
  s = await waitFor(page, (x) => !x.store, { label: 'store closed' });

  // diamond "+" → Store at Diamonds
  await pressButton(page, drv, 'menu-plus-gems');
  s = await waitFor(page, (x) => x.store && x.buttons?.['store-section-gems']);
  await page.waitForTimeout(300);
  s = await snap(page);
  expect(s.buttons['store-section-gems'].visible).toBe(true);
  await shot(page, info, '02-store-gems');

  // rewarded store offer: cancel, failure → nothing; success → +2 diamonds
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await pressButton(page, drv, 'store-free-gems');
    await page.waitForTimeout(500);
    s = await snap(page);
    expect(s.rewards.diamonds).toBe(0);
  }
  await setAd(page, 'earned');
  await pressButton(page, drv, 'store-free-gems');
  s = await waitFor(page, (x) => x.rewards.diamonds === 2, { label: 'free gems granted' });
  await shot(page, info, '04-store-after-reward');
  await pressButton(page, drv, 'store-close');
  await waitFor(page, (x) => !x.store);

  // HUD "+" in a level opens the Store too (game paused while open)
  await pressButton(page, drv, 'menu-level-soccer-ball');
  s = await waitFor(page, (x) => x.level?.state === 'playing' && x.buttons?.['hud-plus-gems']?.visible, { label: 'level HUD +', timeout: 30000 });
  await pressButton(page, drv, 'hud-plus-gems');
  s = await waitFor(page, (x) => x.store && x.pause.reasons.includes('store'), { label: 'store in level' });
  await shot(page, info, '05-store-in-level');
  await pressButton(page, drv, 'store-close');
  s = await waitFor(page, (x) => !x.store && !x.pause.reasons.includes('store'));
});

test('wheel of fortune: ad cancel / fail / success, exact landing, tool reward + fallback, persistence', async ({ page }, info) => {
  test.setTimeout(400_000);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.goto('/?qa=1');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  let s = await menu(page);
  await pressButton(page, drv, 'menu-wheel');
  s = await waitFor(page, (x) => x.wheel && x.buttons?.['wheel-spin']?.visible, { label: 'wheel open' });
  await page.waitForTimeout(300);
  await shot(page, info, '06-wheel');
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await pressButton(page, drv, 'wheel-spin');
    s = await waitFor(page, (x) => x.wheel?.state === 'idle' && x.buttons?.['wheel-spin']?.visible, { label: `after ${mode}` });
    expect(s.wheel.chosen).toBe(null);
    expect([s.coins, s.rewards.diamonds]).toEqual([0, 0]);
    expect(s.wheel.spinsLeft).toBe(5);
  }
  await setAd(page, 'earned');
  let coins = 0;
  let gems = 0;
  for (let spin = 0; spin < 3; spin++) {
    await pressButton(page, drv, 'wheel-spin');
    s = await waitFor(page, (x) => x.wheel?.state === 'spinning', { label: 'spinning' });
    if (spin === 0) {
      await page.waitForTimeout(900);
      await shot(page, info, '07-wheel-spinning');
    }
    s = await waitFor(page, (x) => x.wheel?.state === 'result' && x.buttons?.['wheel-collect']?.visible, { label: 'landed', timeout: 15000 });
    expect(s.wheel.landed).toBe(s.wheel.chosen); // stops exactly on the chosen segment
    expect(s.coins + s.rewards.diamonds).toBeGreaterThan(coins + gems - 1);
    coins = s.coins;
    gems = s.rewards.diamonds;
    if (spin === 0) {
      await page.waitForTimeout(450); // the card pops in
      await shot(page, info, '08-wheel-won');
    }
    await pressButton(page, drv, 'wheel-collect');
    await waitFor(page, (x) => x.wheel?.state === 'idle');
  }
  s = await snap(page);
  expect(s.wheel.spinsLeft).toBe(2);
  // reload: rewards persist
  s = await menu(page);
  expect(s.coins).toBe(coins);
  expect(s.rewards.diamonds).toBe(gems);
});

test('wheel tool reward: the Gold laser becomes owned; a second tool win gives the fallback diamonds', async ({ page }, info) => {
  test.setTimeout(200_000);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.goto('/?qa=1&wheelSeg=3');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto('/?qa=1&wheelSeg=3');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-wheel']);
  await pressButton(page, drv, 'menu-wheel');
  await waitFor(page, (x) => x.wheel && x.buttons?.['wheel-spin']?.visible);
  await setAd(page, 'earned');
  await pressButton(page, drv, 'wheel-spin');
  let s = await waitFor(page, (x) => x.wheel?.state === 'result', { label: 'tool win', timeout: 15000 });
  expect(s.wheel.landed).toBe(3);
  expect(s.toolsOwned).toContain('laser-gold');
  expect(s.rewards.diamonds).toBe(0);
  await page.waitForTimeout(450);
  await shot(page, info, '09-wheel-tool-win');
  await pressButton(page, drv, 'wheel-collect');
  await waitFor(page, (x) => x.wheel?.state === 'idle');
  await pressButton(page, drv, 'wheel-spin');
  s = await waitFor(page, (x) => x.wheel?.state === 'result', { label: 'fallback', timeout: 15000 });
  expect(s.rewards.diamonds).toBe(5);
  await shot(page, info, '10-wheel-tool-fallback');
  // persists after a reload: the Gold laser stays owned
  await page.goto('/?qa=1');
  s = await waitFor(page, (x) => x.scene === 'Menu');
  expect(s.toolsOwned).toContain('laser-gold');
  expect(s.rewards.diamonds).toBe(5);
});

// Top bar (UI polish 2026-10-11): counters with short and long values never run under the Store /
// Settings pair; the "+" sits inside its counter; phone portrait, phone landscape and desktop.
test('top bar: counters with long values, Store + Settings pair, Wheel CTA', async ({ page }, info) => {
  test.setTimeout(200_000);
  const views = info.project.name.includes('touch') ? [['portrait', 390, 844], ['landscape', 844, 390]] : [['desktop', 1280, 800]];
  for (const [vals, tag] of [[[0, 0], 'short'], [[12345, 987], 'long'], [[1234567, 12345], 'xlong']]) {
    await page.goto('/?qa=1');
    await seed(page, `st.coins = ${vals[0]}; st.diamonds = ${vals[1]};`);
    for (const [name, w, h] of views) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/?qa=1');
      const s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-wheel'] && x.buttons?.['menu-plus-gems']);
      await page.waitForTimeout(500);
      const b = s.buttons;
      for (const pill of ['menu-coins', 'menu-diamonds']) for (const btn of ['menu-store', 'menu-settings', 'menu-wheel']) expect(overlap(b[pill], b[btn]), `${name} ${tag}: ${pill} × ${btn}`).toBe(false);
      expect(overlap(b['menu-coins'], b['menu-diamonds'])).toBe(false);
      // each "+" lies inside its own counter (horizontally)
      for (const [plus, pill] of [['menu-plus-coins', 'menu-coins'], ['menu-plus-gems', 'menu-diamonds']]) {
        expect(b[plus].x).toBeLessThan(b[pill].x + b[pill].w / 2);
        expect(b[plus].x).toBeGreaterThan(b[pill].x);
      }
      expect(b['menu-store'].h).toBeGreaterThanOrEqual(40);
      await page.screenshot({ path: `project/screenshots/store/${info.project.name}/topbar-${name}-${tag}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(h, 230) } });
    }
  }
});
