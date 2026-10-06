import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Step 6 UI pass 4 (focused): multiplier bar (x2 | x3 | x5 | x3 | x2 + purple marker), hub Chair /
// Rug previews, chest reel clipped to the card. Screenshots: project/screenshots/step6/ui-pass4/<project>/
const KEY = 'cleanup-dev-save';
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);

test('multiplier bar, hub previews, chest reel stays inside the card', async ({ page }, info) => {
  test.setTimeout(300_000);
  const tag = info.project.name;
  const dir = `project/screenshots/step6/ui-pass4/${tag}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.goto('/?qa=1&devAd=earned');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k) || '{}');
    st.levels = { chair: { completed: true, completions: 1 } };
    st.progressChest = { steps: 4, opened: 0, forfeited: 0 };
    localStorage.setItem(k, JSON.stringify(st));
  }, KEY);
  await page.goto('/?qa=1&devAd=earned');
  let s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  await page.waitForTimeout(400);
  // 2. hub: chest column clear of every level slot; Chair + Rug previews
  for (const c of ['menu-timed-chest', 'menu-progress-chest']) for (const id of ['soccer-ball', 'rug', 'golden-trophy', 'chair']) expect(overlap(s.buttons[c], s.buttons[`menu-level-${id}`]), `${c} × ${id}`).toBe(false);
  await page.screenshot({ path: `${dir}/01-hub.png` });
  // play the rug → chest 100 % → offer → watched ad → reel (overflow check on every frame grabbed)
  await pressButton(page, drv, 'menu-level-rug');
  await playLevel5(page, drv);
  await waitFor(page, (x) => x.rewards.chestOffer, { label: 'chest offer', timeout: 12000 });
  await page.waitForTimeout(700);
  await pressButton(page, drv, 'chest-open');
  await waitFor(page, (x) => x.rewards.chestOfferPhase === 'reveal' && x.buttons?.['chest-reel-window'], { label: 'reel started' });
  const reel = [];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(i === 0 ? 120 : 380);
    const q = await snap(page);
    const p = `${dir}/03-reel-${i + 1}.png`;
    await page.screenshot({ path: p });
    reel.push({ p, card: q.buttons['chest-card'], win: q.buttons['chest-reel-window'], phase: q.rewards.chestOfferPhase });
  }
  fs.writeFileSync(`${dir}/reel.json`, JSON.stringify({ css: { W: s.layout.W, H: s.layout.H }, frames: reel }));
  for (const f of reel) {
    // the reel window lies inside the card
    expect(f.win.x - f.win.w / 2).toBeGreaterThanOrEqual(f.card.x - f.card.w / 2);
    expect(f.win.x + f.win.w / 2).toBeLessThanOrEqual(f.card.x + f.card.w / 2);
  }
  await waitFor(page, (x) => !x.rewards.chestOffer, { label: 'offer closed', timeout: 9000 });
  // 1. completed screen: marker sweeps, only x2 / x3 / x5, marker moves, lock + ad pays base × value
  await page.waitForTimeout(500);
  s = await snap(page);
  await page.screenshot({ path: `${dir}/02-completed.png` });
  const seen = new Set();
  const xs = new Set();
  for (let i = 0; i < 24; i++) {
    const q = await snap(page);
    seen.add(q.rewards.boostValue);
    xs.add(Math.round(q.buttons['result-marker'].x));
    if (i % 8 === 3) await page.screenshot({ path: `${dir}/02-meter-${(i - 3) / 8 + 1}.png` });
    await page.waitForTimeout(90);
  }
  expect([...seen].every((v) => [2, 3, 5].includes(v)), `values ${[...seen]}`).toBe(true);
  expect(seen.size).toBeGreaterThanOrEqual(2);
  expect(xs.size, 'marker moves').toBeGreaterThan(8);
  const coins0 = s.coins;
  await pressButton(page, drv, 'result-boost');
  const locked = (await waitFor(page, (x) => x.rewards.boostState === 'locked')).rewards.boostValue;
  await page.screenshot({ path: `${dir}/02-locked.png` });
  await waitFor(page, (x) => x.rewards.boostState === 'granted', { label: 'granted', timeout: 9000 });
  await page.waitForTimeout(1400);
  s = await snap(page);
  expect(s.coins).toBe(coins0 + 15 * (locked - 1));
  await page.screenshot({ path: `${dir}/02-claimed.png` });
  console.log(`PASS4 ${tag}: meter values ${[...seen].sort().join(',')}, marker positions ${xs.size}, locked x${locked} → +${15 * locked} total; reel window inside the card on ${reel.length} frames (${reel.map((f) => f.phase).join(',')})`);
  expect(errors).toEqual([]);
});
