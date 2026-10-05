import { test } from '@playwright/test';
import fs from 'node:fs';
import { waitFor, touchDriver, pressButton } from './helpers.js';
import { playLevel5 } from './level-play.js';

// Step 4 record: frames of the completed Soccer Ball level on a phone viewport (real touch input,
// first-time hand hints visible), captured with the Chrome DevTools screencast. The frames are
// encoded into project/videos/step4-soccer-ball.mp4 afterwards (ffmpeg; Playwright's own video
// recorder needs a separate ffmpeg download that is blocked on this machine).
test('record Soccer Ball gameplay frames', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone-touch', 'recorded once');
  test.setTimeout(400_000);
  const dir = 'test-results/step4-frames';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  const cdp = await page.context().newCDPSession(page);
  cdp.on('Page.screencastFrame', async (f) => {
    const name = `${String(frames.length).padStart(5, '0')}.jpg`;
    fs.writeFileSync(`${dir}/${name}`, Buffer.from(f.data, 'base64'));
    frames.push({ name, t: f.metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await page.goto('/?qa=1');
  await waitFor(page, (s) => s.scene === 'Menu');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await page.waitForTimeout(1200);
  const drv = await touchDriver(page);
  await pressButton(page, drv, 'menu-level-soccer-ball');
  await waitFor(page, (s) => s.level?.state === 'playing');
  await page.waitForTimeout(2600); // first-time hint demonstrates the chisel gesture
  await playLevel5(page, drv);
  await page.waitForTimeout(3000); // reward card + coin fly
  await cdp.send('Page.stopScreencast');
  fs.writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
});
