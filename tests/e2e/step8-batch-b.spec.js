import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 8 Batch B (levels 16–50): every level played through with REAL mouse / touch input (no
// progress set by the test), stage order checked against the content, the final restored state,
// the result card, Replay or Next (alternating per project), 50 → object list.
// Screenshots: project/screenshots/step8b/<project>/<n>-<id>-{start,mid,final,result}.png
// Filter: BATCH_B=swimming-pool,vintage-car (default: all 35).
const ALL = [
  'swimming-pool', 'leather-jacket', 'rusty-cleaver', 'toaster', 'coir-doormat', 'garden-grill', 'bathtub', 'retro-radio', 'stone-lion', 'wooden-dresser',
  'aquarium', 'backpack', 'kitchen-stove', 'lawn-mower', 'street-sign', 'table-lamp', 'rowboat', 'game-controller', 'iron-gate', 'sofa',
  'stone-fountain', 'vintage-motorcycle', 'pocket-watch', 'upright-piano', 'knight-armor',
  'cannon', 'shower-cabin', 'bicycle', 'rider-statue', 'chandelier', 'royal-throne', 'stone-patio', 'carousel-horse', 'vintage-tractor', 'vintage-car',
];
const ONLY = process.env.BATCH_B ? process.env.BATCH_B.split(',') : ALL;
const SHOTS = process.env.SHOTS !== '0';

export async function openFromMenu(page, drv, id) {
  for (let i = 0; i < 80; i++) {
    const s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.[`menu-level-${id}`]);
    const b = s.buttons[`menu-level-${id}`];
    if (b.visible && b.y > s.layout.H * 0.2 && b.y < s.layout.H * 0.85) break;
    const dir = b.y > s.layout.H / 2 ? 1 : -1;
    const far = Math.abs(b.y - s.layout.H / 2) > s.layout.H;
    if (drv.kind === 'touch') {
      const y0 = s.layout.H * (dir > 0 ? 0.82 : 0.32);
      await drv.down(s.layout.W / 2, y0);
      for (let k = 1; k <= 8; k++) await drv.move(s.layout.W / 2, y0 - dir * k * (far ? 50 : 25));
      await drv.up();
    } else {
      await page.mouse.move(s.layout.W / 2, s.layout.H * 0.7);
      await page.mouse.wheel(0, dir * (far ? 900 : 220));
    }
    await page.waitForTimeout(far ? 250 : 450);
  }
  await pressButton(page, drv, `menu-level-${id}`);
}

for (const id of ONLY) {
  const n = ALL.indexOf(id) + 16;
  test(`level ${n} ${id}: all stages by real input, final state, result, Replay / Next`, async ({ page }, info) => {
    test.setTimeout(900_000);
    const tag = info.project.name;
    const dir = `project/screenshots/step8b/${tag}`;
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('requestfailed', (r) => errors.push(`request failed ${r.url()}`));
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (s) => s.scene === 'Menu');
    const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
    await openFromMenu(page, drv, id);
    const s0 = await waitFor(page, (x) => x.level && x.level.id === id && x.level.state === 'playing' && x.level.stageIndex === 0, { label: 'level start', timeout: 30000 });
    await page.waitForTimeout(900);
    if (SHOTS) await page.screenshot({ path: `${dir}/${n}-${id}-start.png` });
    const count = s0.level.stageCount;
    const mid = Math.floor(count / 2);
    const order = [];
    for (let i = 0; i < count; i++) {
      const st = await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageIndex === i, { label: `stage ${i}`, timeout: 30000 });
      order.push(st.level.stageId);
      expect(st.level.progress).toBeLessThan(0.05);
      await playStage5(page, drv, i === mid && SHOTS ? { mid: () => page.screenshot({ path: `${dir}/${n}-${id}-mid.png` }) } : {});
      const after = await snap(page);
      expect(after.level.stageIndex === i && after.level.state === 'playing', `${id} stage ${i} ${st.level.stageId} not finished`).toBe(false);
    }
    await waitFor(page, (x) => x.level && (x.level.state === 'completing' || x.level.state === 'result'), { label: 'completing' });
    await page.waitForTimeout(500);
    if (SHOTS) await page.screenshot({ path: `${dir}/${n}-${id}-final.png` });
    const result = await waitFor(page, (x) => x.level && x.level.state === 'result', { label: 'result card', timeout: 20000 });
    expect(result.levels[id].completed).toBe(true);
    expect(result.level.reward.amount).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    if (SHOTS) await page.screenshot({ path: `${dir}/${n}-${id}-result.png` });
    console.log(`${tag} ${id} ${result.level.levelSeconds?.toFixed(1)}s ${JSON.stringify(result.level.stageLog.map((x) => [x.id, +x.seconds.toFixed(1), x.autoCompleted ? 'auto' : '']))}`);
    expect(order).toEqual(await page.evaluate(() => window.__cleanupQA.snapshot().level.stageLog.map((x) => x.id)));
    expect(result.buttons['result-next']).toBeDefined();
    const useNext = id === 'vintage-car' || (n % 2 === 1) === tag.includes('mouse');
    if (useNext) {
      await pressButton(page, drv, 'result-next');
      const next = ALL[ALL.indexOf(id) + 1];
      if (next) {
        const nx = await waitFor(page, (x) => x.level?.id === next && x.level?.state === 'playing', { label: `next ${next}`, timeout: 30000 });
        expect(nx.level.stageIndex).toBe(0);
      } else {
        await waitFor(page, (x) => x.scene === 'Menu', { label: 'object list after level 50' });
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

test('menu lists 50 objects in campaign order; level 50 is reachable by scrolling', async ({ page }, info) => {
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (s) => s.scene === 'Menu');
  const ids = await page.evaluate(() => Object.keys(window.__cleanupQA.snapshot().buttons).filter((k) => k.startsWith('menu-level-')).map((k) => k.slice(11)));
  expect(ids).toHaveLength(50);
  expect(ids.slice(15)).toEqual(ALL);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  await page.screenshot({ path: `project/screenshots/step8b/${info.project.name}/menu-top.png` });
  // scroll to the middle and to the end of the list
  for (const [id, name] of [['stone-fountain', 'menu-middle'], ['vintage-car', 'menu-end']]) {
    for (let i = 0; i < 80; i++) {
      const s = await snap(page);
      const b = s.buttons[`menu-level-${id}`];
      if (b.visible && b.y > s.layout.H * 0.2 && b.y < s.layout.H * 0.85) break;
      if (drv.kind === 'touch') {
        await drv.down(s.layout.W / 2, s.layout.H * 0.82);
        for (let k = 1; k <= 8; k++) await drv.move(s.layout.W / 2, s.layout.H * 0.82 - k * 50);
        await drv.up();
      } else {
        await page.mouse.move(s.layout.W / 2, s.layout.H * 0.7);
        await page.mouse.wheel(0, 600);
      }
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(700);
    await page.screenshot({ path: `project/screenshots/step8b/${info.project.name}/${name}.png` });
  }
});
