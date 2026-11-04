// Tells search engines that use IndexNow (Bing, Yandex, Seznam, Naver; https://www.indexnow.org) that the
// site's pages have changed, after a production deploy has passed its Live checks (.github/workflows/deploy.yml):
//
//   node scripts/indexnow.mjs <site> <deployed commit> [last commit sent]
//
// When the commits between the last one sent and the deployed one change anything a page shows (the client, the
// guides, lib/ or data/), every address in the live sitemaps (sitemap.xml is an index of one per language) is
// sent, in requests of at most MAX_URLS; when nothing did, none
// is. With no last commit (the first time, or the record has gone) every address is sent. Only production:
// any other site (staging is noindex) is refused. It never fails a deploy: whatever happens it exits 0, and
// writes what it did to the job's summary ($GITHUB_STEP_SUMMARY).
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import indexnow from '../lib/indexnow.js';

export const PRODUCTION = 'https://glazecalcapp.com';
export const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** The paths whose change can change what a page shows. */
const CONTENT = /^(client\/|docs\/guides\/|lib\/|data\/|server\/lib\/pages\.ts$)/;

/**
 * Whether a list of changed files (as git diff --name-only writes them) changes what a page shows.
 * @param {string[]} files
 * @returns {boolean}
 */
export const changesContent = (files) => files.some((file) => CONTENT.test(file));

/**
 * The addresses of a sitemap, each <loc> once.
 * @param {string} xml
 * @returns {string[]}
 */
export const sitemapUrls = (xml) => [
  ...new Set(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) =>
      loc
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
    )
  )
];

/** The addresses IndexNow takes in one request, at most (https://www.indexnow.org/documentation). */
export const MAX_URLS = 10000;

/**
 * Whether a sitemap is an index of other sitemaps (<sitemapindex>), as the site's /sitemap.xml is.
 * @param {string} xml
 * @returns {boolean}
 */
export const isSitemapIndex = (xml) => /<sitemapindex\b/.test(xml);

/**
 * The request IndexNow takes: the host, the key, where the key is, and the addresses on that host.
 * @param {string} site
 * @param {string[]} urls
 */
export const payload = (site, urls) => {
  const { host } = new URL(site);
  return {
    host,
    key: indexnow.INDEXNOW_KEY,
    keyLocation: `${site}/${indexnow.INDEXNOW_KEY}.txt`,
    urlList: urls.filter((url) => new URL(url).host === host)
  };
};

/** What IndexNow's answer means (https://www.indexnow.org/documentation, "Response format"). */
const MEANING = {
  200: 'accepted',
  202: 'accepted; the key is still to be checked',
  400: 'bad request',
  403: 'the key was not found at its address',
  422: 'addresses not on the host, or the key does not match',
  429: 'too many requests'
};

/**
 * Sends the site's changed pages; resolves to a line saying what happened, and never rejects.
 * @param {{ site: string, to: string, from?: string, changedFiles?: (from: string, to: string) => string[],
 *   fetch?: typeof fetch }} options
 * @returns {Promise<string>}
 */
export async function ping({ site, to, from, changedFiles = gitChangedFiles, fetch: get = fetch }) {
  try {
    site = site.replace(/\/$/, '');
    if (site !== PRODUCTION) return `Not sent: ${site} is not ${PRODUCTION}.`;
    if (from) {
      let files;
      try {
        files = changedFiles(from, to);
      } catch {
        files = null;
      }
      if (files && !changesContent(files)) return `Not sent: nothing a page shows changed from ${from} to ${to}.`;
    }
    const index = await get(site + '/sitemap.xml');
    if (!index.ok) return `Not sent: ${site}/sitemap.xml answered ${index.status}.`;
    const xml = await index.text();
    let urls;
    if (isSitemapIndex(xml)) {
      // The index names one sitemap per language (server/lib/pages.ts sitemapIndex); only those on the site are read.
      urls = [];
      for (const part of sitemapUrls(xml).filter((url) => new URL(url).host === new URL(site).host)) {
        const sitemap = await get(part);
        if (!sitemap.ok) return `Not sent: ${part} answered ${sitemap.status}.`;
        urls.push(...sitemapUrls(await sitemap.text()));
      }
    } else {
      urls = sitemapUrls(xml);
    }
    const { urlList, ...rest } = payload(site, [...new Set(urls)]);
    if (!urlList.length) return 'Not sent: the sitemap has no addresses.';
    const answers = [];
    for (let start = 0; start < urlList.length; start += MAX_URLS) {
      const reply = await get(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ ...rest, urlList: urlList.slice(start, start + MAX_URLS) })
      });
      answers.push(`${reply.status} (${MEANING[reply.status] ?? 'unexpected'})`);
    }
    return answers.length === 1
      ? `Sent ${urlList.length} addresses: IndexNow answered ${answers[0]}.`
      : `Sent ${urlList.length} addresses in ${answers.length} requests: IndexNow answered ${answers.join(', ')}.`;
  } catch (error) {
    return `Not sent: ${error instanceof Error ? error.message : String(error)}.`;
  }
}

/** The files changed between two commits, by git. */
function gitChangedFiles(from, to) {
  return execFileSync('git', ['diff', '--name-only', from, to], { encoding: 'utf8' }).split('\n').filter(Boolean);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [site = '', to = '', from = ''] = process.argv.slice(2);
  const line = await ping({ site, to, from: from || undefined });
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `IndexNow: ${line}\n`);
    } catch {
      // A summary not written is no reason to fail.
    }
  }
  process.exit(0);
}
