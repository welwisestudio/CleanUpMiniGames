import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton, openFromMenu } from './helpers.js';

// Menu / Store polish (2026-10-13): no unlock popup — locked levels unlock straight from the card
// (coins when affordable, rewarded ad otherwise; VIP = ad); VIP glow / rays; yellow name labels;
// objects on the shelf line; Store title never overlaps the counters at any width.
// Screenshots: project/screenshots/menu-polish/<project>/
const KEY = 'cleanup-dev-save';
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/menu-polish/${info.project.name}/${name}.png` });
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;

test('locked levels unlock straight from the card: coins, ad when short, VIP ad only — no popup', async ({ page }, info) => {
  test.setTimeout(300_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&locks=1');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto('/?qa=1&locks=1');
  await waitFor(page, (x) => x.scene === 'Menu');
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) || '{}'), coins: 100 })), KEY);
  await page.goto('/?qa=1&locks=1&devAd=not-earned');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  await page.waitForTimeout(500);
  await shot(page, info, 'menu-top');
  // coins: rug (40) with 100 → bought on tap, stays in the menu, card now open
  await pressButton(page, drv, 'menu-level-rug');
  let s = await waitFor(page, (x) => x.scene === 'Menu' && x.progression?.purchased?.includes('rug') && x.buttons?.['menu-level-rug']?.state === 'open', { label: 'rug bought' });
  expect(s.coins).toBe(60);
  // short of coins: bathroom sink (90) → ad straight from the card; cancel keeps it locked
  await openFromMenu(page, drv, 'bathroom-sink');
  await page.waitForTimeout(900);
  s = await snap(page);
  expect(s.scene).toBe('Menu');
  expect(s.progression.adUnlocked).toEqual([]);
  await setAd(page, 'earned');
  await openFromMenu(page, drv, 'bathroom-sink');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.progression?.adUnlocked?.includes('bathroom-sink'), { label: 'sink by ad' });
  expect(s.coins).toBe(60);
  // VIP: ad only
  await openFromMenu(page, drv, 'porcelain-vase');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.progression?.vipAds?.includes('porcelain-vase'), { label: 'vip by ad' });
  expect(s.coins).toBe(60);
  await page.waitForTimeout(600);
  await shot(page, info, 'menu-vip-unlocked');
  await openFromMenu(page, drv, 'vintage-motorcycle').catch(() => {});
  await page.waitForTimeout(200);
  await setAd(page, 'not-earned');
  await page.goto('/?qa=1&locks=1&devAd=not-earned');
  await waitFor(page, (x) => x.scene === 'Menu');
  // scroll to the locked VIP motorcycle for a look (tap with a failing ad: stays locked)
  await openFromMenu(page, drv, 'vintage-motorcycle');
  await page.waitForTimeout(700);
  s = await snap(page);
  expect(s.scene).toBe('Menu');
  await shot(page, info, 'menu-vip-locked');
});

test('store title never overlaps the counters while resizing', async ({ page }, info) => {
  test.skip(info.project.name.includes('touch'), 'resize sweep on desktop');
  test.setTimeout(120_000);
  const drv = mouseDriver(page);
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-store']);
  await pressButton(page, drv, 'menu-store');
  for (const [w, h] of [[1280, 800], [900, 700], [700, 700], [600, 800], [520, 800], [480, 800], [420, 800], [360, 740], [320, 640]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(450);
    const s = await waitFor(page, (x) => x.store && x.buttons?.['store-title']);
    const t = s.buttons['store-title'];
    for (const c of ['store-counter-coins', 'store-counter-gems', 'store-close']) expect(overlap(t, s.buttons[c]), `${w}x${h}: title × ${c}`).toBe(false);
    expect(overlap(s.buttons['store-counter-gems'], s.buttons['store-close']), `${w}x${h}: gems × close`).toBe(false);
    if ([700, 520, 360].includes(w)) await shot(page, info, `store-${w}`);
  }
});

test('unaffordable tool variant: only the bottom [ad] Free row, no corner badge', async ({ page }, info) => {
  test.setTimeout(400_000);
  const { playStage5 } = await import('./level-play.js');
  const drv = await driver(page, info);
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  await pressButton(page, drv, 'menu-level-rug');
  let s;
  for (let i = 0; i < 6; i++) {
    s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
    if (s.level.stageId === 'foam-spray') break;
    await playStage5(page, drv);
  }
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  expect(s.level.toolCards.find((c) => c.tool === 'foam-gun').adFallback).toBe(true);
  await page.waitForTimeout(400);
  const cs = s.level.toolCards;
  const x0 = Math.min(...cs.map((c) => c.x - c.w / 2)) - 10;
  const y0 = Math.min(...cs.map((c) => c.y - c.h / 2)) - 10;
  const x1 = Math.max(...cs.map((c) => c.x + c.w / 2)) + 10;
  const y1 = Math.max(...cs.map((c) => c.y + c.h / 2)) + 10;
  await page.screenshot({ path: `project/screenshots/menu-polish/${info.project.name}/tool-cards.png`, clip: { x: Math.max(0, x0), y: Math.max(0, y0), width: x1 - Math.max(0, x0), height: y1 - Math.max(0, y0) } });
});
