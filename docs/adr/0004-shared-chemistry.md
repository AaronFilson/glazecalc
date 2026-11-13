# 4. One chemistry library for the browser and the tests

Accepted, 2026-10-04.

Amended, 2026-10-19: the server runs the library too, for the MCP tools since 2026-10-16
([ADR 17](0017-mcp-server.md), [ADR 19](0019-shared-recipe-tools.md)), and since 2026-10-19 it works out the unity
formula of a recipe an assistant saves through them (`server/mcp/tools/account_write.ts`). What the recipe page saves
is still kept as the browser worked it out.

Amended, 2026-11-12: the declarations are no longer kept in step by hand alone. `npm run typecheck`, in CI,
checks the library's JavaScript against them (`lib/tsconfig.json`), and `server/test/lib_types_tests.ts` checks
that each module exports what its declaration says and that every declaration is correct TypeScript. The first
run found five exports the code used that no declaration had.

## Context

The heart of Glazecalc is arithmetic: turning a recipe (grams of materials) into its unity
molecular formula (molecules of oxides, scaled so the fluxes add up to one). In the 2017 version
that code was spread through the AngularJS page controllers, untested, with molar masses typed in
by hand.

## Decision

All glaze chemistry lives in `lib/chemistry/`, plain JavaScript with TypeScript declarations
(`index.d.ts`):

- `oxides.js` derives molar masses from atomic weights and groups the oxides (fluxes,
  stabilizers, glass formers);
- `materials.js` turns a chemical formula into a weight analysis, with loss on ignition;
- `umf.js` turns a recipe into its unity formula.

The Angular client imports it directly, and the build bundles it. The server's mocha suite tests
it against values worked out by hand (`server/test/chemistry_tests.ts`), such as potash
feldspar's analysis and Leach's 4321 celadon.

## Consequences

- One place to fix a number, tested without a browser. The intro page's live example uses the
  same code as the calculator.
- The server does not recalculate what clients save; a saved analysis is what the browser worked
  out. If the server ever needs it (for example to search by oxide), the library is ready to use
  there.
- The library is CommonJS for Node and typed for Angular through a hand-written declaration file,
  which has to be kept in step with the code.
