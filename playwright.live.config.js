const { defineConfig, devices } = require('@playwright/test');

// The checks of a deployed site (e2e/live), against LIVE_URL; no server or
// database here, the site is the one deployed:
//
//   LIVE_URL=https://staging.glazecalcapp.com npx playwright test --config playwright.live.config.js
//
// .github/workflows/live-checks.yml runs it after each deploy. Two workers,
// gentle on a 1 GB instance.
const baseURL = process.env.LIVE_URL;
if (!/^https?:\/\/[^/]+\/?$/.test(baseURL ?? '')) {
  throw new Error('Set LIVE_URL to the site, such as https://glazecalcapp.com');
}

module.exports = defineConfig({
  testDir: './e2e/live',
  workers: 2,
  retries: 1,
  reporter: process.env.CI ? [['line']] : [['list']],
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
