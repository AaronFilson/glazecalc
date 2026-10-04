'use strict';

const crypto = require('crypto');

// Secret for signing login tokens. Production must set APP_SECRET. Elsewhere a
// random secret is made for each run, so sign-ins end when the server restarts.
var secret = process.env.APP_SECRET;
if (!secret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_SECRET must be set when NODE_ENV is production');
  }
  secret = crypto.randomBytes(32).toString('hex');
  console.log('APP_SECRET is not set; using a random secret for this run.');
}

module.exports = exports = secret;
