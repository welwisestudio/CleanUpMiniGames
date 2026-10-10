import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton, openFromMenu } from './helpers.js';

// Focused fixes (2026-10-11): VIP "not enough diamonds" shake never drifts; Wheel close button in the
// screen's top-right corner on desktop; Settings without vibration. Screenshots: project/screenshots/fixes/<project>/
const KEY = 'cleanup-dev-save';
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/fixes/${info.project.name}/${name}.png` });
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;

test('VIP offer: spam with too few diamonds never moves the dialog', async ({ page }, info) => {
  test.setTimeout(200_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&locks=1');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto('/?qa=1&locks=1');
  await waitFor(page, (x) => x.scene === 'Menu');
  await openFromMenu(page, drv, 'royal-throne');
  let s = await waitFor(page, (x) => x.levelOffer && x.buttons?.['level-offer-confirm']?.visible, { label: 'VIP offer' });
  const base = s.levelOfferX;
  expect(Math.abs(base - s.layout.W / 2)).toBeLessThan(1);
  const b = s.buttons['level-offer-confirm'];
  for (let i = 0; i < 25; i++) await drv.tap(b.x, b.y);
  await page.waitForTimeout(800);
  s = await snap(page);
  expect(s.levelOfferX).toBeCloseTo(base, 3);
  expect(s.rewards.diamonds).toBe(0);
  expect(s.progression.vip).toEqual([]);
  await shot(page, info, 'vip-after-spam');
});

test('Wheel close button: top-right corner on desktop, unchanged on phone; closes the wheel', async ({ page }, info) => {
  test.setTimeout(120_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-wheel']);
  await pressButton(page, drv, 'menu-wheel');
  const s = await waitFor(page, (x) => x.wheel && x.buttons?.['wheel-close']?.visible && x.buttons?.['wheel-spin']?.visible);
  await page.waitForTimeout(300);
  const c = s.buttons['wheel-close'];
  expect(c.w).toBeGreaterThanOrEqual(44);
  if (!info.project.name.includes('touch')) {
    expect(c.x).toBeGreaterThan(s.layout.W - 90);
    expect(c.y).toBeLessThan(90);
    expect(overlap(c, s.buttons['wheel-spin'])).toBe(false);
  }
  await shot(page, info, 'wheel-close');
  await pressButton(page, drv, 'wheel-close');
  await waitFor(page, (x) => !x.wheel, { label: 'wheel closed' });
});

test('Settings: no vibration row', async ({ page }, info) => {
  test.setTimeout(120_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-settings']);
  await pressButton(page, drv, 'menu-settings');
  const s = await waitFor(page, (x) => x.buttons?.['settings-close']?.visible && x.buttons?.['settings-sound']);
  expect(s.buttons['settings-music']).toBeTruthy();
  expect(s.buttons['settings-vibration']).toBeUndefined();
  await page.waitForTimeout(300);
  await shot(page, info, 'settings');
});
