import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton, openFromMenu } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Level access (2026-10-10), real mouse / touch, persistent dev save, access ON (`locks=1`):
// fresh save → only level 1; completing a level opens the next (Next button); a locked normal
// level offers a rewarded ad for THAT level (cancel / fail → locked, success → open, the levels in
// between stay locked); completing it opens its next; reload keeps everything; VIP 46 cannot be
// opened by ad, needs diamonds (insufficient → nothing), purchase persists; completed levels replay.
// Screenshots: project/screenshots/progression/<project>/<name>.png
const KEY = 'cleanup-dev-save';
const URL = '/?qa=1&locks=1';
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/progression/${info.project.name}/${name}.png` });
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);
const state = (s, id) => s.buttons[`menu-level-${id}`]?.state;

async function seed(page, src) {
  await page.evaluate(({ KEY, src }) => {
    const st = JSON.parse(localStorage.getItem(KEY) || '{}');
    // eslint-disable-next-line no-new-func
    new Function('st', src)(st);
    localStorage.setItem(KEY, JSON.stringify(st));
  }, { KEY, src });
}

async function menu(page) {
  await page.goto(URL);
  return waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball'], { label: 'menu' });
}

test('level access: progression, ad jump, VIP, persistence', async ({ page }, info) => {
  test.setTimeout(900_000);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.evaluate((k) => localStorage.removeItem(k), KEY);

  // 1. fresh save: only level 1
  let s = await menu(page);
  expect(s.progression.devUnlockAll).toBe(false);
  expect(state(s, 'soccer-ball')).toBe('open');
  expect(state(s, 'rug')).toBe('locked');
  expect(state(s, 'royal-throne')).toBe('vip');
  await page.waitForTimeout(400);
  await shot(page, info, '01-fresh-menu');

  // 2. complete level 1 → level 2 opens; Next goes straight to it
  await pressButton(page, drv, 'menu-level-soccer-ball');
  await playLevel5(page, drv);
  s = await waitFor(page, (x) => x.level?.state === 'result' && x.buttons?.['result-next']?.visible, { label: 'result', timeout: 15000 });
  expect(s.progression.unlocked).toContain('rug');
  await page.waitForTimeout(1500);
  await pressButton(page, drv, 'result-next');
  await waitFor(page, (x) => x.level?.id === 'rug' && x.level.state === 'playing', { label: 'Next → level 2', timeout: 30000 });

  // 3–6. locked normal level 10 → rewarded-ad offer: cancel, failure, success
  s = await menu(page);
  expect(state(s, 'rug')).toBe('open');
  expect(state(s, 'bathroom-sink')).toBe('locked');
  await setAd(page, 'not-earned');
  await openFromMenu(page, drv, 'bathroom-sink');
  s = await waitFor(page, (x) => x.levelOffer && x.buttons?.['level-offer-confirm']?.visible, { label: 'ad offer' });
  await shot(page, info, '03-ad-offer');
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await pressButton(page, drv, 'level-offer-confirm');
    s = await waitFor(page, (x) => x.buttons?.['level-offer-confirm']?.visible, { label: `offer after ${mode}` });
    expect(s.scene).toBe('Menu');
    expect(s.progression.adUnlocked).toEqual([]);
  }
  await pressButton(page, drv, 'level-offer-cancel');
  s = await waitFor(page, (x) => !x.levelOffer);
  await shot(page, info, '02-locked-normal');
  await setAd(page, 'earned');
  await openFromMenu(page, drv, 'bathroom-sink');
  await waitFor(page, (x) => x.levelOffer && x.buttons?.['level-offer-confirm']?.visible);
  await pressButton(page, drv, 'level-offer-confirm');
  s = await waitFor(page, (x) => x.level?.id === 'bathroom-sink' && x.level.state === 'playing', { label: 'level 10 opened', timeout: 30000 });
  expect(s.progression.adUnlocked).toEqual(['bathroom-sink']);
  expect(s.levels['bathroom-sink']).toBeUndefined(); // not completed

  // 7. complete level 10 → level 11 opens (Next)
  await playLevel5(page, drv);
  s = await waitFor(page, (x) => x.level?.state === 'result' && x.buttons?.['result-next']?.visible, { label: 'result 10', timeout: 15000 });
  expect(s.progression.unlocked).toContain('desk-fan');

  // 8. reload: everything persists; the levels in between stay locked
  s = await menu(page);
  expect(state(s, 'soccer-ball')).toBe('completed');
  expect(state(s, 'rug')).toBe('open');
  expect(state(s, 'golden-trophy')).toBe('locked');
  expect(state(s, 'toolbox')).toBe('locked');
  expect(state(s, 'bathroom-sink')).toBe('completed');
  expect(state(s, 'desk-fan')).toBe('open');

  // 9. VIP 46: no ad, not enough diamonds → nothing
  await seed(page, 'st.diamonds = 2;');
  s = await menu(page);
  const ads = await page.evaluate(() => window.__cleanupQA.platformDev.rewardedLog?.length ?? 0);
  await openFromMenu(page, drv, 'royal-throne');
  s = await waitFor(page, (x) => x.levelOffer && x.buttons?.['level-offer-confirm']?.visible, { label: 'VIP offer' });
  await shot(page, info, '05-vip-offer');
  await pressButton(page, drv, 'level-offer-confirm');
  await page.waitForTimeout(400);
  s = await snap(page);
  expect(s.scene).toBe('Menu');
  expect(s.rewards.diamonds).toBe(2);
  expect(s.progression.vip).toEqual([]);
  expect(await page.evaluate(() => window.__cleanupQA.platformDev.rewardedLog?.length ?? 0)).toBe(ads); // no ad for VIP
  await shot(page, info, '06-vip-not-enough');
  await pressButton(page, drv, 'level-offer-cancel');
  await waitFor(page, (x) => !x.levelOffer);
  await shot(page, info, '04-vip-locked');

  // VIP purchase with enough diamonds → charged once, opens; persists after reload
  await seed(page, 'st.diamonds = 10;');
  s = await menu(page);
  await openFromMenu(page, drv, 'royal-throne');
  await waitFor(page, (x) => x.levelOffer && x.buttons?.['level-offer-confirm']?.visible);
  await pressButton(page, drv, 'level-offer-confirm');
  s = await waitFor(page, (x) => x.level?.id === 'royal-throne' && x.level.state === 'playing', { label: 'VIP opened', timeout: 30000 });
  expect(s.rewards.diamonds).toBe(6);
  expect(s.progression.vip).toEqual(['royal-throne']);
  s = await menu(page);
  expect(state(s, 'royal-throne')).toBe('open');
  expect(state(s, 'stone-patio')).toBe('vip');

  // 11. a completed level is replayable
  await pressButton(page, drv, 'menu-level-soccer-ball');
  await waitFor(page, (x) => x.level?.id === 'soccer-ball' && x.level.state === 'playing', { label: 'replay level 1', timeout: 30000 });
  expect(errors).toEqual([]);
});
