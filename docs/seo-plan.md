# Search: feature list

This plan makes the public pages easy for search engines to find and read in all 24 live languages. It was planned on 13 October 2026 against branch `mfa-plan`, after a check of the live site. Effort: S = under a day, M = one to three days, L = a week or more. Translation into 23 languages is not counted. Paths are from the repo root.

**What is already right (checked on glazecalcapp.com):**

- Each language has its own address (`/de/guides`).
- The server writes `<html lang dir>`, the canonical address, hreflang for all 24 languages plus `x-default`, and the language's title, description and preview text before any script runs (`server/lib/pages.ts`).
- The sitemap lists all 264 pages (11 public pages × 24 languages) with their alternates, and `robots.txt` points to it and blocks only `/api/`.
- Unknown addresses return 404, trailing slashes 301, unlaunched languages are `noindex`, and the home page loads in about 80 ms at 10 kB.

**What holds it back:**

1. Every page in a language has the home page's title and description in its HTML (`server/app.ts`, `pageText` reads only `titles.landing` and `meta.description`). The app fixes the title once it runs; nothing ever fixes the description.
2. The body is an empty `<gc-root>` until the JavaScript runs and fetches the translations and the guide's Markdown. Google indexes it later and less reliably; Bing, DuckDuckGo, Yandex and Baidu do worse. Link previews never see the page's content.
3. The titles may not use the words people type ("Glasurrechner", not "Glasurchemie-Rechner").
4. The site may not be submitted to Google Search Console or Bing Webmaster Tools, and few sites link to it.

**The approach: prerender at build, then hydrate.** The app stays a single-page app. At build time, a script renders each public page in each live language to plain HTML, with the real text in the real places. The server sends that HTML, so the reader (and a search engine) sees the page at once. The JavaScript then loads and Angular **hydrates** it: it adopts the DOM that is already there, attaches listeners and signals, and draws nothing again. There is no blank page and no flash. Only the parts that depend on this browser's own settings (signed in or not, °C/°F, region) change afterwards, and only where they differ.

This is what Angular's own SSR package does. It is not a crazy idea; it is the usual answer for a SPA that must be found in searches. We run it at build time only, so there is no Node rendering per request and no new server load.

## Must do

1. **Packages and the render entry (do this first, alone).**
   - Add `@angular/ssr` and `@angular/platform-server` at the same version as `@angular/core` (22.2.x), pinned.
   - New `client/main.server.ts`: `bootstrap(context) = bootstrapApplication(App, appServerConfig, context)`.
   - New `client/app/app.config.server.ts`: `mergeApplicationConfig(appConfig, { providers: [provideServerRendering(), …] })` with the server-only providers from items 3 to 5.
   - In `client/app/app.config.ts`, add `provideClientHydration(withHttpTransferCacheOptions({ includeHeaders: [] }))`. Event replay is left out (decision 3).
   - Effort S. Files: `package.json`, `angular.json`, new `client/main.server.ts`, new `client/app/app.config.server.ts`, `client/app/app.config.ts`.

2. **Our own prerender script, not the CLI's route prerender.** The CLI's `outputMode: "static"` prerenders route paths with one base href. Our languages are path prefixes chosen at runtime (`APP_BASE_HREF` from `provideI18n`), with Transloco rather than one build per locale (ADR 0013). A short script is clearer than bending the CLI:
   - New `scripts/prerender.mjs` runs after `ng build`. The `build` script becomes `ng build && node scripts/prerender.mjs`.
   - It builds the server bundle (`ng build` with a `server` entry and `outputMode: "server"`, or a second esbuild step; pick whichever keeps `dist/glazecalc/browser` as it is).
   - For each page in `PUBLIC_PAGES` and each code in `LIVE_LANGUAGES`, it calls `renderApplication(bootstrap, { document: indexHtml, url: '/de/guides' })` and writes `dist/glazecalc/prerendered/<code>/<page>.html` (`/` becomes `index.html`).
   - **Outside `browser/`**, so `express.static` never serves a raw prerendered file without its head and nonce. The `Dockerfile` copies the new folder too.
   - It runs the pages in parallel, a few at a time. 264 renders should take well under a minute.
   - It fails the build if a page renders an error, the not-found page, or text under a set length.
   - `PUBLIC_PAGES` moves from `server/lib/pages.ts` to `lib/pages.js`, so the script, the server and the sitemap read one list.
   - Effort M. Files: new `scripts/prerender.mjs`, `package.json`, `angular.json`, `Dockerfile`, new `lib/pages.js`, `server/lib/pages.ts`.

3. **The page's language from the render, not from `location`.**
   - `provideI18n` (`client/app/i18n/provide-i18n.ts:28`) reads `location.pathname`. It changes to `inject(DOCUMENT).location.pathname`, which is the browser's address in the browser and the render URL on the server.
   - The initializer that sets `lang`, `dir` and the meta tags goes through `DOCUMENT` and the `Meta` service, not `document.querySelector`.
   - `redirectLegacyHashUrl` runs only in the browser (`isPlatformBrowser`).
   - Effort S. Files: `client/app/i18n/provide-i18n.ts`, `client/app/core/legacy-hash-url.ts`.

4. **Translations and guides during the render, and no fetch before hydration.**
   - On the server, a `HttpInterceptor` answers `GET /i18n/**` by reading the file from `dist/glazecalc/browser/i18n/`. The Transloco loader and the `guideText` resolver stay unchanged.
   - Hydration's **HTTP transfer cache** stores those replies in the page (`<script id="ng-state" type="application/json">`). On load, the same `GET`s are answered from it, so the browser hydrates without waiting on the network for the translations or the Markdown. This is the "timing" the owner asked about.
   - Cost: each page carries its own scopes' messages and, on a guide, its Markdown. Measure the HTML size per page (item 13). If it is too large, cache only the guide and the page's scope, and let the shared `<lang>.json` load as today.
   - Effort S. Files: new `client/app/i18n/server-files.interceptor.ts`, `client/app/app.config.server.ts`.

5. **The same first render on both sides (no hydration mismatch).** Angular checks that the browser's first render matches the prerendered DOM. Anything that reads this browser's own state must render the **prerender defaults** first and switch after hydration.
   - **Prerender defaults:** signed out, no stored preferences, and the language's default region for units, cones and the region blocks in the guides (decision 2).
   - A small `firstRender` signal (new `client/app/core/first-render.ts`): true until `afterNextRender` on the root, then false. While true:
     - `AuthService` reports no session (the constructor still reads storage; the signal it exposes waits);
     - `PreferencesService` and `LocaleService` return the defaults, not localStorage or `navigator.languages`;
     - `library-info.ts` and `translation-notice.ts` hold back.
   - After hydration they switch, and signals update only the text that differs (°F instead of °C, the nav for a signed-in user, the user's own region block).
   - Browser globals (`location`, `sessionStorage`, `navigator`, `window.scrollTo`) are only read inside `afterNextRender` or behind `isPlatformBrowser`. The list to fix: `core/auth.service.ts`, `core/preferences.service.ts`, `core/locale.service.ts`, `shared/library-info.ts`, `i18n/translation-notice.ts`, `app.ts` (`pageIn()`), `pages/guides/guide-contents.ts`.
   - `region-select.ts` sorts with `Intl.DisplayNames` and `localeCompare`. Node and the browsers share ICU closely enough, but item 13's mismatch check will show it if not.
   - Effort M. Files: those listed.

6. **Before the app starts: language choice and signed-in visitors.**
   - `client/main.ts` sends a reader with a saved language from `/guides` to `/de/guides` before bootstrapping. With prerendering, that reader would first see the English page. Move this check into the inline script in `client/index.html`, so it runs before the first paint. autoCsp hashes that script at build, as it does the theme script today.
   - A signed-in reader on `/` goes to `/home` (`visitorsOnlyGuard`). The same inline script sets `data-session` on `<html>` when a session is stored, and a CSS rule hides the landing page's content under it, so it does not flash before the redirect.
   - Effort S. Files: `client/index.html`, `client/main.ts`, `client/styles.scss`.

7. **The server sends the prerendered page.**
   - On start, `server/app.ts` reads `dist/glazecalc/prerendered/**` into memory (264 files, a few MB at most).
   - For a `GET` of a public page in a live language, it uses that file in place of `index.html`. Every other address (signed-in pages, `/signin`, unlaunched languages, 404s) keeps today's `index.html`.
   - `pageHtml()` still writes the canonical address, hreflang, `noindex` and `og:url`. It no longer overwrites the title and description when the file already has the page's own.
   - **CSP nonce:** the prerender renders with `CSP_NONCE` set to a fixed placeholder (`__GC_NONCE__`). The server replaces each occurrence with the reply's nonce, as it now replaces `<gc-root>`. Angular puts the nonce on its inline `<style>` tags too, so they pass `style-src 'nonce-…'`.
   - A missing prerendered file falls back to `index.html` and logs once. The page still works; it is only slower to show.
   - Effort S. Files: `server/app.ts`, `server/lib/pages.ts`, `server/test/client_routes_tests.ts`, `server/test/pages_tests.ts`.

8. **Each page's own title and description.**
   - Add a description for each public page: new keys `meta.guides`, `meta.glazingBasics`, `meta.makingAGlaze`, `meta.safeMixing`, `meta.homeSafety`, `meta.firing`, `meta.advice`, `meta.about`, `meta.privacy`, `meta.signup` (10 new English messages; `/` keeps `meta.description`).
   - Routes get `data: { description: marker('meta.x') }`. `TranslatedTitles` also sets the description, `og:title` and `og:description` through the `Meta` service, so the prerender writes them and in-app navigation keeps them right.
   - The server's `pageText` stays as the fallback for the pages that are not prerendered.
   - Effort S. Files: `client/app/app.routes.ts`, `client/app/i18n/titles.ts`, `client/public/i18n/en.json`.

9. **Titles that use the words people search for.**
   - For each live language, check the usual search term for "glaze calculator", and for "glaze recipe" and "UMF / Seger formula": Google Trends, the autocomplete in each country's Google, and the words used by that country's ceramics suppliers and forums.
   - Rewrite `titles.landing` and `meta.description` where the usual term is missing, keeping the full term in the description. For example, German "Glasurrechner" in the title and "Glasurchemie" in the description.
   - This is a translation task. It goes through the review steps in `docs/translations/process`, and the new text is checked back to English (blind) like the other text.
   - Effort M (research), then the translation run. Files: `client/public/i18n/<code>.json`, `docs/translations/<code>.md` (glossary: the search terms).

10. **Structured data.**
    - The home page gets a JSON-LD `WebApplication`: name, description, `applicationCategory: "DesignApplication"`, `operatingSystem: "Any"`, `isAccessibleForFree: true`, `offers.price: 0`, `inLanguage`.
    - Each guide gets an `Article`: headline, description, `inLanguage`, `dateModified` (from the guide's front matter, if it has one).
    - Write it in the prerender (a `<script type="application/ld+json">` from a component on those pages). A JSON data block does not run, so no CSP change is needed.
    - Effort S. Files: new `client/app/shared/structured-data.ts`, `client/app/pages/landing/*`, `client/app/pages/guides/guide-view.ts`.

11. **Small head fixes.**
    - Merge `og:locale` and `Content-Language` from `asia-groundwork-locales` (already built and tested there).
    - `og:locale:alternate` for the other live languages.
    - The `og:image` stays the English image for now; a per-language image is "Later".
    - Effort S. Files: `server/lib/pages.ts`.

12. **Owner's tasks (outside the code).**
    - Verify the domain in **Google Search Console** and **Bing Webmaster Tools** (a DNS TXT record each, in Route 53). Submit `https://glazecalcapp.com/sitemap.xml` in both. Bing's index also feeds DuckDuckGo, Ecosia and Yahoo.
    - After a month, read Search Console's "Pages" report per language and the "International targeting" hreflang errors.
    - **Links from potters' sites** matter more than anything here: the Ceramic Arts Daily forum, Glazy's links page, Reddit's pottery forums, and in each country its ceramics association or supplier forums. A guide in the reader's own language is the thing worth linking to.
    - Effort: an hour to set up, then ongoing.

13. **Tests.** See the test plan. Effort M.

## Later

14. **IndexNow** (Bing, Yandex, Seznam, Naver): tell them about changed pages after each deploy. Effort S.
15. **A preview image per language,** with the tagline translated. Effort S.
16. **Event replay,** if the timing check in item 13 shows people tapping before hydration finishes (decision 3). Effort S.
17. **More public pages worth finding:** each Standard material (`/materials/<name>`: what it is, its oxides, its safety notes) and a cone chart. These are what potters search for; each would be prerendered the same way. Effort L (mostly content and translation).

## Decisions for the owner

**Decided on 13 October 2026: all five as recommended.**

1. **Our own prerender script, or the Angular CLI's `outputMode: "static"`?** Recommend **our script** (item 2). The CLI's prerender expects one base href per build, and our 24 languages are prefixes chosen at runtime. The script is about 100 lines and uses the same `renderApplication` the CLI calls.
2. **Which units the prerendered guides show.** Recommend **the page language's default region** (`/de/` in Germany's units and cones, `/fr/` in France's). For English, recommend **°C and Orton cones with °F beside them**: the guides already show both. A reader whose settings differ sees the numbers change once, right after the page loads. The alternative is to hide those numbers until hydration, which shows a gap instead.
3. **Event replay?** Recommend **not now.** It puts an inline script in each page, which autoCsp cannot hash at build because the prerender adds it later. The public pages are mostly text and links, and links work before hydration (they are real `<a href>`s; a click before hydration loads the next page whole). Revisit if item 13 finds hydration takes over a second on a slow phone.
4. **Per-page descriptions: translate now or with the next catch-up?** Recommend **with the title changes from item 9**, as one translation run. Until then the other languages keep the home page's description on every page, as today.
5. **Build time in CI.** The prerender adds under a minute to each build. Recommend **running it in every build**, so the e2e tests always cover the real pages.

## Test plan

- **Unit (mocha):**
  - `pages_tests.ts`: the prerendered file is used for a public page in a live language and not for `/signin`, `/recipe` or an unlaunched language; its own title and description are kept; the canonical address and hreflang are still written; `__GC_NONCE__` is replaced everywhere; a missing file falls back to `index.html`.
  - `client_routes_tests.ts`: `/de/guides/firing` answers 200 with German guide text in the body; the nonce differs per reply.
- **Prerender script:** fails on a not-found page, an error, or a page under the length limit. All 264 files exist after `npm run build`.
- **Client (vitest):** the `firstRender` switch in `AuthService`, `PreferencesService` and `LocaleService`; `TranslatedTitles` sets the description.
- **e2e (Playwright, Chromium, Windows and Linux CI):** new `e2e/prerender.spec.js`.
  - **JavaScript off** (`javaScriptEnabled: false`): `/de/guides/firing` shows its German heading and text, its own `<title>` and description; `/` shows the landing text; links have real `href`s.
  - **Adopted in place:** hold back the main script with `page.route`, mark a guide paragraph (`data-test-mark`), let the script load, wait for the app to be ready, and check the marked element is still the one in the document. A re-render would replace it.
  - **No mismatch:** the console has no `NG0500`–`NG0507` messages on any public page in en, de, el and ga.
  - **No fetch before hydration:** no request to `/i18n/` before the app is ready on a guide page.
  - **Settings after hydration:** a reader with °F stored sees °F after load; a stored session on `/` goes to `/home` without the landing text showing.
  - `csp.spec.js` stays green on the public pages, prerendered now.
  - `accessibility.spec.js` (axe) runs on the prerendered pages as well.
- **Timing:** Lighthouse (mobile, slow 4G) on `/`, `/de/guides` and `/de/guides/firing`, before and after. Record First Contentful Paint, Largest Contentful Paint and Total Blocking Time in the PR. Expect FCP and LCP to fall to about the HTML's download time.
- **Size:** report each prerendered page's size, and check the initial bundle stays under its budget (hydration adds a few kB).

## Build order

**Step 0 (one agent, half a day):** items 1 and 3, and moving `PUBLIC_PAGES` to `lib/pages.js`. Merge it before anything else. After it, the app still behaves exactly as now.

Then three parallel worktrees:

| Stream                            | Items               | Files it alone edits                                                                                                                                                                                                                                                       |
| --------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A: render and serve**           | 2, 4, 7             | `scripts/prerender.mjs`, `angular.json`, `Dockerfile`, `client/app/app.config.server.ts`, `client/app/i18n/server-files.interceptor.ts`, `server/app.ts`, `server/lib/pages.ts`, `server/test/{pages,client_routes}_tests.ts`                                              |
| **B: same first render**          | 5, 6                | `client/app/core/{first-render,auth.service,preferences.service,locale.service}.ts`, `client/app/shared/library-info.ts`, `client/app/i18n/translation-notice.ts`, `client/app/app.ts`, `client/app/pages/guides/guide-contents.ts`, `client/index.html`, `client/main.ts` |
| **C: head content and the tests** | 8, 10, 11, 13 (e2e) | `client/app/app.routes.ts`, `client/app/i18n/titles.ts`, `client/public/i18n/en.json`, `client/app/shared/structured-data.ts`, landing and guide-view components, `e2e/prerender.spec.js`                                                                                  |

Item 9 (search terms) is research, then a translation run with item 8's new messages (decision 4). Item 12 is the owner's, and can start today: it does not need any of this.

**Merge order:** A, then B (A's prerender shows B's mismatches), then C. Then run `npm run i18n:sources`, `npm run check:i18n`, `npm test`, `npm run test:client`, `npm run test:e2e` on Windows, `npm run test:e2e:linux`, and the Lighthouse check.
