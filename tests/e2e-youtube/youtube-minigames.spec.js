import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { waitFor, mouseDriver, touchDriver, snap, openFromMenu } from '../e2e/helpers.js';
import { playStage5 } from '../e2e/level-play.js';

// YouTube mock-test build (dist-youtube-qa, mock SDK, YouTube CSP, browser storage blocked):
// representative post-cleaning minigames run inside the YouTube build without crashing — a real
// level is cleaned, its minigame is played with real input (qa().bot hints), the Completed card
// follows and the reward reaches the cloud save. Levels are opened from a seeded cloud save.
const QA = 'http://127.0.0.1:4175';
const MOCK = fs.readFileSync(new URL('./mock-sdk.js', import.meta.url), 'utf8');
const SAVE = JSON.stringify({ version: 4, coins: 500, diamonds: 5, levels: {}, progression: { unlocked: ['frying-pan', 'sneaker', 'swimming-pool'], adUnlocked: [], vipAds: [], vip: [], migrated: true, model: 2 } });
const LEVELS = process.env.YT_MG ? process.env.YT_MG.split(',') : ['swimming-pool', 'frying-pan', 'sneaker'];

async function boot(page) {
  await page.addInitScript((c) => {
    window.__ytMockConfig = c;
    for (const k of ['localStorage', 'sessionStorage', 'indexedDB']) {
      Object.defineProperty(window, k, { configurable: true, get() { throw new DOMException('storage blocked by the test', 'SecurityError'); } });
    }
  }, { load: SAVE });
  await page.route('https://www.youtube.com/game_api/v1', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: MOCK }));
  await page.goto(`${QA}/?qa=1`);
}

for (const id of LEVELS) {
  test(`youtube build: ${id} cleaned → minigame plays → Completed, saved to the cloud`, async ({ page }, info) => {
    test.setTimeout(420_000);
    const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await boot(page);
    await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.[`menu-level-${id}`], { timeout: 30000 });
    await openFromMenu(page, drv, id);
    for (let i = 0; i < 14; i++) {
      const st = await waitFor(page, (x) => (x.level && x.level.state === 'playing') || x.scene === 'MiniGame', { timeout: 60000 });
      if (st.scene === 'MiniGame') break;
      await playStage5(page, drv);
    }
    let s = await waitFor(page, (x) => x.scene === 'MiniGame' && x.minigame?.state === 'play', { label: 'minigame', timeout: 30000 });
    const coins = s.coins;
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
      await page.waitForTimeout(a.wait ?? 60);
    }
    if (pressed) await drv.up();
    const result = (await snap(page)).minigame?.result;
    s = await waitFor(page, (x) => x.level?.state === 'result', { label: 'Completed card', timeout: 40000 });
    await page.screenshot({ path: `project/screenshots/youtube/${info.project.name}/minigame-${id}-completed.png` });
    expect(s.coins).toBe(coins);
    const saves = await page.evaluate(() => (window.__ytLog ?? []).filter((x) => x.e === 'saveData').map((x) => x.data));
    expect(saves.length).toBeGreaterThan(0);
    expect(JSON.parse(saves.at(-1)).levels?.[id]?.completed).toBe(true);
    console.log('YT MINIGAME', id, info.project.name, result, 'saves', saves.length);
    expect(errors).toEqual([]);
  });
}
