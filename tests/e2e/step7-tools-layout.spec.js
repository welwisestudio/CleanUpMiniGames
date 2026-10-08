import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, pressButton, snap } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 7 alternative tools — layout and pause (focused): the cards stay inside the screen and clear
// of the HUD and the object on landscape phone, tablet and a small phone; taps while paused do
// nothing. Screenshots: project/screenshots/step7/responsive/
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 1 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;
const inside = (r, s) => r.x - r.w / 2 >= -1 && r.y - r.h / 2 >= -1 && r.x + r.w / 2 <= s.layout.W + 1 && r.y + r.h / 2 <= s.layout.H + 1;

test('tool cards: responsive layout and pause', async ({ page }, info) => {
  test.skip(!info.project.name.includes('desktop'), 'viewports set explicitly');
  test.setTimeout(300_000);
  const dir = 'project/screenshots/step7/responsive';
  // [name, w, h, expected layout]: phones (any orientation) → bottom row; desktop → right column
  for (const [name, w, h, want] of [['phone-portrait', 390, 844, 'row'], ['phone-landscape', 844, 390, 'row'], ['phone-small', 360, 640, 'row'], ['tablet', 768, 1024, 'row'], ['desktop', 1280, 800, 'column']]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/?qa=1&devStorage=memory');
    const drv = mouseDriver(page);
    await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-rug']);
    await pressButton(page, drv, 'menu-level-rug');
    for (let i = 0; i < 2; i++) {
      await waitFor(page, (x) => x.level?.state === 'playing' && x.level.stageIndex === i);
      await playStage5(page, drv);
    }
    const s = await waitFor(page, (x) => x.level?.state === 'playing' && x.level.stageId === 'foam-spray' && x.level.toolCards?.[0]?.visible);
    await page.waitForTimeout(500);
    const q = await snap(page);
    for (const c of q.level.toolCards) {
      expect(inside(c, q), `${name}: card ${c.tool} inside`).toBe(true);
      for (const o of ['hud-pills', 'hud-strip', 'hud-pause', 'hud-timed-chest', 'hud-progress-chest', 'object']) if (q.buttons[o]) expect(overlap(c, q.buttons[o]), `${name}: card ${c.tool} × ${o}`).toBe(false);
    }
    const cards = q.level.toolCards;
    const obj = q.buttons.object;
    if (want === 'row') {
      expect(Math.max(...cards.map((c) => c.y)) - Math.min(...cards.map((c) => c.y)), `${name}: one row`).toBeLessThan(2);
      for (const c of cards) expect(c.y - c.h / 2, `${name}: card below the object`).toBeGreaterThan(obj.y + obj.h / 2);
      expect(Math.max(...cards.map((c) => c.y + c.h / 2)), `${name}: at the bottom`).toBeGreaterThan(q.layout.H * 0.8);
      for (const c of cards) expect(c.w, `${name}: tappable`).toBeGreaterThanOrEqual(48);
    } else {
      expect(Math.max(...cards.map((c) => c.x)) - Math.min(...cards.map((c) => c.x)), `${name}: one column`).toBeLessThan(2);
      expect(cards[0].x, `${name}: right side`).toBeGreaterThan(obj.x + obj.w / 2);
    }
    await page.screenshot({ path: `${dir}/foam-${name}.png` });
    if (name === 'tablet') {
      // paused: a card tap changes nothing
      await pressButton(page, drv, 'hud-pause');
      await waitFor(page, (x) => x.level.pauseModal);
      const before = (await snap(page)).level;
      const c = before.toolCards[1];
      await drv.tap(c.x, c.y);
      await page.waitForTimeout(400);
      const after = (await snap(page)).level;
      expect(after.tool.id).toBe(before.tool.id);
      expect(after.ownedTools).toEqual(before.ownedTools);
      await pressButton(page, drv, 'pause-resume');
    }
    console.log(`TOOLSLAYOUT ${name}: ${want}, ${q.level.toolCards.length} cards inside, no overlap with HUD / object (${q.level.toolCards[0].w.toFixed(0)} px wide)`);
    expect(s.level.toolFamily).toBe('foam');
  }
});
