# Architecture decision records

Short records of the decisions that shaped Glazecalc: what was decided, why, and what it costs.
Each one is written once; a later change gets a new record that replaces the old one.

| No.                                               | Decision                                                   | Date       |
| ------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| [0001](0001-one-ec2-instance.md)                  | Run on one EC2 instance with Docker Compose                | 2026-10-05 |
| [0002](0002-keyless-deploys.md)                   | Deploy through GitHub OIDC and SSM, with no SSH            | 2026-10-05 |
| [0003](0003-nginx-and-lets-encrypt.md)            | HTTPS with nginx and Let's Encrypt on the instance         | 2026-10-05 |
| [0004](0004-shared-chemistry.md)                  | One chemistry library for the browser and the tests        | 2026-10-04 |
| [0005](0005-sign-in-tokens.md)                    | Signed tokens with a version number, in an httpOnly cookie | 2026-10-05 |
| [0006](0006-email-through-ses-smtp.md)            | Email through Amazon SES over SMTP                         | 2026-10-05 |
| [0007](0007-trials-as-real-accounts.md)           | Trials are real accounts with placeholder emails           | 2026-10-05 |
| [0008](0008-typescript-server-without-a-build.md) | A TypeScript server that Node runs without a build step    | 2026-10-05 |
| [0009](0009-standard-library-from-data-sheets.md) | The standard library comes from manufacturers' data sheets | 2026-10-07 |
