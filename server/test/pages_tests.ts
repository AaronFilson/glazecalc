import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { APP_PAGES, looksLikeFile, pageHtml, sitemap } from '../lib/pages.ts';
import { base, expect, site } from './support/app.ts';

// What search engines and link previews read before the app's script runs:
// each page's language, its address, and its other languages
// (docs/adr/0013-translations.md).
const HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>Glazecalc: a free glaze chemistry calculator for potters</title>
    <meta
      name="description"
      content="Enter a glaze recipe and see its unity molecular formula."
    />
    <meta property="og:title" content="Glazecalc" />
    <meta
      property="og:description"
      content="See any glaze recipe's unity molecular formula."
    />
    <meta property="og:url" content="https://glazecalcapp.com/" />
    <meta property="og:image:alt" content="Glazecalc: understand your glazes, not just mix them." />
  </head>
  <body><gc-root></gc-root></body>
</html>`;
const SITE = 'https://glazecalcapp.com';

/** Where a request for exactly this path is sent, if anywhere. HTTP clients would turn a \ in it into a /. */
const redirectOf = (pathname: string): Promise<{ status?: number; location?: string }> =>
  new Promise((resolve, reject) => {
    http
      .get(base() + '/', { path: pathname }, (res) => {
        res.resume();
        resolve({ status: res.statusCode, location: res.headers.location });
      })
      .on('error', reject);
  });

describe('pages in each language', () => {
  it('writes the language, direction and address of an English page, with no other languages while none is offered', () => {
    const html = pageHtml(HTML, '/guides/firing', SITE, {}, ['en']);
    expect(html).to.include('<html lang="en" dir="ltr">');
    expect(html).to.include('<link rel="canonical" href="https://glazecalcapp.com/guides/firing" />');
    expect(html).to.include('<meta property="og:url" content="https://glazecalcapp.com/guides/firing" />');
    expect(html).not.to.include('hreflang');
    expect(html).not.to.include('noindex');
  });

  it('links each page to itself in every language offered, with English as the default', () => {
    const html = pageHtml(HTML, '/de/guides', SITE, {}, ['en', 'de', 'fr']);
    expect(html).to.include('<html lang="de" dir="ltr">');
    expect(html).to.include('<link rel="canonical" href="https://glazecalcapp.com/de/guides" />');
    for (const [code, address] of [
      ['en', '/guides'],
      ['de', '/de/guides'],
      ['fr', '/fr/guides'],
      ['x-default', '/guides']
    ]) {
      expect(html).to.include(`<link rel="alternate" hreflang="${code}" href="https://glazecalcapp.com${address}" />`);
    }
  });

  it("keeps a language not yet offered out of search results, and sets a right-to-left one's direction", () => {
    const html = pageHtml(HTML, '/ar/recipe', SITE);
    expect(html).to.include('<html lang="ar" dir="rtl">');
    expect(html).to.include('<meta name="robots" content="noindex" />');
    expect(html).not.to.include('hreflang');
  });

  it("puts the language's title and description in, written safely", () => {
    const html = pageHtml(
      HTML,
      '/de/',
      SITE,
      { title: 'Glazecalc: Glasurrechner "frei"', description: 'Rezepte & mehr' },
      ['en', 'de']
    );
    expect(html).to.include('<title>Glazecalc: Glasurrechner &quot;frei&quot;</title>');
    expect(html).to.include('<meta property="og:title" content="Glazecalc: Glasurrechner &quot;frei&quot;" />');
    expect(html).to.include('content="Rezepte &amp; mehr"');
    // An address with quotes in it cannot end the attribute.
    expect(pageHtml(HTML, '/a"><script>', SITE)).to.include(
      'content="https://glazecalcapp.com/a&quot;&gt;&lt;script&gt;"'
    );
  });

  it("gives link previews the language's description and image text too", () => {
    const html = pageHtml(
      HTML,
      '/de/guides',
      SITE,
      { description: 'Glasurrezept eingeben', imageAlt: 'Glazecalc: Verstehen Sie Ihre Glasuren' },
      ['en', 'de']
    );
    expect(html).to.match(/property="og:description"\s+content="Glasurrezept eingeben"/);
    expect(html).to.include('<meta property="og:image:alt" content="Glazecalc: Verstehen Sie Ihre Glasuren" />');
    expect(html).not.to.include('See any glaze');
    expect(html).not.to.include('understand your glazes');
  });

  it('writes a $ in an address or a text as it is', () => {
    for (const [address, written] of [
      ["/x$'", "/x$'"],
      ['/x$&y', '/x$&amp;y'],
      ['/x$1y', '/x$1y'],
      ["/x$2/data-injected='yes'/", "/x$2/data-injected='yes'/"]
    ]) {
      const html = pageHtml(HTML, address!, SITE, { title: "$' and $&", description: '$1$2' });
      expect(html, address).to.include(`<meta property="og:url" content="https://glazecalcapp.com${written}" />`);
      expect(html, address).to.include("<title>$' and $&amp;</title>");
      expect(html, address).to.include('content="$1$2"');
      expect(html.match(/<gc-root>/g), address).to.have.length(1);
    }
  });

  it('gives an address that is no page of the app no canonical address and no other languages', () => {
    for (const address of ['/no-such-page', '/xx/recipe', '/DE/guides', '/pt/guides', '/de/no-such-page', '/guides/']) {
      const html = pageHtml(HTML, address, SITE, {}, ['en', 'de']);
      expect(html, address).not.to.include('rel="canonical"');
      expect(html, address).not.to.include('hreflang');
    }
    // The pages for signing in and once signed in are pages too.
    expect(pageHtml(HTML, '/de/recipe', SITE, {}, ['en', 'de'])).to.include(
      '<link rel="canonical" href="https://glazecalcapp.com/de/recipe" />'
    );
  });

  it("knows every page in the app's routes", () => {
    const routes = fs.readFileSync(
      path.join(import.meta.dirname, '..', '..', 'client', 'app', 'app.routes.ts'),
      'utf8'
    );
    const pages = [...routes.matchAll(/^\s*path: '([^']*)'/gm)].map((m) => '/' + m[1]).filter((page) => page !== '/**');
    expect([...APP_PAGES].sort()).to.eql(pages.sort());
  });

  it('tells a file from a page in one pass, even on a long path of dots', () => {
    expect(looksLikeFile('/main-ABC12345.js')).to.equal(true);
    expect(looksLikeFile('/guides/firing')).to.equal(false);
    expect(looksLikeFile('/a.b/c')).to.equal(false);
    const start = performance.now();
    expect(looksLikeFile('/' + '.'.repeat(50000) + '/')).to.equal(false);
    // A pattern took 2 seconds over this, holding up every other request.
    expect(performance.now() - start).to.be.below(50);
  });

  it('lists each public page in each language offered', () => {
    const one = sitemap(SITE, ['en']);
    expect(one).to.include('<url><loc>https://glazecalcapp.com/guides/firing</loc></url>');
    expect(one).not.to.include('xhtml:link');
    const two = sitemap(SITE, ['en', 'de']);
    expect(two).to.include(
      '<url><loc>https://glazecalcapp.com/de/guides</loc><xhtml:link rel="alternate" hreflang="en" href="https://glazecalcapp.com/guides"/><xhtml:link rel="alternate" hreflang="de" href="https://glazecalcapp.com/de/guides"/></url>'
    );
    expect(two.match(/<url>/g)).to.have.length(22);
  });

  it('serves the sitemap, and sends /en/ addresses to the plain English ones', async () => {
    // XML is not read as text by default.
    const map = await site()
      .get('/sitemap.xml')
      .buffer(true)
      .parse((res, done) => {
        let text = '';
        res.on('data', (chunk: Buffer) => (text += chunk.toString()));
        res.on('end', () => done(null, text));
      });
    expect(map).to.have.status(200);
    expect(map.headers['content-type']).to.match(/^application\/xml/);
    expect(map.body).to.include('/guides/home-safety</loc>');
    for (const [from, to] of [
      ['/en', '/'],
      ['/en/guides/firing?x=1', '/guides/firing?x=1']
    ]) {
      const res = await site().get(from).redirects(0);
      expect(res, from).to.have.status(301);
      expect(res.headers['location'], from).to.equal(to);
    }
  });

  it('sends /en/ addresses only to paths on this site, never to another site', async () => {
    for (const [from, to] of [
      ['/en//evil.example', '/evil.example'],
      ['/en//evil.example/x?y=1', '/evil.example/x?y=1'],
      ['/en/\\evil.example', '/evil.example'],
      ['/en/\\/evil.example', '/evil.example']
    ]) {
      const res = await redirectOf(from!);
      expect(res.status, from).to.equal(301);
      expect(res.location, from).to.equal(to);
    }
  });

  it('sends an address with a slash at the end to the page without it', async () => {
    for (const [from, to] of [
      ['/guides/', '/guides'],
      ['/de/guides/firing/?x=1', '/de/guides/firing?x=1'],
      ['/recipe//', '/recipe']
    ]) {
      const res = await redirectOf(from!);
      expect(res.status, from).to.equal(301);
      expect(res.location, from).to.equal(to);
    }
    // Not a language's home page, nor an address that is no page.
    for (const from of ['/de/', '/no-such-page/', '//evil.example/', '/\\evil.example/']) {
      expect((await redirectOf(from)).status, from).not.to.equal(301);
    }
  });

  it('serves each page written for its language', async function () {
    // Needs a client build (CI builds before testing; locally: npm run build).
    const client = path.join(import.meta.dirname, '..', '..', 'dist', 'glazecalc', 'browser');
    if (!fs.existsSync(path.join(client, 'index.html'))) {
      this.skip();
    }
    const english = await site().get('/');
    expect(english.text).to.include('<html lang="en" dir="ltr">');
    const german = await site().get('/de/guides');
    const { meta } = JSON.parse(fs.readFileSync(path.join(client, 'i18n', 'de.json'), 'utf8')) as {
      meta: { description: string; imageAlt: string };
    };
    expect(german.text).to.include(`<meta property="og:description" content="${meta.description}"`);
    expect(german.text).to.include(`<meta property="og:image:alt" content="${meta.imageAlt}"`);
    const arabic = await site().get('/ar/guides');
    expect(arabic).to.have.status(200);
    expect(arabic.text).to.include('<html lang="ar" dir="rtl">');
    expect(arabic.text).to.include('<meta name="robots" content="noindex" />');
    expect(arabic.headers['cache-control']).to.equal('no-cache');
  });
});
