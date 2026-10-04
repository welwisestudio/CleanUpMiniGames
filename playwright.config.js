import { defineConfig } from '@playwright/test';

// E2E tests run against the PRODUCTION build served by `vite preview` (not the dev server).
// Browser: the locally installed Google Chrome (channel 'chrome').
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 240_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop-mouse', use: { viewport: { width: 1280, height: 800 } }, testMatch: /mouse|invalid|resize|pause|visual/ },
    { name: 'phone-touch', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, testMatch: /touch|visual/ },
  ],
});
