import { defineConfig } from '@playwright/test';

// YouTube Playables production checks (Step 11) against a MOCK SDK under the YouTube CSP:
//   release build  dist-youtube/     → http://127.0.0.1:4174 (no QA hook; checked through the SDK log)
//   mock-test twin dist-youtube-qa/  → http://127.0.0.1:4175 (same build + read-only QA snapshot)
// Build first: npm run build:youtube && npm run build:youtube-qa. The real SDK is checked separately
// in the official SDK Test Suite / Developer Portal (project/YOUTUBE-TEST.md).
export default defineConfig({
  testDir: 'tests/e2e-youtube',
  timeout: 240_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: { channel: 'chrome', headless: true, trace: 'off', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'npm run preview:youtube', url: 'http://127.0.0.1:4174', reuseExistingServer: true, timeout: 60_000 },
    { command: 'npm run preview:youtube-qa', url: 'http://127.0.0.1:4175', reuseExistingServer: true, timeout: 60_000 },
  ],
  projects: [
    { name: 'desktop-mouse', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'phone-touch', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
  ],
});
