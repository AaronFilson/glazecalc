# Architecture decision records

Short records of the decisions that shaped Glazecalc: what was decided, why, and what it costs.
Each one is written once; a later change gets a new record that replaces the old one.

| No.                                               | Decision                                                                | Date       |
| ------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| [0001](0001-one-ec2-instance.md)                  | Run on one EC2 instance with Docker Compose                             | 2026-10-05 |
| [0002](0002-keyless-deploys.md)                   | Deploy through GitHub OIDC and SSM, with no SSH                         | 2026-10-05 |
| [0003](0003-nginx-and-lets-encrypt.md)            | HTTPS with nginx and Let's Encrypt on the instance                      | 2026-10-05 |
| [0004](0004-shared-chemistry.md)                  | One chemistry library for the browser and the tests                     | 2026-10-04 |
| [0005](0005-sign-in-tokens.md)                    | Signed tokens with a version number, in an httpOnly cookie              | 2026-10-05 |
| [0006](0006-email-through-ses-smtp.md)            | Email through Amazon SES over SMTP                                      | 2026-10-05 |
| [0007](0007-trials-as-real-accounts.md)           | Trials are real accounts with placeholder emails                        | 2026-10-05 |
| [0008](0008-typescript-server-without-a-build.md) | A TypeScript server that Node runs without a build step                 | 2026-10-05 |
| [0009](0009-standard-library-from-data-sheets.md) | The standard library comes from manufacturers' data sheets              | 2026-10-07 |
| [0010](0010-suggested-amounts.md)                 | Suggested amounts: the nearest unity formula, fewest changes            | 2026-10-07 |
| [0011](0011-replacing-lead.md)                    | Replacing lead: rebuild the flux, with lead off unless chosen           | 2026-10-07 |
| [0012](0012-choosing-materials.md)                | Choosing materials: the fewest that come near, said in words            | 2026-10-08 |
| [0013](0013-translations.md)                      | Translations: Transloco with ICU messages, the language in the URL      | 2026-10-08 |
| [0014](0014-two-step-sign-in.md)                  | Two-step sign-in: passkeys, app codes, recovery codes                   | 2026-10-14 |
| [0015](0015-provider-sign-in.md)                  | Sign in with Google and GitHub, linked by the provider's id             | 2026-10-16 |
| [0016](0016-prerendered-public-pages.md)          | Public pages are prerendered at build and hydrated in place             | 2026-10-13 |
| [0017](0017-mcp-server.md)                        | AI assistants use a stateless MCP endpoint, with personal tokens        | 2026-10-16 |
| [0019](0019-shared-recipe-tools.md)               | The recipe tools are shared by the app and the server, in codes         | 2026-10-16 |
| [0020](0020-share-links.md)                       | A recipe is shared by an unguessable, read-only link                    | 2026-10-16 |
| [0021](0021-recipe-firing.md)                     | A recipe states its firing: the cone as given, the cones tested         | 2026-10-17 |
| [0022](0022-chemistry-against-the-stated-cone.md) | The chemistry is checked against the stated cone, by two signals        | 2026-10-19 |
| [0023](0023-microsoft-sign-in.md)                 | Sign in with Microsoft: tenant and subject, its email never trusted     | 2026-10-19 |
| [0024](0024-authorization-server.md)              | AI assistants connect with Glazecalc's own OAuth authorization server   | 2026-10-19 |
| [0025](0025-confirm-before-changes.md)            | Confirm before changes: a change from an app waits for the person's yes | 2026-10-19 |
| [0026](0026-target-and-solve.md)                  | Target & Solve: a recipe for a typed target, on the matching engine     | 2026-10-20 |

0018 is kept for the in-app assistant's privacy notice, in
[the integrations plan](../integrations-plan.md). The next new record takes 0027.
