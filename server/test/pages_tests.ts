import fs from 'node:fs';
import path from 'node:path';
import { pageHtml, sitemap } from '../lib/pages.ts';
import { expect, site } from './support/app.ts';

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
    <meta property="og:url" content="https://glazecalcapp.com/" />
  </head>
  <body><gc-root></gc-root></body>
</html>`;
const SITE = 'https://glazecalcapp.com';

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
      'href="https://glazecalcapp.com/a&quot;&gt;&lt;script&gt;"'
    );
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

  it('serves each page written for its language', async function () {
    // Needs a client build (CI builds before testing; locally: npm run build).
    if (!fs.existsSync(path.join(import.meta.dirname, '..', '..', 'dist', 'glazecalc', 'browser', 'index.html'))) {
      this.skip();
    }
    const english = await site().get('/');
    expect(english.text).to.include('<html lang="en" dir="ltr">');
    const arabic = await site().get('/ar/guides');
    expect(arabic).to.have.status(200);
    expect(arabic.text).to.include('<html lang="ar" dir="rtl">');
    expect(arabic.text).to.include('<meta name="robots" content="noindex" />');
    expect(arabic.headers['cache-control']).to.equal('no-cache');
  });
});
