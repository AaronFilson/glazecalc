# Case study: reviving a 2017 glaze calculator

Glazecalc started in 2017 as a learning project: a calculator for potters, who mix glazes from
powdered minerals and want to know what those minerals become in the kiln. It was written in
AngularJS with gulp and webpack, an Express 4 API and MongoDB on mLab, and ran on a small EC2
instance that I started by hand. In 2026 the site had been down for a while: the instance had
rebooted and nothing brought the app back. This is how it became a maintained, tested and
cheaper app again, and what I learned on the way.

## Where it started

- **The chemistry was spread through page controllers,** with molar masses typed in by hand and
  no tests. It mostly worked, but there was no way to know where it did not.
- **The stack had aged out:** AngularJS reached end of life in 2021, mLab shut down in 2020, and
  the build tools no longer installed cleanly.
- **Operations were manual:** SSH in, pull, restart. A reboot meant an outage, and the server
  cost $15-17 a month for a site with a handful of users.

## How it was rebuilt

**Chemistry first.** Before touching the interface I moved all glaze chemistry into one small
library (`lib/chemistry/`): molar masses derived from atomic weights, formula to weight analysis
with loss on ignition, and recipe to unity formula. Its tests use values worked out by hand, such
as potash feldspar's analysis and Bernard Leach's "4321" celadon. Everything after this could be
changed without fear of breaking the part that matters most to potters
([ADR 4](adr/0004-shared-chemistry.md)).

**Then the client and server.** The client became Angular 22: standalone components, signals,
no zone.js, strict TypeScript and strict template checking. The server moved to Express 5,
Mongoose 9 and Node 24, and then to TypeScript that Node runs as it is, with no build step
([ADR 8](adr/0008-typescript-server-without-a-build.md)). Every query is now limited to the signed-in user's own records, and
mistakes in requests get a 400 with a message instead of a crash.

**Then production, as code.** The new home is one Graviton `t4g.micro` running Docker Compose
behind nginx and Let's Encrypt, for about $13 a month
([ADR 1](adr/0001-one-ec2-instance.md), [ADR 3](adr/0003-nginx-and-lets-encrypt.md)). Every
AWS step is written down in `deploy/aws/README.md`. Deploys come from GitHub Actions through
OIDC, with no SSH and no stored keys: the deploy role can run exactly one SSM command, on this
instance, with a parameter that must look like an image tag
([ADR 2](adr/0002-keyless-deploys.md)).

**Then the features that make it usable:** password reset by email through Amazon SES, a public
intro page with a live example, and a way to try the whole app without an account. After that came
the ones written up as issues: printing a recipe, or just a batch list to weigh from, in grams or
in pounds and ounces; comparing two recipes oxide by oxide; problems shown on the form fields
themselves; and light, dark and six palettes named for glazes.

## Problems worth telling

- **Signing out a stolen token, and not losing it in the first place.** Plain JWTs cannot be
  withdrawn. Each user now has a token version that every token carries; changing the password
  increases it, so every older token, on any device, stops working at once. The token itself moved
  from localStorage into an httpOnly, SameSite=Strict cookie, so no script on the page can read
  it, with a check that refuses changes coming from other sites ([ADR 5](adr/0005-sign-in-tokens.md)).
- **MongoDB on a 1 GB Graviton server.** MongoDB publishes no arm64 Debian packages, so it runs
  from the official image, with its cache capped at a quarter of a gigabyte and a swap file as a
  cushion.
- **Email from a container that cannot see AWS credentials.** Instance metadata is limited to
  one network hop so the containers cannot borrow the server's AWS role. That rules out the SES
  API with the role, so the app sends over SMTP with send-only credentials kept encrypted in
  Parameter Store, and DKIM, SPF and DMARC keep the mail out of spam folders
  ([ADR 6](adr/0006-email-through-ses-smtp.md)).
- **Trials and unique emails.** Every account has a unique email, and I wanted to keep that
  rule. Each trial gets a generated name ("speckled quiet kilns") and a placeholder address on
  `.invalid`, a top-level domain reserved so that it can never be real. The existing unique index
  then keeps names unique, with no migration, and creating an account turns the trial into it in
  place ([ADR 7](adr/0007-trials-as-real-accounts.md)).
- **Tests that passed for the wrong reason.** The old server tests shared one database and
  dropped it between files, which also dropped the unique email index, so some results depended
  on file order. Rewriting them to run against the app in-process, each test making its own data,
  turned up two tests that had quietly been testing something other than their names said.
- **Old recipes and materials that are gone.** The standard materials came from a well-regarded
  potters' book, and many of them can no longer be bought: Custer Spar closed in 2023, and Gerstley
  Borate is running out. Each standard material now has a source, the manufacturer's data sheet
  first, and says whether it is current, discontinued (and since when) or hard to get. With the
  colorants there are 219, from the US, UK, EU, Australia, New Zealand and Japan. A recipe that uses one
  that is gone names what is used now, and can swap it in and compare the two. The hard part was not overclaiming: a swap counts as
  like for like only when the two give much the same oxides gram for gram. Niter to a frit does
  not, so the app says to work the amount out again, and it says so when a replacement still has
  lead. It can also work the amounts out: a weighted least-squares fit to the old unity formula,
  pulled back toward the recipe as it was so it changes as few amounts as it can
  ([ADR 10](adr/0010-suggested-amounts.md)). When the new material cannot bring an oxide back,
  it asks which material should, rather than choosing for the potter.
- **Lead, with no rule to convert it.** Old recipes use red lead and lead frits, and nothing
  lead-free supplies lead oxide, so matching the old formula put in no frit at all. Research found
  no published conversion ratio; what works is to keep the glaze's silica and alumina, give lead's
  share of the fluxes to soda, potash and calcium, and set boron by the firing temperature (Matt
  Katz's rule, about 0.5 at cone 04). Replace lead does that from the lead-free frits sold in the
  potter's region, or keeps the colour on a frit and kaolin base, and Compare shows the calculated
  expansion, since crazing is what converted glazes most often do. Lead is off unless chosen, and
  turning it on asks first ([ADR 11](adr/0011-replacing-lead.md)).
- **Colors before the first paint.** A saved dark theme has to apply before Angular starts, or the
  page flashes white first. A few lines of script in index.html apply it from the browser's copy,
  and the Content Security Policy allows them by hash rather than allowing inline scripts in
  general. Each palette is checked for WCAG AA contrast by axe, in light and in dark.
- **Tests that passed on Windows and failed on Linux.** After a merge, CI failed although every
  test had passed on my machine. Ubuntu's fonts are wider than Windows', enough to push a recipe
  table 29 pixels past a 320-pixel phone screen, and the slower runner took an accessibility test
  past its time limit. I reproduced CI in Docker under WSL and fixed both. Then I made that a
  command: `npm run test:e2e:linux` runs the browser tests in CI's Ubuntu, on the code as it is,
  in about six minutes. CI is pinned to that Ubuntu, so the next upgrade, and its fonts, come by
  choice.
- **Translating safety advice with no budget for translators.** Glazecalc is in 57 languages,
  translated by AI. Each language had a glossary built from its own suppliers' catalogues,
  each part a second reviewer, and the safety text a third pass that translated it back into English
  without looking at the original, then compared. That pass found what reviewers missed: "locked
  storage" that had become merely closed, a respirator that applied only outdoors, a pet's food bowl
  where the English meant any bowl. Where several languages made the same mistake, the fault was the
  English, and the English was made plain. Checks in CI catch a changed number, unit or link in any
  translation, and each translation records the English it was made from, so a page never shows a
  translation of words the English no longer says.
- **A page that jumped.** Lighthouse measured a layout shift of 0.64 on the intro page: the
  footer painted at the bottom of the window and was pushed down when the page arrived. Showing
  it after the first navigation brought it to 0.

## Working with an AI coding agent

Most of the 2026 work was done with Claude Code, an AI coding agent: most commits since October
name it as co-author. I used it the way I would lead a fast, capable engineer. I decided what to
build and how it should behave, it wrote the code, and nothing reached production that the checks
below had not passed and I had not approved.

- **Plans first, in writing.** Most larger features were planned before the code, among them the
  deploy, sign-in and AI access, search and two-step sign-in (`docs/*-plan.md`). A decision record
  keeps each decision that shaped the app, written as it landed: what was decided, why, and what it
  costs ([docs/adr](adr/README.md)). Where a choice was mine, the record says so in my words, as
  ADR 25 does: "The reason for a confirm is to keep bad AI from going wild."
- **Checks that do not trust the author.** Every change runs the same gates whoever wrote it: the
  server, Angular and browser suites with their accessibility checks (the README gives their size
  and coverage, and CI checks those numbers), the MCP conformance suite, CodeQL, Lighthouse and the
  checks on 57 languages' messages. Security-sensitive work gets an adversarial review before it
  ships. Production deploys wait for my approval, and a failed health check rolls back.
- **What the checks caught.** The agent was wrong in ways a reviewer could have missed, and the
  gates found each one. These are from the week before 1.0:
  - It moved a test helper into a file the production build also compiles, using a name only the
    test build declares. The unit tests passed; CI's build stopped at "Cannot find name 'vi'".
  - Its first version of the README's number check read only numbers written on one line, so the
    ones Prettier had wrapped went unchecked. The check's own table in CI showed it, and a test now
    fails on any number the check cannot read.
  - On its first run that check found the README claiming 92% Angular coverage where CI measured
    91.41%: the number had been true once and nobody had looked since. Since then the Angular figure
    counts the app's own code, each component, service and template the tests load, and no longer
    the shared library in `lib/` (whose tests and coverage are the server's), the tests' helpers,
    the JSON messages or the data; the entry points are left to the browser tests and the prerender.
  - Turning coverage on in CI made the solver's tests slow enough to fail at random; CI's second
    run showed it before anyone relied on the numbers.
  - The Lighthouse tool it chose arrived with nine high-severity advisories in its dependencies.
    `npm audit` found them before the commit, and an override pins the fixed package.
  - In the translations, the blind back-translation of the safety text keeps catching what the AI
    translators get wrong; the "back-translation fixes" commits in the history are those catches.
- **What stays mine.** What to build and what to leave out, the trade-offs in the decision records,
  the review of anything touching accounts and security, and every merge and production deploy.

## Where it ended up

| Measure                          | 2017                  | At 1.0                                                                                     |
| -------------------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| Automated tests                  | basic API route tests | over 3,800: server, Angular unit and browser, with axe checks                              |
| Server statement coverage        | not measured          | 98%                                                                                        |
| Angular statement coverage       | not measured          | 99%                                                                                        |
| Standard materials and colorants | 53, from one book     | 219, each with a source and a status                                                       |
| Languages                        | English               | 57, right to left included                                                                 |
| Deploys                          | SSH and restart       | approved click, keyless, rolls back on a failed check                                      |
| Security headers                 | not measured          | Mozilla HTTP Observatory A+ (120)                                                          |
| Monthly cost                     | $15-17                | about $13                                                                                  |
| Load, on a container its size    | not measured          | about 250 requests a second at full CPU (a burst on the t4g.micro); 95th percentile 270 ms |
| Lighthouse (desktop)             | not measured          | performance 99; accessibility, best practices, SEO 100                                     |

## Limits, and what growing past them would take

Production had to be cheap ([ADR 1](adr/0001-one-ec2-instance.md)), and that sets its limits:

- **One `t4g.micro`, about $13 a month:** 2 vCPUs and 1 GB for the app, MongoDB, nginx and, at
  times, the staging copy. The CPU runs at full speed only while its credits last, then at 10% of
  each vCPU; with `standard` credits a busy spell slows it down instead of adding to the bill.
- **MongoDB on the same instance, standalone:** no replica set, so no failover and no
  transactions. A failure or a reboot of the instance is downtime.
- **Backups, but no timed restore:** a `mongodump` to S3 each night at 10:30 UTC and before each
  deploy, and an EBS snapshot each day, so up to about a day of changes could be lost. A restore
  (`deploy/restore.sh`) has not been timed, so there is no measured recovery time.
- **Limits in one process:** the rate limits, the MCP tools' and the authorization server's counts,
  and the rule of one import at a time per account live in the app's memory
  (`server/lib/rate_limit.ts`). A second instance would count apart, so each limit would allow its
  number on each. The authorization server's grants, tokens and consent steps are in MongoDB, with
  cookies signed by a key made from `APP_SECRET`, so those would carry over.

Growing past these limits would take:

- a larger instance: ADR 1 names `t4g.small` (2 GB) as the step up;
- for a second instance, a load balancer, which alone costs more than this whole setup (ADR 1;
  about $16-22 a month by [ADR 3](adr/0003-nginx-and-lets-encrypt.md)), and a store the instances
  share for what is now kept in memory;
- for failover, a MongoDB replica set on more than one machine;
- a CDN for the prerendered pages, which today get a fresh nonce from the server in each reply
  ([ADR 16](adr/0016-prerendered-public-pages.md)).

## What I would do next

- Give the recipe form a fuller redesign.
