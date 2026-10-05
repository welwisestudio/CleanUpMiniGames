import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Step 6 UI polish 2 (focused): hub chest column + compact header; chests visible in the gameplay
// HUD without overlapping HUD blocks or the object; completed screen with the green x3 button.
// Screenshots + element rectangles: project/screenshots/step6/ui-polish2/<project>/
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;
const inside = (r, s) => r.x - r.w / 2 >= -1 && r.y - r.h / 2 >= -1 && r.x + r.w / 2 <= s.layout.W + 1 && r.y + r.h / 2 <= s.layout.H + 1;

function checkHub(s, label) {
  const B = s.buttons;
  const t = B['menu-timed-chest'];
  const p = B['menu-progress-chest'];
  expect(Math.abs(t.x - p.x), `${label}: one column`).toBeLessThan(1);
  expect(p.y, `${label}: level chest below the timed chest`).toBeGreaterThan(t.y);
  expect(t.y - t.h / 2, `${label}: column below the counters`).toBeGreaterThan(B['menu-coins'].y + B['menu-coins'].h / 2 - 1);
  expect(t.x < s.layout.W / 2, `${label}: left side`).toBe(true);
  for (const r of [t, p]) {
    expect(inside(r, s), `${label}: chest inside the screen`).toBe(true);
    for (const id of ['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker']) {
      const lv = B[`menu-level-${id}`];
      if (lv) expect(r.x + r.w / 2 <= lv.x - lv.w / 2 + 1 || !overlap(r, lv), `${label}: chest × ${id}`).toBe(true);
    }
  }
  // compact header: counters row only (approved height)
  const headerBottom = B['menu-coins'].y + B['menu-coins'].h / 2;
  expect(t.y - t.h / 2 - headerBottom, `${label}: header compact`).toBeLessThan(34 * s.layout.u); // UI units
}

function checkHud(s, label) {
  const B = s.buttons;
  for (const c of ['hud-timed-chest', 'hud-progress-chest']) {
    expect(B[c], `${label}: ${c} present`).toBeTruthy();
    expect(inside(B[c], s), `${label}: ${c} inside`).toBe(true);
    for (const o of ['hud-pills', 'hud-strip', 'hud-pause', 'object']) if (B[o]) expect(overlap(B[c], B[o]), `${label}: ${c} × ${o}`).toBe(false);
  }
  expect(overlap(B['hud-timed-chest'], B['hud-progress-chest'])).toBe(false);
}

test('hub column, gameplay HUD chests, completed screen with the green x3 button', async ({ page }, info) => {
  test.setTimeout(300_000);
  const tag = info.project.name;
  const dir = `project/screenshots/step6/ui-polish2/${tag}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa=1&devStorage=memory&devAd=not-earned');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-timed-chest']);
  await page.waitForTimeout(500);
  let s = await snap(page);
  checkHub(s, `hub ${tag}`);
  await page.screenshot({ path: `${dir}/01-hub.png` });
  const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  // scrolled: the column stays clear of the shelves
  if (tag.includes('touch')) {
    await drv.down(s.layout.W * 0.7, s.layout.H * 0.8);
    for (let i = 1; i <= 8; i++) await drv.move(s.layout.W * 0.7, s.layout.H * (0.8 - 0.035 * i));
    await drv.up();
  } else {
    await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
    await page.mouse.wheel(0, 300);
  }
  await page.waitForTimeout(500);
  checkHub(await snap(page), `hub scrolled ${tag}`);
  await page.screenshot({ path: `${dir}/02-hub-scrolled.png` });
  // gameplay HUD (rug)
  for (let i = 0; i < 6; i++) {
    s = await snap(page);
    if (s.buttons['menu-level-rug']?.visible) break;
    await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);
  }
  await pressButton(page, drv, 'menu-level-rug');
  await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.buttons?.['hud-timed-chest']);
  await page.waitForTimeout(900);
  checkHud(await snap(page), `HUD ${tag}`);
  await page.screenshot({ path: `${dir}/03-gameplay-hud.png` });
  // play to the completed screen; the HUD chests stay visible on it
  await playLevel5(page, drv);
  await page.waitForTimeout(2800);
  s = await snap(page);
  expect(s.rewards.x3State).toBe('idle');
  expect(s.buttons['hud-timed-chest']).toBeTruthy();
  await page.screenshot({ path: `${dir}/04-completed.png` });
  fs.writeFileSync(`${dir}/rects.json`, JSON.stringify({ css: { W: s.layout.W, H: s.layout.H }, buttons: s.buttons }));
  await pressButton(page, drv, 'result-x3');
  await waitFor(page, (x) => !x.pause.reasons.includes('adBusy') && x.rewards.x3State === 'idle');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${dir}/05-x3-cancelled.png` });
  await page.evaluate(() => window.__cleanupQA.platformDev.setRewardedOutcome('earned'));
  await page.waitForTimeout(1500);
  await pressButton(page, drv, 'result-x3');
  await waitFor(page, (x) => x.rewards.x3State === 'granted');
  await page.waitForTimeout(1500);
  expect((await snap(page)).coins).toBe(45);
  await page.screenshot({ path: `${dir}/06-x3-claimed.png` });
  console.log(`POLISH2 ${tag}: hub column + compact header OK (also scrolled); HUD chests visible, no overlap; x3 cancel +0, claim 45`);
  expect(errors).toEqual([]);
});

test('responsive: hub and gameplay HUD on landscape phone and tablet', async ({ page }, info) => {
  test.skip(!info.project.name.includes('desktop'), 'viewports set explicitly');
  test.setTimeout(120_000);
  const dir = 'project/screenshots/step6/ui-polish2/responsive';
  for (const [name, w, h] of [['phone-landscape', 844, 390], ['tablet', 768, 1024], ['phone-small', 360, 640]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-timed-chest']);
    await page.waitForTimeout(400);
    checkHub(await snap(page), `hub ${name}`);
    await page.screenshot({ path: `${dir}/hub-${name}.png` });
    await pressButton(page, mouseDriver(page), 'menu-level-chair').catch(async () => {
      await page.mouse.wheel(0, 300);
      await pressButton(page, mouseDriver(page), 'menu-level-chair');
    });
    await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.buttons?.['hud-timed-chest']);
    await page.waitForTimeout(900);
    checkHud(await snap(page), `HUD ${name}`);
    await page.screenshot({ path: `${dir}/hud-${name}.png` });
  }
  console.log('POLISH2 responsive: hub + HUD OK on 844×390, 768×1024, 360×640');
});
