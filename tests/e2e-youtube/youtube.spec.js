import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { waitFor, mouseDriver, touchDriver, snap, pressButton } from '../e2e/helpers.js';

// YouTube Playables production checks with a MOCK SDK (Step 11). Everything runs on the production
// builds under the YouTube CSP header, with localStorage / sessionStorage / indexedDB blocked.
const RELEASE = 'http://127.0.0.1:4174';
const QA = 'http://127.0.0.1:4175';
const MOCK = fs.readFileSync(new URL('./mock-sdk.js', import.meta.url), 'utf8');
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/youtube/${info.project.name}/${name}.png` });
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));
const ytLog = (page) => page.evaluate(() => window.__ytLog ?? []);
const events = (log) => log.map((x) => x.e);

async function boot(page, base, cfg = {}, { noSdk = false } = {}) {
  await page.addInitScript((c) => {
    window.__ytMockConfig = c;
    window.__probe = { visibility: 0, csp: [], storageTouched: 0 };
    const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, ...rest) {
      if (/visibilitychange|pagehide|pageshow|freeze|resume/.test(type)) {
        // where it comes from: the first stack frame outside this probe
        const from = (new Error().stack.split('\n')[2] ?? '').trim();
        window.__probe.types = [...(window.__probe.types ?? []), `${this?.constructor?.name}:${type} ${from}`];
        if (!/kaspersky/i.test(from)) window.__probe.visibility += 1; // the test machine's antivirus injects its own script
      }
      return add.call(this, type, ...rest);
    };
    document.addEventListener('securitypolicyviolation', (e) => window.__probe.csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    // browser storages are unavailable (YouTube progress must never depend on them)
    for (const k of ['localStorage', 'sessionStorage', 'indexedDB']) {
      Object.defineProperty(window, k, {
        configurable: true,
        get() {
          window.__probe.storageTouched += 1;
          window.__probe.storageFrom = [...(window.__probe.storageFrom ?? []), `${k} ${(new Error().stack.split('\n')[2] ?? '').trim()}`];
          throw new DOMException('storage blocked by the test', 'SecurityError');
        },
      });
    }
  }, cfg);
  await page.route('https://www.youtube.com/game_api/v1', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: noSdk ? '/* SDK unavailable */' : MOCK }));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const res = await page.goto(`${base}/${base === QA ? '?qa=1' : ''}`);
  return { res, errors };
}

const gameReady = (page, timeout = 30000) => page.waitForFunction(() => (window.__ytLog ?? []).some((x) => x.e === 'gameReady'), null, { timeout });

test('release build: CSP, lexical SDK first, start order, cloud only, no Page Visibility, no dev hooks', async ({ page }, info) => {
  const { res, errors } = await boot(page, RELEASE, { load: '' });
  expect(res.headers()['content-security-policy']).toContain("default-src 'none'");
  // the built file itself (a local antivirus on the test machine injects its own <script> into HTTP responses)
  const html = fs.readFileSync(new URL('../../dist-youtube/index.html', import.meta.url), 'utf8');
  const firstScript = html.match(/<script[^>]*>/)[0];
  expect(firstScript).toContain('https://www.youtube.com/game_api/v1'); // SDK before any game code
  expect(html).not.toMatch(/<script(?![^>]*src=)[^>]*>/); // no inline scripts
  expect(html).not.toMatch(/<style/); // no inline styles
  await gameReady(page);
  await page.waitForTimeout(1500);
  const log = await ytLog(page);
  const order = events(log).filter((e) => ['firstFrameReady', 'loadData', 'gameReady'].includes(e));
  expect(order).toEqual(['firstFrameReady', 'loadData', 'gameReady']); // loading screen → cloud read → interactive menu
  const tLoad = log.find((x) => x.e === 'loadData').t;
  for (const s of log.filter((x) => x.e === 'saveData')) expect(s.t).toBeGreaterThanOrEqual(tLoad);
  const probe = await page.evaluate(() => ({ ...window.__probe, ytOnWindow: 'ytgame' in window, qa: typeof window.__cleanupQA, onblur: window.onblur, onfocus: window.onfocus }));
  expect(probe.ytOnWindow).toBe(false); // the mock SDK is a lexical global — the adapter still found it
  expect(probe.qa).toBe('undefined'); // no QA / dev hook in the release build
  console.log('LIFECYCLE LISTENERS', JSON.stringify(probe.types ?? []));
  expect(probe.visibility).toBe(0); // no Page Visibility (or lifecycle) listeners — the SDK owns pause / resume
  expect([probe.onblur, probe.onfocus]).toEqual([null, null]);
  expect(probe.csp.filter((v) => !/kaspersky/i.test(v))).toEqual([]); // nothing of the game blocked by the YouTube CSP
  expect(errors).toEqual([]);
  expect(events(log)).not.toContain('requestRewardedAd');
  expect(events(log)).not.toContain('sendScore'); // score metric not approved yet → nothing sent
  // initial bundle: every game file downloaded before gameReady (MUST < 30 MiB, SHOULD < 15 MiB)
  const tReady = log.find((x) => x.e === 'gameReady').t;
  const initial = await page.evaluate((t) => performance.getEntriesByType('resource').filter((r) => r.startTime <= t && r.name.startsWith(location.origin)).reduce((a, r) => a + (r.decodedBodySize || r.encodedBodySize || 0), 0), tReady);
  console.log('INITIAL BUNDLE bytes', initial);
  expect(initial).toBeLessThan(15 * 1024 * 1024);
  await shot(page, info, 'release-menu');
  console.log('START', JSON.stringify(log.map((x) => `${x.e}@${x.t}`)), 'storage probes', probe.storageTouched, JSON.stringify(probe.storageFrom ?? []));
});

test('release build: a failed cloud read shows Retry and never writes; Retry recovers', async ({ page }, info) => {
  const { errors } = await boot(page, RELEASE, { loadSequence: ['__reject__', '{"version":4,"coins":77,"diamonds":5}'] });
  await page.waitForFunction(() => document.getElementById('fatal')?.style.display === 'flex', null, { timeout: 30000 });
  await page.waitForTimeout(800);
  let log = await ytLog(page);
  expect(events(log)).not.toContain('saveData');
  expect(events(log)).not.toContain('gameReady');
  expect(await page.locator('#fatal').innerText()).toContain('Could not load your progress');
  await shot(page, info, 'release-load-error');
  await page.locator('#fatal button').click();
  await gameReady(page);
  await page.waitForTimeout(1200);
  log = await ytLog(page);
  const saves = log.filter((x) => x.e === 'saveData');
  for (const s of saves) expect(JSON.parse(s.data).coins).toBe(77); // the earned coins are kept, never a fresh save
  expect(errors).toEqual([]);
});

test('release build: corrupt or non-string cloud data blocks writes (Retry), SDK missing is its own error', async ({ page }) => {
  for (const load of ['{bad json', '__undefined__', '{"version":99}']) {
    await boot(page, RELEASE, { load });
    await page.waitForFunction(() => document.getElementById('fatal')?.style.display === 'flex', null, { timeout: 30000 });
    await page.waitForTimeout(600);
    const log = await ytLog(page);
    expect(events(log), load).not.toContain('saveData');
    expect(events(log), load).not.toContain('gameReady');
  }
  await boot(page, RELEASE, {}, { noSdk: true });
  await page.waitForFunction(() => document.getElementById('fatal')?.style.display === 'flex', null, { timeout: 30000 });
  expect(await page.locator('#fatal').innerText()).toContain('Could not connect to YouTube');
});

test('mock-test build: old save migrates; host pause freezes everything and flushes; resume keeps the player pause; YouTube mute wins', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  const old = JSON.stringify({ version: 3, coins: 321, diamonds: 17, levels: { 'soccer-ball': { completed: true, completions: 2 } }, tools: { owned: ['foam-gun'], equipped: { foam: 'foam-gun' } }, progression: { unlocked: ['rug'], adUnlocked: [], vip: ['vintage-car'], migrated: true } });
  await boot(page, QA, { load: old });
  await gameReady(page);
  let s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-wheel']);
  expect([s.coins, s.rewards.diamonds]).toEqual([321, 17]);
  expect(s.progression).toMatchObject({ model: 2, vip: [] });
  expect(s.progression.unlocked).toContain('vintage-car'); // bought VIP in v3 → stays open
  await drv.tap(s.layout.W / 2, s.layout.H * 0.95); // first gesture: web audio unlocked
  s = await waitFor(page, (x) => x.audio.musicPlaying === 1, { label: 'music' });
  // host pause: rendering / loop stops (canvas frozen), music stops, progress flushed
  const before = (await ytLog(page)).filter((x) => x.e === 'saveData').length;
  await page.evaluate(() => window.__ytMockCtl.pause());
  await page.waitForTimeout(300);
  s = await snap(page);
  expect(s.pause.reasons).toContain('host');
  expect(s.audio.musicPlaying).toBe(0);
  const a = await page.screenshot();
  await page.waitForTimeout(1500);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).toBe(0); // nothing animates while the host pauses (wheel wiggle, chest timer)
  const flushed = (await ytLog(page)).filter((x) => x.e === 'saveData');
  expect(flushed.length).toBeGreaterThan(before);
  expect(JSON.parse(flushed.at(-1).data)).toMatchObject({ version: 4, coins: 321 });
  await page.evaluate(() => window.__ytMockCtl.resume());
  s = await waitFor(page, (x) => !x.pause.reasons.includes('host') && x.audio.musicPlaying === 1, { label: 'resumed' });
  // a player pause survives a host pause / resume
  await pressButton(page, drv, 'menu-level-soccer-ball');
  s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
  await pressButton(page, drv, 'hud-pause');
  await waitFor(page, (x) => x.level?.pauseModal && x.pause.reasons.includes('user'));
  await page.evaluate(() => window.__ytMockCtl.pause());
  await page.evaluate(() => window.__ytMockCtl.resume());
  await page.waitForTimeout(300);
  s = await snap(page);
  expect(s.level.pauseModal).toBe(true);
  expect(s.pause.reasons).toEqual(['user']);
  await pressButton(page, drv, 'pause-resume');
  await waitFor(page, (x) => x.pause.reasons.length === 0);
  // YouTube mute has priority over the in-game Music / Sound settings
  await page.evaluate(() => window.__ytMockCtl.setAudio(false));
  s = await waitFor(page, (x) => x.audio.canPlay === false && x.audio.musicPlaying === 0, { label: 'muted by YouTube' });
  await page.evaluate(() => window.__ytMockCtl.setAudio(true));
  await waitFor(page, (x) => x.audio.canPlay === true && x.audio.musicPlaying === 1, { label: 'unmuted' });
});

test('mock-test build: rewarded pays only on true; false / reject change nothing; stable reward ids', async ({ page }, info) => {
  test.setTimeout(180_000);
  const drv = await driver(page, info);
  await boot(page, QA, { load: '', rewarded: false });
  await gameReady(page);
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-store']);
  await pressButton(page, drv, 'menu-store');
  await waitFor(page, (x) => x.store && x.buttons?.['store-free-gems']);
  await page.waitForTimeout(300);
  for (const r of [false, '__reject__']) {
    await page.evaluate((v) => window.__ytMockCtl.set('rewarded', v), r);
    await pressButton(page, drv, 'store-free-gems');
    await page.waitForTimeout(800);
    expect((await snap(page)).diamondsNow).toBe(0);
  }
  await page.evaluate(() => window.__ytMockCtl.set('rewarded', true));
  await pressButton(page, drv, 'store-free-gems');
  await waitFor(page, (x) => x.diamondsNow === 25, { label: '+25 on true' });
  await page.waitForTimeout(600);
  const log = await ytLog(page);
  const ids = log.filter((x) => x.e === 'requestRewardedAd').map((x) => x.id);
  expect(ids).toEqual(['store-reward-gems', 'store-reward-gems', 'store-reward-gems']);
  const lastSave = log.filter((x) => x.e === 'saveData').at(-1);
  expect(JSON.parse(lastSave.data).diamonds).toBe(25); // the reward is in the cloud save
  await shot(page, info, 'qa-store-rewarded');
});
