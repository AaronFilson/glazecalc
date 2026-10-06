// Settings for the server tests, loaded before any test file (.mocharc.json).
import os from 'node:os';
import path from 'node:path';

// One database for the whole run, emptied at the start (see app.ts).
// TEST_MONGODB_URI picks another, for example to run two suites at once.
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_test';
// The suites sign up many accounts from one address; the rate limit tests turn
// limits back on for themselves.
process.env.RATE_LIMITS = 'off';
// Email goes to files the tests can read (see mail.ts).
process.env.MAIL_TRANSPORT = 'file';
process.env.MAIL_DIR = path.join(os.tmpdir(), 'glazecalc-test-mail-' + process.pid);
process.env.APP_URL = 'https://glazecalc.test';
// The tests cause errors on purpose; LOG_LEVEL=debug shows the server's log.
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || 'silent';
