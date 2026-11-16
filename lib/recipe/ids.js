'use strict';

// The app gives the recipe tools materials by name (what to avoid, which clays not to cap, the base frit,
// a library lookup); the core goes by each record's identity (lib/core/identity.js idOf). These turn the
// one into the other (docs/adr/0030-nameless-chemistry-core.md).
const { idOf } = require('../core/identity');

/**
 * The ids of the records a list of names names: every record in play with that name, else the record
 * the library's `find` gives for it; a name neither has stays as it is (it then matches nothing new).
 */
const idsNamed = (names, records, find) => {
  if (!Array.isArray(names)) return names;
  const ids = [];
  for (const name of names) {
    const named = records.filter((record) => record && record.name === name);
    const found = named.length ? named : find ? [find(name)].filter(Boolean) : [];
    if (found.length) found.forEach((record) => ids.push(idOf(record)));
    else ids.push(name);
  }
  return ids;
};

/** A library lookup by name, as the app gives it, for the core, which asks by a record or a reference. */
const byName = (find) =>
  typeof find === 'function' ? (wanted) => find(typeof wanted === 'string' ? wanted : wanted?.name) : find;

module.exports = { idsNamed, byName };
