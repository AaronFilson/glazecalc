import fs from 'node:fs';
import path from 'node:path';
import { deleteAccount } from '../lib/account_data.ts';
import { exportAccount } from '../lib/export_data.ts';
import { hashOf } from '../lib/share_links.ts';
import Additive from '../models/additive.ts';
import Recipe from '../models/recipe.ts';
import ShareLink from '../models/share_link.ts';
import { api, expect, makeUser, sessionToken, site } from './support/app.ts';
import { makeToken } from './support/tokens.ts';

type TestUser = Awaited<ReturnType<typeof makeUser>>;

const INDEX = path.join(import.meta.dirname, '..', '..', 'dist', 'glazecalc', 'browser', 'index.html');

const as = (token: string) => ({
  get: (url: string) =>
    api()
      .get(url)
      .set('Authorization', 'Bearer ' + token),
  post: (url: string, body: object = {}) =>
    api()
      .post(url)
      .set('Authorization', 'Bearer ' + token)
      .send(body),
  put: (url: string, body: object = {}) =>
    api()
      .put(url)
      .set('Authorization', 'Bearer ' + token)
      .send(body),
  delete: (url: string) =>
    api()
      .delete(url)
      .set('Authorization', 'Bearer ' + token)
});

/** The recipe a link's secret opens, as anyone would ask for it. */
const view = (secret: string) => api().get('/shared/recipe').set('X-Share-Secret', secret);

describe('share links', () => {
  let alice: TestUser;
  let bob: TestUser;
  let recipeId: string;

  beforeEach(async () => {
    [alice, bob] = await Promise.all([makeUser(), makeUser()]);
    const recipe = await Recipe.create({
      title: 'Satin white',
      ownedBy: String(alice.user._id),
      date: '2026-10-01',
      notes: ['Sells well at $40 a bowl'],
      includeAdditives: false,
      computed: [{ uList: { CaO: 1 } }],
      materials: [
        {
          _id: 'abc',
          name: 'Whiting',
          amount: '20',
          fields: [{ name: 'CaO', amount: 1, amountUnity: 1 }],
          percentmole: 'molecular',
          loi: 44,
          molecularweight: 100,
          notes: ['From the shop on Main St'],
          ownedBy: String(alice.user._id),
          price: 3.5,
          cost: '2'
        },
        { name: 'Silica', amount: 30, fields: [{ name: 'SiO2', amount: 1 }], percentmole: 'molecular', loi: 0 }
      ],
      additives: [{ name: 'Tin oxide', amount: '2', unit: 'percent', pricePerKg: 80 }]
    });
    recipeId = String(recipe._id);
  });

  const share = async (body: object = {}) => {
    const res = await as(alice.token).post('/share/recipe/' + recipeId, body);
    expect(res).to.have.status(200);
    return res.body as { secret: string; createdAt: string; includeNotes: boolean };
  };

  it('need an account, signed in on the website', async () => {
    expect(await api().post('/share/recipe/' + recipeId)).to.have.status(401);
    expect(await api().get('/share/recipe/' + recipeId)).to.have.status(401);
    const token = await makeToken(alice.user, { scopes: ['data:read', 'data:write'] });
    expect(await as(token).post('/share/recipe/' + recipeId)).to.have.status(403);
  });

  it('cannot be made by a trial', async () => {
    const trial = await api().post('/guest').send({});
    const trialToken = sessionToken(trial)!;
    const made = await as(trialToken).post('/recipe/create', { title: 'Mine', materials: [{ name: 'Talc' }] });
    const res = await as(trialToken).post('/share/recipe/' + made.body._id);
    expect(res).to.have.status(403);
    expect(res.body.code).to.eql('account-needed');
    expect(await ShareLink.countDocuments({ recipeId: made.body._id })).to.eql(0);
  });

  it("are only for the account's own recipes", async () => {
    for (const res of [
      await as(bob.token).post('/share/recipe/' + recipeId),
      await as(bob.token).get('/share/recipe/' + recipeId),
      await as(bob.token).put('/share/recipe/' + recipeId, { includeNotes: true }),
      await as(bob.token).delete('/share/recipe/' + recipeId)
    ]) {
      expect(res).to.have.status(404);
    }
    expect(await as(alice.token).post('/share/recipe/nonsense')).to.have.status(400);
    expect(await ShareLink.countDocuments({ recipeId })).to.eql(0);
  });

  it('send the secret once, 256 random bits, and keep only its hash', async () => {
    const made = await share();
    expect(made.secret).to.match(/^[A-Za-z0-9_-]{43}$/);
    expect(made.includeNotes).to.eql(false);
    const [row] = await ShareLink.find({ recipeId }).lean();
    expect(row.hash).to.eql(hashOf(made.secret));
    expect(JSON.stringify(row)).not.to.include(made.secret);
    const status = await as(alice.token).get('/share/recipe/' + recipeId);
    expect(status.body).to.have.all.keys('shared', 'createdAt', 'includeNotes');
    expect(status.body.shared).to.eql(true);
    expect(JSON.stringify(status.body)).not.to.include(made.secret);
    expect(JSON.stringify(status.body)).not.to.include(row.hash);
  });

  it('open the recipe for anyone, with its chemistry and nothing private', async () => {
    const { secret } = await share();
    const res = await view(secret);
    expect(res).to.have.status(200);
    expect(res.body).to.have.all.keys('title', 'date', 'includeAdditives', 'materials', 'additives', 'borrowed');
    expect(res.body.title).to.eql('Satin white');
    expect(res.body.materials[0]).to.eql({
      name: 'Whiting',
      amount: '20',
      fields: [{ name: 'CaO', amount: 1 }],
      percentmole: 'molecular',
      loi: 44,
      molecularweight: 100
    });
    expect(res.body.materials[1].amount).to.eql('30');
    expect(res.body.additives).to.eql([{ name: 'Tin oxide', amount: '2', unit: 'percent' }]);
    const text = JSON.stringify(res.body);
    for (const secretThing of [String(alice.user._id), alice.email, 'Main St', '$40', 'price', 'cost', recipeId]) {
      expect(text).not.to.include(secretThing);
    }
  });

  it('show the notes only when the owner chooses', async () => {
    const { secret } = await share({ includeNotes: true });
    expect((await view(secret)).body.notes).to.eql(['Sells well at $40 a bowl']);
    expect(await as(alice.token).put('/share/recipe/' + recipeId, { includeNotes: false })).to.have.status(200);
    expect((await view(secret)).body).not.to.have.property('notes');
  });

  it('show the recipe as it is now', async () => {
    const { secret } = await share();
    await as(alice.token).put('/recipe/change/' + recipeId, { recipe: { title: 'Satin white 2' } });
    expect((await view(secret)).body.title).to.eql('Satin white 2');
  });

  it("carry the chemistry an additive borrows by name, from the owner's records too", async () => {
    await Additive.create({
      name: 'Bentonite',
      ownedBy: String(alice.user._id),
      fields: [{ name: 'SiO2', amount: 60 }],
      percentmole: 'percent',
      loi: 8,
      notes: ['my bentonite']
    });
    await Recipe.updateOne(
      { _id: recipeId },
      { $push: { additives: { name: 'Gum', amount: '1', chemistryOf: 'Bentonite' } } }
    );
    const { secret } = await share();
    const { body } = await view(secret);
    expect(body.borrowed).to.have.length(1);
    expect(body.borrowed[0]).to.eql({
      name: 'Bentonite',
      fields: [{ name: 'SiO2', amount: 60 }],
      percentmole: 'percent',
      loi: 8
    });
    expect(JSON.stringify(body)).not.to.include('note');
  });

  it('are replaced by a new link, and stop when the owner says', async () => {
    const first = await share();
    const second = await share();
    expect(second.secret).not.to.eql(first.secret);
    expect(await view(first.secret)).to.have.status(404);
    expect(await view(second.secret)).to.have.status(200);
    expect(await ShareLink.countDocuments({ ownedBy: String(alice.user._id) })).to.eql(1);

    const stopped = await as(alice.token).delete('/share/recipe/' + recipeId);
    expect(stopped.body.code).to.eql('share-stopped');
    const gone = await view(second.secret);
    expect(gone).to.have.status(404);
    expect(gone.body.code).to.eql('not-shared');
    expect((await as(alice.token).get('/share/recipe/' + recipeId)).body).to.eql({ shared: false });
  });

  it('stop when the recipe goes to the Trash, and stay stopped when it is put back', async () => {
    const { secret } = await share();
    const trashed = await as(alice.token).delete('/recipe/delete/' + recipeId);
    expect(trashed).to.have.status(200);
    expect(await view(secret)).to.have.status(404);
    expect(await as(alice.token).post('/trash/restore/' + trashed.body.trashId)).to.have.status(200);
    expect(await view(secret)).to.have.status(404);
  });

  it('turn away a secret that opens nothing, the same way whatever it is', async () => {
    for (const secret of ['', 'short', 'x'.repeat(43), 'a'.repeat(200)]) {
      const res = await view(secret);
      expect(res, secret).to.have.status(404);
      expect(res.body.code).to.eql('not-shared');
    }
  });

  it('are never indexed, kept or passed on in a Referer', async () => {
    const { secret } = await share();
    for (const res of [await view(secret), await view('nothing')]) {
      expect(res.headers['x-robots-tag']).to.eql('noindex, nofollow, noarchive');
      expect(res.headers['referrer-policy']).to.eql('no-referrer');
      expect(res.headers['cache-control']).to.eql('no-store');
    }
  });

  it('go with the account, and its download lists them without the link', async () => {
    const { secret } = await share({ includeNotes: true });
    const data = await exportAccount(alice.user._id);
    expect(data?.shareLinks).to.have.length(1);
    const [link] = data!.shareLinks as Array<Record<string, unknown>>;
    expect(link).to.have.all.keys('recipeId', 'createdAt', 'includeNotes');
    expect(JSON.stringify(data)).not.to.include(hashOf(secret));
    await deleteAccount(alice.user._id);
    expect(await ShareLink.countDocuments({ ownedBy: String(alice.user._id) })).to.eql(0);
    expect(await view(secret)).to.have.status(404);
  });

  describe('the shared page', function () {
    before(function () {
      // Needs a client build (CI builds before testing; locally: npm run build).
      if (!fs.existsSync(INDEX)) this.skip();
    });

    it('is never indexed and names no Referer, in any language', async () => {
      for (const page of ['/shared', '/de/shared']) {
        const res = await site().get(page);
        expect(res, page).to.have.status(200);
        expect(res.headers['x-robots-tag'], page).to.eql('noindex, nofollow, noarchive');
        expect(res.headers['referrer-policy'], page).to.eql('no-referrer');
        expect(res.text, page).to.include('<meta name="robots" content="noindex, nofollow" />');
        expect(res.text, page).to.include('<meta name="referrer" content="no-referrer" />');
        expect(res.text, page).not.to.include('rel="canonical"');
        expect(res.text, page).not.to.include('hreflang');
      }
    });
  });
});
