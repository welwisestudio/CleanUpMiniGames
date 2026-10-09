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
    baseURL: process.env.E2E_BASE ?? 'http://127.0.0.1:4173', // E2E_BASE: a dev server while building content
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
    { name: 'desktop-mouse', use: { viewport: { width: 1280, height: 800 } }, testMatch: /mouse|invalid|resize|pause|visual|levels5|step5-ui|step6|step7|step8|step9/ },
    { name: 'phone-touch', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, testMatch: /touch|visual|levels5|step5|step6|step7|step8|step9/ },
  ],
});
