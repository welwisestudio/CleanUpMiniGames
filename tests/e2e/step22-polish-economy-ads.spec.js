import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton } from './helpers.js';
import { playStage5 } from './level-play.js';

// Polish / economy / ads pass (2026-10-17), real mouse / touch input:
// first-launch hand on the Soccer Ball card (once) + the phone menu layout; tutorial hands in the
// football / balloon / keyboard minigames; Pool Shot always plays all three balls; interstitials at
// every approved trigger (dev adapter log, `?interstitialMs=` shortens the pacing for the test) and
// the 30 s-style pacing (completed requests reset it, failures do not).
// Screenshots: project/screenshots/polish-econ/<project>/
const KEY = 'cleanup-dev-save';
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/polish-econ/${info.project.name}/${name}.png` });
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));
const ads = (page) => snap(page).then((s) => s.interstitial.log ?? []);

async function fresh(page, q) {
  await page.goto(`/?qa=1&locks=1${q}`);
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto(`/?qa=1&locks=1${q}`);
  return waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball'], { label: 'menu' });
}

// plays the current level to its end (minigame skipped) → Completed card
async function finishLevel(page, drv) {
  for (let i = 0; i < 14; i++) {
    const st = await waitFor(page, (x) => (x.level && x.level.state === 'playing') || x.scene === 'MiniGame' || x.level?.state === 'result', { timeout: 60000 });
    if (st.scene === 'MiniGame') {
      await waitFor(page, (x) => x.minigame?.state === 'play', { timeout: 30000 });
      await pressButton(page, drv, 'minigame-skip');
      break;
    }
    if (st.level?.state === 'result') break;
    await playStage5(page, drv);
  }
  const r = await waitFor(page, (x) => x.level?.state === 'result', { label: 'Completed card', timeout: 40000 });
  await page.waitForTimeout(1500); // the card's entrance animation (buttons enable afterwards)
  return r;
}

test('first launch: the hand points at the Soccer Ball card until it is tapped, then never again; phone menu layout', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  let s = await fresh(page, '');
  expect(s.firstHint).toBe(true);
  const b = s.buttons['menu-level-soccer-ball'];
  expect(b.visible).toBe(true);
  if (info.project.name.includes('touch')) {
    // phones: chests + Wheel in a second header row, the shelves use the full width below it
    expect(s.menuLayout.phoneRow).toBe(true);
    expect(s.menuLayout.listW).toBeGreaterThan(s.layout.W * 0.85);
    expect(b.y - b.h / 2).toBeGreaterThan(s.menuLayout.headerH);
  }
  await page.waitForTimeout(700);
  await shot(page, info, 'menu-first-hint');
  await pressButton(page, drv, 'menu-level-soccer-ball');
  s = await waitFor(page, (x) => x.level?.state === 'playing', { label: 'level 1 opened', timeout: 30000 });
  expect(s.tutorialFlags.menuFirstLevel).toBe(true);
  await pressButton(page, drv, 'hud-pause');
  await waitFor(page, (x) => x.buttons?.['pause-menu']);
  await pressButton(page, drv, 'pause-menu');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball'], { timeout: 30000 });
  expect(s.firstHint).toBe(false);
  await page.goto('/?qa=1&locks=1');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball']);
  expect(s.firstHint).toBe(false);
  await page.waitForTimeout(400);
  await shot(page, info, 'menu-after-hint');
});

test('minigame hands: football (pull back), balloon (hold), keyboard (tap the key) — gone on the first touch', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  for (const id of ['soccer-ball', 'desk-fan', 'keyboard']) {
    await page.goto(`/?qa=1&devStorage=memory&minigame=${id}`);
    let s = await waitFor(page, (x) => x.minigame?.state === 'play' && x.minigame.hand, { label: `${id} hand`, timeout: 30000 });
    await page.waitForTimeout(id === 'soccer-ball' ? 900 : 700);
    await shot(page, info, `hand-${id}`);
    await drv.tap(s.layout.W * 0.15, s.layout.H * 0.55);
    await page.waitForTimeout(300);
    s = await snap(page);
    expect(s.minigame.hand).toBe(false);
  }
});

test('pool shot: all three balls are always played', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&devStorage=memory&minigame=swimming-pool');
  await waitFor(page, (x) => x.minigame?.state === 'play', { timeout: 30000 });
  for (let i = 0; i < 3000; i++) {
    const m = (await snap(page)).minigame;
    if (!m || m.state !== 'play') break;
    const a = m.bot?.win;
    if (!a) {
      await page.waitForTimeout(15);
      continue;
    }
    await drv.down(a.x0, a.y0);
    for (let k = 1; k <= a.steps; k++) await drv.move(a.x0 + ((a.x1 - a.x0) * k) / a.steps, a.y0 + ((a.y1 - a.y0) * k) / a.steps);
    await drv.up();
    await page.waitForTimeout(150);
  }
  const m = await waitFor(page, (x) => x.minigame?.state === 'end', { timeout: 20000 }).then((x) => x.minigame);
  console.log('POOL', JSON.stringify({ balls: m.balls, rings: m.rings, result: m.result }));
  expect(m.balls).toBe(3);
  expect(m.result).toBe('win');
});

test('interstitials: every approved trigger requests one (level start, pause resume / restart / menu, skip chest, Completed next / restart / menu)', async ({ page }, info) => {
  test.skip(info.project.name.includes('touch'), 'trigger points on desktop; phone covered by the pacing test');
  test.setTimeout(600_000);
  const drv = await driver(page, info);
  await fresh(page, '&interstitialMs=0&devAd=earned');
  // the level chest one step from full, so the first completion offers it (→ Skip chest)
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    st.progressChest.steps = 4;
    st.tutorial = { ...(st.tutorial ?? {}), menuFirstLevel: true };
    localStorage.setItem(k, JSON.stringify(st));
  }, KEY);
  await page.goto('/?qa=1&locks=1&interstitialMs=0&devAd=earned');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball']);
  const expectAds = async (n, label) => {
    await waitFor(page, (x) => (x.interstitial.log ?? []).length >= n && !x.interstitial.busy, { label, timeout: 15000 });
    expect((await ads(page)).length).toBe(n);
  };
  await pressButton(page, drv, 'menu-level-soccer-ball');
  await expectAds(1, 'level-start');
  await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
  for (const [btn, n] of [['pause-resume', 2], ['pause-restart', 3]]) {
    await pressButton(page, drv, 'hud-pause');
    await waitFor(page, (x) => x.buttons?.[btn]);
    await pressButton(page, drv, btn);
    await expectAds(n, btn);
    await waitFor(page, (x) => x.level?.state === 'playing' && x.pause.reasons.length === 0, { timeout: 30000 });
  }
  await pressButton(page, drv, 'hud-pause');
  await waitFor(page, (x) => x.buttons?.['pause-menu']);
  await pressButton(page, drv, 'pause-menu');
  await expectAds(4, 'pause-menu');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball'], { timeout: 30000 });
  await pressButton(page, drv, 'menu-level-soccer-ball');
  await expectAds(5, 'level-start 2');
  // completion → level chest offer → Skip chest
  await finishLevel(page, drv);
  await waitFor(page, (x) => x.rewards?.chestOffer && x.buttons?.['chest-skip'], { label: 'chest offer', timeout: 20000 });
  await page.waitForTimeout(1200);
  await pressButton(page, drv, 'chest-skip');
  await expectAds(6, 'chest-skip');
  await page.waitForTimeout(600);
  await shot(page, info, 'ads-after-chest-skip');
  // Completed → Restart, → (again) Menu, → (again) Next
  await pressButton(page, drv, 'result-replay');
  await expectAds(7, 'result-restart');
  await finishLevel(page, drv);
  await pressButton(page, drv, 'result-home');
  await expectAds(8, 'result-menu');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball'], { timeout: 30000 });
  await pressButton(page, drv, 'menu-level-soccer-ball');
  await expectAds(9, 'level-start 3');
  await finishLevel(page, drv);
  await pressButton(page, drv, 'result-next');
  await expectAds(10, 'result-next');
  expect((await ads(page)).every((r) => r === 'request-completed')).toBe(true);
});

test('interstitial rules: not in the first interval of a session; ≥ the interval since the last SUCCESSFUL one; a failed request does not reset the timer', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  await fresh(page, '&interstitialMs=4000');
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    st.tutorial = { ...(st.tutorial ?? {}), menuFirstLevel: true };
    localStorage.setItem(k, JSON.stringify(st));
  }, KEY);
  await page.goto('/?qa=1&locks=1&interstitialMs=4000');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball']);
  const pauseMenu = async () => {
    await pressButton(page, drv, 'hud-pause');
    await waitFor(page, (x) => x.buttons?.['pause-menu']);
    await pressButton(page, drv, 'pause-menu');
    await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball'], { timeout: 30000 });
  };
  const startLevel = async () => {
    await pressButton(page, drv, 'menu-level-soccer-ball');
    await waitFor(page, (x) => x.level?.state === 'playing' && !x.interstitial.busy, { timeout: 30000 });
  };
  // not in the first interval of the session
  await startLevel();
  expect(await ads(page)).toEqual([]);
  await page.waitForTimeout(4200);
  await pauseMenu();
  await startLevel();
  expect(await ads(page)).toEqual(['request-completed']);
  // right after a success: paced out
  await pauseMenu();
  expect(await ads(page)).toEqual(['request-completed']);
  // after the interval a request is made — it fails, so the timer is NOT reset …
  await page.evaluate(() => window.__cleanupQA.platformDev.setInterstitialOutcome('unavailable'));
  await page.waitForTimeout(4200);
  await startLevel();
  expect(await ads(page)).toEqual(['request-completed', 'unavailable']);
  // … and the very next trigger tries again (succeeds) …
  await page.evaluate(() => window.__cleanupQA.platformDev.setInterstitialOutcome('request-completed'));
  await pauseMenu();
  expect(await ads(page)).toEqual(['request-completed', 'unavailable', 'request-completed']);
  // … which resets the timer: the next trigger right after it is paced out
  await startLevel();
  expect(await ads(page)).toEqual(['request-completed', 'unavailable', 'request-completed']);
});

test('minigame progress belongs to the current minigame: reset between minigames; Cleaver = stuck count + lives hearts, updated per throw', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  const mg = () => snap(page).then((x) => x.minigame);
  // three minigames back to back in ONE scene object (as after consecutive levels)
  await page.goto('/?qa=1&devStorage=memory&minigame=swimming-pool,rusty-cleaver,keyboard');
  let m = await waitFor(page, (x) => x.minigame?.id === 'swimming-pool' && x.minigame.state === 'play', { timeout: 30000 }).then((x) => x.minigame);
  // Pool: an ATTEMPTS row — after one shot one ✓ / ✗ appears immediately
  const a = (await waitFor(page, (x) => x.minigame?.bot?.win)).minigame.bot.win;
  await drv.down(a.x0, a.y0);
  for (let k = 1; k <= a.steps; k++) await drv.move(a.x0 + ((a.x1 - a.x0) * k) / a.steps, a.y0 + ((a.y1 - a.y0) * k) / a.steps);
  await drv.up();
  m = await waitFor(page, (x) => x.minigame?.pips?.filter(Boolean).length === 1, { label: 'pool attempt shown', timeout: 5000 }).then((x) => x.minigame);
  expect(m.pips.length).toBe(3);
  await shot(page, info, 'progress-pool-attempt');
  await pressButton(page, drv, 'minigame-skip');
  // Cleaver: nothing left over from Pool — plain success count (0 of 8) + 3 full hearts
  m = await waitFor(page, (x) => x.minigame?.id === 'rusty-cleaver' && x.minigame.state === 'play', { timeout: 30000 }).then((x) => x.minigame);
  expect([m.pips, m.done, m.total, m.lives]).toEqual([null, 0, 8, { left: 3, max: 3 }]);
  const W = (await snap(page)).layout.W;
  const H = (await snap(page)).layout.H;
  // a clean throw → 1 stuck immediately
  await drv.tap(W / 2, H * 0.7);
  m = await waitFor(page, (x) => x.minigame?.done === 1 && !x.minigame.flying, { label: 'stuck 1', timeout: 5000 }).then((x) => x.minigame);
  expect(m.lives).toEqual({ left: 3, max: 3 });
  // a throw into the stuck cleaver → CLANG: the count stays, one heart goes, immediately
  for (let i = 0; i < 600; i++) {
    m = await mg();
    if (!m.flying && m.stuckAngles.some((q) => Math.abs(((m.impactNow - q + 540) % 360) - 180) < 5)) break;
    await page.waitForTimeout(8);
  }
  await drv.tap(W / 2, H * 0.7);
  m = await waitFor(page, (x) => x.minigame?.misses === 1, { label: 'clang', timeout: 5000 }).then((x) => x.minigame);
  expect([m.done, m.lives]).toEqual([1, { left: 2, max: 3 }]);
  await page.waitForTimeout(300);
  await shot(page, info, 'progress-cleaver');
  await pressButton(page, drv, 'minigame-skip');
  // Key Rush: fresh again — no hearts, no attempt states, the tutorial hand shows again
  m = await waitFor(page, (x) => x.minigame?.id === 'keyboard' && x.minigame.state === 'play' && x.minigame.hand, { label: 'keyboard fresh', timeout: 30000 }).then((x) => x.minigame);
  expect([m.pips, m.lives, m.done]).toEqual([null, null, 0]);
});
