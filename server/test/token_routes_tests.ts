// The account page's personal access tokens (docs/integrations-plan.md, items
// 26 to 28): made with the password (and a factor with two-step sign-in on),
// shown once, listed, revoked; never by a trial or by a token; an email when
// one is made and 7 days before one expires.
import { expect } from 'chai';
import { sendTokenReminders } from '../lib/token_reminders.ts';
import * as accountMail from '../lib/account_mail.ts';
import * as totp from '../lib/totp.ts';
import { hashToken, kindOf } from '../lib/token_auth.ts';
import AccessToken, { MAX_PATS, REMINDER_DAYS_BEFORE } from '../models/access_token.ts';
import User from '../models/user.ts';
import { api, makeUser, sessionToken } from './support/app.ts';
import * as mail from './support/mail.ts';
import { makeToken } from './support/tokens.ts';

const DAY = 24 * 60 * 60 * 1000;
const bearer = (token: string) => 'Bearer ' + token;
const make = (session: string, body: object) => api().post('/tokens').set('Authorization', bearer(session)).send(body);

describe('access tokens: the account page', () => {
  it('makes a read-only token with the password, shows it once, and lists it without it', async () => {
    const { user, token: session, password, email } = await makeUser();
    const res = await make(session, { name: 'Claude Code', days: 90, password });
    expect(res, JSON.stringify(res.body)).to.have.status(201);
    expect(res.body.code).to.equal('token-made');
    expect(kindOf(res.body.token)).to.equal('pat');
    expect(res.body.row).to.include({ name: 'Claude Code', hint: res.body.token.slice(-4), working: true });
    expect(res.body.row.scopes).to.eql(['data:read']);
    const life = new Date(res.body.row.expiresAt).getTime() - new Date(res.body.row.createdAt).getTime();
    expect(life).to.equal(90 * DAY);

    // Stored as its hash only.
    const stored = await AccessToken.findOne({ userId: user._id }).lean();
    expect(stored!.hash).to.equal(hashToken(res.body.token));
    expect(JSON.stringify(stored)).not.to.include(res.body.token);

    const list = await api().get('/tokens').set('Authorization', bearer(session));
    expect(list).to.have.status(200);
    expect(list.body).to.include({ defaultDays: 30, most: MAX_PATS });
    expect(list.body.expiryDays).to.eql([7, 30, 90, 365]);
    expect(list.body.scopes).to.eql(['data:read']);
    expect(list.body.tokens).to.have.length(1);
    expect(JSON.stringify(list.body)).not.to.include(res.body.token);
    expect(list.body.tokens[0]).not.to.have.property('hash');

    // It works on the records, and a notice went to the owner.
    expect(await api().get('/recipe/getAll').set('Authorization', bearer(res.body.token))).to.have.status(200);
    const sent = await mail.waitFor(email, 1);
    expect(sent[0]!.subject).to.equal(accountMail.TOKEN_MADE['en']!.subject);
    expect(sent[0]!.text).to.include('"Claude Code"');
    expect(sent[0]!.text).not.to.include(res.body.token);
  });

  it('takes 30 days and data:read when not told, and refuses other lifetimes, write scopes and bad names', async () => {
    const { token: session, password } = await makeUser();
    const made = await make(session, { name: 'Script', password });
    expect(made).to.have.status(201);
    const life = new Date(made.body.row.expiresAt).getTime() - new Date(made.body.row.createdAt).getTime();
    expect(life).to.equal(30 * DAY);

    for (const days of [0, 1, 60, 366, 'never', null]) {
      const res = await make(session, { name: 'x', days, password });
      expect(res, String(days)).to.have.status(400);
      expect(res.body).to.include({ code: 'token-expiry-choices', field: 'days' });
    }
    // Writing comes with Phase 4.
    for (const scope of ['data:write', 'admin', ['data:read']]) {
      const res = await make(session, { name: 'x', scope, password });
      expect(res).to.have.status(400);
      expect(res.body).to.include({ code: 'token-scope-choices', field: 'scope' });
    }
    for (const name of ['', '   ', 'x'.repeat(101), 12, undefined]) {
      const res = await make(session, { name, password });
      expect(res).to.have.status(400);
      expect(res.body).to.include({ code: 'token-name', field: 'name' });
    }
    // A name is kept to one line.
    const lined = await make(session, { name: 'my\nlaptop​', password });
    expect(lined.body.row.name).to.equal('my laptop');
  });

  it('needs the right password, and with two-step sign-in on, a factor too', async () => {
    const { user, token: session, password } = await makeUser();
    const wrong = await make(session, { name: 'x', password: 'not-it' });
    expect(wrong).to.have.status(400);
    expect(wrong.body).to.include({ code: 'current-password-wrong', field: 'password' });
    expect(await make(session, { name: 'x' })).to.have.status(400);

    // Two-step sign-in with an authenticator app, set up through the routes.
    const started = await api().post('/mfa/totp/start').set('Authorization', bearer(session)).send({ password });
    const secret = totp.fromBase32(started.body.secret);
    const added = await api()
      .post('/mfa/totp')
      .set('Authorization', bearer(session))
      .send({ setupId: started.body.setupId, code: totp.codeAt(secret, totp.stepAt()) });
    expect(added).to.have.status(200);
    const fresh = sessionToken(added)!;
    const alone = await make(fresh, { name: 'x', password });
    expect(alone).to.have.status(400);
    expect(alone.body.code).to.equal('factor-needed');
    await User.updateOne({ _id: user._id }, { $set: { 'mfa.totp.lastStep': totp.stepAt() - 2 } });
    const res = await make(fresh, { name: 'x', password, code: totp.codeAt(secret, totp.stepAt()) });
    expect(res, JSON.stringify(res.body)).to.have.status(201);
    expect(await AccessToken.countDocuments({ userId: user._id })).to.equal(1);
  });

  it('is refused until the account’s email is confirmed, before the password is checked', async () => {
    const { user, token: session, password } = await makeUser();
    await User.updateOne({ _id: user._id }, { $set: { emailUnverified: true } });
    for (const body of [
      { name: 'Claude Code', password },
      { name: 'Claude Code', password: 'not-the-password' }
    ]) {
      const res = await make(session, body);
      expect(res).to.have.status(403);
      expect(res.body.code).to.equal('token-needs-confirmed-email');
    }
    expect(await AccessToken.countDocuments({ userId: user._id })).to.equal(0);
    // Listing still works, and once confirmed, making one does.
    expect(await api().get('/tokens').set('Authorization', bearer(session))).to.have.status(200);
    await User.updateOne({ _id: user._id }, { $unset: { emailUnverified: 1 } });
    expect(await make(session, { name: 'Claude Code', password })).to.have.status(201);
  });

  it('is refused to a trial, and to a token', async () => {
    const trial = await api().post('/guest').send({});
    const trialSession = sessionToken(trial)!;
    for (const request of [api().get('/tokens'), api().post('/tokens').send({ name: 'x' }), api().delete('/tokens')]) {
      const res = await request.set('Authorization', bearer(trialSession));
      expect(res).to.have.status(403);
      expect(res.body.code).to.equal('account-needed');
    }

    const { user, password } = await makeUser();
    const token = await makeToken(user, { scopes: ['data:write'] });
    for (const request of [
      api().get('/tokens'),
      api().post('/tokens').send({ name: 'x', password }),
      api().delete('/tokens'),
      api().delete('/tokens/' + String(user._id))
    ]) {
      const res = await request.set('Authorization', bearer(token));
      expect(res).to.have.status(403);
      expect(res.body.code).to.equal('token-not-here');
    }
    expect(await AccessToken.countDocuments({ userId: user._id })).to.equal(1);
  });

  it(`allows at most ${MAX_PATS} working tokens at once`, async () => {
    const { user, token: session, password } = await makeUser();
    for (let i = 0; i < MAX_PATS - 1; i++) await makeToken(user);
    // Expired and revoked ones do not count.
    await makeToken(user, { expiresAt: new Date(Date.now() - DAY) });
    await makeToken(user, { revokedAt: new Date() });
    expect(await make(session, { name: 'last', password })).to.have.status(201);
    const over = await make(session, { name: 'one more', password });
    expect(over).to.have.status(409);
    expect(over.body).to.include({ code: 'token-limit' });
    expect(over.body.params).to.eql({ most: MAX_PATS });
  });

  it('revokes one, only the account’s own, and then all', async () => {
    const { user, token: session } = await makeUser();
    const other = await makeUser();
    const mine = await makeToken(user);
    const second = await makeToken(user);
    const theirs = await makeToken(other.user);
    const rowOf = async (token: string) => (await AccessToken.findOne({ hash: hashToken(token) }))!;

    const notMine = await api()
      .delete('/tokens/' + String((await rowOf(theirs))._id))
      .set('Authorization', bearer(session));
    expect(notMine).to.have.status(404);
    expect(await api().get('/recipe/getAll').set('Authorization', bearer(theirs))).to.have.status(200);
    expect(await api().delete('/tokens/not-an-id').set('Authorization', bearer(session))).to.have.status(400);

    const one = await api()
      .delete('/tokens/' + String((await rowOf(mine))._id))
      .set('Authorization', bearer(session));
    expect(one).to.have.status(200);
    expect(one.body.code).to.equal('token-revoked');
    expect(await api().get('/recipe/getAll').set('Authorization', bearer(mine))).to.have.status(401);
    expect((await rowOf(mine)).revokedWhy).to.equal('person');
    expect(await api().get('/recipe/getAll').set('Authorization', bearer(second))).to.have.status(200);

    const list = await api().get('/tokens').set('Authorization', bearer(session));
    expect(list.body.tokens.map((t: { working: boolean }) => t.working).sort()).to.eql([false, true]);

    const all = await api().delete('/tokens').set('Authorization', bearer(session));
    expect(all).to.have.status(200);
    expect(all.body).to.include({ code: 'tokens-revoked' });
    expect(all.body.params).to.eql({ count: 1 });
    expect(await api().get('/recipe/getAll').set('Authorization', bearer(second))).to.have.status(401);
    expect(await api().get('/recipe/getAll').set('Authorization', bearer(theirs))).to.have.status(200);
  });

  it('says how many tokens still work after an ordinary password change', async () => {
    const { user, token: session, password } = await makeUser();
    await makeToken(user);
    await makeToken(user, { revokedAt: new Date() });
    const changed = await api()
      .put('/password')
      .set('Authorization', bearer(session))
      .send({ current: password, password: 'another-password' });
    expect(changed).to.have.status(200);
    expect(changed.body).to.include({ code: 'password-changed', tokens: 1 });
  });
});

describe('access tokens: the expiry reminder', () => {
  const tokenFor = async (
    user: Awaited<ReturnType<typeof makeUser>>['user'],
    { lifeDays, leftDays, name = 'Laptop' }: { lifeDays: number; leftDays: number; name?: string }
  ) => {
    const token = await makeToken(user, { expiresAt: new Date(Date.now() + leftDays * DAY) });
    await AccessToken.updateOne(
      { hash: hashToken(token) },
      { $set: { name, createdAt: new Date(Date.now() - (lifeDays - leftDays) * DAY) } }
    );
    return token;
  };

  it(`emails once, ${REMINDER_DAYS_BEFORE} days before a token expires`, async () => {
    const { user, email } = await makeUser();
    const due = await tokenFor(user, { lifeDays: 30, leftDays: 5, name: 'Cursor' });
    // Not yet due, a 7-day token, a revoked one and an expired one get none.
    await tokenFor(user, { lifeDays: 30, leftDays: 20 });
    await tokenFor(user, { lifeDays: 7, leftDays: 3 });
    const revoked = await tokenFor(user, { lifeDays: 30, leftDays: 2 });
    await AccessToken.updateOne({ hash: hashToken(revoked) }, { $set: { revokedAt: new Date() } });
    await makeToken(user, { expiresAt: new Date(Date.now() - DAY) });

    await sendTokenReminders();
    const sent = await mail.waitFor(email, 1);
    expect(sent).to.have.length(1);
    expect(sent[0]!.subject).to.equal(accountMail.TOKEN_EXPIRING['en']!.subject);
    expect(sent[0]!.text).to.include('"Cursor"').and.include('https://glazecalc.test/account');
    expect((await AccessToken.findOne({ hash: hashToken(due) }))!.remindedAt).to.be.an.instanceOf(Date);

    // Once only, however often it runs.
    await sendTokenReminders();
    await sendTokenReminders();
    await mail.settle();
    expect(mail.to(email)).to.have.length(1);
  });

  it('writes to no trial and no address nobody has confirmed, in the account’s language otherwise', async () => {
    const unconfirmed = await makeUser();
    await User.updateOne({ _id: unconfirmed.user._id }, { $set: { emailUnverified: true } });
    await tokenFor(unconfirmed.user, { lifeDays: 90, leftDays: 1 });
    const german = await makeUser();
    await User.updateOne({ _id: german.user._id }, { $set: { 'preferences.language': 'de' } });
    await tokenFor(german.user, { lifeDays: 90, leftDays: 1 });
    await sendTokenReminders();
    const sent = await mail.waitFor(german.email, 1);
    // English until the translation wave, with the German page.
    expect(sent[0]!.subject).to.equal(accountMail.TOKEN_EXPIRING['en']!.subject);
    expect(sent[0]!.text).to.include('https://glazecalc.test/de/account');
    await mail.settle();
    expect(mail.to(unconfirmed.email)).to.have.length(0);
  });
});

describe('access tokens: the emails', () => {
  it('give the values and signature of the others', async () => {
    const values = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
    expect(values(accountMail.TOKEN_MADE['en']!.text)).to.eql(['account', 'app', 'date', 'forgot', 'name', 'page']);
    expect(values(accountMail.TOKEN_EXPIRING['en']!.text)).to.eql(['account', 'app', 'date', 'name', 'page']);
    for (const emails of [accountMail.TOKEN_MADE, accountMail.TOKEN_EXPIRING]) {
      expect(emails['en']!.text).to.match(/\n-- \nGlazecalc, \{app\}\n$/);
      expect(emails['en']!.subject).to.include('Glazecalc');
    }
    expect(accountMail.tokenNameForMail('a\nb‮c')).to.equal('a b c');
  });

  it('are translated from the English as it is', async () => {
    // English only so far: the next wave adds the others, then fingerprints them here.
    const { fingerprint } = await import('../../scripts/i18n-fingerprints.mjs');
    const english = [accountMail.TOKEN_MADE['en'], accountMail.TOKEN_EXPIRING['en']];
    expect(fingerprint(JSON.stringify(english))).to.equal('60a4q9');
  });
});
