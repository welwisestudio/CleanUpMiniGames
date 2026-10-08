import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 7 alternative tools (focused): rug foam + scrub stages, real mouse / touch.
// Coins purchase, insufficient coins / diamonds, rewarded-ad cancel / fail / success, switching
// mid-stage without losing progress, switching back, reload persistence, diamond purchase, and the
// stage completing with the bought tool. Screenshots: project/screenshots/step7/<project>/
const KEY = 'cleanup-dev-save';
const setAd = (page, m) => page.evaluate((x) => window.__cleanupQA.platformDev.setRewardedOutcome(x), m);
const card = (s, tool) => s.level.toolCards.find((c) => c.tool === tool);

async function seed(page, src) {
  await page.evaluate(({ KEY, src }) => {
    const st = JSON.parse(localStorage.getItem(KEY) || '{}');
    // eslint-disable-next-line no-new-func
    new Function('st', src)(st);
    localStorage.setItem(KEY, JSON.stringify(st));
  }, { KEY, src });
}

async function tapCard(page, drv, tool) {
  const s = await waitFor(page, (x) => x.level?.toolCards?.find((c) => c.tool === tool)?.visible, { label: `card ${tool}` });
  const c = card(s, tool);
  await drv.tap(c.x, c.y);
  await page.waitForTimeout(250);
}

async function openRug(page, drv) {
  await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
  await pressButton(page, drv, 'menu-level-rug');
  await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageIndex === 0);
}

async function toStage(page, drv, id) {
  for (let i = 0; i < 8; i++) {
    const s = await waitFor(page, (x) => x.level && x.level.state === 'playing', { label: 'playing' });
    if (s.level.stageId === id) return s;
    await playStage5(page, drv);
  }
  throw new Error(`stage ${id} not reached`);
}

// a few real strokes over the upper part of the work area (partial progress)
async function partialStrokes(page, drv) {
  const s = await snap(page);
  const L = s.level;
  const toCss = (lx, ly) => ({ x: L.xf.cx + (lx - L.xf.size / 2) * L.xf.k, y: L.xf.cy + (ly - L.xf.size / 2) * L.xf.k });
  const pts = L.targets.points;
  const ys = [...new Set(pts.map(([, y]) => y))].sort((a, b) => a - b);
  const row = (y) => pts.filter(([, yy]) => yy === y).map(([x]) => x);
  const finger = (p) => (L.tool.kind === 'jet' ? { x: p.x - L.tool.jet.x - L.tool.workOffset.x, y: p.y - L.tool.jet.y - L.tool.workOffset.y } : { x: p.x - L.tool.workOffset.x, y: p.y - L.tool.workOffset.y });
  const y = ys[Math.floor(ys.length * 0.25)];
  const xs = row(y);
  const a = finger(toCss(Math.min(...xs), y));
  const b = finger(toCss(Math.max(...xs), y));
  await drv.down(a.x, a.y);
  for (let i = 1; i <= 24; i++) {
    await drv.move(a.x + ((b.x - a.x) * i) / 24, a.y);
    await page.waitForTimeout(25);
  }
  await drv.up();
  await page.waitForTimeout(300);
}

test('alternative tools: buy, ad unlock, switch mid-stage, persistence', async ({ page }, info) => {
  test.setTimeout(420_000);
  const tag = info.project.name;
  const dir = `project/screenshots/step7/${tag}`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.goto('/?qa=1&devAd=not-earned');
  await waitFor(page, (x) => x.scene === 'Menu');
  await seed(page, 'st.coins = 20; st.diamonds = 4; st.tools = { owned: [], equipped: {}, purchases: 0 };');
  await page.goto('/?qa=1&devAd=not-earned');
  await openRug(page, drv);

  // ---- foam stage ----
  let s = await toStage(page, drv, 'foam-spray');
  await page.waitForTimeout(500);
  s = await snap(page);
  expect(s.level.toolFamily).toBe('foam');
  expect(s.level.toolCards.map((c) => c.state)).toEqual(['equipped', 'coins', 'ad']);
  expect(s.level.tool.id).toBe('foam-sprayer');
  await page.screenshot({ path: `${dir}/01-foam-cards.png` });
  // coins purchase → equipped
  await tapCard(page, drv, 'foam-gun');
  s = await snap(page);
  expect(s.coins).toBe(5);
  expect(s.level.tool.id).toBe('foam-gun');
  expect(card(s, 'foam-gun').state).toBe('equipped');
  await tapCard(page, drv, 'foam-gun'); // tap the equipped card again: nothing charged
  expect((await snap(page)).coins).toBe(5);
  await page.screenshot({ path: `${dir}/02-foam-gun-equipped.png` });
  // partial progress, then switches must keep it exactly
  await partialStrokes(page, drv);
  const p1 = (await snap(page)).level.progress;
  expect(p1).toBeGreaterThan(0.03);
  await page.screenshot({ path: `${dir}/03-foam-partial.png` });
  for (const mode of ['not-earned', 'error']) {
    await setAd(page, mode);
    await tapCard(page, drv, 'foam-cannon');
    await waitFor(page, (x) => !x.pause.reasons.includes('adBusy') && card(x, 'foam-cannon')?.state === 'ad', { label: `ad ${mode} done` });
    s = await snap(page);
    expect(s.level.tool.id).toBe('foam-gun');
    expect(s.level.ownedTools).not.toContain('foam-cannon');
    expect(s.coins).toBe(5);
    expect(s.level.progress).toBe(p1);
  }
  await page.screenshot({ path: `${dir}/04-ad-cancelled.png` });
  await setAd(page, 'earned');
  await tapCard(page, drv, 'foam-cannon');
  s = await waitFor(page, (x) => x.level.tool.id === 'foam-cannon', { label: 'cannon equipped' });
  expect(s.level.ownedTools).toContain('foam-cannon');
  expect(s.level.progress).toBe(p1);
  expect(s.level.state).toBe('playing');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/05-foam-cannon-unlocked.png` });
  // switch back to another owned tool (free base), then to the foam gun: progress unchanged
  await tapCard(page, drv, 'foam-sprayer');
  s = await snap(page);
  expect(s.level.tool.id).toBe('foam-sprayer');
  expect(s.level.progress).toBe(p1);
  await tapCard(page, drv, 'foam-gun');
  s = await snap(page);
  expect(s.level.tool.id).toBe('foam-gun');
  expect(s.level.progress).toBe(p1);
  expect(s.coins).toBe(5);
  await page.screenshot({ path: `${dir}/06-switched-same-progress.png` });
  await playStage5(page, drv); // completes with the switched tool

  // ---- scrub stage: insufficient coins / diamonds; complete with the base brush ----
  s = await toStage(page, drv, 'scrub');
  await page.waitForTimeout(500);
  s = await snap(page);
  expect(s.level.toolCards.map((c) => c.state)).toEqual(['equipped', 'coins', 'diamonds']);
  await tapCard(page, drv, 'scrub-brush-oval');
  s = await snap(page);
  expect(s.coins).toBe(5);
  expect(s.level.tool.id).toBe('scrub-brush');
  await page.screenshot({ path: `${dir}/07-not-enough-coins.png` });
  await tapCard(page, drv, 'drill-brush');
  s = await snap(page);
  expect(s.level.diamonds).toBe(4);
  expect(s.level.tool.id).toBe('scrub-brush');
  await page.screenshot({ path: `${dir}/08-not-enough-diamonds.png` });
  await playStage5(page, drv); // base tool completes the stage

  // ---- reload: ownership + equipped persist; diamond purchase; finish scrub with the drill ----
  await seed(page, 'st.diamonds = 5;');
  await page.goto('/?qa=1&devAd=not-earned');
  await openRug(page, drv);
  s = await snap(page);
  expect(s.level.ownedTools.sort()).toEqual(['foam-cannon', 'foam-gun']);
  expect(s.level.equippedTools.foam).toBe('foam-gun');
  s = await toStage(page, drv, 'foam-spray');
  expect(s.level.tool.id).toBe('foam-gun');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/09-after-reload-owned.png` });
  await playStage5(page, drv);
  s = await toStage(page, drv, 'scrub');
  await page.waitForTimeout(400);
  await tapCard(page, drv, 'drill-brush');
  s = await snap(page);
  expect(s.level.diamonds).toBe(0);
  expect(s.level.tool.id).toBe('drill-brush');
  await page.screenshot({ path: `${dir}/10-drill-diamonds.png` });
  await playStage5(page, drv); // the diamond tool completes the same job
  s = await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageId !== 'scrub');
  expect(s.level.toolCards?.some((c) => c.visible)).toBeFalsy(); // no family on the next stage
  console.log(`TOOLS ${tag}: coins buy, insufficient coins / diamonds, ad cancel / fail / success, mid-stage switches kept progress ${p1.toFixed(3)}, switch back, reload persistence, diamond buy, stages completed with foam gun / base brush / drill`);
  expect(errors).toEqual([]);
});
