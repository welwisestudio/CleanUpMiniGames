import { test } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, openFromMenu } from './helpers.js';

// Size pass visual check: the first screen of six representative levels after the runtime image
// optimization (phone + desktop). Screenshots: project/screenshots/step9-size/<project>/<id>.png
const IDS = ['soccer-ball', 'swimming-pool', 'keyboard', 'rusty-cleaver', 'vintage-motorcycle', 'vintage-car'];

test('optimized art: representative levels', async ({ page }, info) => {
  test.setTimeout(300_000);
  const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push(r.url()));
  await page.goto('/?qa=1&devStorage=memory');
  await waitFor(page, (s) => s.scene === 'Menu');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `project/screenshots/step9-size/${info.project.name}/menu.png` });
  for (const id of IDS) {
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (s) => s.scene === 'Menu');
    await openFromMenu(page, drv, id);
    await waitFor(page, (x) => x.level?.id === id && x.level.state === 'playing', { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `project/screenshots/step9-size/${info.project.name}/${id}.png` });
  }
  if (errors.length) throw new Error(errors.join('\n'));
});
