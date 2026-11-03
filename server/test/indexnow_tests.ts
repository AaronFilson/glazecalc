import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'chai';
import { INDEXNOW_KEY } from '../../lib/indexnow.js';
import { ENDPOINT, changesContent, payload, ping, sitemapUrls } from '../../scripts/indexnow.mjs';
import { sitemap } from '../lib/pages.ts';

// Telling search engines about changed pages after a production deploy (scripts/indexnow.mjs).
const SITE = 'https://glazecalcapp.com';

/** A fetch that answers the sitemap with the app's own, and IndexNow with `status`, keeping what was posted. */
function fakeFetch(status: number | Error) {
  const posted: Array<Record<string, unknown>> = [];
  const get = (async (url: string, init?: RequestInit) => {
    if (url === SITE + '/sitemap.xml') return new Response(sitemap(SITE), { status: 200 });
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
    expect(urls.some((url) => url.startsWith(SITE + '/materials/'))).to.equal(true);
    expect(urls.some((url) => url.startsWith(SITE + '/de/materials/'))).to.equal(false);
    expect(new Set(urls).size).to.equal(urls.length);
    // Signs in and the pages once signed in are noindex and never sent.
    expect(urls).not.to.include(SITE + '/recipe');
  });

  it('sends the key, where it is, and only addresses on the host', () => {
    expect(payload(SITE, [SITE + '/', 'https://elsewhere.example/'])).to.deep.equal({
      host: 'glazecalcapp.com',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: [SITE + '/']
    });
  });

  it('sends every address once when there is no last commit, and says what IndexNow answered', async () => {
    const { get, posted } = fakeFetch(202);
    const line = await ping({ site: SITE + '/', to: 'b', fetch: get });
    expect(posted).to.have.length(1);
    expect(posted[0]!['urlList']).to.deep.equal(sitemapUrls(sitemap(SITE)));
    expect(line).to.match(/^Sent \d+ addresses: IndexNow answered 202/);
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
    expect(changed.posted).to.have.length(1);
    // A last commit git does not know (history rewritten): everything.
    const unknown = fakeFetch(200);
    const failing = () => {
      throw new Error('bad revision');
    };
    await ping({ site: SITE, from: 'gone', to: 'b', changedFiles: failing, fetch: unknown.get });
    expect(unknown.posted).to.have.length(1);
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
