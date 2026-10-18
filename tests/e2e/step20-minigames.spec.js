import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton } from './helpers.js';
import { playStage5 } from './level-play.js';

// Post-cleaning minigames (polish pass 2026-10-15), real mouse / touch input:
// win / fail / skip of each minigame via the QA shortcut `?minigame=<level>`, and the real hand-off
// on the Soccer Ball level (cleaning → minigame WIN → normal reward card, reward unchanged; and
// cleaning → Skip → reward card). Screenshots: project/screenshots/minigames/<project>/
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/minigames/${info.project.name}/${name}.png` });
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));
const mg = (page) => snap(page).then((s) => s.minigame);

async function open(page, id) {
  await page.goto(`/?qa=1&devStorage=memory&minigame=${id}`);
  return waitFor(page, (x) => x.scene === 'MiniGame' && x.minigame?.state === 'play', { label: `${id} playing`, timeout: 30000 });
}

async function result(page, info, name) {
  const s = await waitFor(page, (x) => x.minigame?.state === 'end', { label: `${name} result`, timeout: 40000 });
  await page.waitForTimeout(500);
  await shot(page, info, `${name}-result`);
  await waitFor(page, (x) => x.scene === 'Menu', { label: 'flow continues', timeout: 15000 });
  return s.minigame;
}

// pull back from the ball towards a goal point and release
async function kick(page, drv, m, tx, ty) {
  const dx = tx - m.ball.x;
  const dy = ty - m.ball.y;
  const len = Math.hypot(dx, dy);
  await drv.down(m.ball.x, m.ball.y);
  for (let i = 1; i <= 8; i++) await drv.move(m.ball.x - (dx / len) * 120 * (i / 8), m.ball.y - (dy / len) * 120 * (i / 8));
  await drv.up();
}

async function penalty(page, drv, info, aimAtKeeper) {
  const s0 = await open(page, 'soccer-ball');
  await page.waitForTimeout(500);
  expect((await mg(page)).hand).toBe(true); // tutorial hand shows the pull-back
  await shot(page, info, 'penalty-start');
  void s0;
  for (let k = 0; k < 5; k++) {
    const m = await waitFor(page, (x) => x.minigame?.state !== 'play' || (!x.minigame.flying && x.minigame.shots === k), { label: `shot ${k}` }).then((s) => s.minigame);
    if (m.state !== 'play') break;
    await page.waitForTimeout(250);
    const c = await mg(page);
    const side = c.keeperX > c.goal.x ? -1 : 1;
    const tx = aimAtKeeper ? c.keeperX : c.goal.x + side * c.goal.w * 0.4;
    if (k === 0 && !aimAtKeeper) {
      await drv.down(c.ball.x, c.ball.y);
      for (let i = 1; i <= 8; i++) await drv.move(c.ball.x - ((tx - c.ball.x) / 400) * 100 * (i / 8), c.ball.y + 100 * (i / 8));
      await shot(page, info, 'penalty-aim');
      await drv.up();
    } else await kick(page, drv, c, tx, c.goal.y);
    await waitFor(page, (x) => x.minigame?.state !== 'play' || (!x.minigame.flying && x.minigame.shots === k + 1), { label: `shot ${k} landed` });
    if (k === 0) await shot(page, info, aimAtKeeper ? 'penalty-save' : 'penalty-goal');
    await page.waitForTimeout(1000);
  }
  return result(page, info, aimAtKeeper ? 'penalty-fail' : 'penalty-win');
}

test('penalty: corners score (win), shots at the keeper are saved (fail)', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  const win = await penalty(page, drv, info, false);
  console.log('PENALTY win', JSON.stringify({ result: win.result, goals: win.goals, shots: win.shots }));
  expect(win.result).toBe('win');
  const fail = await penalty(page, drv, info, true);
  console.log('PENALTY fail', JSON.stringify({ result: fail.result, goals: fail.goals, shots: fail.shots }));
  expect(fail.result).toBe('lose');
});

test('cleaver: timed throws stick (win); throwing into a stuck cleaver clangs (fail)', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  let s = await open(page, 'rusty-cleaver');
  await shot(page, info, 'cleaver-start');
  for (let i = 0; i < 800; i++) {
    const m = await mg(page);
    if (m.state !== 'play') break;
    // throw only when the predicted impact point is well clear of every stuck cleaver
    const clear = !m.flying && m.stuckAngles.every((a) => Math.abs(((m.impactNow - a + 540) % 360) - 180) > 30);
    if (!clear) {
      await page.waitForTimeout(10);
      continue;
    }
    await drv.tap(s.layout.W / 2, s.layout.H * 0.7);
    await page.waitForTimeout(m.hits === 1 ? 230 : 420);
    if (m.hits === 1) await shot(page, info, 'cleaver-stick');
  }
  const win = await result(page, info, 'cleaver-win');
  console.log('CLEAVER win', JSON.stringify({ result: win.result, hits: win.hits, misses: win.misses }));
  // fail: stick one cleaver, then throw exactly when the impact point comes round to it → CLANG ×2
  s = await open(page, 'rusty-cleaver');
  await drv.tap(s.layout.W / 2, s.layout.H * 0.7);
  await waitFor(page, (x) => x.minigame?.stuck === 1 && !x.minigame.flying);
  await page.waitForTimeout(350);
  for (let i = 0; i < 600; i++) {
    const m = await mg(page);
    if (m.state !== 'play') break;
    const near = m.flying ? false : m.stuckAngles.some((a) => Math.abs(((m.impactNow - a + 540) % 360) - 180) < 6);
    if (near) {
      await drv.tap(s.layout.W / 2, s.layout.H * 0.7);
      await page.waitForTimeout(150);
      if (m.misses === 0) await shot(page, info, 'cleaver-clang');
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(8);
  }
  const fail = await result(page, info, 'cleaver-fail');
  console.log('CLEAVER fail', JSON.stringify({ result: fail.result, hits: fail.hits, misses: fail.misses }));
  expect(win.result).toBe('win');
  expect(win.hits).toBe(8);
  expect(fail.result).toBe('lose');
});

test('cannon: firing on the crosshair hits (win); firing at open water splashes (fail)', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  let s = await open(page, 'cannon');
  await shot(page, info, 'cannon-start');
  for (let i = 0; i < 400; i++) {
    const m = await mg(page);
    if (m.state !== 'play') break;
    if (m.onTarget && !m.inFlight) {
      await drv.tap(s.layout.W / 2, s.layout.H * 0.3);
      if (m.hits === 0) {
        await page.waitForTimeout(420);
        await shot(page, info, 'cannon-fire');
      }
      await waitFor(page, (x) => x.minigame?.state !== 'play' || !x.minigame.inFlight, { label: 'ball landed' });
      if (m.hits === 0) await shot(page, info, 'cannon-boom');
    }
    await page.waitForTimeout(20);
  }
  const win = await result(page, info, 'cannon-win');
  console.log('CANNON win', JSON.stringify({ result: win.result, hits: win.hits, shots: win.shots }));
  expect(win.result).toBe('win');
  s = await open(page, 'cannon');
  for (let i = 0; i < 400; i++) {
    const m = await mg(page);
    if (m.state !== 'play') break;
    if (!m.onTarget && !m.inFlight) {
      await drv.tap(s.layout.W / 2, s.layout.H * 0.3);
      await waitFor(page, (x) => x.minigame?.state !== 'play' || !x.minigame.inFlight, { label: 'ball landed' });
    }
    await page.waitForTimeout(20);
  }
  const fail = await result(page, info, 'cannon-fail');
  console.log('CANNON fail', JSON.stringify({ result: fail.result, hits: fail.hits, shots: fail.shots }));
  expect(fail.result).toBe('lose');
});

test('piano: notes visible in front of the piano; on-time taps win; no taps fail', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  await open(page, 'upright-piano');
  const tapped = new Set();
  let shotTaken = false;
  for (let i = 0; i < 600; i++) {
    const m = await mg(page);
    if (!m || m.state !== 'play') break;
    expect(m.notesInFront).toBe(true);
    const n = m.notes.find((x) => Math.abs(x.y - m.keyY) < 40 && !tapped.has(x.id));
    if (n) {
      tapped.add(n.id);
      await drv.tap(m.lanes[n.lane], m.keyY);
      if (!shotTaken && m.hits >= 2) {
        shotTaken = true;
        await shot(page, info, 'piano-play');
      }
    }
    await page.waitForTimeout(12);
  }
  const win = await result(page, info, 'piano-win');
  console.log('PIANO win', JSON.stringify({ result: win.result, hits: win.hits, judged: win.judged }));
  expect(win.result).toBe('win');
  await open(page, 'upright-piano');
  const fail = await result(page, info, 'piano-fail');
  expect(fail.result).toBe('lose');
});

test('skip works in every minigame', async ({ page }, info) => {
  const drv = await driver(page, info);
  for (const id of ['soccer-ball', 'rusty-cleaver', 'cannon', 'upright-piano']) {
    await open(page, id);
    await pressButton(page, drv, 'minigame-skip');
    const s = await waitFor(page, (x) => x.scene === 'Menu', { label: `${id} skipped`, timeout: 15000 });
    expect(s.pause.reasons).toEqual([]);
  }
});

test('real hand-off: soccer ball cleaned → penalty WIN → normal reward card; replay → Skip → reward card', async ({ page }, info) => {
  test.setTimeout(500_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball']);
  await pressButton(page, drv, 'menu-level-soccer-ball');
  for (let i = 0; i < 8; i++) {
    const st = await waitFor(page, (x) => (x.level && x.level.state === 'playing') || x.scene === 'MiniGame', { timeout: 30000 });
    if (st.scene === 'MiniGame') break;
    await playStage5(page, drv);
  }
  let s = await waitFor(page, (x) => x.scene === 'MiniGame' && x.minigame?.state === 'play', { label: 'minigame after cleaning', timeout: 30000 });
  const coins = s.coins;
  expect(coins).toBeGreaterThan(0); // the completion reward was granted before the minigame
  await shot(page, info, 'handoff-1-minigame');
  for (let k = 0; k < 5; k++) {
    const m = await waitFor(page, (x) => x.minigame?.state !== 'play' || (!x.minigame.flying && x.minigame.shots === k)).then((q) => q.minigame);
    if (!m || m.state !== 'play') break;
    await page.waitForTimeout(250);
    const c = await mg(page);
    await kick(page, drv, c, c.goal.x + (c.keeperX > c.goal.x ? -1 : 1) * c.goal.w * 0.4, c.goal.y);
    await page.waitForTimeout(1600);
  }
  s = await waitFor(page, (x) => x.level?.state === 'result', { label: 'reward card after the minigame', timeout: 30000 });
  expect(s.coins).toBe(coins); // the minigame never changes rewards
  expect(s.pause.reasons).toEqual([]);
  await page.waitForTimeout(700);
  await shot(page, info, 'handoff-2-result');
});

test('layout at several screen sizes: big ball in the penalty, clear gap between log and cleaver', async ({ page }, info) => {
  test.skip(info.project.name.includes('touch'), 'viewport sweep on desktop');
  test.setTimeout(240_000);
  for (const [w, h] of [[390, 844], [360, 640], [768, 1024], [1280, 800], [1920, 1080]]) {
    await page.setViewportSize({ width: w, height: h });
    let s = await open(page, 'soccer-ball');
    await page.waitForTimeout(500);
    s = await snap(page);
    console.log('SIZE', w, h, 'ball', Math.round(s.minigame.ballSize), 'goal h', Math.round(s.minigame.goal.h));
    expect(s.minigame.ballSize).toBeGreaterThan(Math.min(110, h * 0.12));
    expect(s.minigame.ball.y + s.minigame.ballSize / 2).toBeLessThan(h);
    await page.screenshot({ path: `project/screenshots/minigames/sizes/penalty-${w}x${h}.png` });
    s = await open(page, 'rusty-cleaver');
    await page.waitForTimeout(500);
    s = await snap(page);
    console.log('SIZE', w, h, 'cleaver gap', Math.round(s.minigame.gapPx), 'log R', Math.round(s.minigame.logR));
    expect(s.minigame.gapPx).toBeGreaterThan(h * 0.2);
    await page.screenshot({ path: `project/screenshots/minigames/sizes/cleaver-${w}x${h}.png` });
  }
});
