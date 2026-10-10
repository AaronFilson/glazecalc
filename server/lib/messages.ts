// What the server tells the person using the app (docs/i18n-plan.md). Each
// message has a stable code, which the app shows in the reader's language,
// and English text, which it shows where it has no translation. A message
// with values (a trial's limit, the kind of record) sends them as params.
//
// The kind of record is a code ('recipe', 'firing'), never English words put
// into a sentence: each message chooses its own words for it (ICU's select),
// so each language words "No recipe" and "No note" its own way.
import { IntlMessageFormat } from 'intl-messageformat';

type Params = Record<string, string | number>;
type Text = string | ((params: Params) => string);

const WAIT = 'Please wait a few minutes and try again.';

/** A kind of record, by the label its routes send (server/routes/records.ts): one, and several. */
const ONE =
  'additive {additive} advice {advice} firing {firing} material {material} note {note} recipe {recipe} trash {trash} other {record}';
const MANY =
  'additive {additives} advice {pieces of advice} firing {firing logs} material {materials} note {notes} recipe {recipes} trash {items in the trash} other {records}';

export const MESSAGES = {
  // Accounts and signing in.
  'email-required': 'Please enter an email',
  'account-exists': 'An account with that email already exists.',
  'sign-in-failed': 'Email or password is incorrect.',
  'signed-in': 'Success in signin',
  'signed-out': 'Signed out',
  'no-token': 'No token yet, so there is no email to find. Goodbye.',
  verified: 'User verified',
  'not-signed-in': 'could not authenticate user',
  'no-user': 'No user with that id',
  'not-allowed': 'Not allowed to change another user',
  'user-updated': 'User updated',
  'user-deleted': 'User deleted',
  'email-in-use': 'That email is already in use',
  'current-password-needed': 'Please enter your current password.',
  'current-password-wrong': 'Your current password is not correct.',
  'password-short': 'Please enter a password 8 characters or longer.',
  'password-long': 'Please enter a password of at most 72 characters (fewer with accented letters or symbols).',
  'password-changed': 'Your password has been changed.',
  'password-reset': 'Your password has been changed. Please sign in with your new password.',
  'reset-unavailable': 'Password reset by email is not available yet.',
  'reset-sent': (p: Params) =>
    'If an account uses that email, we have sent it a link to reset the password. The link works for ' +
    p.minutes +
    ' minutes.',
  'reset-link-bad': 'This reset link is not valid or has expired. Please ask for a new one.',

  // Trials.
  'trials-full': 'Too many people are trying Glazecalc right now. Please create a free account instead.',
  'trial-failed': 'Could not start a trial just now. Please try again.',
  'not-a-trial': 'This account is not a trial.',
  'account-needed': 'Please create an account first.',
  'trial-limit': `A trial can keep up to {limit} {label, select, ${MANY}}. Create a free account to save more.`,

  // Settings and the materials on hand.
  'nothing-to-change': 'Nothing to change',
  'weightUnit-choices': 'Weights can be in grams (g) or pounds and ounces (lb).',
  'gramPrecision-choices': 'Grams can show to a tenth (single) or in full (full).',
  'theme-choices': 'The theme can follow the device (system), or be light or dark.',
  'palette-choices': (p: Params) => 'Choose one of the palettes: ' + p.palettes + '.',
  'lead-choices': 'Lead can be off (never added or suggested) or on.',
  'region-choices': 'Choose one of the regions in the list.',
  'format-choices': 'Choose one of the number and date formats in the list.',
  'decimalMark-choices':
    'Amounts can be typed with either decimal mark (either), or only a comma (comma) or a point (point).',
  'temperature-choices': 'Temperatures can be in °C (C) or °F (F), or follow the region.',
  'cones-choices': 'Firing can be to Orton cones (orton) or by temperature alone (temperature), or follow the region.',
  'language-choices': 'Choose one of the languages in the list.',
  'density-choices': 'Choose specific gravity, Baumé or pint weight, or leave it to your region.',
  'englishTerms-choices': 'Choose on or off.',
  'notice-choices': 'Choose shown or hidden.',
  'shelf-invalid': (p: Params) => 'The shelf is a list of up to ' + p.most + ' materials.',

  // Records: recipes, materials, additives, firing logs, notes, advice.
  'missing-information': 'Missing required information',
  'invalid-id': 'Invalid id',
  'record-not-found': `No {label, select, ${ONE}} with that id`,
  'none-saved': `No {label, select, ${ONE}} saved yet`,
  'nothing-to-update': 'Nothing to update',
  'record-updated': `Successfully updated {label, select, ${ONE}}`,
  'record-invalid': `Invalid {label, select, ${ONE}}`,
  'record-deleted': `Successfully deleted {label, select, ${ONE}}`,
  'account-limit': `An account can keep up to {limit} {label, select, ${MANY}}. Please remove some to save more.`,

  // Requests in general.
  'not-found': 'Not found',
  'other-site': 'Requests from other sites are not accepted.',
  'invalid-input': 'Some of the information sent is not valid.',
  'too-large': 'That is more than can be saved at once.',
  'bad-request': 'Bad request',
  'server-error': 'Server Error',
  'too-many-sign-ins': 'Too many sign-in attempts. ' + WAIT,
  'too-many-sign-ups': 'Too many new accounts from this address. Please try again later.',
  'too-many-trials': 'Too many trials from this address. Please try again later, or create a free account.',
  'too-many-resets': 'Too many password reset requests. ' + WAIT,
  'too-many-attempts': 'Too many attempts. ' + WAIT
} satisfies Record<string, Text>;

export type MessageCode = keyof typeof MESSAGES;

/** The English text of a message. */
export function textOf(code: MessageCode, params: Params = {}): string {
  const text: Text = MESSAGES[code];
  if (typeof text === 'function') return text(params);
  // An ICU message, with its values.
  return text.includes('{') ? String(new IntlMessageFormat(text, 'en').format(params)) : text;
}

/**
 * A message as the API sends it: { code, msg }, with params when it has values
 * and anything else the response carries (the field it is about, an email).
 */
export function say(code: MessageCode, params?: Params, extra: Record<string, unknown> = {}) {
  return { code, msg: textOf(code, params), ...(params ? { params } : {}), ...extra };
}
