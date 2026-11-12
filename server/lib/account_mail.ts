// The emails about an account, in the account's language (docs/i18n-plan.md).
// Each email is whole sentences with its values named, {account}, so it
// translates whole; a language without a translation gets English. The English
// is fingerprinted in the tests: change it, and the tests say to have the
// translations made again.
//
// The words are data, one file a language (server/i18n/mail/<language>.json),
// as the app's own messages are: each holds that language's translation of
// every kind of email it has, under the names exported here (RESET, VERIFY, …).
import fs from 'node:fs';
import * as mailer from './mailer.ts';
import { isGuestAddress } from './email.ts';
import * as log from './log.ts';
import languages from '../../lib/regions/languages.js';

export interface Email {
  subject: string;
  /** Plain text, with the values as {name}. */
  text: string;
}

const MAIL = new URL('../i18n/mail/', import.meta.url);
/** Each language's emails, read once when the server starts. */
const MAIL_BY_LANGUAGE: Record<string, Record<string, unknown>> = Object.fromEntries(
  fs
    .readdirSync(MAIL)
    .filter((file) => file.endsWith('.json'))
    .map((file) => [file.slice(0, -'.json'.length), JSON.parse(fs.readFileSync(new URL(file, MAIL), 'utf8'))])
);

/** One kind of email in every language that has it. */
function mailTable<T>(name: string): Record<string, T> {
  return Object.fromEntries(
    Object.entries(MAIL_BY_LANGUAGE)
      .filter(([, mail]) => name in mail)
      .map(([language, mail]) => [language, mail[name] as T])
  );
}

/** The reset email: {account}, {link}, {minutes} and {app}. */
export const RESET: Record<string, Email> = mailTable<Email>('RESET');

/** The email after a password is changed: {account}, {forgot} and {app}. */
export const CHANGED: Record<string, Email> = mailTable<Email>('CHANGED');

/**
 * The email after an account is deleted: {account}, {days} and {app}, in each
 * language offered.
 */
export const DELETED: Record<string, Email> = mailTable<Email>('DELETED');

/**
 * How long a deleted account lives on in backups, in days: the nightly dumps
 * expire after 30 days (deploy/aws/README.md, section 3), the EBS snapshots
 * after 7 (deploy/aws/dlm-policy.json).
 */
export const BACKUP_DAYS = 30;

/** The email in the language, or in English. */
const inLanguage = (emails: Record<string, Email>, language?: string): Email =>
  (language && emails[language]) || emails['en']!;

/** The language an email goes in: the account's, where the emails are translated into it, or English. */
const writtenIn = (emails: Record<string, unknown>, language?: string): string =>
  language && emails[language] ? language : 'en';

/** The right-to-left mark: an invisible letter that reads right to left. */
const RLM = '\u200f';

/**
 * A plain-text email as it goes in its language. In a right-to-left one (Arabic, Urdu) the subject and each
 * paragraph, each line of text, start with a right-to-left mark, so a mail program sets them right to left
 * even where a line starts with an address, a name or a link (docs/i18n-plan.md, "Right to left, as built"); the
 * signature's "-- " line stays as it is, so mail programs still know it. Any other language's as it is.
 */
export const inDirection = (message: mailer.Message, language: string): mailer.Message => {
  if (languages.languageFor(language)?.dir !== 'rtl') return message;
  const marked = (line: string) => (line.trim() && line !== '-- ' ? RLM + line : line);
  return { ...message, subject: RLM + message.subject, text: message.text.split('\n').map(marked).join('\n') };
};

/** Sends an email written in a language, as that language's direction needs (inDirection). */
const sendIn = (language: string, message: mailer.Message): Promise<void> =>
  mailer.send(inDirection(message, language));

/** An email's text with its values in. */
const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));

/**
 * A count with its unit, for the languages whose emails take the two as one
 * value, as the number decides the words around it: Romanian has 1 zi, 2 to
 * 19 zile, and puts "de" before the noun from 20 on (20 de zile, 101 zile,
 * 120 de zile), as its plural forms one, few and other say. Those emails
 * write {days} where the others write "{days} days".
 */
const COUNTED: Record<string, Record<'days' | 'hours', Partial<Record<Intl.LDMLPluralRule, string>>>> = {
  ro: {
    days: { one: '# zi', few: '# zile', other: '# de zile' },
    hours: { one: '# oră', few: '# ore', other: '# de ore' }
  }
};

/** A number of days or hours for an email in a language: the whole phrase where COUNTED has it, else the number. */
export const counted = (language: string, unit: 'days' | 'hours', count: number): string | number => {
  const forms = COUNTED[language]?.[unit];
  if (!forms) return count;
  const form = forms[new Intl.PluralRules(language).select(count)] ?? forms.other!;
  return form.replace('#', String(count));
};

/** A page of the app in the account's language: /de/forgot for German. */
const pageIn = (language: string | undefined, page: string): string =>
  mailer.appUrl() + languages.languagePrefix(language ?? 'en') + page;

export const sendReset = (to: string, token: string, minutes: number, language?: string): Promise<void> => {
  const email = inLanguage(RESET, language);
  return sendIn(writtenIn(RESET, language), {
    to,
    subject: email.subject,
    // The token is after the #, so it stays in the browser: it never reaches
    // the server's logs or another site's Referer header.
    text: fill(email.text, {
      account: to,
      link: pageIn(language, '/reset#token=' + token),
      minutes,
      app: mailer.appUrl()
    })
  });
};

export const sendChanged = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(CHANGED, language);
  return sendIn(writtenIn(CHANGED, language), {
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

export const sendDeleted = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(DELETED, language);
  return sendIn(writtenIn(DELETED, language), {
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      days: counted(writtenIn(DELETED, language), 'days', BACKUP_DAYS),
      app: mailer.appUrl()
    })
  });
};

// The emails about confirming an address, in most languages offered: a language
// without a translation (for now Korean and Chinese) gets English, as with the others.

/** Sent to a new account's address: {account}, {link}, {hours} and {app}. */
export const VERIFY: Record<string, Email> = mailTable<Email>('VERIFY');

/** Sent to the new address of an email change: {account}, {link}, {hours} and {app}. */
export const CONFIRM_CHANGE: Record<string, Email> = mailTable<Email>('CONFIRM_CHANGE');

/** Sent to the old address when a change is asked for: {account}, {forgot} and {app}. */
export const CHANGE_NOTICE: Record<string, Email> = mailTable<Email>('CHANGE_NOTICE');

/**
 * Whole hours a link works for, as the emails say. `next`: the page to go on
 * to once the address is confirmed, a page of the app already checked
 * (pages.ts, returnPage), such as the consent page of an app that was asking
 * to connect when the account was made.
 */
export const sendVerify = (
  to: string,
  token: string,
  hours: number,
  language?: string,
  next?: string | null
): Promise<void> => {
  const email = inLanguage(VERIFY, language);
  return sendIn(writtenIn(VERIFY, language), {
    to,
    subject: email.subject,
    // After the #, like a reset link's token, so it stays in the browser; the page to go on to too.
    text: fill(email.text, {
      account: to,
      link: pageIn(language, '/confirm-email#token=' + token + (next ? '&next=' + encodeURIComponent(next) : '')),
      hours: counted(writtenIn(VERIFY, language), 'hours', hours),
      app: mailer.appUrl()
    })
  });
};

export const sendConfirmChange = (to: string, token: string, hours: number, language?: string): Promise<void> => {
  const email = inLanguage(CONFIRM_CHANGE, language);
  return sendIn(writtenIn(CONFIRM_CHANGE, language), {
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      link: pageIn(language, '/confirm-email#token=' + token),
      hours: counted(writtenIn(CONFIRM_CHANGE, language), 'hours', hours),
      app: mailer.appUrl()
    })
  });
};

export const sendChangeNotice = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(CHANGE_NOTICE, language);
  return sendIn(writtenIn(CHANGE_NOTICE, language), {
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

// Notices about two-step sign-in (docs/mfa-plan.md, item 10), in most languages
// offered (Korean and Chinese get English for now). Each goes to the account's address after the change, so someone who
// did not make it hears of it.

/** The factor a notice is about. */
export type MfaMethod = { kind: 'totp' } | { kind: 'passkey'; name: string };

/** Sent when a second step is added: {account}, {method}, {forgot} and {app}. */
export const MFA_ADDED: Record<string, Email> = mailTable<Email>('MFA_ADDED');

/** Sent when a second step is removed: {account}, {method}, {forgot} and {app}. */
export const MFA_REMOVED: Record<string, Email> = mailTable<Email>('MFA_REMOVED');

/** Sent when a recovery code is used: {account}, {left}, {page}, {forgot} and {app}. */
export const RECOVERY_USED: Record<string, Email> = mailTable<Email>('RECOVERY_USED');

/** Sent when new recovery codes are made: {account}, {forgot} and {app}. */
export const RECOVERY_NEW: Record<string, Email> = mailTable<Email>('RECOVERY_NEW');

/**
 * Sent when someone entered the password but did not finish the second step:
 * a sign-in ran out of tries, or a round of wrong codes was used up
 * (server/lib/code_lock.ts; second_step.ts noticeUnfinished), at most once a day.
 * Like the other notices it says nothing of where the tries came from.
 * {account}, {forgot} and {app}.
 */
export const SECOND_STEP_UNFINISHED: Record<string, Email> = mailTable<Email>('SECOND_STEP_UNFINISHED');

/**
 * Sent when two-step sign-in is turned off altogether (the last factor
 * removed, or the owner's clear_mfa.ts --clear): one email instead of one per
 * factor. {account}, {forgot} and {app}.
 */
export const MFA_OFF: Record<string, Email> = mailTable<Email>('MFA_OFF');

/**
 * The owner's 7-day notice before turning two-step sign-in off for someone who
 * lost every factor (server/clear_mfa.ts --notify): {account}, {date}, {forgot}
 * and {app}. Replies go to privacy@glazecalcapp.com.
 */
export const MFA_CLEAR_NOTICE: Record<string, Email> = mailTable<Email>('MFA_CLEAR_NOTICE');

/**
 * A date as the email's language writes it, day, month in words and year (UTC):
 * 21 October 2026 in English, 21. Oktober 2026 in German. Always in the Gregorian
 * calendar, whatever the Calendar setting (which changes only the dates the app
 * shows): Intl would write Thai in the Buddhist era.
 */
export const mailDate = (date: Date, language?: string): string =>
  date.toLocaleDateString(language && language !== 'en' ? language : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
    calendar: 'gregory'
  });

/** How each email names a factor, as a whole phrase: {name} is a passkey's name. */
export const METHODS: Record<string, { totp: string; passkey: string }> = mailTable<{ totp: string; passkey: string }>(
  'METHODS'
);

/** The phrase for a factor in the language, or in English. A passkey's name is kept to one plain line. */
export const methodIn = (method: MfaMethod, language?: string): string => {
  const phrases = (language && METHODS[language]) || METHODS['en']!;
  if (method.kind === 'totp') return phrases.totp;
  const name = method.name
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, ' ')
    .trim()
    .slice(0, 60);
  return phrases.passkey.replace('{name}', () => name);
};

const sendMfaChange = (emails: Record<string, Email>, to: string, method: MfaMethod, language?: string) => {
  const email = inLanguage(emails, language);
  return sendIn(writtenIn(emails, language), {
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      method: methodIn(method, language),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};

export const sendMfaAdded = (to: string, method: MfaMethod, language?: string): Promise<void> =>
  sendMfaChange(MFA_ADDED, to, method, language);

export const sendMfaRemoved = (to: string, method: MfaMethod, language?: string): Promise<void> =>
  sendMfaChange(MFA_REMOVED, to, method, language);

export const sendRecoveryUsed = (to: string, left: number, language?: string): Promise<void> => {
  const email = inLanguage(RECOVERY_USED, language);
  return sendIn(writtenIn(RECOVERY_USED, language), {
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      left,
      page: pageIn(language, '/account'),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};

export const sendRecoveryNew = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(RECOVERY_NEW, language);
  return sendIn(writtenIn(RECOVERY_NEW, language), {
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

export const sendMfaOff = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(MFA_OFF, language);
  return sendIn(writtenIn(MFA_OFF, language), {
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

export const sendSecondStepUnfinished = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(SECOND_STEP_UNFINISHED, language);
  return sendIn(writtenIn(SECOND_STEP_UNFINISHED, language), {
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

/**
 * The 7-day notice (server/clear_mfa.ts --notify): two-step sign-in goes off
 * on `offDate` unless the person writes to privacy@. Unlike noticeMfa it
 * rejects on failure, so the script can say the mail did not go.
 */
export const sendMfaClearNotice = (to: string, offDate: Date, language?: string): Promise<void> => {
  const email = inLanguage(MFA_CLEAR_NOTICE, language);
  // The date in the email's own language: English where the email falls back to it.
  const dateLanguage = language && MFA_CLEAR_NOTICE[language] ? language : 'en';
  return sendIn(writtenIn(MFA_CLEAR_NOTICE, language), {
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      date: mailDate(offDate, dateLanguage),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};

/**
 * One notice, as the routes send it. 'mfa-off' is for when two-step sign-in
 * ends altogether (the last factor removed, or clear_mfa.ts --clear): send it
 * instead of 'removed', so the person gets one email.
 */
export type MfaNotice =
  | { kind: 'added'; method: MfaMethod }
  | { kind: 'removed'; method: MfaMethod }
  | { kind: 'mfa-off' }
  | { kind: 'recovery-used'; left: number }
  | { kind: 'recovery-new' }
  | { kind: 'second-step-unfinished' };

const sendNotice = (to: string, notice: MfaNotice, language?: string): Promise<void> => {
  switch (notice.kind) {
    case 'added':
      return sendMfaAdded(to, notice.method, language);
    case 'removed':
      return sendMfaRemoved(to, notice.method, language);
    case 'mfa-off':
      return sendMfaOff(to, language);
    case 'recovery-used':
      return sendRecoveryUsed(to, notice.left, language);
    case 'recovery-new':
      return sendRecoveryNew(to, language);
    case 'second-step-unfinished':
      return sendSecondStepUnfinished(to, language);
  }
};

/**
 * What the routes call (streams A and B), after the reply: sends the notice in
 * the account's language, only when the address is confirmed
 * (!user.emailUnverified) and never to a trial, nor when email is off. Never
 * throws or rejects: a failure is logged by its error code only, as
 * logMailError does, since an SMTP error can repeat the address.
 */
export const noticeMfa = (
  user: {
    email: string;
    emailUnverified?: boolean | null;
    guest?: boolean | null;
    preferences?: { language?: string | null } | null;
  },
  notice: MfaNotice
): void => {
  const failed = (err: unknown) =>
    log.error('Could not send the two-step sign-in notice email', { code: log.codeOf(err) });
  try {
    if (!user?.email || user.emailUnverified || user.guest || isGuestAddress(user.email) || !mailer.available()) return;
    sendNotice(user.email, notice, user.preferences?.language ?? undefined).catch(failed);
  } catch (err) {
    failed(err);
  }
};

// Notices about signing in with Google, GitHub or Microsoft (server/routes/oauth_routes.ts),
// in English until the next translation wave; other languages get the English.

/** Sent when a provider is linked: {account}, {provider}, {page}, {forgot} and {app}. */
export const PROVIDER_LINKED: Record<string, Email> = mailTable<Email>('PROVIDER_LINKED');

/** Sent when a provider is unlinked: {account}, {provider}, {forgot} and {app}. */
export const PROVIDER_UNLINKED: Record<string, Email> = mailTable<Email>('PROVIDER_UNLINKED');

/** A provider's name as the emails write it: a brand, the same in every language. */
export const PROVIDER_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub', microsoft: 'Microsoft' };

/**
 * The parts of the email after a password reset that stopped anything, put
 * together by sendResetStopped: the opening ({account}), a lead-in to the list
 * of what was stopped, a line for each kind ({count} and {page}; {providers},
 * named as brands, and {page}; none), and the closing ({forgot} and {app}).
 * A reset means someone else may have had the password, so it stops the
 * account's access tokens and connected apps (docs/adr/0017-mcp-server.md), its
 * links to Google, GitHub and Microsoft (docs/adr/0015-provider-sign-in.md) and its share
 * links (docs/adr/0020-share-links.md). In every language the site offers.
 */
export interface ResetStoppedEmail {
  subject: string;
  opening: string;
  stopped: string;
  tokens: string;
  providers: string;
  shareLinks: string;
  closing: string;
}

export const RESET_STOPPED: Record<string, ResetStoppedEmail> = mailTable<ResetStoppedEmail>('RESET_STOPPED');

/** What a password reset stopped, for its email: none of them, and it is the changed-password email. */
export interface ResetStopped {
  /** Access tokens and connected apps revoked. */
  tokens: number;
  /** The providers unlinked (their ids). */
  providers: string[];
  /** Share links stopped. */
  shareLinks: number;
}

/**
 * The email after a password reset: CHANGED, in the account's language, when
 * the reset stopped nothing else; otherwise RESET_STOPPED, with a line for
 * each kind of thing it stopped, in the order they are listed there.
 */
export const sendResetDone = (to: string, stopped: ResetStopped, language?: string): Promise<void> => {
  if (!stopped.tokens && !stopped.providers.length && !stopped.shareLinks) return sendChanged(to, language);
  const email = (language && RESET_STOPPED[language]) || RESET_STOPPED['en']!;
  const values = {
    account: to,
    count: stopped.tokens,
    providers: stopped.providers.map((provider) => PROVIDER_NAMES[provider] ?? provider).join(', '),
    page: pageIn(language, '/account'),
    forgot: pageIn(language, '/forgot'),
    app: mailer.appUrl()
  };
  const lines = [
    stopped.tokens ? email.tokens : '',
    stopped.providers.length ? email.providers : '',
    stopped.shareLinks ? email.shareLinks : ''
  ].join('');
  return sendIn(writtenIn(RESET_STOPPED, language), {
    to,
    subject: email.subject,
    text: fill(email.opening + email.stopped + lines + email.closing, values)
  });
};

const sendProviderChange = (emails: Record<string, Email>, to: string, provider: string, language?: string) => {
  const email = inLanguage(emails, language);
  return sendIn(writtenIn(emails, language), {
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      provider: PROVIDER_NAMES[provider] ?? provider,
      page: pageIn(language, '/account'),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};

/**
 * Tells the account a provider was linked or unlinked, after the reply, as
 * noticeMfa does: only to a confirmed address, never to a trial, never when
 * email is off, and never throwing; a failure is logged by its code only.
 */
export const noticeProvider = (
  user: {
    email: string;
    emailUnverified?: boolean | null;
    guest?: boolean | null;
    preferences?: { language?: string | null } | null;
  },
  change: 'linked' | 'unlinked',
  provider: string
): void => {
  const failed = (err: unknown) =>
    log.error('Could not send the sign-in method notice email', { code: log.codeOf(err) });
  try {
    if (!user?.email || user.emailUnverified || user.guest || isGuestAddress(user.email) || !mailer.available()) return;
    const emails = change === 'linked' ? PROVIDER_LINKED : PROVIDER_UNLINKED;
    sendProviderChange(emails, user.email, provider, user.preferences?.language ?? undefined).catch(failed);
  } catch (err) {
    failed(err);
  }
};

// Access tokens (docs/integrations-plan.md, item 28), in every language the
// site offers. A token's name is the person's own text, kept to one plain line.

/** A new personal access token: {account}, {name}, {date} it expires, {page}, {forgot} and {app}. */
export const TOKEN_MADE: Record<string, Email> = mailTable<Email>('TOKEN_MADE');

/**
 * A new personal access token that can change records (data:write): as
 * TOKEN_MADE, with the same values, saying so.
 */
export const TOKEN_MADE_WRITE: Record<string, Email> = mailTable<Email>('TOKEN_MADE_WRITE');

/** A personal access token expiring soon: {account}, {name}, {date}, {page} and {app}. */
export const TOKEN_EXPIRING: Record<string, Email> = mailTable<Email>('TOKEN_EXPIRING');

/** A token's name for an email: one plain line, at most 100 characters. */
export const tokenNameForMail = (name: string): string =>
  name
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, ' ')
    .trim()
    .slice(0, 100);

const sendTokenMail = (
  emails: Record<string, Email>,
  to: string,
  token: { name: string; expiresAt: Date },
  language?: string
): Promise<void> => {
  const email = inLanguage(emails, language);
  // The date in the email's own language: English where the email falls back to it.
  const dateLanguage = language && emails[language] ? language : 'en';
  return sendIn(writtenIn(emails, language), {
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      name: tokenNameForMail(token.name),
      date: mailDate(token.expiresAt, dateLanguage),
      page: pageIn(language, '/account'),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};

/** The notice for a new token, naming what it may do: read, or read and change (TOKEN_MADE_WRITE). */
export const sendTokenMade = (
  to: string,
  token: { name: string; expiresAt: Date; scopes?: readonly string[] },
  language?: string
): Promise<void> =>
  sendTokenMail(token.scopes?.includes('data:write') ? TOKEN_MADE_WRITE : TOKEN_MADE, to, token, language);

export const sendTokenExpiring = (
  to: string,
  token: { name: string; expiresAt: Date },
  language?: string
): Promise<void> => sendTokenMail(TOKEN_EXPIRING, to, token, language);

// The notice for each new connection of an AI app (docs/adr/0024-authorization-server.md),
// sent from the consent API when the person says yes.

/** The parts of the connection notice, put together as the connection is. */
export interface ConnectionEmail {
  subject: string;
  /** {account}, {date} and {time}: when it was connected. */
  opening: string;
  /** {name}: the app's name, as it gave it. */
  named: string;
  /** {host}: the app's own address, which Glazecalc fetched its details from (CIMD). */
  checked: string;
  /** An app that registered itself (DCR): its name is only its own word. */
  selfDescribed: string;
  /** {host}: where the answer goes. */
  answerAt: string;
  /** {host}: the answer goes to the person's own computer (a loopback address). */
  loopback: string;
  read: string;
  /** {days}: how long it may change records. */
  write: string;
  /** {page}, {forgot} and {app}. */
  closing: string;
}

export const CONNECTION_MADE: Record<string, ConnectionEmail> = mailTable<ConnectionEmail>('CONNECTION_MADE');

/** A new connection, as the notice names it. */
export interface ConnectionMade {
  /** The app's name, cleaned (oauth/provider.ts cleanName). */
  name: string;
  /** The app's own host, for an app named by its address (CIMD). */
  clientHost?: string;
  /** Where the answer goes: a host, or an app's own scheme (com.example.app:). */
  redirectHost?: string;
  /** Whether the answer goes to the person's own computer. */
  loopback: boolean;
  /** Whether it registered itself (DCR). */
  selfDescribed: boolean;
  /** For how many days it may change records; 0 or absent when it may only read. */
  writeDays?: number;
  createdAt: Date;
}

/** The time of day, in UTC, as 14:05. */
const mailTime = (date: Date): string => date.toISOString().slice(11, 16);

export const sendConnectionMade = (to: string, connection: ConnectionMade, language?: string): Promise<void> => {
  const email = (language && CONNECTION_MADE[language]) || CONNECTION_MADE['en']!;
  // The date and the days in the email's own language: English where the email falls back to it.
  const dateLanguage = writtenIn(CONNECTION_MADE, language);
  const values = {
    account: to,
    name: tokenNameForMail(connection.name),
    date: mailDate(connection.createdAt, dateLanguage),
    time: mailTime(connection.createdAt),
    days: counted(dateLanguage, 'days', connection.writeDays ?? 0),
    page: pageIn(language, '/account/apps'),
    forgot: pageIn(language, '/forgot'),
    app: mailer.appUrl()
  };
  const host = (value: string) => fill(value, { host: tokenNameForMail(connection.redirectHost ?? '') });
  const parts = [
    fill(email.opening, values),
    fill(email.named, values),
    ...(connection.clientHost ? [fill(email.checked, { host: tokenNameForMail(connection.clientHost) })] : []),
    ...(connection.selfDescribed ? [email.selfDescribed] : []),
    ...(connection.redirectHost ? [host(connection.loopback ? email.loopback : email.answerAt)] : []),
    fill(connection.writeDays ? email.write : email.read, values),
    fill(email.closing, values)
  ];
  return sendIn(writtenIn(CONNECTION_MADE, language), { to, subject: email.subject, text: parts.join('') });
};

/**
 * Sent when the account asks less before changes from apps and access tokens
 * are made (docs/adr/0025-confirm-before-changes.md): {account}, {choice},
 * {page}, {forgot} and {app}.
 */
export const CONFIRM_LOOSENED: Record<string, Email> = mailTable<Email>('CONFIRM_LOOSENED');

/** How CONFIRM_LOOSENED names each choice it can be loosened to. */
export const CONFIRM_CHOICES: Record<string, Record<'off' | 'removals', string>> = mailTable<
  Record<'off' | 'removals', string>
>('CONFIRM_CHOICES');

export const sendConfirmLoosened = (
  to: string,
  choice: 'off' | 'removals' | 'all',
  language?: string
): Promise<void> => {
  const email = inLanguage(CONFIRM_LOOSENED, language);
  const choices = (language && CONFIRM_LOOSENED[language] && CONFIRM_CHOICES[language]) || CONFIRM_CHOICES['en']!;
  return sendIn(writtenIn(CONFIRM_LOOSENED, language), {
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      choice: choice === 'all' ? '' : choices[choice],
      page: pageIn(language, '/account/apps'),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};
