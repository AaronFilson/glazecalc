// Settings for the server tests, loaded before any test file (.mocharc.json).
const os = require('os');
const path = require('path');

// The suites sign up many accounts from one address; the rate limit tests turn
// limits back on for themselves.
process.env.RATE_LIMITS = 'off';
// Email goes to files the tests can read (see mail.js).
process.env.MAIL_TRANSPORT = 'file';
process.env.MAIL_DIR = path.join(os.tmpdir(), 'glazecalc-test-mail-' + process.pid);
process.env.APP_URL = 'https://glazecalc.test';
