// Password reset by email, and changing the password while signed in.
//
//   POST /api/password/forgot  { email }            emails a reset link
//   POST /api/password/reset   { token, password }  sets a new password from the link
//   PUT  /api/password         { current, password } (signed in) changes it
//
// A new password signs out every device (the user's tokenVersion goes up) and
// sends a notice to the account's address.
import crypto from 'node:crypto';
import express from 'express';
import type { Types } from 'mongoose';
import * as accountMail from '../lib/account_mail.ts';
import * as email from '../lib/email.ts';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import * as log from '../lib/log.ts';
import * as mailer from '../lib/mailer.ts';
import * as password from '../lib/password.ts';
import * as limits from '../lib/rate_limit.ts';
import * as session from '../lib/session.ts';
import PasswordReset from '../models/password_reset.ts';
import User, { type UserDocument } from '../models/user.ts';

const RESET_MINUTES = 30;
// Requests per account per hour, on top of the per-address rate limit.
const RESETS_PER_HOUR = 3;
const SENT =
  'If an account uses that email, we have sent it a link to reset the password. ' +
  'The link works for ' +
  RESET_MINUTES +
  ' minutes.';
const BAD_LINK = 'This reset link is not valid or has expired. Please ask for a new one.';

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
// Mail goes out after the reply, so it never delays or fails a request.
const logMailError = (what: string) => (err: unknown) => log.error('Could not send the ' + what + ' email', { err });

const passwordRouter = express.Router();
export default passwordRouter;

passwordRouter.post('/forgot', limits.forgotPassword, express.json(), (req, res) => {
  if (!mailer.available()) {
    return res.status(503).json({ msg: 'Password reset by email is not available yet.' });
  }
  const address = email.normalize(((req.body ?? {}) as { email?: unknown }).email);
  if (!email.isValid(address)) return res.status(400).json({ msg: 'Please enter an email' });

  // The same reply whether or not the account exists, sent before looking.
  res.status(200).json({ msg: SENT });
  sendResetLink(address).catch(logMailError('password reset'));
  return undefined;
});

async function sendResetLink(address: string): Promise<void> {
  const user = await User.findOne({ email: address }).collation(email.collation);
  // Trials have only a placeholder address (which isValid refuses anyway).
  if (!user || user.guest) return;
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if ((await PasswordReset.countDocuments({ userId: user._id, createdAt: { $gt: hourAgo } })) >= RESETS_PER_HOUR) {
    return;
  }
  const token = crypto.randomBytes(32).toString('base64url');
  // Only the newest link works. Older ones are marked used rather than deleted,
  // so they still count towards the hourly limit until they expire.
  await cancelLinks(user._id);
  await PasswordReset.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000)
  });
  await accountMail.sendReset(user.email, token, RESET_MINUTES);
}

passwordRouter.post('/reset', limits.resetPassword, express.json(), async (req, res) => {
  const body = (req.body ?? {}) as { token?: unknown; password?: unknown };
  if (typeof body.token !== 'string' || !body.token) return res.status(400).json({ msg: BAD_LINK });
  const problem = password.problem(body.password);
  if (problem) return res.status(400).json({ msg: problem });

  // Marking the request used in the same step makes each link work only once.
  const now = new Date();
  const reset = await PasswordReset.findOneAndUpdate(
    { tokenHash: hashToken(body.token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  );
  const user = reset && (await User.findById(reset.userId));
  if (!user) return res.status(400).json({ msg: BAD_LINK });
  await setPassword(user, body.password as string);
  return res.status(200).json({ msg: 'Your password has been changed. Please sign in with your new password.' });
});

passwordRouter.put(
  '/',
  limits.changePassword,
  jwtAuth,
  notGuest,
  limits.passwordCheck,
  express.json(),
  async (req, res) => {
    const body = (req.body ?? {}) as { current?: unknown; password?: unknown };
    const problem = password.problem(body.password);
    if (problem) return res.status(400).json({ msg: problem });

    const user = await User.findById(userOf(req)._id);
    if (!user) return res.status(404).json({ msg: 'No user with that id' });
    // 400 rather than 401: the user is signed in, and a 401 would sign them out.
    if (!(await password.matches(body.current, user.password))) {
      return res.status(400).json({ msg: 'Your current password is not correct.' });
    }
    await setPassword(user, body.password as string);
    // A new session keeps this browser signed in; every other one is signed out.
    session.start(res, user);
    return res.status(200).json({ msg: 'Your password has been changed.', email: user.email });
  }
);

// Saves a new password, signs out every device, cancels open reset links and
// tells the account's owner.
async function setPassword(user: UserDocument, newPassword: string): Promise<void> {
  user.password = await password.hash(newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await cancelLinks(user._id);
  accountMail.sendChanged(user.email).catch(logMailError('password changed'));
}

function cancelLinks(userId: Types.ObjectId) {
  return PasswordReset.updateMany({ userId, usedAt: null }, { $set: { usedAt: new Date() } });
}
