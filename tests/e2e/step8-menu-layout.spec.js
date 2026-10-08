import { test, expect } from '@playwright/test';
import { waitFor } from './helpers.js';

// Menu layout (Step 8 fix): the scrollable shelf list is centred on the screen as far as the chest
// column allows; no shelf / object / label reaches the column; 2 objects per row; scrolling kept.
// Screenshots: project/screenshots/step8b/menu-layout/<view>-{top,scrolled}.png
const VIEWS = [
  { name: 'phone-portrait', viewport: { width: 390, height: 844 }, mobile: true },
  { name: 'phone-landscape', viewport: { width: 844, height: 390 }, mobile: true },
  { name: 'desktop', viewport: { width: 1280, height: 800 }, mobile: false },
];

for (const v of VIEWS) {
  test(`menu layout ${v.name}: list centred, clear of the chest column`, async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop-mouse', 'own viewports; run once');
    const ctx = await browser.newContext({ viewport: v.viewport, isMobile: v.mobile, hasTouch: v.mobile, deviceScaleFactor: v.mobile ? 2 : 1 });
    const page = await ctx.newPage();
    await page.goto('/?qa=1&devStorage=memory');
    const s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-list'] && x.buttons?.['menu-level-soccer-ball']);
    const W = s.layout.W;
    const list = s.buttons['menu-list'];
    const chestRight = Math.max(...['menu-timed-chest', 'menu-progress-chest'].map((k) => s.buttons[k].x + s.buttons[k].w / 2));
    const left = list.x - list.w / 2;
    const right = list.x + list.w / 2;
    // objects (2 per row) inside the list
    const ids = Object.keys(s.buttons).filter((k) => k.startsWith('menu-level-'));
    const row0 = ids.slice(0, 2).map((k) => s.buttons[k].x);
    const groupCx = (row0[0] + row0[1]) / 2;
    console.log(`${v.name} W=${W} list ${left.toFixed(1)}–${right.toFixed(1)} centre ${list.x.toFixed(1)} (screen ${W / 2}) objects centre ${groupCx.toFixed(1)} chest column right ${chestRight.toFixed(1)} width ${list.w.toFixed(1)}`);
    expect(left).toBeGreaterThan(chestRight); // never under the chest column
    expect(right).toBeLessThanOrEqual(W);
    expect(row0[0]).toBeLessThan(row0[1]); // 2 per row
    expect(Math.abs(groupCx - list.x)).toBeLessThan(1);
    const dir = 'project/screenshots/step8b/menu-layout';
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/${v.name}-top.png` });
    // scrolled: the list passes the chest column without touching it
    await page.mouse.move(W / 2, s.layout.H * 0.7);
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/${v.name}-scrolled.png` });
    await ctx.close();
  });
}
