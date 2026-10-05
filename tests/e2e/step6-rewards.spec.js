import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Step 6 UI / reward pass (focused): menu, timed chest, x3 after a level, level-progress chest.
// Real mouse / touch input; ads come from the dev adapter only (outcome set explicitly).
// Saves are seeded through the dev-only localStorage copy and a reload (the real load path).
// Screenshots: project/screenshots/step6/rewards/<project>/

const KEY = 'cleanup-dev-save';
const dirOf = (info) => `project/screenshots/step6/rewards/${info.project.name}`;

async function boot(page, info, query = '') {
  await page.goto(`/?qa=1${query}`);
  await waitFor(page, (s) => s.scene === 'Menu' && s.rewards && s.buttons?.['menu-timed-chest']);
  return info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page);
}

async function seed(page, mutate) {
  await page.evaluate(
    ({ KEY, src }) => {
      const st = JSON.parse(localStorage.getItem(KEY) || '{}');
      // eslint-disable-next-line no-new-func
      new Function('st', src)(st);
      localStorage.setItem(KEY, JSON.stringify(st));
    },
    { KEY, src: mutate },
  );
}

// two real taps in quick succession on the same button (duplicate-claim check)
async function doubleTap(page, drv, id) {
  const s = await waitFor(page, (x) => x.buttons?.[id]?.visible !== false && x.buttons?.[id], { label: id });
  const b = s.buttons[id];
  await drv.tap(b.x, b.y);
  await drv.tap(b.x, b.y);
}

const setAd = (page, mode) => page.evaluate((m) => window.__cleanupQA.platformDev.setRewardedOutcome(m), mode);

async function openLevel(page, drv, id) {
  for (let i = 0; i < 12; i++) {
    const s = await waitFor(page, (x) => x.buttons?.[`menu-level-${id}`]);
    if (s.buttons[`menu-level-${id}`].visible) break;
    await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(350);
  }
  await pressButton(page, drv, `menu-level-${id}`);
}

test('menu: logo, chests, five levels reachable by scrolling, no overlaps', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const drv = await boot(page, info);
  let s = await snap(page);
  await page.screenshot({ path: `${dirOf(info)}/01-menu.png` });
  const B = s.buttons;
  // header widgets never overlap each other, the counters or the gear
  const rects = ['menu-timed-chest', 'menu-progress-chest', 'menu-settings'].map((k) => [k, B[k]]);
  const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(overlap(rects[i][1], rects[j][1]), `${rects[i][0]} × ${rects[j][0]}`).toBe(false);
  // all five levels: visible now or after scrolling with the real gesture (touch drag / wheel)
  const ids = ['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker'];
  const seen = new Set();
  for (let k = 0; k < 8 && seen.size < 5; k++) {
    s = await snap(page);
    for (const id of ids) if (s.buttons[`menu-level-${id}`]?.visible) seen.add(id);
    if (info.project.name.includes('touch')) {
      await drv.down(s.layout.W / 2, s.layout.H * 0.75);
      for (let t = 1; t <= 8; t++) await drv.move(s.layout.W / 2, s.layout.H * (0.75 - 0.04 * t));
      await drv.up();
    } else {
      await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
      await page.mouse.wheel(0, 260);
    }
    await page.waitForTimeout(450);
  }
  expect([...seen].sort()).toEqual([...ids].sort());
  await page.screenshot({ path: `${dirOf(info)}/02-menu-scrolled.png` });
  // timed chest counts down
  const t0 = (await snap(page)).rewards.timedChest.remainingMs;
  await page.waitForTimeout(2100);
  const t1 = (await snap(page)).rewards.timedChest.remainingMs;
  expect(t0 - t1).toBeGreaterThan(1500);
  console.log(`REWARDS ${info.project.name} menu: 5/5 levels reachable; timed chest ${Math.round(t0 / 1000)} s → ${Math.round(t1 / 1000)} s`);
  expect(errors).toEqual([]);
});

test('timed chest: not ready → ready → claim once → reset → persists after reload', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let drv = await boot(page, info);
  let s = await snap(page);
  expect(s.rewards.timedChest.ready).toBe(false);
  await pressButton(page, drv, 'menu-timed-chest'); // not ready: nothing
  await page.waitForTimeout(300);
  expect((await snap(page)).coins).toBe(0);
  await page.screenshot({ path: `${dirOf(info)}/03-timed-chest-countdown.png` });
  // make it due (saved timer in the past) and reload: the saved state is honoured
  await seed(page, 'st.timedChest = { readyAt: Date.now() - 1000 };');
  drv = await boot(page, info);
  s = await snap(page);
  expect(s.rewards.timedChest.ready).toBe(true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dirOf(info)}/04-timed-chest-ready.png` });
  const coins0 = s.coins;
  await doubleTap(page, drv, 'menu-timed-chest'); // second tap: already claimed
  await page.waitForTimeout(1400);
  s = await snap(page);
  const reward = 15;
  expect(s.coins).toBe(coins0 + reward);
  expect(s.rewards.timedChest.ready).toBe(false);
  expect(s.rewards.timedChest.remainingMs).toBeGreaterThan(290_000);
  await page.screenshot({ path: `${dirOf(info)}/05-timed-chest-claimed.png` });
  // reload: coins and the running timer persist (no reset to the first-launch delay)
  drv = await boot(page, info);
  s = await snap(page);
  expect(s.coins).toBe(coins0 + reward);
  expect(s.rewards.timedChest.remainingMs).toBeGreaterThan(285_000);
  console.log(`REWARDS ${info.project.name} timed chest: claimed +${reward} once, next in ${Math.round(s.rewards.timedChest.remainingMs / 1000)} s after reload`);
  expect(errors).toEqual([]);
});

test('result: normal reward, x3 cancel / fail / success once; level chest 60 % → 80 % → 100 %, offer, cancel, later, claim, reset', async ({ page }, info) => {
  test.setTimeout(420_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let drv = await boot(page, info);
  await seed(page, 'st.progressChest = { steps: 2, opened: 0 };');
  drv = await boot(page, info);
  // ---- level 1: rug → 60 % ----
  await openLevel(page, drv, 'rug');
  await playLevel5(page, drv);
  await page.waitForTimeout(2600); // coins flown, chest bar animated
  let s = await snap(page);
  const base = 15;
  expect(s.coins).toBe(base); // normal reward credited once on completion
  expect(s.rewards.progressChest.steps).toBe(3);
  expect(s.rewards.x3State).toBe('idle');
  await page.screenshot({ path: `${dirOf(info)}/06-result-x3-offer-chest-60.png` });
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await pressButton(page, drv, 'result-x3');
    await waitFor(page, (x) => x.rewards.x3State === 'idle' && !x.pause.reasons.includes('adBusy'), { label: `x3 ${mode} back to idle` });
    await page.waitForTimeout(200);
    expect((await snap(page)).coins).toBe(base);
    if (mode === 'not-earned') await page.screenshot({ path: `${dirOf(info)}/07-result-x3-cancelled.png` });
  }
  await setAd(page, 'earned');
  await doubleTap(page, drv, 'result-x3'); // repeated click while the ad runs
  await waitFor(page, (x) => x.rewards.x3State === 'granted', { label: 'x3 granted' });
  await page.waitForTimeout(1600);
  s = await snap(page);
  expect(s.coins).toBe(base * 3);
  expect(s.rewards.lastCompletion.x3).toBe(true);
  await page.screenshot({ path: `${dirOf(info)}/08-result-x3-claimed.png` });
  // ---- level 2: replay rug → 80 % (x3 not claimed: normal path only) ----
  await pressButton(page, drv, 'result-replay');
  await playLevel5(page, drv);
  await page.waitForTimeout(2600);
  s = await snap(page);
  expect(s.coins).toBe(base * 4);
  expect(s.rewards.progressChest.steps).toBe(4);
  await page.screenshot({ path: `${dirOf(info)}/09-result-chest-80.png` });
  // ---- level 3: replay → 100 % → chest offer ----
  await pressButton(page, drv, 'result-replay');
  await playLevel5(page, drv);
  await waitFor(page, (x) => x.rewards.chestOffer, { label: 'chest offer', timeout: 8000 });
  await page.waitForTimeout(600);
  s = await snap(page);
  expect(s.rewards.progressChest.full).toBe(true);
  await page.screenshot({ path: `${dirOf(info)}/10-chest-offer.png` });
  const coinsBefore = s.coins;
  // cancelled ad: nothing granted, chest stays full
  await setAd(page, 'not-earned');
  await pressButton(page, drv, 'chest-open');
  await waitFor(page, (x) => !x.pause.reasons.includes('adBusy') && x.rewards.chestOffer, { label: 'after cancelled chest ad' });
  await page.waitForTimeout(400);
  s = await snap(page);
  expect(s.coins).toBe(coinsBefore);
  expect(s.rewards.progressChest.full).toBe(true);
  // "Later": the offer closes, the chest stays at 100 % (bar shows Ready), reopen from the bar
  await page.waitForTimeout(1200);
  await pressButton(page, drv, 'chest-later');
  await page.waitForTimeout(500);
  s = await snap(page);
  expect(s.rewards.chestOffer).toBe(false);
  expect(s.rewards.progressChest.full).toBe(true);
  await page.screenshot({ path: `${dirOf(info)}/11-result-chest-100-ready.png` });
  // reload while full: still 100 % (not silently reset), claimable from the menu
  drv = await boot(page, info);
  s = await snap(page);
  expect(s.rewards.progressChest.full).toBe(true);
  await page.screenshot({ path: `${dirOf(info)}/12-menu-chest-ready.png` });
  await pressButton(page, drv, 'menu-progress-chest');
  await waitFor(page, (x) => x.rewards.chestOffer, { label: 'menu chest offer' });
  await setAd(page, 'earned');
  await doubleTap(page, drv, 'chest-open');
  await waitFor(page, (x) => !x.rewards.chestOffer && x.rewards.progressChest.steps === 0, { label: 'chest claimed', timeout: 10000 });
  await page.waitForTimeout(600);
  s = await snap(page);
  expect(s.coins).toBe(coinsBefore + 150);
  expect(s.rewards.diamonds).toBe(2);
  expect(s.rewards.opened).toBe(1);
  await page.screenshot({ path: `${dirOf(info)}/13-menu-chest-claimed.png` });
  drv = await boot(page, info);
  s = await snap(page);
  expect(s.rewards.progressChest.steps).toBe(0);
  expect(s.coins).toBe(coinsBefore + 150);
  console.log(`REWARDS ${info.project.name} result: base +${base}, x3 cancel/fail → +0, x3 success → ${base * 3} total once; chest 60→80→100 %, cancel keeps 100 %, Later keeps 100 % across reload, claim +150 coins +2 diamonds once, reset to 0 % (persisted)`);
  expect(errors).toEqual([]);
});
