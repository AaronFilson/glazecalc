import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { APP_PAGES, looksLikeFile, ogLocale, pageHtml, prerenderedKey, sitemap, withNonce } from '../lib/pages.ts';
import languages from '../../lib/regions/languages.js';
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

  it('offers Japanese now it is live, indexed and in the sitemap', () => {
    const japanese = languages.languageFor('ja');
    expect(japanese).to.include({ name: '日本語', english: 'Japanese', dir: 'ltr', live: true });
    expect(japanese).not.to.have.property('plainNotice');
    expect(languages.LIVE_LANGUAGES).to.include('ja');
    const html = pageHtml(HTML, '/ja/guides', SITE);
    expect(html).to.include('<html lang="ja" dir="ltr">');
    expect(html).not.to.include('<meta name="robots" content="noindex" />');
    expect(sitemap(SITE)).to.include('/ja/');
  });

  it('offers Turkish, with the standard notice rather than the plainer one', () => {
    const turkish = languages.languageFor('tr');
    expect(turkish).to.include({ name: 'Türkçe', english: 'Turkish', dir: 'ltr', live: true });
    expect(turkish).not.to.have.property('plainNotice');
    expect(languages.LIVE_LANGUAGES).to.include('tr');
    const html = pageHtml(HTML, '/tr/guides', SITE);
    expect(html).to.include('<html lang="tr" dir="ltr">');
    expect(html).not.to.include('<meta name="robots" content="noindex" />');
    expect(sitemap(SITE)).to.include('/tr/');
  });

  it('offers Thai, Vietnamese and Indonesian, with the standard notice rather than the plainer one', () => {
    for (const [code, name, english] of [
      ['th', 'ภาษาไทย', 'Thai'],
      ['vi', 'Tiếng Việt', 'Vietnamese'],
      ['id', 'Bahasa Indonesia', 'Indonesian']
    ]) {
      const language = languages.languageFor(code);
      expect(language).to.include({ name, english, dir: 'ltr', live: true });
      expect(language).not.to.have.property('plainNotice');
      expect(languages.LIVE_LANGUAGES).to.include(code);
      const html = pageHtml(HTML, `/${code}/guides`, SITE);
      expect(html).to.include(`<html lang="${code}" dir="ltr">`);
      expect(html).not.to.include('<meta name="robots" content="noindex" />');
      expect(html).to.include(`hreflang="${code}"`);
      expect(sitemap(SITE)).to.include(`/${code}/`);
    }
  });

  it('offers Traditional Chinese, Korean and Simplified Chinese, with the standard notice rather than the plainer one', () => {
    for (const [code, name, english] of [
      ['zh-Hant', '繁體中文', 'Traditional Chinese'],
      ['ko', '한국어', 'Korean'],
      ['zh-Hans', '简体中文', 'Simplified Chinese']
    ]) {
      const language = languages.languageFor(code);
      expect(language).to.include({ name, english, dir: 'ltr', live: true });
      expect(language).not.to.have.property('plainNotice');
      expect(languages.LIVE_LANGUAGES).to.include(code);
      const html = pageHtml(HTML, `/${code}/guides`, SITE);
      expect(html).to.include(`<html lang="${code}" dir="ltr">`);
      expect(html).not.to.include('<meta name="robots" content="noindex" />');
      expect(sitemap(SITE)).to.include(`/${code}/`);
    }
    expect(languages.canonicalLanguagePath('/zh-hans/recipe')).to.equal('/zh-Hans/recipe');
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

  it("keeps a prerendered page's own title and description, and still writes its address and languages", () => {
    const html = pageHtml(
      HTML,
      '/de/guides/firing',
      SITE,
      { title: 'Titel der Startseite', description: 'Beschreibung der Startseite', imageAlt: 'Bildtext' },
      ['en', 'de'],
      true
    );
    expect(html).to.include('<title>Glazecalc: a free glaze chemistry calculator for potters</title>');
    expect(html).to.include('content="Enter a glaze recipe and see its unity molecular formula."');
    expect(html).not.to.include('Startseite');
    expect(html).to.include('<html lang="de" dir="ltr">');
    expect(html).to.include('<link rel="canonical" href="https://glazecalcapp.com/de/guides/firing" />');
    expect(html).to.include('<meta property="og:url" content="https://glazecalcapp.com/de/guides/firing" />');
    expect(html).to.include('hreflang="en" href="https://glazecalcapp.com/guides/firing"');
    expect(pageHtml(HTML, '/ar/', SITE, {}, ['en'], true)).to.include('<meta name="robots" content="noindex" />');
  });

  it('names the prerendered file of a public page in a language offered, and no other', () => {
    expect(prerenderedKey('/')).to.equal('en/index.html');
    expect(prerenderedKey('/de/')).to.equal('de/index.html');
    expect(prerenderedKey('/guides/firing')).to.equal('en/guides/firing.html');
    expect(prerenderedKey('/el/guides/firing')).to.equal('el/guides/firing.html');
    expect(prerenderedKey('/de/advice')).to.equal('de/advice.html');
    // Pages once signed in, unknown pages, and languages not offered.
    for (const address of ['/signin', '/recipe', '/de/recipe', '/home', '/no-such-page', '/xx/guides', '/de/nope']) {
      expect(prerenderedKey(address), address).to.equal(null);
    }
    expect(prerenderedKey('/de/guides', ['en'])).to.equal(null);
    expect(prerenderedKey('/guides', ['en'])).to.equal('en/guides.html');
  });

  it("replaces every nonce placeholder with the reply's, and leaves none", () => {
    const html =
      '<gc-root ngcspnonce="__GC_NONCE__"><style nonce="__GC_NONCE__">a{}</style><style nonce="__GC_NONCE__">';
    const out = withNonce(html, 'ab+/=$&');
    expect(out.match(/nonce="ab\+\/=\$&"/g)).to.have.length(3);
    expect(out).not.to.include('__GC_NONCE__');
  });

  it("gives link previews the page's og:locale, Chinese by its script", () => {
    expect(pageHtml(HTML, '/de/guides', SITE, {}, ['en', 'de'])).to.include(
      '<meta property="og:locale" content="de_DE" />'
    );
    expect(pageHtml(HTML, '/guides', SITE)).to.include('<meta property="og:locale" content="en_US" />');
    expect(
      ['en', 'de', 'pt-PT', 'ga', 'mt', 'ar', 'en-XA', 'zh-Hans', 'zh-Hant', 'ja', 'ko'].map((code) => ogLocale(code))
    ).to.eql(['en_US', 'de_DE', 'pt_PT', 'ga_IE', 'mt_MT', 'ar_EG', 'en_US', 'zh_CN', 'zh_TW', 'ja_JP', 'ko_KR']);
  });

  it("writes a language's part of an address as its code is written, and nothing else", () => {
    expect(languages.canonicalLanguagePath('/DE/guides')).to.equal('/de/guides');
    expect(languages.canonicalLanguagePath('/pt-pt')).to.equal('/pt-PT');
    expect(languages.canonicalLanguagePath('/PT-pt/guides/firing')).to.equal('/pt-PT/guides/firing');
    expect(languages.canonicalLanguagePath('/EN-xa/recipe')).to.equal('/en-XA/recipe');
    for (const address of ['/de/guides', '/pt-PT/', '/guides', '/', '/EN/guides', '/deutsch', '/xx/recipe']) {
      expect(languages.canonicalLanguagePath(address), address).to.equal(null);
    }
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

  it("names each page's og:locale and the other languages offered as alternates", () => {
    const html = pageHtml(HTML, '/pt-PT/guides', SITE, {}, ['en', 'de', 'pt-PT', 'el']);
    expect(html).to.include('<meta property="og:locale" content="pt_PT" />');
    for (const other of ['en_US', 'de_DE', 'el_GR']) {
      expect(html).to.include(`<meta property="og:locale:alternate" content="${other}" />`);
    }
    expect(html).to.not.include('og:locale:alternate" content="pt_PT"');
    const alone = pageHtml(HTML, '/guides', SITE, {}, ['en']);
    expect(alone).to.include('og:locale" content="en_US"');
    expect(alone).to.not.include('og:locale:alternate');
  });

  it('gives a page not offered yet, and an address that is no page, no og:locale', () => {
    expect(pageHtml(HTML, '/ar/guides', SITE, {}, ['en', 'de'])).to.not.include('og:locale');
    expect(pageHtml(HTML, '/nowhere', SITE, {}, ['en', 'de'])).to.not.include('og:locale');
  });

  it('gives an address that is no page of the app no canonical address and no other languages', () => {
    for (const address of ['/no-such-page', '/xx/recipe', '/DE/guides', '/pt/guides', '/de/no-such-page', '/guides/']) {
      const html = pageHtml(HTML, address, SITE, {}, ['en', 'de']);
      expect(html, address).not.to.include('rel="canonical"');
      expect(html, address).not.to.include('hreflang');
    }
  });

  it('tells search engines not to index the pages for signing in and once signed in, with no canonical address or other languages', () => {
    for (const address of ['/recipe', '/de/recipe', '/signin', '/th/account', '/assistants', '/ar/home']) {
      const html = pageHtml(HTML, address, SITE, {}, ['en', 'de', 'th']);
      expect(html.match(/<meta name="robots" content="noindex" \/>/g), address).to.have.length(1);
      expect(html, address).not.to.include('rel="canonical"');
      expect(html, address).not.to.include('hreflang');
      expect(html, address).not.to.include('og:locale');
    }
    // The public pages stay indexed, with their canonical address.
    const guides = pageHtml(HTML, '/de/guides', SITE, {}, ['en', 'de']);
    expect(guides).not.to.include('noindex');
    expect(guides).to.include('<link rel="canonical" href="https://glazecalcapp.com/de/guides" />');
  });

  it('says noindex in a header too, for the pages for signing in and once signed in only', async () => {
    for (const address of ['/recipe', '/de/signin', '/account']) {
      const res = await site().get(address);
      expect(res.headers['x-robots-tag'], address).to.equal('noindex');
    }
    for (const address of ['/', '/de/guides', '/advice']) {
      const res = await site().get(address);
      expect(res.headers['x-robots-tag'], address).to.equal(undefined);
    }
  });

  it("sends /index.html to the home page, and a language's bare home to its address with a slash", async () => {
    for (const [from, to] of [
      ['/index.html', '/'],
      ['/index.html?x=1', '/?x=1'],
      ['/de', '/de/'],
      ['/pt-PT?x=1', '/pt-PT/?x=1'],
      ['/zh-Hans', '/zh-Hans/']
    ]) {
      const res = await redirectOf(from!);
      expect(res.status, from).to.equal(301);
      expect(res.location, from).to.equal(to);
    }
    for (const from of ['/de/', '/', '/recipe', '/xx']) {
      expect((await redirectOf(from)).status, from).not.to.equal(301);
    }
  });

  it('keeps a shared recipe out of search results and Referers, with no canonical address or other languages', () => {
    for (const address of ['/shared', '/de/shared']) {
      const html = pageHtml(HTML, address, SITE, {}, ['en', 'de']);
      expect(html, address).to.include('<meta name="robots" content="noindex, nofollow" />');
      expect(html, address).to.include('<meta name="referrer" content="no-referrer" />');
      expect(html, address).not.to.include('rel="canonical"');
      expect(html, address).not.to.include('hreflang');
      expect(html, address).not.to.include('og:locale');
    }
    expect(sitemap(SITE, ['en', 'de'])).not.to.include('shared');
    expect(prerenderedKey('/shared')).to.equal(null);
    expect(pageHtml(HTML, '/recipe', SITE, {}, ['en', 'de'])).not.to.include('name="referrer"');
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
    // Built once and kept: the same text again.
    const again = await site()
      .get('/sitemap.xml')
      .buffer(true)
      .parse((res, done) => {
        let text = '';
        res.on('data', (chunk: Buffer) => (text += chunk.toString()));
        res.on('end', () => done(null, text));
      });
    expect(again.body).to.equal(map.body);
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

  it("sends a language's code written in other letters to the code as written, on this site", async () => {
    for (const [from, to] of [
      ['/DE/guides', '/de/guides'],
      ['/pt-pt/guides/firing?x=1', '/pt-PT/guides/firing?x=1'],
      ['/Pt-Pt', '/pt-PT'],
      ['/EN/guides', '/guides'],
      ['/En', '/'],
      ['/DE//evil.example', '/de//evil.example'],
      ['/EN//evil.example', '/evil.example']
    ]) {
      const res = await redirectOf(from!);
      expect(res.status, from).to.equal(301);
      expect(res.location, from).to.equal(to);
    }
    for (const from of ['/de/guides', '/pt-PT/guides', '/deutsch', '/enamel', '/xx/guides']) {
      expect((await redirectOf(from)).status, from).not.to.equal(301);
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
      meta: { guides: string; imageAlt: string };
    };
    // The guides page's own description, not the site's.
    expect(german.text).to.include(`<meta property="og:description" content="${meta.guides}"`);
    expect(german.text).to.include(`<meta property="og:image:alt" content="${meta.imageAlt}"`);
    expect(german.text).to.include('<meta property="og:locale" content="de_DE"');
    // For search engines that read no hreflang.
    expect(german.headers['content-language']).to.equal('de');
    expect(english.headers['content-language']).to.equal('en');
    const arabic = await site().get('/ar/guides');
    expect(arabic).to.have.status(200);
    expect(arabic.text).to.include('<html lang="ar" dir="rtl">');
    expect(arabic.text).to.include('<meta name="robots" content="noindex" />');
    expect(arabic.headers['cache-control']).to.equal('no-cache');
  });
});

describe('search result descriptions', () => {
  // Search results cut a description at about 155-160 characters. Indonesian and
  // Vietnamese ran to 190; other languages are checked when they are next translated.
  it('keeps the Indonesian and Vietnamese ones to 160 characters', () => {
    for (const code of ['id', 'vi']) {
      const file = path.join(import.meta.dirname, '..', '..', 'client', 'public', 'i18n', code + '.json');
      const { meta } = JSON.parse(fs.readFileSync(file, 'utf8')) as { meta: Record<string, string> };
      for (const [key, text] of Object.entries(meta)) {
        expect([...text].length, `${code} meta.${key}`).to.be.at.most(160);
      }
    }
  });
});
