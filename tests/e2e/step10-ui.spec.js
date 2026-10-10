import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton, openFromMenu } from './helpers.js';
import { playStage5, playLevel5 } from './level-play.js';

// UI polish pass (2026-10-10), focused, real mouse / touch:
//  1. Completed screen: purple Claim + purple x5, one navigation row, no overlapping blocks.
//  2. No cosmetic skin UI (removed 2026-10-10): only the original alternative-tool cards.
// Screenshots: project/screenshots/ui-polish/<project>/<name>.png
const KEY = 'cleanup-dev-save';
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);
const shot = (page, info, name) => page.screenshot({ path: `project/screenshots/ui-polish/${info.project.name}/${name}.png` });
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;
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
  for (let i = 0; i < 8; i++) {
    const s = await waitFor(page, (x) => x.level && x.level.state === 'playing', { label: 'playing', timeout: 30000 });
    if (s.level.stageId === id) return s;
    await playStage5(page, drv);
  }
  throw new Error(`stage ${id} not reached`);
}

async function tap(page, drv, r, wait = 380) {
  await drv.tap(r.x, r.y);
  await page.waitForTimeout(wait);
}

async function openRug(page, drv) {
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  await pressButton(page, drv, 'menu-level-rug');
  return waitFor(page, (x) => x.level && x.level.state === 'playing', { timeout: 30000 });
}

test('completed screen: purple boost accent, one navigation row, nothing overlaps', async ({ page }, info) => {
  test.setTimeout(300_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball']);
  await pressButton(page, drv, 'menu-level-soccer-ball');
  await playLevel5(page, drv);
  const s = await waitFor(page, (x) => x.level?.state === 'result' && x.buttons?.['result-boost']?.visible, { label: 'result', timeout: 15000 });
  await page.waitForTimeout(700);
  await shot(page, info, 'completed');
  const b = (await snap(page)).buttons;
  const blocks = { pill: b['result-pill'], chest: b['result-chestbar'], meter: b['result-meter'], boost: b['result-boost'], home: b['result-home'], replay: b['result-replay'], next: b['result-next'] };
  for (const [k, v] of Object.entries(blocks)) expect(v, k).toBeTruthy();
  const names = Object.keys(blocks);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) expect(overlap(blocks[names[i]], blocks[names[j]]), `${names[i]} × ${names[j]}`).toBe(false);
  // one navigation row, Next on the right; Claim above it; groups separated by clear gaps
  expect(Math.abs(blocks.home.y - blocks.next.y)).toBeLessThan(2);
  expect(Math.abs(blocks.replay.y - blocks.next.y)).toBeLessThan(2);
  expect(blocks.next.x).toBeGreaterThan(blocks.replay.x);
  const gap = (a, c) => c.y - c.h / 2 - (a.y + a.h / 2);
  expect(gap(blocks.boost, blocks.next)).toBeGreaterThan(blocks.next.h * 0.25);
  expect(gap(blocks.chest, blocks.meter)).toBeGreaterThan(blocks.meter.h * 0.5);
  expect(s.level.state).toBe('result');
});

// Designer 2026-10-10: the cosmetic skin system is removed; the original alternative-tool cards are
// the only tool choice (desktop: one column, phone: one bottom row).
test('no cosmetic skin UI: only the original alternative-tool cards', async ({ page }, info) => {
  test.setTimeout(300_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&devStorage=memory');
  await openRug(page, drv);
  let s = await toStage(page, drv, 'foam-spray');
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible), { label: 'tool cards' });
  expect(s.level.toolCards.map((c) => c.tool)).toEqual(['foam-sprayer', 'foam-gun', 'foam-cannon']);
  expect(s.level.toolCards.map((c) => c.state)).toEqual(['equipped', 'coins', 'ad']);
  expect(Object.keys(s.buttons).filter((k) => k.startsWith('skin-'))).toEqual([]);
  expect('skinButton' in s.level || 'skinModal' in s.level || 'skinStrip' in s.level).toBe(false);
  const xs = new Set(s.level.toolCards.map((c) => Math.round(c.x)));
  const ys = new Set(s.level.toolCards.map((c) => Math.round(c.y)));
  // one column (desktop) or one row (phone) — never a second group
  expect(info.project.name.includes('touch') ? ys.size : xs.size).toBe(1);
  await shot(page, info, 'cards-foam');
  s = await toStage(page, drv, 'scrub');
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  expect(s.level.toolCards.map((c) => c.tool)).toEqual(['scrub-brush', 'scrub-brush-oval', 'drill-brush', 'scrub-wood']);
  expect(Object.keys(s.buttons).filter((k) => k.startsWith('skin-'))).toEqual([]);
  await shot(page, info, 'cards-scrub');
});

// Unified tool variants (designer 2026-10-10): ONE card area per tool — functional alternatives and
// visual-only variants side by side (3, or 4 for the important tools); a COIN variant without enough
// coins offers a rewarded ad for that exact variant; no skin popup / column anywhere.
const cardsOf = (s) => s.level.toolCards.map((c) => c.tool);
const noSkinUi = (s) => {
  expect(Object.keys(s.buttons).filter((k) => k.startsWith('skin-'))).toEqual([]);
  expect('skinButton' in s.level || 'skinModal' in s.level || 'skinStrip' in s.level).toBe(false);
};
const oneArea = (s, info) => {
  const xs = new Set(s.level.toolCards.map((c) => Math.round(c.x)));
  const ys = new Set(s.level.toolCards.map((c) => Math.round(c.y)));
  expect(info.project.name.includes('touch') ? ys.size : xs.size).toBe(1);
};
async function tapCardOf(page, drv, tool) {
  const s = await waitFor(page, (x) => x.level?.toolCards?.find((c) => c.tool === tool)?.visible, { label: `card ${tool}` });
  await tap(page, drv, s.level.toolCards.find((c) => c.tool === tool), 350);
}

test('unified variants: coin → ad offer, diamonds, visual variants, laser, persistence', async ({ page }, info) => {
  test.setTimeout(900_000);
  const drv = await driver(page, info);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa=1&devAd=not-earned');
  await waitFor(page, (x) => x.scene === 'Menu');
  await seed(page, 'st.coins = 0; st.diamonds = 6; st.tools = { owned: [], equipped: {}, purchases: 0, skins: { owned: [], equipped: {} } };');
  await page.goto('/?qa=1&devAd=not-earned');
  await openRug(page, drv);

  // ---- foam (3 functional variants): coin variant with 0 coins → rewarded-ad offer ----
  let s = await toStage(page, drv, 'foam-spray');
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  expect(cardsOf(s)).toEqual(['foam-sprayer', 'foam-gun', 'foam-cannon']);
  noSkinUi(s);
  oneArea(s, info);
  await tapCardOf(page, drv, 'foam-gun');
  s = await waitFor(page, (x) => x.level.toolOffer && x.buttons?.['tool-offer-watch']?.visible, { label: 'coin ad offer' });
  await shot(page, info, 'variants-1-offer');
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await tap(page, drv, s.buttons['tool-offer-watch'], 700);
    s = await waitFor(page, (x) => x.buttons?.['tool-offer-watch']?.visible, { label: `offer after ${mode}` });
    expect(s.level.toolOffer).toBe(true);
    expect(s.level.tool.id).toBe('foam-sprayer');
    expect(s.level.toolCards.find((c) => c.tool === 'foam-gun').state).toBe('coins');
    expect(s.coins).toBe(0);
  }
  await setAd(page, 'earned');
  await tap(page, drv, s.buttons['tool-offer-watch'], 800);
  s = await waitFor(page, (x) => !x.level.toolOffer && x.level.tool.id === 'foam-gun', { label: 'unlocked by ad' });
  expect(s.coins).toBe(0);
  expect(s.level.toolCards.find((c) => c.tool === 'foam-gun').state).toBe('equipped');
  await shot(page, info, 'variants-2-foam-gun');

  // ---- scrub (4 variants): diamond purchase + a visual-only ad variant ----
  await playStage5(page, drv);
  s = await toStage(page, drv, 'scrub');
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  expect(cardsOf(s)).toEqual(['scrub-brush', 'scrub-brush-oval', 'drill-brush', 'scrub-wood']);
  noSkinUi(s);
  oneArea(s, info);
  const baseRadius = s.level.brush.effectiveRadius;
  await shot(page, info, 'variants-3-scrub-four');
  await tapCardOf(page, drv, 'drill-brush');
  s = await waitFor(page, (x) => x.level.tool.id === 'drill-brush', { label: 'drill (diamonds)' });
  expect(s.level.diamonds).toBe(1);
  expect(s.level.toolOffer).toBe(false); // diamonds: no ad offer
  await tapCardOf(page, drv, 'scrub-wood');
  s = await waitFor(page, (x) => x.level.tool.id === 'scrub-wood', { label: 'visual variant (ad)' });
  expect(s.level.tool.texture).toBe('tool-scrub-wood');
  expect(s.level.brush.effectiveRadius).toBe(baseRadius); // visual-only: plays like the base tool
  await shot(page, info, 'variants-4-scrub-wood');

  // ---- reload with 40 coins: persistence; a coin VISUAL variant with enough coins (squeegee) ----
  await seed(page, 'st.coins = 40;');
  await page.goto('/?qa=1&devAd=earned');
  await openRug(page, drv);
  s = await toStage(page, drv, 'foam-spray');
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  expect(s.level.tool.id).toBe('foam-gun');
  await playStage5(page, drv);
  s = await toStage(page, drv, 'scrub');
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  expect(s.level.tool.id).toBe('scrub-wood');
  expect(s.level.toolCards.map((c) => c.state)).toEqual(['owned', 'coins', 'owned', 'equipped']);

  await page.goto('/?qa=1&devAd=earned');
  await waitFor(page, (x) => x.scene === 'Menu');
  await openFromMenu(page, drv, 'bathtub');
  s = await toStage(page, drv, 'squeegee');
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  expect(cardsOf(s)).toEqual(['squeegee', 'pro-squeegee', 'gold-squeegee']);
  const sqRadius = s.level.brush.effectiveRadius;
  await tapCardOf(page, drv, 'pro-squeegee');
  s = await waitFor(page, (x) => x.level.tool.id === 'pro-squeegee', { label: 'pro squeegee (coins)' });
  expect(s.coins).toBe(25);
  expect(s.level.toolOffer).toBe(false);
  expect(s.level.brush.effectiveRadius).toBe(sqRadius);
  await shot(page, info, 'variants-5-squeegee-visual');

  // ---- laser: the base laser + 3 restored visual variants ----
  await page.goto('/?qa=1&devAd=earned');
  await waitFor(page, (x) => x.scene === 'Menu');
  await openFromMenu(page, drv, 'rusty-cleaver');
  s = await toStage(page, drv, 'laser');
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  expect(cardsOf(s)).toEqual(['laser', 'laser-redblack', 'laser-blue', 'laser-gold']);
  oneArea(s, info);
  const laserRadius = s.level.brush.effectiveRadius;
  await tapCardOf(page, drv, 'laser-blue');
  s = await waitFor(page, (x) => x.level.tool.id === 'laser-blue', { label: 'futuristic laser (ad)' });
  expect(s.level.tool.texture).toBe('tool-laser-blue');
  expect(s.level.brush.effectiveRadius).toBe(laserRadius);
  await shot(page, info, 'variants-6-laser');
  expect(errors).toEqual([]);
});
