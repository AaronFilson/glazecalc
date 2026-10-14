// Two-step sign-in end to end on the server (docs/mfa-plan.md, items 9 and
// 17): factors set up through /api/mfa with the real checks (stream A), then
// GET /api/signin and POST /api/signin/second-step or passkey-first sign-in
// (stream B), with no stand-ins. auth_routes_tests.ts tests the flow itself
// through second_step.checks; this file tests the two together.
import type { PasskeyRequestOptionsResponse, SecondStepResponse } from '../../lib/mfa.js';
import { clear, notify, WAIT_DAYS } from '../clear_mfa.ts';
import * as limits from '../lib/rate_limit.ts';
import * as site from '../lib/site.ts';
import * as totp from '../lib/totp.ts';
import User from '../models/user.ts';
import { api, expect, makeUser, sessionToken } from './support/app.ts';
import { SoftAuthenticator } from './support/soft_authenticator.ts';

type Res = Awaited<ReturnType<ReturnType<typeof api>['get']>>;
const DAY = 24 * 60 * 60 * 1000;

interface Account {
  user: Awaited<ReturnType<typeof makeUser>>['user'];
  token: string;
  email: string;
  password: string;
}

const account = async (): Promise<Account> => {
  const { user, token, email, password } = await makeUser();
  return { user, token, email, password };
};

const mfa = (who: Pick<Account, 'token'>, method: 'get' | 'post', path: string, body?: object) => {
  const req = api()
    [method]('/mfa' + path)
    .set('Authorization', 'Bearer ' + who.token);
  return body ? req.send(body) : req;
};

const follow = (who: Account, res: Res): void => {
  const token = sessionToken(res);
  expect(token, 'a renewed session cookie').to.be.a('string');
  who.token = token!;
};

const soft = () => new SoftAuthenticator({ rpId: site.rpId(), origin: site.origin() });

/** Turns on an authenticator app; resolves with its secret and the recovery codes. */
const enrolTotp = async (who: Account) => {
  const started = await mfa(who, 'post', '/totp/start', { password: who.password });
  expect(started, JSON.stringify(started.body)).to.have.status(200);
  const secret = totp.fromBase32(started.body.secret);
  const added = await mfa(who, 'post', '/totp', { code: totp.codeAt(secret, totp.stepAt()) });
  expect(added, JSON.stringify(added.body)).to.have.status(200);
  follow(who, added);
  return { secret, codes: added.body.recoveryCodes as string[] };
};

/** Adds a passkey from a new soft authenticator (the first factor, so with the password alone). */
const addPasskey = async (who: Account) => {
  const options = await mfa(who, 'post', '/passkeys/options', { password: who.password });
  expect(options, JSON.stringify(options.body)).to.have.status(200);
  const authenticator = soft();
  const added = await mfa(who, 'post', '/passkeys', {
    response: authenticator.register(options.body.options),
    name: 'Laptop'
  });
  expect(added, JSON.stringify(added.body)).to.have.status(200);
  follow(who, added);
  return { authenticator, codes: added.body.recoveryCodes as string[] };
};

/**
 * A code the account will take now. Enrolling took this step's code, and a
 * code is taken once per 30-second step, so rather than wait, the test moves
 * the account's last step back.
 */
const codeNow = async (who: Account, secret: Buffer): Promise<string> => {
  await User.updateOne({ _id: who.user._id }, { $set: { 'mfa.totp.lastStep': totp.stepAt() - 2 } });
  return totp.codeAt(secret, totp.stepAt());
};

const basic = (address: string, password: string) =>
  'Basic ' + Buffer.from(address + ':' + password).toString('base64');

const passwordStep = async (who: Account): Promise<SecondStepResponse> => {
  const res = await api().get('/signin').set('Authorization', basic(who.email, who.password));
  expect(res, JSON.stringify(res.body)).to.have.status(200);
  expect(res.body.code).to.eql('second-step');
  expect(sessionToken(res)).to.eql(null);
  return res.body as SecondStepResponse;
};

const secondStep = (pending: string, proof: object) =>
  api()
    .post('/signin/second-step')
    .send({ pending, ...proof });

const verify = (token: string | null) =>
  api()
    .get('/verify')
    .set('Authorization', 'Bearer ' + token);

const passkeyOptions = async () => {
  const res = await api().post('/signin/passkey/options');
  expect(res).to.have.status(200);
  return (res.body as PasskeyRequestOptionsResponse).options;
};

const passkeySignIn = (response: unknown) => api().post('/signin/passkey').send({ response });

describe('two-step sign-in end to end (real factors)', () => {
  describe('with an authenticator app', () => {
    it('signs in with a current code, and refuses the same code again', async () => {
      const alice = await account();
      const { secret } = await enrolTotp(alice);
      const step = await passwordStep(alice);
      expect(step.methods).to.eql({ totp: true, passkey: false, recovery: true });

      const code = await codeNow(alice, secret);
      const res = await secondStep(step.pending, { code });
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      expect(res.body).to.include({ code: 'signed-in', email: alice.email });
      expect((await verify(sessionToken(res))).body).to.include({ email: alice.email, mfa: true });
      expect((await User.findById(alice.user._id).lean())!.mfa!.totp!.lastStep).to.eql(totp.stepAt());

      // Someone who saw that code cannot use it, even with the password.
      const replay = await secondStep((await passwordStep(alice)).pending, { code });
      expect(replay).to.have.status(401);
      expect(replay.body.code).to.eql('code-wrong');
      expect(sessionToken(replay)).to.eql(null);
    });

    it('answers a wrong code with 401, and a missing or empty one with 400', async () => {
      const alice = await account();
      const { secret } = await enrolTotp(alice);
      const { pending } = await passwordStep(alice);
      const right = await codeNow(alice, secret);
      const wrong = String((Number(right) + 1) % 1000000).padStart(6, '0');
      expect((await secondStep(pending, { code: wrong })).status).to.eql(401);
      for (const [proof, code] of [
        [{}, 'factor-needed'],
        [{ code: '' }, 'code-needed'],
        [{ code: right, recoveryCode: 'x' }, 'factor-needed']
      ] as const) {
        const res = await secondStep(pending, proof);
        expect(res, JSON.stringify(proof)).to.have.status(400);
        expect(res.body.code).to.eql(code);
      }
      // Four tries used; the fifth, right, still signs in.
      expect(await secondStep(pending, { code: right })).to.have.status(200);
    });
  });

  describe('with a recovery code', () => {
    it('signs in once with each code, and the account has one code fewer', async () => {
      const alice = await account();
      const { codes } = await enrolTotp(alice);
      expect((await mfa(alice, 'get', '')).body.codesLeft).to.eql(10);

      // Typed in capitals and without the dash, as people do.
      const typed = codes[0]!.replace('-', '').toUpperCase();
      const res = await secondStep((await passwordStep(alice)).pending, { recoveryCode: typed });
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      const signedIn = { token: sessionToken(res)! };
      expect((await mfa(signedIn, 'get', '')).body.codesLeft).to.eql(9);

      const again = await secondStep((await passwordStep(alice)).pending, { recoveryCode: codes[0] });
      expect(again).to.have.status(401);
      expect(again.body.code).to.eql('recovery-code-wrong');
      expect(await secondStep((await passwordStep(alice)).pending, { recoveryCode: codes[1] })).to.have.status(200);
    });
  });

  describe('with a passkey as the second step', () => {
    it('signs in by answering the challenge the password step offered', async () => {
      const alice = await account();
      const { authenticator } = await addPasskey(alice);
      const step = await passwordStep(alice);
      expect(step.methods).to.eql({ totp: false, passkey: true, recovery: true });
      expect(step.passkeyOptions!.allowCredentials!.map((entry) => entry.id)).to.eql([authenticator.id]);

      // Another challenge, a spoilt signature, another origin: refused.
      for (const twist of [
        { challenge: 'not-the-offered-challenge' },
        { badSignature: true },
        { origin: 'https://evil.example' }
      ]) {
        const res = await secondStep(step.pending, {
          passkey: authenticator.assert(step.passkeyOptions!.challenge, twist)
        });
        expect(res, JSON.stringify(twist)).to.have.status(401);
        expect(res.body.code).to.eql('passkey-failed');
      }
      // User verification is preferred, not required: the password was the first step.
      const res = await secondStep(step.pending, {
        passkey: authenticator.assert(step.passkeyOptions!.challenge, { userVerified: false })
      });
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      expect((await verify(sessionToken(res))).body).to.include({ email: alice.email, mfa: true });
    });
  });

  describe('passkey-first sign-in', () => {
    it('signs in with a passkey alone when the user was verified', async () => {
      const alice = await account();
      const { authenticator } = await addPasskey(alice);
      const options = await passkeyOptions();
      const res = await passkeySignIn(authenticator.assert(options.challenge));
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      expect(res.body).to.include({ code: 'signed-in', email: alice.email });
      expect((await verify(sessionToken(res))).body).to.include({ email: alice.email, mfa: true });
      const stored = (await User.findById(alice.user._id).lean())!.mfa!.passkeys[0]!;
      expect(stored.counter).to.eql(authenticator.counter);
      expect(stored.lastUsedAt).to.be.instanceOf(Date);
    });

    it('requires user verification', async () => {
      const alice = await account();
      const { authenticator } = await addPasskey(alice);
      const res = await passkeySignIn(
        authenticator.assert((await passkeyOptions()).challenge, { userVerified: false })
      );
      expect(res).to.have.status(401);
      expect(res.body.code).to.eql('passkey-failed');
      expect(sessionToken(res)).to.eql(null);
    });

    it('refuses a passkey no account has', async () => {
      const alice = await account();
      const { authenticator } = await addPasskey(alice);
      const stranger = soft();
      // A passkey made for this site, but never added to an account.
      stranger.userHandle = authenticator.userHandle;
      const res = await passkeySignIn(stranger.assert((await passkeyOptions()).challenge));
      expect(res).to.have.status(401);
      expect(res.body.code).to.eql('passkey-unknown');
      // The account's passkey with another account's handle is not found either.
      const handle = Buffer.alloc(16, 7).toString('base64url');
      const swapped = await passkeySignIn(
        authenticator.assert((await passkeyOptions()).challenge, { userHandle: handle })
      );
      expect(swapped.body.code).to.eql('passkey-unknown');
    });

    it('refuses another origin, another relying party, and a counter that went back', async () => {
      const alice = await account();
      const { authenticator } = await addPasskey(alice);
      expect(await passkeySignIn(authenticator.assert((await passkeyOptions()).challenge))).to.have.status(200);
      for (const twist of [
        { origin: 'https://glazecalcapp.com.evil.example' },
        { rpId: 'evil.example' },
        { counter: 1 }
      ]) {
        const res = await passkeySignIn(authenticator.assert((await passkeyOptions()).challenge, twist));
        expect(res, JSON.stringify(twist)).to.have.status(401);
        expect(res.body.code).to.eql('passkey-failed');
      }
    });

    it('asks for options with a limit of its own, not the sign-in limit', async () => {
      // Pages ask on every load where passkey autofill works; that must not use up password sign-ins.
      expect(limits.passkeyOptions).to.not.equal(limits.signIn);
      const reset = () =>
        Promise.all([limits.passkeyOptions.resetKey('127.0.0.1'), limits.signIn.resetKey('127.0.0.1')]);
      await reset();
      process.env.RATE_LIMITS = 'on';
      try {
        // More than signIn's 20 per 15 minutes.
        for (let i = 0; i < 25; i++) expect(await api().post('/signin/passkey/options')).to.have.status(200);
        const alice = await account();
        const res = await api().get('/signin').set('Authorization', basic(alice.email, alice.password));
        expect(res).to.have.status(200);
        // It still has a limit: 100 per 15 minutes.
        for (let i = 25; i < 100; i++) expect(await api().post('/signin/passkey/options')).to.have.status(200);
        const limited = await api().post('/signin/passkey/options');
        expect(limited).to.have.status(429);
        expect(limited.body.code).to.eql('too-many-sign-ins');
      } finally {
        process.env.RATE_LIMITS = 'off';
        await reset();
      }
    });
  });

  describe('a pending request to turn two-step sign-in off', () => {
    const requested = async (who: Account) => {
      const when = new Date(Date.now() - (WAIT_DAYS + 1) * DAY);
      expect((await notify(who.email, when)).ok).to.eql(true);
      return when;
    };
    const clearRequestedAt = async (who: Account) => (await User.findById(who.user._id).lean())!.mfa?.clearRequestedAt;

    it('is cancelled by a second step, so a later --clear is refused', async () => {
      const alice = await account();
      const { secret } = await enrolTotp(alice);
      await requested(alice);
      const { pending } = await passwordStep(alice);
      // A wrong code cancels nothing.
      expect(await secondStep(pending, { code: '000000' })).to.have.status(401);
      expect(await clearRequestedAt(alice)).to.be.instanceOf(Date);

      expect(await secondStep(pending, { code: await codeNow(alice, secret) })).to.have.status(200);
      expect(await clearRequestedAt(alice)).to.eql(undefined);
      const outcome = await clear(alice.email);
      expect(outcome.ok).to.eql(false);
      expect(outcome.message).to.match(/--notify first/);
      expect((await User.findById(alice.user._id).lean())!.mfa!.totp).to.not.eql(undefined);
    });

    it('is cancelled by a passkey-first sign-in', async () => {
      const alice = await account();
      const { authenticator } = await addPasskey(alice);
      await requested(alice);
      expect(await passkeySignIn(authenticator.assert((await passkeyOptions()).challenge))).to.have.status(200);
      expect(await clearRequestedAt(alice)).to.eql(undefined);
      expect((await clear(alice.email)).ok).to.eql(false);
    });

    it('does not outlive two-step sign-in being turned off and on again', async () => {
      const alice = await account();
      const first = await enrolTotp(alice);
      await requested(alice);
      const removed = await api()
        .delete('/mfa/totp')
        .set('Authorization', 'Bearer ' + alice.token)
        .send({ password: alice.password, code: await codeNow(alice, first.secret) });
      expect(removed.body.code).to.eql('mfa-off');
      follow(alice, removed);
      expect(await clearRequestedAt(alice)).to.eql(undefined);
      // As an account left from before turning it off cleared the request would have it.
      await User.updateOne({ _id: alice.user._id }, { $set: { 'mfa.clearRequestedAt': new Date(0) } });
      await enrolTotp(alice);
      expect(await clearRequestedAt(alice)).to.eql(undefined);
      // Turned on again, with no notice since: --clear must not run at once.
      expect((await clear(alice.email)).ok).to.eql(false);
    });
  });
});
