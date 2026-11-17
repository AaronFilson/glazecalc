# 31. A functional core: what it reads comes with each call

Accepted, 2026-11-17, at the owner's direction.

## Context

ADR 30 made the chemistry core nameless: it reads a record only through four readers, `idOf`, `labelOf`, `keyOf`
and `traitsOf`. They were hooks, held in module variables in `lib/core/identity.ts` and `traits.ts`, which a host set
once (`setIdOf` and the rest), and which Glazecalc set when `lib/chemistry/messages.js` loaded (`useGlazecalcHosts`).

So a result depended on what some other module had done first.

- Every realm had to set the hooks again: a page, a worker such as Glaze Vault's `chooseWorker.ts`, a test file.
- Tests that wanted the defaults had to set them and put Glazecalc's back after.
- Two hosts could not share a process.

The owner's direction for the library (2026-11-17) is that the core be functional: no state, and no tables. The
catalog, the second library, holds the information and the tables (`reports/Chemistry library completion plan.md`).

## Decision

- **No module state.** Nothing in the core is set when a module loads, and nothing is kept between calls, so the same
  arguments always give the same answer.
- **The host is an argument.** Every function that reads a record, itself or through another function, takes the
  host as its first argument (`lib/core/host.ts`): `{ idOf?, labelOf?, keyOf?, traitsOf? }`.
  - A reader left out is the default: the record's own `id`; that identity as its label; its identity and chemistry
    as the key that says which lines are one material; and its own `traits`.
  - A host whose records carry ids and traits passes `{}`.
  - The host comes first so that each function's own options stay where they were, and so that binding a host is one
    wrapper.
- **The tables follow.** They move to the catalog and join the host as the arguments that say what to work with,
  one area at a time, each with every output kept as it was (`scripts/chemistry-outputs.mjs`). What stays in the
  core is the algorithms, their tuning numbers, unit definitions, and its vocabulary: the codes it returns, the trait
  keys, and the kinds in the record shape.
- **Glazecalc's host is one frozen object,** in `lib/chemistry/host.js`: a record's uuid, or its name for a record
  without one; its name as its label; `sameKey`; and the traits from its standard names. `lib/chemistry`,
  `lib/recipe` and `lib/cones` pass it (`withHost`) and keep their exports, so the server, the client and the MCP
  tools do not change.

## Consequences

- 69 of the core's 220 top-level functions take the host. The rest already read nothing of a record.
- A worker or a test needs no setup, and two hosts can call the core by turns in one process
  (`lib/core/test/host.test.js`).
- Every caller outside Glazecalc's layer passes a host: the core's own tests pass `HOST` from `test/support.js`
  (`{}`, the defaults). Glaze Vault's vendored copy predates this, and moves when the owner starts on it.
- This replaces ADR 30's hooks (`setIdOf`, `setLabelOf`, `setKeyOf`, `setTraitsOf`, `useGlazecalcHosts`). ADR 30's
  other decisions stand.
