# 14. Two-step sign-in: passkeys, authenticator apps and recovery codes, the second step held by the page

Accepted, 2026-10-14. Follows the plan in [docs/mfa-plan.md](../mfa-plan.md) and the owner's
decisions of 14 October 2026. Builds on [ADR 5](0005-sign-in-tokens.md) (signed tokens with a
version number, in an httpOnly cookie).

## Context

An account is a password and an email address. Someone who learns the password, from another
site's breach or a phishing page, has the account. Potters keep years of recipes in Glazecalc, so
people asked for a second step. The site is a non-profit on one small instance
([ADR 1](0001-one-ec2-instance.md)): whatever it adds must cost nothing to run, need no outside
service and keep the privacy notice's promise of one cookie.

## Decision

- **Optional, per account, and only with a confirmed email address**, since the notices and the
  way back both rely on the address.
- **Three kinds of factor:**
  - **Passkeys** (WebAuthn), with `@simplewebauthn/server`, pinned. Registered as discoverable
    (`residentKey: 'preferred'`), with no attestation. Up to 10 per account, each with a name.
  - **An authenticator app** (TOTP, RFC 6238: 6 digits, 30 seconds, one step either side, each
    step used once), written on `node:crypto` in about 60 lines rather than a library. The QR
    code is drawn on the server as a `data:` SVG, so the Content-Security-Policy does not change.
  - **Ten recovery codes**, each usable once, made when the first factor is added.
- **No email or SMS codes.** A password reset already goes by email, so an email code adds
  nothing against someone who holds the mailbox. SMS is weak (SIM swaps) and costs money.
- **Passkey-first sign-in.** "Sign in with a passkey", and passkey autofill, sign in with a
  passkey alone, with user verification required. A passkey that proves the person is present
  and verified on their own device counts as both steps.
- **The second step is held by the page, not a cookie.** After the password, an account with a
  factor gets no session: the reply is `second-step`, with a signed, 5-minute token (its own
  audience and no user-id claim, so it can never pass as a sign-in) that the page keeps in
  memory only. The server keeps a record keyed by the token's random id, so the token works
  once, wrong codes are counted (5 per pending sign-in, and limits per address and per
  account), and a password reset in between ends it. A reload means typing the password again.
  The privacy notice's storage table is unchanged.
- **Secrets at rest.** The TOTP secret is encrypted with AES-256-GCM under `MFA_KEY`, with the
  user id as associated data; recovery codes are stored as HMAC-SHA256 under the same key. The
  key is an SSM SecureString (`/glazecalc/mfa-key`), copied into the app's environment by
  `deploy.sh`, which stops without it. It is never in a database dump, so the nightly dumps in S3
  hold no working secret or code. Passkeys store only public keys.
- **Changing how the account signs in needs the password and a current factor** (a code, a
  passkey or a recovery code); adding the first factor needs only the password. Every such
  change raises `tokenVersion`, as a password change does, so other sessions end, and is
  followed by a notice email to the account's address.
- **Losing everything.** A password reset never turns two-step sign-in off, and no HTTP route,
  not even an admin's, can. The owner runs `server/clear_mfa.ts` on the server, for a request
  from the confirmed address after a password reset, with seven days' notice to that address
  ([docs/data-requests.md](../data-requests.md)).
- **Ready for a staging copy.** Everything that differs between copies of the site comes from
  the environment: `SITE_URL` (the passkeys' relying-party id is its host name and the expected
  origin the URL itself, so passkeys made on staging never appear for production), `SITE_LABEL`
  (the authenticator app shows "Glazecalc (staging)", and mail subjects and a thin banner say
  so), a separate `MFA_KEY`, `NOINDEX` (no search engine indexes the copy) and `MAIL_ALLOWLIST`
  (a staging database can only mail the owner). Cookies stay host-only, so staging on
  `staging.glazecalcapp.com` never shares production's session. With none of these set,
  production's pages are byte for byte what they were.

## Alternatives

- **An httpOnly cookie for the pending second step**, bound to the same server record: it
  survives a reload, but adds a cookie and a line in the privacy notice. Declined: a reload in
  a 5-minute step is rare.
- **Email codes as a second factor**: familiar, but no protection against the mailbox's holder,
  who can already reset the password.
- **otplib or another TOTP library**: several packages for what `node:crypto` does in 60 lines.
- **bcrypt for recovery codes**: needless, as the codes have 50 bits of entropy each; the keyed
  hash also stops guessing from a stolen dump.
- **Passkey-first later**: one sign-in flow in the first release and less to test. Declined by
  the owner; discoverable passkeys make it cheap now.
- **An admin route to clear someone's factors**: quick, but a stolen admin session could then
  remove anyone's second step.

## Consequences

- Someone who turns it on and keeps their recovery codes is safe from a leaked password. Someone
  who loses every factor and every code waits seven days and must answer from their mailbox.
- `MFA_KEY` is a new secret to keep for good: losing it, or replacing it, stops every
  authenticator app and recovery code (passkeys keep working). The owner keeps an offline copy.
- Restoring a backup brings back each account's factors and unused codes as they were that
  night; nothing logs the changes in between.
- About 70 new English messages and four English-only emails wait for the next translation wave.
- The e2e tests use a virtual WebAuthn authenticator (Chrome DevTools Protocol) and compute
  TOTP codes in the test; a real phone and a platform passkey are tried by hand on staging.
