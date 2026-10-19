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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv.includes('--videos')) await checkVideos();
  else await main();
}
