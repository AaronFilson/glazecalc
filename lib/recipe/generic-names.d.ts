// Types for lib/recipe/generic-names.js.

/** A generic recipe word (or several) and the library materials to offer for it, most common first. */
export interface GenericName {
  words: string[];
  offer: string[];
}

export const GENERIC_NAMES: GenericName[];
