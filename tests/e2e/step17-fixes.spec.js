import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Focused fixes (2026-10-12 polish): soap / foam application visible again (batched painting kept);
// level-unlock card shows the price once; the unlock card opens automatically ONLY after
// Completion → Next on a locked next level (never after an exit / Home / reload); leaving an unfinished
// level via Pause → Menu always lands on a fully interactive menu; Store ad cards laid out in slots.
// Screenshots: project/screenshots/fixes2/<project>/
const KEY = 'cleanup-dev-save';
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/fixes2/${info.project.name}/${name}.png` });
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));

async function seed(page, src) {
  await page.evaluate(({ KEY, src }) => {
    const st = JSON.parse(localStorage.getItem(KEY) || '{}');
    // eslint-disable-next-line no-new-func
    new Function('st', src)(st);
    localStorage.setItem(KEY, JSON.stringify(st));
  }, { KEY, src });
}

async function toStage(page, drv, id) {
  for (let i = 0; i < 8; i++) {
    const s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
    if (s.level.stageId === id) return s;
    await playStage5(page, drv);
  }
  throw new Error(`stage ${id} not reached`);
}

// the menu stays free of popups for a while and reacts to input (opens / closes the Wheel)
async function menuIsClean(page, drv, label) {
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-wheel'], { label: `menu (${label})` });
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(200);
    const s = await snap(page);
    expect(s.scene, label).toBe('Menu');
    expect(s.levelOffer, `${label}: no unlock popup`).toBe(false);
    expect(s.pause.reasons, `${label}: no stale pause`).toEqual([]);
  }
  await pressButton(page, drv, 'menu-wheel');
  await waitFor(page, (x) => x.wheel && x.buttons?.['wheel-close']?.visible, { label: `${label}: wheel opens` });
  await pressButton(page, drv, 'wheel-close');
  await waitFor(page, (x) => !x.wheel, { label: `${label}: wheel closes` });
}

async function exitViaPause(page, drv, level) {
  await openFromMenu(page, drv, level);
  await waitFor(page, (x) => x.level?.id === level && x.level.state === 'playing', { timeout: 30000 });
  await page.waitForTimeout(400);
  await pressButton(page, drv, 'hud-pause');
  await waitFor(page, (x) => x.buttons?.['pause-menu']?.visible, { label: 'pause modal' });
  await pressButton(page, drv, 'pause-menu');
}

test('soap / foam application is visible again (batched painting)', async ({ page }, info) => {
  test.setTimeout(400_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball']);
  await pressButton(page, drv, 'menu-level-soccer-ball');
  let s = await toStage(page, drv, 'foam-spray');
  await page.waitForTimeout(400);
  s = await snap(page);
  const L = s.level;
  const f = { x: L.xf.cx - L.tool.jet.x - L.tool.workOffset.x, y: L.xf.cy - L.tool.jet.y - L.tool.workOffset.y };
  await drv.down(f.x - 60, f.y);
  for (let i = 0; i < 30; i++) {
    await drv.move(f.x - 60 + i * 4, f.y + Math.sin(i / 3) * 30);
    await page.waitForTimeout(30);
  }
  s = await snap(page);
  expect(s.level.paintStats.batch).toBe(true);
  expect(s.level.progress).toBeGreaterThan(0.1);
  await shot(page, info, 'soap-foam-applied');
  await drv.up();
});

test('unlock card: price shown once (coins); not enough coins → ad state', async ({ page }, info) => {
  test.setTimeout(200_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&locks=1');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto('/?qa=1&locks=1');
  await waitFor(page, (x) => x.scene === 'Menu');
  await seed(page, 'st.coins = 300;');
  await page.goto('/?qa=1&locks=1');
  await openFromMenu(page, drv, 'toaster');
  await waitFor(page, (x) => x.levelOfferKind === 'coins' && x.buttons?.['level-offer-confirm']);
  await page.waitForTimeout(300);
  await shot(page, info, 'unlock-coins');
  await pressButton(page, drv, 'level-offer-cancel');
  await waitFor(page, (x) => !x.levelOffer);
  await openFromMenu(page, drv, 'vintage-car');
  await waitFor(page, (x) => x.levelOfferKind === 'ad' && x.buttons?.['level-offer-confirm']);
  await page.waitForTimeout(300);
  await shot(page, info, 'unlock-ad');
  await pressButton(page, drv, 'level-offer-cancel');
  await waitFor(page, (x) => !x.levelOffer);
});

test('navigation: unlock card only after Completion → Next; unfinished-level exits always return to a clean menu', async ({ page }, info) => {
  test.setTimeout(900_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&locks=1');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto('/?qa=1&locks=1');
  await waitFor(page, (x) => x.scene === 'Menu');
  // level 23 (Retro Radio) bought earlier, level 24 (Stone Lion) still locked; the rug is open too
  await seed(page, "st.coins = 0; st.progression = { unlocked: [], purchased: ['retro-radio', 'rug'], adUnlocked: [], vipAds: [], vip: [], migrated: true, model: 2 };");
  await page.goto('/?qa=1&locks=1&devAd=earned');
  // 1. complete level 23 → Next → the locked level 24 gets its unlock card
  await openFromMenu(page, drv, 'retro-radio');
  for (let i = 0; i < 12; i++) {
    const s = await waitFor(page, (x) => x.level && (x.level.state === 'playing' || x.level.state === 'result'), { timeout: 30000 });
    if (s.level.state === 'result') break;
    await playStage5(page, drv);
  }
  await waitFor(page, (x) => x.buttons?.['result-next']?.visible, { label: 'result card', timeout: 20000 });
  await page.waitForTimeout(1500);
  await pressButton(page, drv, 'result-next');
  let s = await waitFor(page, (x) => x.scene === 'Menu' && x.levelOffer, { label: 'unlock card after Next', timeout: 20000 });
  expect(s.levelOfferKind).toBe('ad'); // 0 coins + 60 for the radio < 250
  await page.waitForTimeout(300);
  await shot(page, info, 'nav-1-next-unlock-card');
  // 2. close it → the menu works
  await pressButton(page, drv, 'level-offer-cancel');
  await menuIsClean(page, drv, 'after closing the card');
  // 3./4. unfinished levels: Pause → Menu, several times / levels → never the card, menu interactive
  for (const level of ['soccer-ball', 'rug', 'retro-radio', 'soccer-ball']) {
    await exitViaPause(page, drv, level);
    await menuIsClean(page, drv, `exit from ${level}`);
  }
  // reload: no card either
  await page.goto('/?qa=1&locks=1');
  await menuIsClean(page, drv, 'reload');
  s = await snap(page);
  expect(s.progression.purchased.sort()).toEqual(['retro-radio', 'rug']); // exits changed nothing
  expect(s.levels['retro-radio'].completed).toBe(true);
  await shot(page, info, 'nav-2-menu-clean');
});

test('store: ad cards laid out in aligned slots', async ({ page }, info) => {
  test.setTimeout(120_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-store']);
  await pressButton(page, drv, 'menu-store');
  const s = await waitFor(page, (x) => x.store && x.buttons?.['store-free-coins'] && x.buttons?.['store-coins-1200']);
  await page.waitForTimeout(400);
  const ids = ['store-free-coins', 'store-coins-400', 'store-coins-1200'];
  const ys = ids.map((id) => s.buttons[id].y);
  const hs = ids.map((id) => s.buttons[id].h);
  expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1); // buttons on one line
  expect(Math.max(...hs) - Math.min(...hs)).toBeLessThan(1);
  await shot(page, info, 'store-top');
});
