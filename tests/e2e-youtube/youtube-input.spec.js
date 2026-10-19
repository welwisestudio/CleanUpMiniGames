import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { waitFor, mouseDriver, touchDriver, snap, pressButton } from '../e2e/helpers.js';

// YouTube host-pause input gate (2026-10-19), mock SDK, YouTube CSP, mock-test build (dist-youtube-qa):
// nothing done while YouTube has the game paused (or an ad runs) may act — not during the pause and
// not after resume. Real mouse / touch input on desktop and phone.
const QA = 'http://127.0.0.1:4175';
const MOCK = fs.readFileSync(new URL('./mock-sdk.js', import.meta.url), 'utf8');
const SAVE = JSON.stringify({ version: 4, coins: 0, diamonds: 0, levels: {}, tutorial: { menuFirstLevel: true }, progression: { unlocked: [], purchased: [], adUnlocked: [], vipAds: [], vip: [], migrated: true, model: 3 } });
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));
const hostPause = (page) => page.evaluate(() => window.__ytMockCtl.pause());
const hostResume = (page) => page.evaluate(() => window.__ytMockCtl.resume());
const shot = (page, info, n) => page.screenshot({ path: `project/screenshots/youtube/${info.project.name}/input-${n}.png` });

async function boot(page, cfg = {}) {
  await page.addInitScript((c) => {
    window.__ytMockConfig = c;
    for (const k of ['localStorage', 'sessionStorage', 'indexedDB']) Object.defineProperty(window, k, { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
  }, { load: SAVE, ...cfg });
  await page.route('https://www.youtube.com/game_api/v1', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: MOCK }));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${QA}/?qa=1`);
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball'] && x.buttons?.['menu-store'], { timeout: 30000 });
  return errors;
}

// every kind of input over the menu: buttons, a level card, the wheel CTA, a drag-scroll, the wheel
async function spamMenu(page, drv, s) {
  const b = s.buttons;
  for (let i = 0; i < 3; i++) {
    for (const id of ['menu-store', 'menu-settings', 'menu-wheel', 'menu-level-soccer-ball', 'menu-level-rug']) if (b[id]) await drv.tap(b[id].x, b[id].y);
  }
  const x = s.layout.W / 2;
  await drv.down(x, s.layout.H * 0.8);
  for (let k = 1; k <= 8; k++) await drv.move(x, s.layout.H * 0.8 - k * 40);
  await drv.up();
  if (drv.kind === 'mouse') {
    await page.mouse.move(x, s.layout.H * 0.6);
    await page.mouse.wheel(0, 900);
  }
}

test('menu: everything tapped / dragged / scrolled during a host pause is discarded; only new input after resume works', async ({ page }, info) => {
  test.setTimeout(120_000);
  const drv = await driver(page, info);
  const errors = await boot(page);
  let s = await snap(page);
  const ballY = s.buttons['menu-level-soccer-ball'].y;
  await hostPause(page);
  s = await snap(page);
  expect(s.pause.reasons).toContain('host');
  expect(s.inputEnabled).toBe(false);
  await spamMenu(page, drv, s);
  await shot(page, info, 'menu-during-pause');
  await hostResume(page);
  await page.waitForTimeout(1000);
  s = await snap(page);
  expect(s.inputEnabled).toBe(true);
  expect([s.scene, s.store, s.wheel, s.settingsOpen]).toEqual(['Menu', null, null, false]); // no window, no level
  expect(Math.abs(s.buttons['menu-level-soccer-ball'].y - ballY)).toBeLessThan(1); // no scroll jump
  expect(s.progression.adUnlocked).toEqual([]); // the locked card's ad never started
  // a NEW tap after resume works
  await pressButton(page, drv, 'menu-store');
  await waitFor(page, (x) => x.store, { label: 'store opens on a new tap' });
  expect(errors).toEqual([]);
});

test('held input: a press that began before the pause, released after resume, does nothing', async ({ page }, info) => {
  test.setTimeout(120_000);
  const drv = await driver(page, info);
  await boot(page);
  let s = await snap(page);
  const st = s.buttons['menu-store'];
  await drv.down(st.x, st.y);
  await hostPause(page);
  await page.waitForTimeout(200);
  await hostResume(page);
  await page.waitForTimeout(200);
  await drv.up();
  await page.waitForTimeout(800);
  s = await snap(page);
  expect(s.store).toBe(null);
  // a scroll drag held across the pause does not keep scrolling afterwards
  const y0 = s.buttons['menu-level-soccer-ball'].y;
  const x = s.layout.W / 2;
  await drv.down(x, s.layout.H * 0.8);
  await drv.move(x, s.layout.H * 0.78);
  await hostPause(page);
  await hostResume(page);
  for (let k = 1; k <= 6; k++) await drv.move(x, s.layout.H * 0.78 - k * 40);
  await drv.up();
  await page.waitForTimeout(600);
  s = await snap(page);
  expect(Math.abs(s.buttons['menu-level-soccer-ball'].y - y0)).toBeLessThan(25); // at most the 2 % before the pause
});

test('level: a stroke cut by a host pause stops; drags during the pause clean nothing; the player pause menu survives host pause / resume', async ({ page }, info) => {
  test.setTimeout(180_000);
  const drv = await driver(page, info);
  await boot(page);
  await pressButton(page, drv, 'menu-level-soccer-ball');
  let s = await waitFor(page, (x) => x.level?.state === 'playing' && x.level.object, { timeout: 30000 });
  const o = s.level.object;
  // pause during a drag over the object
  await drv.down(o.x - o.radius * 0.4, o.y);
  await drv.move(o.x - o.radius * 0.2, o.y);
  await hostPause(page);
  const p0 = (await snap(page)).level.progress;
  for (let k = 0; k < 20; k++) await drv.move(o.x + Math.sin(k) * o.radius * 0.6, o.y + Math.cos(k) * o.radius * 0.5); // dragging during the pause
  await drv.up();
  for (let k = 0; k < 6; k++) await drv.tap(o.x + (k - 3) * 20, o.y); // tapping during the pause
  for (let k = 0; k < 3; k++) {
    // full drags made during the pause
    await drv.down(o.x - o.radius * 0.5, o.y - o.radius * 0.3 + k * 20);
    for (let j = 1; j <= 6; j++) await drv.move(o.x - o.radius * 0.5 + j * o.radius * 0.17, o.y - o.radius * 0.3 + k * 20);
    await drv.up();
  }
  await hostResume(page);
  await page.waitForTimeout(500);
  s = await snap(page);
  expect(s.level.progress).toBe(p0);
  // a press held from before the pause: after resume its moves clean nothing (a NEW press is needed)
  await drv.down(o.x - o.radius * 0.3, o.y);
  await hostPause(page);
  await hostResume(page);
  for (let k = 0; k < 10; k++) await drv.move(o.x + Math.sin(k) * o.radius * 0.5, o.y);
  await drv.up();
  await page.waitForTimeout(400);
  expect((await snap(page)).level.progress).toBe(p0);
  // player pause open → host pause → spam its buttons → host resume: still paused by the player
  await pressButton(page, drv, 'hud-pause');
  s = await waitFor(page, (x) => x.buttons?.['pause-menu'] && x.pause.reasons.includes('user'));
  await hostPause(page);
  for (const id of ['pause-resume', 'pause-menu', 'pause-restart']) await drv.tap(s.buttons[id].x, s.buttons[id].y);
  await hostResume(page);
  await page.waitForTimeout(800);
  s = await snap(page);
  expect(s.scene).toBe('Level');
  expect(s.pauseModal).toBe(true);
  expect(s.pause.reasons).toEqual(['user']);
  await shot(page, info, 'player-pause-kept');
  await pressButton(page, drv, 'pause-resume'); // a new tap after resume
  s = await waitFor(page, (x) => x.pause.reasons.length === 0 && !x.pauseModal, { label: 'player resumes with a new tap' });
});

test('rewarded ad: input is blocked while the ad runs; nothing clicks through after it closes', async ({ page }, info) => {
  test.setTimeout(120_000);
  const drv = await driver(page, info);
  await boot(page, { adHold: true });
  let s = await snap(page);
  // the rug (40 coins, the player has 0) → its card plays the rewarded ad
  await drv.tap(s.buttons['menu-level-rug'].x, s.buttons['menu-level-rug'].y);
  await page.waitForFunction(() => (window.__ytLog ?? []).some((x) => x.e === 'requestRewardedAd'), null, { timeout: 10000 });
  s = await snap(page);
  expect(s.pause.reasons).toContain('adBusy');
  expect(s.inputEnabled).toBe(false);
  await spamMenu(page, drv, s); // taps on Store / Settings / Wheel / cards while the ad is up
  await page.evaluate(() => window.__ytMockCtl.finishAd());
  await page.waitForTimeout(1500);
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-store']);
  expect([s.store, s.wheel, s.settingsOpen]).toEqual([null, null, false]);
  expect(s.progression.adUnlocked).toEqual(['rug']); // the ad's own result still counts
  expect(s.inputEnabled).toBe(true);
});
