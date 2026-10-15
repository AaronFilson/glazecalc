// Two-step sign-in on the account page (docs/mfa-plan.md, item 8).
// server/app.ts mounts the router at /api/mfa. Replies are typed in lib/mfa.d.ts.
//
// All behind jwtAuth and notGuest. Every change to how the account signs in
// takes an IdentityProof, checked by factors.confirmIdentity: the current
// password, and once MFA is on a current factor too (decision 6). Turning MFA
// on needs a confirmed email ('mfa-needs-confirmed-email'). Adding or removing
// a factor, or new recovery codes, raises tokenVersion and renews this
// browser's cookie (session.start(res, user, 7, keepsSignIn(req))).
//
//   GET    /api/mfa                     MfaSummary
//   POST   /api/mfa/confirm/options     → { options }  a passkey challenge for an IdentityProof
//   POST   /api/mfa/totp/start  IdentityProof         → TotpStartResponse (secret held 10 minutes)
//   POST   /api/mfa/totp        { setupId, code }     → RecoveryCodesResponse ('totp-added')
//   DELETE /api/mfa/totp        IdentityProof         ('totp-removed' or 'mfa-off')
//   POST   /api/mfa/passkeys/grant IdentityProof      → PasskeyGrantResponse (5 minutes)
//   POST   /api/mfa/passkeys/options { grant }        → { options }
//   POST   /api/mfa/passkeys    { grant, response, name } → RecoveryCodesResponse ('passkey-added')
//   PATCH  /api/mfa/passkeys/:id { name }             ('passkey-renamed'; no password)
//   DELETE /api/mfa/passkeys/:id IdentityProof        ('passkey-removed' or 'mfa-off')
//   POST   /api/mfa/recovery-codes IdentityProof      → RecoveryCodesResponse ('recovery-codes-made')
//
// The two changes that take two requests confirm the identity in the first and
// keep it until the change is made, so a factor spent on the confirmation is
// not wasted when the browser's step or the app's first code fails: an
// authenticator app's setup (its id, 10 minutes), and adding a passkey (a
// change grant, server/lib/change_grant.ts, 5 minutes). Each is for one
// account, the newest replaces the last (another tab's), and a change to the
// account's tokenVersion in between ends it ('mfa-start-again').
//
// Limits: limits.changePassword per address and limits.passwordCheck per
// account on every route that checks a password; limits.secondStep and
// limits.secondStepAccount on POST /api/mfa/totp. The routes that only make or
// answer a passkey challenge count against limits.secondStep. limits.secondStep
// comes after jwtAuth, so only signed-in requests count against an address that
// many people may share.
//
// Each change is one atomic update whose filter says what it expects (no
// authenticator app yet, fewer than ten passkeys, the factor still there), so
// two requests at once cannot leave the account half changed. Secrets and
// recovery codes go out only in the reply that makes them; nothing is logged
// about them.
import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { PASSKEY_LIMIT, PASSKEY_NAME_MAX, SECOND_STEP_TRIES } from '../../lib/mfa.js';
import type { MfaSummary, PasskeyGrantResponse, TotpStartResponse } from '../../lib/mfa.js';
import * as accountMail from '../lib/account_mail.ts';
import * as changeGrant from '../lib/change_grant.ts';
import * as factors from '../lib/factors.ts';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { keepsSignIn, userOf } from '../lib/jwt_auth.ts';
import { isDuplicateKey } from '../lib/mongo_errors.ts';
import * as mfaKey from '../lib/mfa_key.ts';
import * as qr from '../lib/qr.ts';
import * as limits from '../lib/rate_limit.ts';
import * as recoveryCodes from '../lib/recovery_codes.ts';
import * as secondStep from '../lib/second_step.ts';
import * as session from '../lib/session.ts';
import * as totp from '../lib/totp.ts';
import * as webauthn from '../lib/webauthn.ts';
import { say } from '../lib/messages.ts';
import AuthChallenge from '../models/auth_challenge.ts';
import User, { mfaOn, type UserDocument } from '../models/user.ts';

const mfaRouter = express.Router();
export default mfaRouter;

const MINUTE = 60 * 1000;
/** How long a new authenticator app has to be confirmed with a first code. */
const TOTP_ADD_MINUTES = 10;
/** How long a passkey challenge lasts. */
const CHALLENGE_MINUTES = 5;

type Filter = Record<string, unknown>;
type Update = { $set?: Filter; $unset?: Filter; $push?: Filter; $pull?: Filter };

const HAS_FACTOR: Filter = { $or: [{ 'mfa.totp': { $exists: true } }, { 'mfa.passkeys.0': { $exists: true } }] };
const NO_FACTOR: Filter = { 'mfa.totp': { $exists: false }, 'mfa.passkeys.0': { $exists: false } };

/** Every route that checks a password (decision 6). */
const proving = [limits.changePassword, jwtAuth, notGuest, limits.passwordCheck, express.json()];

/**
 * factors.confirmIdentity, and when it took a factor, the owner evidently still
 * has one: a pending request to turn two-step sign-in off (server/clear_mfa.ts)
 * is cancelled, as a sign-in with a factor cancels it.
 */
const confirm = async (req: Request): Promise<factors.IdentityCheck> => {
  const check = await factors.confirmIdentity(req, req.body);
  if (check.ok && check.used) await secondStep.cancelClearRequest(check.user._id);
  return check;
};

const refuse = (res: Response, check: Extract<factors.IdentityCheck, { ok: false }>) =>
  res.status(check.status).json(say(check.code, undefined, check.field ? { field: check.field } : {}));

// The account changed how it signs in: every other device is signed out (the
// update raised tokenVersion), and this browser gets a new cookie of the same kind.
const renew = (req: Request, res: Response, user: UserDocument): void => {
  session.start(res, user, 7, keepsSignIn(req));
};

const after = { returnDocument: 'after' as const };

/**
 * Adds a factor with one atomic update, `guard` saying what must still be
 * true (no authenticator app yet, room for a passkey). The first factor also
 * makes recovery codes. Resolves with the account after the change and the
 * codes to show, or null when the guard no longer holds.
 */
async function addFactor(
  userId: mongoose.Types.ObjectId,
  guard: Filter,
  update: Update
): Promise<{ user: UserDocument; codes?: string[] } | null> {
  // Twice, in case another change turned two-step sign-in on or off in between.
  for (let attempt = 0; attempt < 2; attempt++) {
    const made = recoveryCodes.make();
    const first = await User.findOneAndUpdate(
      { _id: userId, ...guard, ...NO_FACTOR },
      {
        ...update,
        $set: { ...update.$set, 'mfa.recoveryCodes': made.stored, 'mfa.recoveryMadeAt': new Date() },
        // A request to turn it off (server/clear_mfa.ts) from before it was off ends here.
        $unset: { 'mfa.clearRequestedAt': 1 },
        $inc: { tokenVersion: 1 }
      },
      after
    );
    if (first) return { user: first, codes: made.codes };
    const more = await User.findOneAndUpdate(
      { _id: userId, ...guard, ...HAS_FACTOR },
      { ...update, $inc: { tokenVersion: 1 } },
      after
    );
    if (more) return { user: more };
  }
  return null;
}

/**
 * Removes a factor with one atomic update. `others` is the filter for "the
 * account has another factor", `none` for "this was the last": then the
 * recovery codes go too and two-step sign-in is off. Null when the factor is
 * no longer there.
 */
async function removeFactor(
  userId: mongoose.Types.ObjectId,
  match: Filter,
  update: Update,
  others: Filter,
  none: Filter
): Promise<{ user: UserDocument; off: boolean } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const kept = await User.findOneAndUpdate(
      { _id: userId, ...match, ...others },
      { ...update, $inc: { tokenVersion: 1 } },
      after
    );
    if (kept) return { user: kept, off: false };
    const off = await User.findOneAndUpdate(
      { _id: userId, ...match, ...none },
      {
        ...update,
        $set: { ...update.$set, 'mfa.recoveryCodes': [] },
        $unset: { ...update.$unset, 'mfa.recoveryMadeAt': 1, 'mfa.clearRequestedAt': 1 },
        $inc: { tokenVersion: 1 }
      },
      after
    );
    if (off) return { user: off, off: true };
  }
  return null;
}

/** A passkey's name, trimmed, or null when it is empty, too long or has control characters. */
const nameOf = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= PASSKEY_NAME_MAX && !/\p{Cc}/u.test(name) ? name : null;
};
const iso = (date: Date | undefined): string | undefined => (date ? new Date(date).toISOString() : undefined);
const dated = <K extends string>(key: K, date: Date | undefined) =>
  (date ? { [key]: iso(date)! } : {}) as Partial<Record<K, string>>;

/**
 * The account's two-step state, read before asking for a proof, so a request
 * that cannot succeed never uses up a recovery code or a passkey challenge.
 */
const stateOf = (userId: mongoose.Types.ObjectId) =>
  User.findById(userId, { email: 1, emailUnverified: 1, mfa: 1 }).lean();

const badName = () => say('passkey-name', { most: PASSKEY_NAME_MAX }, { field: 'name' });
const tooMany = () => say('passkey-limit', { most: PASSKEY_LIMIT });

// The summary the account page shows: names and dates, never a secret, a
// credential id or a hash.
mfaRouter.get('/', jwtAuth, notGuest, async (req, res) => {
  const user = await stateOf(userOf(req)._id);
  if (!user) return res.status(404).json(say('no-user'));
  const on = mfaOn(user);
  const totpEntry = user.mfa?.totp;
  const summary: MfaSummary = {
    on,
    emailConfirmed: !user.emailUnverified,
    totp: totpEntry ? { addedAt: iso(totpEntry.addedAt)!, ...dated('lastUsedAt', totpEntry.lastUsedAt) } : null,
    passkeys: (user.mfa?.passkeys ?? []).map((passkey) => ({
      id: String(passkey._id),
      name: passkey.name,
      addedAt: iso(passkey.addedAt)!,
      ...dated('lastUsedAt', passkey.lastUsedAt)
    })),
    codesLeft: on ? recoveryCodes.left(user) : 0,
    ...(on ? dated('recoveryMadeAt', user.mfa?.recoveryMadeAt) : {})
  };
  return res.status(200).json(summary);
});

// A challenge for confirming a change with a passkey (decision 6): the
// account's passkeys only, taken once by confirmIdentity.
mfaRouter.post('/confirm/options', jwtAuth, notGuest, limits.secondStep, async (req, res) => {
  const user = await User.findById(userOf(req)._id, { mfa: 1 });
  const passkeys = user?.mfa?.passkeys ?? [];
  if (!user || !passkeys.length) return res.status(400).json(say('passkey-not-found'));
  const options = await webauthn.authenticationOptions(passkeys, 'preferred');
  await AuthChallenge.create({
    userId: user._id,
    kind: 'passkey-confirm',
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + CHALLENGE_MINUTES * MINUTE)
  });
  return res.status(200).json({ options });
});

// Setting up an authenticator app, part one: a new secret, kept encrypted
// until a first code shows the app has it.
mfaRouter.post('/totp/start', ...proving, async (req, res) => {
  const state = await stateOf(userOf(req)._id);
  if (!state) return res.status(404).json(say('no-user'));
  if (state.emailUnverified) return res.status(400).json(say('mfa-needs-confirmed-email'));
  if (state.mfa?.totp) return res.status(400).json(say('totp-exists'));
  const check = await confirm(req);
  if (!check.ok) return refuse(res, check);
  const { user } = check;

  const secretBytes = totp.newSecret();
  const secret = totp.toBase32(secretBytes);
  secretBytes.fill(0);
  // One setup at a time: an earlier secret (another tab's) no longer counts.
  await AuthChallenge.deleteMany({ userId: user._id, kind: 'totp-add' });
  const setup = await AuthChallenge.create({
    userId: user._id,
    kind: 'totp-add',
    secret: mfaKey.encrypt(secret, String(user._id)),
    tokenVersion: user.tokenVersion || 0,
    expiresAt: new Date(Date.now() + TOTP_ADD_MINUTES * MINUTE)
  });
  const uri = totp.uri(secret, user.email);
  const reply: TotpStartResponse = { secret, uri, qr: qr.svgDataUrl(uri), setupId: String(setup._id) };
  return res.status(200).json(reply);
});

// Part two: the first code from the app turns it on. No password again: the
// identity was confirmed for part one, and the setup is tied to this account
// and to its tokenVersion then. Only the newest setup counts: a code for one
// another tab replaced answers 'mfa-start-again', not 'code-wrong'.
mfaRouter.post(
  '/totp',
  jwtAuth,
  notGuest,
  limits.secondStep,
  limits.secondStepAccount,
  express.json(),
  async (req, res) => {
    const userId = userOf(req)._id;
    const { code, setupId } = (req.body ?? {}) as { code?: unknown; setupId?: unknown };
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json(say('code-needed', undefined, { field: 'code' }));
    }
    if (typeof setupId !== 'string' || !mongoose.isValidObjectId(setupId)) {
      return res.status(400).json(say('mfa-start-again'));
    }
    const now = new Date();
    const pending = await AuthChallenge.findOne({
      _id: setupId,
      userId,
      kind: 'totp-add',
      usedAt: null,
      expiresAt: { $gt: now }
    });
    if (!pending?.secret) return res.status(400).json(say('mfa-start-again'));
    const version = changeGrant.versionIs(pending.tokenVersion ?? 0);
    if (!(await User.exists({ _id: userId, ...version }))) return res.status(400).json(say('mfa-start-again'));

    let step: number | null = null;
    try {
      const secret = totp.fromBase32(mfaKey.decrypt(pending.secret, String(userId)));
      step = totp.matchingStep(secret, code);
      secret.fill(0);
    } catch {
      step = null;
    }
    if (step === null) {
      // A few wrong codes and the setup starts again, with a new secret.
      const counted = await AuthChallenge.findOneAndUpdate(
        { _id: pending._id, usedAt: null },
        { $inc: { attempts: 1 } },
        after
      );
      if (!counted || counted.attempts >= SECOND_STEP_TRIES) {
        await AuthChallenge.updateOne({ _id: pending._id }, { $set: { usedAt: now } });
        return res.status(400).json(say('mfa-start-again'));
      }
      return res.status(400).json(say('code-wrong', undefined, { field: 'code' }));
    }

    // Taken once, even by two requests at the same moment.
    const taken = await AuthChallenge.findOneAndUpdate(
      { _id: pending._id, usedAt: null, expiresAt: { $gt: now } },
      { $set: { usedAt: now } }
    );
    if (!taken) return res.status(400).json(say('mfa-start-again'));

    const current = await User.findById(userId, { emailUnverified: 1, 'mfa.totp': 1 }).lean();
    if (!current) return res.status(404).json(say('no-user'));
    if (current.emailUnverified) return res.status(400).json(say('mfa-needs-confirmed-email'));
    const added = await addFactor(
      userId,
      { 'mfa.totp': { $exists: false }, ...version },
      // The code just used counts as the last one taken, so it cannot sign in again.
      { $set: { 'mfa.totp': { secret: pending.secret, lastStep: step, addedAt: now, lastUsedAt: now } } }
    );
    if (!added) {
      const exists = await User.exists({ _id: userId, 'mfa.totp': { $exists: true } });
      return res.status(400).json(say(exists ? 'totp-exists' : 'mfa-start-again'));
    }

    renew(req, res, added.user);
    res.status(200).json(say('totp-added', undefined, added.codes ? { recoveryCodes: added.codes } : {}));
    accountMail.noticeMfa(added.user, { kind: 'added', method: { kind: 'totp' } });
    return undefined;
  }
);

mfaRouter.delete('/totp', ...proving, async (req, res) => {
  if (!(await stateOf(userOf(req)._id))?.mfa?.totp) return res.status(400).json(say('totp-none'));
  const check = await confirm(req);
  if (!check.ok) return refuse(res, check);
  const removed = await removeFactor(
    check.user._id,
    { 'mfa.totp': { $exists: true } },
    { $unset: { 'mfa.totp': 1 } },
    { 'mfa.passkeys.0': { $exists: true } },
    { 'mfa.passkeys.0': { $exists: false } }
  );
  if (!removed) return res.status(400).json(say('totp-none'));
  renew(req, res, removed.user);
  res.status(200).json(say(removed.off ? 'mfa-off' : 'totp-removed'));
  // The last factor gone: one 'two-step sign-in is off' email instead of a removal notice.
  accountMail.noticeMfa(
    removed.user,
    removed.off ? { kind: 'mfa-off' } : { kind: 'removed', method: { kind: 'totp' } }
  );
  return undefined;
});

/** Why a passkey cannot be added now (no account, an unconfirmed email, no room), or null when it can. */
const cannotAddPasskey = async (userId: mongoose.Types.ObjectId) => {
  const state = await stateOf(userId);
  if (!state) return { status: 404, body: say('no-user') };
  if (state.emailUnverified) return { status: 400, body: say('mfa-needs-confirmed-email') };
  if ((state.mfa?.passkeys?.length ?? 0) >= PASSKEY_LIMIT) return { status: 400, body: tooMany() };
  return null;
};

// Adding a passkey, part one: the identity, confirmed once. The grant it gives
// lets the page ask for options and save the passkey as often as the browser's
// step needs, for a few minutes, without confirming again (and without using
// up another recovery code). The page asks for the passkey with a click of its
// own: some browsers allow one WebAuthn prompt per click, and a passkey may
// have just confirmed the identity.
mfaRouter.post('/passkeys/grant', ...proving, async (req, res) => {
  const refused = await cannotAddPasskey(userOf(req)._id);
  if (refused) return res.status(refused.status).json(refused.body);
  const check = await confirm(req);
  if (!check.ok) return refuse(res, check);
  const { grant, expiresAt } = await changeGrant.issue(check.user, 'passkey-add');
  const reply: PasskeyGrantResponse = { grant, expiresAt: expiresAt.toISOString() };
  return res.status(200).json(reply);
});

// Part two: the options for the browser, excluding the passkeys the account
// has, so one authenticator is not added twice. One challenge at a time per
// account: an earlier one (another tab's, or a cancelled try) no longer counts.
mfaRouter.post('/passkeys/options', jwtAuth, notGuest, limits.secondStep, express.json(), async (req, res) => {
  const userId = userOf(req)._id;
  const refused = await cannotAddPasskey(userId);
  if (refused) return res.status(refused.status).json(refused.body);
  const grant = await changeGrant.find(userId, ((req.body ?? {}) as { grant?: unknown }).grant, 'passkey-add');
  if (!grant) return res.status(400).json(say('mfa-start-again'));
  const user = await User.findById(userId, { email: 1, mfa: 1 });
  if (!user) return res.status(404).json(say('no-user'));

  // The WebAuthn user handle is made once and kept: never the ObjectId.
  let handle = user.mfa?.handle;
  if (!handle) {
    await User.updateOne(
      { _id: userId, 'mfa.handle': { $exists: false } },
      { $set: { 'mfa.handle': webauthn.newHandle() } }
    );
    handle = (await User.findById(userId, { 'mfa.handle': 1 }).lean())?.mfa?.handle;
    if (!handle) return res.status(404).json(say('no-user'));
  }
  const options = await webauthn.registrationOptions(user, handle);
  await AuthChallenge.deleteMany({ userId, kind: 'passkey-add' });
  await AuthChallenge.create({
    userId,
    kind: 'passkey-add',
    challenge: options.challenge,
    grantId: grant._id,
    expiresAt: new Date(Date.now() + CHALLENGE_MINUTES * MINUTE)
  });
  return res.status(200).json({ options });
});

// Part three: the browser's new passkey, checked against the challenge from
// part two. The grant is taken only when the passkey is saved; a failure
// before that leaves it for another try.
mfaRouter.post('/passkeys', jwtAuth, notGuest, limits.secondStep, express.json(), async (req, res) => {
  const userId = userOf(req)._id;
  const body = (req.body ?? {}) as { grant?: unknown; response?: unknown; name?: unknown };
  const name = nameOf(body.name);
  if (!name) return res.status(400).json(badName());
  const response = body.response as RegistrationResponseJSON | undefined;
  const challenge = response && typeof response === 'object' ? webauthn.challengeOf(response) : null;
  if (!challenge) return res.status(400).json(say('passkey-failed'));
  const grant = await changeGrant.find(userId, body.grant, 'passkey-add');
  if (!grant) return res.status(400).json(say('mfa-start-again'));

  const now = new Date();
  const taken = await AuthChallenge.findOneAndUpdate(
    { userId, kind: 'passkey-add', challenge, grantId: grant._id, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  );
  if (!taken) return res.status(400).json(say('mfa-start-again'));
  const passkey = await webauthn.verifyRegistration(response!, challenge);
  if (!passkey) return res.status(400).json(say('passkey-failed'));

  const current = await User.findById(userId, { emailUnverified: 1, 'mfa.passkeys': 1 }).lean();
  if (!current) return res.status(404).json(say('no-user'));
  if (current.emailUnverified) return res.status(400).json(say('mfa-needs-confirmed-email'));
  // Taken once, even by two requests at the same moment; given back if the passkey cannot be saved.
  if (!(await changeGrant.take(grant))) return res.status(400).json(say('mfa-start-again'));
  const version = changeGrant.versionIs(grant.tokenVersion ?? 0);
  let added: Awaited<ReturnType<typeof addFactor>>;
  try {
    added = await addFactor(
      userId,
      { ['mfa.passkeys.' + (PASSKEY_LIMIT - 1)]: { $exists: false }, ...version },
      { $push: { 'mfa.passkeys': { ...passkey, _id: new mongoose.Types.ObjectId(), name, addedAt: now } } }
    );
  } catch (err) {
    await changeGrant.giveBack(grant);
    // The passkey is already on an account (this one or another).
    if (isDuplicateKey(err)) return res.status(400).json(say('passkey-failed'));
    throw err;
  }
  if (!added) {
    // The account changed how it signs in meanwhile: confirm again. Otherwise it is full.
    if (!(await User.exists({ _id: userId, ...version }))) return res.status(400).json(say('mfa-start-again'));
    await changeGrant.giveBack(grant);
    return res.status(400).json(tooMany());
  }

  renew(req, res, added.user);
  res.status(200).json(say('passkey-added', undefined, added.codes ? { recoveryCodes: added.codes } : {}));
  accountMail.noticeMfa(added.user, { kind: 'added', method: { kind: 'passkey', name } });
  return undefined;
});

// A new name changes nothing about signing in, so no password and no new cookie.
mfaRouter.patch('/passkeys/:id', jwtAuth, notGuest, express.json(), async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).json(say('passkey-not-found'));
  const name = nameOf(((req.body ?? {}) as { name?: unknown }).name);
  if (!name) return res.status(400).json(badName());
  const renamed = await User.updateOne(
    { _id: userOf(req)._id, 'mfa.passkeys._id': id },
    { $set: { 'mfa.passkeys.$.name': name } }
  );
  if (!renamed.matchedCount) return res.status(404).json(say('passkey-not-found'));
  return res.status(200).json(say('passkey-renamed'));
});

mfaRouter.delete('/passkeys/:id', ...proving, async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).json(say('passkey-not-found'));
  const state = await stateOf(userOf(req)._id);
  if (!(state?.mfa?.passkeys ?? []).some((entry) => String(entry._id) === id)) {
    return res.status(404).json(say('passkey-not-found'));
  }
  const check = await confirm(req);
  if (!check.ok) return refuse(res, check);
  const passkey = (check.user.mfa?.passkeys ?? []).find((entry) => String(entry._id) === id);
  if (!passkey) return res.status(404).json(say('passkey-not-found'));
  const passkeyId = new mongoose.Types.ObjectId(id);
  const removed = await removeFactor(
    check.user._id,
    { 'mfa.passkeys._id': passkeyId },
    { $pull: { 'mfa.passkeys': { _id: passkeyId } } },
    { $or: [{ 'mfa.totp': { $exists: true } }, { 'mfa.passkeys.1': { $exists: true } }] },
    { 'mfa.totp': { $exists: false }, 'mfa.passkeys.1': { $exists: false } }
  );
  if (!removed) return res.status(404).json(say('passkey-not-found'));
  renew(req, res, removed.user);
  res.status(200).json(say(removed.off ? 'mfa-off' : 'passkey-removed'));
  accountMail.noticeMfa(
    removed.user,
    removed.off ? { kind: 'mfa-off' } : { kind: 'removed', method: { kind: 'passkey', name: passkey.name } }
  );
  return undefined;
});

// New recovery codes: the old ones stop working at once.
mfaRouter.post('/recovery-codes', ...proving, async (req, res) => {
  const state = await stateOf(userOf(req)._id);
  // Recovery codes go with two-step sign-in: none without it.
  if (!state || !mfaOn(state)) return res.status(400).json(say('mfa-not-on'));
  const check = await confirm(req);
  if (!check.ok) return refuse(res, check);
  const made = recoveryCodes.make();
  const user = await User.findOneAndUpdate(
    { _id: check.user._id, ...HAS_FACTOR },
    {
      $set: { 'mfa.recoveryCodes': made.stored, 'mfa.recoveryMadeAt': new Date() },
      $inc: { tokenVersion: 1 }
    },
    after
  );
  if (!user) return res.status(400).json(say('mfa-not-on'));
  renew(req, res, user);
  res.status(200).json(say('recovery-codes-made', undefined, { recoveryCodes: made.codes }));
  accountMail.noticeMfa(user, { kind: 'recovery-new' });
  return undefined;
});
