import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'chai';
import { INDEXNOW_KEY } from '../../lib/indexnow.js';
import languages from '../../lib/regions/languages.js';
import {
  ENDPOINT,
  MAX_URLS,
  changesContent,
  isSitemapIndex,
  payload,
  ping,
  sitemapUrls
} from '../../scripts/indexnow.mjs';
import { sitemap, sitemapIndex, sitemapPath } from '../lib/pages.ts';

// Telling search engines about changed pages after a production deploy (scripts/indexnow.mjs).
const SITE = 'https://glazecalcapp.com';

/** Every address in the app's sitemaps, as the site serves them: one per language. */
const allUrls = () =>
  languages.LIVE_LANGUAGES.flatMap((code) => sitemapUrls(sitemap(SITE, undefined, undefined, undefined, code)));

/**
 * A fetch that answers the sitemap index and each language's sitemap with the app's own, and IndexNow
 * with `status`, keeping what was posted.
 */
function fakeFetch(status: number | Error) {
  const posted: Array<Record<string, unknown>> = [];
  const get = (async (url: string, init?: RequestInit) => {
    if (url === SITE + '/sitemap.xml') return new Response(sitemapIndex(SITE), { status: 200 });
    const code = languages.LIVE_LANGUAGES.find((live) => url === SITE + sitemapPath(live));
    if (code) return new Response(sitemap(SITE, undefined, undefined, undefined, code), { status: 200 });
    expect(url).to.equal(ENDPOINT);
    posted.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    if (status instanceof Error) throw status;
    return new Response(null, { status });
  }) as typeof fetch;
  return { get, posted };
}

describe('IndexNow', () => {
  it('serves its key from client/public as <key>.txt, with the key alone', () => {
    expect(INDEXNOW_KEY).to.match(/^[0-9a-f]{32}$/);
    const file = path.join(import.meta.dirname, '..', '..', 'client', 'public', INDEXNOW_KEY + '.txt');
    expect(fs.readFileSync(file, 'utf8')).to.equal(INDEXNOW_KEY);
  });

  it('counts a change to the client, the guides, lib or data as one to the pages', () => {
    expect(changesContent(['client/public/i18n/de.json'])).to.equal(true);
    expect(changesContent(['docs/guides/firing.md'])).to.equal(true);
    expect(changesContent(['data/materials.ndjson'])).to.equal(true);
    expect(changesContent(['lib/pages.js'])).to.equal(true);
    expect(changesContent(['server/lib/pages.ts'])).to.equal(true);
    expect(changesContent(['server/routes/recipes.ts', '.github/workflows/ci.yml', 'deploy/deploy.sh'])).to.equal(
      false
    );
    expect(changesContent([])).to.equal(false);
  });

  it("sends the sitemap's addresses: each language's pages, and a page in English only in English alone", () => {
    const urls = sitemapUrls(sitemap(SITE, ['en', 'de']));
    expect(urls).to.include(SITE + '/de/');
    expect(urls).to.include(SITE + '/de/guides/firing');
    expect(urls).to.include(SITE + '/guides/learn-with-john-britt');
    expect(urls).not.to.include(SITE + '/de/guides/learn-with-john-britt');
    expect(urls).to.include(SITE + '/materials/silica');
    expect(urls).to.include(SITE + '/de/materials/silica');
    expect(new Set(urls).size).to.equal(urls.length);
    // Signs in and the pages once signed in are noindex and never sent.
    expect(urls).not.to.include(SITE + '/recipe');
  });

  it('reads the sitemap index, and each sitemap it names', () => {
    const index = sitemapIndex(SITE, ['en', 'de'], {});
    expect(isSitemapIndex(index)).to.equal(true);
    expect(isSitemapIndex(sitemap(SITE, ['en', 'de']))).to.equal(false);
    expect(sitemapUrls(index)).to.deep.equal([SITE + '/sitemaps/en.xml', SITE + '/sitemaps/de.xml']);
  });

  it('sends the key, where it is, and only addresses on the host', () => {
    expect(payload(SITE, [SITE + '/', 'https://elsewhere.example/'])).to.deep.equal({
      host: 'glazecalcapp.com',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: [SITE + '/']
    });
  });

  it('sends every address once when there is no last commit, in requests of at most 10,000, and says what IndexNow answered', async () => {
    const { get, posted } = fakeFetch(202);
    const line = await ping({ site: SITE + '/', to: 'b', fetch: get });
    const all = allUrls();
    expect(posted).to.have.length(Math.ceil(all.length / MAX_URLS));
    for (const body of posted) expect((body['urlList'] as string[]).length).to.be.at.most(MAX_URLS);
    expect(posted.flatMap((body) => body['urlList'] as string[])).to.deep.equal(all);
    expect(line).to.match(/^Sent \d+ addresses( in \d+ requests)?: IndexNow answered 202/);
  });

  it('sends nothing when nothing a page shows changed, and everything when something did', async () => {
    const unchanged = fakeFetch(200);
    expect(
      await ping({ site: SITE, from: 'a', to: 'b', changedFiles: () => ['deploy/deploy.sh'], fetch: unchanged.get })
    ).to.match(/^Not sent: nothing a page shows changed/);
    expect(unchanged.posted).to.have.length(0);
    const changed = fakeFetch(200);
    await ping({
      site: SITE,
      from: 'a',
      to: 'b',
      changedFiles: () => ['client/public/i18n/de.json'],
      fetch: changed.get
    });
    expect(changed.posted.length).to.be.at.least(1);
    // A last commit git does not know (history rewritten): everything.
    const unknown = fakeFetch(200);
    const failing = () => {
      throw new Error('bad revision');
    };
    await ping({ site: SITE, from: 'gone', to: 'b', changedFiles: failing, fetch: unknown.get });
    expect(unknown.posted.length).to.be.at.least(1);
  });

  it('refuses any site but production, staging first', async () => {
    const { get, posted } = fakeFetch(200);
    expect(await ping({ site: 'https://staging.glazecalcapp.com', to: 'b', fetch: get })).to.match(/^Not sent/);
    expect(await ping({ site: 'http://localhost:3000', to: 'b', fetch: get })).to.match(/^Not sent/);
    expect(posted).to.have.length(0);
  });

  it('never rejects: a network error, a refusal or a missing sitemap is a line for the summary', async () => {
    expect(await ping({ site: SITE, to: 'b', fetch: fakeFetch(new Error('ECONNRESET')).get })).to.equal(
      'Not sent: ECONNRESET.'
    );
    expect(await ping({ site: SITE, to: 'b', fetch: fakeFetch(403).get })).to.match(
      /answered 403 \(the key was not found/
    );
    expect(await ping({ site: SITE, to: 'b', fetch: fakeFetch(429).get })).to.match(/answered 429/);
    const noSitemap = (async () => new Response('', { status: 502 })) as typeof fetch;
    expect(await ping({ site: SITE, to: 'b', fetch: noSitemap })).to.equal(
      `Not sent: ${SITE}/sitemap.xml answered 502.`
    );
  });
});
