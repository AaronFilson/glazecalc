// Reads the emails the server wrote with MAIL_TRANSPORT=file (see env.ts).
import fs from 'node:fs';
import path from 'node:path';
import * as mailer from '../../lib/mailer.ts';

export interface SentMail {
  from: string;
  to: string;
  subject: string;
  text: string;
  date: string;
}

const all = (): SentMail[] => {
  const dir = process.env.MAIL_DIR;
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) as SentMail);
};

/** Emails sent to an address so far. */
export const to = (address: string): SentMail[] => all().filter((m) => m.to === address);

/**
 * Waits for the count of emails to an address to reach `count`, then returns them.
 * The app sends a notice after its reply, so under load the file can come late: this
 * first lets every send already started finish (mailer.idle), then polls for one still
 * to start. It returns as soon as the mail is there; `ms` only bounds a mail that never comes.
 */
export const waitFor = async (address: string, count: number, ms = 10000): Promise<SentMail[]> => {
  const end = Date.now() + ms;
  for (;;) {
    await mailer.idle();
    const found = to(address);
    if (found.length >= count || Date.now() > end) return found;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

/** The reset token from a reset email's link. */
export const tokenIn = (message: SentMail): string | null => {
  const match = /\/reset#token=([A-Za-z0-9_-]+)/.exec(message.text);
  return match ? match[1]! : null;
};

/** The token from a confirmation email's link (a new account's, or an email change's). */
export const linkTokenIn = (message: SentMail): string | null => {
  const match = /\/confirm-email#token=([A-Za-z0-9_-]+)/.exec(message.text);
  return match ? match[1]! : null;
};

/** Lets any mail a request started finish, for tests that expect none. */
export const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 300));
