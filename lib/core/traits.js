'use strict';

// What the core needs to know about a record beyond its chemistry (docs/adr/0030-nameless-chemistry-core.md):
// whether it is a theoretical mineral, calcined, a raw calcium source, which colorant an additive is, and the
// like. The core asks traitsOf, never a name. By default a record carries its own (`record.traits`); a host
// whose records do not yet sets its own (Glazecalc's reads them from its standard names, lib/recipe/traits.js).

let current = (record) => (record && record.traits) || {};

/** The traits of a record: an object of flags and kinds, empty for none. */
const traitsOf = (record) => (record === null || record === undefined ? {} : current(record) || {});

/** Sets how the core reads a record's traits. */
const setTraitsOf = (read) => {
  if (typeof read !== 'function') throw new TypeError('setTraitsOf takes a function');
  current = read;
};

module.exports = { traitsOf, setTraitsOf };
