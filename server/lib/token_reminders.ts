// The "your access token expires soon" email (docs/integrations-plan.md, item
// 28; decision 4), REMINDER_DAYS_BEFORE days before a personal token expires.
// It runs inside the server process, as the trial sweeper does: at start, then
// daily. Each token gets it once: the run claims a token by setting remindedAt
// in one atomic update before the email goes, so two runs (or two servers)
// never send it twice, and gives the claim back only when the email could not
// be sent, for the next run to try again. A token whose whole life is no
// longer than the notice (a 7-day token) gets none: it was made knowing when
// it ends, and its "made" email says so. Never to a trial, nor an address
// nobody has confirmed.
import AccessToken, { REMINDER_DAYS_BEFORE } from '../models/access_token.ts';
import User from '../models/user.ts';
import * as accountMail from './account_mail.ts';
import { isGuestAddress } from './email.ts';
import * as log from './log.ts';
import * as mailer from './mailer.ts';

const DAY = 24 * 60 * 60 * 1000;
// Per run; any more wait for the next run.
const BATCH = 500;

/** Sends the reminders due by `now`; resolves with how many went. */
export const sendTokenReminders = async (now = new Date()): Promise<number> => {
  // Without email nothing is claimed, so the reminders go once it is set up.
  if (!mailer.available()) return 0;
  const soon = new Date(now.getTime() + REMINDER_DAYS_BEFORE * DAY);
  const due = await AccessToken.find({
    kind: 'pat',
    revokedAt: null,
    remindedAt: null,
    expiresAt: { $gt: now, $lte: soon },
    // Made more than the notice before it expires: $expr compares the two fields.
    $expr: { $gt: [{ $subtract: ['$expiresAt', '$createdAt'] }, REMINDER_DAYS_BEFORE * DAY] }
  })
    .select('_id')
    .limit(BATCH)
    .lean();
  let sent = 0;
  for (const { _id } of due) {
    const token = await AccessToken.findOneAndUpdate(
      { _id, revokedAt: null, remindedAt: null, expiresAt: { $gt: now } },
      { $set: { remindedAt: now } },
      { returnDocument: 'after' }
    );
    if (!token) continue;
    const user = await User.findById(token.userId, { email: 1, emailUnverified: 1, guest: 1, preferences: 1 });
    // No one to tell: the claim stays, so the token is not looked at again.
    if (!user || user.guest || user.emailUnverified || !user.email || isGuestAddress(user.email)) continue;
    try {
      await accountMail.sendTokenExpiring(user.email, token, user.preferences?.language ?? undefined);
      sent++;
    } catch (err) {
      // Only the error's code: an SMTP error's message can repeat the address.
      log.error('Could not send the access token expiring email', { code: log.codeOf(err) });
      await AccessToken.updateOne({ _id, remindedAt: now }, { $unset: { remindedAt: 1 } });
    }
  }
  return sent;
};

/** Runs now and every `every` ms (a day); the timer does not keep the process alive. */
export const start = (
  every = DAY,
  run: () => Promise<number> = () => sendTokenReminders()
): ReturnType<typeof setInterval> => {
  const once = () =>
    run().then(
      (count) => count && log.info('Sent access token expiry reminders', { count }),
      (err: unknown) => log.error('Could not send access token expiry reminders', { err })
    );
  void once();
  return setInterval(once, every).unref();
};
