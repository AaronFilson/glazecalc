import * as mfaKey from '../lib/mfa_key.ts';
import * as recoveryCodes from '../lib/recovery_codes.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import PasswordReset from '../models/password_reset.ts';
import Recipe from '../models/recipe.ts';
import User from '../models/user.ts';
import { api, expect, makeUser, sessionToken } from './support/app.ts';

type TestUser = Awaited<ReturnType<typeof makeUser>>;

const get = (path: string, token: string) =>
  api()
    .get(path)
    .set('Authorization', 'Bearer ' + token);
const text = (res: { text: string }) => res.text;

describe('export API', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeEach(async () => {
    [alice, bob] = await Promise.all([makeUser(), makeUser()]);
    await User.updateOne(
      { _id: alice.user._id },
      {
        displayname: 'Alice',
        preferences: { theme: 'dark', region: 'DE', currency: 'EUR' },
        shelf: ['name:Whiting'],
        prices: [{ key: 'name:Whiting', perKg: 0.75 }]
      }
    );
    await Recipe.create({
      title: 'Clear, "gloss"',
      ownedBy: String(alice.user._id),
      date: '2026-01-02',
      sgTarget: 1.45,
      notes: ['fires clear'],
      materials: [{ name: 'Whiting', amount: '20' }],
      additives: [{ name: 'Tin oxide', amount: '2', unit: 'percent' }]
    });
    await Recipe.create({ title: 'Bob only', ownedBy: String(bob.user._id), materials: [{ name: 'Talc' }] });
    await Note.create({
      content: 'Bob note',
      ownedBy: String(bob.user._id),
      relatedCollection: 'Notes',
      relatedId: 'x'
    });
    await Material.create({
      name: '=cmd()',
      ownedBy: String(alice.user._id),
      rawformula: 'CaCO3',
      fields: [{ name: 'CaO', amount: '1' }],
      equivalent: 100,
      formulaweight: 56,
      loi: 44,
      molecularweight: 100,
      percentmole: 'molecular'
    });
    await PasswordReset.create({
      userId: alice.user._id,
      tokenHash: 'secret-token-' + String(alice.user._id),
      expiresAt: new Date(Date.now() + 1e6)
    });
  });

  it('needs a sign-in', async () => {
    for (const path of ['/export', '/export/recipes.csv', '/export/materials.csv']) {
      expect(await api().get(path)).to.have.status(401);
    }
  });

  it('is a download that no cache keeps', async () => {
    const res = await get('/export', alice.token);
    expect(res).to.have.status(200);
    expect(res.headers['cache-control']).to.eql('no-store');
    expect(res.headers['content-disposition']).to.match(
      /^attachment; filename="glazecalc-data-\d{4}-\d\d-\d\d\.json"$/
    );
    expect(res.headers['content-type']).to.match(/^application\/json/);
  });

  it('holds the account, preferences, shelf, prices and every kind of record', async () => {
    const { body } = await get('/export', alice.token);
    expect(body.format).to.eql('glazecalc-export');
    expect(body.version).to.eql(1);
    expect(body.account).to.include({ id: String(alice.user._id), email: alice.email, displayname: 'Alice' });
    expect(body.preferences).to.include({ theme: 'dark', region: 'DE' });
    expect(body.shelf).to.eql(['name:Whiting']);
    expect(body.prices).to.eql([{ key: 'name:Whiting', perKg: 0.75 }]);
    expect(body.preferences).to.include({ currency: 'EUR' });
    expect(body.records).to.have.all.keys('additives', 'advice', 'firing', 'materials', 'notes', 'recipes', 'trash');
    expect(body.records.recipes).to.have.length(1);
    expect(body.records.recipes[0]).to.include({ title: 'Clear, "gloss"', sgTarget: 1.45 });
    expect(body.records.materials[0]).to.include({ name: '=cmd()' });
    expect(body.records.notes).to.eql([]);
  });

  it('leaves out the password hash, token version, reset links and database bookkeeping', async () => {
    const raw = text(await get('/export', alice.token));
    const stored = await User.findById(alice.user._id);
    expect(raw).to.not.include(stored!.password);
    expect(raw).to.not.include('secret-token');
    expect(raw).to.not.match(/tokenVersion|"password"|"__v"|ownedBy|trialCounts/);
  });

  it("never holds another user's data", async () => {
    const raw = text(await get('/export', alice.token));
    expect(raw).to.not.include('Bob');
    // Bob's prices are his alone.
    expect((await get('/export', bob.token)).body.prices).to.eql([]);
    expect(raw).to.not.include('Talc');
    expect(raw).to.not.include(bob.email);
    expect(raw).to.not.include(String(bob.user._id));
    const other = await get('/export', bob.token);
    expect(other.body.records.recipes.map((r: { title: string }) => r.title)).to.eql(['Bob only']);
    expect(other.body.records.materials).to.eql([]);
  });

  it('gives defaults for a new account', async () => {
    const { body } = await get('/export', bob.token);
    expect(body.preferences).to.eql({});
    expect(body.shelf).to.eql([]);
    expect(body.prices).to.eql([]);
    expect(body.signIn).to.eql({ authenticatorApp: null, passkeys: [], recoveryCodes: { left: 0 } });
  });

  it('says how the account signs in, in names and dates, never a secret, key, id or hash', async () => {
    const added = new Date('2026-10-01T10:00:00Z');
    const used = new Date('2026-10-02T11:00:00Z');
    const made = recoveryCodes.make();
    made.stored[0]!.usedAt = used;
    const secret = mfaKey.encrypt('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', String(alice.user._id));
    await User.updateOne(
      { _id: alice.user._id },
      {
        $set: {
          mfa: {
            handle: 'aGFuZGxlLW9mLWFsaWNlLTE',
            totp: { secret, lastStep: 123, addedAt: added, lastUsedAt: used },
            passkeys: [
              {
                credentialId: 'Y3JlZGVudGlhbC1pZC1vZi1hbGljZQ',
                publicKey: Buffer.from('public-key-of-alice'),
                counter: 7,
                transports: ['internal'],
                deviceType: 'multiDevice',
                backedUp: true,
                name: 'Studio laptop',
                addedAt: added
              }
            ],
            recoveryCodes: made.stored,
            recoveryMadeAt: added
          }
        }
      }
    );
    const res = await get('/export', alice.token);
    expect(res.body.signIn).to.eql({
      authenticatorApp: { addedAt: added.toISOString(), lastUsedAt: used.toISOString() },
      passkeys: [{ name: 'Studio laptop', addedAt: added.toISOString() }],
      recoveryCodes: { madeAt: added.toISOString(), left: 9 }
    });
    const raw = text(res);
    for (const hidden of [
      secret,
      'JBSWY3DP',
      'aGFuZGxlLW9mLWFsaWNlLTE',
      'Y3JlZGVudGlhbC1pZC1vZi1hbGljZQ',
      Buffer.from('public-key-of-alice').toString('base64'),
      made.stored[1]!.hash
    ]) {
      expect(raw).to.not.include(hidden);
    }
    expect(raw).to.not.match(/"(secret|publicKey|credentialId|handle|hash|lastStep|counter)"/);
  });

  it('writes recipes as CSV, a row for each ingredient', async () => {
    const res = await get('/export/recipes.csv', alice.token);
    expect(res).to.have.status(200);
    expect(res.headers['content-type']).to.match(/^text\/csv/);
    expect(res.headers['content-disposition']).to.match(/^attachment; filename="glazecalc-recipes-/);
    expect(res.headers['cache-control']).to.eql('no-store');
    const lines = text(res).replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).to.eql('Recipe,Date,Notes,Type,Ingredient,Amount,Unit of additive');
    expect(lines.slice(1)).to.eql([
      '"Clear, ""gloss""",2026-01-02,fires clear,Material,Whiting,20,',
      '"Clear, ""gloss""",2026-01-02,fires clear,Additive,Tin oxide,2,percent'
    ]);
  });

  it('writes materials as CSV, keeping formulas from running in a spreadsheet', async () => {
    const res = await get('/export/materials.csv', alice.token);
    const lines = text(res).replace('﻿', '').trim().split('\r\n');
    expect(lines).to.have.length(2);
    expect(lines[1]).to.eql("'=cmd(),CaCO3,,,CaO 1,molecular,44,100,100,56");
    expect(text(await get('/export/materials.csv', bob.token))).to.not.include('cmd');
  });

  it('lets a trial export too, with the trial in place of an address', async () => {
    const started = await api().post('/guest');
    const token = sessionToken(started)!;
    await api()
      .post('/notes/create')
      .set('Authorization', 'Bearer ' + token)
      .send({ content: 'Trial note', relatedCollection: 'Notes', relatedId: 'general notes' });
    const res = await get('/export', token);
    expect(res).to.have.status(200);
    expect(res.body.account.trial).to.eql(true);
    expect(res.body.account).to.not.have.property('email');
    expect(res.body.records.notes).to.have.length(1);
    expect(text(res)).to.not.include('guest.invalid');
  });
});
