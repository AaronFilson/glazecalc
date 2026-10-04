const { defineConfig, devices } = require('@playwright/test');

// The client always calls the API on port 4000 of the page's host, so the API
// server uses 4000 and must not already be running. MongoDB must be running;
// the tests use their own database, which the global setup resets and seeds.
const clientPort = process.env.E2E_CLIENT_PORT || '3100';
const mongoUri = process.env.E2E_MONGO_URI || 'mongodb://127.0.0.1/glazecalc_e2e';
process.env.E2E_MONGO_URI = mongoUri;

module.exports = defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup'),
  // Tests share one API server and database, so run them one at a time.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:' + clientPort,
    headless: true,
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: [
    {
      command: 'node server.js',
      url: 'http://localhost:4000/verify',
      reuseExistingServer: false,
      env: {
        PORT: '4000',
        MONGOLAB_URI: mongoUri,
        HOSTURL: 'http://localhost:',
        CLIENTPORT: clientPort,
        APP_SECRET: 'e2e-test-secret'
      }
    },
    {
      command: 'npx ng build && node clientserver.js',
      timeout: 180000,
      url: 'http://localhost:' + clientPort,
      reuseExistingServer: false,
      env: { CLIENTPORT: clientPort }
    }
  ]
});
