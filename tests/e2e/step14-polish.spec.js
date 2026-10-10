import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Final polish (2026-10-11), focused: menu list exactly centred; a not-ready chest spammed with taps
// never drifts; ready chests open during a level and the level resumes as it was; paint can / tray
// show the stage's paint colour. Screenshots: project/screenshots/polish-final/<project>/
const KEY = 'cleanup-dev-save';
const shot = (page, info, name, clip) => page.screenshot({ path: `project/screenshots/polish-final/${info.project.name}/${name}.png`, ...(clip ? { clip } : {}) });
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);
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
  for (let i = 0; i < 10; i++) {
    const s = await waitFor(page, (x) => x.level && x.level.state === 'playing', { label: 'playing', timeout: 30000 });
    if (s.level.stageId === id) return s;
    await playStage5(page, drv);
  }
  throw new Error(`stage ${id} not reached`);
}

test('menu list exactly centred; spammed not-ready chests never drift', async ({ page }, info) => {
  test.setTimeout(200_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto('/?qa=1');
  let s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-list'] && x.buttons?.['menu-timed-chest']);
  await page.waitForTimeout(300);
  const list = s.buttons['menu-list'];
  expect(Math.abs(list.x - s.layout.W / 2)).toBeLessThan(0.75); // centre of the list = centre of the screen
  const chest = s.buttons['menu-timed-chest'];
  expect(list.x - list.w / 2).toBeGreaterThanOrEqual(chest.x + chest.w / 2 - 0.5); // clear of the chest column
  await shot(page, info, 'menu-centred');
  // spam the not-ready timed chest and the level chest
  expect(s.chestX).toEqual({ timed: 0, progress: 0 });
  for (const id of ['menu-timed-chest', 'menu-progress-chest']) {
    const r = s.buttons[id];
    for (let i = 0; i < 20; i++) await drv.tap(r.x, r.y);
  }
  await page.waitForTimeout(700);
  s = await snap(page);
  expect(s.chestX).toEqual({ timed: 0, progress: 0 });
});

test('ready chests open during a level and the level resumes where it was', async ({ page }, info) => {
  test.setTimeout(300_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&devAd=earned');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto('/?qa=1&devAd=earned');
  await waitFor(page, (x) => x.scene === 'Menu');
  await seed(page, 'st.timedChest = { readyAt: 1 }; st.progressChest = { steps: 5, opened: 0, forfeited: 0 };');
  await page.goto('/?qa=1&devAd=earned');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  await pressButton(page, drv, 'menu-level-rug');
  let s = await waitFor(page, (x) => x.level?.state === 'playing' && x.buttons?.['hud-timed-chest']?.visible, { label: 'level', timeout: 30000 });
  // work a little first so there is progress to keep
  await playStage5(page, drv, { maxPasses: 1 }).catch(() => {});
  s = await waitFor(page, (x) => x.level?.state === 'playing');
  const before = { stage: s.level.stageId, progress: s.level.progress, tool: s.level.tool.id, coins: s.coins, diamonds: s.rewards.diamonds };
  // ready timed chest → claimed right away (+15 coins), same stage / progress / tool
  const tc = s.buttons['hud-timed-chest'];
  await drv.tap(tc.x, tc.y);
  s = await waitFor(page, (x) => x.coins === before.coins + 15, { label: 'timed chest claimed' });
  expect([s.level.stageId, s.level.tool.id]).toEqual([before.stage, before.tool]);
  expect(s.level.progress).toBeCloseTo(before.progress, 5);
  await page.waitForTimeout(400);
  await shot(page, info, 'timed-chest-in-level');
  // ready level chest → offer, gameplay paused; open (ad) → reward → back to the same stage
  const pc = s.buttons['hud-progress-chest'];
  await drv.tap(pc.x, pc.y);
  s = await waitFor(page, (x) => x.rewards.chestOffer && x.pause.reasons.includes('chest'), { label: 'level chest offer' });
  await page.waitForTimeout(600);
  await shot(page, info, 'level-chest-in-level');
  await setAd(page, 'earned');
  await pressButton(page, drv, 'chest-open');
  s = await waitFor(page, (x) => !x.rewards.chestOffer && !x.pause.reasons.includes('chest'), { label: 'offer closed', timeout: 15000 });
  expect(s.rewards.diamonds).toBeGreaterThan(before.diamonds);
  expect([s.level.stageId, s.level.tool.id, s.level.state]).toEqual([before.stage, before.tool, 'playing']);
  expect(s.level.progress).toBeCloseTo(before.progress, 5);
});

test('paint can / tray show the stage paint colour', async ({ page }, info) => {
  test.skip(!info.project.name.includes('touch'), 'phone only (same canvas recolour on desktop)');
  test.setTimeout(900_000);
  const drv = await driver(page, info);
  const cases = [
    ['garden-bench', 'roll', 'c98a3c'],
    ['garden-bench', 'paint-frame', '1d1d22'],
    ['wooden-dresser', 'stain', '6b3f22'],
    ['rowboat', 'roll', 'f4f1ea'],
  ];
  let open = null;
  for (const [level, stage, hex] of cases) {
    if (open !== level) {
      await page.goto('/?qa=1&devStorage=memory');
      await waitFor(page, (x) => x.scene === 'Menu');
      await openFromMenu(page, drv, level);
      open = level;
    }
    const s = await toStage(page, drv, stage);
    expect(s.level.stageId).toBe(stage);
    expect(s.paintSource, `${level}/${stage}`).toMatch(new RegExp(`-paint-${hex}$`));
    await page.waitForTimeout(400);
    await shot(page, info, `paint-${level}-${stage}`);
  }
});
