// Creating an account, signing in and out. Signing in sets the session cookie
// (server/lib/session.ts).
//
//   POST /api/signup   { email, password }            { email }
//   GET  /api/signin   Authorization: Basic email:pw  { email, kept }
//                      or, with two-step sign-in on, no session and
//                      { code: 'second-step', methods, pending, expiresAt, passkeyOptions? }
//   POST /api/signin/second-step  { pending, code | recoveryCode | passkey }  { email, kept }
//                      (a passkey that failed: 401 with new passkeyOptions for
//                      the next try; another try still being checked: 409)
//   POST /api/signin/passkey/options              { options }   (passkey-first)
//   POST /api/signin/passkey      { response }     { email, kept }
//
// Two-step sign-in (docs/mfa-plan.md, item 9, decisions 1 and 2): the password
// step answers with a short-lived signed `pending` token the page keeps in
// memory (server/lib/second_step.ts), and only the second step starts the
// session, merges a trial and honours "Keep me signed in". A passkey with user
// verification, on its own, counts as both steps.
//
// Sign-up and sign-in last until the browser closes, unless the request has the
// header X-Keep-Signed-In: 1 (server/lib/session.ts).
//   POST /api/signout
//   POST /api/signout-everywhere   (signed in) signs out every device
//
// A 400 about one of the fields sent names it, so the app can mark that field:
// { msg, field: 'email' }. The same goes for the password and account routes.
import express, { type Request, type Response } from 'express';
import type { Types } from 'mongoose';
import { mergeTrial } from '../lib/account_data.ts';
import * as emailLinks from '../lib/email_links.ts';
import { notGuest } from '../lib/guest_limits.ts';
import basicHTTP from '../lib/basic_http.ts';
import * as email from '../lib/email.ts';
import jwtAuth, { currentUser, userOf } from '../lib/jwt_auth.ts';
import { isDuplicateKey } from '../lib/mongo_errors.ts';
import * as password from '../lib/password.ts';
import * as limits from '../lib/rate_limit.ts';
import * as secondStep from '../lib/second_step.ts';
import * as session from '../lib/session.ts';
import AuthChallenge from '../models/auth_challenge.ts';
import User, { factorMethods, mfaOn, type UserDocument } from '../models/user.ts';
import { say } from '../lib/messages.ts';
import type { AuthenticationResponseJSON } from '../../lib/mfa.js';

const authRouter = express.Router();
export default authRouter;

// The same answer for an unknown email and a wrong password, so sign-in does
// not tell anyone which emails have accounts.

authRouter.post('/signup', limits.signUp, express.json(), async (req, res) => {
  const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
  const address = email.normalize(body.email);
  if (!email.isValid(address)) return res.status(400).json(say('email-required', undefined, { field: 'email' }));
  const problem = password.problem(body.password);
  if (problem) return res.status(400).json(say(problem, undefined, { field: 'password' }));

  if (await User.exists({ email: address }).collation(email.collation)) {
    return res.status(400).json(say('account-exists', undefined, { field: 'email' }));
  }
  try {
    // Unverified until the emailed link is opened (server/routes/email_routes.ts).
    const user = await User.create({
      email: address,
      password: await password.hash(body.password as string),
      emailUnverified: true
    });
    session.start(res, user, 7, session.wantsKept(req));
    res.status(200).json({ email: user.email });
    emailLinks.sendVerification(user);
    return undefined;
  } catch (err) {
    // The unique index catches two sign-ups for one email racing each other.
    if (isDuplicateKey(err)) return res.status(400).json(say('account-exists', undefined, { field: 'email' }));
    throw err;
  }
});

authRouter.get('/signin', limits.signIn, basicHTTP, async (req, res) => {
  const credentials = req.basicHTTP!;
  const user = await User.findOne({ email: email.normalize(credentials.email) }).collation(email.collation);
  // Trials have no password of their own; their token is the only way in. Checking
  // against a stand-in hash takes as long, so timing does not show which emails exist.
  const ok =
    user && !user.guest
      ? await password.matches(credentials.password, user.password)
      : await password.matchesNothing(credentials.password);
  if (!ok || !user) return res.status(401).json(say('sign-in-failed'));

  const trial = await currentUser(req);
  const keep = session.wantsKept(req);
  if (mfaOn(user)) {
    // No session yet: the second step finishes the sign-in, with what is noted here.
    const methods = factorMethods(user);
    const passkeyOptions = methods.passkey
      ? await secondStep.checks.authenticationOptions(user.mfa!.passkeys, 'preferred')
      : undefined;
    const { token, expiresAt } = await secondStep.begin(user, {
      keep,
      ...(trial?.guest && { trialId: trial._id }),
      ...(passkeyOptions && { passkeyChallenge: passkeyOptions.challenge })
    });
    return res.status(200).json(
      say('second-step', undefined, {
        methods,
        pending: token,
        expiresAt: expiresAt.toISOString(),
        ...(passkeyOptions && { passkeyOptions })
      })
    );
  }
  return signedIn(res, user, trial?.guest ? trial._id : undefined, keep);
});

/**
 * Finishes a sign-in: a trial on this browser comes along (what was made in it
 * moves into the account), and the session starts.
 */
const signedIn = async (res: Response, user: UserDocument, trialId: Types.ObjectId | undefined, keep: boolean) => {
  // Only while it is still a trial: it may have been claimed or swept since.
  const trial = trialId ? await User.exists({ _id: trialId, guest: true }) : null;
  const kept = trial ? await mergeTrial(trial._id, user._id) : 0;
  session.start(res, user, 7, keep);
  return res.status(200).json(say('signed-in', undefined, { email: user.email, kept }));
};

/** The one factor a second step sends, without the pending token. */
const proofIn = (body: Record<string, unknown>): Record<string, unknown> => {
  const proof: Record<string, unknown> = {};
  for (const key of ['code', 'recoveryCode', 'passkey']) if (body[key] !== undefined) proof[key] = body[key];
  return proof;
};

// The second step. The pending sign-in is loaded first, so the per-account
// limit (req.mfaUserId) counts tries from every address.
authRouter.post(
  '/signin/second-step',
  limits.secondStep,
  express.json(),
  async (req, res, next) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const loaded = await secondStep.load(body.pending);
    if (!loaded.ok) return res.status(401).json(say(loaded.code));
    req.mfaUserId = String(loaded.user._id);
    res.locals.secondStep = loaded;
    return next();
  },
  limits.secondStepAccount,
  async (req: Request, res: Response) => {
    const { pending, user } = res.locals.secondStep as { pending: secondStep.PendingSignIn; user: UserDocument };
    const proof = proofIn((req.body ?? {}) as Record<string, unknown>);
    const passkeyTry = proof.passkey !== undefined;
    // Each try is counted, and holds the pending sign-in, before its factor is
    // checked: a right code is used up only for a sign-in that finishes, and of
    // two right answers racing, only one is checked and signs in.
    const reserved = await secondStep.reserve(pending, { passkey: passkeyTry });
    if (!reserved.ok) return res.status(reserved.code === 'second-step-busy' ? 409 : 401).json(say(reserved.code));
    const { hold } = reserved;
    let check: Awaited<ReturnType<typeof secondStep.checks.checkFactor>>;
    try {
      check = await secondStep.checks.checkFactor(user, proof, {
        ...(hold.challenge && { passkeyChallenge: hold.challenge })
      });
    } catch (err) {
      await secondStep.release(pending, hold);
      throw err;
    }
    if (!check.ok) {
      // The last try used up: the password again.
      if (secondStep.triesUsed(pending)) {
        await secondStep.release(pending, hold);
        return res.status(401).json(say('second-step-tries'));
      }
      // A passkey try took the challenge: the next try answers a new one.
      const passkeyOptions =
        passkeyTry && user.mfa?.passkeys?.length
          ? await secondStep.checks.authenticationOptions(user.mfa.passkeys, 'preferred')
          : undefined;
      await secondStep.release(pending, hold, passkeyOptions?.challenge);
      return res
        .status(check.code === 'factor-needed' || check.code === 'code-needed' ? 400 : 401)
        .json(say(check.code, undefined, passkeyOptions ? { passkeyOptions } : {}));
    }
    if (!(await secondStep.finish(pending, hold))) return res.status(401).json(say('second-step-expired'));
    await secondStep.cancelClearRequest(user._id);
    return signedIn(res, user, pending.trialId, pending.keep);
  }
);

// Passkey-first sign-in (decision 1, item 17): any discoverable passkey for
// this site, with user verification, counts as both steps. Passkey autofill
// uses the same two routes. The options have a lighter limit of their own
// (limits.passkeyOptions): the page asks for them on every sign-in page load
// where autofill works, they start no session, and an unused challenge expires.
// The sign-in itself counts against limits.signIn.
const PASSKEY_SIGNIN_MINUTES = 5;

authRouter.post('/signin/passkey/options', limits.passkeyOptions, async (req, res) => {
  const options = await secondStep.checks.authenticationOptions(null, 'required');
  await AuthChallenge.create({
    kind: 'passkey-signin',
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + PASSKEY_SIGNIN_MINUTES * 60 * 1000)
  });
  res.status(200).json({ options });
});

authRouter.post('/signin/passkey', limits.signIn, express.json(), async (req, res) => {
  const response = ((req.body ?? {}) as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return res.status(401).json(say('passkey-failed'));
  const assertion = response as AuthenticationResponseJSON;
  const challenge = secondStep.checks.challengeOf(assertion);
  if (!challenge) return res.status(401).json(say('passkey-failed'));
  // The challenge is taken once, whatever comes of the check.
  const now = new Date();
  const taken = await AuthChallenge.findOneAndUpdate(
    { challenge, kind: 'passkey-signin', usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  );
  if (!taken) return res.status(401).json(say('passkey-failed'));
  const user = await secondStep.checks.accountOf(assertion);
  if (!user || user.guest) return res.status(401).json(say('passkey-unknown'));
  if (!(await secondStep.checks.verifyAuthentication(user, assertion, challenge, true))) {
    return res.status(401).json(say('passkey-failed'));
  }
  await secondStep.cancelClearRequest(user._id);
  const trial = await currentUser(req);
  return signedIn(res, user, trial?.guest ? trial._id : undefined, session.wantsKept(req));
});

authRouter.post('/signout', (req, res) => {
  session.end(res);
  res.status(200).json(say('signed-out'));
});

// Raising the token version retires every token made so far, on every device,
// this browser's included.
authRouter.post('/signout-everywhere', jwtAuth, notGuest, async (req, res) => {
  await User.updateOne({ _id: userOf(req)._id }, { $inc: { tokenVersion: 1 } });
  session.end(res);
  res.status(200).json(say('signed-out-everywhere'));
});
