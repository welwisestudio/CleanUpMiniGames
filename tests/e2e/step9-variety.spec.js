import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Tool variety pass — focused checks (real mouse / touch, no full playthrough):
//  1. new functional tools in gameplay: the stage uses the new sprite and completes with real strokes
//     aimed through the tool's working point (mid-stroke screenshots);
//  2. alternative tools: coins and rewarded-ad purchase (squeegee family, bathtub), diamonds (mitt
//     family, rowboat); base / phone bottom cards and desktop side cards are screenshotted;
//  3. (cosmetic skins removed 2026-10-10) switching between owned alternatives,
//     equip, reload persistence.
// Screenshots: project/screenshots/variety/<project>/<name>.png
const KEY = 'cleanup-dev-save';
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);
const card = (s, tool) => s.level.toolCards.find((c) => c.tool === tool);
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/variety/${info.project.name}/${name}.png` });

async function seed(page, src) {
  await page.evaluate(({ KEY, src }) => {
    const st = JSON.parse(localStorage.getItem(KEY) || '{}');
    // eslint-disable-next-line no-new-func
    new Function('st', src)(st);
    localStorage.setItem(KEY, JSON.stringify(st));
  }, { KEY, src });
}

async function toStage(page, drv, id) {
  for (let i = 0; i < 14; i++) {
    const s = await waitFor(page, (x) => x.level && x.level.state === 'playing', { label: 'playing', timeout: 30000 });
    if (s.level.stageId === id) return s;
    await playStage5(page, drv);
  }
  throw new Error(`stage ${id} not reached`);
}

async function openLevel(page, drv, id, url) {
  await page.goto(url);
  await waitFor(page, (s) => s.scene === 'Menu');
  await openFromMenu(page, drv, id);
  return waitFor(page, (x) => x.level?.id === id && x.level.state === 'playing', { timeout: 30000 });
}

async function tap(page, drv, r, wait = 350) {
  await drv.tap(r.x, r.y);
  await page.waitForTimeout(wait);
}

async function tapCard(page, drv, tool) {
  const s = await waitFor(page, (x) => x.level?.toolCards?.find((c) => c.tool === tool)?.visible, { label: `card ${tool}` });
  await tap(page, drv, card(s, tool), 300);
}

const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));

test('new functional tools work in gameplay', async ({ page }, info) => {
  test.setTimeout(600_000);
  const drv = await driver(page, info);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const CASES = [
    ['sofa', 'scrub', 'tool-upholstery-brush'],
    ['stone-lion', 'stone-brush', 'tool-stone-brush'],
    ['retro-radio', 'soft-brush', 'tool-soft-brush'],
    ['vintage-tractor', 'scrub', 'tool-wheel-brush'],
  ];
  for (const [level, stage, texture] of CASES) {
    await openLevel(page, drv, level, '/?qa=1&devStorage=memory');
    let s = await toStage(page, drv, stage);
    // the tractor has an earlier non-tyre scrub stage: skip to the wheel-brush one
    while (s.level.tool.texture !== texture && s.level.stageId === stage) {
      await playStage5(page, drv);
      s = await toStage(page, drv, stage);
    }
    expect(s.level.tool.texture, `${level}/${stage}`).toBe(texture);
    const before = s.level.progress;
    await playStage5(page, drv, { mid: async () => shot(page, info, `tool-${level}-${stage}`) });
    s = await snap(page);
    expect(s.level.stageId !== stage || s.level.state !== 'playing' || s.level.progress > before).toBe(true);
    console.log(level, stage, texture, 'completed');
  }
  expect(errors).toEqual([]);
});

test('alternative tools: purchase, unlock, switch, persistence', async ({ page }, info) => {
  test.setTimeout(900_000);
  const drv = await driver(page, info);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa=1&devAd=not-earned');
  await waitFor(page, (x) => x.scene === 'Menu');
  await seed(page, 'st.coins = 30; st.diamonds = 8; st.tools = { owned: [], equipped: {}, purchases: 0, skins: { owned: [], equipped: {} } };');

  // ---- squeegee family (bathtub): base + coins + ad ----
  await openLevel(page, drv, 'bathtub', '/?qa=1&devAd=not-earned');
  let s = await toStage(page, drv, 'squeegee');
  expect(s.level.toolCards.map((c) => c.tool)).toEqual(['squeegee', 'pro-squeegee', 'gold-squeegee']);
  expect(s.level.toolCards.map((c) => c.state)).toEqual(['equipped', 'coins', 'ad']);
  const base = { texture: s.level.tool.texture, radius: s.level.brush.effectiveRadius, offset: s.level.tool.workOffset };
  expect(base.texture).toBe('tool-squeegee');
  await shot(page, info, 'alt-1-squeegee-cards');

  await tapCard(page, drv, 'pro-squeegee');
  s = await waitFor(page, (x) => x.level.tool.id === 'pro-squeegee', { label: 'pro squeegee equipped' });
  expect(s.coins).toBe(15);
  expect(card(s, 'pro-squeegee').state).toBe('equipped');
  expect(s.level.brush.effectiveRadius).toBeLessThanOrEqual(base.radius * 1.1 + 1e-6);
  await shot(page, info, 'alt-2-pro-squeegee');

  await setAd(page, 'earned');
  await tapCard(page, drv, 'gold-squeegee');
  s = await waitFor(page, (x) => x.level.tool.id === 'gold-squeegee', { label: 'gold squeegee via ad' });
  expect(s.coins).toBe(15);
  await shot(page, info, 'alt-3-gold-squeegee-ad');

  // no cosmetic skin layer: only the alternative-tool cards (designer 2026-10-10)
  expect(Object.keys(s.buttons).filter((k) => k.startsWith('skin-'))).toEqual([]);
  // switching between owned alternatives: no charge (progress kept mid-stage: step7-tools.spec)
  await tapCard(page, drv, 'squeegee');
  s = await waitFor(page, (x) => x.level.tool.id === 'squeegee', { label: 'base again' });
  await tapCard(page, drv, 'pro-squeegee');
  s = await waitFor(page, (x) => x.level.tool.id === 'pro-squeegee', { label: 'owned alternative' });
  expect(s.coins).toBe(15);
  await shot(page, info, 'alt-4-switch-owned');
  await playStage5(page, drv);

  // ---- reload: ownership and the equipped alternative persist ----
  await openLevel(page, drv, 'bathtub', '/?qa=1&devAd=not-earned');
  s = await toStage(page, drv, 'squeegee');
  expect(s.level.toolCards.map((c) => c.state)).toEqual(['owned', 'equipped', 'owned']);
  expect(s.level.tool.id).toBe('pro-squeegee');
  await shot(page, info, 'alt-5-after-reload');

  // ---- mitt family (rowboat): diamonds alternative ----
  await openLevel(page, drv, 'rowboat', '/?qa=1&devAd=not-earned');
  s = await toStage(page, drv, 'wipe');
  expect(s.level.toolCards.map((c) => c.tool)).toEqual(['wash-mitt', 'microfiber-mitt', 'wool-mitt']);
  await tapCard(page, drv, 'wool-mitt');
  s = await waitFor(page, (x) => x.level.tool.id === 'wool-mitt', { label: 'wool mitt (diamonds)' });
  expect(s.level.diamonds).toBe(4); // 8 seeded − 4 for the wool mitt
  await shot(page, info, 'alt-6-wool-mitt-diamonds');
  await playStage5(page, drv);
  expect(errors).toEqual([]);
});
