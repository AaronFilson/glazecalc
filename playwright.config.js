const os = require('os');
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

// Builds the client when dist/ is out of date (scripts/e2e-build.mjs) and runs
// the single app server (client + /api) on its own port, which the browsers of
// every worker use. MongoDB must be running; the tests use their own database,
// which the global setup resets and seeds. E2E_PORT and E2E_MONGO_URI pick
// others, so two runs can share a machine (npm run test:e2e:both).
const port = process.env.E2E_PORT || '3100';
process.env.E2E_PORT = port;
const mongoUri = process.env.E2E_MONGO_URI || 'mongodb://127.0.0.1/glazecalc_e2e';
process.env.E2E_MONGO_URI = mongoUri;
// The global setup empties it: refuse any but a test database before the build
// and server start (scripts/test-database.js).
require('./scripts/test-database').assertTestDatabase(mongoUri, 'E2E_MONGO_URI');
// The server writes emails here as JSON files; e2e/mail.js reads them.
const mailDir = path.join(os.tmpdir(), 'glazecalc-e2e-mail-' + port);
process.env.E2E_MAIL_DIR = mailDir;
// The fake Google and GitHub (server/test/support/fake_provider.ts), started by
// e2e/oauth.spec.js on this port: the server's provider endpoints point there.
const oauthPort = process.env.E2E_OAUTH_PORT || String(Number(port) + 1000);
process.env.E2E_OAUTH_PORT = oauthPort;
// The apps named by their address (CIMD), served by e2e/connect.spec.js on
// this port: the server fetches their documents and keys there, never from
// the internet (server/oauth/cimd.ts, CIMD_TEST_BASE).
const cimdPort = process.env.E2E_CIMD_PORT || String(Number(port) + 2000);
process.env.E2E_CIMD_PORT = cimdPort;

module.exports = defineConfig({
  testDir: './e2e',
  // The deployed site's checks, against LIVE_URL (playwright.live.config.js).
  testIgnore: 'live/**',
  globalSetup: require.resolve('./e2e/global-setup'),
  // The workers share the server and its database: each test makes accounts
  // of its own (uniqueEmail) and reads only the email sent to them, and no test
  // changes what another reads. A file's tests run in order in one worker.
  // E2E_WORKERS sets how many; by default half the cores.
  workers: Number(process.env.E2E_WORKERS) || process.env.E2E_WORKERS || '50%',
  retries: process.env.CI ? 1 : 0,
  // A sharded run (CI) leaves a blob report for each shard, merged afterwards.
  reporter: process.env.E2E_BLOB
    ? [['line'], ['blob']]
    : process.env.CI
      ? [['line']]
      : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:' + port,
    headless: true,
    // The service worker (ngsw) caches between steps: only e2e/offline.spec.js allows it.
    serviceWorkers: 'block',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/e2e-build.mjs && node server/main.ts',
    url: 'http://localhost:' + port + '/api/health',
    // The build comes first when dist/ is out of date: up to 5 minutes here, 10
    // in CI, where every run builds on a shared runner.
    timeout: process.env.CI ? 600000 : 300000,
    reuseExistingServer: false,
    env: {
      // The stand-ins below (OAUTH_TEST_BASE, CIMD_TEST_BASE) are taken only with NODE_ENV=test.
      NODE_ENV: 'test',
      PORT: port,
      MONGODB_URI: mongoUri,
      APP_SECRET: 'e2e-test-secret',
      APP_URL: 'http://localhost:' + port,
      // A fixed key for two-step sign-in's secrets (server/lib/mfa_key.ts), test
      // use only: the base64 of "glazecalc-e2e-test-mfa-key-32byt".
      MFA_KEY: 'Z2xhemVjYWxjLWUyZS10ZXN0LW1mYS1rZXktMzJieXQ=',
      MAIL_TRANSPORT: 'file',
      MAIL_DIR: mailDir,
      // The tests sign up many accounts from one address.
      RATE_LIMITS: 'off',
      // Sign in with Google, GitHub and Microsoft, against the fake provider (test use only).
      OAUTH_TEST_BASE: 'http://127.0.0.1:' + oauthPort,
      GOOGLE_CLIENT_ID: 'google-client',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      GITHUB_CLIENT_ID: 'github-client',
      GITHUB_CLIENT_SECRET: 'github-secret',
      MICROSOFT_CLIENT_ID: '00000000-1111-2222-3333-444444444444',
      MICROSOFT_CLIENT_SECRET: 'microsoft-secret',
      // Apps named by their address, from the tests' own stand-in (test use only); and ChatGPT's way of
      // signing token requests on, so the browser tests run the whole of it (the server tests run it off too).
      CIMD_TEST_BASE: 'http://127.0.0.1:' + cimdPort,
      OAUTH_CIMD_AUTH: 'private_key_jwt'
    }
  }
});
