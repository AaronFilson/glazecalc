import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect, site } from './support/app.ts';

const INDEX = path.join(import.meta.dirname, '..', '..', 'dist', 'glazecalc', 'browser', 'index.html');

// The app uses plain paths (/recipe), so the server answers them with the client.
describe('client routes', function () {
  before(function () {
    // Needs a client build (CI builds before testing; locally: npm run build).
    if (!fs.existsSync(INDEX)) this.skip();
  });

  it('sends index.html for the app pages, never cached', async () => {
    for (const page of ['/', '/recipe', '/reset', '/advice', '/guides/firing', '/de/recipe']) {
      const res = await site().get(page);
      expect(res, page).to.have.status(200);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- chai-http's property assertion
      expect(res, page).to.be.html;
      expect(res.text, page).to.include('<gc-root');
      expect(res.headers['cache-control'], page).to.eql('no-cache');
    }
  });

  it('lets browsers keep the hashed fonts for a year, and the translations for five minutes', async () => {
    const media = path.join(path.dirname(INDEX), 'media');
    const font = fs.readdirSync(media).find((name) => name.endsWith('.woff2'));
    expect(font, 'a font in media/').to.be.a('string');
    const res = await site().get('/media/' + font);
    expect(res.headers['cache-control']).to.equal('public, max-age=31536000, immutable');
    for (const address of ['/i18n/en.json', '/i18n/site/de.json', '/i18n/guides/firing/de.md']) {
      const file = await site().get(address);
      expect(file, address).to.have.status(200);
      expect(file.headers['cache-control'], address).to.equal('public, max-age=300');
    }
    // Other files keep the default: checked each time.
    expect((await site().get('/favicon.svg')).headers['cache-control']).to.equal('public, max-age=0');
  });

  it("gives English pages that are not prerendered en.json's title and description", async () => {
    const { titles, meta } = JSON.parse(fs.readFileSync(path.join(path.dirname(INDEX), 'i18n', 'en.json'), 'utf8')) as {
      titles: { landing: string };
      meta: { description: string };
    };
    const res = await site().get('/recipe');
    expect(res.text).to.include(`<title>${titles.landing}</title>`);
    expect(res.text).to.match(
      new RegExp(`name="description"\\s+content="${meta.description.replace(/[()]/g, '\\$&')}"`)
    );
  });

  it('says the language of each page in Content-Language', async () => {
    for (const [page, code] of [
      ['/', 'en'],
      ['/guides', 'en'],
      ['/de/guides', 'de'],
      ['/de/recipe', 'de'],
      ['/el/', 'el']
    ]) {
      const res = await site().get(page!);
      expect(res.headers['content-language'], page).to.equal(code);
    }
  });

  it('limits what a page may load, with a new style nonce for each reply', async () => {
    const first = await site().get('/recipe');
    const second = await site().get('/recipe');
    const policy = String(first.headers['content-security-policy']);
    for (const directive of ["connect-src 'self'", "img-src 'self' data:", "font-src 'self'", "form-action 'self'"]) {
      expect(policy).to.include(directive);
    }
    // Scripts are left to the build's <meta> policy; a default-src here would block its inline script.
    expect(policy).not.to.match(/default-src|script-src/);
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
    expect(nonce).to.be.a('string');
    expect(first.text).to.include(`<gc-root ngCspNonce="${nonce}">`);
    expect(String(second.headers['content-security-policy'])).not.to.include(nonce!);
  });

  it("lets a page start the site's own service worker and read its manifest, and no one else's", async () => {
    const policy = String((await site().get('/recipe')).headers['content-security-policy']);
    expect(policy).to.include("worker-src 'self'");
    expect(policy).to.include("manifest-src 'self'");
  });

  // Needs a build with the service worker (scripts/service-worker.mjs).
  describe('the service worker', function () {
    before(function () {
      if (!fs.existsSync(path.join(path.dirname(INDEX), 'ngsw.json'))) this.skip();
    });

    it('is asked for each time: the worker, its manifest and the kill switch', async () => {
      for (const file of ['ngsw-worker.js', 'ngsw.json', 'safety-worker.js', 'worker-basic.min.js']) {
        const res = await site().get('/' + file);
        expect(res, file).to.have.status(200);
        expect(res.headers['cache-control'], file).to.equal('no-cache');
      }
    });

    it("keeps the app's files and the offline page in its manifest, and no worker file", async () => {
      const manifest = (await site().get('/ngsw.json')).body as { index: string; hashTable: Record<string, string> };
      expect(manifest.index).to.equal('/app-shell.html');
      expect(manifest.hashTable).to.have.property('/app-shell.html');
      for (const file of Object.keys(manifest.hashTable)) expect(file).not.to.match(/ngsw|safety-worker|worker-basic/);
    });

    it('sends the offline page as the manifest has it, with the nonce its policy names, and not for a search', async () => {
      const res = await site().get('/app-shell.html');
      expect(res).to.have.status(200);
      expect(res.headers['cache-control']).to.equal('no-cache');
      expect(res.headers['x-robots-tag']).to.equal('noindex');
      const nonce = /ngCspNonce="([^"]+)"/.exec(res.text)?.[1];
      expect(nonce).to.be.a('string');
      expect(String(res.headers['content-security-policy'])).to.include(`style-src 'self' 'nonce-${nonce}'`);
      // The same on every load, or the worker's copy would not match its hash.
      expect((await site().get('/app-shell.html?ngsw-cache-bust=0.5')).text).to.equal(res.text);
      const manifest = (await site().get('/ngsw.json')).body as { hashTable: Record<string, string> };
      const hash = crypto.createHash('sha1').update(fs.readFileSync(path.join(path.dirname(INDEX), 'app-shell.html')));
      expect(manifest.hashTable['/app-shell.html']).to.equal(hash.digest('hex'));
    });
  });

  // Needs the build's prerender too (npm run build).
  describe('prerendered pages', function () {
    before(function () {
      if (!fs.existsSync(path.join(path.dirname(INDEX), '..', 'prerendered', 'de', 'index.html'))) this.skip();
    });

    it("sends a guide in its language as it was rendered, with each reply's own nonce everywhere", async () => {
      const first = await site().get('/de/guides/firing');
      const second = await site().get('/de/guides/firing');
      expect(first, 'status').to.have.status(200);
      expect(first.text).to.include('<html lang="de" dir="ltr">');
      expect(first.text).to.include('<link rel="canonical" href="');
      expect(first.text).to.include('hreflang="en"');
      expect(first.text).to.include('<h1');
      const nonce = /'nonce-([^']+)'/.exec(String(first.headers['content-security-policy']))?.[1];
      expect(nonce).to.be.a('string');
      expect(first.text).not.to.include('__GC_NONCE__');
      expect(first.text.split(`nonce="${nonce}"`).length - 1).to.be.greaterThan(1);
      expect(second.text).not.to.include(`nonce="${nonce}"`);
      expect(first.headers['cache-control']).to.equal('no-cache');
    });

    it('keeps the page its own title, apart from the home page', async () => {
      const guide = await site().get('/de/guides/firing');
      const home = await site().get('/de/');
      const title = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1];
      expect(title(guide.text)).to.be.a('string');
      expect(title(guide.text)).not.to.equal(title(home.text));
    });

    it('sends index.html for the pages that are not prerendered', async () => {
      for (const address of ['/signin', '/de/recipe', '/pt/guides']) {
        const res = await site().get(address);
        expect(res.text, address).to.include('<gc-root ngCspNonce="');
        expect(res.text, address).not.to.include('ng-version');
      }
    });
  });

  it('sends the policy without a nonce for files and the API', async () => {
    for (const address of ['/favicon.svg', '/api/health']) {
      const res = await site().get(address);
      expect(String(res.headers['content-security-policy']), address).to.match(/style-src 'self'(;|$)/);
    }
  });

  it('sends the app, with a 404 and no address of its own, for any other address', async () => {
    // The app shows its not-found page; search engines see that nothing is there.
    for (const page of ['/no-such-page', '/xx/recipe', '/pt/guides', '/de/no-such-page', '/.../']) {
      const res = await site().get(page);
      expect(res, page).to.have.status(404);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- chai-http's property assertion
      expect(res, page).to.be.html;
      expect(res.text, page).to.include('<gc-root');
      expect(res.text, page).not.to.include('rel="canonical"');
      expect(res.text, page).not.to.include('hreflang');
    }
  });

  it('keeps missing files and unknown API paths as 404s', async () => {
    const file = await site().get('/missing-file.js');
    expect(file).to.have.status(404);
    const api = await site().get('/api/no-such-thing');
    expect(api).to.have.status(404);
    expect(api.body).to.eql({ code: 'not-found', msg: 'Not found' });
  });

  it('serves security.txt from .well-known as plain text', async () => {
    const res = await site().get('/.well-known/security.txt');
    expect(res).to.have.status(200);
    expect(res.type).to.eql('text/plain');
    expect(res.text).to.include('Contact: mailto:security@glazecalcapp.com');
    expect(res.text).to.match(/^Expires: /m);
    const missing = await site().get('/.well-known/nothing-here');
    expect(missing).to.have.status(404);
  });

  it('does not answer other methods with the page', async () => {
    const res = await site().post('/recipe').send({});
    expect(res).to.have.status(404);
  });
});
