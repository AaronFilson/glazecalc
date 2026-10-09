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
    for (const page of ['/', '/recipe', '/reset', '/advice', '/guides/firing', '/no-such-page']) {
      const res = await site().get(page);
      expect(res, page).to.have.status(200);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- chai-http's property assertion
      expect(res, page).to.be.html;
      expect(res.text, page).to.include('<gc-root');
      expect(res.headers['cache-control'], page).to.eql('no-cache');
    }
  });

  it('keeps missing files and unknown API paths as 404s', async () => {
    const file = await site().get('/missing-file.js');
    expect(file).to.have.status(404);
    const api = await site().get('/api/no-such-thing');
    expect(api).to.have.status(404);
    expect(api.body).to.eql({ code: 'not-found', msg: 'Not found' });
  });

  it('does not answer other methods with the page', async () => {
    const res = await site().post('/recipe').send({});
    expect(res).to.have.status(404);
  });
});
