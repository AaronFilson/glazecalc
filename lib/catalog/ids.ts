// The app gives the recipe tools materials by name (what to avoid, which clays not to cap, the base frit,
// a library lookup); the core goes by each record's identity (lib/core/identity.ts idOf, as the host reads
// it). These turn the one into the other (docs/adr/0030-nameless-chemistry-core.md).

import { idOf } from '../core/identity.ts';
import type { Readers } from '../core/host.ts';
import type { Identity } from '../core/identity.ts';

/** A record as these find it: by its name. */
interface Named {
  readonly name?: unknown;
}

/**
 * The ids of the records a list of names names: every record in play with that name, else the record
 * the library's `find` gives for it; a name neither has stays as it is (it then matches nothing new).
 * Anything but a list is given back as it is.
 */
function idsNamed<T>(
  host: Readers,
  names: T,
  records: ReadonlyArray<Named | null | undefined>,
  find?: ((name: unknown) => Named | null | undefined) | null
): T | Array<Identity | undefined | unknown> {
  if (!Array.isArray(names)) return names;
  const ids: Array<Identity | undefined | unknown> = [];
  for (const name of names as unknown[]) {
    const named = records.filter((record) => record && record.name === name);
    const found = named.length ? named : find ? [find(name)].filter(Boolean) : [];
    if (found.length) found.forEach((record) => ids.push(idOf(host, record)));
    else ids.push(name);
  }
  return ids;
}

/** A library lookup by name, as the app gives it, for the core, which asks by a record or a reference. */
const byName = <F>(find: F): F | ((wanted: unknown) => unknown) =>
  typeof find === 'function'
    ? (wanted: unknown) => find(typeof wanted === 'string' ? wanted : (wanted as Named | null | undefined)?.name)
    : find;

export { idsNamed, byName };
