import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Step 6 review: every stage of every level, screenshot ~1.9 s after the stage starts (first-time
// hint visible, active-area outline, tool orientation), then played by real input to the result.
// Screenshots: project/screenshots/step6/<project>/<level>-<nn>-<stage>.png
const LEVELS = ['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker'];
for (const id of LEVELS) {
  test(`review ${id}`, async ({ page }, info) => {
    test.setTimeout(480_000);
    const tag = info.project.name;
    const hintLog = [];
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?qa=1&hints=always');
    await waitFor(page, (s) => s.scene === 'Menu');
    const drv = tag.includes('touch') ? await touchDriver(page) : mouseDriver(page);
    for (let i = 0; i < 10; i++) {
      const s = await waitFor(page, (x) => x.buttons?.[`menu-level-${id}`]);
      if (s.buttons[`menu-level-${id}`].visible) break;
      await page.mouse.move(s.layout.W / 2, s.layout.H * 0.6);
      await page.mouse.wheel(0, 250);
      await page.waitForTimeout(350);
    }
    await pressButton(page, drv, `menu-level-${id}`);
    const { result } = await playLevel5(page, drv, {
      onStage: async (L) => {
        // sample the hint hand for ~2.4 s: contact-tool hints must stay on the active area
        const samples = [];
        let info = null;
        for (let i = 0; i < 24; i++) {
          const s = await page.evaluate(() => window.__cleanupQA.snapshot());
          info = s.level;
          if (s.level.hintHand) samples.push(s.level.hintHand);
          await page.waitForTimeout(100);
          if (i === 17) await page.screenshot({ path: `project/screenshots/step6/${tag}/${id}-${String(L.stageIndex + 1).padStart(2, '0')}-${L.stageId}.png` });
        }
        if (samples.length > 3 && info.targets?.kind === 'area' && info.tool.kind === 'contact') {
          const xf = info.xf;
          const loc = samples.map((p) => ({ x: (p.x - xf.cx) / xf.k + xf.size / 2, y: (p.y - xf.cy) / xf.k + xf.size / 2 }));
          const pts = info.targets.points;
          const tol = info.targets.step * 2.2;
          const outside = loc.filter((q) => !pts.some(([x, y]) => Math.abs(x - q.x) <= tol && Math.abs(y - q.y) <= tol));
          const dx = Math.max(...loc.map((q) => q.x)) - Math.min(...loc.map((q) => q.x));
          const dy = Math.max(...loc.map((q) => q.y)) - Math.min(...loc.map((q) => q.y));
          hintLog.push(`${id}/${L.stageId}: ${samples.length} samples, outside ${outside.length} ${JSON.stringify(outside.map((q) => [Math.round(q.x), Math.round(q.y)]))}, span x ${dx.toFixed(0)} y ${dy.toFixed(0)}`);
          if (outside.length) console.log("HINTFAIL", hintLog[hintLog.length - 1], JSON.stringify(loc.map((q) => [Math.round(q.x), Math.round(q.y)])));
          expect(outside.length, `${id}/${L.stageId} hint left the active area`).toBe(0);
        } else hintLog.push(`${id}/${L.stageId}: ${samples.length} samples (${info.targets?.kind}, ${info.tool.kind})`);
      },
    });
    console.log(hintLog.map((l) => `HINT ${tag} ${l}`).join(String.fromCharCode(10)));
    console.log(`${tag} ${id} ${result.level.levelSeconds?.toFixed(1)}s ${JSON.stringify(result.level.stageLog.map((x) => [x.id, +x.seconds.toFixed(1)]))}`);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `project/screenshots/step6/${tag}/${id}-99-result.png` });
    expect(errors).toEqual([]);
  });
}
