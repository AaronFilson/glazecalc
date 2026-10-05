# glazecalc
Glaze calculation software to assist potters and ceramicists.

This software package is under development at present. It aims to enable the formulation of glazes on a device of your choice, such as a PC web browser, an iPhone or Android device, and other platforms. It is open sourced under the MIT license, which is available for viewing under LICENSE.

## Requirements

To run Glaze Calc from a `git clone` you need the tools below. Each row links to the tool, to
the page with its installer or install command, and gives the command that shows the installed
version in a terminal.

| Tool | Needed for | Install | Check the version |
| --- | --- | --- | --- |
| [Git](https://git-scm.com/) | Cloning the repository | [Downloads](https://git-scm.com/downloads) | `git --version` |
| [Node.js](https://nodejs.org/) 24 LTS (22.22 or later also works) | Building and running the app | [Download Node.js](https://nodejs.org/en/download) | `node --version` |
| [npm](https://www.npmjs.com/) 11 (comes with Node.js 24) | Installing packages, running scripts | [Installing npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) | `npm --version` |
| [MongoDB Community Server](https://www.mongodb.com/products/self-managed/community-edition) 9.0 (4.4 or later works) | The database | [Download MongoDB](https://www.mongodb.com/try/download/community) | `mongod --version` |
| A modern web browser, such as [Firefox](https://www.mozilla.org/firefox/) or [Chrome](https://www.google.com/chrome/) | Using the app | [Firefox download](https://www.mozilla.org/firefox/new/) | Help → About in the browser |

Optional, depending on what you do:

| Tool | Needed for | Install | Check the version |
| --- | --- | --- | --- |
| [nvm-windows](https://github.com/coreybutler/nvm-windows) or [nvm](https://github.com/nvm-sh/nvm) (macOS, Linux) | Switching between Node.js versions | [nvm-windows releases](https://github.com/coreybutler/nvm-windows/releases), [nvm install script](https://github.com/nvm-sh/nvm#installing-and-updating) | `nvm version` (Windows), `nvm --version` |
| [MongoDB Shell (mongosh)](https://www.mongodb.com/docs/mongodb-shell/) | Looking at the database by hand | [Download mongosh](https://www.mongodb.com/try/download/shell) | `mongosh --version` |
| [Docker Engine](https://docs.docker.com/engine/) with [Docker Compose](https://docs.docker.com/compose/) | Running the app and MongoDB in containers | [Install Docker Engine](https://docs.docker.com/engine/install/) | `docker --version` and `docker compose version` |
| [WSL](https://learn.microsoft.com/windows/wsl/) 2.1.5 or later (Windows only) | Running Docker inside Linux on Windows | [Install WSL](https://learn.microsoft.com/windows/wsl/install) | `wsl --version` |
| [Playwright](https://playwright.dev/) Chromium | The browser tests | [Install browsers](https://playwright.dev/docs/browsers#install-browsers): `npx playwright install chromium` | `npx playwright --version` |

The Angular CLI, TypeScript, ESLint and the test runners are installed into the project by
`npm install`, so they need no separate install; `npx ng version` shows the Angular versions.

## Getting started

    git clone https://github.com/AaronFilson/glazecalc.git
    cd glazecalc
    npm install
    mkdir db
    mongod --dbpath ./db              # in a second terminal; leave it running
    npm run seed                      # standard materials, additives and advice
    npm run dev                       # then open http://localhost:3000

Settings such as APP_SECRET and MONGOLAB_URI can go in a `.env` file (copy `.env.example`); the
scripts load it with Node's built-in `--env-file` support.

## Project structure

Glaze Calc is one Node.js server: it serves the built Angular client and a JSON API under `/api`
on the same port, and keeps its data in MongoDB.

    client/           Angular 22 app (standalone components, signals, hash routing)
      app/core/         API access, sign-in, data models
      app/pages/        one folder per screen: recipe, material, additive, firing, notes, advice, ...
      app/shared/       page navigation, messages, option lists
      public/           images and favicon copied into the build
      styles.scss       site styles, on top of Bootstrap 5
    lib/chemistry/    glaze chemistry (molar masses, material analyses, unity formula), used by
                      both the client and the server
    server.js         the server: API routes under /api plus the built client
    server/
      routes/           API routes for each collection (recipes, materials, notes, ...) and accounts
      models/           Mongoose schemas
      lib/              sign-in (JWT), shared route handlers, error handling
      test/             server and chemistry tests (Mocha)
    e2e/              browser tests (Playwright)
    scripts/          dev runner (npm run dev) and the seed script
    materials.json, additives.json, advice.json
                      the standard data loaded by npm run seed
    Dockerfile, compose.yaml
                      production container image, and the app plus MongoDB in containers
    deploy/           production on EC2: Compose file, nginx, cloud-init, deploy and backup
                      scripts, AWS policies and setup commands (see deploy/README.md)
    .github/          CI workflow and Dependabot settings
    docs/             setup notes (Docker in WSL Debian on Windows)

## Scripts

    npm run dev      Angular dev server on port 3000 with live reload; it forwards /api to the
                     API server on port 4000, which restarts when server code changes
    npm run build    production build of the client into dist/glazecalc/browser
    npm start        builds, then runs one server on port 3000 (PORT) with the app and its API
    npm run seed     loads the standard materials, additives and advice into MONGOLAB_URI
    npm run lint     checks the code with ESLint

`npm run seed` replaces standard records with the same id, so it is safe to run again after the
data files change, and it leaves users' own entries alone. All scripts work in any shell,
including PowerShell and cmd. On Node 22 and later, `node --run <script>` starts a script a little
faster than `npm run`.

## Tests

With mongod running, `npm test` runs the server and chemistry tests and `npm run test:client` runs
the client unit tests; `npm run test:coverage` and `npm run test:client:coverage` add coverage
reports, and `npm run test:all` runs everything including the browser tests. If there are any
failures on the tests, it may be there was a problem with the install or an unexpected version
issue.

Browser tests use Playwright. Install the browser once with `npx playwright install chromium`,
start mongod and run `npm run test:e2e`. The tests build the app, run the server on port 3100
(E2E_PORT), and use their own `glazecalc_e2e` database, which they reset and fill with the
standard materials each run. `npx playwright show-report` opens the results.

`npm run lint` checks the code with ESLint (likely bugs, Angular and template accessibility
rules). Prettier settings in `.prettierrc.json` match the existing style for editors that format
on save; the existing code has not been reformatted wholesale, so run `npm run format -- <files>`
only on files you are changing.

GitHub Actions runs the build, lint, an npm audit and all three test suites on pushes to master
and on pull requests (`.github/workflows/ci.yml`), against a MongoDB 9 service container, and
builds and checks the Docker image.

## Docker

The Dockerfile builds a production image (Node 24 on Debian slim, running as a non-root user,
with a health check on /api/health, which also checks the database). compose.yaml runs it with MongoDB 9, storing the data in a named volume:

    APP_SECRET=<long random string> docker compose up -d --build
    docker compose run --rm app node scripts/seed-standard.js    # standard data, once
    docker compose logs -f app
    docker compose down                                          # data stays in the volume

APP_SECRET can also go in .env, which Compose reads. The app is published on 127.0.0.1:3000 only
(APP_PORT changes the port); put a reverse proxy in front for public access, because ports Docker
publishes bypass ufw. `docs/wsl-local-deploy-debian.md` covers running Docker inside WSL Debian
on Windows.

## Running it for other people

`npm start` runs one Node server on port 3000 (set PORT to change it) that serves the built client
and the JSON API under `/api`, so the browser only ever talks to one address. When hosting on a
domain, put a reverse proxy such as Caddy or nginx in front of that port for HTTPS.

Create a user account to store the recipes and materials. If there is any chance the app will be
exposed to multiple users or the internet, set APP_SECRET to a long random value (it is required
when NODE_ENV=production). Changing the APP_SECRET will invalidate tokens saved by users, which is
useful in some cases.

There is no size limit imposed on users of the Glaze Calc app, so if you host it on the internet,
you may want to extend this package to do so.
