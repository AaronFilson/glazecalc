# 16. Public pages are prerendered at build and hydrated in place

Accepted, 2026-10-13. Follows the plan in [docs/seo-plan.md](../seo-plan.md). The number is 16
because the sign-in plan (MFA) reserves 14 and the integrations plan (OAuth) reserves 15; this
file will sit out of order in the index until those are written.

## Context

The app is a single-page app: the HTML of every address was an empty `<gc-root>`, filled once
the script had fetched the translations and a guide's Markdown. Search engines index that
later and less reliably, and link previews never see the page. The site has 11 public pages in
each of 24 languages (264 pages), and the language is a path prefix chosen at runtime
([ADR 13](0013-translations.md)), not one build per language.

## Decision

At build time, `scripts/prerender.mjs` renders each public page in each live language to plain
HTML with Angular's `renderApplication`. The server sends that file (with its head, a fresh
nonce and the headers for its language). In the browser the app hydrates the page in place.

- **Our script, not the CLI's `outputMode: "static"`**, which expects one base href per build.
- **A separate build configuration for the render** (`prerender` in `angular.json`, output to
  `dist/prerender`). The CLI's `autoCsp` (the policy `<meta>` of the browser build) cannot be
  combined with a server bundle in one build.
- **Worker threads, a few at a time.** Transloco's `translate()` keeps the last service made in
  a module variable, so two renders in one thread would read each other's language.
- **Translation files and guides are read from disk during the render,** by an `HttpBackend`
  that answers `/i18n/...` from the built files. The responses go into Angular's transfer
  cache (`ng-state`), so the browser's first render needs no request before it is ready.
- **The browser's first render equals the prerender.** While `FIRST_RENDER` is true, what is read
  from this browser (a session, saved settings, its languages) is left out and the page
  language's defaults stand in; after the first draw the services switch to the real values and
  only the text that differs is redrawn. Units follow the page language's default region (°C
  and Orton cones with °F beside them in English).
- **Output is outside `browser/`,** so `express.static` never sends a prerendered file without
  the server's head and nonce. `server/lib/pages.ts` keeps a prerendered page's own title and
  description and adds the canonical address, hreflang, `og:locale` and `og:locale:alternate`.
- **The build fails** if a page logs an error, is the not-found page, has little text, or has a
  script the browser build's policy does not know.
- **The initial bundle budget is 700 kB** (warning), up from 650 kB, since hydration adds about
  32 kB.
- Event replay is left out: it needs an inline script that `autoCsp` cannot hash at build.

## Consequences

- Every build renders 264 pages (about 15 s) and the pages weigh 40 to 560 kB (guides in Greek
  are the largest), up to about 80 kB gzipped. Most of a guide's weight is Angular's hydration data
  for its many nested templates, not the text.
- The server stays free of per-request rendering.
- Every build must pass the browser tests of `e2e/prerender.spec.js`: the pages without
  JavaScript, adopted in place, no fetch before the app is ready.
- Page speed on a slow phone is a trade: the first paint of the page's text comes with the HTML,
  but the page is larger and its hydration costs script time (see the timing notes in
  [docs/seo-plan.md](../seo-plan.md)).
