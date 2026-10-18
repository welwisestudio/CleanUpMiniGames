import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Systems / balance pass (2026-10-12), focused and with real mouse / touch input:
// Store (no real-money offers; 25-diamond ad; coin ad; a 3-ad bundle across a reload; cancel / fail),
// tool variants (unaffordable coin / diamond variant → ad badge on the card → unlock by ad),
// Wheel (first spin free, then ads, no cap, cancel / fail, layout bands), level access (coin unlock,
// ad unlock when short of coins, persistence), VIP (exactly three, spread, ad only) and outlines
// (continuous rings / zone contours). Screenshots: project/screenshots/systems/<project>/
const KEY = 'cleanup-dev-save';
const shot = (page, info, name, clip) => page.screenshot({ path: `project/screenshots/systems/${info.project.name}/${name}.png`, ...(clip ? { clip } : {}) });
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);
const adLog = (page) => page.evaluate(() => window.__cleanupQA.platformDev.rewardedLog.length);
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));
const overlapY = (a, b) => Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;

async function fresh(page, q = '') {
  await page.goto(`/?qa=1${q}`);
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto(`/?qa=1${q}`);
  return waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-wheel'], { label: 'menu' });
}

async function seed(page, src) {
  await page.evaluate(({ KEY, src }) => {
    const st = JSON.parse(localStorage.getItem(KEY) || '{}');
    // eslint-disable-next-line no-new-func
    new Function('st', src)(st);
    localStorage.setItem(KEY, JSON.stringify(st));
  }, { KEY, src });
}

// scrolls the Store list (drag / wheel) until the button is well inside the visible list, then taps it
async function storeTap(page, drv, id) {
  for (let i = 0; i < 30; i++) {
    const s = await waitFor(page, (x) => x.store && x.buttons?.[id], { label: `store button ${id}` });
    const b = s.buttons[id];
    const H = s.layout.H;
    if (b.y > H * 0.3 && b.y < H * 0.88) {
      await drv.tap(b.x, b.y);
      return;
    }
    const dir = b.y > H * 0.6 ? 1 : -1;
    if (drv.kind === 'touch') {
      const y0 = H * (dir > 0 ? 0.8 : 0.4);
      await drv.down(s.layout.W / 2, y0);
      for (let k = 1; k <= 6; k++) await drv.move(s.layout.W / 2, y0 - dir * k * 22);
      await drv.up();
    } else {
      await page.mouse.move(s.layout.W / 2, H * 0.6);
      await page.mouse.wheel(0, dir * 160);
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`could not reach ${id}`);
}

test('store: no real-money offers; 25-diamond ad; coin ad; a 3-ad bundle survives a reload; cancel / fail', async ({ page }, info) => {
  test.setTimeout(300_000);
  const drv = await driver(page, info);
  let s = await fresh(page);
  await pressButton(page, drv, 'menu-store');
  s = await waitFor(page, (x) => x.store && x.buttons?.['store-free-gems'], { label: 'store' });
  await page.waitForTimeout(400);
  await shot(page, info, 'store-01-top');
  // no real-money / test-purchase buttons anywhere
  const ids = Object.keys(s.buttons).filter((k) => k.startsWith('store-'));
  expect(ids.some((k) => k.includes('gems-25') || k.includes('gems-60'))).toBe(false);
  // diamonds: cancel / fail → nothing; success → +25 exactly once
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await storeTap(page, drv, 'store-free-gems');
    await page.waitForTimeout(600);
    s = await snap(page);
    expect(s.diamondsNow).toBe(0);
  }
  await setAd(page, 'earned');
  await storeTap(page, drv, 'store-free-gems');
  s = await waitFor(page, (x) => x.diamondsNow === 25, { label: '+25 diamonds' });
  await page.waitForTimeout(800);
  expect((await snap(page)).diamondsNow).toBe(25);
  // coins: one ad → +120
  await storeTap(page, drv, 'store-free-coins');
  s = await waitFor(page, (x) => x.coins === 120, { label: '+120 coins' });
  // bundle (3 ads): 1/3, a cancelled ad adds nothing, reload, 2/3, 3/3, claim once
  await storeTap(page, drv, 'store-bundle-coins');
  s = await waitFor(page, (x) => x.storeSave?.bundles?.['bundle-coins']?.progress === 1, { label: 'bundle 1/3' });
  await page.waitForTimeout(400);
  await shot(page, info, 'store-02-bundles-1of3');
  await setAd(page, 'not-earned');
  await storeTap(page, drv, 'store-bundle-coins');
  await page.waitForTimeout(700);
  expect((await snap(page)).storeSave.bundles['bundle-coins'].progress).toBe(1);
  await page.goto('/?qa=1&devAd=earned');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-store']);
  expect(s.storeSave.bundles['bundle-coins'].progress).toBe(1);
  await pressButton(page, drv, 'menu-store');
  for (const n of [2, 3]) {
    await storeTap(page, drv, 'store-bundle-coins');
    await waitFor(page, (x) => x.storeSave?.bundles?.['bundle-coins']?.progress === n, { label: `bundle ${n}/3` });
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(300);
  await shot(page, info, 'store-03-bundle-ready');
  const coins = (await snap(page)).coins;
  const ads = await adLog(page);
  await storeTap(page, drv, 'store-bundle-coins'); // CLAIM
  s = await waitFor(page, (x) => x.coins === coins + 500, { label: 'bundle claimed' });
  await storeTap(page, drv, 'store-bundle-coins'); // starts again: an ad, not a second claim
  await page.waitForTimeout(800);
  s = await snap(page);
  expect(s.coins).toBe(coins + 500);
  expect(s.storeSave.bundles['bundle-coins']).toMatchObject({ claims: 1, progress: 1 });
  expect(await adLog(page)).toBe(ads + 1);
});

test('tools: unaffordable coin / diamond variant shows the ad badge; a tap plays the ad and unlocks THAT variant', async ({ page }, info) => {
  test.setTimeout(600_000);
  const drv = await driver(page, info);
  await fresh(page);
  await seed(page, 'st.coins = 0; st.diamonds = 0;');
  await page.goto('/?qa=1&devAd=not-earned');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  await pressButton(page, drv, 'menu-level-rug');
  let s;
  for (let i = 0; i < 8; i++) {
    s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
    if (s.level.stageId === 'foam-spray') break;
    await playStage5(page, drv);
  }
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  const gun = () => s.level.toolCards.find((c) => c.tool === 'foam-gun');
  expect(gun()).toMatchObject({ state: 'coins', adFallback: true });
  await page.waitForTimeout(300);
  const c0 = s.level.toolCards[0];
  const cl = s.level.toolCards.at(-1);
  await shot(page, info, 'tools-01-ad-badge', { x: Math.max(0, c0.x - c0.w), y: Math.max(0, c0.y - c0.h * 1.2), width: Math.min(s.layout.W, cl.x - c0.x + c0.w * 2), height: c0.h * 2.4 });
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await drv.tap(gun().x, gun().y);
    await page.waitForTimeout(900);
    s = await snap(page);
    expect(s.level.tool.id).toBe('foam-sprayer');
    expect(gun()).toMatchObject({ state: 'coins', adFallback: true });
    expect([s.coins, s.level.diamonds]).toEqual([0, 0]);
  }
  await setAd(page, 'earned');
  await drv.tap(gun().x, gun().y);
  s = await waitFor(page, (x) => x.level.tool.id === 'foam-gun', { label: 'coin variant unlocked by ad' });
  expect(s.coins).toBe(0);
  expect(s.level.toolCards.find((c) => c.tool === 'foam-gun').state).toBe('equipped');
  // diamond variant (scrub stage: drill brush)
  await playStage5(page, drv);
  for (let i = 0; i < 6; i++) {
    s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
    if (s.level.stageId === 'scrub') break;
    await playStage5(page, drv);
  }
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  const drill = s.level.toolCards.find((c) => c.tool === 'drill-brush');
  expect(drill).toMatchObject({ state: 'diamonds', adFallback: true });
  await shot(page, info, 'tools-02-diamond-badge');
  await drv.tap(drill.x, drill.y);
  s = await waitFor(page, (x) => x.level.tool.id === 'drill-brush', { label: 'diamond variant unlocked by ad' });
  expect(s.level.diamonds).toBe(0);
  // affordable → a normal purchase, the price shows and no ad is played
  await seed(page, 'st.coins = 1000;');
  await page.goto('/?qa=1&devAd=earned');
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  await pressButton(page, drv, 'menu-level-rug');
  for (let i = 0; i < 8; i++) {
    s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
    if (s.level.stageId === 'scrub') break;
    await playStage5(page, drv);
  }
  s = await waitFor(page, (x) => x.level.toolCards?.every((c) => c.visible));
  const oval = s.level.toolCards.find((c) => c.tool === 'scrub-brush-oval');
  expect(oval).toMatchObject({ state: 'coins', adFallback: false });
  const ads = await adLog(page);
  await drv.tap(oval.x, oval.y);
  s = await waitFor(page, (x) => x.level.tool.id === 'scrub-brush-oval', { label: 'bought with coins' });
  expect(s.coins).toBe(1000 - oval.price);
  expect(await adLog(page)).toBe(ads);
});

test('wheel: first spin free, then every spin needs an ad (no cap); cancel / fail = no spin; clean layout', async ({ page }, info) => {
  test.setTimeout(300_000);
  const drv = await driver(page, info);
  await fresh(page);
  await setAd(page, 'not-earned');
  await pressButton(page, drv, 'menu-wheel');
  let s = await waitFor(page, (x) => x.wheel && x.buttons?.['wheel-spin'] && x.buttons?.['wheel-band-title'], { label: 'wheel' });
  await page.waitForTimeout(500);
  expect(s.wheel.free).toBe(true);
  // layout: title → subtitle → ribbon → pointer → (wheel) and the button → status never overlap
  s = await snap(page);
  const B = (id) => s.buttons[`wheel-band-${id}`];
  const order = ['title', 'sub', 'ribbon', 'pointer'];
  for (let i = 1; i < order.length; i++) {
    expect(B(order[i]).y, `${order[i]} below ${order[i - 1]}`).toBeGreaterThan(B(order[i - 1]).y);
    expect(overlapY(B(order[i]), B(order[i - 1])), `${order[i]} × ${order[i - 1]}`).toBe(false);
  }
  expect(Math.abs(B('title').x - s.layout.W / 2)).toBeLessThan(2); // centred
  expect(B('pointer').y + B('pointer').h / 2).toBeGreaterThan(B('wheel').y - B('wheel').h / 2); // tip reaches into the wheel
  expect(overlapY(B('button'), B('wheel'))).toBe(false);
  await shot(page, info, 'wheel-01-free');
  // free spin: no ad even though ads would fail
  const ads0 = await adLog(page);
  await pressButton(page, drv, 'wheel-spin');
  s = await waitFor(page, (x) => x.wheel?.state === 'result', { label: 'free spin result', timeout: 15000 });
  expect(s.wheel.landed).toBe(s.wheel.chosen);
  expect(await adLog(page)).toBe(ads0);
  expect(s.wheelSave.total).toBe(1);
  await pressButton(page, drv, 'wheel-collect');
  s = await waitFor(page, (x) => x.wheel?.state === 'idle' && x.wheel.free === false);
  await page.waitForTimeout(300);
  await shot(page, info, 'wheel-02-ad-spin');
  // second spin needs an ad: cancel / fail → no spin
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await pressButton(page, drv, 'wheel-spin');
    await page.waitForTimeout(700);
    s = await snap(page);
    expect(s.wheel.state).toBe('idle');
    expect(s.wheelSave.total).toBe(1);
  }
  // several ad spins in a row: no cap
  await setAd(page, 'earned');
  for (let n = 2; n <= 7; n++) {
    await pressButton(page, drv, 'wheel-spin');
    s = await waitFor(page, (x) => x.wheel?.state === 'result', { label: `ad spin ${n}`, timeout: 15000 });
    expect(s.wheel.landed).toBe(s.wheel.chosen);
    expect(s.wheelSave.total).toBe(n);
    await pressButton(page, drv, 'wheel-collect');
    await waitFor(page, (x) => x.wheel?.state === 'idle');
  }
  expect(await adLog(page)).toBe(ads0 + 2 + 6);
});

test('levels: on-card coin unlock, ad unlock when short of coins, gem levels, persistence; four VIP levels, ad only', async ({ page }, info) => {
  test.setTimeout(400_000);
  const drv = await driver(page, info);
  await fresh(page, '&locks=1');
  await seed(page, 'st.coins = 100; st.diamonds = 200;');
  await page.goto('/?qa=1&locks=1&devAd=earned');
  let s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  // VIP: four, spread through the list (15 · 26 · 37 · 48); gem levels: the last two
  expect(s.vipLevels).toEqual(['porcelain-vase', 'aquarium', 'vintage-motorcycle', 'carousel-horse']);
  const vipFlags = Object.entries(s.buttons).filter(([k, v]) => k.startsWith('menu-level-') && v.vip).map(([k]) => k.slice(11));
  expect(vipFlags.sort()).toEqual(['aquarium', 'carousel-horse', 'porcelain-vase', 'vintage-motorcycle']);
  const gemFlags = Object.entries(s.buttons).filter(([k, v]) => k.startsWith('menu-level-') && v.currency === 'gems').map(([k]) => k.slice(11));
  expect(gemFlags.sort()).toEqual(['vintage-car', 'vintage-tractor']);
  // coins: the rug (level 2, 40) with 100 coins → tap the card → bought on the card; 60 left
  await pressButton(page, drv, 'menu-level-rug');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.progression?.purchased?.includes('rug'), { label: 'rug bought' });
  expect(s.coins).toBe(60);
  // short of coins: Wooden Dresser (#25, 110) with 60 → the card's ad; cancel keeps it locked; success opens it
  await setAd(page, 'not-earned');
  await openFromMenu(page, drv, 'wooden-dresser');
  await page.waitForTimeout(1200);
  s = await snap(page);
  expect(s.progression.adUnlocked).toEqual([]);
  await setAd(page, 'earned');
  await openFromMenu(page, drv, 'wooden-dresser');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.progression?.adUnlocked?.includes('wooden-dresser'), { label: 'opened by ad', timeout: 30000 });
  expect(s.coins).toBe(60);
  // VIP (Aquarium, the new one): ad only — coins / gems untouched
  await openFromMenu(page, drv, 'aquarium');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.progression?.vipAds?.includes('aquarium'), { label: 'vip opened by ad', timeout: 30000 });
  expect([s.coins, s.diamondsNow]).toEqual([60, 200]);
  // gem level: Vintage Car (150 gems) with 200 → bought with gems; coins untouched
  await openFromMenu(page, drv, 'vintage-car');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.progression?.purchased?.includes('vintage-car'), { label: 'gem level bought', timeout: 30000 });
  expect([s.coins, s.diamondsNow]).toEqual([60, 50]);
  await page.waitForTimeout(400);
  await shot(page, info, 'levels-05-gem-levels');
  // Vintage Tractor (125) with 50 gems: no ad fallback — a message, the Store opens at diamonds
  const adsBefore = await adLog(page);
  await openFromMenu(page, drv, 'vintage-tractor');
  s = await waitFor(page, (x) => x.store, { label: 'store opens for gems', timeout: 15000 });
  expect(await adLog(page)).toBe(adsBefore);
  expect(s.progression.purchased).not.toContain('vintage-tractor');
  // reload: exactly the chosen levels are open (+ level 1), saved
  await page.goto('/?qa=1&locks=1');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  expect(s.progression).toMatchObject({ purchased: ['rug', 'vintage-car'], adUnlocked: ['wooden-dresser'], vipAds: ['aquarium'] });
  const st = (id) => s.buttons[`menu-level-${id}`].state;
  expect(['soccer-ball', 'rug', 'wooden-dresser', 'aquarium', 'vintage-car'].map(st)).toEqual(['open', 'open', 'open', 'open', 'open']);
  expect(['golden-trophy', 'porcelain-vase', 'vintage-tractor'].map(st)).toEqual(['locked', 'vip', 'locked']);
  // menu shots around each VIP level
  for (const id of ['porcelain-vase', 'aquarium', 'vintage-motorcycle', 'carousel-horse']) {
    for (let i = 0; i < 60; i++) {
      s = await snap(page);
      const b = s.buttons[`menu-level-${id}`];
      if (b.visible && b.y > s.layout.H * 0.3 && b.y < s.layout.H * 0.7) break;
      const dir = b.y > s.layout.H / 2 ? 1 : -1;
      if (drv.kind === 'touch') {
        const y0 = s.layout.H * (dir > 0 ? 0.8 : 0.35);
        await drv.down(s.layout.W / 2, y0);
        for (let k = 1; k <= 6; k++) await drv.move(s.layout.W / 2, y0 - dir * k * 30);
        await drv.up();
      } else {
        await page.mouse.move(s.layout.W / 2, s.layout.H * 0.7);
        await page.mouse.wheel(0, dir * 300);
      }
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(500);
    await shot(page, info, `levels-04-vip-${id}`);
  }
});

test('outlines: zone contours and target rings are continuous (screenshots)', async ({ page }, info) => {
  test.setTimeout(600_000);
  const drv = await driver(page, info);
  const cases = [['golden-trophy', 'detail-brush'], ['keyboard', 'crevice'], ['rusty-cleaver', 'laser'], ['garden-grill', 'scrape'], ['desk-fan', 'unscrew']];
  for (const [level, stage] of cases) {
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (x) => x.scene === 'Menu');
    await openFromMenu(page, drv, level);
    let s;
    for (let i = 0; i < 6; i++) {
      s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
      if (s.level.stageId === stage) break;
      await playStage5(page, drv);
    }
    expect(s.level.stageId).toBe(stage);
    await page.waitForTimeout(900);
    s = await snap(page);
    const L = s.level;
    const half = (L.xf.size / 2) * L.xf.k * 0.95;
    const clip = { x: Math.max(0, L.xf.cx - half), y: Math.max(0, L.xf.cy - half), width: Math.min(s.layout.W - Math.max(0, L.xf.cx - half), half * 2), height: Math.min(s.layout.H - Math.max(0, L.xf.cy - half), half * 2) };
    await shot(page, info, `outline-${level}-${stage}`, clip);
  }
});

test('paint: batched strokes land under the brush, inside the zone (partial progress shots)', async ({ page }, info) => {
  test.setTimeout(600_000);
  const drv = await driver(page, info);
  for (const [level, stage] of [['wooden-dresser', 'stain'], ['garden-bench', 'roll']]) {
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (x) => x.scene === 'Menu');
    await openFromMenu(page, drv, level);
    let s;
    for (let i = 0; i < 8; i++) {
      s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
      if (s.level.stageId === stage) break;
      await playStage5(page, drv);
    }
    expect(s.level.stageId).toBe(stage);
    await playStage5(page, drv, { maxPasses: 1 }).catch(() => {});
    s = await snap(page);
    expect(s.level.paintStats.batch).toBe(true);
    if (s.level.stageId === stage) expect(s.level.progress).toBeGreaterThan(0.05);
    await page.waitForTimeout(200);
    await shot(page, info, `paint-partial-${level}-${stage}`);
  }
});
