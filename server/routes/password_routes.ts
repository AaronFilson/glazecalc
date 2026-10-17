// Password reset by email, and changing the password while signed in.
//
//   POST /api/password/forgot  { email }            emails a reset link
//   POST /api/password/reset   { token, password }  sets a new password from the link
//   PUT  /api/password         { current, password } (signed in) changes it; with
//                              two-step sign-in on, a current factor too (code,
//                              recoveryCode or passkey, as lib/mfa.d.ts FactorProof)
//
// A reset also stops every share link (docs/adr/0020-share-links.md); a change keeps them.
// A new password signs out every device (the user's tokenVersion goes up) and
// sends a notice to the account's address. A reset, which may mean someone
// else knew the password, also revokes every access token and connected app
// (decision 5); an ordinary change keeps them. A 400 about one field names it:
// { msg, field: 'password' }.
import crypto from 'node:crypto';
import express from 'express';
import * as accountMail from '../lib/account_mail.ts';
import * as email from '../lib/email.ts';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { keepsSignIn, userOf } from '../lib/jwt_auth.ts';
import * as log from '../lib/log.ts';
import { stopAllSharing } from '../lib/share_links.ts';
import * as mailer from '../lib/mailer.ts';
import * as password from '../lib/password.ts';
import * as limits from '../lib/rate_limit.ts';
import { confirmChange } from '../lib/second_step.ts';
import * as session from '../lib/session.ts';
import { revokeAll } from '../models/access_token.ts';
import PasswordReset, { cancelLinks } from '../models/password_reset.ts';
import User, { mfaOn, type UserDocument } from '../models/user.ts';
import { say } from '../lib/messages.ts';

const RESET_MINUTES = 30;
// Requests per account per hour, on top of the per-address rate limit. Each
// request is kept for the hour, after its link has expired, so all count.
const RESETS_PER_HOUR = 3;
const HOUR = 60 * 60 * 1000;

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
// Mail goes out after the reply, so it never delays or fails a request. Only
// the error's code is logged: an SMTP error's message names the address.
const logMailError = (what: string) => (err: unknown) =>
  log.error('Could not send the ' + what + ' email', { code: log.codeOf(err) });

const passwordRouter = express.Router();
export default passwordRouter;

passwordRouter.post('/forgot', limits.forgotPassword, express.json(), (req, res) => {
  if (!mailer.available()) {
    return res.status(503).json(say('reset-unavailable'));
  }
  const address = email.normalize(((req.body ?? {}) as { email?: unknown }).email);
  if (!email.isValid(address)) return res.status(400).json(say('email-required', undefined, { field: 'email' }));

  // The same reply whether or not the account exists, sent before looking.
  res.status(200).json(say('reset-sent', { minutes: RESET_MINUTES }));
  sendResetLink(address).catch(logMailError('password reset'));
  return undefined;
});

async function sendResetLink(address: string): Promise<void> {
  const user = await User.findOne({ email: address }).collation(email.collation);
  // Trials have only a placeholder address (which isValid refuses anyway).
  if (!user || user.guest) return;
  const hourAgo = new Date(Date.now() - HOUR);
  if ((await PasswordReset.countDocuments({ userId: user._id, createdAt: { $gt: hourAgo } })) >= RESETS_PER_HOUR) {
    return;
  }
  const token = crypto.randomBytes(32).toString('base64url');
  // Only the newest link works.
  await cancelLinks(user._id);
  await PasswordReset.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + HOUR)
  });
  await accountMail.sendReset(user.email, token, RESET_MINUTES, user.preferences?.language);
}

passwordRouter.post('/reset', limits.resetPassword, express.json(), async (req, res) => {
  const body = (req.body ?? {}) as { token?: unknown; password?: unknown };
  if (typeof body.token !== 'string' || !body.token) return res.status(400).json(say('reset-link-bad'));
  const problem = password.problem(body.password);
  if (problem) return res.status(400).json(say(problem, undefined, { field: 'password' }));

  // Marking the request used in the same step makes each link work only once.
  const now = new Date();
  const reset = await PasswordReset.findOneAndUpdate(
    {
      tokenHash: hashToken(body.token),
      usedAt: null,
      createdAt: { $gt: new Date(now.getTime() - RESET_MINUTES * 60 * 1000) }
    },
    { $set: { usedAt: now } }
  );
  const user = reset && (await User.findById(reset.userId));
  if (!user) return res.status(400).json(say('reset-link-bad'));
  // Tokens are revoked first: if saving the password then fails, none is left working.
  await revokeAll(user._id, 'password-reset');
  // As for the tokens: a reset means someone else may have had the password, so every share link stops too.
  const stopped = await stopAllSharing(user._id);
  // The link went to the account's address, so opening it also proves the address is theirs.
  user.emailUnverified = undefined;
  await setPassword(user, body.password as string, stopped > 0);
  return res.status(200).json(say('password-reset'));
});

passwordRouter.put(
  '/',
  // After jwtAuth: requests from someone not signed in never count against an address many share.
  jwtAuth,
  notGuest,
  limits.changePassword,
  limits.passwordCheck,
  express.json(),
  async (req, res) => {
    const body = (req.body ?? {}) as { current?: unknown; password?: unknown };
    const problem = password.problem(body.password);
    if (problem) return res.status(400).json(say(problem, undefined, { field: 'password' }));

    const user = await User.findById(userOf(req)._id);
    if (!user) return res.status(404).json(say('no-user'));
    if (mfaOn(user)) {
      // The password and a current factor (decision 6). The password here is `current`.
      const check = await confirmChange(req, { ...body, password: body.current });
      if (!check.ok) {
        const field = check.field === 'password' ? 'current' : check.field;
        return res.status(check.status).json(say(check.code, check.params, field ? { field } : {}));
      }
      // 400 rather than 401: the user is signed in, and a 401 would sign them out.
    } else if (!(await password.matches(body.current, user.password))) {
      return res.status(400).json(say('current-password-wrong', undefined, { field: 'current' }));
    }
    await setPassword(user, body.password as string);
    // A new session keeps this browser signed in; every other one is signed out.
    session.start(res, user, 7, keepsSignIn(req));
    return res.status(200).json(say('password-changed', undefined, { email: user.email }));
  }
);

// Saves a new password, signs out every device, cancels open reset links and
// tells the account's owner.
async function setPassword(user: UserDocument, newPassword: string, linksStopped = false): Promise<void> {
  user.password = await password.hash(newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await cancelLinks(user._id);
  // Not to an address nobody has confirmed: it may be a stranger's.
  if (!user.emailUnverified) {
    accountMail
      .sendChanged(user.email, user.preferences?.language, linksStopped)
      .catch(logMailError('password changed'));
  }
}
