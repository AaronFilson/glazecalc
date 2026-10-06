# Changelog

Notable changes to Glazecalc. Versions before 0.3.0 were numbered afterwards, from the history.

## Unreleased

### Changed

- **The recipe page, rebuilt for entering recipes quickly:**
  - The unity formula updates as you type, beside the recipe on a computer and in a line under it
    on a phone; there is no Compute button.
  - Materials and additives are added from a library with separate tabs for your own and the
    standard ones, each a whole list with a filter; one click adds, and the cursor goes to the
    amount.
  - Each material shows its share of the batch, with the total under the list.
  - Change the scale: to percent, to the smallest whole parts (3 flint, 2 dolomite, with exact
    amounts kept for the rest), or to the grams of a batch.
  - Save keeps the recipe on the page and saving again updates it; "Save and add next" starts a
    new one; "Save as a copy" keeps the original; Open brings a saved recipe back to change it,
    asking first if there are changes not saved.
  - Instructions at the top of the page, which can be hidden; the browser remembers, and a link
    brings them back.
- On a phone, visitors can sign in from the header without opening the menu.

### Removed

- `.git-blame-ignore-revs`: the reformat it named was squashed into the 0.3.0 merge.

## 0.3.0 (2026-10-05)

### Added

- **Try it now:** visitors can use the whole app as a trial with a generated name ("speckled
  quiet kilns") and no email, then keep their work by creating an account, or discard it. Trials
  are removed after 14 days ([ADR 7](docs/adr/0007-trials-as-real-accounts.md)).
- A new intro page with a live example (Leach's 4321 celadon worked out in the browser), and
  public About, Privacy and Advice pages.
- A new look: a pottery palette with a dark mode that follows the system setting, a navigation
  bar with a phone menu, page titles, a footer, a logo and icons, a web app manifest, a share
  preview image, a sitemap and `robots.txt`.
- Deleting your account from the account page.
- A logo made from a photo of a gas kiln's burners, and a link to Updraft Pottery Studio, the
  author's pottery, in the footer and on the About page.
- A README with screenshots, an architecture diagram and highlights, and a case study.
- Architecture decision records in `docs/adr/`, and this changelog.
- Structured server logs: JSON lines in production, plain text in development (`LOG_LEVEL`).
- Automated accessibility checks (axe) on every page in light and dark mode, in the browser tests.

### Changed

- Plain URL paths (`/recipe` instead of `/#/recipe`); old links, including emailed reset links,
  still work.
- Changing your email or deleting your account needs your current password.
- The standard materials, additives, advice and recipes lists are public and cached for 5 minutes.
- The server tests run against the app in-process, with one database emptied at the start, so no
  server or port is needed and test files no longer depend on each other.
- **The server is TypeScript** (ES modules) that Node 24 runs directly, with no build step;
  `npm run typecheck` checks it in CI. `server/main.ts` starts it and `server/app.ts` is the
  Express app ([ADR 8](docs/adr/0008-typescript-server-without-a-build.md)).
- One route factory serves the seven kinds of record, and every route uses async/await with errors
  handled in one place. `var` is gone from the JavaScript.
- **Sign-in moved to an httpOnly, SameSite=Strict cookie** that scripts on the page cannot read,
  with a check that refuses changes coming from other sites, and `POST /api/signout`. Responses no
  longer contain tokens; scripts send `Authorization: Bearer`, and the old `token` header is gone.
  Everyone signs in again once ([ADR 5](docs/adr/0005-sign-in-tokens.md)).
- Signing in during a trial brings the trial's work into the account.
- Each material or additive in a recipe being built sits on one line: name, amount, remove.
- Seed data moved to `data/*.ndjson`; `MONGOLAB_URI` is now `MONGODB_URI`.
- Strict TypeScript and strict template checking; the whole repository is formatted with
  Prettier, checked in CI.

### Fixed

- The page no longer jumps while loading (layout shift 0.64 to 0 on the intro page).
- Outlined delete buttons had too little contrast on tinted backgrounds.
- After a deploy, links in a tab opened earlier did nothing, because the old page code they asked
  for was gone; the page now loads afresh instead.
- The intro photo shows fired cone packs; its caption called them glaze flow tests.
- "Skip to content" reloaded the app at the start page; it now moves focus to the page.
- A sign-in that expired while the site was closed left a page full of errors; pages that need a
  session now ask the server first and go to the sign-in page.
- Requests sent at the same moment could store more than a trial's 25 records of a kind; the
  count is now taken in one database step.
- Checking the current password (changing the email or password, deleting the account) is limited
  to 10 tries in 15 minutes per account, so a stolen session cannot guess it.

### Removed

- `index.js` (it only loaded `server.js`) and the 292 KB background photo (now a 35-87 KB WebP).

## 0.2.0 (2026-10-05)

The 2017 app rebuilt and put back online.

### Added

- An Angular 22 client (standalone components, signals, no zone.js) replacing AngularJS, with
  Vitest unit tests and Playwright browser tests.
- A glaze chemistry library shared by the client and the tests, checked against values worked out
  by hand ([ADR 4](docs/adr/0004-shared-chemistry.md)).
- Password reset by email through Amazon SES: hashed, single-use links that last 30 minutes, and a
  notice when a password changes ([ADR 6](docs/adr/0006-email-through-ses-smtp.md)).
- Production on one EC2 instance with Docker Compose, nginx and Let's Encrypt, deployed from
  GitHub Actions through OIDC and SSM with no SSH, with backups, snapshots and alarms
  ([ADR 1](docs/adr/0001-one-ec2-instance.md), [ADR 2](docs/adr/0002-keyless-deploys.md),
  [ADR 3](docs/adr/0003-nginx-and-lets-encrypt.md)).
- A health check at `/api/health`, rate limits on sign-in, sign-up and reset, and a content
  security policy with subresource integrity.

### Changed

- Express 5, Mongoose 9, MongoDB 9 and Node 24.
- Sign-in tokens are pinned to HS256 and carry a version, so changing the password signs out every
  other device ([ADR 5](docs/adr/0005-sign-in-tokens.md)). Passwords are hashed without blocking
  the server.
- Every query is limited to the signed-in user's own records, and mistakes in requests get a 400
  with a message instead of a server error.

## 0.1.0 (2017-06-21)

The original app: AngularJS 1, gulp and webpack, Express 4 and MongoDB, with recipes, materials,
additives, firing logs, notes and advice.
