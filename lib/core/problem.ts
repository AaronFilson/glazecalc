// What the core says, without words (docs/adr/0030-nameless-chemistry-core.md): a code and its
// values. The values are numbers, oxides, flags and the ids of records, never a sentence. The words
// for each code, in any language, are made outside the core.

/** The values of a problem or warning: numbers, oxides, flags and ids, never a sentence. */
export type Params = Record<string, unknown>;

/** An error that stops a calculation: its message is its code, with its values in `params`. */
export type Problem = Error & { code: string; params: Params };

/** A warning: the calculation goes on. */
export type Warning = { code: string; params: Params };

/** An error that stops a calculation. */
export const problem = (code: string, params?: Params): Problem => {
  const error = new Error(code) as Problem;
  error.code = code;
  error.params = params || {};
  return error;
};

/** A warning: the calculation goes on. */
export const warning = (code: string, params?: Params): Warning => ({ code, params: params || {} });
