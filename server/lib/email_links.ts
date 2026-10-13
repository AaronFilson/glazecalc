// Links emailed to confirm an address (models/email_token.ts): the one sent to
// a new account, and the one sent to the new address of an email change.
import crypto from 'node:crypto';
import EmailToken, { cancelEmailLinks } from '../models/email_token.ts';
import type { UserDocument } from '../models/user.ts';
import * as accountMail from './account_mail.ts';
import * as log from './log.ts';

/** How long a link works. */
export const LINK_HOURS = 24;
// Links per account per hour, on top of the per-address rate limit.
const LINKS_PER_HOUR = 5;
const HOUR = 60 * 60 * 1000;

export const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

/** Whether the account has asked for as many links as it may this hour. */
export const tooMany = async (user: UserDocument): Promise<boolean> =>
  (await EmailToken.countDocuments({ userId: user._id, createdAt: { $gt: new Date(Date.now() - HOUR) } })) >=
  LINKS_PER_HOUR;

/** Makes a link for an address, ending the account's open links of that kind, and returns its token. */
export async function makeLink(user: UserDocument, kind: 'verify' | 'change', address: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  // Only the newest link works.
  await cancelEmailLinks(user._id, kind);
  await EmailToken.create({
    userId: user._id,
    kind,
    email: address,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + LINK_HOURS * HOUR)
  });
  return token;
}

/** Emails a new account the link that confirms its address. Mail never delays or fails the request that asked. */
export const sendVerification = (user: UserDocument): void => {
  makeLink(user, 'verify', user.email)
    .then((token) => accountMail.sendVerify(user.email, token, LINK_HOURS, user.preferences?.language))
    .catch((err: unknown) => log.error('Could not send the email confirmation', { err }));
};
