import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 8 cosmetic tool skins (focused, real mouse / touch): rug → foam stage (foam family).
// Skin button on the equipped base card → picker; insufficient diamonds; coins purchase (charged
// once, equipped, gameplay sprite + card change, radius unchanged); ad cancel / failure give
// nothing; ad success unlocks; equip back to Default; reload persistence; the stage then completes
// normally with the skinned tool. Screenshots: project/screenshots/step8b/<project>/skins-*.png
const KEY = 'cleanup-dev-save';
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);

async function seed(page, src) {
  await page.evaluate(({ KEY, src }) => {
    const st = JSON.parse(localStorage.getItem(KEY) || '{}');
    // eslint-disable-next-line no-new-func
    new Function('st', src)(st);
    localStorage.setItem(KEY, JSON.stringify(st));
  }, { KEY, src });
}

async function toFoam(page, drv) {
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  const s = await snap(page);
  const b = s.buttons['menu-level-rug'];
  await drv.tap(b.x, b.y);
  for (let i = 0; i < 6; i++) {
    const st = await waitFor(page, (x) => x.level && x.level.state === 'playing', { label: 'playing', timeout: 30000 });
    if (st.level.stageId === 'foam-spray') return st;
    await playStage5(page, drv);
  }
  throw new Error('foam stage not reached');
}

async function tapRect(page, drv, r) {
  await drv.tap(r.x, r.y);
  await page.waitForTimeout(350);
}

async function openPicker(page, drv) {
  const s = await waitFor(page, (x) => x.level?.skinButton?.visible, { label: 'skin button' });
  await tapRect(page, drv, s.level.skinButton);
  return waitFor(page, (x) => x.level?.skinModal && x.buttons?.['skin-foam-candy'], { label: 'skin picker' });
}

test('cosmetic skins: buy, ad unlock (cancel / fail / success), equip, persistence, no gameplay change', async ({ page }, info) => {
  test.setTimeout(420_000);
  const tag = info.project.name;
  const dir = `project/screenshots/step8b/${tag}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.goto('/?qa=1&devAd=not-earned');
  await waitFor(page, (x) => x.scene === 'Menu');
  await seed(page, 'st.coins = 30; st.diamonds = 2; st.tools = { owned: [], equipped: {}, purchases: 0, skins: { owned: [], equipped: {} } };');
  await page.goto('/?qa=1&devAd=not-earned');
  let s = await toFoam(page, drv);
  const base = { texture: s.level.tool.texture, radius: s.level.brush.effectiveRadius, offset: s.level.tool.workOffset, jet: s.level.tool.jet };
  expect(base.texture).toBe('tool-foam-sprayer');
  await page.screenshot({ path: `${dir}/skins-1-card-button.png` });

  s = await openPicker(page, drv);
  expect(s.pause.reasons ?? s.pause).toBeTruthy();
  await page.screenshot({ path: `${dir}/skins-2-picker.png` });

  // diamonds skin with 2 diamonds: nothing changes
  await tapRect(page, drv, s.buttons['skin-foam-gold']);
  s = await snap(page);
  expect(s.level.diamonds).toBe(2);
  expect(s.level.skinsOwned).toEqual([]);

  // coins purchase (25): charged once, equipped, the tool sprite changes, nothing else does
  await tapRect(page, drv, s.buttons['skin-foam-candy']);
  await tapRect(page, drv, s.buttons['skin-foam-candy']);
  s = await snap(page);
  expect(s.coins).toBe(5);
  expect(s.level.skinsOwned).toEqual(['foam-candy']);
  expect(s.level.skinsEquipped.foam).toBe('foam-candy');
  expect(s.level.tool.texture).toBe('skin-foam-candy');
  expect(s.level.brush.effectiveRadius).toBe(base.radius);
  expect(s.level.tool.workOffset).toEqual(base.offset);
  expect(s.level.tool.jet).toEqual(base.jet);
  await page.screenshot({ path: `${dir}/skins-3-bought.png` });

  // rewarded ad: cancelled, then failed → nothing; then watched → unlocked + equipped
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await tapRect(page, drv, s.buttons['skin-foam-neon']);
    await page.waitForTimeout(500);
    s = await snap(page);
    expect(s.level.skinsOwned).toEqual(['foam-candy']);
    expect(s.level.skinsEquipped.foam).toBe('foam-candy');
  }
  await setAd(page, 'earned');
  await tapRect(page, drv, s.buttons['skin-foam-neon']);
  await page.waitForTimeout(600);
  s = await snap(page);
  expect(s.level.skinsOwned.sort()).toEqual(['foam-candy', 'foam-neon']);
  expect(s.level.skinsEquipped.foam).toBe('foam-neon');
  expect(s.coins).toBe(5);
  await page.screenshot({ path: `${dir}/skins-4-ad-unlocked.png` });

  // back to an owned skin (no charge), close the picker
  await tapRect(page, drv, s.buttons['skin-foam-candy']);
  s = await snap(page);
  expect(s.level.skinsEquipped.foam).toBe('foam-candy');
  await tapRect(page, drv, s.buttons['skin-close']);
  s = await waitFor(page, (x) => x.level && !x.level.skinModal && x.level.state === 'playing');
  expect(s.level.tool.texture).toBe('skin-foam-candy');
  await page.screenshot({ path: `${dir}/skins-5-in-hand.png` });

  // the stage completes normally with the skinned tool
  await playStage5(page, drv);
  s = await waitFor(page, (x) => x.level?.state === 'playing' && x.level.stageId !== 'foam-spray', { label: 'next stage' });
  expect(s.level.stageId).toBe('scrub');

  // reload: ownership and the equipped skin persist
  await page.goto('/?qa=1&devAd=not-earned');
  s = await toFoam(page, drv);
  expect(s.level.skinsOwned.sort()).toEqual(['foam-candy', 'foam-neon']);
  expect(s.level.skinsEquipped.foam).toBe('foam-candy');
  expect(s.level.tool.texture).toBe('skin-foam-candy');
  expect(s.coins).toBeGreaterThanOrEqual(5);
  // Default again
  s = await openPicker(page, drv);
  await tapRect(page, drv, s.buttons['skin-foam-default']);
  s = await snap(page);
  expect(s.level.skinsEquipped.foam).toBe('foam-default');
  await tapRect(page, drv, s.buttons['skin-close']);
  s = await waitFor(page, (x) => x.level && !x.level.skinModal);
  expect(s.level.tool.texture).toBe('tool-foam-sprayer');
  expect(errors).toEqual([]);
});
