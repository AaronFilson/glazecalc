import mongoose from 'mongoose';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/server';
import { PASSKEY_LIMIT } from '../../lib/mfa.js';
import { MFA_ADDED, MFA_OFF, MFA_REMOVED, RECOVERY_USED } from '../lib/account_mail.ts';
import * as factors from '../lib/factors.ts';
import * as mfaKey from '../lib/mfa_key.ts';
import * as limits from '../lib/rate_limit.ts';
import * as recoveryCodes from '../lib/recovery_codes.ts';
import * as site from '../lib/site.ts';
import * as totp from '../lib/totp.ts';
import * as webauthn from '../lib/webauthn.ts';
import AuthChallenge from '../models/auth_challenge.ts';
import User from '../models/user.ts';
import { api, expect, makeUser, sessionToken } from './support/app.ts';
import * as mail from './support/mail.ts';
import { SoftAuthenticator, type Twist } from './support/soft_authenticator.ts';

type Method = 'get' | 'post' | 'patch' | 'delete';
type Res = Awaited<ReturnType<ReturnType<typeof api>['get']>>;

/** An account under test; its token follows each renewed cookie. */
interface Account {
  user: Awaited<ReturnType<typeof makeUser>>['user'];
  token: string;
  email: string;
  password: string;
}

const account = async (): Promise<Account> => {
  const made = await makeUser();
  return { user: made.user, token: made.token, email: made.email, password: made.password };
};

const call = (account: Pick<Account, 'token'>, method: Method, path: string, body?: object): Promise<Res> => {
  const req = api()
    [method]('/mfa' + path)
    .set('Authorization', 'Bearer ' + account.token);
  return body ? req.send(body) : req;
};

/** Follows the new cookie a change sets: the old token no longer works. */
const follow = (account: Account, res: Res): void => {
  const token = sessionToken(res);
  expect(token, 'a renewed session cookie').to.be.a('string');
  account.token = token!;
};

const verify = (token: string) =>
  api()
    .get('/verify')
    .set('Authorization', 'Bearer ' + token);

const soft = (): SoftAuthenticator => new SoftAuthenticator({ rpId: site.rpId(), origin: site.origin() });

const fresh = (id: mongoose.Types.ObjectId) => User.findById(id).lean();

/** The subjects of the emails sent to an account so far, once those a request started have gone. */
const subjects = async (account: Pick<Account, 'email'>): Promise<string[]> => {
  await mail.settle();
  return mail.to(account.email).map((sent) => sent.subject);
};
const count = (list: string[], subject: string) => list.filter((one) => one === subject).length;

/**
 * A code the account will take now. A code is taken once per 30-second step,
 * so rather than wait, the test moves the account's last step back.
 */
const codeNow = async (account: Account, secret: Buffer): Promise<string> => {
  await User.updateOne({ _id: account.user._id }, { $set: { 'mfa.totp.lastStep': totp.stepAt() - 2 } });
  return totp.codeAt(secret, totp.stepAt());
};

/** Sets up an authenticator app with the password alone (MFA off) or with a proof. */
const enrolTotp = async (account: Account, proof: object = {}) => {
  const started = await call(account, 'post', '/totp/start', { password: account.password, ...proof });
  expect(started, JSON.stringify(started.body)).to.have.status(200);
  const secret = totp.fromBase32(started.body.secret);
  const added = await call(account, 'post', '/totp', {
    setupId: started.body.setupId,
    code: totp.codeAt(secret, totp.stepAt())
  });
  expect(added, JSON.stringify(added.body)).to.have.status(200);
  follow(account, added);
  return { secret, codes: added.body.recoveryCodes as string[] | undefined, res: added };
};

/** Confirms the identity for adding a passkey: the grant. */
const passkeyGrant = async (account: Account, proof: object = {}): Promise<string> => {
  const granted = await call(account, 'post', '/passkeys/grant', { password: account.password, ...proof });
  expect(granted, JSON.stringify(granted.body)).to.have.status(200);
  return granted.body.grant;
};

/** Confirms the identity for adding a passkey, and asks for the browser's options with the grant. */
const passkeyStart = async (account: Account, proof: object = {}) => {
  const grant = await passkeyGrant(account, proof);
  const res = await call(account, 'post', '/passkeys/options', { grant });
  expect(res, JSON.stringify(res.body)).to.have.status(200);
  return { grant, options: res.body.options as PublicKeyCredentialCreationOptionsJSON, res };
};

/** Adds a passkey from a new soft authenticator. */
const addPasskey = async (account: Account, proof: object = {}, name = 'Laptop') => {
  const options = await passkeyStart(account, proof);
  const authenticator = soft();
  const added = await call(account, 'post', '/passkeys', {
    grant: options.grant,
    response: authenticator.register(options.options),
    name
  });
  expect(added, JSON.stringify(added.body)).to.have.status(200);
  follow(account, added);
  return { authenticator, codes: added.body.recoveryCodes as string[] | undefined, res: added };
};

/** A passkey assertion answering a fresh confirm challenge. */
const passkeyProof = async (account: Account, authenticator: SoftAuthenticator, twist: Twist = {}) => {
  const options = await call(account, 'post', '/confirm/options');
  expect(options, JSON.stringify(options.body)).to.have.status(200);
  return { passkey: authenticator.assert(options.body.options.challenge, twist) };
};

describe('two-step sign-in on the account page (/api/mfa)', () => {
  describe('who may use it', () => {
    it('needs a sign-in', async () => {
      for (const [method, path] of [
        ['get', ''],
        ['post', '/totp/start'],
        ['post', '/totp'],
        ['post', '/passkeys/grant'],
        ['post', '/passkeys/options'],
        ['post', '/recovery-codes'],
        ['post', '/confirm/options']
      ] as Array<[Method, string]>) {
        const res = await api()[method]('/mfa' + path);
        expect(res, method + ' ' + path).to.have.status(401);
      }
    });

    it('is not for a trial', async () => {
      const token = sessionToken(await api().post('/guest'))!;
      for (const [method, path] of [
        ['get', ''],
        ['post', '/totp/start'],
        ['post', '/totp'],
        ['delete', '/totp'],
        ['post', '/passkeys/grant'],
        ['post', '/passkeys/options'],
        ['post', '/passkeys'],
        ['patch', '/passkeys/64f0c0ffee0000000000a11c'],
        ['delete', '/passkeys/64f0c0ffee0000000000a11c'],
        ['post', '/recovery-codes'],
        ['post', '/confirm/options']
      ] as Array<[Method, string]>) {
        const res = await call({ token }, method, path, { password: 'x' });
        expect(res, method + ' ' + path).to.have.status(403);
      }
    });

    it('sums up an account without it', async () => {
      const alice = await account();
      const res = await call(alice, 'get', '');
      expect(res).to.have.status(200);
      expect(res.body).to.eql({ on: false, emailConfirmed: true, totp: null, passkeys: [], codesLeft: 0 });
    });
  });

  describe('an authenticator app', () => {
    it('needs the current password to start', async () => {
      const alice = await account();
      let res = await call(alice, 'post', '/totp/start', {});
      expect(res).to.have.status(400);
      expect(res.body).to.include({ code: 'current-password-needed', field: 'password' });
      res = await call(alice, 'post', '/totp/start', { password: 'wrong-password' });
      expect(res).to.have.status(400);
      expect(res.body).to.include({ code: 'current-password-wrong', field: 'password' });
      expect(await AuthChallenge.countDocuments({ userId: alice.user._id })).to.eql(0);
    });

    it('needs a confirmed email', async () => {
      const alice = await account();
      await User.updateOne({ _id: alice.user._id }, { emailUnverified: true });
      const res = await call(alice, 'post', '/totp/start', { password: alice.password });
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('mfa-needs-confirmed-email');
      expect((await call(alice, 'get', '')).body.emailConfirmed).to.eql(false);
      expect(await AuthChallenge.countDocuments({ userId: alice.user._id })).to.eql(0);
    });

    it('gives a secret, its URI and a QR code, and keeps the secret only encrypted', async () => {
      const alice = await account();
      const res = await call(alice, 'post', '/totp/start', { password: alice.password });
      expect(res).to.have.status(200);
      expect(Object.keys(res.body).sort()).to.eql(['qr', 'secret', 'setupId', 'uri']);
      expect(res.body.secret).to.match(/^[A-Z2-7]{32}$/);
      expect(res.body.uri).to.eql(
        'otpauth://totp/Glazecalc:' +
          encodeURIComponent(alice.email) +
          '?secret=' +
          res.body.secret +
          '&issuer=Glazecalc'
      );
      expect(res.body.qr).to.match(/^data:image\/svg\+xml;base64,/);
      const svg = Buffer.from(res.body.qr.split(',')[1], 'base64').toString('utf8');
      expect(svg).to.match(/^<svg [^>]*viewBox="0 0 \d+ \d+"/);
      expect(svg).to.include('<path d="M');
      expect(svg).to.not.match(/<script|on\w+=/i);
      // Nothing changes until a code confirms it.
      expect(sessionToken(res)).to.eql(null);

      const pending = await AuthChallenge.findOne({ userId: alice.user._id, kind: 'totp-add' }).lean();
      expect(pending!.secret).to.match(/^v1\./);
      expect(pending!.secret).to.not.include(res.body.secret);
      expect(mfaKey.decrypt(pending!.secret!, String(alice.user._id))).to.eql(res.body.secret);
      expect(pending!.expiresAt.getTime() - Date.now()).to.be.within(9 * 60 * 1000, 10 * 60 * 1000);
    });

    it('turns on with a first code: recovery codes once, every other sign-in ended, this one renewed', async () => {
      const alice = await account();
      const before = alice.token;
      const { secret, codes, res } = await enrolTotp(alice);
      expect(res.body.code).to.eql('totp-added');
      expect(codes).to.have.length(10);
      for (const code of codes!) expect(code).to.match(/^[0-9a-z]{5}-[0-9a-z]{5}$/);

      expect(await verify(before)).to.have.status(401);
      expect(await verify(alice.token)).to.have.status(200);

      const stored = await fresh(alice.user._id);
      expect(stored!.tokenVersion).to.eql(1);
      expect(stored!.mfa!.totp!.secret).to.match(/^v1\./);
      expect(mfaKey.decrypt(stored!.mfa!.totp!.secret, String(alice.user._id))).to.eql(totp.toBase32(secret));
      expect(stored!.mfa!.totp!.lastStep).to.be.within(totp.stepAt() - 1, totp.stepAt() + 1);
      expect(stored!.mfa!.recoveryCodes).to.have.length(10);
      expect(JSON.stringify(stored!.mfa!.recoveryCodes)).to.not.include(codes![0]!.replace('-', '').toUpperCase());
      // The setup is over.
      expect(await AuthChallenge.countDocuments({ userId: alice.user._id, usedAt: null })).to.eql(0);

      const summary = (await call(alice, 'get', '')).body;
      expect(summary.on).to.eql(true);
      expect(summary.codesLeft).to.eql(10);
      expect(summary.totp.addedAt).to.be.a('string');
      expect(summary.recoveryMadeAt).to.be.a('string');
      expect(JSON.stringify(summary)).to.not.match(/secret|hash|v1\./);
    });

    it('keeps a sign-in for this browser session only of that kind', async () => {
      const alice = await account();
      alice.token = alice.user.generateToken('7d', false);
      const { res } = await enrolTotp(alice);
      const cookie = ([] as unknown[])
        .concat(res.headers['set-cookie'] ?? [])
        .map(String)
        .find((c) => /^glazecalc_session=/.test(c));
      expect(cookie).to.not.match(/Max-Age/i);
    });

    it('does not take the code that turned it on a second time', async () => {
      const alice = await account();
      const started = await call(alice, 'post', '/totp/start', { password: alice.password });
      const secret = totp.fromBase32(started.body.secret);
      const code = totp.codeAt(secret, totp.stepAt());
      const added = await call(alice, 'post', '/totp', { setupId: started.body.setupId, code });
      follow(alice, added);
      const replay = await call(alice, 'post', '/recovery-codes', { password: alice.password, code });
      expect(replay).to.have.status(400);
      expect(replay.body).to.include({ code: 'code-wrong', field: 'code' });
    });

    it('refuses a wrong code, and after five starts again with a new secret', async () => {
      const alice = await account();
      const started = await call(alice, 'post', '/totp/start', { password: alice.password });
      const secret = totp.fromBase32(started.body.secret);
      let res = await call(alice, 'post', '/totp', { setupId: started.body.setupId });
      expect(res.body.code).to.eql('code-needed');
      for (let i = 0; i < 4; i++) {
        res = await call(alice, 'post', '/totp', {
          setupId: started.body.setupId,
          code: '000000' === totp.codeAt(secret, totp.stepAt()) ? '111111' : '000000'
        });
        expect(res).to.have.status(400);
        expect(res.body.code).to.eql('code-wrong');
      }
      res = await call(alice, 'post', '/totp', { setupId: started.body.setupId, code: 'abcdef' });
      expect(res.body.code).to.eql('mfa-start-again');
      res = await call(alice, 'post', '/totp', {
        setupId: started.body.setupId,
        code: totp.codeAt(secret, totp.stepAt())
      });
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('mfa-start-again');
      expect((await fresh(alice.user._id))!.mfa?.totp).to.eql(undefined);
    });

    it('refuses a setup that has expired', async () => {
      const alice = await account();
      const started = await call(alice, 'post', '/totp/start', { password: alice.password });
      await AuthChallenge.updateOne({ userId: alice.user._id }, { expiresAt: new Date(Date.now() - 1000) });
      const res = await call(alice, 'post', '/totp', {
        setupId: started.body.setupId,
        code: totp.codeAt(totp.fromBase32(started.body.secret), totp.stepAt())
      });
      expect(res.body.code).to.eql('mfa-start-again');
    });

    it('keeps only the newest setup: a code for one another tab replaced says to start again', async () => {
      const alice = await account();
      const first = await call(alice, 'post', '/totp/start', { password: alice.password });
      const second = await call(alice, 'post', '/totp/start', { password: alice.password });
      expect(second.body.setupId).to.be.a('string').and.not.eql(first.body.setupId);
      // The first tab's right code, for its own (replaced) setup.
      const res = await call(alice, 'post', '/totp', {
        setupId: first.body.setupId,
        code: totp.codeAt(totp.fromBase32(first.body.secret), totp.stepAt())
      });
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('mfa-start-again');
      // The first tab's code sent as the second tab's setup is simply wrong.
      const crossed = await call(alice, 'post', '/totp', {
        setupId: second.body.setupId,
        code: totp.codeAt(totp.fromBase32(first.body.secret), totp.stepAt())
      });
      expect(crossed.body.code).to.eql('code-wrong');
      const added = await call(alice, 'post', '/totp', {
        setupId: second.body.setupId,
        code: totp.codeAt(totp.fromBase32(second.body.secret), totp.stepAt())
      });
      expect(added.body.code).to.eql('totp-added');
    });

    it('needs the setup id', async () => {
      const alice = await account();
      const started = await call(alice, 'post', '/totp/start', { password: alice.password });
      const code = totp.codeAt(totp.fromBase32(started.body.secret), totp.stepAt());
      for (const setupId of [undefined, '', 'not-an-id', 42, new mongoose.Types.ObjectId().toHexString()]) {
        const res = await call(alice, 'post', '/totp', { setupId, code });
        expect(res, String(setupId)).to.have.status(400);
        expect(res.body.code).to.eql('mfa-start-again');
      }
      expect((await fresh(alice.user._id))!.mfa?.totp).to.eql(undefined);
    });

    it('ends when the account changes how it signs in during the setup', async () => {
      const alice = await account();
      const started = await call(alice, 'post', '/totp/start', { password: alice.password });
      // A sign-out everywhere, a reset or another factor raises tokenVersion.
      await User.updateOne({ _id: alice.user._id }, { $inc: { tokenVersion: 1 } });
      alice.token = (await User.findById(alice.user._id))!.generateToken('7d', true);
      const res = await call(alice, 'post', '/totp', {
        setupId: started.body.setupId,
        code: totp.codeAt(totp.fromBase32(started.body.secret), totp.stepAt())
      });
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('mfa-start-again');
      expect((await fresh(alice.user._id))!.mfa?.totp).to.eql(undefined);
    });

    it("never takes another account's secret", async () => {
      const alice = await account();
      const bob = await account();
      const started = await call(alice, 'post', '/totp/start', { password: alice.password });
      const code = totp.codeAt(totp.fromBase32(started.body.secret), totp.stepAt());
      // Not Alice's setup, and Bob has none of his own.
      expect((await call(bob, 'post', '/totp', { setupId: started.body.setupId, code })).body.code).to.eql(
        'mfa-start-again'
      );
      // Alice's encrypted secret copied into Bob's setup does not decrypt for him.
      const bobs = await call(bob, 'post', '/totp/start', { password: bob.password });
      const alices = await AuthChallenge.findOne({ userId: alice.user._id, kind: 'totp-add' }).lean();
      await AuthChallenge.updateOne({ userId: bob.user._id, kind: 'totp-add' }, { secret: alices!.secret });
      const res = await call(bob, 'post', '/totp', { setupId: bobs.body.setupId, code });
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('code-wrong');
      expect((await fresh(bob.user._id))!.mfa?.totp).to.eql(undefined);
    });

    it('refuses a second authenticator app', async () => {
      const alice = await account();
      const { secret } = await enrolTotp(alice);
      const res = await call(alice, 'post', '/totp/start', {
        password: alice.password,
        code: await codeNow(alice, secret)
      });
      expect(res.body.code).to.eql('totp-exists');
    });

    it('is removed with the password and a code; the last factor turns two-step sign-in off', async () => {
      const alice = await account();
      const { secret, codes } = await enrolTotp(alice);
      const before = alice.token;
      const res = await call(alice, 'delete', '/totp', {
        password: alice.password,
        code: await codeNow(alice, secret)
      });
      expect(res).to.have.status(200);
      expect(res.body.code).to.eql('mfa-off');
      follow(alice, res);
      expect(await verify(before)).to.have.status(401);
      const stored = await fresh(alice.user._id);
      expect(stored!.mfa!.totp).to.eql(undefined);
      expect(stored!.mfa!.recoveryCodes).to.eql([]);
      expect(stored!.mfa!.recoveryMadeAt).to.eql(undefined);
      expect((await call(alice, 'get', '')).body).to.include({ on: false, codesLeft: 0, totp: null });
      // The codes went with it.
      expect(await recoveryCodes.use(alice.user._id, codes![0]!)).to.eql(null);
      expect((await call(alice, 'delete', '/totp', { password: alice.password })).body.code).to.eql('totp-none');
      // One email says two-step sign-in is off, rather than a removal notice.
      const sent = await subjects(alice);
      expect(count(sent, MFA_ADDED['en']!.subject)).to.eql(1);
      expect(count(sent, MFA_OFF['en']!.subject)).to.eql(1);
      expect(count(sent, MFA_REMOVED['en']!.subject)).to.eql(0);
    });
  });

  describe('every change needs the password and, once it is on, a factor (decision 6)', () => {
    let alice: Account;
    let secret: Buffer;
    let codes: string[];

    beforeEach(async () => {
      alice = await account();
      ({ secret, codes } = (await enrolTotp(alice)) as { secret: Buffer; codes: string[] });
    });

    it('refuses the password alone', async () => {
      const passkeyId = new mongoose.Types.ObjectId();
      for (const [method, path] of [
        ['delete', '/totp'],
        ['post', '/passkeys/grant'],
        ['post', '/recovery-codes']
      ] as Array<[Method, string]>) {
        const res = await call(alice, method, path, { password: alice.password });
        expect(res, method + ' ' + path).to.have.status(400);
        expect(res.body.code, method + ' ' + path).to.eql('factor-needed');
      }
      expect((await call(alice, 'delete', '/passkeys/' + passkeyId, { password: alice.password })).status).to.eql(404);
      expect((await fresh(alice.user._id))!.tokenVersion).to.eql(1);
    });

    it('refuses a wrong factor, or two at once', async () => {
      const wrong = totp.codeAt(secret, totp.stepAt() + 5);
      let res = await call(alice, 'post', '/recovery-codes', { password: alice.password, code: wrong });
      expect(res.body).to.include({ code: 'code-wrong', field: 'code' });
      res = await call(alice, 'post', '/recovery-codes', { password: alice.password, recoveryCode: 'zzzzz-zzzzz' });
      expect(res.body).to.include({ code: 'recovery-code-wrong', field: 'code' });
      res = await call(alice, 'post', '/recovery-codes', {
        password: alice.password,
        code: await codeNow(alice, secret),
        recoveryCode: codes[0]
      });
      expect(res.body.code).to.eql('factor-needed');
      expect(recoveryCodes.left((await fresh(alice.user._id))!)).to.eql(10);
    });

    it('refuses a wrong password even with a right factor, and uses nothing up', async () => {
      const res = await call(alice, 'post', '/recovery-codes', { password: 'wrong-password', recoveryCode: codes[0] });
      expect(res.body.code).to.eql('current-password-wrong');
      expect(recoveryCodes.left((await fresh(alice.user._id))!)).to.eql(10);
    });

    it('takes a code, and new recovery codes end the old ones', async () => {
      const before = alice.token;
      const res = await call(alice, 'post', '/recovery-codes', {
        password: alice.password,
        code: await codeNow(alice, secret)
      });
      expect(res).to.have.status(200);
      expect(res.body.code).to.eql('recovery-codes-made');
      expect(res.body.recoveryCodes).to.have.length(10);
      follow(alice, res);
      expect(await verify(before)).to.have.status(401);
      expect(await recoveryCodes.use(alice.user._id, codes[0]!)).to.eql(null);
      expect(await recoveryCodes.use(alice.user._id, res.body.recoveryCodes[0])).to.eql(9);
    });

    it('cancels a pending request to turn two-step sign-in off when a factor confirms a change', async () => {
      const requested = { 'mfa.clearRequestedAt': new Date() };
      await User.updateOne({ _id: alice.user._id }, { $set: requested });
      // A wrong factor leaves it.
      const wrong = await call(alice, 'post', '/recovery-codes', { password: alice.password, code: '000000' });
      expect(wrong.body.code).to.eql('code-wrong');
      expect((await fresh(alice.user._id))!.mfa!.clearRequestedAt).to.be.instanceOf(Date);

      const res = await call(alice, 'post', '/passkeys/grant', {
        password: alice.password,
        code: await codeNow(alice, secret)
      });
      expect(res).to.have.status(200);
      expect((await fresh(alice.user._id))!.mfa!.clearRequestedAt).to.eql(undefined);
    });

    it('takes a recovery code, once', async () => {
      const res = await call(alice, 'post', '/passkeys/grant', { password: alice.password, recoveryCode: codes[3] });
      expect(res).to.have.status(200);
      expect((await call(alice, 'get', '')).body.codesLeft).to.eql(9);
      const again = await call(alice, 'post', '/passkeys/grant', {
        password: alice.password,
        recoveryCode: codes[3]
      });
      expect(again.body.code).to.eql('recovery-code-wrong');
    });

    it('takes a passkey answering a confirm challenge, and that challenge once', async () => {
      const { authenticator } = await addPasskey(alice, { code: await codeNow(alice, secret) });
      const proof = await passkeyProof(alice, authenticator);
      const res = await call(alice, 'post', '/recovery-codes', { password: alice.password, ...proof });
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      follow(alice, res);
      const replay = await call(alice, 'post', '/recovery-codes', { password: alice.password, ...proof });
      expect(replay.body.code).to.eql('passkey-failed');
      // Another assertion for the same, used, challenge does not help either.
      const reused = authenticator.assert(await challengeOf(proof.passkey));
      expect(
        (await call(alice, 'post', '/recovery-codes', { password: alice.password, passkey: reused })).body.code
      ).to.eql('passkey-failed');
    });

    it('refuses a passkey answering an expired challenge, or none', async () => {
      const { authenticator } = await addPasskey(alice, { code: await codeNow(alice, secret) });
      const proof = await passkeyProof(alice, authenticator);
      await AuthChallenge.updateMany(
        { kind: 'passkey-confirm', userId: alice.user._id },
        { expiresAt: new Date(Date.now() - 1) }
      );
      expect((await call(alice, 'post', '/recovery-codes', { password: alice.password, ...proof })).body.code).to.eql(
        'passkey-failed'
      );
      const unasked = authenticator.assert('bm90LWEtY2hhbGxlbmdlLXdlLXNlbnQ');
      expect(
        (await call(alice, 'post', '/recovery-codes', { password: alice.password, passkey: unasked })).body.code
      ).to.eql('passkey-failed');
    });

    it("refuses a passkey answering another account's confirm challenge", async () => {
      const { authenticator } = await addPasskey(alice, { code: await codeNow(alice, secret) });
      const bob = await account();
      await addPasskey(bob);
      const bobs = await call(bob, 'post', '/confirm/options');
      const passkey = authenticator.assert(bobs.body.options.challenge);
      expect((await call(alice, 'post', '/recovery-codes', { password: alice.password, passkey })).body.code).to.eql(
        'passkey-failed'
      );
    });
  });

  describe('passkeys', () => {
    it('gives creation options for this site, with a handle that is not the account id', async () => {
      const alice = await account();
      const { options, res } = await passkeyStart(alice);
      expect(options.rp).to.eql({ name: 'Glazecalc', id: 'glazecalc.test' });
      expect(options.user.name).to.eql(alice.email);
      const handle = (await fresh(alice.user._id))!.mfa!.handle!;
      expect(options.user.id).to.eql(handle);
      expect(Buffer.from(handle, 'base64url')).to.have.length(16);
      expect(handle).to.not.include(String(alice.user._id));
      expect(options.attestation).to.eql('none');
      expect(options.authenticatorSelection).to.include({ residentKey: 'preferred', userVerification: 'preferred' });
      expect(options.pubKeyCredParams.map((p) => p.alg)).to.eql([-7, -257]);
      expect(options.excludeCredentials).to.eql([]);
      // Still off: a handle alone is not a factor.
      expect((await call(alice, 'get', '')).body.on).to.eql(false);
      expect(sessionToken(res)).to.eql(null);
    });

    it('adds a first passkey with the password alone, and makes recovery codes', async () => {
      const alice = await account();
      const before = alice.token;
      const { authenticator, codes, res } = await addPasskey(alice, {}, '  Studio laptop  ');
      expect(res.body.code).to.eql('passkey-added');
      expect(codes).to.have.length(10);
      expect(await verify(before)).to.have.status(401);
      const summary = (await call(alice, 'get', '')).body;
      expect(summary.on).to.eql(true);
      expect(summary.passkeys).to.have.length(1);
      expect(Object.keys(summary.passkeys[0]).sort()).to.eql(['addedAt', 'id', 'name']);
      expect(summary.passkeys[0].name).to.eql('Studio laptop');
      expect(JSON.stringify(summary)).to.not.include(authenticator.id);
      const stored = (await fresh(alice.user._id))!.mfa!.passkeys[0]!;
      expect(stored.credentialId).to.eql(authenticator.id);
      expect(stored.transports).to.eql(['internal']);
      expect(String(stored._id)).to.eql(summary.passkeys[0].id);
    });

    it('leaves out the passkeys the account has, and adds a second without new codes', async () => {
      const alice = await account();
      const first = await addPasskey(alice);
      const proof = await passkeyProof(alice, first.authenticator);
      const options = await passkeyStart(alice, proof);
      expect(options.options.excludeCredentials).to.eql([
        { id: first.authenticator.id, type: 'public-key', transports: ['internal'] }
      ]);
      const second = soft();
      const res = await call(alice, 'post', '/passkeys', {
        grant: options.grant,
        response: second.register(options.options),
        name: 'Phone'
      });
      expect(res.body.code).to.eql('passkey-added');
      expect(res.body.recoveryCodes).to.eql(undefined);
      follow(alice, res);
      expect((await call(alice, 'get', '')).body.passkeys.map((p: { name: string }) => p.name)).to.eql([
        'Laptop',
        'Phone'
      ]);
    });

    it('needs a name of 1 to 60 characters', async () => {
      const alice = await account();
      for (const name of [undefined, '', '   ', 'x'.repeat(61), 'bell' + String.fromCharCode(7), 42]) {
        const options = await passkeyStart(alice);
        const res = await call(alice, 'post', '/passkeys', {
          grant: options.grant,
          response: soft().register(options.options),
          name
        });
        expect(res, String(name)).to.have.status(400);
        expect(res.body).to.include({ code: 'passkey-name', field: 'name' });
        expect(res.body.params).to.eql({ most: 60 });
      }
    });

    it('takes each challenge once, and not after it expires', async () => {
      const alice = await account();
      const options = await passkeyStart(alice);
      const response = soft().register(options.options);
      const added = await call(alice, 'post', '/passkeys', { grant: options.grant, response, name: 'A' });
      expect(added.body.code).to.eql('passkey-added');
      follow(alice, added);
      expect((await call(alice, 'post', '/passkeys', { grant: options.grant, response, name: 'A' })).body.code).to.eql(
        'mfa-start-again'
      );
    });

    it('refuses an expired challenge', async () => {
      const alice = await account();
      const options = await passkeyStart(alice);
      await AuthChallenge.updateMany({ userId: alice.user._id }, { expiresAt: new Date(Date.now() - 1) });
      const res = await call(alice, 'post', '/passkeys', {
        grant: options.grant,
        response: soft().register(options.options),
        name: 'A'
      });
      expect(res.body.code).to.eql('mfa-start-again');
    });

    it("refuses another account's challenge, and another account's grant", async () => {
      const alice = await account();
      const bob = await account();
      const options = await passkeyStart(bob);
      const mine = await passkeyStart(alice);
      expect(
        (
          await call(alice, 'post', '/passkeys', {
            grant: options.grant,
            response: soft().register(mine.options),
            name: 'A'
          })
        ).body.code
      ).to.eql('mfa-start-again');
      expect((await call(alice, 'post', '/passkeys/options', { grant: options.grant })).body.code).to.eql(
        'mfa-start-again'
      );
      const res = await call(alice, 'post', '/passkeys', {
        grant: mine.grant,
        response: soft().register(options.options),
        name: 'A'
      });
      expect(res.body.code).to.eql('mfa-start-again');
    });

    it('refuses a passkey made for another origin or another site', async () => {
      const alice = await account();
      for (const twist of [
        { origin: 'https://evil.test' },
        { rpId: 'evil.test' },
        { origin: 'http://glazecalc.test' }
      ]) {
        const options = await passkeyStart(alice);
        const res = await call(alice, 'post', '/passkeys', {
          grant: options.grant,
          response: soft().register(options.options, twist),
          name: 'A'
        });
        expect(res.body.code, JSON.stringify(twist)).to.eql('passkey-failed');
      }
      expect((await fresh(alice.user._id))!.mfa?.passkeys ?? []).to.eql([]);
    });

    it('refuses an answer that does not carry the challenge', async () => {
      const alice = await account();
      for (const response of [undefined, {}, { response: { clientDataJSON: 'not json' } }, 'text']) {
        const res = await call(alice, 'post', '/passkeys', { response, name: 'A' });
        expect(res.body.code).to.eql('passkey-failed');
      }
    });

    it('refuses a passkey that is already on an account', async () => {
      const alice = await account();
      const bob = await account();
      const { authenticator } = await addPasskey(alice);
      const options = await passkeyStart(bob);
      const res = await call(bob, 'post', '/passkeys', {
        grant: options.grant,
        response: authenticator.register(options.options),
        name: 'A'
      });
      expect(res.body.code).to.eql('passkey-failed');
      expect((await fresh(bob.user._id))!.mfa?.passkeys ?? []).to.eql([]);
      // The grant was given back: Bob can still add a passkey of his own with it.
      const again = await call(bob, 'post', '/passkeys/options', { grant: options.grant });
      const own = await call(bob, 'post', '/passkeys', {
        grant: options.grant,
        response: soft().register(again.body.options),
        name: 'B'
      });
      expect(own.body.code).to.eql('passkey-added');
    });

    describe('confirmed once (the grant)', () => {
      it('uses one recovery code however often the browser step is tried', async () => {
        const alice = await account();
        const { codes } = await enrolTotp(alice);
        const grant = await passkeyGrant(alice, { recoveryCode: codes![0] });
        expect(await subjects(alice)).to.include(RECOVERY_USED['en']!.subject);
        // Cancelled in the browser: nothing sent. Then a try the server refuses.
        await call(alice, 'post', '/passkeys/options', { grant });
        const options = await call(alice, 'post', '/passkeys/options', { grant });
        const spoilt = await call(alice, 'post', '/passkeys', {
          grant,
          response: soft().register(options.body.options, { origin: 'https://evil.test' }),
          name: 'A'
        });
        expect(spoilt.body.code).to.eql('passkey-failed');
        // Then it works, with no new confirmation.
        const last = await call(alice, 'post', '/passkeys/options', { grant });
        const added = await call(alice, 'post', '/passkeys', {
          grant,
          response: soft().register(last.body.options),
          name: 'A'
        });
        expect(added.body.code).to.eql('passkey-added');
        follow(alice, added);
        expect((await call(alice, 'get', '')).body.codesLeft).to.eql(9);
        // Taken with the passkey: it adds no other.
        expect((await call(alice, 'post', '/passkeys/options', { grant })).body.code).to.eql('mfa-start-again');
      });

      it('gives a grant only for the password and a factor, and only to ask for options and save', async () => {
        const alice = await account();
        const { secret } = await enrolTotp(alice);
        // Options with a proof but no grant, or with a made-up grant: refused, nothing used.
        for (const body of [
          { password: alice.password, code: await codeNow(alice, secret) },
          { grant: 'x'.repeat(43) }
        ]) {
          const res = await call(alice, 'post', '/passkeys/options', body);
          expect(res).to.have.status(400);
          expect(res.body.code).to.eql('mfa-start-again');
        }
        const res = await call(alice, 'post', '/passkeys/grant', { password: alice.password });
        expect(res.body.code).to.eql('factor-needed');
        const granted = await call(alice, 'post', '/passkeys/grant', {
          password: alice.password,
          code: await codeNow(alice, secret)
        });
        expect(Object.keys(granted.body).sort()).to.eql(['expiresAt', 'grant']);
        expect(new Date(granted.body.expiresAt).getTime() - Date.now()).to.be.within(4 * 60_000, 5 * 60_000 + 1000);
        // Kept only as a hash.
        const stored = await AuthChallenge.findOne({ userId: alice.user._id, kind: 'change-grant' }).lean();
        expect(stored).to.include({ purpose: 'passkey-add', tokenVersion: 1 });
        expect(JSON.stringify(stored)).to.not.include(granted.body.grant);
        expect(sessionToken(granted)).to.eql(null);
      });

      it('runs out after 5 minutes', async () => {
        const alice = await account();
        const { grant, options } = await passkeyStart(alice);
        await AuthChallenge.updateOne(
          { userId: alice.user._id, kind: 'change-grant' },
          { expiresAt: new Date(Date.now() - 1) }
        );
        const res = await call(alice, 'post', '/passkeys', { grant, response: soft().register(options), name: 'A' });
        expect(res.body.code).to.eql('mfa-start-again');
        expect((await call(alice, 'post', '/passkeys/options', { grant })).body.code).to.eql('mfa-start-again');
        expect((await fresh(alice.user._id))!.mfa?.passkeys ?? []).to.eql([]);
      });

      it('ends when the account changes how it signs in in between', async () => {
        const alice = await account();
        const { grant, options } = await passkeyStart(alice);
        // Another tab adds an authenticator app: tokenVersion goes up, and this browser's cookie is renewed.
        await enrolTotp(alice);
        const res = await call(alice, 'post', '/passkeys', { grant, response: soft().register(options), name: 'A' });
        expect(res).to.have.status(400);
        expect(res.body.code).to.eql('mfa-start-again');
        expect((await call(alice, 'post', '/passkeys/options', { grant })).body.code).to.eql('mfa-start-again');
        expect((await fresh(alice.user._id))!.mfa?.passkeys ?? []).to.eql([]);
      });

      it('keeps the newest grant only: another tab confirming again replaces it', async () => {
        const alice = await account();
        const first = await passkeyStart(alice);
        const second = await passkeyStart(alice);
        const stale = await call(alice, 'post', '/passkeys', {
          grant: first.grant,
          response: soft().register(second.options),
          name: 'A'
        });
        expect(stale.body.code).to.eql('mfa-start-again');
        const added = await call(alice, 'post', '/passkeys', {
          grant: second.grant,
          response: soft().register(second.options),
          name: 'A'
        });
        expect(added.body.code).to.eql('passkey-added');
      });

      it('keeps one passkey challenge per account, so a second tab leaves no passkey half added', async () => {
        const alice = await account();
        const grant = await passkeyGrant(alice);
        const tabOne = (await call(alice, 'post', '/passkeys/options', { grant })).body.options;
        const tabTwo = (await call(alice, 'post', '/passkeys/options', { grant })).body.options;
        expect(await AuthChallenge.countDocuments({ userId: alice.user._id, kind: 'passkey-add' })).to.eql(1);
        const one = soft();
        const late = await call(alice, 'post', '/passkeys', { grant, response: one.register(tabOne), name: 'One' });
        expect(late.body.code).to.eql('mfa-start-again');
        const two = await call(alice, 'post', '/passkeys', { grant, response: soft().register(tabTwo), name: 'Two' });
        expect(two.body.code).to.eql('passkey-added');
        const stored = (await fresh(alice.user._id))!.mfa!.passkeys;
        expect(stored.map((passkey) => passkey.name)).to.eql(['Two']);
        expect(stored.map((passkey) => passkey.credentialId)).to.not.include(one.id);
      });

      it('saves one passkey when the same answer is sent twice at once', async () => {
        const alice = await account();
        const { grant, options } = await passkeyStart(alice);
        const response = soft().register(options);
        const results = await Promise.all(
          [1, 2, 3].map(() => call(alice, 'post', '/passkeys', { grant, response, name: 'A' }))
        );
        expect(results.filter((res) => res.body.code === 'passkey-added')).to.have.length(1);
        expect((await fresh(alice.user._id))!.mfa!.passkeys).to.have.length(1);
      });
    });

    it(`stops at ${PASSKEY_LIMIT}`, async () => {
      const alice = await account();
      const { authenticator } = await addPasskey(alice);
      const extra = Array.from({ length: PASSKEY_LIMIT - 1 }, (_, i) => ({
        _id: new mongoose.Types.ObjectId(),
        credentialId: 'extra-' + i + '-' + String(alice.user._id),
        publicKey: Buffer.from('x'),
        counter: 0,
        transports: [],
        name: 'Key ' + i,
        addedAt: new Date()
      }));
      await User.updateOne({ _id: alice.user._id }, { $push: { 'mfa.passkeys': { $each: extra } } });
      const res = await call(alice, 'post', '/passkeys/grant', {
        password: alice.password,
        ...(await passkeyProof(alice, authenticator))
      });
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('passkey-limit');
      expect(res.body.params).to.eql({ most: PASSKEY_LIMIT });
    });

    it('also stops at the limit when the options were asked for before', async () => {
      const alice = await account();
      const options = await passkeyStart(alice);
      const extra = Array.from({ length: PASSKEY_LIMIT }, (_, i) => ({
        _id: new mongoose.Types.ObjectId(),
        credentialId: 'late-' + i + '-' + String(alice.user._id),
        publicKey: Buffer.from('x'),
        counter: 0,
        name: 'Key ' + i,
        addedAt: new Date()
      }));
      await User.updateOne({ _id: alice.user._id }, { $push: { 'mfa.passkeys': { $each: extra } } });
      const res = await call(alice, 'post', '/passkeys', {
        grant: options.grant,
        response: soft().register(options.options),
        name: 'A'
      });
      expect(res.body.code).to.eql('passkey-limit');
      expect((await fresh(alice.user._id))!.mfa!.passkeys).to.have.length(PASSKEY_LIMIT);
    });

    it('renames without a password, and changes nothing about signing in', async () => {
      const alice = await account();
      await addPasskey(alice);
      const id = (await call(alice, 'get', '')).body.passkeys[0].id;
      const res = await call(alice, 'patch', '/passkeys/' + id, { name: 'Old laptop' });
      expect(res).to.have.status(200);
      expect(res.body.code).to.eql('passkey-renamed');
      expect(sessionToken(res)).to.eql(null);
      expect(await verify(alice.token)).to.have.status(200);
      expect((await call(alice, 'get', '')).body.passkeys[0].name).to.eql('Old laptop');
      expect((await call(alice, 'patch', '/passkeys/' + id, { name: '' })).body.code).to.eql('passkey-name');
      expect((await call(alice, 'patch', '/passkeys/not-an-id', { name: 'A' })).status).to.eql(404);
      // Not another account's.
      const bob = await account();
      const theirs = await call(bob, 'patch', '/passkeys/' + id, { name: 'Mine now' });
      expect(theirs).to.have.status(404);
      expect(theirs.body.code).to.eql('passkey-not-found');
      expect((await call(alice, 'get', '')).body.passkeys[0].name).to.eql('Old laptop');
    });

    it('removes one with the password and a factor; the last turns two-step sign-in off', async () => {
      const alice = await account();
      const first = await addPasskey(alice);
      const second = await addPasskey(alice, await passkeyProof(alice, first.authenticator), 'Phone');
      const [one, two] = (await call(alice, 'get', '')).body.passkeys;

      expect((await call(alice, 'delete', '/passkeys/' + one.id, { password: alice.password })).body.code).to.eql(
        'factor-needed'
      );
      const before = alice.token;
      let res = await call(alice, 'delete', '/passkeys/' + one.id, {
        password: alice.password,
        ...(await passkeyProof(alice, first.authenticator))
      });
      expect(res.body.code).to.eql('passkey-removed');
      follow(alice, res);
      expect(await verify(before)).to.have.status(401);
      expect(recoveryCodes.left((await fresh(alice.user._id))!)).to.eql(10);

      res = await call(alice, 'delete', '/passkeys/' + two.id, {
        password: alice.password,
        ...(await passkeyProof(alice, second.authenticator))
      });
      expect(res.body.code).to.eql('mfa-off');
      follow(alice, res);
      expect((await call(alice, 'get', '')).body).to.include({ on: false, codesLeft: 0 });
      expect((await fresh(alice.user._id))!.mfa!.recoveryCodes).to.eql([]);
      // A removal notice for the first, and for the last one that two-step sign-in is off.
      const sent = await subjects(alice);
      expect(count(sent, MFA_REMOVED['en']!.subject)).to.eql(1);
      expect(count(sent, MFA_OFF['en']!.subject)).to.eql(1);
      expect(mail.to(alice.email).find((one) => one.subject === MFA_REMOVED['en']!.subject)!.text).to.include(
        'the passkey "Laptop"'
      );
    });

    it("does not remove another account's passkey", async () => {
      const alice = await account();
      await addPasskey(alice);
      const id = (await call(alice, 'get', '')).body.passkeys[0].id;
      const bob = await account();
      const res = await call(bob, 'delete', '/passkeys/' + id, { password: bob.password });
      expect(res).to.have.status(404);
      expect((await call(alice, 'get', '')).body.passkeys).to.have.length(1);
    });

    it('refuses a passkey whose counter went back, and one with a spoilt signature', async () => {
      const alice = await account();
      const { authenticator } = await addPasskey(alice);
      const ok = await call(alice, 'post', '/recovery-codes', {
        password: alice.password,
        ...(await passkeyProof(alice, authenticator))
      });
      expect(ok).to.have.status(200);
      follow(alice, ok);
      const stored = (await fresh(alice.user._id))!.mfa!.passkeys[0]!;
      expect(stored.counter).to.eql(authenticator.counter);
      expect(stored.lastUsedAt).to.be.instanceOf(Date);

      const cloned = await call(alice, 'post', '/recovery-codes', {
        password: alice.password,
        ...(await passkeyProof(alice, authenticator, { counter: 1 }))
      });
      expect(cloned.body.code).to.eql('passkey-failed');
      const spoilt = await call(alice, 'post', '/recovery-codes', {
        password: alice.password,
        ...(await passkeyProof(alice, authenticator, { badSignature: true }))
      });
      expect(spoilt.body.code).to.eql('passkey-failed');
      const elsewhere = await call(alice, 'post', '/recovery-codes', {
        password: alice.password,
        ...(await passkeyProof(alice, authenticator, { origin: 'https://evil.test' }))
      });
      expect(elsewhere.body.code).to.eql('passkey-failed');
    });

    it('takes a passkey without user verification as a second factor (the password was the first)', async () => {
      const alice = await account();
      const { authenticator } = await addPasskey(alice);
      const res = await call(alice, 'post', '/recovery-codes', {
        password: alice.password,
        ...(await passkeyProof(alice, authenticator, { userVerified: false }))
      });
      expect(res).to.have.status(200);
    });

    it('asks for a confirm challenge only when the account has passkeys', async () => {
      const alice = await account();
      const res = await call(alice, 'post', '/confirm/options');
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('passkey-not-found');
      const { authenticator } = await addPasskey(alice);
      const options = (await call(alice, 'post', '/confirm/options')).body.options;
      expect(options.rpId).to.eql('glazecalc.test');
      expect(options.userVerification).to.eql('preferred');
      expect(options.allowCredentials).to.eql([{ id: authenticator.id, type: 'public-key', transports: ['internal'] }]);
      const stored = await AuthChallenge.findOne({ challenge: options.challenge }).lean();
      expect(stored).to.include({ kind: 'passkey-confirm' });
      expect(String(stored!.userId)).to.eql(String(alice.user._id));
    });
  });

  describe('recovery codes', () => {
    it('are made only when two-step sign-in is on', async () => {
      const alice = await account();
      const res = await call(alice, 'post', '/recovery-codes', { password: alice.password });
      expect(res).to.have.status(400);
      expect(res.body.code).to.eql('mfa-not-on');
      expect(res.body.msg).to.match(/not on/);
      // Asked again after two-step sign-in was on and then turned off: the same answer.
      const { secret } = await enrolTotp(alice);
      const off = await call(alice, 'delete', '/totp', {
        password: alice.password,
        code: await codeNow(alice, secret)
      });
      expect(off.body.code).to.eql('mfa-off');
      follow(alice, off);
      const again = await call(alice, 'post', '/recovery-codes', { password: alice.password });
      expect(again).to.have.status(400);
      expect(again.body.code).to.eql('mfa-not-on');
    });

    it('are shown only in the reply that makes them', async () => {
      const alice = await account();
      const { codes } = await enrolTotp(alice);
      const summary = JSON.stringify((await call(alice, 'get', '')).body);
      for (const code of codes!) expect(summary).to.not.include(code);
    });
  });

  describe('limits', () => {
    beforeEach(async () => {
      // Other files' sign-in tests also count against this address.
      await limits.secondStep.resetKey('127.0.0.1');
      process.env.RATE_LIMITS = 'on';
    });
    afterEach(() => {
      process.env.RATE_LIMITS = 'off';
    });

    it('stops guessing the setup code after 10 tries in 15 minutes on one account', async () => {
      const alice = await account();
      process.env.RATE_LIMITS = 'off';
      await call(alice, 'post', '/totp/start', { password: alice.password });
      process.env.RATE_LIMITS = 'on';
      const statuses: number[] = [];
      try {
        for (let i = 0; i < 11; i++)
          statuses.push((await call(alice, 'post', '/totp', { code: '00000' + (i % 10) })).status);
      } finally {
        await limits.secondStep.resetKey('127.0.0.1');
        await limits.secondStepAccount.resetKey('mfa:' + String(alice.user._id));
      }
      expect(statuses.slice(0, 10).every((status) => status === 400)).to.eql(true);
      expect(statuses[10]).to.eql(429);
    });
  });
});

/** The challenge a response answers, as the server reads it. */
const challengeOf = async (response: object): Promise<string> => webauthn.challengeOf(response as never)!;

describe('passkeys on the server (webauthn.ts)', () => {
  const withPasskey = async () => {
    const alice = await account();
    const { authenticator } = await addPasskey(alice);
    const user = (await User.findById(alice.user._id))!;
    return { alice, authenticator, user };
  };

  it('asks for any passkey of this site for passkey-first sign-in, with user verification', async () => {
    const options = await webauthn.authenticationOptions(null, 'required');
    expect(options.rpId).to.eql('glazecalc.test');
    expect(options.userVerification).to.eql('required');
    expect(options.allowCredentials).to.eql(undefined);
    expect(options.challenge).to.match(/^[A-Za-z0-9_-]{20,}$/);
  });

  it('reads the challenge a response answers, and nothing from garbage', async () => {
    const authenticator = soft();
    expect(webauthn.challengeOf(authenticator.assert('Y2hhbGxlbmdl'))).to.eql('Y2hhbGxlbmdl');
    for (const bad of [null, {}, { response: {} }, { response: { clientDataJSON: '!!' } }]) {
      expect(webauthn.challengeOf(bad as never)).to.eql(null);
    }
    const noChallenge = { response: { clientDataJSON: Buffer.from('{}').toString('base64url') } };
    expect(webauthn.challengeOf(noChallenge as never)).to.eql(null);
  });

  it('needs user verification when asked to', async () => {
    const { authenticator, user } = await withPasskey();
    const options = await webauthn.authenticationOptions(null, 'required');
    const unverified = authenticator.assert(options.challenge, { userVerified: false });
    expect(await webauthn.verifyAuthentication(user, unverified, options.challenge, true)).to.eql(false);
    const verified = authenticator.assert(options.challenge);
    expect(await webauthn.verifyAuthentication(user, verified, options.challenge, true)).to.eql(true);
  });

  it('refuses a wrong challenge, relying party or user handle', async () => {
    const { authenticator, user } = await withPasskey();
    const options = await webauthn.authenticationOptions(user.mfa!.passkeys, 'preferred');
    const other = await webauthn.authenticationOptions(user.mfa!.passkeys, 'preferred');
    expect(
      await webauthn.verifyAuthentication(user, authenticator.assert(other.challenge), options.challenge, false)
    ).to.eql(false);
    expect(
      await webauthn.verifyAuthentication(
        user,
        authenticator.assert(options.challenge, { rpId: 'evil.test' }),
        options.challenge,
        false
      )
    ).to.eql(false);
    expect(
      await webauthn.verifyAuthentication(
        user,
        authenticator.assert(options.challenge, { userHandle: 'c29tZW9uZS1lbHNl' }),
        options.challenge,
        false
      )
    ).to.eql(false);
    expect(await webauthn.verifyAuthentication(user, authenticator.assert(options.challenge), '', false)).to.eql(false);
  });

  it("refuses another account's passkey", async () => {
    const { user } = await withPasskey();
    const stranger = soft();
    stranger.userHandle = user.mfa!.handle!;
    const options = await webauthn.authenticationOptions(null, 'required');
    expect(
      await webauthn.verifyAuthentication(user, stranger.assert(options.challenge), options.challenge, true)
    ).to.eql(false);
  });

  it('takes an authenticator that does not count', async () => {
    const alice = await account();
    const options = await passkeyStart(alice);
    const still = new SoftAuthenticator({ rpId: site.rpId(), origin: site.origin() }, { counts: false });
    follow(
      alice,
      await call(alice, 'post', '/passkeys', {
        grant: options.grant,
        response: still.register(options.options),
        name: 'Key'
      })
    );
    const user = (await User.findById(alice.user._id))!;
    for (let i = 0; i < 2; i++) {
      const asked = await webauthn.authenticationOptions(user.mfa!.passkeys, 'preferred');
      expect(await webauthn.verifyAuthentication(user, still.assert(asked.challenge), asked.challenge, false)).to.eql(
        true
      );
    }
  });

  it('finds the account of a discoverable passkey by credential id and user handle', async () => {
    const { alice, authenticator } = await withPasskey();
    const options = await webauthn.authenticationOptions(null, 'required');
    const found = await webauthn.accountOf(authenticator.assert(options.challenge));
    expect(String(found!._id)).to.eql(String(alice.user._id));
    expect(found!.password).to.eql(undefined);
    expect(await webauthn.accountOf(authenticator.assert(options.challenge, { userHandle: null }))).to.eql(null);
    expect(
      await webauthn.accountOf(authenticator.assert(options.challenge, { userHandle: 'b3RoZXItaGFuZGxl' }))
    ).to.eql(null);
    expect(await webauthn.accountOf(soft().assert(options.challenge))).to.eql(null);
    expect(await webauthn.accountOf({} as never)).to.eql(null);
  });
});

describe('checking a factor (factors.ts)', () => {
  it('wants exactly one factor', async () => {
    const alice = await account();
    const { secret } = await enrolTotp(alice);
    const user = (await User.findById(alice.user._id))!;
    for (const proof of [null, {}, 'code', { password: 'x' }, { code: '1', recoveryCode: '2' }]) {
      expect(await factors.checkFactor(user, proof)).to.eql({ ok: false, code: 'factor-needed' });
    }
    expect(await factors.checkFactor(user, { code: '' })).to.eql({ ok: false, code: 'code-needed' });
    expect(await factors.checkFactor(user, { passkey: {} })).to.eql({ ok: false, code: 'passkey-failed' });
    expect(await factors.checkFactor(user, { code: await codeNow(alice, secret) })).to.eql({ ok: true, kind: 'totp' });
  });

  it('takes a code once even when two requests send it at the same moment', async () => {
    const alice = await account();
    const { secret } = await enrolTotp(alice);
    const code = await codeNow(alice, secret);
    const user = (await User.findById(alice.user._id))!;
    const results = await Promise.all([1, 2, 3].map(() => factors.checkFactor(user, { code })));
    expect(results.filter((result) => result.ok)).to.have.length(1);
    const stored = await fresh(alice.user._id);
    expect(stored!.mfa!.totp!.lastUsedAt).to.be.instanceOf(Date);
  });

  it('refuses a code from an older step than the last one taken', async () => {
    const alice = await account();
    const { secret } = await enrolTotp(alice);
    const user = (await User.findById(alice.user._id))!;
    await User.updateOne({ _id: alice.user._id }, { 'mfa.totp.lastStep': totp.stepAt() });
    expect(await factors.checkFactor(user, { code: totp.codeAt(secret, totp.stepAt() - 1) })).to.eql({
      ok: false,
      code: 'code-wrong'
    });
  });

  it('says how many recovery codes are left', async () => {
    const alice = await account();
    const { codes } = await enrolTotp(alice);
    const user = (await User.findById(alice.user._id))!;
    expect(await factors.checkFactor(user, { recoveryCode: codes![0] })).to.eql({
      ok: true,
      kind: 'recovery',
      codesLeft: 9
    });
    expect(await factors.checkFactor(user, { recoveryCode: codes![0] })).to.eql({
      ok: false,
      code: 'recovery-code-wrong'
    });
  });

  it('takes no recovery code when two-step sign-in is off', async () => {
    const alice = await account();
    const made = recoveryCodes.make();
    await User.updateOne({ _id: alice.user._id }, { $set: { 'mfa.recoveryCodes': made.stored } });
    const user = (await User.findById(alice.user._id))!;
    expect(await factors.checkFactor(user, { recoveryCode: made.codes[0] })).to.eql({
      ok: false,
      code: 'recovery-code-wrong'
    });
  });
});
