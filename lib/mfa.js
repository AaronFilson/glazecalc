'use strict';

// Two-step sign-in (docs/mfa-plan.md): the numbers the server and the app
// share. The shapes of the replies are in mfa.d.ts.

/** Passkeys an account may have at once. */
const PASSKEY_LIMIT = 10;
/** The longest passkey name, in characters. */
const PASSKEY_NAME_MAX = 60;
/** Recovery codes made at a time. */
const RECOVERY_CODE_COUNT = 10;
/** The account page warns when this many recovery codes or fewer are left. */
const RECOVERY_CODES_LOW = 2;
/** Digits in an authenticator app's code. */
const TOTP_DIGITS = 6;
/** How long the second step waits after the password, in minutes. */
const SECOND_STEP_MINUTES = 5;
/** Wrong codes allowed in one pending sign-in before the password is asked for again. */
const SECOND_STEP_TRIES = 5;

module.exports = {
  PASSKEY_LIMIT,
  PASSKEY_NAME_MAX,
  RECOVERY_CODE_COUNT,
  RECOVERY_CODES_LOW,
  TOTP_DIGITS,
  SECOND_STEP_MINUTES,
  SECOND_STEP_TRIES
};
