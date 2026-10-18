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
// Read-only: plain GETs, a few at a time. e2e/live loads the same pages in a browser.
import { pathToFileURL } from 'node:url';
import languages from '../lib/regions/languages.js';
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

  const list = pagesToCheck();
  await inTurns(
    list.map((page) => async () => {
      const reply = await fetch(base + page, { redirect: 'manual' });
      const body = await reply.text();
      if (reply.status !== 200) failures.push(`${page} answered ${reply.status}`);
      else if (!/text\/html/.test(reply.headers.get('content-type') ?? '')) failures.push(`${page} is not HTML`);
      else if (!/<h1[\s>]/.test(body)) failures.push(`${page} has no heading`);
    })
  );

  if (failures.length) {
    console.error(`${base}: ${failures.length} problem(s)`);
    for (const failure of failures) console.error('  ' + failure);
    process.exit(1);
  }
  console.log(`${base}: health, headers and ${list.length} pages are as they should be.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
