import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Tool variety pass 2 — representative new tools in real gameplay (real mouse / touch, no full
// playthrough): the stage uses the new tool, a mid-stroke screenshot shows the effect at the working
// point, and the stage completes with ordinary strokes.
//   jet / effect: sandblaster (lawn mower) · scraper / contact: heavy scraper (lawn mower), razor
//   (aquarium glass) · rotary: spin scrubber (bathtub) · suction: wet/dry vacuum (vintage car) ·
//   airflow: blower debris (game controller) · large object: telescopic brush (carousel horse)
// Screenshots: project/screenshots/tools2/<project>/<level>-<stage>.png
// [stage, tool, effect event that must fire while it works (null = drawn by the tool: spin / wide head)]
const CASES = [
  ['lawn-mower', ['scrape', 'heavy-scraper', 'chips'], ['sandblast', 'sandblaster', 'grit']],
  ['aquarium', ['algae-scrape', 'razor-scraper', 'flakes']],
  ['bathtub', ['scrub', 'spin-scrubber', null]],
  ['vintage-car', ['vacuum', 'wet-vacuum', 'suck']],
  ['game-controller', ['blow', 'air-blower', 'blow']],
  ['carousel-horse', ['scrub', 'telescopic-brush', null]],
];

async function toStage(page, drv, id) {
  for (let i = 0; i < 14; i++) {
    const s = await waitFor(page, (x) => x.level && x.level.state === 'playing', { label: 'playing', timeout: 30000 });
    if (s.level.stageId === id) return s;
    await playStage5(page, drv);
  }
  throw new Error(`stage ${id} not reached`);
}

test('representative new tools work with their effects', async ({ page }, info) => {
  test.setTimeout(900_000);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [level, ...stages] of CASES) {
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (s) => s.scene === 'Menu');
    await openFromMenu(page, drv, level);
    await waitFor(page, (x) => x.level?.id === level && x.level.state === 'playing', { timeout: 30000 });
    for (const [stage, tool, fx] of stages) {
      let s = await toStage(page, drv, stage);
      expect(s.level.tool.id, `${level}/${stage}`).toBe(tool);
      const fx0 = fx ? s.level.fxLog[fx] ?? 0 : 0;
      await playStage5(page, drv, { mid: async () => page.screenshot({ path: `project/screenshots/tools2/${info.project.name}/${level}-${stage}.png` }) });
      s = await snap(page);
      expect(s.level.stageId !== stage || s.level.state !== 'playing').toBe(true);
      const events = fx ? (s.level.fxLog[fx] ?? 0) - fx0 : null;
      if (fx) expect(events, `${level}/${stage}: '${fx}' effect events`).toBeGreaterThan(5);
      console.log(level, stage, tool, 'completed', fx ? `${fx} events ${events}` : '');
    }
  }
  expect(errors).toEqual([]);
});

// Close-up of each new effect ON the object: the finger works in small circles at a point of the
// object (fraction of the object canvas) and the shot is clipped around the working point.
const CLOSE = [
  ['lawn-mower', 'sandblast', [0.42, 0.5]],
  ['bathtub', 'scrub', [0.5, 0.55]],
  ['vintage-car', 'vacuum', [0.36, 0.42]],
  ['game-controller', 'blow', [0.5, 0.45]],
  ['carousel-horse', 'scrub', [0.5, 0.45]],
  ['aquarium', 'algae-scrape', [0.5, 0.45]],
];

test('effect close-ups at the working point', async ({ page }, info) => {
  test.setTimeout(900_000);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  for (const [level, stage, [fx, fy]] of CLOSE) {
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (s) => s.scene === 'Menu');
    await openFromMenu(page, drv, level);
    const s = await toStage(page, drv, stage);
    const L = s.level;
    const p = { x: L.xf.cx + (fx - 0.5) * L.xf.size * L.xf.k, y: L.xf.cy + (fy - 0.5) * L.xf.size * L.xf.k };
    const jet = L.tool.kind === 'jet' ? L.tool.jet : { x: 0, y: 0 };
    const f = { x: p.x - jet.x - L.tool.workOffset.x, y: p.y - jet.y - L.tool.workOffset.y };
    // sweep across fresh dirt (event effects — suction specks, flakes — fire only while dirt is
    // actually removed), shoot in the middle of the sweep
    const vp = page.viewportSize();
    const span = Math.min(vp.width, vp.height) * 0.12;
    await drv.down(f.x - span, f.y);
    for (let i = 0; i <= 14; i++) {
      await drv.move(f.x - span + (i / 14) * span * 2, f.y + Math.sin(i) * 6);
      await page.waitForTimeout(25);
    }
    const half = Math.min(vp.width, vp.height) * 0.32;
    const clip = { x: Math.max(0, p.x - half), y: Math.max(0, p.y - half), width: Math.min(half * 2, vp.width - Math.max(0, p.x - half)), height: Math.min(half * 2.4, vp.height - Math.max(0, p.y - half)) };
    await page.screenshot({ path: `project/screenshots/tools2/${info.project.name}/close-${level}-${stage}.png`, clip });
    await drv.up();
  }
});
