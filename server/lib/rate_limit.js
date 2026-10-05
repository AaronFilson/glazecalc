'use strict';

const { rateLimit } = require('express-rate-limit');

// Limits per client address. In production nginx passes the address in
// X-Forwarded-For, which server.js trusts for exactly one proxy hop.
// RATE_LIMITS=off turns them off; the test suites sign up many accounts from
// one address.
const limiter = (minutes, limit, msg) => rateLimit({
  windowMs: minutes * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.RATE_LIMITS === 'off',
  message: { msg }
});

const WAIT = 'Please wait a few minutes and try again.';
exports.signIn = limiter(15, 20, 'Too many sign-in attempts. ' + WAIT);
exports.signUp = limiter(60, 10, 'Too many new accounts from this address. Please try again later.');
exports.forgotPassword = limiter(15, 5, 'Too many password reset requests. ' + WAIT);
exports.resetPassword = limiter(15, 10, 'Too many attempts. ' + WAIT);
exports.changePassword = limiter(15, 10, 'Too many attempts. ' + WAIT);
