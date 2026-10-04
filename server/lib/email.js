'use strict';

/**
 * Trimmed, lower-case email, or null when the value is not a string. Rejecting
 * non-strings stops query operators such as { "$ne": null } reaching Mongo.
 */
exports.normalize = (value) => typeof value === 'string' ? value.trim().toLowerCase() : null;

/** Case-insensitive match, so accounts made before emails were lower-cased still work. */
exports.collation = { locale: 'en', strength: 2 };
