// Signing in with Google, GitHub and Microsoft (server/routes/oauth_routes.ts),
// against the fake provider (support/fake_provider.ts): the flow and its
// checks, the linking rules (pre-hijacking above all), two-step sign-in after
// a provider, unconfirmed emails, linking and unlinking on the account page,
// confirming a change with a fresh provider sign-in when the account has no
// password, Microsoft's own rules (its tenant, an email never trusted), and
// the account's data.
import { exportAccount } from '../lib/export_data.ts';
import * as oauth from '../lib/oauth.ts';
import * as totp from '../lib/totp.ts';
import AuthChallenge from '../models/auth_challenge.ts';
import OAuthLogin from '../models/oauth_login.ts';
import Recipe from '../models/recipe.ts';
import User from '../models/user.ts';
import { api, expect, makeUser, sessionToken, site, uniqueEmail } from './support/app.ts';
import {
  CONSUMER_TENANT,
  FAKE_SETTINGS,
  FakeProvider,
  type FakeIdentity,
  type FakeProviderId
} from './support/fake_provider.ts';
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

describe('signing in with Google, GitHub and Microsoft', () => {
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
      expect((await api().get('/auth/providers')).body.providers).to.eql(['google', 'github', 'microsoft']);
      const secret = process.env.GITHUB_CLIENT_SECRET;
      delete process.env.GITHUB_CLIENT_SECRET;
      try {
        expect((await api().get('/auth/providers')).body.providers).to.eql(['google', 'microsoft']);
        const res = await api().get('/auth/github/start').redirects(0);
        expect(res).to.have.status(404);
        expect(res.body.code).to.eql('provider-off');
      } finally {
        process.env.GITHUB_CLIENT_SECRET = secret;
      }
      expect(await api().get('/auth/facebook/start').redirects(0)).to.have.status(404);
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
      // The sign-in under way is left alone: the cookie stays, and the page is not asked to finish.
      expect(wrongState.headers.location).to.eql('/signin');
      expect(oauthCookie(wrongState)).to.eql(null);
      expect(String(wrongState.headers['set-cookie'] ?? '')).to.not.include('glazecalc_oauth');
      expect((await finish(null)).body.code).to.eql('provider-expired');
      // Nor does a made-up callback for the other provider, or one with no state.
      for (const [other, query] of [
        ['github', { code: 'x', state: 'made-up' }],
        ['google', { code: 'x' }]
      ] as const) {
        const res = await api()
          .get('/auth/' + other + '/callback')
          .query(query)
          .set('Cookie', 'glazecalc_oauth=' + flow.cookie)
          .redirects(0);
        expect(res.headers.location).to.eql('/signin');
        expect(String(res.headers['set-cookie'] ?? '')).to.not.include('glazecalc_oauth');
      }
      // The person's own sign-in then finishes.
      const own = await api()
        .get('/auth/google/callback')
        .query({ code, state: new URL(flow.location).searchParams.get('state')! })
        .set('Cookie', 'glazecalc_oauth=' + flow.cookie)
        .redirects(0);
      expect(own.headers.location).to.eql('/signin?provider=google');
      expect((await finish(flow.cookie)).body.code).to.eql('signed-in');
      // A callback once it is finished, or with no sign-in at all, clears the cookie.
      const late = await api()
        .get('/auth/google/callback')
        .query({ code, state: 'made-up' })
        .set('Cookie', 'glazecalc_oauth=' + flow.cookie)
        .redirects(0);
      expect(late.headers.location).to.eql('/signin?provider=google');
      expect(String(late.headers['set-cookie'] ?? '')).to.include('glazecalc_oauth=;');

      const again = await start('google');
      const first = await callback('google', again, identity);
      expect(first).to.have.status(303);
      // A second callback swaps no code, and leaves the answer waiting for finish.
      expect((await callback('google', again, identity)).headers.location).to.eql('/signin');
      const done = await finish(again.cookie);
      expect(done.body.code).to.eql('signed-in');
      // Finished once only.
      expect((await finish(again.cookie)).body.code).to.eql('provider-expired');
    });

    it('logs a server error at the callback without the code or the state', async () => {
      const flow = await start('google');
      const { code, state } = fake.issue('google', flow.location, { sub: subject(), email: null });
      const original = OAuthLogin.findOneAndUpdate;
      const saved = process.env.LOG_LEVEL;
      const written: string[] = [];
      const stderr = process.stderr.write;
      OAuthLogin.findOneAndUpdate = (() => {
        throw new Error('database down');
      }) as unknown as typeof OAuthLogin.findOneAndUpdate;
      process.env.LOG_LEVEL = 'error';
      process.stderr.write = ((text: string) => {
        written.push(String(text));
        return true;
      }) as typeof process.stderr.write;
      try {
        const res = await api()
          .get('/auth/google/callback')
          .query({ code, state })
          .set('Cookie', 'glazecalc_oauth=' + flow.cookie)
          .redirects(0);
        expect(res).to.have.status(500);
      } finally {
        process.stderr.write = stderr;
        if (saved === undefined) delete process.env.LOG_LEVEL;
        else process.env.LOG_LEVEL = saved;
        OAuthLogin.findOneAndUpdate = original;
      }
      const line = written.join('');
      expect(line).to.include('Server error').and.include('/api/auth/google/callback');
      expect(line).to.not.include(code).and.not.include(state);
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
      const renewed = sessionToken(done)!;

      const methods = await api().get('/auth/methods').set(bearer(renewed));
      expect(methods.body.enabled).to.eql(['google', 'github', 'microsoft']);
      expect(methods.body.passwordless).to.eql(false);
      expect(methods.body.linked.map((entry: { provider: string }) => entry.provider)).to.eql(['github']);
      expect(JSON.stringify(methods.body)).to.not.include(sub);

      // One per provider.
      expect((await linkStart('github', renewed, { password })).body.code).to.eql('provider-already-linked');
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

    it('finishes a link only in the sign-in session that started it', async () => {
      const { user, token, password } = await makeUser();
      const res = await linkStart('google', token, { password });
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      await callback('google', flow, { sub: subject(), email: uniqueEmail('s'), emailVerified: true });
      const otherSession = (await User.findById(user._id))!.generateToken();
      expect((await finish(flow.cookie, otherSession)).body.code).to.eql('provider-expired');
      expect((await User.findById(user._id).lean())!.identities).to.eql(undefined);
    });

    it("signs out the account's other sessions when linking and when unlinking, but keeps this one", async () => {
      const { user, token, email, password } = await makeUser();
      const other = user.generateToken();
      const res = await linkStart('google', token, { password });
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      await callback('google', flow, { sub: subject(), email, emailVerified: true });
      const linked = await finish(flow.cookie, token);
      expect(linked.body.code).to.eql('provider-linked');
      const afterLink = sessionToken(linked)!;
      expect(afterLink).to.be.a('string');
      for (const ended of [token, other])
        expect(await api().get('/auth/methods').set(bearer(ended))).to.have.status(401);
      expect(await api().get('/auth/methods').set(bearer(afterLink))).to.have.status(200);

      const another = (await User.findById(user._id))!.generateToken();
      const done = await api().delete('/auth/google').set(bearer(afterLink)).send({ password });
      expect(done, JSON.stringify(done.body)).to.have.status(200);
      const renewed = sessionToken(done)!;
      expect(renewed).to.be.a('string');
      for (const ended of [afterLink, another])
        expect(await api().get('/auth/methods').set(bearer(ended))).to.have.status(401);
      expect(await api().get('/auth/methods').set(bearer(renewed))).to.have.status(200);
      // The notice still goes.
      await mail.waitFor(email, 2);
    });

    it('unlinks after the password, with a notice, but never the last way in', async () => {
      const { token, email, password } = await makeUser();
      const res = await linkStart('google', token, { password });
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      await callback('google', flow, { sub: subject(), email, emailVerified: true });
      const afterLink = sessionToken(await finish(flow.cookie, token))!;
      await mail.waitFor(email, 1);

      const unlink = (body: object, as = afterLink) => api().delete('/auth/google').set(bearer(as)).send(body);
      expect((await unlink({})).body.code).to.eql('current-password-needed');
      const done = await unlink({ password });
      expect(done, JSON.stringify(done.body)).to.have.status(200);
      expect(done.body.code).to.eql('provider-unlinked');
      const [, notice] = await mail.waitFor(email, 2);
      expect(notice!.subject).to.eql('A way to sign in was removed from your Glazecalc account');
      expect((await unlink({ password }, sessionToken(done)!)).body.code).to.eql('provider-not-linked');

      // An account made with a provider has no password: its only way in stays.
      const sub = subject();
      const made = await signInWith('google', { sub, email: uniqueEmail('only'), emailVerified: true });
      const madeToken = sessionToken(made.done)!;
      const last = await api().delete('/auth/google').set(bearer(madeToken)).send({ password: 'anything' });
      expect(last.body.code).to.eql('provider-last-method');
      // Nor does a password stand in for the fresh provider sign-in it confirms with.
      expect(
        (await api().post('/auth/github/link').set(bearer(madeToken)).send({ password: 'anything' })).body.code
      ).to.eql('provider-reauth-needed');
      expect((await api().get('/auth/methods').set(bearer(madeToken))).body.passwordless).to.eql(true);
    });
  });

  describe('confirming with a fresh provider sign-in (an account with no password)', () => {
    /** An account made with a provider, signed in. */
    const madeWith = async (provider: FakeProviderId = 'google') => {
      const sub = subject();
      const email = uniqueEmail('nopass');
      const { done } = await signInWith(provider, { sub, email, emailVerified: true });
      const user = (await User.findOne({ email }))!;
      return { sub, email, user, token: sessionToken(done)! };
    };

    const reauthStart = (provider: FakeProviderId, token: string) =>
      api()
        .post('/auth/' + provider + '/reauth')
        .set(bearer(token))
        .send({ next: '/de/account' });

    /** Signs in again with the provider as `identity`, and finishes with `finishToken` (the same session by default). */
    const reauth = async (
      provider: FakeProviderId,
      token: string,
      identity: FakeIdentity,
      finishToken = token
    ): Promise<{ back: Res; done: Res }> => {
      const res = await reauthStart(provider, token);
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      const back = await callback(provider, flow, identity);
      return { back, done: await finish(flow.cookie, finishToken) };
    };

    const grantOf = async (provider: FakeProviderId, token: string, sub: string, email: string): Promise<string> => {
      const { done } = await reauth(provider, token, { sub, email, emailVerified: true });
      expect(done, JSON.stringify(done.body)).to.have.status(200);
      return done.body.reauth as string;
    };

    const deleteAs = (user: { _id: unknown }, token: string, body: object) =>
      api()
        .delete('/deleteuser/' + String(user._id))
        .set(bearer(token))
        .send(body);

    it('gives a grant for one change, within 5 minutes, that stands in for the password', async () => {
      const { sub, email, user, token } = await madeWith();
      expect((await deleteAs(user, token, {})).body.code).to.eql('provider-reauth-needed');
      expect((await deleteAs(user, token, { password: 'anything' })).body.code).to.eql('provider-reauth-needed');

      const { back, done } = await reauth('google', token, { sub, email, emailVerified: true });
      expect(back.headers.location).to.eql('/de/account?provider=google');
      expect(done, JSON.stringify(done.body)).to.have.status(200);
      expect(done.body.code).to.eql('provider-reauthed');
      expect(done.body.provider).to.eql('google');
      expect(done.body.reauth).to.match(/^[A-Za-z0-9_-]{43}$/);
      const left = Date.parse(done.body.expiresAt) - Date.now();
      expect(left)
        .to.be.above(4 * 60 * 1000)
        .and.at.most(5 * 60 * 1000);
      // Only its hash is kept.
      expect(await AuthChallenge.exists({ grantHash: done.body.reauth })).to.eql(null);

      // The email change takes it...
      const newAddress = uniqueEmail('moved');
      const changed = await api()
        .post('/email/change')
        .set(bearer(token))
        .send({ email: newAddress, reauth: done.body.reauth });
      expect(changed, JSON.stringify(changed.body)).to.have.status(200);
      expect(changed.body.code).to.eql('email-change-sent');
      // ...once.
      expect((await deleteAs(user, token, { reauth: done.body.reauth })).body.code).to.eql('provider-reauth-needed');
      expect(await User.exists({ _id: user._id })).to.not.eql(null);

      // An address already in use is refused before the grant is spent.
      const other = await makeUser();
      const grant = await grantOf('google', token, sub, email);
      const inUse = await api().post('/email/change').set(bearer(token)).send({ email: other.email, reauth: grant });
      expect(inUse.body.code).to.eql('email-in-use');
      const deleted = await deleteAs(user, token, { reauth: grant });
      expect(deleted, JSON.stringify(deleted.body)).to.have.status(200);
      expect(await User.exists({ _id: user._id })).to.eql(null);
    });

    it("never takes another account's sign-in, or a provider account not linked to this one", async () => {
      const a = await madeWith();
      const b = await madeWith();
      // B's Google account signs in for A: refused at the callback.
      const crossed = await reauth('google', a.token, { sub: b.sub, email: b.email, emailVerified: true });
      expect(crossed.done.body.code).to.eql('provider-reauth-other');
      expect(crossed.done.body.reauth).to.eql(undefined);
      // A provider account linked to no one, whatever its email.
      const stranger = await reauth('google', a.token, { sub: subject(), email: a.email, emailVerified: true });
      expect(stranger.done.body.code).to.eql('provider-reauth-other');

      // A's sign-in, finished by B's session: refused, and nothing given.
      const stolen = await reauth('google', a.token, { sub: a.sub, email: a.email, emailVerified: true }, b.token);
      expect(stolen.done.body.code).to.eql('provider-expired');
      expect(stolen.done.body.reauth).to.eql(undefined);

      // A's grant does nothing for B.
      const grant = await grantOf('google', a.token, a.sub, a.email);
      expect((await deleteAs(b.user, b.token, { reauth: grant })).body.code).to.eql('provider-reauth-needed');
      expect(await User.exists({ _id: b.user._id })).to.not.eql(null);
      // Nor for a provider not linked to A.
      expect((await reauthStart('github', a.token)).body.code).to.eql('provider-not-linked');

      // An account with a password confirms with it: no provider sign-in, and a grant is no password.
      const withPassword = await makeUser();
      expect((await reauthStart('google', withPassword.token)).body.code).to.eql('provider-reauth-password');
      expect((await deleteAs(withPassword.user, withPassword.token, { reauth: grant })).body.code).to.eql(
        'current-password-needed'
      );
      // A trial has nothing to confirm with.
      const trial = sessionToken(await api().post('/guest'))!;
      expect(await reauthStart('google', trial)).to.have.status(403);
    });

    it('is good only in the sign-in session that started it, not another of the same account', async () => {
      const { sub, email, user, token } = await madeWith();
      const identity = { sub, email, emailVerified: true };
      // Another browser signed in to the same account (or a stolen copy of its session made anew).
      const otherSession = (await User.findById(user._id))!.generateToken();
      expect(otherSession).to.not.eql(token);

      // Started in one session, finished in the other: nothing given.
      const crossed = await reauth('google', token, identity, otherSession);
      expect(crossed.done.body.code).to.eql('provider-expired');
      expect(crossed.done.body.reauth).to.eql(undefined);

      // A grant from one session does nothing in the other, and stays good in its own.
      const grant = await grantOf('google', token, sub, email);
      const elsewhere = await api()
        .post('/email/change')
        .set(bearer(otherSession))
        .send({ email: uniqueEmail('moved'), reauth: grant });
      expect(elsewhere.body.code).to.eql('provider-reauth-needed');
      expect((await deleteAs(user, otherSession, { reauth: grant })).body.code).to.eql('provider-reauth-needed');
      expect(await deleteAs(user, token, { reauth: grant })).to.have.status(200);
    });

    it('runs out after 5 minutes, and when the account signs out everywhere', async () => {
      const { sub, email, user, token } = await madeWith();
      // A provider answer older than 5 minutes gives nothing.
      const res = await reauthStart('google', token);
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      await callback('google', flow, { sub, email, emailVerified: true });
      await OAuthLogin.updateOne(
        { keyHash: oauth.sha256(flow.cookie) },
        { $set: { confirmedAt: new Date(Date.now() - 6 * 60 * 1000) } }
      );
      expect((await finish(flow.cookie, token)).body.code).to.eql('provider-expired');

      // A grant past its time.
      const late = await grantOf('google', token, sub, email);
      await AuthChallenge.updateMany(
        { userId: user._id, purpose: 'provider-reauth' },
        { $set: { expiresAt: new Date(Date.now() - 1000) } }
      );
      expect((await deleteAs(user, token, { reauth: late })).body.code).to.eql('provider-reauth-needed');

      // A grant from before a sign-out everywhere.
      const before = await grantOf('google', token, sub, email);
      await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
      const fresh = (await User.findById(user._id))!.generateToken();
      expect((await deleteAs(user, fresh, { reauth: before })).body.code).to.eql('provider-reauth-needed');
      // And a newer grant replaces an older one.
      const first = await grantOf('google', fresh, sub, email);
      const second = await grantOf('google', fresh, sub, email);
      expect((await deleteAs(user, fresh, { reauth: first })).body.code).to.eql('provider-reauth-needed');
      expect(await deleteAs(user, fresh, { reauth: second })).to.have.status(200);
    });

    it('turns on two-step sign-in, then links and unlinks with it and a second step', async () => {
      const { sub, email, user, token } = await madeWith();
      expect((await api().post('/mfa/totp/start').set(bearer(token)).send({})).body.code).to.eql(
        'provider-reauth-needed'
      );
      const started = await api()
        .post('/mfa/totp/start')
        .set(bearer(token))
        .send({ reauth: await grantOf('google', token, sub, email) });
      expect(started, JSON.stringify(started.body)).to.have.status(200);
      const secret = totp.fromBase32(started.body.secret);
      const added = await api()
        .post('/mfa/totp')
        .set(bearer(token))
        .send({ setupId: started.body.setupId, code: totp.codeAt(secret, totp.stepAt()) });
      expect(added, JSON.stringify(added.body)).to.have.status(200);
      const renewed = sessionToken(added)!;
      const code = async () => {
        await User.updateOne({ _id: user._id }, { $set: { 'mfa.totp.lastStep': totp.stepAt() - 2 } });
        return totp.codeAt(secret, totp.stepAt());
      };

      // Linking GitHub: the grant alone is not enough, and a wrong code does not spend it.
      const grant = await grantOf('google', renewed, sub, email);
      const link = (body: object) => api().post('/auth/github/link').set(bearer(renewed)).send(body);
      expect((await link({ reauth: grant })).body.code).to.eql('factor-needed');
      await User.updateOne({ _id: user._id }, { $set: { 'mfa.totp.lastStep': totp.stepAt() - 2 } });
      expect((await link({ reauth: grant, code: '000000' })).body.code).to.eql('code-wrong');
      const linking = await link({ reauth: grant, code: await code() });
      expect(linking, JSON.stringify(linking.body)).to.have.status(200);
      const flow = { location: linking.body.location as string, cookie: oauthCookie(linking)! };
      const githubSub = subject();
      await callback('github', flow, { sub: githubSub, email: uniqueEmail('gh'), emailVerified: true });
      const linkedGithub = await finish(flow.cookie, renewed);
      expect(linkedGithub.body.code).to.eql('provider-linked');
      // The link renews this session and ends the others.
      const afterLink = sessionToken(linkedGithub)!;
      expect(await api().get('/auth/methods').set(bearer(renewed))).to.have.status(401);
      // Spent on the link.
      const linkAgain = await api()
        .post('/auth/github/link')
        .set(bearer(afterLink))
        .send({ reauth: grant, code: await code() });
      expect(linkAgain.body.code).to.eql('provider-already-linked');

      // Unlinking Google, confirmed by a fresh GitHub sign-in and a code.
      const viaGithub = await grantOf('github', afterLink, githubSub, email);
      const unlinked = await api()
        .delete('/auth/google')
        .set(bearer(afterLink))
        .send({ reauth: viaGithub, code: await code() });
      expect(unlinked, JSON.stringify(unlinked.body)).to.have.status(200);
      const after = sessionToken(unlinked)!;
      expect(await api().get('/auth/methods').set(bearer(afterLink))).to.have.status(401);
      // GitHub is now the only way in.
      const last = await api()
        .delete('/auth/github')
        .set(bearer(after))
        .send({ reauth: await grantOf('github', after, githubSub, email), code: await code() });
      expect(last.body.code).to.eql('provider-last-method');
      // A Google sign-in no longer confirms anything.
      expect((await reauthStart('google', after)).body.code).to.eql('provider-not-linked');
    });

    it('asks Google to sign the person in again, and refuses an answer that says it did not', async () => {
      const { sub, email, token } = await madeWith();
      const plain = new URL((await start('google')).location);
      expect(plain.searchParams.get('max_age')).to.eql(null);
      expect(plain.searchParams.get('claims')).to.eql(null);
      const res = await reauthStart('google', token);
      const url = new URL(res.body.location as string);
      expect(url.searchParams.get('max_age')).to.eql('0');
      expect(JSON.parse(url.searchParams.get('claims')!)).to.eql({ id_token: { auth_time: { essential: true } } });

      // Signed in at Google before the reauth started, or no auth_time at all: no grant.
      const identity = { sub, email, emailVerified: true };
      for (const tamper of [{ auth_time: Math.floor(Date.now() / 1000) - 3600 }, { auth_time: undefined }]) {
        fake.tamper = tamper;
        const { done } = await reauth('google', token, identity);
        expect(done.body.code, JSON.stringify(tamper)).to.eql('provider-not-fresh');
        expect(done.body.reauth).to.eql(undefined);
      }
      // A fresh one gives it.
      expect((await reauth('google', token, identity)).done.body.code).to.eql('provider-reauthed');
    });

    it("shows GitHub's account picker for a fresh sign-in, which is all GitHub offers", async () => {
      const { token } = await madeWith('github');
      expect(new URL((await start('github')).location).searchParams.get('prompt')).to.eql(null);
      const url = new URL((await reauthStart('github', token)).body.location as string);
      expect(url.searchParams.get('prompt')).to.eql('select_account');
      expect(url.searchParams.get('max_age')).to.eql(null);
    });

    it('does not let a provider sign-in change the password', async () => {
      const { sub, email, token } = await madeWith();
      const grant = await grantOf('google', token, sub, email);
      const res = await api().put('/password').set(bearer(token)).send({ reauth: grant, password: 'a-new-password' });
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('current-password-wrong');
    });

    it('makes an access token with the grant, once, and with a second step as well once two-step sign-in is on', async () => {
      const { sub, email, user, token } = await madeWith();
      const make = (session: string, body: object) =>
        api()
          .post('/tokens')
          .set(bearer(session))
          .send({ name: 'My assistant', ...body });
      expect((await make(token, {})).body.code).to.eql('provider-reauth-needed');
      expect((await make(token, { password: 'anything' })).body.code).to.eql('provider-reauth-needed');
      const grant = await grantOf('google', token, sub, email);
      const made = await make(token, { reauth: grant });
      expect(made, JSON.stringify(made.body)).to.have.status(201);
      expect(made.body.token).to.be.a('string');
      // Spent on that token.
      expect((await make(token, { reauth: grant })).body.code).to.eql('provider-reauth-needed');

      // Two-step sign-in on: the grant and a current factor.
      const started = await api()
        .post('/mfa/totp/start')
        .set(bearer(token))
        .send({ reauth: await grantOf('google', token, sub, email) });
      const secret = totp.fromBase32(started.body.secret);
      const added = await api()
        .post('/mfa/totp')
        .set(bearer(token))
        .send({ setupId: started.body.setupId, code: totp.codeAt(secret, totp.stepAt()) });
      expect(added, JSON.stringify(added.body)).to.have.status(200);
      const renewed = sessionToken(added)!;
      const second = await grantOf('google', renewed, sub, email);
      expect((await make(renewed, { reauth: second })).body.code).to.eql('factor-needed');
      await User.updateOne({ _id: user._id }, { $set: { 'mfa.totp.lastStep': totp.stepAt() - 2 } });
      const withCode = await make(renewed, { reauth: second, code: totp.codeAt(secret, totp.stepAt()) });
      expect(withCode, JSON.stringify(withCode.body)).to.have.status(201);
    });
  });

  describe('Microsoft', () => {
    const OTHER_TENANT = '72f988bf-86f1-41af-91ab-2d7cd011db47';
    const tenantIssuer = (tid: string) => fake.base + '/microsoft/' + tid + '/v2.0';

    afterEach(() => {
      fake.microsoftKeyIssuer = null;
      fake.tamper = null;
      oauth.forgetKeys();
    });

    it('sends the browser to the common endpoint with PKCE, a state, a nonce and the account picker', async () => {
      const url = new URL((await start('microsoft')).location);
      expect(url.origin + url.pathname).to.eql(fake.base + '/microsoft/authorize');
      expect(url.searchParams.get('client_id')).to.eql(FAKE_SETTINGS.MICROSOFT_CLIENT_ID);
      expect(url.searchParams.get('redirect_uri')).to.eql('https://glazecalc.test/api/auth/microsoft/callback');
      expect(url.searchParams.get('response_type')).to.eql('code');
      expect(url.searchParams.get('scope')).to.eql('openid email');
      expect(url.searchParams.get('code_challenge_method')).to.eql('S256');
      expect(url.searchParams.get('nonce')).to.match(/^[A-Za-z0-9_-]{43}$/);
      expect(url.searchParams.get('prompt')).to.eql('select_account');
      expect(url.searchParams.get('max_age')).to.eql(null);
      // The real endpoints: `common`, for personal and work or school accounts.
      const nodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const real = oauth.endpoints('microsoft');
        expect(real.authorize).to.eql('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
        expect(real.token).to.eql('https://login.microsoftonline.com/common/oauth2/v2.0/token');
        expect(real.jwks).to.eql('https://login.microsoftonline.com/common/discovery/v2.0/keys');
        expect(real.issuerTemplate).to.eql('https://login.microsoftonline.com/{tenantid}/v2.0');
      } finally {
        process.env.NODE_ENV = nodeEnv;
      }
    });

    it('makes a new account with its email unconfirmed, and sends the confirmation email', async () => {
      const address = uniqueEmail('microsoft');
      const sub = 'AAAAAAAAAAAAAAAAAAAAAIkzqFVrSaSaFHy782bbtaQ' + subjects++;
      const { done } = await signInWith('microsoft', { sub, email: address });
      expect(done, JSON.stringify(done.body)).to.have.status(200);
      expect(done.body.code).to.eql('signed-in');
      expect(done.body.unverified).to.eql(true);
      const user = (await User.findOne({ email: address }).lean())!;
      expect(user.emailUnverified).to.eql(true);
      expect(user.passwordless).to.eql(true);
      // Found by its tenant and sub together.
      expect(user.identities!.map(({ provider, subject: s, uid }) => ({ provider, s, uid }))).to.eql([
        { provider: 'microsoft', s: CONSUMER_TENANT + ':' + sub, uid: 'microsoft:' + CONSUMER_TENANT + ':' + sub }
      ]);
      const [sent] = await mail.waitFor(address, 1);
      expect(sent!.subject).to.eql('Confirm your email for Glazecalc');
      const confirmed = await api()
        .post('/email/confirm')
        .send({ token: mail.linkTokenIn(sent!) });
      expect(confirmed).to.have.status(200);
      expect((await User.findById(user._id).lean())!.emailUnverified).to.eql(undefined);

      // Signs in again by tenant and sub, whatever the email says now.
      const again = await signInWith('microsoft', { sub, email: uniqueEmail('changed') });
      expect(again.done.body.email).to.eql(address);
      expect(again.done.body.unverified).to.eql(undefined);
    });

    it('treats the same sub in another tenant as another person', async () => {
      const sub = 'same-sub-' + subjects++;
      const first = await signInWith('microsoft', { sub, email: uniqueEmail('t1') });
      const second = await signInWith('microsoft', { sub, tid: OTHER_TENANT, email: uniqueEmail('t2') });
      expect(second.done.body.code).to.eql('signed-in');
      expect(second.done.body.email).to.not.eql(first.done.body.email);
      expect(await User.exists({ 'identities.uid': 'microsoft:' + OTHER_TENANT + ':' + sub })).to.not.eql(null);
    });

    it('never links by email, nor signs in to the account that has it, even signed in to it', async () => {
      // nOAuth: a tenant's administrator can give anyone any email.
      const { user, token, email } = await makeUser();
      const flow = await start('microsoft');
      await callback('microsoft', flow, { sub: 'nOAuth-' + subjects++, tid: OTHER_TENANT, email });
      const refused = await finish(flow.cookie);
      expect(refused).to.have.status(400);
      expect(refused.body.code).to.eql('provider-email-in-use');
      expect(refused.body.msg).to.include('sign in to it the usual way, then link Microsoft on your account page');
      expect(sessionToken(refused)).to.eql(null);
      // Taken once: finishing it signed in to that account links nothing.
      expect((await finish(flow.cookie, token)).body.code).to.eql('provider-expired');
      expect((await User.findById(user._id).lean())!.identities).to.eql(undefined);

      // Whatever its case, and for an unconfirmed account too.
      const other = await makeUser({ email: uniqueEmail('unconfirmed') });
      await User.updateOne({ _id: other.user._id }, { $set: { emailUnverified: true } });
      for (const address of [email.toUpperCase(), other.email]) {
        const { done } = await signInWith('microsoft', { sub: 'nOAuth-' + subjects++, email: address });
        expect(done.body.code, address).to.eql('provider-email-in-use');
      }
      expect(await User.countDocuments({ 'identities.provider': 'microsoft', email })).to.eql(0);
    });

    it('makes no account without an email', async () => {
      const { done } = await signInWith('microsoft', { sub: 'no-mail-' + subjects++, email: null });
      expect(done.body.code).to.eql('provider-email-missing');
      expect(sessionToken(done)).to.eql(null);
    });

    it('links from the account page after the password, whatever its email', async () => {
      const { user, token, email, password } = await makeUser();
      const res = await api().post('/auth/microsoft/link').set(bearer(token)).send({ password });
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
      const sub = 'linked-' + subjects++;
      await callback('microsoft', flow, { sub, tid: OTHER_TENANT, email: uniqueEmail('elsewhere') });
      const linked = await finish(flow.cookie, token);
      expect(linked.body.code).to.eql('provider-linked');
      expect((await User.findById(user._id).lean())!.identities![0]!.uid).to.eql(
        'microsoft:' + OTHER_TENANT + ':' + sub
      );
      const [notice] = await mail.waitFor(email, 1);
      expect(notice!.text).to.include('with Microsoft');
      // Now it signs in to that account.
      const { done } = await signInWith('microsoft', { sub, tid: OTHER_TENANT, email: uniqueEmail('x') });
      expect(done.body.email).to.eql(email);
    });

    it("refuses an ID token from another tenant's issuer, or with a tid, audience, nonce or time not its own", async () => {
      const identity = () => ({ sub: 'tampered-' + subjects++, email: uniqueEmail('tamper') });
      const cases: Array<Record<string, unknown>> = [
        // Another tenant's issuer, with this token's tid: the issuer must be the token's own tenant's.
        { iss: tenantIssuer(OTHER_TENANT) },
        { tid: OTHER_TENANT },
        { iss: fake.base + '/microsoft/common/v2.0' },
        { iss: fake.base + '/microsoft/{tenantid}/v2.0' },
        { tid: 'common', iss: tenantIssuer('common') },
        { tid: undefined },
        { aud: 'another-app' },
        { nonce: 'another-nonce' },
        { exp: Math.floor(Date.now() / 1000) - 3600 },
        { nbf: Math.floor(Date.now() / 1000) + 3600 },
        { sub: undefined }
      ];
      for (const tamper of cases) {
        fake.tamper = tamper;
        const one = identity();
        const { done } = await signInWith('microsoft', one);
        expect(done.body.code, JSON.stringify(tamper)).to.eql('provider-failed');
        expect(await User.exists({ email: one.email })).to.eql(null);
      }
      // An untampered one is taken.
      expect((await signInWith('microsoft', identity())).done.body.code).to.eql('signed-in');
    });

    it('uses a key only for the issuer the key set names for it', async () => {
      // A key for one tenant only signs that tenant's tokens.
      fake.microsoftKeyIssuer = tenantIssuer(OTHER_TENANT);
      oauth.forgetKeys();
      const wrong = await signInWith('microsoft', { sub: 'key-' + subjects++, email: uniqueEmail('key') });
      expect(wrong.done.body.code).to.eql('provider-failed');
      const right = await signInWith('microsoft', {
        sub: 'key-' + subjects++,
        tid: OTHER_TENANT,
        email: uniqueEmail('key')
      });
      expect(right.done.body.code).to.eql('signed-in');
      // A key with no issuer signs nothing.
      fake.microsoftKeyIssuer = '';
      oauth.forgetKeys();
      const none = await signInWith('microsoft', { sub: 'key-' + subjects++, email: uniqueEmail('key') });
      expect(none.done.body.code).to.eql('provider-failed');
    });

    it('confirms a change with prompt=login and a fresh auth_time, and refuses a stale or missing one', async () => {
      const sub = 'reauth-' + subjects++;
      const email = uniqueEmail('msreauth');
      const made = await signInWith('microsoft', { sub, email });
      const token = sessionToken(made.done)!;
      const reauthStart = () => api().post('/auth/microsoft/reauth').set(bearer(token)).send({ next: '/account' });
      const reauth = async () => {
        const res = await reauthStart();
        expect(res, JSON.stringify(res.body)).to.have.status(200);
        const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
        await callback('microsoft', flow, { sub, email });
        return finish(flow.cookie, token);
      };
      const url = new URL((await reauthStart()).body.location as string);
      expect(url.searchParams.get('prompt')).to.eql('login');
      expect(url.searchParams.get('max_age')).to.eql(null);
      expect(url.searchParams.get('claims')).to.eql(null);

      for (const tamper of [{ auth_time: Math.floor(Date.now() / 1000) - 3600 }, { auth_time: undefined }]) {
        fake.tamper = tamper;
        const done = await reauth();
        expect(done.body.code, JSON.stringify(tamper)).to.eql('provider-not-fresh');
        expect(done.body.reauth).to.eql(undefined);
      }
      const done = await reauth();
      expect(done.body.code).to.eql('provider-reauthed');
      expect(done.body.provider).to.eql('microsoft');
      // The grant stands in for the password, once.
      const deleted = await api()
        .delete('/deleteuser/' + String((await User.findOne({ email }))!._id))
        .set(bearer(token))
        .send({ reauth: done.body.reauth });
      expect(deleted, JSON.stringify(deleted.body)).to.have.status(200);
    });

    it('serves the publisher domain file with its own client id, and none while Microsoft is off', async () => {
      const res = await site().get('/.well-known/microsoft-identity-association.json');
      expect(res).to.have.status(200);
      expect(res.headers['content-type']).to.match(/^application\/json/);
      expect(res.body).to.eql({ associatedApplications: [{ applicationId: FAKE_SETTINGS.MICROSOFT_CLIENT_ID }] });
      const secret = process.env.MICROSOFT_CLIENT_SECRET;
      delete process.env.MICROSOFT_CLIENT_SECRET;
      try {
        expect(await site().get('/.well-known/microsoft-identity-association.json')).to.have.status(404);
      } finally {
        process.env.MICROSOFT_CLIENT_SECRET = secret;
      }
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
      user.passwordless = undefined;
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

    it('gives a passwordless account a password of its own through the reset email, and unlinks its providers', async () => {
      const address = uniqueEmail('reset');
      const sub = subject();
      await signInWith('google', { sub, email: address, emailVerified: true });
      expect(await api().post('/password/forgot').send({ email: address })).to.have.status(200);
      const [sent] = await mail.waitFor(address, 1);
      const token = mail.tokenIn(sent!)!;
      expect(await api().post('/password/reset').send({ token, password: 'a-new-password' })).to.have.status(200);
      const user = (await User.findOne({ email: address }).lean())!;
      expect(user.passwordless).to.eql(undefined);
      expect(user.identities).to.eql([]);
      // The notice says so, and where to link it again.
      const [, notice] = await mail.waitFor(address, 2);
      expect(notice!.subject).to.eql('Your Glazecalc password was changed');
      expect(notice!.text).to.include('- Signing in with Google, which you can link again on your account page');
      expect(notice!.text).to.include('/account');
      // The new password signs in; Google is now an account with that email, to link again.
      const auth = 'Basic ' + Buffer.from(address + ':a-new-password').toString('base64');
      expect(await api().get('/signin').set('Authorization', auth)).to.have.status(200);
      const again = await signInWith('google', { sub, email: address, emailVerified: true });
      expect(again.done.body.code).to.eql('provider-sign-in-to-link');
    });

    it('unlinks every provider on a password reset, but keeps them on a password change', async () => {
      const { user, token, email, password } = await makeUser();
      const linkVia = async (provider: FakeProviderId, as: string, proof: string): Promise<string> => {
        const res = await api()
          .post('/auth/' + provider + '/link')
          .set(bearer(as))
          .send({ password: proof });
        const flow = { location: res.body.location as string, cookie: oauthCookie(res)! };
        await callback(provider, flow, { sub: subject(), email: uniqueEmail('l'), emailVerified: true });
        const done = await finish(flow.cookie, as);
        expect(done.body.code).to.eql('provider-linked');
        return sessionToken(done)!;
      };
      const afterGoogle = await linkVia('google', token, password);
      const afterBoth = await linkVia('github', afterGoogle, password);
      await mail.waitFor(email, 2);

      // A change keeps them.
      const changed = await api()
        .put('/password')
        .set(bearer(afterBoth))
        .send({ current: password, password: 'changed-password' });
      expect(changed, JSON.stringify(changed.body)).to.have.status(200);
      expect((await User.findById(user._id).lean())!.identities!.map(({ provider }) => provider)).to.eql([
        'google',
        'github'
      ]);
      const [, , changedNotice] = await mail.waitFor(email, 3);
      expect(changedNotice!.text).to.not.include('Signing in with');

      // A reset removes both, and says so.
      await api().post('/password/forgot').send({ email });
      const [, , , sent] = await mail.waitFor(email, 4);
      const reset = await api()
        .post('/password/reset')
        .send({ token: mail.tokenIn(sent!)!, password: 'reset-password' });
      expect(reset).to.have.status(200);
      expect((await User.findById(user._id).lean())!.identities).to.eql([]);
      const [, , , , notice] = await mail.waitFor(email, 5);
      expect(notice!.text).to.include('- Signing in with Google, GitHub, which you can link again');
    });
  });
});
