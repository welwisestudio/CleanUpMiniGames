import { test, expect } from '@playwright/test';
import { openGame, snap, waitFor, mouseDriver, touchDriver, pressButton, playStage, pointerFor } from './helpers.js';

// Visual benchmark capture + layout assertions on the project's viewport (phone portrait / desktop).
// Screenshots: project/screenshots/step3/<project>-*.png
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
const inside = (r, W, H) => r.x - r.w / 2 >= -1 && r.y - r.h / 2 >= -1 && r.x + r.w / 2 <= W + 1 && r.y + r.h / 2 <= H + 1;

test('visual benchmark: menu, gameplay (every stage), result', async ({ page }, info) => {
  const errors = [];
  const out = (name) => `project/screenshots/step3/${info.project.name}-${name}.png`;
  await openGame(page, errors);
  const touch = info.project.name.includes('touch');
  const drv = touch ? await touchDriver(page) : mouseDriver(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('1-menu') });

  await pressButton(page, drv, 'menu-level-soccer-ball');
  let s = await waitFor(page, (x) => x.level?.state === 'playing');
  // HUD blocks are on screen and don't overlap each other or the object
  const B = s.buttons;
  const { W, H } = s.layout;
  for (const id of ['hud-pills', 'hud-strip', 'hud-pause', 'object']) expect(inside(B[id], W, H), `${id} inside viewport`).toBe(true);
  expect(overlap(B['hud-pills'], B['hud-strip'])).toBe(false);
  expect(overlap(B['hud-strip'], B['hud-pause'])).toBe(false);
  expect(overlap(B['hud-pills'], B['hud-pause'])).toBe(false);
  expect(B.object.y - B.object.h / 2).toBeGreaterThanOrEqual(B['hud-strip'].y + B['hud-strip'].h / 2 - 1);
  expect(B['hud-pause'].w).toBeGreaterThanOrEqual(48); // comfortable touch target (CSS px)

  for (let i = 0; i < 6; i++) {
    s = await waitFor(page, (x) => x.level?.state === 'playing' && x.level.stageIndex === i);
    const { x: cx, y: cy, radius: R } = s.level.object;
    const tool = s.level.tool;
    const start = pointerFor(tool, { x: cx - R * 0.75, y: cy - R * 0.55 });
    await drv.down(start.x, start.y);
    for (let k = 0; k <= 50; k++) {
      const t = k / 50;
      const p = pointerFor(tool, { x: cx - R * 0.75 + Math.sin(t * 8) * R * 0.3, y: cy - R * 0.6 + t * R * 1.1 });
      await drv.move(p.x, p.y);
      if (tool.kind === 'jet') await page.waitForTimeout(14);
    }
    await page.waitForTimeout(60);
    await page.screenshot({ path: out(`2-stage${i + 1}-${s.level.stageId}`) });
    await drv.up();
    await playStage(page, drv);
  }
  await waitFor(page, (x) => x.level.state === 'result');
  await page.waitForTimeout(1600);
  await page.screenshot({ path: out('3-result') });
  s = await snap(page);
  for (const id of ['result-home', 'result-replay']) {
    expect(inside(s.buttons[id], W, H)).toBe(true);
    expect(s.buttons[id].h).toBeGreaterThanOrEqual(44);
  }
  expect(errors).toEqual([]);
});

// Responsive matrix (desktop project only): gameplay layout on other window sizes.
test('responsive matrix: HUD and object adapt without overlap or distortion', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-mouse', 'matrix runs once');
  const errors = [];
  await openGame(page, errors);
  const mouse = mouseDriver(page);
  await pressButton(page, mouse, 'menu-level-soccer-ball');
  for (const [w, h] of [[360, 640], [844, 390], [768, 1024], [1024, 1024], [1920, 1080], [2560, 1080]]) {
    await page.setViewportSize({ width: w, height: h });
    const s = await waitFor(page, (x) => x.layout && x.layout.W === w && x.layout.H === h && x.buttons?.object, { label: `layout ${w}x${h}` });
    const B = s.buttons;
    for (const id of ['hud-pills', 'hud-strip', 'hud-pause', 'object']) expect(inside(B[id], w, h), `${id} inside ${w}x${h}`).toBe(true);
    expect(overlap(B['hud-pills'], B['hud-strip']), `pills/strip ${w}x${h}`).toBe(false);
    expect(overlap(B['hud-strip'], B['hud-pause']), `strip/pause ${w}x${h}`).toBe(false);
    expect(B.object.w).toBeCloseTo(B.object.h, 3); // round object stays round (no stretching)
    expect(B['hud-pause'].w).toBeGreaterThanOrEqual(44);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `project/screenshots/step3/matrix-${w}x${h}.png` });
  }
  expect(errors).toEqual([]);
});
