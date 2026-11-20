# The catalog

Glazecalc's tables and information for the chemistry core (docs/adr/0031-functional-core.md): the data a host
gives the core, the English of every code, the names of materials, the readers of pasted and typed text, and
the standard materials and additives. It imports only itself and the core, and the core never imports it.

## Importing

Import from an index, never a file inside the library (an ESLint rule holds Glazecalc to this):

| Index                           | What it has                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `lib/catalog/index.ts`          | everything                                                                                                         |
| `lib/catalog/host/index.ts`     | the host's tables and readers: oxides, cones, limits and Stull, densities, expansion, policy; traits, ids and keys |
| `lib/catalog/locale/index.ts`   | the English of every code, and numbers in the reader's own decimal mark                                            |
| `lib/catalog/text/index.ts`     | material names, and readers of a target formula, firings and cones, and pasted recipes                             |
| `lib/catalog/standard/index.ts` | the reader of the standard records                                                                                 |

A CommonJS `require` of an index takes all of it into a bundle, so a page that needs only the host takes
`host/index.ts`. The standard records themselves are in `data/` beside it (one document a line, NDJSON).

## Sources

| Table          | File           | Source                                                                                                                        |
| -------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Atomic weights | `oxides.ts`    | CIAAW's abridged table of 2024, with Ba, Ce and Pr to one more place, as in its full table                                    |
| Orton cones    | `cones.ts`     | Orton's older chart for large cones at 150 °C an hour, as kiln makers reprint it, and Orton's current chart (©2016) beside it |
| SK cones       | `cones.ts`     | JIS R 8101 as Yuko Trading prints it; Kyoto Municipal Institute of Industrial Technology's measured bends                     |
| Limits         | `limits.ts`    | John Hesselberth and Ron Roy's "Recommended Stable Glaze 'Limits'", and Glazecalc's own                                       |
| Stull's chart  | `limits.ts`    | R. T. Stull (1912), as Glazy reads it, by Derek Au (MIT; notice below)                                                        |
| Densities      | `densities.ts` | each value with the sources it was checked against in `docs/sources/dry-sg-sources.md`                                        |
| Expansion      | `expansion.ts` | Digitalfire's oxide pages, which follow West and Gerrow                                                                       |

Each file says more about its source beside the figures.

## Licence

The catalog is Glazecalc's, under its MIT licence (`LICENSE` at the repository's root), except the outlines of
Stull's chart regions in `limits.ts`. Those come from `charts/stull-chart-d3.js` in
<https://github.com/derekphilipau/ceramic-chemistry-visualization>, under this notice, which the licence asks
to travel with them (`THIRD-PARTY-NOTICES.md` has it too):

```
MIT License

Copyright (c) 2017 Derek Au

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Runtime

ES modules in erasable TypeScript (ES2024, `strict`, no Node or DOM types). Its tests are in `test/`
(`npm run test:catalog`), at 100% of lines, branches and functions.
