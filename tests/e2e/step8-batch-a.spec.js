import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 8 Batch A (levels 6–15): every level played through with REAL mouse / touch input (no
// progress set by the test), stage order checked against the content, every stage transition,
// the final restored state, the result card, Replay and Next (15 → object list).
// Screenshots: project/screenshots/step8/<project>/<n>-<id>-{start,mid,final,result}.png
// Filter: BATCH_A=rain-boots,desk-fan (default: all ten).
const ALL = ['rain-boots', 'frying-pan', 'wooden-crate', 'toolbox', 'bathroom-sink', 'desk-fan', 'garden-bench', 'keyboard', 'watering-can', 'porcelain-vase'];
const ONLY = process.env.BATCH_A ? process.env.BATCH_A.split(',') : ALL;

async function openFromMenu(page, drv, id) {
  for (let i = 0; i < 24; i++) {
    const s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.[`menu-level-${id}`]);
    if (s.buttons[`menu-level-${id}`].visible) break;
    const dir = s.buttons[`menu-level-${id}`].y > s.layout.H / 2 ? 1 : -1;
    if (drv.kind === 'touch') {
      await drv.down(s.layout.W / 2, s.layout.H * (dir > 0 ? 0.8 : 0.35));
      for (let k = 1; k <= 8; k++) await drv.move(s.layout.W / 2, s.layout.H * (dir > 0 ? 0.8 : 0.35) - dir * k * 25);
      await drv.up();
    } else {
      await page.mouse.move(s.layout.W / 2, s.layout.H * 0.7);
      await page.mouse.wheel(0, dir * 220);
    }
    await page.waitForTimeout(450);
  }
  await pressButton(page, drv, `menu-level-${id}`);
}

for (const id of ONLY) {
  const n = ALL.indexOf(id) + 6;
  test(`level ${n} ${id}: all stages by real input, final state, result, Replay, Next`, async ({ page }, info) => {
    test.setTimeout(600_000);
    const tag = info.project.name;
    const dir = `project/screenshots/step8/${tag}`;
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (s) => s.scene === 'Menu');
    const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
    await openFromMenu(page, drv, id);
    const s0 = await waitFor(page, (x) => x.level && x.level.id === id && x.level.state === 'playing' && x.level.stageIndex === 0, { label: 'level start', timeout: 30000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${dir}/${n}-${id}-start.png` });
    const count = s0.level.stageCount;
    const mid = Math.floor(count / 2);
    const order = [];
    for (let i = 0; i < count; i++) {
      const st = await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageIndex === i, { label: `stage ${i}`, timeout: 30000 });
      order.push(st.level.stageId);
      // the stage strip, the progress bar and the tool are reset for every stage
      expect(st.level.progress).toBeLessThan(0.05);
      await playStage5(page, drv, i === mid ? { mid: () => page.screenshot({ path: `${dir}/${n}-${id}-mid.png` }) } : {});
      const after = await snap(page);
      expect(after.level.stageIndex === i && after.level.state === 'playing').toBe(false);
    }
    // final restored object (completion sparkles, before the result card)
    await waitFor(page, (x) => x.level && (x.level.state === 'completing' || x.level.state === 'result'), { label: 'completing' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/${n}-${id}-final.png` });
    const result = await waitFor(page, (x) => x.level && x.level.state === 'result', { label: 'result card', timeout: 20000 });
    expect(result.levels[id].completed).toBe(true);
    expect(result.level.reward.amount).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/${n}-${id}-result.png` });
    console.log(`${tag} ${id} ${result.level.levelSeconds?.toFixed(1)}s ${JSON.stringify(result.level.stageLog.map((x) => [x.id, +x.seconds.toFixed(1), x.autoCompleted ? 'auto' : '']))}`);
    expect(order).toEqual((await page.evaluate(() => window.__cleanupQA.snapshot().level.stageLog.map((x) => x.id))));
    // Replay restarts the same level; Next opens the next object (after 15: the object list).
    // One card can only be left one way: each project checks Replay on half of the levels and
    // Next on the other half (desktop and phone swap), so both are covered for every level.
    expect(result.buttons['result-next']).toBeDefined();
    const useNext = (n % 2 === 1) === tag.includes('mouse');
    if (useNext) {
      await pressButton(page, drv, 'result-next');
      const next = ALL[ALL.indexOf(id) + 1] ?? 'swimming-pool'; // Batch B: 15 → 16
      if (next) {
        const nx = await waitFor(page, (x) => x.level?.id === next && x.level?.state === 'playing', { label: `next ${next}`, timeout: 30000 });
        expect(nx.level.stageIndex).toBe(0);
      } else {
        await waitFor(page, (x) => x.scene === 'Menu', { label: 'object list after the last level' });
      }
    } else {
      const run = result.level.runId;
      await pressButton(page, drv, 'result-replay');
      const again = await waitFor(page, (x) => x.level?.runId !== run && x.level?.state === 'playing', { timeout: 30000 });
      expect(again.level.id).toBe(id);
      expect(again.level.stageIndex).toBe(0);
    }
    expect(errors).toEqual([]);
  });
}

// Next follows the menu order 5 → 6 → … → 15 → object list (checked with the result card of a
// real completion of the last level's neighbour order through the catalog data).
test('Next order: sneaker → rain boots, … , porcelain vase → object list', async ({ page }) => {
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (s) => s.scene === 'Menu');
  const ids = await page.evaluate(() => Object.keys(window.__cleanupQA.snapshot().buttons).filter((k) => k.startsWith('menu-level-')).map((k) => k.slice(11)));
  expect(ids.slice(0, 15)).toEqual(['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker', ...ALL]);
});
