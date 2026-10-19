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
/** A sign-in provider (server/lib/oauth.ts), by its id: brand names, kept as they are. */
const PROVIDER = '{provider, select, google {Google} github {GitHub} microsoft {Microsoft} other {the provider}}';
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
  'reset-sent':
    'If an account uses that email, we have sent it a link to reset the password. The link works for {minutes, plural, one {# minute} other {# minutes}}.',
  'signed-out-everywhere': 'You have been signed out on every device.',
  'email-unavailable': 'Email is not available yet, so we cannot send the link.',
  'email-change-sent':
    'We have sent a link to the new address. Your email changes when you open it. The link works for {hours, plural, one {# hour} other {# hours}}.',
  'email-changed': 'Your email has been changed. Please sign in again with the new address.',
  'email-verified': 'Your email is confirmed.',
  'email-link-bad': 'This link is not valid or has expired. Please ask for a new one.',
  'verification-sent':
    'We have sent a new link to your email. The link works for {hours, plural, one {# hour} other {# hours}}.',
  'already-verified': 'Your email is already confirmed.',
  'reset-link-bad': 'This reset link is not valid or has expired. Please ask for a new one.',

  // Two-step sign-in (docs/mfa-plan.md): signing in.
  'second-step': 'This account uses two-step sign-in. Please finish signing in with your second step.',
  'second-step-expired': 'Signing in took too long. Please enter your password again.',
  'second-step-tries': 'Too many wrong codes. Please enter your password again.',
  'second-step-busy': 'Your last try is still being checked. Please wait a moment and try again.',
  'second-step-account-limit':
    'Too many wrong codes from an authenticator app have been entered for this account, so codes are refused for up to {wait, select, hour {an hour} day {a day} other {a week}}. A passkey or a recovery code still works. If you did not enter them, someone knows your password: reset it by email from the sign-in page, which also ends this.',
  'code-needed': 'Please enter the 6-digit code from your authenticator app.',
  'code-wrong':
    "That code is not correct. Please check your authenticator app and try again. If every code is wrong, the phone's clock may be off: set its date and time automatically.",
  'recovery-code-wrong': 'That recovery code is not correct, or it has already been used.',
  'passkey-failed': 'The passkey could not be checked. Please try again, or use another way to sign in.',
  'passkey-unknown': 'This passkey does not belong to any Glazecalc account. It may have been removed.',

  // Two-step sign-in: setting it up on the account page.
  'mfa-needs-confirmed-email': 'Please confirm your email before turning on two-step sign-in.',
  'factor-needed':
    'Please also confirm it is you with a code from your authenticator app, a passkey or a recovery code.',
  'mfa-start-again': 'That took too long. Please start again.',
  'totp-exists': 'An authenticator app is already set up. Remove it first to set up another.',
  'totp-none': 'No authenticator app is set up.',
  'totp-added': 'Your authenticator app is set up.',
  'totp-removed': 'The authenticator app was removed.',
  'passkey-added': 'The passkey was added.',
  'passkey-renamed': 'The passkey was renamed.',
  'passkey-removed': 'The passkey was removed.',
  'passkey-not-found': 'No passkey with that id.',
  'passkey-name': (p: Params) => 'Please give the passkey a name of 1 to ' + p.most + ' characters.',
  'passkey-limit': (p: Params) =>
    'An account can have up to ' + p.most + ' passkeys. Please remove one before adding another.',
  'recovery-codes-made': 'New recovery codes are ready. The old ones no longer work.',
  'mfa-off': 'Two-step sign-in is off, and your recovery codes no longer work.',
  'mfa-not-on': 'Two-step sign-in is not on, so there are no recovery codes to make. Set up a second step first.',

  // Signing in with Google, GitHub or Microsoft (server/routes/oauth_routes.ts).
  'provider-off': 'That way of signing in is not available.',
  'provider-expired': 'Signing in took too long, or was started in another browser. Please try again.',
  'provider-failed': `Signing in with ${PROVIDER} did not work. Please try again.`,
  'provider-cancelled': `Signing in with ${PROVIDER} was cancelled.`,
  'provider-email-unverified': `Your ${PROVIDER} account has no verified email, so we cannot make an account with it. Please verify your email with ${PROVIDER}, or sign up with an email and password.`,
  'provider-email-missing': `Your ${PROVIDER} account did not give us an email address, so we cannot make an account with it. Please sign up with an email and password, then link ${PROVIDER} on your account page.`,
  'provider-email-in-use': `A Glazecalc account already uses the email from ${PROVIDER}. Please sign in to it the usual way, then link ${PROVIDER} on your account page.`,
  'provider-sign-in-to-link': `A Glazecalc account already uses the email from ${PROVIDER}. Please sign in to it once, the usual way, to link ${PROVIDER} to it.`,
  'provider-other-account': `This account does not have the email from ${PROVIDER}, so ${PROVIDER} was not linked. Please sign in to the account that does.`,
  'provider-verify-first': `Please confirm your email first, with the link we sent you. Then link ${PROVIDER} on your account page.`,
  'provider-linked': `${PROVIDER} is linked. You can now sign in with it.`,
  'provider-linked-elsewhere': `That ${PROVIDER} account is already linked to another Glazecalc account.`,
  'provider-already-linked': `Another ${PROVIDER} account is already linked to this one. Please unlink it first.`,
  'provider-unlinked': `${PROVIDER} is unlinked. You can no longer sign in with it.`,
  'provider-not-linked': `${PROVIDER} is not linked to this account.`,
  'provider-last-method':
    'This is the only way to sign in to this account. Please set a password or link another way first.',
  'provider-reauth-needed':
    'This account has no password, so please confirm it is you by signing in again with Google, GitHub or Microsoft, whichever you linked, then try again within 5 minutes.',

  'provider-reauth-other': `That ${PROVIDER} account is not linked to this Glazecalc account, so it cannot confirm a change here.`,
  'provider-reauth-password': 'This account has a password: please confirm with it instead.',
  'provider-not-fresh': `${PROVIDER} did not ask you to sign in again, so it cannot confirm a change. Please try again.`,
  'provider-reauthed': `You signed in again with ${PROVIDER}. Within 5 minutes, you can confirm one change on this page without a password.`,

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
  'cones-choices':
    'Firing can be to Orton cones (orton), to SK cones (sk) or by temperature alone (temperature), or follow the region.',
  'language-choices': 'Choose one of the languages in the list.',
  'density-choices': 'Choose specific gravity, Baumé or pint weight, or leave it to your region.',
  'englishTerms-choices': 'Choose on or off.',
  'notice-choices': 'Choose shown or hidden.',
  'recipeHelp-choices': 'Choose auto, shown or hidden.',
  'limitSet-choices': 'Choose hesselberth-roy or glazecalc.',
  'currency-choices': 'Choose one of the currencies in the list, or leave it to your region.',
  'calendar-choices':
    'Dates can be shown in the Gregorian calendar (gregory), the Thai Buddhist era (buddhist) or Japanese eras (japanese).',
  'shelf-invalid': (p: Params) => 'The shelf is a list of up to ' + p.most + ' materials.',
  'prices-invalid': (p: Params) =>
    'Prices are a list of up to ' + p.most + ' materials, each with a price per kilogram of 0 or more.',

  // Records: recipes, materials, additives, firing logs, notes, advice.
  'missing-information': 'Missing required information',
  'invalid-id': 'Invalid id',
  'record-not-found': `No {label, select, ${ONE}} with that id`,
  'none-saved': `No {label, select, ${ONE}} saved yet`,
  'nothing-to-update': 'Nothing to update',
  'record-updated': `Successfully updated {label, select, ${ONE}}`,
  'record-invalid': `Invalid {label, select, ${ONE}}`,
  'record-deleted': `Successfully deleted {label, select, ${ONE}}`,
  'record-trashed': `Moved the {label, select, ${ONE}} to the Trash. It can be put back for 30 days.`,
  'record-undone': `Went back to the earlier version of the {label, select, ${ONE}}.`,
  'nothing-to-undo': 'There is no earlier version to go back to.',
  'trash-restored': `Put the {label, select, ${ONE}} back.`,
  'trash-restored-already': 'This has been put back already.',
  'trash-emptied': 'The Trash is empty.',
  'trash-full':
    'The Trash is full, so an access token cannot move anything more to it. Please empty some of it on the website first.',
  'firing-links-full': 'A recipe can be linked to at most {most} firing logs. Unlink one to link another.',
  'account-limit': `An account can keep up to {limit} {label, select, ${MANY}}. Please remove some to save more.`,

  // Share links (server/routes/share_routes.ts).
  'not-shared': 'This recipe is not shared, or the link is not complete.',
  'share-stopped': 'The recipe is no longer shared. Its link no longer opens it.',

  // Access tokens (server/lib/token_auth.ts).
  'token-invalid': 'The access token is not valid, has expired or was revoked.',
  'token-scope': 'The access token does not allow this.',
  'token-not-here': 'This can only be done signed in on the website, not with an access token.',

  // The account page's access tokens (server/routes/token_routes.ts).
  'token-name': 'Please give the token a name of 1 to {most} characters.',
  'token-expiry-choices': 'Please choose when the token expires: after {choices} days.',
  'token-scope-choices': 'For now a token can only read your records.',
  'token-needs-confirmed-email': 'Please confirm your email before making an access token.',
  'token-limit': 'An account can have up to {most} access tokens at once. Please revoke one you no longer use first.',
  'token-made': 'Your access token is ready. Copy it now: it will not be shown again.',
  'token-revoked': 'The access token was revoked. It no longer works.',
  'tokens-revoked':
    '{count, plural, =0 {No access tokens were working.} one {# access token was revoked.} other {# access tokens were revoked.}}',
  'token-not-found': 'No access token with that id.',

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
  'too-many-email-links': 'Too many emails requested. ' + WAIT,
  'too-many-attempts': 'Too many attempts. ' + WAIT,
  'too-many-codes': 'Too many codes tried. ' + WAIT,
  'too-many-tokens': 'Too many access tokens that do not work were tried from this address. ' + WAIT,
  'too-many-shared-views': 'Too many shared recipes were opened from this address. ' + WAIT,
  'too-many-deletes':
    'This access token has moved too many records to the Trash in the last hour. Please try again later.',
  'too-many-mcp': 'Too many requests to the Glazecalc tools for AI assistants. ' + WAIT
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
