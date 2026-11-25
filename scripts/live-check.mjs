// Checks a deployed site from outside, after each deploy (.github/workflows/live-checks.yml):
//
//   LIVE_URL=https://glazecalcapp.com node scripts/live-check.mjs
//
// 1. /api/health answers.
// 2. The home page carries the headers nginx adds (deploy/nginx): the
//    Content-Security-Policy, HSTS and the rest; staging's carries noindex,
//    and production's must not, so a staging file installed on production fails.
// 3. Every live language's home page and every English public page
//    (lib/pages.js) answers 200 with a page that has a heading.
// 4. The IndexNow key file answers with the key as text/plain, and the English
//    and German preview images are there.
// Read-only: plain GETs, a few at a time. e2e/live loads the same pages in a browser.
//
//   node scripts/live-check.mjs --videos
//
// Instead, checks that each of John Britt's videos the course companion links
// (client/public/i18n/guides/learn-with-john-britt/en.md) is still on YouTube,
// by asking YouTube's oEmbed address about it, which answers 404 or 401 for a
// video removed or made private. Off by default and never in CI: run it now
// and then, by hand, and fix the guide if a video has gone.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import languages from '../lib/regions/languages.js';
import indexnow from '../lib/indexnow.js';
import ogImages from '../lib/og-images.js';
import pages from '../lib/pages.js';

/** Requests in flight at once: gentle on a 1 GB instance. */
const AT_ONCE = 4;

/** The pages to check: each live language's home, and every English public page. */
export const pagesToCheck = () => [
  ...new Set([...languages.LIVE_LANGUAGES.map((code) => languages.languagePrefix(code) + '/'), ...pages.PUBLIC_PAGES])
];

/**
 * What is wrong with the home page's headers (a Headers or a plain object of
 * lower-case names), for production or staging (by its host name).
 * @param {Headers | Record<string, string>} headers
 * @param {string} url
 * @returns {string[]}
 */
export function headerProblems(headers, url) {
  const get = (name) => (headers instanceof Headers ? headers.get(name) : headers[name]) ?? '';
  const problems = [];
  if (!get('content-security-policy').includes("default-src 'self'")) {
    problems.push("Content-Security-Policy is missing or lacks default-src 'self'");
  }
  if (!/max-age=\d+/.test(get('strict-transport-security'))) problems.push('Strict-Transport-Security is missing');
  if (get('x-content-type-options') !== 'nosniff') problems.push('X-Content-Type-Options is not nosniff');
  if (get('x-frame-options') !== 'DENY') problems.push('X-Frame-Options is not DENY');
  const noindex = /noindex/.test(get('x-robots-tag'));
  const staging = new URL(url).hostname.startsWith('staging.');
  if (staging && !noindex) problems.push('staging lacks X-Robots-Tag: noindex');
  if (!staging && noindex) problems.push('production says X-Robots-Tag: noindex (a staging file?)');
  return problems;
}

const isStaging = (url) => new URL(url).hostname.startsWith('staging.');

/**
 * What is wrong with /robots.txt for production or staging.
 * @param {number} status
 * @param {string} text
 * @param {string} base
 * @returns {string[]}
 */
export function robotsProblems(status, text, base) {
  if (status !== 200) return [`answered ${status}`];
  const problems = [];
  if (isStaging(base)) {
    if (!/^Disallow:\s*\/\s*$/m.test(text)) problems.push('staging does not disallow /');
    if (/^Sitemap:/im.test(text)) problems.push('staging names a sitemap');
    return problems;
  }
  if (/^Disallow:\s*\/\s*$/m.test(text)) problems.push('production disallows /');
  if (!/^Disallow:\s*\/api\/\s*$/m.test(text)) problems.push('does not disallow /api/');
  if (!text.includes(`Sitemap: ${base}/sitemap.xml`)) problems.push(`lacks Sitemap: ${base}/sitemap.xml`);
  return problems;
}

/**
 * What is wrong with /sitemap.xml (a 404 on staging, the sitemap index on production).
 * @param {number} status
 * @param {string} xml
 * @param {string} base
 * @returns {string[]}
 */
export function sitemapIndexProblems(status, xml, base) {
  if (isStaging(base)) return status === 404 ? [] : [`staging answered ${status} instead of 404`];
  if (status !== 200) return [`answered ${status}`];
  const problems = [];
  if (!xml.includes('<sitemapindex')) problems.push('lacks <sitemapindex>');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
  if (locs.length !== languages.LIVE_LANGUAGES.length) {
    problems.push(`lists ${locs.length} sitemaps, expected ${languages.LIVE_LANGUAGES.length}`);
  }
  for (const code of languages.LIVE_LANGUAGES) {
    if (!locs.includes(`${base}/sitemaps/${code}.xml`)) {
      problems.push(`lacks /sitemaps/${code}.xml`);
      break;
    }
  }
  return problems;
}

/**
 * What is wrong with a language's sitemap (/sitemaps/<code>.xml).
 * @param {number} status
 * @param {string} xml
 * @param {string} base
 * @param {string} code
 * @returns {string[]}
 */
export function sitemapProblems(status, xml, base, code) {
  if (isStaging(base)) return status === 404 ? [] : [`staging answered ${status} instead of 404`];
  if (status !== 200) return [`answered ${status}`];
  const problems = [];
  if (!xml.includes('<urlset')) problems.push('lacks <urlset>');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
  const expected = pages.PUBLIC_PAGES.filter(
    (page) => (code === 'en' && pages.ENGLISH_ONLY_PAGES.includes(page)) || !pages.englishOnlyIn(page, code)
  ).length;
  if (locs.length !== expected) problems.push(`lists ${locs.length} URLs, expected ${expected}`);
  if (locs.some((loc) => !loc.startsWith(base + '/'))) problems.push(`names a URL outside ${base}`);
  if (!xml.includes('hreflang="x-default"')) problems.push('lacks hreflang="x-default"');
  return problems;
}

/**
 * What is wrong with a prerendered public page's search metadata: canonical, hreflang, noindex, and JSON-LD.
 * For an English-only fallback such as /de/guides/learn-with-john-britt (`englishOnly: true`), checks that it
 * stays out of the index and points to the English canonical.
 * @param {string} html
 * @param {string} pagePath
 * @param {string} base
 * @param {{ englishOnly?: boolean, structured?: boolean }} [options]
 * @returns {string[]}
 */
export function seoPageProblems(html, pagePath, base, { englishOnly = false, structured = true } = {}) {
  const problems = [];
  const canonical = /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(html)?.[1];
  const wantedCanonical = base + (englishOnly ? languages.pagePath(pagePath) : pagePath);
  if (canonical !== wantedCanonical)
    problems.push(`canonical is ${canonical ?? 'missing'}, expected ${wantedCanonical}`);
  const hasNoindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  const hreflangs = [...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]*)"/g)].map(([, code]) => code);
  if (englishOnly) {
    if (!hasNoindex) problems.push('lacks meta noindex on an English-only copy');
    if (hreflangs.length) problems.push(`has ${hreflangs.length} hreflang links on an English-only copy`);
  } else {
    if (hasNoindex) problems.push('carries meta noindex on an indexed page');
    const wantedCount = languages.LIVE_LANGUAGES.length + 1;
    if (hreflangs.length !== wantedCount) {
      problems.push(`has ${hreflangs.length} hreflang links, expected ${wantedCount}`);
    } else if (!hreflangs.includes('x-default')) {
      problems.push('lacks hreflang="x-default"');
    }
  }
  if (structured) {
    const blocks = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(
      ([, body]) => body
    );
    if (blocks.length !== 1) {
      problems.push(`has ${blocks.length} ld+json blocks, expected 1`);
    } else {
      try {
        const parsed = JSON.parse(blocks[0]);
        if (parsed?.['@context'] !== 'https://schema.org') problems.push('ld+json lacks schema.org @context');
      } catch {
        problems.push('ld+json is not valid JSON');
      }
    }
  }
  return problems;
}

/** Sample pages across kinds whose full search metadata is checked on every live run. */
export const SEO_SAMPLE_PAGES = new Set([
  '/',
  '/de/',
  '/guides',
  '/guides/firing',
  '/cones',
  '/materials',
  '/materials/silica',
  '/famous-glazes/shino',
  '/about',
  '/advice',
  '/assistants'
]);

const COURSE_GUIDE = path.join(
  import.meta.dirname,
  '..',
  'client',
  'public',
  'i18n',
  'guides',
  'learn-with-john-britt',
  'en.md'
);

/**
 * The videos a guide links: each title and address, in order, once.
 * @param {string} markdown
 * @returns {Array<{ title: string, url: string }>}
 */
export function videosIn(markdown) {
  const seen = new Map();
  for (const [, title, url] of markdown.matchAll(/\[([^\]]+)\]\((https:\/\/www\.youtube\.com\/watch\?v=[\w-]+)\)/g)) {
    if (!seen.has(url)) seen.set(url, title);
  }
  return [...seen].map(([url, title]) => ({ title, url }));
}

/**
 * Where YouTube says whether a video is there to watch.
 * @param {string} url
 * @returns {string}
 */
export const oembedFor = (url) => 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url);

/** Checks every video the course companion links; exits 1 if any has gone. */
async function checkVideos() {
  const videos = videosIn(readFileSync(COURSE_GUIDE, 'utf8'));
  const failures = [];
  await inTurns(
    videos.map((video) => async () => {
      const reply = await fetch(oembedFor(video.url), { redirect: 'manual' });
      if (reply.status !== 200) failures.push(`${video.url} (${video.title}) answered ${reply.status}`);
    })
  );
  if (failures.length) {
    console.error(`${failures.length} of John Britt's videos could not be found:`);
    for (const failure of failures) console.error('  ' + failure);
    process.exit(1);
  }
  console.log(`All ${videos.length} of John Britt's videos the course companion links are on YouTube.`);
}

/** Runs each of the jobs, AT_ONCE at a time; resolves when all have. */
const inTurns = async (jobs) => {
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: AT_ONCE }, async () => {
      while (queue.length) await queue.shift()();
    })
  );
};

async function main() {
  const base = (process.env.LIVE_URL || process.argv[2] || '').replace(/\/$/, '');
  if (!/^https?:\/\/[^/]+$/.test(base)) {
    console.error('Usage: LIVE_URL=https://glazecalcapp.com node scripts/live-check.mjs');
    process.exit(2);
  }
  const failures = [];

  const health = await fetch(base + '/api/health');
  if (!health.ok) failures.push(`/api/health answered ${health.status}`);
  else console.log(`/api/health: ${(await health.text()).trim()}`);

  const home = await fetch(base + '/');
  for (const problem of headerProblems(home.headers, base)) failures.push('/: ' + problem);

  // The IndexNow key (scripts/indexnow.mjs), as plain text, and a preview image (scripts/og-images.mjs).
  const key = await fetch(`${base}/${indexnow.INDEXNOW_KEY}.txt`, { redirect: 'manual' });
  const keyText = await key.text();
  if (key.status !== 200 || keyText.trim() !== indexnow.INDEXNOW_KEY)
    failures.push(`/<IndexNow key>.txt answered ${key.status}`);
  else if (!/^text\/plain/.test(key.headers.get('content-type') ?? ''))
    failures.push('/<IndexNow key>.txt is not text/plain');
  for (const file of new Set([ogImages.ogImageFile('en'), ogImages.ogImageFile('de')])) {
    const image = await fetch(`${base}/${file}`, { redirect: 'manual' });
    await image.arrayBuffer();
    if (image.status !== 200) failures.push(`/${file} answered ${image.status}`);
    else if (!/^image\/(png|jpeg)/.test(image.headers.get('content-type') ?? ''))
      failures.push(`/${file} is not an image`);
  }

  // Search crawlers' entry points: robots.txt, llms.txt, the sitemap index, two sitemaps, and an English-only copy.
  const robots = await fetch(`${base}/robots.txt`, { redirect: 'manual' });
  for (const p of robotsProblems(robots.status, await robots.text(), base)) failures.push('/robots.txt: ' + p);

  const llms = await fetch(`${base}/llms.txt`, { redirect: 'manual' });
  const llmsText = await llms.text();
  if (llms.status !== 200 || !llmsText.startsWith('# Glazecalc')) failures.push(`/llms.txt answered ${llms.status}`);
  else if (!/^text\/plain/.test(llms.headers.get('content-type') ?? '')) failures.push('/llms.txt is not text/plain');

  const index = await fetch(`${base}/sitemap.xml`, { redirect: 'manual' });
  for (const p of sitemapIndexProblems(index.status, await index.text(), base)) failures.push('/sitemap.xml: ' + p);
  for (const code of ['en', 'de']) {
    const map = await fetch(`${base}/sitemaps/${code}.xml`, { redirect: 'manual' });
    for (const p of sitemapProblems(map.status, await map.text(), base, code)) {
      failures.push(`/sitemaps/${code}.xml: ` + p);
    }
  }
  const fallback = await fetch(`${base}/de/guides/learn-with-john-britt`, { redirect: 'manual' });
  const fallbackBody = await fallback.text();
  if (fallback.status !== 200) failures.push(`/de/guides/learn-with-john-britt answered ${fallback.status}`);
  else {
    for (const p of seoPageProblems(fallbackBody, '/de/guides/learn-with-john-britt', base, { englishOnly: true })) {
      failures.push('/de/guides/learn-with-john-britt: ' + p);
    }
  }

  const list = pagesToCheck();
  await inTurns(
    list.map((page) => async () => {
      const reply = await fetch(base + page, { redirect: 'manual' });
      const body = await reply.text();
      if (reply.status !== 200) failures.push(`${page} answered ${reply.status}`);
      else if (!/text\/html/.test(reply.headers.get('content-type') ?? '')) failures.push(`${page} is not HTML`);
      else if (!/<h1[\s>]/.test(body)) failures.push(`${page} has no heading`);
      else if (SEO_SAMPLE_PAGES.has(page)) {
        for (const p of seoPageProblems(body, page, base)) failures.push(`${page}: ${p}`);
      }
    })
  );

  if (failures.length) {
    console.error(`${base}: ${failures.length} problem(s)`);
    for (const failure of failures) console.error('  ' + failure);
    process.exit(1);
  }
  console.log(`${base}: health, headers and ${list.length} pages are as they should be.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv.includes('--videos')) await checkVideos();
  else await main();
}
