import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Step 6 UI pass 3 (focused): hub clean previews + large checks; larger, centred objects; completed
// screen with Home + Replay / Next rows and the x2…x5 boost; chest offer (green CTA, skip text,
// forfeit) and the reward reel. Screenshots: project/screenshots/step6/ui-pass3/<project>/
const KEY = 'cleanup-dev-save';
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);

async function seed(page, src) {
  await page.evaluate(({ KEY, src }) => {
    const st = JSON.parse(localStorage.getItem(KEY) || '{}');
    // eslint-disable-next-line no-new-func
    new Function('st', src)(st);
    localStorage.setItem(KEY, JSON.stringify(st));
  }, { KEY, src });
}

async function toMenu(page) {
  await page.goto('/?qa=1&devAd=not-earned');
  return waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
}

async function openLevel(page, drv, id) {
  for (let i = 0; i < 10; i++) {
    const s = await snap(page);
    if (s.buttons[`menu-level-${id}`]?.visible) break;
    await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(300);
  }
  await pressButton(page, drv, `menu-level-${id}`);
  return waitFor(page, (x) => x.level && x.level.state === 'playing' && x.buttons?.object);
}

test('hub previews, larger objects, completed screen with boost, chest offer + reel + skip', async ({ page }, info) => {
  test.setTimeout(420_000);
  const tag = info.project.name;
  const dir = `project/screenshots/step6/ui-pass3/${tag}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await toMenu(page);
  await seed(page, "st.levels = { chair: { completed: true, completions: 1 }, sneaker: { completed: true, completions: 2 } }; st.progressChest = { steps: 4, opened: 0, forfeited: 0 };");
  let s = await toMenu(page);
  await page.waitForTimeout(400);
  // 1. hub: completed → clean preview + large check; others dirty, no check
  for (const id of ['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker']) {
    const b = s.buttons[`menu-level-${id}`];
    const done = id === 'chair' || id === 'sneaker';
    expect(b.thumb.includes('clean'), `${id} preview`).toBe(done);
    if (done) expect(b.check, `${id} check size`).toBeGreaterThan(40);
  }
  await page.screenshot({ path: `${dir}/01-hub.png` });
  // 4. gameplay: sneaker and rug framed larger, centred, clear of the HUD
  for (const id of ['sneaker', 'rug']) {
    if (id === 'rug') await toMenu(page);
    const g = await openLevel(page, drv, id);
    await page.waitForTimeout(900);
    const L = (await snap(page)).buttons;
    for (const h of ['hud-pills', 'hud-strip', 'hud-pause', 'hud-timed-chest', 'hud-progress-chest']) if (L[h]) expect(overlap(L.object, L[h]), `${id} object × ${h}`).toBe(false);
    expect(Math.abs(L.object.x - g.layout.W / 2), `${id} centred horizontally`).toBeLessThan(g.layout.W * 0.03);
    console.log(`PASS3 ${tag} ${id}: object ${Math.round(L.object.w)}×${Math.round(L.object.h)} css (${Math.round((L.object.w / g.layout.W) * 100)} % of the width), top ${Math.round(L.object.y - L.object.h / 2)} px`);
    await page.screenshot({ path: `${dir}/02-gameplay-${id}.png` });
  }
  // play the rug (larger object, real input) → completed screen; chest 80 % → 100 % → offer
  await playLevel5(page, drv);
  await waitFor(page, (x) => x.rewards.chestOffer, { label: 'chest offer', timeout: 12000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${dir}/05-chest-offer.png` });
  // 5. cancelled ad → chest stays; 6. watched → reel → reward once
  await pressButton(page, drv, 'chest-open');
  await waitFor(page, (x) => !x.pause.reasons.includes('adBusy') && x.rewards.chestOfferPhase === 'offer');
  expect((await snap(page)).rewards.progressChest.full).toBe(true);
  const coins0 = (await snap(page)).coins;
  await page.waitForTimeout(1500);
  await setAd(page, 'earned');
  await pressButton(page, drv, 'chest-open');
  await waitFor(page, (x) => x.rewards.chestOfferPhase === 'reveal', { label: 'reel' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${dir}/06-chest-reel.png` });
  await waitFor(page, (x) => x.rewards.chestOfferPhase === 'landed' || x.rewards.chestOfferPhase === 'done', { label: 'landed', timeout: 8000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${dir}/07-chest-landed.png` });
  await waitFor(page, (x) => !x.rewards.chestOffer, { label: 'offer closed', timeout: 8000 });
  s = await snap(page);
  expect(s.coins).toBe(coins0 + 150);
  expect(s.rewards.diamonds).toBe(2);
  expect(s.rewards.progressChest.steps).toBe(0);
  // 2–3. completed screen + boost meter
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/03-completed.png` });
  fs.writeFileSync(`${dir}/rects.json`, JSON.stringify({ css: { W: s.layout.W, H: s.layout.H }, buttons: s.buttons }));
  const seen = new Set();
  for (let i = 0; i < 14; i++) {
    seen.add((await snap(page)).rewards.boostValue);
    await page.waitForTimeout(110);
  }
  expect(seen.size, 'meter cycles through several multipliers').toBeGreaterThanOrEqual(3);
  const shots = [];
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(170);
    const p = `${dir}/04-boost-meter-${i + 1}.png`;
    await page.screenshot({ path: p });
    shots.push((await snap(page)).rewards.boostValue);
  }
  await setAd(page, 'not-earned');
  await pressButton(page, drv, 'result-boost');
  await waitFor(page, (x) => x.rewards.boostState === 'locked');
  await page.screenshot({ path: `${dir}/04-boost-locked.png` });
  await waitFor(page, (x) => x.rewards.boostState === 'idle' && !x.pause.reasons.includes('adBusy'), { label: 'boost back to idle' });
  const coins1 = (await snap(page)).coins;
  await page.waitForTimeout(1500);
  await setAd(page, 'earned');
  await pressButton(page, drv, 'result-boost');
  const locked = (await waitFor(page, (x) => x.rewards.boostState === 'locked')).rewards.boostValue;
  await waitFor(page, (x) => x.rewards.boostState === 'granted', { label: 'boost granted', timeout: 8000 });
  await page.waitForTimeout(1400);
  s = await snap(page);
  expect(s.coins).toBe(coins1 + 15 * (locked - 1));
  expect(s.rewards.lastCompletion.boost).toBe(locked);
  await page.screenshot({ path: `${dir}/04-boost-claimed.png` });
  console.log(`PASS3 ${tag} completed: meter showed ${[...seen].sort().join(',')} (shots ${shots.join(',')}); cancel +0; locked x${locked} → +${15 * locked} total`);
  // 5. skip path (menu): full chest → tap outside → forfeited, no reward
  await seed(page, 'st.progressChest = { steps: 5, opened: 1, forfeited: 0 };');
  s = await toMenu(page);
  await pressButton(page, drv, 'menu-progress-chest');
  await waitFor(page, (x) => x.rewards.chestOffer);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/05-chest-offer-menu.png` });
  const c2 = (await snap(page)).coins;
  await drv.tap(8, s.layout.H - 8); // outside the card
  await waitFor(page, (x) => !x.rewards.chestOffer, { label: 'offer closed by outside tap' });
  s = await snap(page);
  expect(s.rewards.progressChest.steps).toBe(0);
  expect(s.coins).toBe(c2);
  console.log(`PASS3 ${tag} chest: cancel kept it, reel → +150 coins +2 diamonds once, outside tap → forfeited (0 %, no reward)`);
  expect(errors).toEqual([]);
});
