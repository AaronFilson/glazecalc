// How the core reads Glazecalc's records (lib/core/host.ts Readers; docs/adr/0030, 0031). It tells them
// apart by their UUIDs, and a record without one (a line given only as an analysis, or saved before UUIDs and
// not yet given one) by its name, as it always was. Results call a record by its name, lines of the same
// material add up by sameKey, and what the core needs to know of a record comes from its traits (traits.ts).

import type { Readers } from '../core/host.ts';
import type { Identity } from '../core/identity.ts';
import { sameKey } from './same-key.ts';
import { traitsOf } from './traits.ts';

/** A record as Glazecalc keeps it, for its identity and label. */
interface NamedRecord {
  readonly uuid?: unknown;
  readonly name?: Identity;
}

/** A record's identity: 'uuid:' and its UUID, or its name. */
const idOf = (record: NamedRecord): Identity | undefined =>
  typeof record?.uuid === 'string' && record.uuid ? 'uuid:' + record.uuid : record.name;

/** What a result calls a record: its name. */
const labelOf = (record: NamedRecord): Identity | undefined => record.name;

/** Glazecalc's readers, as its host gives them to the core. */
const READERS: Readers = Object.freeze({ idOf, labelOf, keyOf: sameKey, traitsOf });

export { READERS, idOf, labelOf };
