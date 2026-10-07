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
  colorants there are 204, from the US, UK, EU, Australia and New Zealand. A recipe that uses one
  that is gone names what is used now, and can swap it in and compare the two. The hard part was not overclaiming: a swap counts as
  like for like only when the two give much the same oxides gram for gram. Niter to a frit does
  not, so the app says to work the amount out again, and it says so when a replacement still has
  lead.
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
- **A page that jumped.** Lighthouse measured a layout shift of 0.64 on the intro page: the
  footer painted at the bottom of the window and was pushed down when the page arrived. Showing
  it after the first navigation brought it to 0.

## Where it ended up

| Measure                          | 2017                  | Now                                                    |
| -------------------------------- | --------------------- | ------------------------------------------------------ |
| Automated tests                  | basic API route tests | 522: server, Angular unit and browser, with axe checks |
| Server statement coverage        | not measured          | 98.5%                                                  |
| Standard materials and colorants | 53, from one book     | 204, each with a source and a status                   |
| Deploys                          | SSH and restart       | approved click, keyless, rolls back on a failed check  |
| Monthly cost                     | $15-17                | about $13                                              |
| Lighthouse (desktop)             | not measured          | performance 99; accessibility, best practices, SEO 100 |

## What I would do next

- When a swap is not like for like, suggest amounts that bring the unity formula back.
- Give the recipe form a fuller redesign.
