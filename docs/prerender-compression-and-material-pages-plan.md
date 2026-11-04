# Plan: compressed prerendered pages, and material pages in every language

Written 2026-11-04 on `r14-teach`. No code is changed yet. The repo keeps plans as `docs/<name>-plan.md`
(`docs/seo-plan.md`, `docs/mfa-plan.md`, `docs/ec2-deploy-plan.md`), so this plan is here rather than in
a new `docs/plans/` folder.

The aim, in the owner's words: make the prerendered pages compressed (a speed win), and get the material
pages indexed in each language, so a person who searches for a material in their own language has a
quick, good first visit.

The measuring scripts are in `scratch/round14/prerender-plan/`:

- `measure.mjs` compresses the built pages in `dist/glazecalc/prerendered` and times it.
- `material-status.mjs` counts, from the code and data as they are now, how much of each material page
  is translated in each live language. It writes `material-status.md`.

---

## Part A. Compressed prerendered pages

### What was built (2026-11-04, branch `r14-compress`)

Option 2, as the owner chose (fresh nonce per reply; no process nonce, no cache, no brotli 11 job):

- `server/lib/compress.ts`: `chooseEncoding` (brotli if the client takes it, else gzip, else none; `q=0` and
  `*` honoured, the client's order not followed) and `sendCompressed`, which sets `Vary: Accept-Encoding`,
  `Content-Encoding` and `Content-Length`, and sends no body to a HEAD. Replies under 1 kB go plain.
  Brotli quality 5 (text mode, size hint), gzip level 5.
- `server/app.ts`: every page reply (prerendered or index.html, 200 or 404) is compressed after the nonce is
  put in, with `Cache-Control: no-cache` as before and no ETag (it could never match). The sitemap is
  compressed once per site address and encoding, kept in memory beside the plain one, and gets a strong
  ETag (text hash plus encoding) so a 304 still works.
- nginx: `gzip_comp_level 5` in both site configs (test in `server/test/nginx_policy_tests.ts`). nginx's gzip
  skips a reply that already has `Content-Encoding`, so pages and the sitemap are not compressed twice; JS,
  CSS, JSON and the rest are still gzipped by nginx, now at level 5.
- Tests: `server/test/compress_tests.ts` (each encoding, Vary, Content-Length equal to the bytes sent, HEAD,
  a 404, two replies with different nonces, the sitemap's ETag and 304).

Measured per reply on this Windows machine (median of 15, `scratch/r14-compress/measure.mjs`):

| Page (raw)                    | gzip 1 (nginx before) | gzip 5           | brotli 5 (now)   |
| ----------------------------- | --------------------- | ---------------- | ---------------- |
| en/index.html (110 kB)        | 38.6 kB, 1.2 ms       | 34.9 kB, 1.9 ms  | 32.7 kB, 3.2 ms  |
| en/materials/silica.html (65) | 22.4 kB, 0.6 ms       | 21.0 kB, 1.0 ms  | 19.5 kB, 2.3 ms  |
| de/cones.html (131)           | 42.4 kB, 1.1 ms       | 38.4 kB, 2.0 ms  | 35.2 kB, 3.4 ms  |
| de/guides/firing.html (310)   | 90.5 kB, 2.5 ms       | 80.2 kB, 4.8 ms  | 66.1 kB, 6.2 ms  |
| ta/guides/firing.html (574)   | 130.6 kB, 3.4 ms      | 100.6 kB, 7.8 ms | 82.1 kB, 10.0 ms |

Brotli 6 saved 1 to 6% more for 15 to 35% more time, and gzip 6 under 1% more for 20 to 60% more, so 5 for
both. On a t4g.micro expect 2 to 3 times these times (about 5 to 30 ms per page), in place of nginx's gzip 1.

The sections below are the plan as written before the owner's decision.

### How it works today

- The build writes each page to `dist/glazecalc/prerendered/<lang>/<page>.html`
  (`scripts/prerender.mjs:255-257`). Each page has the placeholder `__GC_NONCE__` wherever a nonce goes
  (`scripts/prerender.mjs:116`, `:124`; `client/app/app.config.server.ts:12`).
- For each request the server reads the file from disk (`server/lib/prerendered.ts:16-23`, called at
  `server/app.ts:306-307`). It does not keep pages in memory, on purpose: about 100 MB of heap on a 1 GB
  machine (`server/lib/prerendered.ts:1-8`).
- It then runs `pageHtml` (`server/lib/pages.ts:247-318`). This adds the canonical link, hreflang,
  og:locale, og:url and og:image. These depend on `SITE_URL`, which is set at run time
  (`deploy/compose.prod.yaml:43`, `deploy/compose.staging.yaml:46`), and on `SITE_LABEL` (the staging
  banner). So the final HTML cannot be made at build time with the image as it is.
- Then `withNonce` swaps in a new random nonce (`server/lib/pages.ts:189`; nonce made at
  `server/app.ts:324`) and sends it with `Cache-Control: no-cache` (`server/app.ts:327`). No ETag is
  set by us; Express adds a weak ETag to `res.send` bodies, but since the nonce changes every time, it
  never matches, so a browser never gets a 304.
- **Compression: Node does none.** There is no `compression` middleware (no dependency in
  `package.json`). **nginx gzips** the reply: `gzip_vary on` and `gzip_types` in
  `deploy/nginx/glazecalc-proxy.conf:9-14` (`text/html` is always included). `gzip_comp_level` is not
  set, so it is nginx's default, **level 1**. `gzip on` comes from Debian's stock `nginx.conf`. There
  is **no brotli** (Debian's nginx has no brotli module unless `libnginx-mod-http-brotli` is added).
  `server/test/nginx_policy_tests.ts:111` checks the gzip types.

### What the nonce protects

There are three CSP policies on a page (`deploy/nginx/glazecalc-proxy.conf:19-34`):

1. nginx: everything from this site only.
2. The app's header (`server/app.ts:66-77`): **`style-src 'self' 'nonce-…'`**. This is the only place
   the nonce is used. Angular adds each component's styles as `<style>` elements and gives them the
   nonce (`ngCspNonce` on `<gc-root>`).
3. The build's `<meta>` policy (`angular.json:80`, `autoCsp`): **scripts are allowed by hash** and
   `'strict-dynamic'`. Scripts never depend on the nonce.

So the nonce only stops an injected `<style>` element. That is CSS injection, which is a smaller risk
than script injection (it can restyle or, with tricks, leak attribute values). Note the app already
ships **one fixed nonce for the whole build** in `app-shell.html`, the page the service worker shows
offline (`server/app.ts:223-242`, `docs/adr/0028-service-worker.md`). Every returning visitor with the
worker already runs on a nonce that is the same for everyone.

### Measurements

From `scratch/round14/prerender-plan/measure.mjs` on this Windows machine (a t4g.micro core is slower,
roughly 2 to 3 times; the ratios hold).

All 1082 pages: 232.8 MB raw, **60.6 MB at gzip 9, 46.2 MB at brotli 11**.

| Page (raw)                                  | gzip 1 (now)     | gzip 9          | brotli 4        | brotli 5        | brotli 11       | brotli 11 saves vs now |
| ------------------------------------------- | ---------------- | --------------- | --------------- | --------------- | --------------- | ---------------------- |
| en/index.html (110 kB)                      | 38.6 kB, 1.0 ms  | 34.7 kB, 2.5 ms | 34.2 kB, 1.6 ms | 32.7 kB, 3.1 ms | 28.8 kB, 143 ms | 25%                    |
| en/materials/silica.html (65 kB)            | 22.4 kB, 0.6 ms  | 20.9 kB, 1.1 ms | 20.1 kB, 0.9 ms | 19.5 kB, 1.9 ms | 17.1 kB, 83 ms  | 24%                    |
| en/materials.html (95 kB)                   | 25.7 kB, 0.7 ms  | 23.8 kB, 1.8 ms | 23.3 kB, 1.3 ms | 22.4 kB, 2.5 ms | 19.7 kB, 133 ms | 23%                    |
| de/cones.html (131 kB)                      | 42.4 kB, 1.5 ms  | 38.0 kB, 2.7 ms | 36.6 kB, 1.9 ms | 35.2 kB, 3.5 ms | 31.0 kB, 211 ms | 27%                    |
| de/guides/firing.html (310 kB)              | 90.5 kB, 2.6 ms  | 79.0 kB, 7.5 ms | 70.4 kB, 3.9 ms | 66.1 kB, 7.3 ms | 58.2 kB, 446 ms | 36%                    |
| ta/guides/firing.html (574 kB, the largest) | 130.6 kB, 4.2 ms | 95.2 kB, 53 ms  | 94.7 kB, 9.1 ms | 82.1 kB, 9.7 ms | 61.5 kB, 739 ms | 53%                    |

The nonce swap itself costs 0.3 to 1.8 ms. So:

- **Brotli 11 sends 23 to 53% fewer bytes than today**, most on the long non-Latin guides. On a slow
  mobile link (1.6 Mbit/s) 69 kB less on the Tamil guide is about 0.35 s sooner.
- Brotli 11 is far too slow per reply (83 to 739 ms here, more on a t4g core). It must be done once.
- Brotli 5 per reply costs 2 to 10 ms here (about 5 to 25 ms on a t4g.micro) and gets about half the
  saving. Gzip 1 in nginx costs 0.6 to 4 ms per reply today.

### Options

| Option                                                                        | Keeps a fresh nonce per reply                                   | CPU per reply                | Bytes sent                    | Disk            | Work                                                       |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------- | ----------------------------- | --------------- | ---------------------------------------------------------- |
| 0. As now: nginx gzip level 1                                                 | yes                                                             | gzip 1 in nginx              | largest                       | none            | none                                                       |
| 1. Raise nginx `gzip_comp_level` to 5 or 6                                    | yes                                                             | a little more in nginx       | about 10 to 15% less than now | none            | S                                                          |
| 2. Node compresses each reply with brotli 4 or 5, nginx passes it through     | yes                                                             | brotli 4/5 in Node per reply | about 20% less than gzip 1    | none            | S/M                                                        |
| 3. One nonce per process (or per build), compressed copies made once and kept | no: one nonce for all readers, as `app-shell.html` already does | almost none after the first  | smallest (brotli 11)          | a cache on disk | M                                                          |
| 4. Hashes in place of the nonce for styles                                    | yes, no nonce at all                                            | none after the first         | smallest                      | as 3            | L, fragile                                                 |
| 5. Nonce in an uncompressed prefix                                            | —                                                               | —                            | —                             | —               | not possible: one `Content-Encoding` covers the whole body |

Notes on each:

- **Option 4** would list a hash for every component's styles in `style-src`. Angular makes those
  `<style>` elements at run time from the compiled components; the list changes with every style
  change, and a lazy chunk's styles must be in the list too. Possible, but brittle, and the header
  grows. Not recommended.
- **Option 5** does not work. A gzip or brotli stream is one stream. (Gzip allows two members
  joined, and browsers read them, but brotli does not, and it is not something to rely on.)
- **Option 3's cost** is that the style nonce is the same for every reader until the next restart.
  Someone who could already inject HTML into a page could read the nonce from any page and use it for a
  `<style>`. It does not touch scripts. The site already accepts this for the offline shell. The public
  pages show no reader input before the app starts.
- Precompressing **at build** (brotli 11 and gzip 9 files next to each `.html`) does not work as such,
  because `pageHtml` needs `SITE_URL` and `SITE_LABEL`, which come at run time. Either the build would
  bake them in (one image per site, which the deploy does not do: staging and production run the same
  kind of image with different env), or the server makes the final page once per process, as in
  option 3.

### Recommendation

**Option 3, done in the server, with a small disk cache.** In detail:

1. At start, the server makes one random style nonce for the process (16 bytes, as now).
2. The first request for a page and encoding (`br`, `gzip`, or none) builds the final HTML (read file,
   `pageHtml`, `withNonce` with the process nonce), compresses it, and writes it to a cache folder
   (`/tmp/glazecalc-pages/<hash of build id + site + label>/<key>.<enc>`, inside the container, so it
   goes with the container). Later requests stream the file.
   - Brotli at quality 11 is too slow for the first request; use **brotli 5 at first request**, and a
     background job (one at a time, low priority, `setImmediate` loop or a worker thread) that re-does
     each cached page at **brotli 11**. Optionally warm all pages at start in the same background job.
   - Gzip at level 9 for clients without brotli; uncompressed for the rare rest.
3. The reply gets `Content-Encoding`, `Vary: Accept-Encoding`, `Content-Length`, a **strong ETag** (hash
   of the uncompressed final HTML, plus the encoding), and `Cache-Control: no-cache` as now. A browser
   that comes back gets a **304** without a body. That works now only because the nonce no longer
   changes.
4. nginx must not compress again. It does not: nginx skips gzip when the upstream reply already has
   `Content-Encoding`. Keep `gzip_vary on`. Add a test that a prerendered reply for `Accept-Encoding: br`
   carries `Content-Encoding: br` through.
5. Raise nginx `gzip_comp_level 5` anyway (option 1), for the JS, CSS, JSON and the sitemap. That
   is a separate one-line change with its own test in `server/test/nginx_policy_tests.ts`.

**Fallback if the owner wants to keep a fresh nonce per reply: option 2** (brotli 5 in Node per
reply). It keeps today's security exactly, still saves bytes over gzip 1, but spends CPU on every
reply and gives no 304s.

What it saves (see the table above): per page view, CPU for compressing drops from one gzip per reply
in nginx to nothing in nginx and a file read in Node; bytes on the wire drop by the brotli 11 against
gzip 1 difference; repeat visits get 304s.

Disk on the t4g.micro: the cache holds at most one brotli and one gzip copy per page. For today's
1082 pages that is 46 + 61 = **about 107 MB**. With Part B's 9,520 material pages (about 17 kB brotli

- 21 kB gzip each) add **about 360 MB**, so about 470 MB in all. It lives in the running container's
  `/tmp`, so the two kept images do not hold it. Cap it (600 MB) and let it fill lazily; gzip copies
  are rarely asked for (nearly every browser sends `br`), so most of the gzip share never fills.

Per reply after the first: no compression at all (today: gzip 1 in nginx, 0.6 to 4 ms), no nonce
swap (0.3 to 1.8 ms), and 23 to 53% fewer bytes. TTFB gains a few ms; the larger win is the
transfer time and the 304s.

Memory: none held; the kernel's file cache keeps the busy pages.

### Steps (Part A)

| #   | Step                                                                                                                               | Effort | Files                                                                                | Tests                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | nginx `gzip_comp_level 5` in both site configs                                                                                     | S      | `deploy/nginx/glazecalc-proxy.conf`, `glazecalc-staging.conf`                        | `server/test/nginx_policy_tests.ts` (both the same)                                                                                                                                                                                |
| A2  | Process nonce: one per process for prerendered pages and index.html; keep the CSP header builder                                   | S      | `server/app.ts:324`                                                                  | `server/test/client_routes_tests.ts:66` and `:130` change: two replies now share the nonce; add a test that a restart (a new app) gets a new one                                                                                   |
| A3  | Page cache: build, compress (brotli 5 / gzip 9), write, serve with ETag, Vary, Content-Length, 304                                 | M      | new `server/lib/page-cache.ts`; `server/app.ts:297-340`; `server/lib/prerendered.ts` | new `server/test/page_cache_tests.ts`: right encoding for each `Accept-Encoding` (`br;q=0`, `gzip`, `*`, none), 304 on `If-None-Match`, HEAD, body equals today's HTML once decoded, cache key changes with build and `SITE_LABEL` |
| A4  | Background upgrade to brotli 11, and optional warm-up at start                                                                     | S      | `server/lib/page-cache.ts`                                                           | unit test with a fake clock or a direct call                                                                                                                                                                                       |
| A5  | Docs: ADR 0016 consequences, `docs/seo-plan.md` row 7, the CSP comments in `server/app.ts` and `deploy/nginx/glazecalc-proxy.conf` | S      | those files                                                                          | —                                                                                                                                                                                                                                  |
| A6  | Browser tests: CSP still holds on every page (`e2e/csp.spec.js`), prerender adoption (`e2e/prerender.spec.js`)                     | S      | —                                                                                    | `npm run test:e2e:linux`                                                                                                                                                                                                           |

Measure: before and after, `curl --compressed -w '%{size_download} %{time_starttransfer}'` against
staging for 10 pages; Lighthouse on 3 pages; Search Console's Core Web Vitals and crawl stats (average
response time) over 4 weeks.

---

## Part B. Material pages indexed in every language

### How it works today

- `lib/pages.js:53`: every `/materials/<slug>` is in `ENGLISH_ONLY_PAGES`.
- `lib/pages.js:86-89`: `prerenderLanguages` gives material pages English alone. The comment says
  why: disk, and that the page "draws in the browser".
- `server/lib/pages.ts:270-276`: each other language's copy has canonical to English and `noindex`,
  and no hreflang. `server/lib/pages.ts:338-339`: the sitemap lists the English alone.
- `lib/page-dates.js:26` and `:32`: a material page's date comes from `en.json`,
  `data/materials.ndjson` and `records/en.json` only.
- `client/app/shared/structured-data.ts:70` and `client/app/app.routes.ts:89` say the same in comments.
- `server/test/pages_tests.ts:643`, `:673`, `:699` and `server/test/prerender_tests.ts:108` assert it.
- The page itself (`client/app/pages/materials/material-info-page.ts`) is fully translated for a
  reader: its labels come from `client/public/i18n/reference/<lang>.json`, the kinds and statuses from
  `<lang>.json`, and each note, hazard and "Theoretical formula" from `records/<lang>.json` through
  `scripts/material-i18n.mjs` (served as `/i18n/materials/<lang>.json`). A text with no translation
  shows in English with `lang="en"` (`client/app/pages/materials/reference-text.ts:29-38`). In a
  language outside `REFERENCE_LANGUAGES` the whole page is English with a notice.

### Translation status now (from code and data, not from older docs)

From `scratch/round14/prerender-plan/material-status.mjs`. 170 materials, 57 live languages, and **all
57 are in `REFERENCE_LANGUAGES`**.

- "chrome": the page's own labels (`reference.material.*`, `reference.notTranslated`,
  `reference.materials.crumb`, the kind and status names, `titles.materialInfo`, `meta.materialInfo*`)
  that exist in the language and differ from the English, of 56.
- "full": materials whose every note, hazard and source text has a translation in `records/<lang>.json`.
  "part" / "none": some or none. Every material has at least one such text.
- "translated words": the average share of a page's visible words that are in the language. The rest is
  the material's name (repeated in heading and captions), oxide formulae, figures, other names, the
  maker and source citations, which are the same in every language. It is an estimate (the chrome is
  counted once per page).

| lang                                                                                                                                                         | chrome | full | part | none | translated words % |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---- | ---- | ---- | ------------------ |
| bg, da, de, el, es, ga, hu, lt, lv, pl, ro, sl, sv, ja, zh-Hant, ko, zh-Hans, th, ar, hi, ur, bn, ta, mr, kn, te, gu, ml, pa, or, ne, si, es-419, am, zu, qu | 55/56  | 170  | 0    | 0    | 81                 |
| cs, et, fi, sk, tr                                                                                                                                           | 56/56  | 170  | 0    | 0    | 82                 |
| hr, it, pt-BR, sw                                                                                                                                            | 54/56  | 170  | 0    | 0    | 79                 |
| fr, mt, nl, pt-PT, id, vi                                                                                                                                    | 53/56  | 170  | 0    | 0    | 78                 |
| af, ha, yo, so                                                                                                                                               | 52/56  | 170  | 0    | 0    | 77                 |
| ig                                                                                                                                                           | 50/56  | 170  | 0    | 0    | 74                 |

(The per-language table is in `scratch/round14/prerender-plan/material-status.md`.)

What this shows:

- **Every material's own text (notes, hazards) is translated in all 56 languages: 170 of 170, no
  English fallback.**
- The labels are 50 to 56 of 56. The few "missing" are keys whose translation is the same as the
  English (a word like "LOI", a name, or a status the language writes the same); a check by eye on
  ig (50) and af/ha/yo/so (52) should confirm none is really untranslated before launch.
- **About 75 to 80% of each page's words are in the language.** The rest is numbers, formulae and
  proper names, which are the same in every language and are what a person searching for "Feldspat
  Kali Analyse" or "カリ長石 成分" wants.

**Rule for "usefully translated"** (to put in `lib/pages.js` as code, not as a list):
a language gets material pages indexed when it is in `REFERENCE_LANGUAGES` and the material's
notes and hazards all have a translation in `records/<lang>.json`. A material that fails (a note
changed in English and not yet translated) stays prerendered for readers but is `noindex`, canonical
to English, until the translation lands. Today that excludes nothing: 56 × 170 = **9,520 new indexed
pages**.

### Near-duplicate risk

- **Across languages**: not a problem. Each language's copy is a translation, joined by hreflang
  (each page lists all its languages and x-default), which is what Google asks for.
- **Within a language, across materials**: the risk is real but moderate. All 170 pages share the same
  labels and the same "care" and "use" paragraphs; what differs is the name, the table, the notes and
  the hazards. The English pages already have this shape and are indexed. Two things help:
  - the notes are each material's own (all translated);
  - the "similar" and "replaces" links make each page part of a web, not a stand-alone table.
- **Thin pages**: some materials have one short note. Watch Search Console's "Crawled, currently not
  indexed" for those. If a language has many, that is a signal to add a line per material (see
  engagement), not to drop the page.

### What the visitor arriving from search gets

Today the page ends with "Use this material in a recipe" (`/recipe`) and "All materials"
(`material-info-page.ts:222-229`), and links to the safe-mixing and home-safety guides
(`:214-219`). Proposed, in order of value:

1. **Make the main button work without an account.** `/recipe` asks a new visitor to sign in. The
   app has trials (`server/routes/guest_routes.ts:3`, `POST /api/guest`). Send the button to the
   recipe page with this material already added (`/recipe?add=<slug>`), starting a trial if the person
   is not signed in. This is the "quick, positive first visit". Effort M.
2. **Link the guides in the page's language.** The care paragraph already links two guides; add
   "Glazing basics" and "Making a glaze" for a beginner. Effort S (two links, labels exist).
3. **Substitutes as links** already exist (`similar`, `replaces`). Keep them prominent. Effort none.
4. Titles stay short. `titles.materialInfo` ("{name}: oxide analysis and hazards - Glazecalc") stays as
   is. No new words in titles for search.
5. Structured data: the page already emits `referencePage` with breadcrumbs
   (`material-info-page.ts:289-302`) in the page's language. Once prerendered it is in the HTML. Check
   the `url` in it uses the language's address (it uses `materialPath`, check it carries the prefix).

### Build time, disk and page speed

- Build: 1082 pages in about 37 s now. Adding 9,520 material pages at about the speed of the English
  material pages adds roughly 9,520 / 1082 × 37 s ≈ **5 to 6 minutes** with 4 workers (more precisely,
  material pages are shorter than guides, so likely less). Acceptable for CI; consider running the
  material pages in more workers on CI (the runner has 4 cores).
- Disk: the average English material page is 68 kB raw (most of it the state handed to the browser).
  9,520 × 68 kB ≈ **650 MB more per image** (233 MB today), and two images are kept: about 1.3 GB
  more on a disk with 12 GB free. Acceptable, but worth cutting: the image could ship only the
  `.br` copies plus raw for the server to read (or the raw gzipped), if disk gets tight. The Part A
  cache adds about 360 MB more, in the container's `/tmp`.
- Speed: the page is prerendered, so the reader sees it before the app starts; Part A makes it smaller.
- The prerender's own checks (`scripts/prerender.mjs:203-216` `problemsWith` and `:79-113`
  `pageProblems`): add one for material pages in a language other than English: the page has no
  `guide-note` notice and no `lang="en"` paragraph (an English note standing in). A failing page
  should **not fail the build**; it should be written and listed as "English fallback", and the
  server should treat it as English-only (noindex, canonical to English). Simplest: the prerender
  writes a small `material-fallback.json` (language → slugs), and `englishOnlyIn` reads it.

### Steps (Part B)

| #   | Step                                                                                                                                                                                                                                                                            | Effort | Files                                                                                  | Tests                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Owner checks the few "missing" labels in ig, af, ha, yo, so (run `material-status.mjs`)                                                                                                                                                                                         | S      | `client/public/i18n/reference/*.json`                                                  | `node scripts/i18n-check.mjs`                                                                                                                                                                             |
| B2  | Take material pages out of `ENGLISH_ONLY_PAGES`; `prerenderLanguages` gives them every live reference language; add `materialTranslatedIn(page, code)` from `records/`                                                                                                          | S      | `lib/pages.js`, `lib/pages.d.ts`                                                       | `server/test/pages_tests.ts:587`, `:643`, `:673`, `:699`; `server/test/prerender_tests.ts:108`                                                                                                            |
| B3  | `pageHtml` and `sitemap` give material pages canonical-to-self, hreflang among the languages where they are translated, og:locale                                                                                                                                               | S      | `server/lib/pages.ts:62-69`, `:270-296`, `:337-355`                                    | `pages_tests.ts`: a German material page has its own canonical, hreflang for each language and x-default; one in fallback is noindex with canonical to English; the sitemap has 57 entries for a material |
| B4  | Sitemap size: today about 1 MB; with 9,520 more entries each carrying 58 hreflang links it grows past 50 MB and 50,000 URLs' limits on size. **Split the sitemap**: a sitemap index (`/sitemap.xml`) and one sitemap per language or per section (`/sitemaps/materials-de.xml`) | M      | `server/lib/pages.ts`, `server/app.ts:206-219`, `server/lib/site.ts` (robots.txt line) | sitemap tests: each file under 50 MB and 50,000 URLs; the index lists them                                                                                                                                |
| B5  | `lib/page-dates.js`: a material page's date in a language comes from that language's `reference/<lang>.json`, `<lang>.json` and `records/<lang>.json` keys it uses, plus the material's line in `data/materials.ndjson`                                                         | S/M    | `lib/page-dates.js:26`, `:32`; `scripts/page-dates.mjs`                                | the page-dates tests                                                                                                                                                                                      |
| B6  | Prerender: material pages in all languages, the fallback check and `material-fallback.json`; raise workers on CI                                                                                                                                                                | M      | `scripts/prerender.mjs:286-307`                                                        | `server/test/prerender_tests.ts`; time the build                                                                                                                                                          |
| B7  | Comments that say "English only": `client/app/shared/structured-data.ts:70`, `client/app/app.routes.ts:89`, `scripts/i18n-check.mjs:26`, `scripts/i18n-fingerprints.mjs:34` (only guides there, check)                                                                          | S      | those                                                                                  | client unit tests                                                                                                                                                                                         |
| B8  | Engagement: the main button opens a recipe with the material in it, starting a trial if needed; two more guide links                                                                                                                                                            | M      | `material-info-page.ts`, the recipe page, the guest service                            | client spec; an e2e test from a German material page to a recipe with that material, not signed in                                                                                                        |
| B9  | Docs: ADR 0016 (new consequence), `docs/seo-plan.md`, CHANGELOG                                                                                                                                                                                                                 | S      | —                                                                                      | —                                                                                                                                                                                                         |
| B10 | Full tests: `npm test` (server mocha), client tests, `npm run test:e2e:linux`                                                                                                                                                                                                   | S      | —                                                                                      | —                                                                                                                                                                                                         |

Order: Part A first (it makes the larger page count cheaper to serve and cache), then B1–B7 and B10 as
one release, B8 as the next. B4 must be in the same release as B2, or the sitemap is too big.

### Rollout and measuring it

- Release all languages at once (owner's choice; no pilot).
- In Search Console, per language (filter pages by `/de/materials/` and so on):
  - Pages: indexed count of `/<lang>/materials/` rising towards 170 in 4 to 8 weeks; watch "Duplicate,
    Google chose different canonical" and "Crawled, currently not indexed".
  - Performance: impressions and clicks on `/<lang>/materials/` and the queries (material names in
    the language).
  - Sitemaps: each sitemap's "discovered" against "indexed".
- In the app: trials started and recipes made from a material page, per language (B8 needs a counter,
  which needs the privacy page to allow it; if not, Search Console alone).
- Success after 8 weeks: most languages have over half their material pages indexed, and the English
  pages' clicks have not fallen.

### Risks

- **Sitemap too large** if B4 is skipped. Must ship together.
- **Crawl budget**: 9,520 new URLs on a small site. Google will take weeks; the sitemaps and lastmod
  help. The server must answer fast, which Part A helps.
- **Thin or near-duplicate** pages in a language; see above. Measured, not guessed.
- **A translation change in English** makes a page fall back. The fallback rule keeps it out of the
  index until translated, so search never sees half-English pages as that language.
- **Build time** grows to several minutes. CI and the deploy workflow time-outs must allow it.
- **Part A security trade**: a nonce shared by all readers of a process. See option 3; the fallback
  is option 2.

---

## Owner decisions (2026-11-04)

1. **Nonce: a fresh one per reply.** Part A takes option 2: each reply is compressed in Node with brotli 5
   (gzip for clients without brotli), and the style nonce stays as strong as it is now. Drop the per-process
   nonce and the background brotli 11 cache from the steps above.
2. **Main button: open a recipe with the material in it, starting a trial without asking.**
3. **Below it, a sign-up button** that brings the visitor back to the material page once signed up:
   `/<lang>/signup?next=/<lang>/materials/<slug>`. This works today: the sign-up page follows `next`
   (`client/app/pages/auth/auth-page.ts:280`), the server allows only the app's own pages (`nextPage` and
   `returnPage`, `server/lib/pages.ts`), the confirmation email carries it (`server/lib/email_links.ts:44`),
   and so do Google, GitHub and Microsoft (`server/routes/oauth_routes.ts:140`). A trial started from the main
   button moves into the new account (`mergeTrial`, `server/routes/auth_routes.ts:128`). Test: e2e from a German
   material page through sign-up and email confirmation, ending on that page.
4. **A material not fully translated in a language stays out of that language's index** (noindex, canonical to
   the English). None are today.
