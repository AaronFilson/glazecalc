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
