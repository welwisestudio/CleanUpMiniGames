import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { waitFor, mouseDriver, touchDriver, snap, pressButton } from '../e2e/helpers.js';

// Post-rewarded-ad flow (2026-10-19), mock SDK, mock-test build (dist-youtube-qa), YouTube CSP.
// YouTube hands the game back (host resume) BEFORE the rewarded promise resolves; the game must be
// usable at once, only the CTA that asked stays protected ("Finishing…"), the reward comes once on
// true, nothing on false / reject / timeout, and a slow cloud save never blocks the UI.
const QA = 'http://127.0.0.1:4175';
const MOCK = fs.readFileSync(new URL('./mock-sdk.js', import.meta.url), 'utf8');
const SAVE = JSON.stringify({ version: 4, coins: 0, diamonds: 0, levels: {}, tutorial: { menuFirstLevel: true }, progression: { unlocked: [], purchased: [], adUnlocked: [], vipAds: [], vip: [], migrated: true, model: 3 } });
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));
const ctl = (page, fn, arg) => page.evaluate(([f, a]) => window.__ytMockCtl[f](a), [fn, arg]);
const adCount = (page) => page.evaluate(() => (window.__ytLog ?? []).filter((x) => x.e === 'requestRewardedAd').length);

async function boot(page, cfg = {}) {
  await page.addInitScript((c) => {
    window.__ytMockConfig = c;
    for (const k of ['localStorage', 'sessionStorage', 'indexedDB']) Object.defineProperty(window, k, { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
  }, { load: SAVE, adHold: true, ...cfg });
  await page.route('https://www.youtube.com/game_api/v1', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: MOCK }));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${QA}/?qa=1`);
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug'] && x.buttons?.['menu-store'], { timeout: 30000 });
  return errors;
}

// rewarded level unlock from the rug card (40 coins, the player has 0) → the ad starts, YouTube pauses
async function startAd(page, drv) {
  const s = await snap(page);
  await drv.tap(s.buttons['menu-level-rug'].x, s.buttons['menu-level-rug'].y);
  await page.waitForFunction(() => (window.__ytLog ?? []).some((x) => x.e === 'requestRewardedAd'), null, { timeout: 10000 });
  await ctl(page, 'pause');
}

test('timing probe: host resume 1.5 s into the ad, SDK result 2 s after the resume, 1.5 s cloud save', async ({ page }, info) => {
  test.skip(info.project.name.includes('touch'), 'timing probe once');
  test.setTimeout(60_000);
  const drv = await driver(page, info);
  await boot(page, { saveDelayMs: 1500 });
  await startAd(page, drv);
  await page.waitForTimeout(1500);
  const t0 = Date.now();
  await ctl(page, 'resume');
  let responsive = null;
  let rewarded = null;
  let finished = false;
  for (let i = 0; i < 400; i++) {
    const s = await snap(page);
    const dt = Date.now() - t0;
    if (responsive == null && s.inputEnabled && s.pause.reasons.length === 0) responsive = dt;
    if (!finished && dt >= 2000) {
      finished = true;
      await ctl(page, 'finishAd', true);
    }
    if (rewarded == null && s.progression?.adUnlocked?.includes('rug') && s.scene === 'Menu' && s.buttons?.['menu-level-rug']?.state === 'open') rewarded = dt;
    if (responsive != null && rewarded != null) break;
    await page.waitForTimeout(25);
  }
  const s = await snap(page);
  console.log('TIMING after host resume:', JSON.stringify({ build: s.build.number, responsiveMs: responsive, rewardShownMs: rewarded, trace: s.adTrace ?? null }));
});

test('host resume before the result: the game is usable at once, only the CTA waits ("Finishing…"); reward once on true', async ({ page }, info) => {
  test.setTimeout(90_000);
  const drv = await driver(page, info);
  const errors = await boot(page, { saveDelayMs: 2500 });
  await startAd(page, drv);
  let s = await snap(page);
  expect(s.inputEnabled).toBe(false); // the ad is open: everything gated
  await ctl(page, 'resume');
  s = await snap(page);
  expect(s.inputEnabled).toBe(true); // immediately on host resume
  expect(s.pause.reasons).toEqual([]);
  expect(s.adPhase).toMatchObject({ state: 'finishing' });
  // only the originating CTA is protected: a second tap on it starts no second ad …
  await drv.tap(s.buttons['menu-level-rug'].x, s.buttons['menu-level-rug'].y);
  await page.waitForTimeout(300);
  expect(await adCount(page)).toBe(1);
  // … while unrelated UI works (the Store opens and closes)
  await pressButton(page, drv, 'menu-store');
  s = await waitFor(page, (x) => x.store, { label: 'store opens while finishing', timeout: 5000 });
  await pressButton(page, drv, 'store-close').catch(() => {});
  await page.waitForTimeout(600);
  const doneBefore = await page.evaluate(() => (window.__ytLog ?? []).filter((x) => x.e === 'saveDataDone').length);
  const tFinish = Date.now();
  await ctl(page, 'finishAd', true); // the SDK result comes ~1 s after the resume
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.progression?.adUnlocked?.includes('rug') && x.adPhase === null && x.buttons?.['menu-level-rug']?.state === 'open', { label: 'reward applied', timeout: 5000 });
  const shownMs = Date.now() - tFinish;
  console.log('REWARD shown', shownMs, 'ms after the SDK result (cloud save 2500 ms)', JSON.stringify(s.adTrace.slice(-8)), JSON.stringify(await page.evaluate(() => (window.__ytLog ?? []).filter((x) => /Rewarded|saveData/.test(x.e)).map((x) => [x.e, x.t]))));
  expect(shownMs).toBeLessThan(1500); // the UI did not wait for the 2.5 s cloud save …
  expect(s.progression.adUnlocked).toEqual(['rug']);
  await page.waitForFunction((n) => (window.__ytLog ?? []).filter((x) => x.e === 'saveDataDone').length > n, doneBefore, { timeout: 8000 });
  expect(await adCount(page)).toBe(1);
  expect(errors).toEqual([]);
});

for (const outcome of ['false', 'reject']) {
  test(`result ${outcome}: no reward; the game and the CTA recover`, async ({ page }, info) => {
    test.setTimeout(60_000);
    const drv = await driver(page, info);
    await boot(page);
    await startAd(page, drv);
    await page.waitForTimeout(300);
    await ctl(page, 'resume');
    await page.waitForTimeout(1500);
    if (outcome === 'false') await ctl(page, 'finishAd', false);
    else await ctl(page, 'rejectAd');
    const s = await waitFor(page, (x) => x.adPhase === null && x.inputEnabled, { timeout: 5000 });
    expect(s.progression.adUnlocked).toEqual([]);
    expect(s.pause.reasons).toEqual([]);
  });
}

test('stuck result: the CTA recovers after the timeout, no reward; a late "true" is ignored', async ({ page }, info) => {
  test.skip(info.project.name.includes('touch'), 'timeout once');
  test.setTimeout(60_000);
  const drv = await driver(page, info);
  await boot(page);
  await startAd(page, drv);
  await ctl(page, 'resume');
  let s = await snap(page);
  expect(s.inputEnabled).toBe(true);
  s = await waitFor(page, (x) => x.adPhase === null, { label: 'timeout recovery', timeout: 12000 });
  expect(s.progression.adUnlocked).toEqual([]);
  expect(s.adTrace.some((x) => x.e === 'rewarded-timeout-after-resume')).toBe(true);
  await ctl(page, 'finishAd', true); // too late
  await page.waitForTimeout(800);
  s = await snap(page);
  expect(s.progression.adUnlocked).toEqual([]);
});

test('Store reward: same clean flow (resume → usable at once, +25 gems once on true)', async ({ page }, info) => {
  test.setTimeout(60_000);
  const drv = await driver(page, info);
  await boot(page, { saveDelayMs: 2000 });
  await pressButton(page, drv, 'menu-store');
  await waitFor(page, (x) => x.store && x.buttons?.['store-free-gems']);
  await pressButton(page, drv, 'store-free-gems');
  await page.waitForFunction(() => (window.__ytLog ?? []).some((x) => x.e === 'requestRewardedAd'), null, { timeout: 10000 });
  await ctl(page, 'pause');
  await ctl(page, 'resume');
  let s = await snap(page);
  expect([s.inputEnabled, s.pause.reasons.length, s.adPhase?.state]).toEqual([true, 0, 'finishing']);
  await page.waitForTimeout(800);
  await ctl(page, 'finishAd', true);
  s = await waitFor(page, (x) => x.adPhase === null && x.rewards?.diamonds === 25, { label: '+25 gems', timeout: 5000 });
  expect(s.rewards.diamonds).toBe(25);
});
