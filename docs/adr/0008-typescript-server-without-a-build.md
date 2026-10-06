# 8. A TypeScript server that Node runs without a build step

Accepted, 2026-10-05.

## Context

The client and the chemistry library were typed, but the server was plain CommonJS JavaScript.
Mistakes such as a missing field on a request, a misspelled model property or a route that forgot
to return were found by tests or not at all. Porting to TypeScript usually adds a compile step:
`tsc` or a bundler writes JavaScript to a `dist/` folder, the Docker image runs that, and stack
traces point at generated code unless source maps are wired up.

## Decision

- The server is TypeScript, as ES modules, in `server/` (its own `package.json` sets
  `"type": "module"`, leaving the rest of the repository unchanged).
- Node 24 runs the `.ts` files as they are: it removes the type annotations while loading each
  file. There is no compiled output; the Docker image runs `node server/main.ts`, and the tests
  run the same files under Mocha.
- `tsc -p server` checks the types (strict) without emitting anything: `npm run typecheck`, a CI
  step before the tests.
- `erasableSyntaxOnly` limits the code to TypeScript that can simply be erased (no enums,
  namespaces or parameter properties), which is what Node supports, and `verbatimModuleSyntax`
  makes type-only imports explicit. Imports name their `.ts` files.
- Mongoose models declare their fields and methods as interfaces (`UserFields`, `UserMethods`),
  and Express's `Request` carries the signed-in user's type (`server/types.d.ts`).

## Alternatives

- **Compile with `tsc` to `dist/`:** works on any Node version, but adds a build to the image and
  the dev loop, and errors point at generated files.
- **ts-node or tsx:** no separate build, but a loader dependency in production for something
  Node now does itself.
- **Stay with JavaScript and JSDoc types:** no syntax change, but the annotations are clumsier and
  easier to leave out.

## Consequences

- One less build step, and stack traces show the real files and lines.
- The server needs Node 22.18 or later (Node 24 here, as in production).
- A few TypeScript features are off the table, and a type error does not stop the server from
  starting: CI's type check is what catches it.
