# 28. Offline: Angular's service worker keeps the app, and the app keeps the reader's language

Accepted, 2026-10-31.

## Context

Potters work where the signal is poor: a studio in a basement, a shed with the kiln, a market stall. With the
network cut, every page failed to reload, although the chemistry runs in the browser
([ADR 4](0004-shared-chemistry.md)) and the guides and safety pages are files. The research (round 9,
`scratch/round9/offline/report.md`) found the work in three parts: the app and the public pages (a service
worker), the reader's own records (IndexedDB, opt in) and offline editing. The owner chose the first part, with
these answers, on 2026-10-31: Angular's service worker, not Workbox; the reader's language and English only;
Urdu in the system's font first, then Nastaliq; a banner for a new version, then silent on the next open; a quiet
install button in the menu; no records on the phone and no offline editing yet (stage 3 and 4 wait).

## Decision

**Angular's service worker (`@angular/service-worker`), registered 30 seconds after the page is up at the latest
(`registerWhenStable:30000`), so its downloads never compete with the page's own.** It fits the build, has update
events, and its manifest hashes every file it keeps. Only in a production build: `ng serve` and the development
build have none, and the browser tests block it except in `e2e/offline.spec.js`.

**The build adds it after `ng build` (`scripts/service-worker.mjs`), not through `angular.json`'s
`serviceWorker` option.** The option takes `index.html` as the page to keep, and the server never sends that file
as it is: each page gets its address's language, canonical link and a new style nonce for Angular's styles
(`server/app.ts`), and `/index.html` redirects to `/`. The worker checks the files it fetches against the hashes in
its manifest, so the page it keeps must be byte for byte what the server sends for it. The script therefore writes:

- **`app-shell.html`**: `index.html` with a nonce written into `<gc-root ngCspNonce="…">`, taken from a hash of
  the file, so it is the same for the life of a build and new for the next. The server sends it as it is, with a
  policy that names that nonce, `no-cache` and `X-Robots-Tag: noindex`. The worker keeps the page with its policy,
  so Angular's styles pass the check offline. A nonce that does not change is weaker than one for each reply; the
  styles it allows are our own files, the scripts are allowed by hash as before, and it is used only offline.
- **`ngsw.json`**, from `ngsw-config.json` with Angular's own generator; and **`ngsw-worker.js`**.
- **`standard/materials.json` and `standard/additives.json`**, the standard library as `GET
/api/<kind>/getStandard` sends it (the schema's empty lists included; a test compares them with Mongoose's
  own output). The recipe page falls back to them when the request fails with no network at all (status 0).
  The worker never keeps a reply from `/api`: they are `no-store` for a reason, and a test walks the caches
  after a signed-in session.

**What it keeps** (`ngsw-config.json`):

- `app`, fetched at install: the offline page, the manifest, icons, the stylesheet, every script (about 1.6 MB
  of chunks: a lazy chunk fetched later would be missing exactly when it is wanted), the standard library, and the
  Latin Lora font.
- `more`, kept as they are first used: the other fonts (Nastaliq for Urdu readers only) and images.
- Not the translations (`/i18n/`): 44 languages are several megabytes, and a reader needs one.

**Navigation** uses the `freshness` strategy: online, every address goes to the server as before (the prerendered
page, a nonce for each reply, the private headers); only a failed request is answered with the offline page, and
the router draws the page in it. The worker leaves alone, so they fail offline rather than show a stale or empty
page: the API, OAuth, MCP and `.well-known`; the pages that sign in or hold an account (`/signin`, `/signup`,
`/forgot`, `/reset`, `/confirm-email`, `/account`); a shared recipe; the pages an app's connect or approve link
opens (`/connect/…`, `/confirm/…`); each also under a language's prefix. A test keeps that list.

**The reader's language and English are kept by the app** (`client/app/core/offline-languages.ts`, the list of
files in `lib/offline-files.js`): in the background four seconds after the page opens, then at most once a day, it
fetches the messages of each part of the app and each guide's Markdown for the page's language and for English into
Cache Storage (`gc-i18n`), removes any other language's, and asks the browser to keep the storage
(`navigator.storage.persist()`). An HTTP interceptor reads them only when the network fails (status 0), so a
reply that came, or a 404, is as before. A language chosen in the footer with no network opens only if it is
saved; else the footer says it is not saved on this phone and the page stays.

**A new version**: the worker downloads it in the background and the tabs open keep the old one; a banner says "A
new version of Glazecalc is ready" with Reload and Not now. Reload activates it and loads the page again; ignored,
the next page that opens runs the new version, which is the silent update. The banner waits while the recipe page has
changes not saved (a reload would lose them), and a worker that cannot go on (`unrecoverable`) loads the page again,
at most once a minute. A tab opened before a release whose old code file is gone is still handled by
`reloadIfCodeIsMissing`; with the worker present its old files are served from its cache, and that path is the
fallback when there is no worker or it is broken.

**Install**: `beforeinstallprompt` is kept, and "Install app" is a menu button while one is kept and the app is not
already installed (`display-mode: standalone`). Never a popup. Safari has no such event: nothing is shown.

**The kill switch.** A broken worker is sticky: it serves its own copy of the app. Angular ships a worker that
clears every cache and unregisters itself; the build copies it as `safety-worker.js` (and `worker-basic.min.js`).
To use it, set `KILL_SWITCH` to true in `scripts/service-worker.mjs` (the one line that makes `ngsw-worker.js` that
worker), deploy, wait until traffic has fetched it (browsers look for a new worker file at each page load, and
at least every 24 hours), then remove the registration from `app.config.ts` in the next release. The steps are
in `deploy/README.md`.

## Consequences

- A release is two things to keep in step: the page the server writes online and the shell the worker keeps.
  `app-shell.html` comes from the same `index.html`, so a build changes both; tests check the hash in `ngsw.json`
  against the file, and that the server sends the file as it is.
- Nothing in `browser/` may change after `scripts/service-worker.mjs` runs: the prerender writes outside it
  (ADR 16), and the script is in the Docker build stage's `COPY` line and in `e2e-build.mjs`'s list of sources.
- The cached set is about 2 MB for the app, 0.1 to 0.5 MB for a language and English; the browser test fails above
  3 MB. First visit costs the downloads of the `app` group in the background after the page is stable.
- A signed-in person offline gets the calculator, the guides, the safety pages, the cone chart and the materials;
  their own recipes, notes and firing logs are not on the phone (stage 3, opt in, off by default, cleared on
  sign out) and saving waits for a network (stage 4, not planned).
- A signed-out visitor offline who opens `/recipe` is sent to the sign-in page, which needs the network: the
  calculator offline is for a session already on the device (an account or a trial).
- Messages for the new notices are in English only (`offline.*` in `client/public/i18n/en.json`); other languages
  show them in English until a translation wave adds them.

## Alternatives considered

- **Workbox**: more flexible, but one more build step to keep in step with Angular's output and the prerendered
  pages outside `browser/`.
- **`serviceWorker` in `angular.json`**: needs `index.html` as the kept page; see above.
- **Caching `/api` replies in the worker (the library)**: rejected by the owner's lead; the build writes the
  library as a file, so `/api` is never kept.
- **Keeping all 44 languages**: several megabytes for one reader's use.
- **A data group for `/i18n/` in the worker**: it keeps what is fetched, but cannot be told to drop the languages a
  reader left, nor to fetch the files a reader has not opened yet.
