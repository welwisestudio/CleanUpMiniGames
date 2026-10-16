import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Minigame expansion (2026-10-16): the 23 new minigames on the shared systems. For each game —
// direct QA launch, a WIN played by a bot with real mouse / touch input (the game only *suggests*
// the next correct input in qa().bot.win; the bot taps / drags / holds like a player), a FAIL
// (wrong inputs from qa().bot.lose, or no input), Skip, and the clean return out of the minigame.
// MG_IDS=a,b limits the run. Screenshots: project/screenshots/minigames2/<project>/
export const NEW_MINIGAMES = [
  // Batch A
  'frying-pan', 'toolbox', 'keyboard', 'garden-grill', 'bathtub', 'game-controller', 'pocket-watch', 'chandelier', 'carousel-horse',
  // Batch B
  'wooden-crate', 'watering-can', 'porcelain-vase', 'swimming-pool', 'toaster', 'retro-radio', 'aquarium', 'stone-fountain',
  // Batch C
  'sneaker', 'desk-fan', 'lawn-mower', 'vintage-motorcycle', 'knight-armor', 'vintage-car',
];
const IDS = process.env.MG_IDS ? process.env.MG_IDS.split(',') : NEW_MINIGAMES;
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/minigames2/${info.project.name}/${name}.png` });
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));

async function open(page, id) {
  await page.goto(`/?qa=1&devStorage=memory&minigame=${id}`);
  return waitFor(page, (x) => x.scene === 'MiniGame' && x.minigame?.state === 'play', { label: `${id} playing`, timeout: 30000 });
}

// plays until the game ends, following qa().bot[mode] with real pointer input
async function play(page, drv, info, id, mode) {
  await open(page, id);
  let pressed = false;
  let acts = 0;
  let shotTaken = mode !== 'win';
  const release = async () => {
    if (pressed) await drv.up();
    pressed = false;
  };
  for (let i = 0; i < 4000; i++) {
    const m = (await snap(page)).minigame;
    if (!m || m.state !== 'play') break;
    // a mid-game screenshot just after the second success (feedback chip + attached objects)
    if (!shotTaken && m.done >= Math.min(2, m.total)) {
      shotTaken = true;
      await page.waitForTimeout(260);
      await shot(page, info, `${id}-play`);
    }
    const a = m.bot?.[mode];
    if (!a || a.type === 'release') {
      await release();
      await page.waitForTimeout(12);
      continue;
    }
    acts += 1;
    if (a.type === 'tap') {
      await release();
      await drv.tap(a.x, a.y);
      await page.waitForTimeout(a.wait ?? 70);
    } else if (a.type === 'drag') {
      await release();
      const n = a.steps ?? 8;
      await drv.down(a.x0, a.y0);
      for (let k = 1; k <= n; k++) {
        await drv.move(a.x0 + ((a.x1 - a.x0) * k) / n, a.y0 + ((a.y1 - a.y0) * k) / n);
        await page.waitForTimeout(12);
      }
      await drv.up();
      await page.waitForTimeout(a.wait ?? 90);
    } else if (a.type === 'press') {
      if (!pressed) await drv.down(a.x, a.y);
      else await drv.move(a.x, a.y);
      pressed = true;
      await page.waitForTimeout(16);
    }
  }
  await release();
  const s = await waitFor(page, (x) => x.minigame?.state === 'end' || x.scene !== 'MiniGame', { label: `${id} ${mode} result`, timeout: 40000 });
  if (s.minigame) {
    await page.waitForTimeout(450);
    await shot(page, info, `${id}-${mode}`);
  }
  const back = await waitFor(page, (x) => x.scene === 'Menu', { label: `${id} returns`, timeout: 15000 });
  expect(back.pause.reasons).toEqual([]);
  return s.minigame;
}

for (const id of IDS) {
  test(`${id}: win with real input, fail, skip`, async ({ page }, info) => {
    test.setTimeout(240_000);
    const drv = await driver(page, info);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const win = await play(page, drv, info, id, 'win');
    console.log('MG', id, info.project.name, 'win', JSON.stringify({ result: win?.result, done: win?.done, total: win?.total }));
    expect(win?.result).toBe('win');
    const lose = await play(page, drv, info, id, 'lose');
    console.log('MG', id, info.project.name, 'lose', JSON.stringify({ result: lose?.result, done: lose?.done }));
    expect(lose?.result).toBe('lose');
    await open(page, id);
    await page.waitForTimeout(400);
    await shot(page, info, `${id}-start`);
    await pressButton(page, drv, 'minigame-skip');
    const s = await waitFor(page, (x) => x.scene === 'Menu', { label: `${id} skipped`, timeout: 15000 });
    expect(s.pause.reasons).toEqual([]);
    expect(errors).toEqual([]);
  });
}

// The real flow on a representative subset: clean the level → minigame (win) → Completed card;
// the level reward is granted once (before the minigame) and the minigame never changes it.
const FLOW = process.env.MG_FLOW ? process.env.MG_FLOW.split(',') : ['frying-pan', 'swimming-pool', 'sneaker'];
for (const id of FLOW) {
  test(`real flow: ${id} cleaned → minigame → Completed, reward once`, async ({ page }, info) => {
    test.setTimeout(600_000);
    const drv = await driver(page, info);
    await page.goto('/?qa=1&devStorage=memory');
    let s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.[`menu-level-${id}`]);
    const coins0 = s.coins;
    await openFromMenu(page, drv, id);
    for (let i = 0; i < 14; i++) {
      const st = await waitFor(page, (x) => (x.level && x.level.state === 'playing') || x.scene === 'MiniGame', { timeout: 60000 });
      if (st.scene === 'MiniGame') break;
      await playStage5(page, drv);
    }
    s = await waitFor(page, (x) => x.scene === 'MiniGame' && x.minigame?.state === 'play', { label: 'minigame after cleaning', timeout: 30000 });
    const coins1 = s.coins;
    expect(coins1).toBeGreaterThan(coins0); // reward granted before the minigame
    await shot(page, info, `flow-${id}-1-minigame`);
    let pressed = false;
    for (let i = 0; i < 4000; i++) {
      const m = (await snap(page)).minigame;
      if (!m || m.state !== 'play') break;
      const a = m.bot?.win;
      if (!a || a.type === 'release') {
        if (pressed) await drv.up();
        pressed = false;
        await page.waitForTimeout(12);
        continue;
      }
      if (a.type === 'tap') await drv.tap(a.x, a.y);
      else if (a.type === 'drag') {
        await drv.down(a.x0, a.y0);
        for (let k = 1; k <= (a.steps ?? 8); k++) await drv.move(a.x0 + ((a.x1 - a.x0) * k) / (a.steps ?? 8), a.y0 + ((a.y1 - a.y0) * k) / (a.steps ?? 8));
        await drv.up();
      } else if (a.type === 'press') {
        if (!pressed) await drv.down(a.x, a.y);
        else await drv.move(a.x, a.y);
        pressed = true;
      }
      await page.waitForTimeout(60);
    }
    if (pressed) await drv.up();
    s = await waitFor(page, (x) => x.level?.state === 'result', { label: 'Completed card', timeout: 40000 });
    expect(s.coins).toBe(coins1); // the minigame never changes the reward (granted exactly once)
    expect(s.pause.reasons).toEqual([]);
    await page.waitForTimeout(700);
    await shot(page, info, `flow-${id}-2-completed`);
    await page.waitForTimeout(1500);
    expect((await snap(page)).coins).toBe(coins1);
  });
}
