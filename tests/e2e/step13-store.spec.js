import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton } from './helpers.js';

// Store + Wheel of Fortune (2026-10-10), real mouse / touch, persistent dev save. The offer / spin
// tests of 2026-10-10 were replaced by step16-systems.spec.js (systems pass 2026-10-12: no real-money
// offers, ad bundles, free first spin); the top-bar layout test below still applies.
// Original scope:
// Store opens / closes; the coin "+" opens it at the Coins section, the diamond "+" at Diamonds;
// a rewarded store offer: cancel / fail → nothing, success → granted; the Wheel button (under
// Settings) opens the wheel; spin ad cancel / fail → no spin; success → the wheel stops exactly on
// the chosen segment and the reward is saved once; the tool reward is owned, a second tool win
// gives the fallback; everything persists after a reload. Screenshots: project/screenshots/store/<project>/
const KEY = 'cleanup-dev-save';
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/store/${info.project.name}/${name}.png` });
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;

async function seed(page, src) {
  await page.evaluate(({ KEY, src }) => {
    const st = JSON.parse(localStorage.getItem(KEY) || '{}');
    // eslint-disable-next-line no-new-func
    new Function('st', src)(st);
    localStorage.setItem(KEY, JSON.stringify(st));
  }, { KEY, src });
}

async function menu(page) {
  await page.goto('/?qa=1');
  return waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-wheel'], { label: 'menu' });
}

test('top bar: counters with long values, Store + Settings pair, Wheel CTA', async ({ page }, info) => {
  test.setTimeout(200_000);
  const views = info.project.name.includes('touch') ? [['portrait', 390, 844], ['landscape', 844, 390]] : [['desktop', 1280, 800]];
  for (const [vals, tag] of [[[0, 0], 'short'], [[12345, 987], 'long'], [[1234567, 12345], 'xlong']]) {
    await page.goto('/?qa=1');
    await seed(page, `st.coins = ${vals[0]}; st.diamonds = ${vals[1]};`);
    for (const [name, w, h] of views) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/?qa=1');
      const s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-wheel'] && x.buttons?.['menu-plus-gems']);
      await page.waitForTimeout(500);
      const b = s.buttons;
      for (const pill of ['menu-coins', 'menu-diamonds']) for (const btn of ['menu-store', 'menu-settings', 'menu-wheel']) expect(overlap(b[pill], b[btn]), `${name} ${tag}: ${pill} × ${btn}`).toBe(false);
      expect(overlap(b['menu-coins'], b['menu-diamonds'])).toBe(false);
      // each "+" lies inside its own counter (horizontally)
      for (const [plus, pill] of [['menu-plus-coins', 'menu-coins'], ['menu-plus-gems', 'menu-diamonds']]) {
        expect(b[plus].x).toBeLessThan(b[pill].x + b[pill].w / 2);
        expect(b[plus].x).toBeGreaterThan(b[pill].x);
      }
      expect(b['menu-store'].h).toBeGreaterThanOrEqual(40);
      await page.screenshot({ path: `project/screenshots/store/${info.project.name}/topbar-${name}-${tag}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(h, 230) } });
    }
  }
});
