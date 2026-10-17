import User, { type UserDocument } from '../models/user.ts';
import { api, expect, makeUser, sessionToken, uniqueEmail } from './support/app.ts';

// Checking a sign-in, and changing or deleting accounts. The password checks on
// email changes and deletes are covered in account_password_tests.ts.
describe('user API', () => {
  let user: UserDocument;
  let token: string;

  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });

  describe('verify', () => {
    it('answers with the signed-in account', async () => {
      user.displayname = 'Test Potter';
      await user.save();
      const res = await api()
        .get('/verify')
        .set('Authorization', 'Bearer ' + token);
      expect(res).to.have.status(200);
      expect(res.body).to.eql({
        code: 'verified',
        msg: 'User verified',
        id: String(user._id),
        name: 'Test Potter',
        email: user.email
      });
    });

    it('says goodbye, without an error, when there is no token yet', async () => {
      // Before sign-in the client sends the string 'null', or no token at all.
      for (const req of [
        api()
          .get('/verify')
          .set('Authorization', 'Bearer ' + 'null'),
        api().get('/verify').set('trashdata', 'junk')
      ]) {
        const res = await req;
        expect(res).to.have.status(200);
        expect(res.body.msg).to.eql('No token yet, so there is no email to find. Goodbye.');
      }
    });

    it('refuses a token that does not check out', async () => {
      const res = await api()
        .get('/verify')
        .set('Authorization', 'Bearer ' + 'not-a-token');
      expect(res).to.have.status(401);
    });
  });

  describe('preferences', () => {
    const get = (bearer: string) =>
      api()
        .get('/preferences')
        .set('Authorization', 'Bearer ' + bearer);
    const put = (bearer: string, body: object) =>
      api()
        .put('/preferences')
        .set('Authorization', 'Bearer ' + bearer)
        .send(body);

    const DEFAULTS = {
      weightUnit: 'g',
      gramPrecision: 'single',
      theme: 'system',
      palette: 'tenmoku',
      lead: 'off',
      region: '',
      format: 'auto',
      decimalMark: 'either',
      temperature: '',
      cones: '',
      language: 'en',
      density: '',
      englishTerms: 'off',
      notice: 'shown',
      recipeHelp: 'auto',
      currency: ''
    };

    it('start in grams to a tenth, and change one at a time', async () => {
      expect((await get(token)).body).to.eql(DEFAULTS);
      const res = await put(token, { weightUnit: 'lb' });
      expect(res).to.have.status(200);
      expect(res.body).to.eql({ ...DEFAULTS, weightUnit: 'lb' });
      // A change to one leaves the others as they were.
      expect((await put(token, { gramPrecision: 'full' })).body).to.eql({
        ...DEFAULTS,
        weightUnit: 'lb',
        gramPrecision: 'full'
      });
      expect((await put(token, { theme: 'dark', palette: 'cobalt' })).body).to.eql({
        ...DEFAULTS,
        weightUnit: 'lb',
        gramPrecision: 'full',
        theme: 'dark',
        palette: 'cobalt'
      });
      // Lead starts off; turning it on is a choice like any other.
      expect((await put(token, { lead: 'on' })).body.lead).to.equal('on');
      const saved = (await User.findById(user._id))?.preferences;
      expect([saved?.weightUnit, saved?.gramPrecision]).to.eql(['lb', 'full']);
    });

    it("keep the recipe page's help open or hidden, as chosen, or opening for an empty account", async () => {
      expect((await put(token, { recipeHelp: 'hidden' })).body.recipeHelp).to.equal('hidden');
      expect((await put(token, { recipeHelp: 'shown' })).body.recipeHelp).to.equal('shown');
      expect((await User.findById(user._id))?.preferences?.recipeHelp).to.equal('shown');
      const refused = await put(token, { recipeHelp: 'open' });
      expect(refused).to.have.status(400);
      expect(refused.body.msg).to.equal('Choose auto, shown or hidden.');
      expect((await put(token, { recipeHelp: 'auto' })).body.recipeHelp).to.equal('auto');
    });

    it('keep where the potter works and how numbers, temperatures and firing are shown', async () => {
      const res = await put(token, {
        region: 'DE',
        format: 'en-GB',
        decimalMark: 'point',
        temperature: 'F',
        cones: 'orton'
      });
      expect(res).to.have.status(200);
      expect(res.body).to.include({
        region: 'DE',
        format: 'en-GB',
        decimalMark: 'point',
        temperature: 'F',
        cones: 'orton'
      });
      // SK cones (JIS R 8101) are a third way to fire.
      expect((await put(token, { cones: 'sk' })).body.cones).to.equal('sk');
      expect((await User.findById(user._id))?.preferences?.cones).to.equal('sk');
      expect((await put(token, { cones: 'temperature' })).body.cones).to.equal('temperature');
      // Back to following the region.
      const back = await put(token, { region: '', format: 'auto', temperature: '', cones: '' });
      expect(back.body).to.include({ region: '', format: 'auto', temperature: '', cones: '' });
      for (const body of [
        { region: 'XX' },
        { region: 'de' },
        { format: 'xx-YY' },
        { decimalMark: ',' },
        { temperature: 'K' },
        { cones: 'seger' }
      ]) {
        const refused = await put(token, body);
        expect(refused, JSON.stringify(body)).to.have.status(400);
      }
      expect((await put(token, { temperature: 'K' })).body.msg).to.equal(
        'Temperatures can be in °C (C) or °F (F), or follow the region.'
      );
    });

    it('refuse a choice the app does not know, and changing nothing', async () => {
      for (const body of [
        { weightUnit: 'kg' },
        { weightUnit: '' },
        { weightUnit: null },
        { weightUnit: 3 },
        { gramPrecision: 'double' },
        { theme: 'sepia' },
        { palette: 'neon' },
        { lead: true },
        { lead: 'yes' },
        // One good and one bad: nothing changes.
        { weightUnit: 'lb', gramPrecision: 2 }
      ]) {
        const res = await put(token, body);
        expect(res, JSON.stringify(body)).to.have.status(400);
      }
      expect((await put(token, { gramPrecision: 'none' })).body.msg).to.equal(
        'Grams can show to a tenth (single) or in full (full).'
      );
      expect((await put(token, { font: 'serif' })).body.msg).to.equal('Nothing to change');
      expect((await get(token)).body).to.eql(DEFAULTS);
    });

    it('can be set by a trial, and need a sign-in', async () => {
      const trial = await api().post('/guest');
      const trialToken = sessionToken(trial) ?? '';
      expect(await put(trialToken, { weightUnit: 'lb' })).to.have.status(200);
      expect((await get(trialToken)).body).to.eql({ ...DEFAULTS, weightUnit: 'lb' });
      expect(await api().get('/preferences')).to.have.status(401);
      expect(await api().put('/preferences').send({ weightUnit: 'lb' })).to.have.status(401);
    });
  });

  describe('materials on hand', () => {
    const get = (bearer: string) =>
      api()
        .get('/shelf')
        .set('Authorization', 'Bearer ' + bearer);
    const put = (bearer: string, body: object) =>
      api()
        .put('/shelf')
        .set('Authorization', 'Bearer ' + bearer)
        .send(body);

    it('keeps the list of materials the account has, each once, in the order chosen', async () => {
      expect((await get(token)).body).to.eql({ shelf: [] });
      const res = await put(token, { shelf: ['6fd1f9f8c006e8f7e23d9126', 'name:Whiting', 'name:Whiting'] });
      expect(res).to.have.status(200);
      expect(res.body).to.eql({ shelf: ['6fd1f9f8c006e8f7e23d9126', 'name:Whiting'] });
      expect((await get(token)).body.shelf).to.eql(['6fd1f9f8c006e8f7e23d9126', 'name:Whiting']);
      // Emptied, it stays empty.
      expect((await put(token, { shelf: [] })).body).to.eql({ shelf: [] });
      expect((await get(token)).body).to.eql({ shelf: [] });
    });

    it('refuses what is not a list of keys, or too long a one', async () => {
      for (const body of [{}, { shelf: 'Whiting' }, { shelf: [3] }, { shelf: [''] }, { shelf: ['x'.repeat(201)] }]) {
        const res = await put(token, body);
        expect(res, JSON.stringify(body)).to.have.status(400);
        expect(res.body.msg).to.equal('The shelf is a list of up to 500 materials.');
      }
      const many = Array.from({ length: 501 }, (_, i) => 'name:M' + i);
      expect(await put(token, { shelf: many })).to.have.status(400);
      expect((await get(token)).body).to.eql({ shelf: [] });
    });

    it('can be kept by a trial, and needs a sign-in', async () => {
      const trial = await api().post('/guest');
      const trialToken = sessionToken(trial) ?? '';
      expect(await put(trialToken, { shelf: ['name:Silica'] })).to.have.status(200);
      expect((await get(trialToken)).body).to.eql({ shelf: ['name:Silica'] });
      expect(await api().get('/shelf')).to.have.status(401);
      expect(await api().put('/shelf').send({ shelf: [] })).to.have.status(401);
    });
  });

  describe('prices', () => {
    const get = (bearer: string) =>
      api()
        .get('/prices')
        .set('Authorization', 'Bearer ' + bearer);
    const put = (bearer: string, body: object) =>
      api()
        .put('/prices')
        .set('Authorization', 'Bearer ' + bearer)
        .send(body);

    it('keeps a price per kilogram for each material, the last given for a key', async () => {
      expect((await get(token)).body).to.eql({ prices: [] });
      const res = await put(token, {
        prices: [
          { key: '6fd1f9f8c006e8f7e23d9126', perKg: 2.5 },
          { key: 'name:Whiting', perKg: 0 },
          { key: 'name:Whiting', perKg: 0.8 }
        ]
      });
      expect(res).to.have.status(200);
      const kept = [
        { key: '6fd1f9f8c006e8f7e23d9126', perKg: 2.5 },
        { key: 'name:Whiting', perKg: 0.8 }
      ];
      expect(res.body).to.eql({ prices: kept });
      expect((await get(token)).body).to.eql({ prices: kept });
      expect((await put(token, { prices: [] })).body).to.eql({ prices: [] });
      expect((await get(token)).body).to.eql({ prices: [] });
    });

    it('changes prices by key, leaving the others, so a stale list never overwrites', async () => {
      const patch = (body: object) =>
        api()
          .patch('/prices')
          .set('Authorization', 'Bearer ' + token)
          .send(body);
      // Another device added Feldspar meanwhile; this one sets Silica and clears Whiting.
      await put(token, {
        prices: [
          { key: 'name:Silica', perKg: 1 },
          { key: 'name:Whiting', perKg: 2 },
          { key: 'name:Feldspar', perKg: 3 }
        ]
      });
      const res = await patch({ set: [{ key: 'name:Silica', perKg: 1.5 }], remove: ['name:Whiting'] });
      expect(res).to.have.status(200);
      const kept = [
        { key: 'name:Feldspar', perKg: 3 },
        { key: 'name:Silica', perKg: 1.5 }
      ];
      expect(res.body).to.eql({ prices: kept, currency: '' });
      expect((await get(token)).body).to.eql({ prices: kept });
      // The currency shown with the first price becomes the account's, once.
      expect(res.body.currency).to.equal('');
      const first = await patch({ set: [{ key: 'name:Silica', perKg: 2 }], currency: 'SEK' });
      expect(first.body.currency).to.equal('SEK');
      const later = await patch({ set: [{ key: 'name:Silica', perKg: 3 }], currency: 'EUR' });
      expect(later.body.currency).to.equal('SEK');
      expect(await patch({ currency: 'XXX' })).to.have.status(400);
      expect(await patch({ set: [{ key: 'name:Silica', perKg: -1 }] })).to.have.status(400);
      expect(await patch({ remove: [3] })).to.have.status(400);
      expect(await api().patch('/prices').send({ remove: [] })).to.have.status(401);
      await put(token, { prices: [] });
    });

    it('refuses what is not a list of prices of 0 or more, or too long a one', async () => {
      for (const body of [
        {},
        { prices: 'cheap' },
        { prices: [{ key: 'name:Silica' }] },
        { prices: [{ key: 'name:Silica', perKg: -1 }] },
        { prices: [{ key: 'name:Silica', perKg: '2' }] },
        { prices: [{ key: '', perKg: 2 }] },
        { prices: [{ key: 'x'.repeat(201), perKg: 2 }] },
        { prices: [null] }
      ]) {
        const res = await put(token, body);
        expect(res, JSON.stringify(body)).to.have.status(400);
        expect(res.body.msg).to.equal(
          'Prices are a list of up to 1000 materials, each with a price per kilogram of 0 or more.'
        );
      }
      const many = Array.from({ length: 1001 }, (_, i) => ({ key: 'name:M' + i, perKg: 1 }));
      expect(await put(token, { prices: many })).to.have.status(400);
      expect((await get(token)).body).to.eql({ prices: [] });
    });

    it('can be kept by a trial, need a sign-in, and are in one currency, chosen or the region’s', async () => {
      const trial = await api().post('/guest');
      const trialToken = sessionToken(trial) ?? '';
      expect(await put(trialToken, { prices: [{ key: 'name:Silica', perKg: 1 }] })).to.have.status(200);
      expect((await get(trialToken)).body).to.eql({ prices: [{ key: 'name:Silica', perKg: 1 }] });
      expect(await api().get('/prices')).to.have.status(401);
      expect(await api().put('/prices').send({ prices: [] })).to.have.status(401);
      const currency = (value: string) =>
        api()
          .put('/preferences')
          .set('Authorization', 'Bearer ' + trialToken)
          .send({ currency: value });
      expect((await currency('SEK')).body).to.include({ currency: 'SEK' });
      expect((await currency('')).body).to.include({ currency: '' });
      const refused = await currency('XYZ');
      expect(refused).to.have.status(400);
      expect(refused.body.msg).to.equal('Choose one of the currencies in the list, or leave it to your region.');
    });
  });

  describe('your own account', () => {
    it('does not change your email here, even with your password', async () => {
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ email: uniqueEmail('changed'), password: 'password123', displayname: 'Same' });
      // The other setting goes through; the email waits for its link (email_routes_tests.ts).
      expect(res).to.have.status(200);
      const stored = (await User.findById(user._id))!;
      expect(stored.email).to.eql(user.email);
      expect(stored.displayname).to.eql('Same');
    });

    it('deletes your account when you give your password', async () => {
      const res = await api()
        .delete('/deleteuser/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ password: 'password123' });
      expect(res).to.have.status(200);
      expect(res.body.msg).to.eql('User deleted');
      expect(await User.findById(user._id)).to.eql(null);
    });

    it('ignores role and password in settings changes', async () => {
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ role: 'admin', password: 'plaintext', displayname: 'Victim' });
      expect(res).to.have.status(200);
      const stored = (await User.findById(user._id))!;
      expect(stored.role).to.eql(undefined);
      expect(stored.displayname).to.eql('Victim');
      expect(stored.comparePassword('password123')).to.eql(true);
    });

    it('does not take an email already in use, whatever its case', async () => {
      const other = await makeUser();
      const res = await api()
        .post('/email/change')
        .set('Authorization', 'Bearer ' + token)
        .send({ email: other.email.toUpperCase(), password: 'password123' });
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('That email is already in use');
      expect((await User.findById(user._id))!.email).to.eql(user.email);
    });

    it('does not sign up a second account with the same email', async () => {
      const res = await api().post('/signup').send({ email: user.email, password: 'password123' });
      expect(res).to.have.status(400);
      expect(res.body).to.eql({
        code: 'account-exists',
        msg: 'An account with that email already exists.',
        field: 'email'
      });
    });
  });

  describe('other accounts', () => {
    let attackerToken: string;

    beforeEach(async () => {
      ({ token: attackerToken } = await makeUser());
    });

    it('does not let a user change another account', async () => {
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + attackerToken)
        .send({ email: uniqueEmail('stolen') });
      expect(res).to.have.status(403);
      expect(res.body.msg).to.eql('Not allowed to change another user');
      expect((await User.findById(user._id))!.email).to.eql(user.email);
    });

    it('does not let a user delete another account', async () => {
      const res = await api()
        .delete('/deleteuser/' + user._id)
        .set('Authorization', 'Bearer ' + attackerToken);
      expect(res).to.have.status(403);
      expect(res.body.msg).to.eql('Not allowed to change another user');
      expect(await User.findById(user._id)).to.not.eql(null);
    });
  });
});
