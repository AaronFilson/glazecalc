# 15. Sign in with Google and GitHub: linked by the provider's id, never silently by email

Accepted, 2026-10-16. Phase 1 of [the integrations plan](../integrations-plan.md), with the owner's
decisions 1 (Google and GitHub first, Microsoft second) and 8 (verify email at sign-up). Builds on
[ADR 5](0005-sign-in-tokens.md) (the session cookie), [ADR 7](0007-trials-as-real-accounts.md)
(trials) and [ADR 14](0014-two-step-sign-in.md) (two-step sign-in).

## Context

People asked to sign in without yet another password. Glazecalc is a small non-profit on one
instance ([ADR 1](0001-one-ec2-instance.md)): no paid identity service, no provider script on its
pages (which would load before any click and break the privacy notice's promise), and nothing that
would let an account be taken over. The risk the research singled out is _pre-hijacking_: someone
makes a password account with another person's address; that person later presses "Continue with
Google"; a naive merge joins the two, and the first password still works. Sign-up already sends a
confirmation link ([EU plan](../eu-data-plan.md), item 9), but accounts made before it, and
unconfirmed ones, exist.

## Decision

- **Glazecalc is an OAuth client** of Google (OpenID Connect) and GitHub (OAuth 2.0 and its API),
  with the authorization code flow, **PKCE S256**, a **`state`** and, for Google, a **`nonce`**;
  one callback per provider (`SITE_URL/api/auth/<provider>/callback`), which also guards against
  mix-ups. Written on `fetch`, `node:crypto` and `jsonwebtoken` (already used) in
  `server/lib/oauth.ts`, rather than `openid-client`: two fixed providers need four requests, the
  worktrees share one `node_modules`, and Google's ID token is checked in full (signature against
  its published keys, issuer, audience, expiry, nonce). Google is asked for `openid email` only;
  GitHub for `user:email`, and only the **primary, verified** address from `/user/emails` counts.
  Every provider token is dropped once read.
- **The provider button is a plain link.** `GET /api/auth/:provider/start` writes a record (TTL 10
  minutes, `server/models/oauth_login.ts`) found by the SHA-256 of a random value in a
  **`SameSite=Lax` cookie** (Lax, because the provider's redirect back is a cross-site top-level
  navigation). In production it is `__Host-glazecalc_oauth` on `Path=/`, so no other host can
  plant one, as with the session; in development `glazecalc_oauth` on `Path=/api/auth`. The
  callback takes the record once, by cookie **and** state, swaps the code, decides what the
  answer means and sends the browser (303) back to the sign-in page in its language. The page
  then calls `POST /api/auth/finish`, a same-site request, which starts the session. So the
  `Strict` session cookie is always set by a first-party request, and the second step can be
  shown by the page that already has it.
- **Accounts are found by `{provider, subject}` only** (Google's `sub`, GitHub's numeric id), kept
  on the user as `identities` with a unique `provider:subject` key. The linking rules:
  - no account has the subject: a **new account only from a verified provider email**, with a
    random password nobody knows (`passwordless: true`, cleared when a password is set by the
    reset email);
  - an account already has that email: **nothing is linked silently.** The person signs in to it
    once, the usual way (password and second step, or a passkey); the same browser, still holding
    the cookie, then finishes the link, and only when the account's own email is confirmed. A
    session for any other account is refused;
  - from the account page: after the password (a fresh provider sign-in for an account without
    one, below), and a second step when two-step sign-in is on (as every change to how the
    account signs in, ADR 14), any provider account not linked elsewhere, whatever its email; one
    per provider; the account's email must be confirmed;
  - unlinking takes the same confirmation and never removes the last way in;
  - linking and unlinking each raise the account's `tokenVersion`, as every change to how the
    account signs in does (ADR 14), so every other session ends (whoever unlinks may be undoing a
    link someone else made; whoever links may be someone else adding a way in), and renew this
    browser's (the owner's decision of 2026-10-17). Access tokens are left alone, as with a
    password change;
  - a **password reset** ("Forgot password") **unlinks every provider** (the owner's decision of
    2026-10-17): a reset may mean someone else got in, and they may have linked their own Google
    or GitHub. Its notice email says which were unlinked and that they can be linked again from
    the account page. An account made with a provider ends up with the new password and no links,
    and signs in with the password. A plain password change, made while signed in, keeps them. Linking and unlinking email the account (to a confirmed
    address only).
- **An account with no password confirms with a fresh provider sign-in** (the owner's decision of
  2026-10-17, integrations-plan item 13). Changing its email, deleting it, turning on two-step
  sign-in or changing its factors, and linking or unlinking a provider each need the owner to
  sign in again with a provider already linked to the account, in place of the password:
  - `POST /api/auth/:provider/reauth` (signed in, no password of its own, the provider linked)
    starts a provider sign-in like linking does, with the account and its `tokenVersion` on the
    record. The callback accepts only a provider subject linked to **that** account
    (`provider-reauth-other` otherwise) and notes when the answer came;
  - `POST /api/auth/finish`, from the same browser (the provider cookie) and the same account
    still signed in as it was, within 5 minutes of the provider's answer, gives a **grant**: a
    random value the page keeps in memory, stored only as its SHA-256 (an `AuthChallenge` of
    kind `change-grant`, purpose `provider-reauth`, `server/lib/change_grant.ts`), good until 5
    minutes after the provider's answer while the account's `tokenVersion` is unchanged; a newer
    one replaces it;
  - the change sends `reauth` in place of `password` (`lib/mfa.d.ts` `OwnerProof`), and
    `factors.confirmIdentity` takes the grant **once**, atomically, only after the rest has
    passed (so a wrong code leaves it for another try); with two-step sign-in on, a current
    factor is still asked for. A grant names one account, so another account's sign-in, a
    replay or a grant from before a sign-out everywhere is refused (`provider-reauth-needed`);
  - an account with a password keeps confirming with it: it cannot start a reauth
    (`provider-reauth-password`) and a grant does not stand in for its password. Changing the
    password itself never takes a grant: an account without one sets it by the reset email.

  How fresh the sign-in is at the provider is the provider's decision: with a live Google or
  GitHub session it may be one click. What Glazecalc checks is that the person completed a new
  round trip through a provider linked to this account, in this browser, moments ago.

- **Two-step sign-in still applies.** A provider sign-in to an account with two-step sign-in on
  gets the same pending second step as a password (`server/lib/second_step.ts`), so a provider
  account alone is never enough.
- **Existing accounts count as confirmed** ("verified by history", as the EU work decided): nobody
  is locked out or nagged. They are safe because the collision rule above never links by email
  without a sign-in to the account itself, and a password reset (which proves the address) also
  confirms it. Unconfirmed accounts made since sign-up verification began use the app normally,
  but cannot link a provider or receive one by email match until they confirm.
- **Trials** come along into the account, as with a password (`trialId` noted at the start). They
  cannot link a provider.
- **Configuration** per copy of the site, from SSM (`/glazecalc/<provider>-client-id` and
  `-client-secret`, `/glazecalc/staging/...` for staging) through `deploy.sh` and `staging.sh`; a
  provider without both is off and has no button. GitHub OAuth apps allow one callback, so
  staging has its own apps.

## Consequences

- No new dependency, sub-processor or cost. Google and GitHub are separate controllers of what the
  person shares with them; the privacy notice and the record of processing say so, and list the
  extra cookie, which is set only when a provider button is pressed (strictly necessary).
- An account made with a provider has no password: it confirms changes with a fresh provider
  sign-in (above), or sets a password through the reset email (the account page offers it). The
  confirmation leaves the page for the provider and comes back, so the person makes the change
  again on return; the account page says the sign-in is held for one change for 5 minutes.
- The provider email is used only at the moment of sign-in; changing it at the provider changes
  nothing here. The link survives an email change on Glazecalc.
- Microsoft (decision 1) needs its tenant id with the subject (the `email` claim cannot be trusted,
  "nOAuth"), so it will link by `tid` + `sub` only and never by email; the table has room for it.
- Server tests run against a fake provider (`server/test/support/fake_provider.ts`) that checks
  what a real one checks; the browser test signs in through it end to end. A real-provider check
  on staging stays a manual step (deploy/README.md).
