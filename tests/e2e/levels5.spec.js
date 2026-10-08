import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Step 5: every level played through with real input; Replay and Next verified; screenshots.
const LEVELS = ['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker'];
const STAGES = {
  'soccer-ball': ['chisel', 'dry-brush', 'foam-spray', 'scrub', 'rinse', 'dry'],
  rug: ['rinse-dirt', 'squeegee-1', 'foam-spray', 'scrub', 'rinse', 'squeegee-2'],
  'golden-trophy': ['chisel', 'dry-brush', 'detail-brush', 'wet', 'foam-spray', 'scrub', 'rinse', 'dry'],
  chair: ['trash', 'dust-chair', 'dust-seat', 'foam-can', 'scrub', 'wipe-seat', 'putty', 'sand', 'stain'],
  sneaker: ['chisel', 'rinse-mud', 'foam-spray', 'scrub', 'rinse', 'dry', 'erase'],
};

async function openFromMenu(page, drv, id) {
  for (let i = 0; i < 10; i++) {
    const s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.[`menu-level-${id}`]);
    if (s.buttons[`menu-level-${id}`].visible) break;
    // scroll the list with a real drag (touch) or the wheel (mouse)
    if (drv.kind === 'touch') {
      await drv.down(s.layout.W / 2, s.layout.H * 0.8);
      for (let k = 1; k <= 8; k++) await drv.move(s.layout.W / 2, s.layout.H * 0.8 - k * 25);
      await drv.up();
    } else {
      await page.mouse.move(s.layout.W / 2, s.layout.H * 0.7);
      await page.mouse.wheel(0, 200);
    }
    await page.waitForTimeout(400);
  }
  await pressButton(page, drv, `menu-level-${id}`);
}

for (const [i, id] of LEVELS.entries()) {
  test(`level ${i + 1} ${id}: all stages by real input, result, Replay, Next`, async ({ page }, info) => {
    test.setTimeout(420_000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/?qa=1');
    await waitFor(page, (s) => s.scene === 'Menu');
    const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
    const tag = info.project.name;
    await openFromMenu(page, drv, id);
    const { order, result } = await playLevel5(page, drv);
    expect(order).toEqual(STAGES[id]);
    expect(result.levels[id].completed).toBe(true);
    console.log(`${tag} ${id} seconds ${result.level.levelSeconds?.toFixed(1)} stages ${JSON.stringify(result.level.stageLog.map((x) => [x.id, +x.seconds.toFixed(1)]))}`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `project/screenshots/step5/${tag}-${i + 1}-${id}-result.png` });
    // Replay restarts the same level at stage 1
    const run = result.level.runId;
    const next = LEVELS[i + 1] ?? 'rain-boots'; // Step 8: level 5 → level 6
    expect(result.buttons['result-next']).toBeDefined();
    await pressButton(page, drv, 'result-replay');
    const again = await waitFor(page, (s) => s.level?.runId !== run && s.level?.state === 'playing');
    expect(again.level.id).toBe(id);
    expect(again.level.stageIndex).toBe(0);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `project/screenshots/step5/${tag}-${i + 1}-${id}-start.png` });
    // Next (from the replayed run's result) opens the next object in menu order
    if (next) {
      const r2 = await playLevel5(page, drv);
      expect(r2.result.level.id).toBe(id);
      await page.waitForTimeout(1300);
      await pressButton(page, drv, 'result-next');
      const n = await waitFor(page, (s) => s.level?.id === next && s.level.state === 'playing');
      expect(n.level.stageIndex).toBe(0);
    }
    expect(errors).toEqual([]);
  });
}
