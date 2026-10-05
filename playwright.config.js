const { defineConfig, devices } = require('@playwright/test');

// Builds the client and runs the single app server (client + /api) on its own
// port. MongoDB must be running; the tests use their own database, which the
// global setup resets and seeds.
const port = process.env.E2E_PORT || '3100';
process.env.E2E_PORT = port;
const mongoUri = process.env.E2E_MONGO_URI || 'mongodb://127.0.0.1/glazecalc_e2e';
process.env.E2E_MONGO_URI = mongoUri;

module.exports = defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup'),
  // Tests share one server and database, so run them one at a time.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:' + port,
    headless: true,
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'npx ng build && node server.js',
    url: 'http://localhost:' + port + '/api/health',
    timeout: 180000,
    reuseExistingServer: false,
    env: {
      PORT: port,
      MONGOLAB_URI: mongoUri,
      APP_SECRET: 'e2e-test-secret'
    }
  }
});
