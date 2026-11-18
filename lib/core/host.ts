// What a host gives the core with each call (docs/adr/0031-functional-core.md): how to read its records,
// and the tables to work from. The core keeps nothing between calls and is set up by nothing, so the same
// host and the same arguments always give the same answer, in any realm (a page, a worker, a test). The
// tables join the host as they leave the core for the catalog (lib/catalog), one area at a time.

import type { Identity, Reader } from './identity.ts';
import type { Traits } from './traits.ts';
import type { OxideTable } from './types.ts';
import type { ConeTable } from './cones/firing.ts';

/**
 * How the core reads a host's records. A reader left out is the default: the record's own `id`; its
 * identity as its label; its identity and chemistry as the key that says which lines are one material;
 * and its own `traits`. A host whose records carry ids and traits gives no readers.
 */
export interface Readers {
  /** A record's identity: an opaque value the core only compares and passes back. */
  readonly idOf?: Reader<Identity | undefined>;
  /** What a result calls a record. */
  readonly labelOf?: Reader<Identity | undefined>;
  /** The key two records share when they are the same material, as lines to add up. */
  readonly keyOf?: Reader<string>;
  /** What the core needs to know of a record beyond its chemistry. */
  readonly traitsOf?: Reader<Traits | null | undefined>;
}

/** What the core is given with each call: how to read the host's records, and the tables to work from. */
export interface Host extends Readers {
  /** The elements and oxides: the catalog's OXIDES (lib/catalog/oxides.ts), or a host's own. */
  readonly oxides: OxideTable;
  /** The cone charts and their lookups: the catalog's CONES (lib/catalog/cones.ts), or a host's own. */
  readonly cones: ConeTable;
}
