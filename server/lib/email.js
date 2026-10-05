'use strict';

/**
 * Trimmed, lower-case email, or null when the value is not a string. Rejecting
 * non-strings stops query operators such as { "$ne": null } reaching Mongo.
 */
exports.normalize = (value) => typeof value === 'string' ? value.trim().toLowerCase() : null;

/** Looks like an address (something@domain.tld); mail delivery is the real test. */
exports.isValid = (address) =>
  typeof address === 'string' && address.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address);

/** Case-insensitive match, so accounts made before emails were lower-cased still work. */
exports.collation = { locale: 'en', strength: 2 };
