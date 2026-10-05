'use strict';

const bcrypt = require('bcrypt');

const COST = 10;
// bcrypt uses only the first 72 bytes of a password, so longer ones are refused
// instead of being silently cut short.
const MAX_BYTES = 72;

/** Why a new password cannot be used, or null when it is fine. */
exports.problem = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Please enter a password 8 characters or longer.';
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) {
    return 'Please enter a password of at most 72 characters (fewer with accented letters or symbols).';
  }
  return null;
};

// The async calls run on Node's thread pool, so hashing does not hold up other requests.
exports.hash = (password) => bcrypt.hash(password, COST);
exports.matches = (password, hash) =>
  typeof password === 'string' && typeof hash === 'string' ? bcrypt.compare(password, hash) : Promise.resolve(false);

// Compared against when no account matches, so a sign-in with an unknown email
// takes as long as one with a wrong password.
const UNUSED_HASH = bcrypt.hashSync('no account has this password', COST);
exports.matchesNothing = (password) => exports.matches(String(password), UNUSED_HASH).then(() => false);
