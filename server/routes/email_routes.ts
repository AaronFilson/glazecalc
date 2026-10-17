// Confirming an address, and changing it.
//
//   POST /api/email/change   { email, password } (signed in) emails a link to the new address;
//                            with two-step sign-in on, a current factor too (lib/mfa.d.ts IdentityProof);
//                            an account with no password sends { email, reauth } (ADR 15)
//   POST /api/email/confirm  { token }           confirms an address from a link's token
//   POST /api/email/resend   (signed in)         emails a new account the link again
//
// A new account's address is confirmed with the link sent at sign-up. Until
// then the account works as any other, but the app sends mail to the address
// only on request: a password reset, or this link. The address of an account
// changes only when the link sent to the new one is opened, and only while the
// account's tokenVersion is what it was when the link was asked for; that signs out
// every device (the user's tokenVersion goes up) and ends open reset links,
// and a notice goes to the old address when the change is asked for. The
// account keeps when its address last changed (emailChangedAt), since
// server/clear_mfa.ts refuses for 30 days after. A 400 about one field names
// it: { msg, field: 'email' }.
import express from 'express';
import * as accountMail from '../lib/account_mail.ts';
import { versionIs } from '../lib/change_grant.ts';
import * as email from '../lib/email.ts';
import * as emailLinks from '../lib/email_links.ts';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import * as log from '../lib/log.ts';
import * as mailer from '../lib/mailer.ts';
import { isDuplicateKey } from '../lib/mongo_errors.ts';
import * as limits from '../lib/rate_limit.ts';
import * as factors from '../lib/factors.ts';
import { confirmChange } from '../lib/second_step.ts';
import EmailToken, { cancelEmailLinks } from '../models/email_token.ts';
import { cancelLinks } from '../models/password_reset.ts';
import User, { mfaOn } from '../models/user.ts';
import { say } from '../lib/messages.ts';

const emailRouter = express.Router();
export default emailRouter;

const logMailError = (what: string) => (err: unknown) =>
  log.error('Could not send the ' + what + ' email', { code: log.codeOf(err) });
const fieldOf = (field?: string) => (field ? { field } : {});
const inUse = () => say('email-in-use', undefined, { field: 'email' });

emailRouter.post(
  '/change',
  // After jwtAuth: requests from someone not signed in never count against an address many share.
  jwtAuth,
  notGuest,
  limits.emailLinks,
  limits.passwordCheck,
  express.json(),
  async (req, res) => {
    if (!mailer.available()) return res.status(503).json(say('email-unavailable'));
    const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
    const address = email.normalize(body.email);
    if (!email.isValid(address)) return res.status(400).json(say('email-required', undefined, { field: 'email' }));
    const user = await User.findById(userOf(req)._id);
    if (!user) return res.status(404).json(say('no-user'));
    // The password first, so a stolen session without it learns nothing, not
    // even whether an address has an account. Then whether the address is free
    // and the link limit, and only then, with two-step sign-in on, a current
    // factor (decision 6), so a factor is never used on a change refused
    // anyway. (confirmChange checks the password again, with the codes the
    // other confirmations use.)
    const twoStep = mfaOn(user);
    // An account with no password of its own: a fresh provider sign-in instead (ADR 15).
    if (!(await factors.firstProofHeld(user, body))) {
      if (user.passwordless) return res.status(400).json(say('provider-reauth-needed'));
      const code = twoStep && body.password ? 'current-password-wrong' : 'current-password-needed';
      // 400 rather than 401: the user is signed in, and a 401 would sign them out.
      return res.status(400).json(say(code, undefined, { field: 'password' }));
    }
    // No more than sign-up says about an address: whether an account has it.
    // Checked again when the link is opened.
    if (await User.exists({ email: address }).collation(email.collation)) return res.status(400).json(inUse());
    if (await emailLinks.tooMany(user)) return res.status(429).json(say('too-many-email-links'));
    if (twoStep || user.passwordless) {
      const check = await confirmChange(req, body);
      if (!check.ok) return res.status(check.status).json(say(check.code, check.params, fieldOf(check.field)));
    }

    const token = await emailLinks.makeLink(user, 'change', address);
    res.status(200).json(say('email-change-sent', { hours: emailLinks.LINK_HOURS }));
    const language = user.preferences?.language;
    accountMail.sendConfirmChange(address, token, emailLinks.LINK_HOURS, language).catch(logMailError('email change'));
    // Not to an address nobody has confirmed: it may be a stranger's.
    if (!user.emailUnverified) {
      accountMail.sendChangeNotice(user.email, language).catch(logMailError('email change notice'));
    }
    return undefined;
  }
);

// Opening the page that holds the link spends nothing, as with a reset link:
// the token is spent here, when the page sends it.
emailRouter.post('/confirm', limits.confirmEmail, express.json(), async (req, res) => {
  const token = ((req.body ?? {}) as { token?: unknown }).token;
  if (typeof token !== 'string' || !token) return res.status(400).json(say('email-link-bad'));

  // Marking the link used in the same step makes each work only once.
  const now = new Date();
  const link = await EmailToken.findOneAndUpdate(
    { tokenHash: emailLinks.hashToken(token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  );
  const user = link && (await User.findById(link.userId));
  if (!link || !user || user.guest) return res.status(400).json(say('email-link-bad'));

  if (link.kind === 'verify') {
    // The address may have changed since the link was sent.
    if (user.email !== link.email) return res.status(400).json(say('email-link-bad'));
    await User.updateOne({ _id: user._id }, { $unset: { emailUnverified: 1 } });
    return res.status(200).json(say('email-verified'));
  }

  // The link holds the account's tokenVersion when it was asked for: a change
  // since (a password change or reset, signing out everywhere, two-step sign-in
  // turned on or a factor changed) ends it, so an older link cannot move the
  // address past a step the account now asks for. Asking for the link raises nothing.
  const version = link.tokenVersion;
  if (typeof version !== 'number' || version !== (user.tokenVersion || 0)) {
    return res.status(400).json(say('email-link-bad'));
  }
  try {
    // Signs out every device, and ends links sent to the old address. The
    // filter says the tokenVersion again, for a change at the same moment.
    const changed = await User.updateOne(
      { _id: user._id, ...versionIs(version) },
      {
        $set: { email: link.email, ...(link.email !== user.email && { emailChangedAt: now }) },
        $unset: { emailUnverified: 1 },
        $inc: { tokenVersion: 1 }
      }
    );
    if (!changed.matchedCount) return res.status(400).json(say('email-link-bad'));
  } catch (err) {
    // The unique index catches someone taking the address since the link was sent.
    if (isDuplicateKey(err)) return res.status(400).json(inUse());
    throw err;
  }
  await cancelLinks(user._id);
  await cancelEmailLinks(user._id);
  return res.status(200).json(say('email-changed'));
});

emailRouter.post('/resend', jwtAuth, notGuest, limits.emailLinks, async (req, res) => {
  if (!mailer.available()) return res.status(503).json(say('email-unavailable'));
  const user = userOf(req);
  if (!user.emailUnverified) return res.status(400).json(say('already-verified'));
  if (await emailLinks.tooMany(user)) return res.status(429).json(say('too-many-email-links'));
  const token = await emailLinks.makeLink(user, 'verify', user.email);
  res.status(200).json(say('verification-sent', { hours: emailLinks.LINK_HOURS }));
  accountMail
    .sendVerify(user.email, token, emailLinks.LINK_HOURS, user.preferences?.language)
    .catch(logMailError('email confirmation'));
  return undefined;
});
