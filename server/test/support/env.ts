// Settings for the server tests, loaded before any test file (.mocharc.cjs).
import os from 'node:os';
import path from 'node:path';

// One database for each test file, emptied before it and dropped after (see
// app.ts). The files run in parallel (.mocharc.cjs), so each of mocha's worker
// processes has a database of its own: the name ends in _w and its number.
// TEST_MONGODB_URI picks another name, for example to run two suites at once.
const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_test';
const worker = process.env.MOCHA_WORKER_ID;
const [address, query] = uri.split('?');
process.env.MONGODB_URI =
  worker === undefined ? uri : address + '_w' + worker + (query === undefined ? '' : '?' + query);
// The suites sign up many accounts from one address; the rate limit tests turn
// limits back on for themselves.
process.env.RATE_LIMITS = 'off';
// Email goes to files the tests can read (see mail.ts).
process.env.MAIL_TRANSPORT = 'file';
process.env.MAIL_DIR = path.join(os.tmpdir(), 'glazecalc-test-mail-' + process.pid);
process.env.APP_URL = 'https://glazecalc.test';
// The tests cause errors on purpose; LOG_LEVEL=debug shows the server's log.
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || 'silent';
// A fixed key for two-step sign-in's secrets (server/lib/mfa_key.ts), so the
// tests never depend on the development key or its warning. Test use only:
// it is the base64 of "glazecalc-unit-test-mfa-key-32by".
process.env.MFA_KEY = process.env.TEST_MFA_KEY || 'Z2xhemVjYWxjLXVuaXQtdGVzdC1tZmEta2V5LTMyYnk=';
