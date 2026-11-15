'use strict';

// What the core says, without words (docs/adr/0030-nameless-chemistry-core.md): a code and its
// values. The values are numbers, oxides, flags and the ids of records, never a sentence. The words
// for each code, in any language, are made outside the core.

/** An error that stops a calculation: its message is its code, with its values in `params`. */
const problem = function (code, params) {
  /** @type {Error & { code: string, params: Record<string, unknown> }} */
  const error = /** @type {any} */ (new Error(code));
  error.code = code;
  error.params = params || {};
  return error;
};

/** A warning: the calculation goes on. */
const warning = function (code, params) {
  return { code, params: params || {} };
};

module.exports = { problem, warning };
