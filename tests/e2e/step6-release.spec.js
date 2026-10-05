import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, pressButton, snap } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 6 (second pass): stage completion waits for the player to let go.
// Every stage of every level is played with REAL mouse / touch input in hold mode: when the
// stage completes (manual 100 % or the 85 %+ gentle auto-complete) the pointer stays down.
// The stage must then sit in PENDING_RELEASE (bar runs to 100 %, tool still in the hand, no
// next stage) while the pointer keeps moving, and advance only after release.
// A mid-stroke screenshot of each stage shows the tool in use (orientation, foam stream).
// Screenshots: project/screenshots/step6/pass2/<project>/<level>-<nn>-<stage>-{mid,held}.png
const LEVELS = ['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker'];
for (const id of LEVELS) {
  test(`hold to release ${id}`, async ({ page }, info) => {
    test.setTimeout(480_000);
    const tag = info.project.name;
    const dir = `project/screenshots/step6/pass2/${tag}`;
    const log = [];
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?qa=1');
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
    const s0 = await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageIndex === 0, { label: 'level start' });
    let heldCount = 0;
    for (let i = 0; i < s0.level.stageCount; i++) {
      const st = await waitFor(page, (x) => x.level && ((x.level.state === 'playing' && x.level.stageIndex === i) || x.level.state === 'result'), { label: `stage ${i}`, timeout: 20000 });
      if (st.level.state === 'result') break;
      const name = `${id}-${String(i + 1).padStart(2, '0')}-${st.level.stageId}`;
      const r = await playStage5(page, drv, { hold: true, mid: () => page.screenshot({ path: `${dir}/${name}-mid.png` }) });
      if (!r.held) {
        // completed on release (drag-to-bin drops happen on release) — nothing to hold
        log.push(`${name}: completed on release`);
        continue;
      }
      heldCount += 1;
      const a = await snap(page);
      expect(a.level.state, `${name} should wait for release`).toBe('pendingRelease');
      expect(a.level.stageIndex).toBe(i);
      // keep holding and moving for ~1.2 s: still pending, same stage, tool still in the hand
      for (let k = 0; k < 6; k++) {
        await drv.move(r.held.x + (k % 2 ? 24 : -24), r.held.y + (k % 2 ? 10 : -10));
        await page.waitForTimeout(200);
      }
      const b = await snap(page);
      expect(b.level.state, `${name} advanced while the pointer was still down`).toBe('pendingRelease');
      expect(b.level.stageIndex).toBe(i);
      if (b.level.tool.kind !== 'target') expect(b.level.tool.shown, `${name} tool taken away mid-stroke`).toBe(true);
      await page.screenshot({ path: `${dir}/${name}-held.png` });
      const entry = b.level.stageLog[b.level.stageLog.length - 1];
      await drv.up();
      const c = await waitFor(page, (x) => x.level && ((x.level.state === 'playing' && x.level.stageIndex === i + 1) || x.level.state === 'result'), { label: `after release ${name}`, timeout: 15000 });
      log.push(`${name}: held 1.2 s in pendingRelease (${entry.autoCompleted ? 'gentle auto-complete' : 'manual 100 %'}), advanced after release → ${c.level.state === 'result' ? 'result' : c.level.stageId}`);
    }
    const result = await waitFor(page, (x) => x.level && x.level.state === 'result', { label: 'result card', timeout: 15000 });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${dir}/${id}-99-result.png` });
    console.log(log.map((l) => `HOLD ${tag} ${l}`).join(String.fromCharCode(10)));
    console.log(`HOLDSUM ${tag} ${id}: ${heldCount} stages held, ${result.level.levelSeconds?.toFixed(1)}s`);
    expect(heldCount).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}
