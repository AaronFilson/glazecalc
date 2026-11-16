'use strict';

/**
 * A number saved plainly ("12.5", "-3"); null for anything else, such as
 * "12,5", "1e3" or "0x10" (which Number() would read).
 */
function plainNumber(text) {
  const plain = String(text ?? '').trim();
  return /^-?\d*\.?\d+$/.test(plain) ? Number(plain) : null;
}

module.exports = { plainNumber };
