import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { base, expect } from './support/app.ts';
import { chooseEncoding } from '../lib/compress.ts';

const INDEX = path.join(import.meta.dirname, '..', '..', 'dist', 'glazecalc', 'browser', 'index.html');

interface Raw {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

// A request with no decoding, so the bytes on the wire can be checked.
const raw = (address: string, headers: Record<string, string> = {}, method = 'GET'): Promise<Raw> =>
  new Promise((resolve, reject) => {
    const req = http.request(base() + address, { method, headers }, (res) => {
      const parts: Buffer[] = [];
      res.on('data', (part: Buffer) => parts.push(part));
      res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(parts) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });

const decoded = (res: Raw): string => {
  const encoding = res.headers['content-encoding'];
  if (encoding === 'br') return zlib.brotliDecompressSync(res.body).toString('utf8');
  if (encoding === 'gzip') return zlib.gunzipSync(res.body).toString('utf8');
  return res.body.toString('utf8');
};

const nonceOf = (res: Raw): string => /'nonce-([^']+)'/.exec(String(res.headers['content-security-policy']))![1]!;

describe('choosing a reply encoding', () => {
  it('prefers brotli, then gzip, then none, whatever the order', () => {
    expect(chooseEncoding('gzip, deflate, br')).to.equal('br');
    expect(chooseEncoding('br;q=0, gzip')).to.equal('gzip');
    expect(chooseEncoding('gzip;q=0.5')).to.equal('gzip');
    expect(chooseEncoding('deflate')).to.equal('identity');
    expect(chooseEncoding('*')).to.equal('br');
    expect(chooseEncoding('*;q=0')).to.equal('identity');
    expect(chooseEncoding('br;q=0, *')).to.equal('gzip');
    expect(chooseEncoding('identity')).to.equal('identity');
    expect(chooseEncoding('')).to.equal('identity');
    expect(chooseEncoding(undefined)).to.equal('identity');
  });
});

describe('compressed pages', function () {
  before(function () {
    // Needs a client build (CI builds before testing; locally: npm run build).
    if (!fs.existsSync(INDEX)) this.skip();
  });

  for (const [accept, encoding] of [
    ['br, gzip', 'br'],
    ['gzip, deflate, br', 'br'],
    ['gzip', 'gzip'],
    ['br;q=0, gzip', 'gzip'],
    ['', undefined]
  ] as const) {
    it(`sends ${encoding ?? 'plain bytes'} for Accept-Encoding "${accept}"`, async () => {
      for (const page of ['/', '/guides/firing', '/de/recipe']) {
        const res = await raw(page, accept ? { 'Accept-Encoding': accept } : {});
        expect(res.status, page).to.equal(200);
        expect(res.headers['content-encoding'], page).to.equal(encoding);
        expect(String(res.headers.vary), page).to.match(/Accept-Encoding/i);
        expect(Number(res.headers['content-length']), page).to.equal(res.body.length);
        expect(res.headers['cache-control'], page).to.equal('no-cache');
        expect(res.headers.etag, page).to.equal(undefined);
        const html = decoded(res);
        // index.html writes ngCspNonce; a prerendered page, Angular's lower-case ngcspnonce and more attributes.
        const written = /<gc-root ngcspnonce="([^"]+)"/i.exec(html)?.[1];
        expect(written, page).to.equal(nonceOf(res));
        expect(html, page).not.to.include('__GC_NONCE__');
      }
    });
  }

  it('compresses each reply with a new nonce', async () => {
    const first = await raw('/guides/firing', { 'Accept-Encoding': 'br' });
    const second = await raw('/guides/firing', { 'Accept-Encoding': 'br' });
    expect(nonceOf(first)).not.to.equal(nonceOf(second));
    expect(decoded(first)).to.include(nonceOf(first));
    expect(decoded(second)).to.include(nonceOf(second));
    expect(decoded(second)).not.to.include(nonceOf(first));
  });

  it('sends far fewer bytes compressed', async () => {
    const plain = await raw('/guides/firing');
    const br = await raw('/guides/firing', { 'Accept-Encoding': 'br' });
    expect(br.body.length).to.be.below(plain.body.length / 2);
  });

  it('answers a HEAD with the same headers and no body', async () => {
    const res = await raw('/guides/firing', { 'Accept-Encoding': 'br' }, 'HEAD');
    expect(res.status).to.equal(200);
    expect(res.headers['content-encoding']).to.equal('br');
    expect(Number(res.headers['content-length'])).to.be.above(1000);
    expect(res.body.length).to.equal(0);
  });

  it('compresses a not-found page too, keeping its 404', async () => {
    const res = await raw('/no-such-page', { 'Accept-Encoding': 'gzip' });
    expect(res.status).to.equal(404);
    expect(res.headers['content-encoding']).to.equal('gzip');
    expect(decoded(res)).to.include('<gc-root');
  });
});

describe('compressed sitemap', () => {
  it('sends it compressed, with an ETag for a 304', async function () {
    const res = await raw('/sitemap.xml', { 'Accept-Encoding': 'br' });
    if (res.status === 404) this.skip();
    expect(res.status).to.equal(200);
    expect(res.headers['content-encoding']).to.equal('br');
    expect(String(res.headers.vary)).to.match(/Accept-Encoding/i);
    expect(Number(res.headers['content-length'])).to.equal(res.body.length);
    expect(res.headers['cache-control']).to.equal('public, max-age=3600');
    // The index of the languages' sitemaps.
    expect(decoded(res)).to.include('<sitemapindex');
    const etag = String(res.headers.etag);
    expect(etag).to.match(/-br"$/);
    const again = await raw('/sitemap.xml', { 'Accept-Encoding': 'br', 'If-None-Match': etag });
    expect(again.status).to.equal(304);
    expect(again.body.length).to.equal(0);
    // Another encoding is another ETag, so a cache never mixes them.
    const gzip = await raw('/sitemap.xml', { 'Accept-Encoding': 'gzip', 'If-None-Match': etag });
    expect(gzip.status).to.equal(200);
    expect(decoded(gzip)).to.equal(decoded(res));
    const head = await raw('/sitemap.xml', { 'Accept-Encoding': 'br' }, 'HEAD');
    expect(head.headers['content-length']).to.equal(res.headers['content-length']);
    expect(head.body.length).to.equal(0);
    // A language's own sitemap is compressed the same way, with its own ETag.
    const german = await raw('/sitemaps/de.xml', { 'Accept-Encoding': 'br' });
    expect(german.status).to.equal(200);
    expect(german.headers['content-encoding']).to.equal('br');
    expect(decoded(german)).to.include('<urlset');
    expect(german.headers.etag).to.match(/-br"$/);
    expect(german.headers.etag).not.to.equal(etag);
  });
});
