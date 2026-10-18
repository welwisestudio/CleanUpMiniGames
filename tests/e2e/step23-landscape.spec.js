import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton } from './helpers.js';
import { playStage5 } from './level-play.js';

// 16:9 landscape (2026-10-18): phones held sideways (845 × 390, touch) and an embedded 16:9 player
// (1058 × 419, mouse). The menu is not oversized, the object is large and fully cleanable (a whole
// level played with real input — every stage, so every edge must be reachable), the HUD is compact
// and its buttons keep a ≥ 48 CSS px tap area. Screenshots: project/screenshots/landscape/
const SIZES = [
  { name: 'phone-landscape-845x390', viewport: { width: 845, height: 390 }, touch: true },
  { name: 'embed-16x9-1058x419', viewport: { width: 1058, height: 419 }, touch: false },
];

for (const sz of SIZES) {
  test.describe(sz.name, () => {
    test.use({ viewport: sz.viewport, hasTouch: sz.touch, isMobile: sz.touch, deviceScaleFactor: sz.touch ? 2 : 1 });

    test(`${sz.name}: compact menu, large object, compact HUD; the whole first level is playable`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop-mouse', 'own viewports; run once');
      test.setTimeout(400_000);
      const drv = sz.touch ? await touchDriver(page) : mouseDriver(page);
      const shot = (n) => page.screenshot({ path: `project/screenshots/landscape/${sz.name}-${n}.png` });
      await page.goto('/?qa=1&devStorage=memory');
      let s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-level-soccer-ball']);
      const card = s.buttons['menu-level-soccer-ball'];
      expect(s.layout.u / s.layout.dpr).toBeLessThan(0.8); // the short-landscape UI unit
      expect(card.h).toBeLessThan(s.layout.H * 0.36); // menu objects no longer oversized
      expect(card.visible).toBe(true);
      await page.waitForTimeout(500);
      await shot('menu');
      await pressButton(page, drv, 'menu-level-soccer-ball');
      s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
      expect(s.level.object.radius * 2).toBeGreaterThan(s.layout.H * 0.4); // object large and readable
      expect(s.layout.hudBottom / s.layout.dpr).toBeLessThan(s.layout.H * 0.25); // compact HUD
      const pause = s.buttons['hud-pause'];
      expect(Math.min(pause.tapW, pause.tapH)).toBeGreaterThanOrEqual(47.5); // tap area ≥ 48 CSS px (drawn smaller)
      await page.waitForTimeout(400);
      await shot('level');
      for (let i = 0; i < 10; i++) {
        const st = await waitFor(page, (x) => (x.level && x.level.state === 'playing') || x.scene === 'MiniGame' || x.level?.state === 'result', { timeout: 60000 });
        if (st.scene === 'MiniGame' || st.level?.state === 'result') break;
        await playStage5(page, drv);
        if (i === 1) await shot('level-mid');
      }
      s = await waitFor(page, (x) => x.scene === 'MiniGame' && x.minigame?.state === 'play', { label: 'level cleaned → minigame', timeout: 30000 });
      await page.waitForTimeout(500);
      await shot('minigame');
      await pressButton(page, drv, 'minigame-skip');
      s = await waitFor(page, (x) => x.level?.state === 'result', { label: 'Completed', timeout: 30000 });
      await page.waitForTimeout(900);
      await shot('completed');
      expect(s.levels['soccer-ball'].completed).toBe(true);
    });
  });
}
