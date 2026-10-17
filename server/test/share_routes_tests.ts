import fs from 'node:fs';
import path from 'node:path';
import { deleteAccount } from '../lib/account_data.ts';
import { exportAccount } from '../lib/export_data.ts';
import { forgetStandards, hashOf } from '../lib/share_links.ts';
import * as mail from './support/mail.ts';
import AccessToken from '../models/access_token.ts';
import Additive from '../models/additive.ts';
import Material from '../models/material.ts';
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

  it("send the owner's own records under the name the recipe asked for, never their names or aliases", async () => {
    await Additive.create({
      name: 'Private bentonite name',
      aliases: ['Wyoming gel'],
      ownedBy: String(alice.user._id),
      fields: [{ name: 'SiO2', amount: 60 }],
      percentmole: 'percent',
      loi: 8
    });
    await Material.create({
      name: 'Secret kaolin',
      aliases: ['EPK'],
      ownedBy: String(alice.user._id),
      fields: [{ name: 'Al2O3', amount: 40 }],
      percentmole: 'percent',
      loi: 12,
      molecularweight: 258,
      formulaweight: 258,
      equivalent: 258
    });
    await Recipe.updateOne(
      { _id: recipeId },
      {
        $push: {
          additives: {
            $each: [
              { name: 'Gum', amount: '1', chemistryOf: 'wyoming gel' },
              { name: 'Clay', amount: '1', chemistryOf: 'epk' }
            ]
          }
        }
      }
    );
    const { secret } = await share();
    const { body } = await view(secret);
    expect(body.borrowed.map((record: { name: string }) => record.name).sort()).to.eql(['epk', 'wyoming gel']);
    const text = JSON.stringify(body);
    for (const hidden of ['Private bentonite name', 'Secret kaolin', 'aliases', 'EPK', 'Wyoming gel']) {
      expect(text).not.to.include(hidden);
    }
    expect(body.borrowed.find((record: { name: string }) => record.name === 'epk').fields).to.eql([
      { name: 'Al2O3', amount: 40 }
    ]);
  });

  it('send a standard record borrowed, as the library names it', async () => {
    const standard = await Additive.create({
      name: 'Share test standard clay',
      aliases: ['sts clay'],
      ownedBy: 'Standard',
      fields: [{ name: 'SiO2', amount: 50 }],
      percentmole: 'percent',
      loi: 5
    });
    forgetStandards();
    try {
      await Recipe.updateOne({ _id: recipeId }, { $push: { additives: { name: 'Gum', chemistryOf: 'STS clay' } } });
      const { secret } = await share();
      const { body } = await view(secret);
      expect(body.borrowed).to.eql([
        {
          name: 'Share test standard clay',
          aliases: ['sts clay'],
          fields: [{ name: 'SiO2', amount: 50 }],
          percentmole: 'percent',
          loi: 5
        }
      ]);
    } finally {
      await Additive.deleteOne({ _id: standard._id });
      forgetStandards();
    }
  });

  it('are all stopped by a password reset and by signing out everywhere, not by a password change', async () => {
    const other = await Recipe.create({
      title: 'Celadon',
      ownedBy: String(alice.user._id),
      materials: [{ name: 'Talc' }]
    });
    const first = await share();
    const second = (await as(alice.token).post('/share/recipe/' + other._id)).body as { secret: string };
    const links = async () => ShareLink.countDocuments({ ownedBy: String(alice.user._id) });

    // A plain password change keeps them.
    const before = mail.to(alice.email).length;
    const changed = await as(alice.token).put('/password', { current: alice.password, password: 'a-new-password-1' });
    expect(changed, JSON.stringify(changed.body)).to.have.status(200);
    expect(await links()).to.eql(2);
    await mail.waitFor(alice.email, before + 1);

    // A reset stops them all, and the notice says so.
    expect(await api().post('/password/forgot').send({ email: alice.email })).to.have.status(200);
    const sent = await mail.waitFor(alice.email, before + 2);
    const done = await api()
      .post('/password/reset')
      .send({ token: mail.tokenIn(sent[sent.length - 1]!), password: 'a-new-password-2' });
    expect(done).to.have.status(200);
    expect(await links()).to.eql(0);
    expect(await view(first.secret)).to.have.status(404);
    expect(await view(second.secret)).to.have.status(404);
    const notice = (await mail.waitFor(alice.email, before + 3))[before + 2]!;
    expect(notice.subject).to.eql('Your Glazecalc password was changed');
    expect(notice.text).to.include('- The links you had made to share recipes.');

    // A reset with no links to stop says nothing about them.
    const bare = await makeUser();
    const bareBefore = mail.to(bare.email).length;
    await api().post('/password/forgot').send({ email: bare.email });
    const bareSent = await mail.waitFor(bare.email, bareBefore + 1);
    await api()
      .post('/password/reset')
      .send({ token: mail.tokenIn(bareSent[bareSent.length - 1]!), password: 'a-new-password-3' });
    const bareNotice = (await mail.waitFor(bare.email, bareBefore + 2))[bareBefore + 1]!;
    expect(bareNotice.text).not.to.include('share recipes');

    // Signing out everywhere stops them too.
    const carol = await makeUser();
    const recipe = await Recipe.create({
      title: 'Carol',
      ownedBy: String(carol.user._id),
      materials: [{ name: 'Talc' }]
    });
    const carols = (await as(carol.token).post('/share/recipe/' + recipe._id)).body as { secret: string };
    expect(await view(carols.secret)).to.have.status(200);
    const carolsToken = await makeToken(carol.user);
    expect(
      await api()
        .post('/signout-everywhere')
        .set('Authorization', 'Bearer ' + carol.token)
    ).to.have.status(200);
    expect(await view(carols.secret)).to.have.status(404);
    expect(await ShareLink.countDocuments({ ownedBy: String(carol.user._id) })).to.eql(0);
    // And her access tokens, in the same step.
    expect((await AccessToken.findOne({ userId: carol.user._id }))!.revokedWhy).to.eql('signed-out-everywhere');
    expect(
      await api()
        .get('/recipe/getAll')
        .set('Authorization', 'Bearer ' + carolsToken)
    ).to.have.status(401);
  });

  it('is taken away again when the recipe goes while the link is being made', async () => {
    const real = Recipe.exists.bind(Recipe);
    let calls = 0;
    // The first look (is it the account's?) finds it; the second, after the link is made, does not.
    (Recipe as unknown as { exists: unknown }).exists = (filter: object) =>
      calls++ === 0 ? real(filter) : Promise.resolve(null);
    try {
      const res = await as(alice.token).post('/share/recipe/' + recipeId);
      expect(res).to.have.status(404);
    } finally {
      (Recipe as unknown as { exists: unknown }).exists = real;
    }
    expect(await ShareLink.countDocuments({ recipeId })).to.eql(0);
  });

  it('are stopped on restore, even if the Trash could not stop them', async () => {
    await share();
    const realDelete = ShareLink.deleteOne.bind(ShareLink);
    let failed = false;
    // Going to the Trash cannot stop the link, yet the delete still answers...
    (ShareLink as unknown as { deleteOne: unknown }).deleteOne = () => {
      failed = true;
      return Promise.reject(new Error('down'));
    };
    let trashed;
    try {
      trashed = await as(alice.token).delete('/recipe/delete/' + recipeId);
    } finally {
      (ShareLink as unknown as { deleteOne: unknown }).deleteOne = realDelete;
    }
    expect(failed).to.eql(true);
    expect(trashed).to.have.status(200);
    expect(await ShareLink.countDocuments({ recipeId })).to.eql(1);
    // ...and putting it back takes the link away before the recipe is back.
    expect(await as(alice.token).post('/trash/restore/' + trashed.body.trashId)).to.have.status(200);
    expect(await ShareLink.countDocuments({ recipeId })).to.eql(0);
  });

  it('send the privacy headers on a rate-limited reply too', async () => {
    process.env.RATE_LIMITS = 'on';
    try {
      let last;
      for (let i = 0; i < 52; i++) last = await view('nothing');
      expect(last).to.have.status(429);
      expect(last!.headers['x-robots-tag']).to.eql('noindex, nofollow, noarchive');
      expect(last!.headers['cache-control']).to.eql('no-store');
      expect(last!.headers['referrer-policy']).to.eql('no-referrer');
    } finally {
      process.env.RATE_LIMITS = 'off';
    }
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

  it("list the account's shared recipes, from the session only, never a secret", async () => {
    expect(await api().get('/share/recipes')).to.have.status(401);
    const token = await makeToken(alice.user, { scopes: ['data:read', 'data:write'] });
    expect(await as(token).get('/share/recipes')).to.have.status(403);
    expect((await as(alice.token).get('/share/recipes')).body).to.eql([]);

    const other = await Recipe.create({
      title: 'Celadon',
      ownedBy: String(alice.user._id),
      materials: [{ name: 'Talc' }]
    });
    const { secret } = await share({ includeNotes: true });
    await as(alice.token).post('/share/recipe/' + other._id);
    const bobs = await Recipe.create({
      title: 'Bob only',
      ownedBy: String(bob.user._id),
      materials: [{ name: 'Talc' }]
    });
    await as(bob.token).post('/share/recipe/' + bobs._id);

    const res = await as(alice.token).get('/share/recipes');
    expect(res).to.have.status(200);
    expect(res.body.map((row: { title: string }) => row.title)).to.eql(['Celadon', 'Satin white']);
    expect(res.body[0]).to.have.all.keys('recipeId', 'title', 'createdAt', 'includeNotes');
    expect(res.body[0].includeNotes).to.eql(false);
    expect(res.body[1].includeNotes).to.eql(true);
    expect(res.body[1].recipeId).to.eql(recipeId);
    const [row] = await ShareLink.find({ recipeId }).lean();
    expect(JSON.stringify(res.body)).not.to.include(secret);
    expect(JSON.stringify(res.body)).not.to.include(row.hash);

    await as(alice.token).delete('/share/recipe/' + recipeId);
    expect((await as(alice.token).get('/share/recipes')).body).to.have.length(1);
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
