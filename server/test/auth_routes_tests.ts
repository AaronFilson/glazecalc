import type { IncomingHttpHeaders } from 'node:http';
import jwt from 'jsonwebtoken';
import type { PasskeyRequestOptionsResponse, SecondStepResponse } from '../../lib/mfa.js';
import appSecret from '../lib/app_secret.ts';
import * as secondStep from '../lib/second_step.ts';
import AuthChallenge from '../models/auth_challenge.ts';
import PendingSignIn from '../models/pending_sign_in.ts';
import User, { type UserDocument } from '../models/user.ts';
import { api, expect, makeUser, sessionToken, uniqueEmail } from './support/app.ts';
import * as mail from './support/mail.ts';

const basic = (address: string, password: string) =>
  'Basic ' + Buffer.from(address + ':' + password).toString('base64');
const signIn = (address: string, password: string) =>
  api().get('/signin').set('Authorization', basic(address, password));
const verify = (token: string | null) =>
  api()
    .get('/verify')
    .set('Authorization', 'Bearer ' + token);

// Creating an account and signing in. Sign-in by email whatever its case, and
// login tokens, are covered in ownership_tests.ts.
describe('sign-up and sign-in API', () => {
  it('creates an account and signs the browser in with an httpOnly session cookie', async () => {
    const address = uniqueEmail();
    const res = await api().post('/signup').send({ email: address, password: 'password' });
    expect(res).to.have.status(200);
    expect(res.body).to.eql({ email: address });
    const cookie = ([] as string[]).concat(res.headers['set-cookie']).join();
    // A session cookie, ended with the browser session (session_cookie_tests.ts has the kept kind).
    expect(cookie).to.match(/glazecalc_session=[^;]+; Path=\/api; HttpOnly; SameSite=Strict/);

    const me = await verify(sessionToken(res));
    expect(me).to.have.status(200);
    expect(me.body.email).to.eql(address);
    expect(await signIn(address, 'password')).to.have.status(200);
  });

  it('asks for an email when the sign-up has none', async () => {
    for (const body of [null, { trashdata: 'not anything good' }]) {
      // A null body is sent on purpose; superagent's types only allow objects.
      const res = await api()
        .post('/signup')
        .send(body as object);
      expect(res).to.have.status(400);
      expect(res.body).to.eql({ code: 'email-required', msg: 'Please enter an email', field: 'email' });
    }
  });

  describe('with an account', () => {
    let email: string;
    let password: string;

    beforeEach(async () => {
      ({ email, password } = await makeUser());
    });

    it('signs in with the right password and sets the session cookie', async () => {
      const res = await signIn(email, password);
      expect(res).to.have.status(200);
      expect(res.body).to.eql({ code: 'signed-in', msg: 'Success in signin', email, kept: 0 });
      expect(await verify(sessionToken(res))).to.have.status(200);
    });

    it('refuses a wrong password without a token', async () => {
      const res = await signIn(email, 'NOT' + password);
      expect(res).to.have.status(401);
      expect(res.body).to.eql({ code: 'sign-in-failed', msg: 'Email or password is incorrect.' });
    });
  });

  it('refuses a sign-in without credentials, and keeps serving', async () => {
    const noColon = 'Basic ' + Buffer.from('no-colon-here').toString('base64');
    // No header, no credentials after "Basic", an empty password, and no colon.
    for (const header of [undefined, 'Basic', basic('nopassword@tester.com', ''), noColon]) {
      const req = api().get('/signin');
      if (header !== undefined) req.set('Authorization', header);
      const res = await req;
      expect(res, String(header)).to.have.status(401);
      expect(res.body.msg).to.eql('could not authenticate user');
    }
  });
});

describe('sign-in sessions', () => {
  it('reads the token from the session cookie or a Bearer header, not the old token header', async () => {
    const { token, email } = await makeUser();
    const byCookie = await api()
      .get('/verify')
      .set('Cookie', 'theme=dark; glazecalc_session=' + token);
    expect(byCookie).to.have.status(200);
    expect(byCookie.body.email).to.eql(email);
    expect((await verify(token)).body.email).to.eql(email);

    expect(await api().get('/recipe/getAll').set('token', token)).to.have.status(401);
    // Basic credentials (sign-in) or a broken Bearer value are not a token.
    expect(await api().get('/recipe/getAll').set('Authorization', 'Bearer not-a-token')).to.have.status(401);
    expect(
      await api()
        .get('/recipe/getAll')
        .set('Authorization', 'Basic ' + token)
    ).to.have.status(401);
  });

  it('signs out by clearing the cookie', async () => {
    const res = await api().post('/signout');
    expect(res).to.have.status(200);
    expect(([] as string[]).concat(res.headers['set-cookie']).join()).to.match(
      /glazecalc_session=; Path=\/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict/
    );
    expect(sessionToken(res)).to.eql(null);
  });

  it('refuses changes that a browser says come from another site', async () => {
    const { token } = await makeUser();
    const note = { content: 'Hello', relatedCollection: 'Notes', relatedId: 'general notes' };
    const post = (headers: IncomingHttpHeaders) =>
      api()
        .post('/notes/create')
        .set('Authorization', 'Bearer ' + token)
        .set(headers)
        .send(note);

    for (const headers of [
      { 'Sec-Fetch-Site': 'cross-site' },
      { 'Sec-Fetch-Site': 'same-site' },
      { Origin: 'https://evil.example' }
    ]) {
      const res = await post(headers);
      expect(res, JSON.stringify(headers)).to.have.status(403);
      expect(res.body.msg).to.eql('Requests from other sites are not accepted.');
    }
    // The app's own pages, someone typing an address, and scripts that say nothing.
    for (const headers of [{ 'Sec-Fetch-Site': 'same-origin' }, { 'Sec-Fetch-Site': 'none' }, {}]) {
      expect(await post(headers), JSON.stringify(headers)).to.have.status(200);
    }
    const sameHost = await api().get('/health');
    const host = new URL(sameHost.request.url).host;
    expect(await post({ Origin: 'http://' + host })).to.have.status(200);
    // Reading is always allowed; only changes are checked.
    const read = await api()
      .get('/notes/getAll')
      .set('Authorization', 'Bearer ' + token)
      .set('Sec-Fetch-Site', 'cross-site');
    expect(read).to.have.status(200);
  });
});

// Two-step sign-in (docs/mfa-plan.md, item 9 and decision 2). The factor
// checks are stream A's (server/lib/factors.ts, server/lib/webauthn.ts); here
// they are stood in for through second_step.checks, so these tests are about
// the flow: the pending token, its record, the session and the trial. The
// checks themselves are tested in A's files and end to end in e2e/mfa.spec.js.
describe('two-step sign-in', () => {
  const real = { ...secondStep.checks };
  const GOOD_CODE = '123456';
  /** What the stand-in checkFactor was given. */
  let factorCalls: Array<{ proof: unknown; passkeyChallenge?: string }>;
  /** What the stand-in verifyAuthentication was given. */
  let passkeyCalls: Array<{ challenge: string; requireUserVerification: boolean }>;
  let challenges = 0;

  beforeEach(() => {
    factorCalls = [];
    passkeyCalls = [];
    Object.assign(secondStep.checks, {
      checkFactor: async (user: UserDocument, proof: unknown, options?: { passkeyChallenge?: string }) => {
        factorCalls.push({ proof, ...(options?.passkeyChallenge && { passkeyChallenge: options.passkeyChallenge }) });
        const body = proof as { code?: string; recoveryCode?: string; passkey?: unknown };
        if (body.code === GOOD_CODE) return { ok: true, kind: 'totp' };
        if (body.recoveryCode === 'abcde-fghjk') return { ok: true, kind: 'recovery', codesLeft: 9 };
        if (body.passkey) {
          // A stand-in assertion with bad: true fails, as a spoilt signature would.
          return options?.passkeyChallenge && !(body.passkey as { bad?: boolean }).bad
            ? { ok: true, kind: 'passkey' }
            : { ok: false, code: 'passkey-failed' };
        }
        if (body.code !== undefined) return { ok: false, code: 'code-wrong' };
        return { ok: false, code: 'factor-needed' };
      },
      authenticationOptions: async (passkeys: unknown[] | null, userVerification: 'preferred' | 'required') => ({
        challenge: 'challenge-' + Date.now() + '-' + challenges++,
        rpId: 'glazecalc.test',
        userVerification,
        ...(passkeys && { allowCredentials: passkeys.map(() => ({ id: 'x', type: 'public-key' as const })) })
      }),
      // A stand-in response carries its challenge and credential id in plain view.
      challengeOf: (response: { response?: { clientDataJSON?: unknown } }) =>
        typeof response.response?.clientDataJSON === 'string' ? response.response.clientDataJSON : null,
      accountOf: async (response: { id?: unknown }) =>
        typeof response.id === 'string' ? User.findOne({ 'mfa.passkeys.credentialId': response.id }) : null,
      verifyAuthentication: async (
        user: UserDocument,
        response: { response?: { signature?: unknown } },
        challenge: string,
        requireUserVerification: boolean
      ) => {
        passkeyCalls.push({ challenge, requireUserVerification });
        return response.response?.signature === 'good';
      }
    } as unknown as typeof secondStep.checks);
  });
  afterEach(() => {
    Object.assign(secondStep.checks, real);
  });

  /** An account with an authenticator app (and a passkey, when asked), and its password. */
  const mfaUser = async ({ passkey = false, totp = true } = {}) => {
    const made = await makeUser();
    const credentialId = 'cred-' + made.user.id;
    await User.updateOne(
      { _id: made.user._id },
      {
        $set: {
          mfa: {
            handle: 'handle-' + made.user.id,
            ...(totp && { totp: { secret: 'v1.not.a.secret', lastStep: 0, addedAt: new Date() } }),
            passkeys: passkey
              ? [{ credentialId, publicKey: Buffer.from('key'), counter: 0, name: 'Laptop', addedAt: new Date() }]
              : [],
            recoveryCodes: [{ hash: 'h1' }, { hash: 'h2', usedAt: new Date() }]
          }
        }
      }
    );
    return { ...made, credentialId };
  };

  const KEEP = { 'X-Keep-Signed-In': '1' };
  const finish = (pending: unknown, proof: Record<string, unknown>, headers: Record<string, string> = {}) =>
    api()
      .post('/signin/second-step')
      .set(headers)
      .send({ pending, ...proof });
  const passwordStep = async (address: string, pw: string) => {
    const res = await signIn(address, pw);
    expect(res).to.have.status(200);
    expect(res.body.code).to.eql('second-step');
    return res.body as SecondStepResponse;
  };
  const cookies = (res: { headers: Record<string, unknown> }) =>
    ([] as unknown[]).concat(res.headers['set-cookie'] ?? []);

  describe('with two-step sign-in off', () => {
    it('signs in with the password alone, as before, and /verify does not say mfa', async () => {
      const { email, password, user } = await makeUser();
      const res = await signIn(email, password);
      expect(res.body).to.eql({ code: 'signed-in', msg: 'Success in signin', email, kept: 0 });
      const me = await verify(sessionToken(res));
      expect(me).to.have.status(200);
      expect(me.body).to.not.have.property('mfa');
      expect(await PendingSignIn.countDocuments({ userId: user._id })).to.eql(0);
    });
  });

  describe('the password step', () => {
    it('sets no cookie and answers with the factors and a pending token', async () => {
      const { email, password, user } = await mfaUser();
      const res = await signIn(email, password);
      expect(res).to.have.status(200);
      expect(res.headers).to.not.have.property('set-cookie');
      const body = res.body as SecondStepResponse;
      expect(body.code).to.eql('second-step');
      expect(body.methods).to.eql({ totp: true, passkey: false, recovery: true });
      expect(body).to.not.have.property('passkeyOptions');
      expect(body).to.not.have.property('email');
      const left = new Date(body.expiresAt).getTime() - Date.now();
      expect(left).to.be.within(4.9 * 60 * 1000, 5 * 60 * 1000);

      const claims = jwt.verify(body.pending, appSecret, { audience: secondStep.AUDIENCE }) as jwt.JwtPayload;
      expect(claims).to.include({ sub: user.id, tv: 0, typ: 'second-step', aud: 'glazecalc:second-step' });
      expect(claims).to.not.have.property('id');
      expect(claims.exp! * 1000).to.eql(new Date(body.expiresAt).getTime());
      const record = await PendingSignIn.findOne({ tokenId: claims.jti });
      expect(record).to.include({ tokenVersion: 0, keep: false, attempts: 0 });
      expect(record!.expiresAt.getTime()).to.eql(new Date(body.expiresAt).getTime());
      expect(record!.usedAt).to.eql(undefined);
    });

    it('offers the passkeys, with user verification preferred, and keeps the challenge on the record', async () => {
      const { email, password } = await mfaUser({ passkey: true, totp: false });
      const body = await passwordStep(email, password);
      expect(body.methods).to.eql({ totp: false, passkey: true, recovery: true });
      expect(body.passkeyOptions).to.include({ userVerification: 'preferred' });
      expect(body.passkeyOptions!.allowCredentials).to.have.length(1);
      const { jti } = jwt.decode(body.pending) as jwt.JwtPayload;
      expect((await PendingSignIn.findOne({ tokenId: jti }))!.challenge).to.eql(body.passkeyOptions!.challenge);
    });

    it('still answers a wrong password with sign-in-failed', async () => {
      const { email } = await mfaUser();
      const res = await signIn(email, 'wrong-password');
      expect(res).to.have.status(401);
      expect(res.body.code).to.eql('sign-in-failed');
    });

    it('gives a token that is never taken as a sign-in', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      expect(await verify(pending)).to.have.status(401);
      expect(
        await api()
          .get('/verify')
          .set('Cookie', 'glazecalc_session=' + pending)
      ).to.have.status(401);
      expect(
        await api()
          .get('/recipe/getAll')
          .set('Authorization', 'Bearer ' + pending)
      ).to.have.status(401);
    });
  });

  describe('the second step', () => {
    it('finishes with a code: starts the session, and /verify says mfa', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      const res = await finish(pending, { code: GOOD_CODE });
      expect(res).to.have.status(200);
      expect(res.body).to.eql({ code: 'signed-in', msg: 'Success in signin', email, kept: 0 });
      // Only the factor goes to the check, not the pending token.
      expect(factorCalls).to.eql([{ proof: { code: GOOD_CODE } }]);
      const me = await verify(sessionToken(res));
      expect(me).to.have.status(200);
      expect(me.body).to.include({ email, mfa: true });
    });

    it('finishes with a recovery code, or a passkey answering the offered challenge', async () => {
      const { email, password } = await mfaUser({ passkey: true });
      const first = await passwordStep(email, password);
      expect(await finish(first.pending, { recoveryCode: 'abcde-fghjk' })).to.have.status(200);

      const second = await passwordStep(email, password);
      const res = await finish(second.pending, { passkey: { id: 'cred', response: {} } });
      expect(res).to.have.status(200);
      expect(factorCalls[1]).to.eql({
        proof: { passkey: { id: 'cred', response: {} } },
        passkeyChallenge: second.passkeyOptions!.challenge
      });
    });

    it('refuses a wrong code, and asks for the password again after 5 tries', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      for (let i = 0; i < 4; i++) {
        const res = await finish(pending, { code: '000000' });
        expect(res, 'try ' + (i + 1)).to.have.status(401);
        expect(res.body.code).to.eql('code-wrong');
        expect(sessionToken(res)).to.eql(null);
      }
      const fifth = await finish(pending, { code: '000000' });
      expect(fifth).to.have.status(401);
      expect(fifth.body.code).to.eql('second-step-tries');
      // Even the right code no longer helps, and it is not checked.
      const calls = factorCalls.length;
      const after = await finish(pending, { code: GOOD_CODE });
      expect(after).to.have.status(401);
      expect(after.body.code).to.eql('second-step-tries');
      expect(sessionToken(after)).to.eql(null);
      expect(factorCalls).to.have.length(calls);
      // A new password step starts again.
      const again = await passwordStep(email, password);
      expect(await finish(again.pending, { code: GOOD_CODE })).to.have.status(200);
    });

    it('checks one try at a time: tries sent at the same moment are counted or turned away', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      const { jti } = jwt.decode(pending) as jwt.JwtPayload;
      const results = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map(() => finish(pending, { code: '000000' })));
      // Never more than 5 checks, however the requests interleave, and each check counted.
      expect(factorCalls.length).to.be.within(1, 5);
      expect((await PendingSignIn.findOne({ tokenId: jti }))!.attempts).to.eql(factorCalls.length);
      for (const res of results) {
        expect(['code-wrong', 'second-step-busy', 'second-step-tries']).to.include(res.body.code);
        expect(res.status).to.eql(res.body.code === 'second-step-busy' ? 409 : 401);
        expect(sessionToken(res)).to.eql(null);
      }
      // The rest of the 5 tries, then the password again.
      while (factorCalls.length < 5) await finish(pending, { code: '000000' });
      expect((await finish(pending, { code: GOOD_CODE })).body.code).to.eql('second-step-tries');
    });

    it('turns away a try while another is being checked, without counting or checking it', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      const { jti } = jwt.decode(pending) as jwt.JwtPayload;
      let open = () => {};
      const gate = new Promise<void>((resolve) => (open = resolve));
      const check = secondStep.checks.checkFactor;
      secondStep.checks.checkFactor = async (...args) => {
        await gate;
        return check(...args);
      };
      const first = finish(pending, { code: '000000' }).then((res) => res);
      while (!(await PendingSignIn.findOne({ tokenId: jti, holdId: { $exists: true } }))) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      const second = await finish(pending, { recoveryCode: 'abcde-fghjk' });
      expect(second).to.have.status(409);
      expect(second.body.code).to.eql('second-step-busy');
      open();
      expect((await first).body.code).to.eql('code-wrong');
      // Only the first was counted and checked; the record is free again.
      expect(factorCalls.map((call) => call.proof)).to.eql([{ code: '000000' }]);
      const record = (await PendingSignIn.findOne({ tokenId: jti }).lean())!;
      expect(record.attempts).to.eql(1);
      expect(record.holdId).to.eql(undefined);
      expect(await finish(pending, { recoveryCode: 'abcde-fghjk' })).to.have.status(200);
    });

    it('finishes a sign-in whose right factor was checked as it expired, so the factor is not wasted', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      const { jti } = jwt.decode(pending) as jwt.JwtPayload;
      const check = secondStep.checks.checkFactor;
      secondStep.checks.checkFactor = async (...args) => {
        // The pending sign-in runs out while the code is checked (and used up).
        await PendingSignIn.updateOne({ tokenId: jti }, { expiresAt: new Date(Date.now() - 1000) });
        return check(...args);
      };
      const res = await finish(pending, { recoveryCode: 'abcde-fghjk' });
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      expect(sessionToken(res)).to.be.a('string');
      // MongoDB may delete an expired record at any moment: that does not undo a hold either.
      secondStep.checks.checkFactor = async (...args) => {
        await PendingSignIn.deleteOne({ tokenId: (jwt.decode(again.pending) as jwt.JwtPayload).jti });
        return check(...args);
      };
      const again = await passwordStep(email, password);
      expect(await finish(again.pending, { code: GOOD_CODE })).to.have.status(200);
    });

    it('lets the hold of a try that never came back run out', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      const { jti } = jwt.decode(pending) as jwt.JwtPayload;
      await PendingSignIn.updateOne(
        { tokenId: jti },
        { holdId: 'lost', heldUntil: new Date(Date.now() + 10_000), $inc: { attempts: 1 } }
      );
      expect((await finish(pending, { code: GOOD_CODE })).body.code).to.eql('second-step-busy');
      await PendingSignIn.updateOne({ tokenId: jti }, { heldUntil: new Date(Date.now() - 1) });
      expect(await finish(pending, { code: GOOD_CODE })).to.have.status(200);
    });

    it('takes the passkey challenge with a passkey try, and offers a new one after a failed try', async () => {
      const { email, password } = await mfaUser({ passkey: true });
      const step = await passwordStep(email, password);
      const offered = step.passkeyOptions!.challenge;
      const { jti } = jwt.decode(step.pending) as jwt.JwtPayload;
      // A code try leaves the challenge on the record.
      const wrongCode = await finish(step.pending, { code: '000000' });
      expect(wrongCode.body.passkeyOptions).to.eql(undefined);
      expect((await PendingSignIn.findOne({ tokenId: jti }))!.challenge).to.eql(offered);

      const failed = await finish(step.pending, { passkey: { id: 'cred', response: {}, bad: true } });
      expect(failed).to.have.status(401);
      expect(failed.body.code).to.eql('passkey-failed');
      const next = failed.body.passkeyOptions.challenge;
      expect(next).to.be.a('string').and.not.eql(offered);
      expect(failed.body.passkeyOptions.userVerification).to.eql('preferred');
      expect((await PendingSignIn.findOne({ tokenId: jti }))!.challenge).to.eql(next);

      expect(await finish(step.pending, { passkey: { id: 'cred', response: {} } })).to.have.status(200);
      expect(factorCalls.map((call) => call.passkeyChallenge)).to.eql([undefined, offered, next]);
    });

    it('checks a passkey try against no challenge once the last one was taken', async () => {
      const { email, password } = await mfaUser({ passkey: true });
      const step = await passwordStep(email, password);
      const { jti } = jwt.decode(step.pending) as jwt.JwtPayload;
      // As if the try that took the challenge never came back with a new one.
      await PendingSignIn.updateOne({ tokenId: jti }, { $unset: { challenge: 1 } });
      const res = await finish(step.pending, { passkey: { id: 'cred', response: {} } });
      expect(res.body.code).to.eql('passkey-failed');
      expect(factorCalls[0]!.passkeyChallenge).to.eql(undefined);
    });

    it('answers a missing factor with 400 and counts it', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      const res = await finish(pending, {});
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('factor-needed');
      const { jti } = jwt.decode(pending) as jwt.JwtPayload;
      expect((await PendingSignIn.findOne({ tokenId: jti }))!.attempts).to.eql(1);
    });

    it('takes a token once', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      expect(await finish(pending, { code: GOOD_CODE })).to.have.status(200);
      const again = await finish(pending, { code: GOOD_CODE });
      expect(again).to.have.status(401);
      expect(again.body.code).to.eql('second-step-expired');
      expect(sessionToken(again)).to.eql(null);
    });

    it('signs in once when right answers race each other', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      const results = await Promise.all([1, 2, 3, 4].map(() => finish(pending, { code: GOOD_CODE })));
      expect(results.filter((res) => res.status === 200)).to.have.length(1);
      expect(results.filter((res) => sessionToken(res))).to.have.length(1);
    });

    it('refuses an expired pending sign-in, by its record or by its token', async () => {
      const { email, password, user } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      const { jti } = jwt.decode(pending) as jwt.JwtPayload;
      await PendingSignIn.updateOne({ tokenId: jti }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const byRecord = await finish(pending, { code: GOOD_CODE });
      expect(byRecord).to.have.status(401);
      expect(byRecord.body.code).to.eql('second-step-expired');

      // A token past its exp, for a record that is still current.
      const begun = await secondStep.begin(user, { keep: false });
      const claims = jwt.decode(begun.token) as jwt.JwtPayload;
      const stale = jwt.sign(
        { sub: claims.sub, tv: claims.tv, typ: 'second-step', exp: Math.floor(Date.now() / 1000) - 10 },
        appSecret,
        { audience: secondStep.AUDIENCE, jwtid: claims.jti }
      );
      const byToken = await finish(stale, { code: GOOD_CODE });
      expect(byToken).to.have.status(401);
      expect(byToken.body.code).to.eql('second-step-expired');
      // The genuine token still works.
      expect(await finish(begun.token, { code: GOOD_CODE })).to.have.status(200);
    });

    it('refuses a tampered token, another audience, another type, or a sign-in token', async () => {
      const { email, password, token: signInToken } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      const claims = jwt.decode(pending) as jwt.JwtPayload;
      const resign = (payload: object, secret: string, audience?: string) =>
        jwt.sign(payload, secret, { ...(audience && { audience }), jwtid: claims.jti!, expiresIn: 60 });
      const base = { sub: claims.sub, tv: claims.tv, typ: 'second-step' };
      const [head, body, signature] = pending.split('.') as [string, string, string];
      const flipped = signature.slice(0, -2) + (signature.endsWith('AA') ? 'BB' : 'AA');
      const changedBody = Buffer.from(JSON.stringify({ ...claims, sub: String(signInToken.length) })).toString(
        'base64url'
      );
      const unsigned =
        Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' + body + '.';
      const cases: Array<[string, unknown]> = [
        ['bad signature', head + '.' + body + '.' + flipped],
        ['changed claims', head + '.' + changedBody + '.' + signature],
        ['another secret', resign(base, 'not-the-app-secret', secondStep.AUDIENCE)],
        ['another audience', resign(base, appSecret, 'glazecalc:something-else')],
        ['no audience', resign(base, appSecret)],
        ['another type', resign({ ...base, typ: 'reset' }, appSecret, secondStep.AUDIENCE)],
        ['a sign-in token', signInToken],
        ['unsigned', unsigned],
        ['nothing', undefined],
        ['not a string', 42]
      ];
      for (const [label, bad] of cases) {
        const res = await finish(bad, { code: GOOD_CODE });
        expect(res, label).to.have.status(401);
        expect(res.body.code, label).to.eql('second-step-expired');
      }
      // None of them got as far as a check, or used the record.
      expect(factorCalls).to.eql([]);
      expect(await finish(pending, { code: GOOD_CODE })).to.have.status(200);
    });

    it('refuses a token naming another account than its record', async () => {
      const a = await mfaUser();
      const b = await mfaUser();
      const { pending } = await passwordStep(a.email, a.password);
      const claims = jwt.decode(pending) as jwt.JwtPayload;
      const swapped = jwt.sign({ sub: b.user.id, tv: 0, typ: 'second-step' }, appSecret, {
        audience: secondStep.AUDIENCE,
        jwtid: claims.jti!,
        expiresIn: 60
      });
      expect((await finish(swapped, { code: GOOD_CODE })).body.code).to.eql('second-step-expired');
    });

    it('ends when the token version changes in between (a sign-out everywhere)', async () => {
      const { email, password, user } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
      const res = await finish(pending, { code: GOOD_CODE });
      expect(res).to.have.status(401);
      expect(res.body.code).to.eql('second-step-expired');
      expect(factorCalls).to.eql([]);
    });

    it('still asks for a second step after a password reset, and the reset ends a pending one', async () => {
      const { email, password } = await mfaUser();
      const { pending } = await passwordStep(email, password);
      expect(await api().post('/password/forgot').send({ email })).to.have.status(200);
      const sent = await mail.waitFor(email, 1);
      const resetRes = await api()
        .post('/password/reset')
        .send({ token: mail.tokenIn(sent[sent.length - 1]!), password: 'a-new-password' });
      expect(resetRes).to.have.status(200);
      expect(sessionToken(resetRes)).to.eql(null);
      expect((await finish(pending, { code: GOOD_CODE })).body.code).to.eql('second-step-expired');

      const after = await passwordStep(email, 'a-new-password');
      expect(after.methods.totp).to.eql(true);
      expect(await finish(after.pending, { code: GOOD_CODE })).to.have.status(200);
    });

    it('brings a trial on this browser into the account only once the second step is done', async () => {
      const { email, password } = await mfaUser();
      const trial = await api().post('/guest').send({});
      const trialToken = sessionToken(trial)!;
      const note = await api()
        .post('/notes/create')
        .set('Authorization', 'Bearer ' + trialToken)
        .send({ content: 'Hello', relatedCollection: 'Notes', relatedId: 'general notes' });
      expect(note).to.have.status(200);

      const step = await signIn(email, password).set('Cookie', 'glazecalc_session=' + trialToken);
      expect(step.body.code).to.eql('second-step');
      // Not merged yet: the trial still works.
      expect(await verify(trialToken)).to.have.status(200);

      const res = await finish(step.body.pending, { code: GOOD_CODE });
      expect(res.body).to.include({ code: 'signed-in', kept: 1 });
      expect(await verify(trialToken)).to.have.status(401);
    });

    it('slows down tries at one account from any number of pending sign-ins', async () => {
      process.env.RATE_LIMITS = 'on';
      try {
        const { user } = await mfaUser();
        const tokens = await Promise.all([1, 2, 3].map(() => secondStep.begin(user, { keep: false })));
        const statuses: number[] = [];
        for (let i = 0; i < 11; i++) {
          statuses.push((await finish(tokens[Math.floor(i / 4)]!.token, { code: '000000' })).status);
        }
        expect(statuses.slice(0, 10)).to.not.include(429);
        expect(statuses[10]).to.eql(429);
        const limited = await finish(tokens[2]!.token, { code: GOOD_CODE });
        expect(limited).to.have.status(429);
        expect(limited.body.code).to.eql('too-many-codes');
      } finally {
        process.env.RATE_LIMITS = 'off';
      }
    });
  });

  describe('passkey-first sign-in', () => {
    const options = async () => {
      const res = await api().post('/signin/passkey/options');
      expect(res).to.have.status(200);
      return (res.body as PasskeyRequestOptionsResponse).options;
    };
    const assertion = (credentialId: string, challenge: string, signature = 'good') => ({
      id: credentialId,
      rawId: credentialId,
      type: 'public-key',
      response: { clientDataJSON: challenge, signature },
      clientExtensionResults: {}
    });
    const passkeySignIn = (response: unknown, headers: Record<string, string> = {}) =>
      api().post('/signin/passkey').set(headers).send({ response });

    it('gives options for any passkey, with user verification required, and keeps the challenge', async () => {
      const opts = await options();
      expect(opts.userVerification).to.eql('required');
      expect(opts).to.not.have.property('allowCredentials');
      const record = await AuthChallenge.findOne({ challenge: opts.challenge });
      expect(record).to.include({ kind: 'passkey-signin', attempts: 0 });
      expect(record!.userId).to.eql(undefined);
      expect(record!.expiresAt.getTime() - Date.now()).to.be.within(4.9 * 60 * 1000, 5 * 60 * 1000);
    });

    it('signs in with a passkey alone, as both steps, keeping the sign-in when asked', async () => {
      const { email, credentialId } = await mfaUser({ passkey: true });
      const opts = await options();
      const res = await passkeySignIn(assertion(credentialId, opts.challenge), KEEP);
      expect(res).to.have.status(200);
      expect(res.body).to.eql({ code: 'signed-in', msg: 'Success in signin', email, kept: 0 });
      expect(passkeyCalls).to.eql([{ challenge: opts.challenge, requireUserVerification: true }]);
      expect(cookies(res).join()).to.match(/Max-Age=604800/);
      expect((await verify(sessionToken(res))).body).to.include({ email, mfa: true });
    });

    it('takes a challenge once', async () => {
      const { credentialId } = await mfaUser({ passkey: true });
      const opts = await options();
      expect(await passkeySignIn(assertion(credentialId, opts.challenge))).to.have.status(200);
      const again = await passkeySignIn(assertion(credentialId, opts.challenge));
      expect(again).to.have.status(401);
      expect(again.body.code).to.eql('passkey-failed');
      expect(sessionToken(again)).to.eql(null);
    });

    it('refuses an unknown passkey, a failed check, and a challenge it never gave', async () => {
      const { credentialId } = await mfaUser({ passkey: true });
      const unknown = await passkeySignIn(assertion('not-a-credential', (await options()).challenge));
      expect(unknown).to.have.status(401);
      expect(unknown.body.code).to.eql('passkey-unknown');

      const opts = await options();
      const failed = await passkeySignIn(assertion(credentialId, opts.challenge, 'bad'));
      expect(failed).to.have.status(401);
      expect(failed.body.code).to.eql('passkey-failed');
      expect(sessionToken(failed)).to.eql(null);
      // The challenge went with the failed try.
      expect((await passkeySignIn(assertion(credentialId, opts.challenge))).body.code).to.eql('passkey-failed');

      expect((await passkeySignIn(assertion(credentialId, 'challenge-from-nowhere'))).body.code).to.eql(
        'passkey-failed'
      );
      for (const body of [undefined, 'text', {}]) {
        expect((await passkeySignIn(body)).body.code).to.eql('passkey-failed');
      }
      expect(passkeyCalls).to.have.length(1);
    });

    it('refuses an expired challenge, and one of another kind', async () => {
      const { credentialId } = await mfaUser({ passkey: true });
      const opts = await options();
      await AuthChallenge.updateOne(
        { challenge: opts.challenge },
        { $set: { expiresAt: new Date(Date.now() - 1000) } }
      );
      expect((await passkeySignIn(assertion(credentialId, opts.challenge))).body.code).to.eql('passkey-failed');
      await AuthChallenge.create({
        kind: 'passkey-confirm',
        challenge: 'confirm-' + credentialId,
        expiresAt: new Date(Date.now() + 60000)
      });
      expect((await passkeySignIn(assertion(credentialId, 'confirm-' + credentialId))).body.code).to.eql(
        'passkey-failed'
      );
      expect(passkeyCalls).to.eql([]);
    });

    it('brings a trial on this browser into the account', async () => {
      const { credentialId } = await mfaUser({ passkey: true });
      const trial = await api().post('/guest').send({});
      const trialToken = sessionToken(trial)!;
      await api()
        .post('/notes/create')
        .set('Authorization', 'Bearer ' + trialToken)
        .send({ content: 'Hello', relatedCollection: 'Notes', relatedId: 'general notes' });
      const opts = await options();
      const res = await passkeySignIn(assertion(credentialId, opts.challenge), {
        Cookie: 'glazecalc_session=' + trialToken
      });
      expect(res.body).to.include({ code: 'signed-in', kept: 1 });
    });
  });
});
