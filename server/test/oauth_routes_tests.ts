// Signing in with Google and GitHub (server/routes/oauth_routes.ts), against
// the fake provider (support/fake_provider.ts): the flow and its checks, the
// linking rules (pre-hijacking above all), two-step sign-in after a provider,
// unconfirmed emails, linking and unlinking on the account page, and the
// account's data.
import { exportAccount } from '../lib/export_data.ts';
import * as oauth from '../lib/oauth.ts';
import * as totp from '../lib/totp.ts';
import OAuthLogin from '../models/oauth_login.ts';
import Recipe from '../models/recipe.ts';
import User from '../models/user.ts';
import { api, expect, makeUser, sessionToken, uniqueEmail } from './support/app.ts';
import { FAKE_SETTINGS, FakeProvider, type FakeIdentity, type FakeProviderId } from './support/fake_provider.ts';
import * as mail from './support/mail.ts';

type Res = Awaited<ReturnType<ReturnType<typeof api>['get']>>;

const fake = new FakeProvider();
let subjects = 0;
const subject = (): string => String(9000000 + subjects++);

/** The provider cookie's value a response set, or null. */
const oauthCookie = (res: Res): string | null => {
  for (const cookie of ([] as unknown[]).concat(res.headers['set-cookie'] ?? [])) {
    const match = /^glazecalc_oauth=([^;]*)/.exec(String(cookie));
    if (match) return match[1] || null;
  }
  return null;
};

interface Flow {
  location: string;
  cookie: string;
}

const bearer = (token: string) => ({ Authorization: 'Bearer ' + token });

/** Presses a provider button: GET start, which sends the browser to the provider. */
const start = async (
  provider: FakeProviderId,
  query: Record<string, string> = {},
  token?: string
): Promise<Flow & { res: Res }> => {
  const req = api()
    .get('/auth/' + provider + '/start')
    .query(query)
    .redirects(0);
  const res = await (token ? req.set(bearer(token)) : req);
  expect(res, JSON.stringify(res.body)).to.have.status(303);
  return { res, location: res.headers.location as string, cookie: oauthCookie(res)! };
};

/** The provider sends the browser back with a code for this person. */
const callback = (provider: FakeProviderId, flow: Flow, identity: FakeIdentity, cookie = flow.cookie) => {
  const { code, state } = fake.issue(provider, flow.location, identity);
  return api()
    .get('/auth/' + provider + '/callback')
    .query({ code, state })
    .set('Cookie', 'glazecalc_oauth=' + cookie)
    .redirects(0);
};

/** The page finishes the sign-in, with this browser's cookie and, when signed in, its session. */
const finish = (cookie: string | null, token?: string) => {
  const req = api()
    .post('/auth/finish')
    .set('Cookie', 'glazecalc_oauth=' + (cookie ?? ''));
  return token ? req.set(bearer(token)) : req;
};

/** The whole provider sign-in: start, the provider, the callback, finish. */
const signInWith = async (provider: FakeProviderId, identity: FakeIdentity, options: { token?: string } = {}) => {
  const flow = await start(provider);
  const back = await callback(provider, flow, identity);
  expect(back).to.have.status(303);
  return { flow, back, done: await finish(flow.cookie, options.token) };
};

describe('signing in with Google and GitHub', () => {
  before(async () => {
    await fake.start();
    Object.assign(process.env, FAKE_SETTINGS, { OAUTH_TEST_BASE: fake.base });
  });

  after(async () => {
    for (const name of [...Object.keys(FAKE_SETTINGS), 'OAUTH_TEST_BASE']) delete process.env[name];
    oauth.forgetKeys();
    await fake.stop();
  });

  describe('which providers are on', () => {
    it('lists only those with a client id and secret, and refuses the others', async () => {
      expect((await api().get('/auth/providers')).body.providers).to.eql(['google', 'github']);
      const secret = process.env.GITHUB_CLIENT_SECRET;
      delete process.env.GITHUB_CLIENT_SECRET;
      try {
        expect((await api().get('/auth/providers')).body.providers).to.eql(['google']);
        const res = await api().get('/auth/github/start').redirects(0);
        expect(res).to.have.status(404);
        expect(res.body.code).to.eql('provider-off');
      } finally {
        process.env.GITHUB_CLIENT_SECRET = secret;
      }
      expect(await api().get('/auth/microsoft/start').redirects(0)).to.have.status(404);
    });
  });

  describe('the start', () => {
    it('sends the browser to Google with PKCE, a state and a nonce, and sets a short Lax cookie', async () => {
      const { res, location, cookie } = await start('google');
      const url = new URL(location);
      expect(url.origin + url.pathname).to.eql(fake.base + '/google/authorize');
      expect(url.searchParams.get('client_id')).to.eql('google-client');
      expect(url.searchParams.get('redirect_uri')).to.eql('https://glazecalc.test/api/auth/google/callback');
      expect(url.searchParams.get('response_type')).to.eql('code');
      expect(url.searchParams.get('scope')).to.eql('openid email');
      expect(url.searchParams.get('code_challenge_method')).to.eql('S256');
      expect(url.searchParams.get('code_challenge')).to.match(/^[A-Za-z0-9_-]{43}$/);
      expect(url.searchParams.get('state')).to.match(/^[A-Za-z0-9_-]{43}$/);
      expect(url.searchParams.get('nonce')).to.match(/^[A-Za-z0-9_-]{43}$/);
      const set = String(([] as unknown[]).concat(res.headers['set-cookie'])[0]);
      expect(set).to.include('HttpOnly').and.include('SameSite=Lax').and.include('Path=/api/auth');
      expect(set).to.match(/Max-Age=600/);
      // Only a hash of the cookie is stored.
      expect(await OAuthLogin.exists({ keyHash: oauth.sha256(cookie) })).to.not.eql(null);
      expect(await OAuthLogin.exists({ keyHash: cookie })).to.eql(null);
    });

    it('asks GitHub for the email permission, with PKCE and a state', async () => {
      const url = new URL((await start('github')).location);
      expect(url.searchParams.get('scope')).to.eql('user:email');
      expect(url.searchParams.get('code_challenge_method')).to.eql('S256');
      expect(url.searchParams.get('redirect_uri')).to.eql('https://glazecalc.test/api/auth/github/callback');
      expect(url.searchParams.get('nonce')).to.eql(null);
    });

    it('comes back to a page of the app in its language, never to another site', async () => {
      const cases: Array<[string, string]> = [
        ['/de/recipe', '/de/signin?provider=google'],
        ['//evil.example/recipe', '/signin?provider=google'],
        ['https://evil.example/', '/signin?provider=google'],
        ['/\\evil.example', '/signin?provider=google'],
        ['/fr/signin', '/fr/signin?provider=google']
      ];
      for (const [next, page] of cases) {
        const flow = await start('google', { next });
        const back = await callback('google', flow, { sub: subject(), email: uniqueEmail('g'), emailVerified: true });
        expect(back.headers.location, next).to.eql(page);
      }
      const flow = await start('google', { next: '/de/recipe' });
      await callback('google', flow, { sub: subject(), email: uniqueEmail('g'), emailVerified: true });
      expect((await finish(flow.cookie)).body.next).to.eql('/recipe');
      const home = await start('google', { next: '/fr/signin' });
      await callback('google', home, { sub: subject(), email: uniqueEmail('g'), emailVerified: true });
      expect((await finish(home.cookie)).body.next).to.eql('/home');
    });
  });

  describe('a new account', () => {
    it('is made from a verified Google email, signed in, with no password anyone knows', async () => {
      const address = uniqueEmail('google');
      const sub = subject();
      const { back, done } = await signInWith('google', { sub, email: address, emailVerified: true });
      expect(back.headers.location).to.eql('/signin?provider=google');
      expect(done, JSON.stringify(done.body)).to.have.status(200);
      expect(done.body.code).to.eql('signed-in');
      expect(done.body.email).to.eql(address);
      expect(sessionToken(done)).to.be.a('string');
      const user = (await User.findOne({ email: address }).lean())!;
      expect(user.passwordless).to.eql(true);
      expect(user.emailUnverified).to.eql(undefined);
      expect(user.identities!.map(({ provider, subject: s, uid }) => ({ provider, s, uid }))).to.eql([
        { provider: 'google', s: sub, uid: 'google:' + sub }
      ]);
      // Signing in with a password does not work: nobody knows it.
      const auth = 'Basic ' + Buffer.from(address + ':password123').toString('base64');
      expect(await api().get('/signin').set('Authorization', auth)).to.have.status(401);
    });

    it('finds the account again by the provider subject, whatever the email says now', async () => {
      const sub = subject();
      const address = uniqueEmail('again');
      await signInWith('google', { sub, email: address, emailVerified: true });
      const { done } = await signInWith('google', { sub, email: uniqueEmail('changed'), emailVerified: true });
      expect(done.body.email).to.eql(address);
      expect(await User.countDocuments({ 'identities.uid': 'google:' + sub })).to.eql(1);
      const identity = (await User.findOne({ email: address }).lean())!.identities![0]!;
      expect(identity.lastUsedAt).to.be.instanceOf(Date);
    });

    it('is made from GitHub with the primary email only when GitHub has verified it', async () => {
      const address = uniqueEmail('github');
      const { done } = await signInWith('github', { sub: subject(), email: address, emailVerified: true });
      expect(done.body.email).to.eql(address);

      const unverified = uniqueEmail('unverified');
      const refused = await signInWith('github', { sub: subject(), email: unverified, emailVerified: false });
      expect(refused.done).to.have.status(400);
      expect(refused.done.body.code).to.eql('provider-email-unverified');
      expect(sessionToken(refused.done)).to.eql(null);
      expect(await User.exists({ email: unverified })).to.eql(null);
      // The verified address that is not the primary one is not used either.
      expect(await User.exists({ email: /^other-/ })).to.eql(null);
    });

    it('is not made from a Google account whose email is not verified, or that has none', async () => {
      const address = uniqueEmail('nope');
      const one = await signInWith('google', { sub: subject(), email: address, emailVerified: false });
      expect(one.done.body.code).to.eql('provider-email-unverified');
      const two = await signInWith('google', { sub: subject(), email: null });
      expect(two.done.body.code).to.eql('provider-email-unverified');
      expect(await User.exists({ email: address })).to.eql(null);
    });

    it('brings a trial on this browser along, as signing in with a password does', async () => {
      const trial = await api().post('/guest');
      const trialToken = sessionToken(trial)!;
      expect(
        await api()
          .post('/recipe/create')
          .set(bearer(trialToken))
          .send({ title: 'Trial celadon', materials: [{ name: 'Silica', amount: '30' }] })
      ).to.have.status(200);
      const flow = await start('google', {}, trialToken);
      await callback('google', flow, { sub: subject(), email: uniqueEmail('trial'), emailVerified: true });
      const done = await finish(flow.cookie);
      expect(done.body.kept).to.eql(1);
      const user = (await User.findOne({ email: done.body.email }))!;
      expect(await Recipe.countDocuments({ ownedBy: String(user._id), title: 'Trial celadon' })).to.eql(1);
    });
  });

  describe('the checks on the way back', () => {
    it('finds nothing without the cookie, with another state, or a second time', async () => {
      const flow = await start('google');
      const identity = { sub: subject(), email: uniqueEmail('csrf'), emailVerified: true };
      const { code } = fake.issue('google', flow.location, identity);
      // Another site sends the browser here with its own state, or the cookie is missing.
      const wrongState = await api()
        .get('/auth/google/callback')
        .query({ code, state: 'not-the-state' })
        .set('Cookie', 'glazecalc_oauth=' + flow.cookie)
        .redirects(0);
      expect(wrongState.headers.location).to.eql('/signin?provider=google');
      expect((await finish(flow.cookie)).body.code).to.eql('provider-expired');
      expect((await finish(null)).body.code).to.eql('provider-expired');

      const again = await start('google');
      const first = await callback('google', again, identity);
      expect(first).to.have.status(303);
      expect((await callback('google', again, identity)).headers.location).to.eql('/signin?provider=google');
      const done = await finish(again.cookie);
      expect(done.body.code).to.eql('signed-in');
      // Finished once only.
      expect((await finish(again.cookie)).body.code).to.eql('provider-expired');
    });

    it('refuses an expired sign-in', async () => {
      const flow = await start('google');
      await OAuthLogin.updateOne(
        { keyHash: oauth.sha256(flow.cookie) },
        { $set: { expiresAt: new Date(Date.now() - 1000) } }
      );
      await callback('google', flow, { sub: subject(), email: uniqueEmail('late'), emailVerified: true });
      expect((await finish(flow.cookie)).body.code).to.eql('provider-expired');
    });

    it('refuses an ID token with another nonce, audience or issuer, or expired', async () => {
      for (const tamper of [
        { nonce: 'another-nonce' },
        { aud: 'someone-else' },
        { iss: 'https://evil.example' },
        { exp: Math.floor(Date.now() / 1000) - 3600 }
      ]) {
        const address = uniqueEmail('tampered');
        fake.tamper = tamper;
        const { done } = await signInWith('google', { sub: subject(), email: address, emailVerified: true });
        expect(done.body.code, JSON.stringify(tamper)).to.eql('provider-failed');
        expect(await User.exists({ email: address })).to.eql(null);
      }
    });

    it('says the sign-in was cancelled when the person turned the provider down', async () => {
      const flow = await start('github');
      const state = new URL(flow.location).searchParams.get('state')!;
      const back = await api()
        .get('/auth/github/callback')
        .query({ error: 'access_denied', state })
        .set('Cookie', 'glazecalc_oauth=' + flow.cookie)
        .redirects(0);
      expect(back).to.have.status(303);
      const done = await finish(flow.cookie);
      expect(done.body.code).to.eql('provider-cancelled');
      expect(done.body.msg).to.eql('Signing in with GitHub was cancelled.');
    });

    it('sends the PKCE verifier, so a code without it is refused by the provider', async () => {
      const before = fake.tokenRequests.google;
      const flow = await start('google');
      const identity = { sub: subject(), email: uniqueEmail('pkce'), emailVerified: true };
      // A code issued for another challenge (another sign-in's): the verifier does not match.
      const other = await start('google');
      const { code } = fake.issue('google', other.location, identity);
      const state = new URL(flow.location).searchParams.get('state')!;
      await api()
        .get('/auth/google/callback')
        .query({ code, state })
        .set('Cookie', 'glazecalc_oauth=' + flow.cookie)
        .redirects(0);
      expect((await finish(flow.cookie)).body.code).to.eql('provider-failed');
      expect(fake.tokenRequests.google).to.eql(before);
    });
  });

  describe('an email an account already has (pre-hijacking)', () => {
    it('links nothing until the account is signed in to, then links it and says so', async () => {
      const { user, token, email } = await makeUser();
      const sub = subject();
      const flow = await start('google');
      await callback('google', flow, { sub, email, emailVerified: true });
      const waiting = await finish(flow.cookie);
      expect(waiting).to.have.status(409);
      expect(waiting.body.code).to.eql('provider-sign-in-to-link');
      expect(sessionToken(waiting)).to.eql(null);
      expect((await User.findById(user._id).lean())!.identities).to.eql(undefined);

      // The person signs in the usual way; the same browser then finishes the link.
      const linked = await finish(flow.cookie, token);
      expect(linked, JSON.stringify(linked.body)).to.have.status(200);
      expect(linked.body.code).to.eql('provider-linked');
      expect((await User.findById(user._id).lean())!.identities![0]!.uid).to.eql('google:' + sub);
      const [notice] = await mail.waitFor(email, 1);
      expect(notice!.subject).to.eql('A new way to sign in was added to your Glazecalc account');
      expect(notice!.text).to.include('with Google');

      // From now on Google signs in to it.
      const { done } = await signInWith('google', { sub, email, emailVerified: true });
      expect(done.body.code).to.eql('signed-in');
      expect(done.body.email).to.eql(email);
    });

    it('never links to another account that happens to be signed in', async () => {
      const owner = await makeUser();
      const someoneElse = await makeUser();
      const flow = await start('github');
      await callback('github', flow, { sub: subject(), email: owner.email, emailVerified: true });
      const done = await finish(flow.cookie, someoneElse.token);
      expect(done.body.code).to.eql('provider-other-account');
      expect((await User.findById(owner.user._id).lean())!.identities).to.eql(undefined);
      expect((await User.findById(someoneElse.user._id).lean())!.identities).to.eql(undefined);
    });

    it('never links to an account whose email is not confirmed', async () => {
      // Someone made an account with another person's address, which was never confirmed.
      const { user, token, email } = await makeUser();
      await User.updateOne({ _id: user._id }, { $set: { emailUnverified: true } });
      const flow = await start('google');
      await callback('google', flow, { sub: subject(), email, emailVerified: true });
      expect((await finish(flow.cookie)).body.code).to.eql('provider-sign-in-to-link');
      const done = await finish(flow.cookie, token);
      expect(done).to.have.status(400);
      expect(done.body.code).to.eql('provider-verify-first');
      expect((await User.findById(user._id).lean())!.identities).to.eql(undefined);
    });

    it('matches the email whatever its case', async () => {
      const email = uniqueEmail('Mixed');
      const { token } = await makeUser({ email: email.toLowerCase() });
      const flow = await start('google');
      await callback('google', flow, { sub: subject(), email: email.toUpperCase(), emailVerified: true });
      expect((await finish(flow.cookie)).body.code).to.eql('provider-sign-in-to-link');
      expect((await finish(flow.cookie, token)).body.code).to.eql('provider-linked');
    });
  });

  describe('two-step sign-in', () => {
    it('still asks for the second step after a provider, with no session until it is taken', async () => {
      const { user, token, email, password } = await makeUser();
      const started = await api().post('/mfa/totp/start').set(bearer(token)).send({ password });
      const secret = totp.fromBase32(started.body.secret);
      const added = await api()
        .post('/mfa/totp')
        .set(bearer(token))
        .send({ setupId: started.body.setupId, code: totp.codeAt(secret, totp.stepAt()) });
      expect(added, JSON.stringify(added.body)).to.have.status(200);
      const renewed = sessionToken(added)!;

      const sub = subject();
      const linking = await start('google');
      await callback('google', linking, { sub, email, emailVerified: true });
      expect((await finish(linking.cookie, renewed)).body.code).to.eql('provider-linked');

      const { done } = await signInWith('google', { sub, email, emailVerified: true });
      expect(done, JSON.stringify(done.body)).to.have.status(200);
      expect(done.body.code).to.eql('second-step');
      expect(done.body.methods).to.eql({ totp: true, passkey: false, recovery: true });
      expect(done.body.email).to.eql(email);
      expect(done.body.pending).to.be.a('string');
      expect(sessionToken(done)).to.eql(null);

      await User.updateOne({ _id: user._id }, { $set: { 'mfa.totp.lastStep': totp.stepAt() - 2 } });
      const wrong = await api().post('/signin/second-step').send({ pending: done.body.pending, code: '000000' });
      expect(wrong).to.have.status(401);
      const right = await api()
        .post('/signin/second-step')
        .send({ pending: done.body.pending, code: totp.codeAt(secret, totp.stepAt()) });
      expect(right, JSON.stringify(right.body)).to.have.status(200);
      expect(right.body.email).to.eql(email);
      expect(sessionToken(right)).to.be.a('string');
    });
  });

  describe('on the account page', () => {
    const linkStart = (provider: FakeProviderId, token: string, body: object) =>
      api()
        .post('/auth/' + provider + '/link')
        .set(bearer(token))
        .send(body);

    it('links a provider after the password, whatever its email, and lists it', async () => {
      const { user, token, email, password } = await makeUser();
      expect((await linkStart('github', token, {})).body.code).to.eql('current-password-needed');
      expect((await linkStart('github', token, { password: 'wrong-password' })).body.code).to.eql(
        'current-password-wrong'
      );
      const res = await linkStart('github', token, { password, next: '/de/recipe' });
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      expect(new URL(flow.location).pathname).to.eql('/github/authorize');
      const sub = subject();
      const back = await callback('github', flow, { sub, email: uniqueEmail('elsewhere'), emailVerified: false });
      expect(back.headers.location).to.eql('/de/account?provider=github');
      const done = await finish(flow.cookie, token);
      expect(done.body.code).to.eql('provider-linked');
      expect(done.body.msg).to.eql('GitHub is linked. You can now sign in with it.');
      await mail.waitFor(email, 1);

      const methods = await api().get('/auth/methods').set(bearer(token));
      expect(methods.body.enabled).to.eql(['google', 'github']);
      expect(methods.body.passwordless).to.eql(false);
      expect(methods.body.linked.map((entry: { provider: string }) => entry.provider)).to.eql(['github']);
      expect(JSON.stringify(methods.body)).to.not.include(sub);

      // One per provider.
      expect((await linkStart('github', token, { password })).body.code).to.eql('provider-already-linked');
      expect((await User.findById(user._id).lean())!.identities!.length).to.eql(1);
    });

    it('refuses a provider account linked to another Glazecalc account', async () => {
      const sub = subject();
      await signInWith('google', { sub, email: uniqueEmail('first'), emailVerified: true });
      const { token, password } = await makeUser();
      const res = await linkStart('google', token, { password });
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      await callback('google', flow, { sub, email: uniqueEmail('x'), emailVerified: true });
      expect((await finish(flow.cookie, token)).body.code).to.eql('provider-linked-elsewhere');
    });

    it('does not let an account with an unconfirmed email link, nor a trial', async () => {
      const { user, token, password } = await makeUser();
      await User.updateOne({ _id: user._id }, { $set: { emailUnverified: true } });
      expect((await linkStart('google', token, { password })).body.code).to.eql('provider-verify-first');
      const trial = sessionToken(await api().post('/guest'))!;
      expect((await linkStart('google', trial, { password })).status).to.eql(403);
    });

    it('finishes only for the account that asked, still signed in as it was', async () => {
      const { user, token, password } = await makeUser();
      const res = await linkStart('google', token, { password });
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      await callback('google', flow, { sub: subject(), email: uniqueEmail('y'), emailVerified: true });
      // Signed out everywhere in between: the old session no longer works.
      await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
      const fresh = (await User.findById(user._id))!.generateToken();
      expect((await finish(flow.cookie, fresh)).body.code).to.eql('provider-expired');
      expect((await User.findById(user._id).lean())!.identities).to.eql(undefined);
    });

    it('unlinks after the password, with a notice, but never the last way in', async () => {
      const { token, email, password } = await makeUser();
      const res = await linkStart('google', token, { password });
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      await callback('google', flow, { sub: subject(), email, emailVerified: true });
      await finish(flow.cookie, token);
      await mail.waitFor(email, 1);

      const unlink = (body: object) => api().delete('/auth/google').set(bearer(token)).send(body);
      expect((await unlink({})).body.code).to.eql('current-password-needed');
      const done = await unlink({ password });
      expect(done, JSON.stringify(done.body)).to.have.status(200);
      expect(done.body.code).to.eql('provider-unlinked');
      const [, notice] = await mail.waitFor(email, 2);
      expect(notice!.subject).to.eql('A way to sign in was removed from your Glazecalc account');
      expect((await unlink({ password })).body.code).to.eql('provider-not-linked');

      // An account made with a provider has no password: its only way in stays.
      const sub = subject();
      const made = await signInWith('google', { sub, email: uniqueEmail('only'), emailVerified: true });
      const madeToken = sessionToken(made.done)!;
      const last = await api().delete('/auth/google').set(bearer(madeToken)).send({ password: 'anything' });
      expect(last.body.code).to.eql('provider-last-method');
      expect(
        (await api().post('/auth/github/link').set(bearer(madeToken)).send({ password: 'anything' })).body.code
      ).to.eql('provider-set-password-first');
      expect((await api().get('/auth/methods').set(bearer(madeToken))).body.passwordless).to.eql(true);
    });
  });

  describe("the account's data", () => {
    it('exports the providers with their subjects, and deletes them with the account', async () => {
      const sub = subject();
      const { done } = await signInWith('github', { sub, email: uniqueEmail('data'), emailVerified: true });
      const user = (await User.findOne({ email: done.body.email }))!;
      const exported = (await exportAccount(user._id))!;
      const signIn = exported.signIn as { ownPassword: boolean; providers: Array<Record<string, unknown>> };
      expect(signIn.ownPassword).to.eql(false);
      expect(signIn.providers.map(({ provider, subject: s }) => ({ provider, s }))).to.eql([
        { provider: 'github', s: sub }
      ]);

      // A pending link of this account's goes with it.
      await OAuthLogin.create({
        keyHash: 'h-' + sub,
        provider: 'google',
        next: '/account',
        linkUserId: user._id,
        expiresAt: new Date(Date.now() + 60000)
      });
      const token = sessionToken(done)!;
      // A passwordless account sets a password (the reset email) before deleting; here, directly.
      user.hashPassword('password123');
      await user.save();
      const fresh = (await User.findById(user._id))!.generateToken();
      const res = await api()
        .delete('/deleteuser/' + String(user._id))
        .set(bearer(fresh))
        .send({ password: 'password123' });
      expect(res, JSON.stringify(res.body) + token.length).to.have.status(200);
      expect(await User.exists({ 'identities.uid': 'github:' + sub })).to.eql(null);
      expect(await OAuthLogin.exists({ linkUserId: user._id })).to.eql(null);
    });

    it('gives a passwordless account a password of its own through the reset email', async () => {
      const address = uniqueEmail('reset');
      await signInWith('google', { sub: subject(), email: address, emailVerified: true });
      expect(await api().post('/password/forgot').send({ email: address })).to.have.status(200);
      const [sent] = await mail.waitFor(address, 1);
      const token = mail.tokenIn(sent!)!;
      expect(await api().post('/password/reset').send({ token, password: 'a-new-password' })).to.have.status(200);
      expect((await User.findOne({ email: address }).lean())!.passwordless).to.eql(undefined);
    });
  });
});
