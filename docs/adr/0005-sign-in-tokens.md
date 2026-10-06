# 5. Signed tokens with a version number, in an httpOnly cookie

Accepted, 2026-10-05.

## Context

The API needs to know who is calling. The 2017 app used JSON Web Tokens kept in the browser's
localStorage and sent in a `token` header. That had two problems: tokens could not be withdrawn
(a password change left old ones working until they expired), and any script running on the
page could read the token and send it elsewhere.

## Decision

- Tokens are JWTs signed with HS256 (the algorithm is pinned when checking) using `APP_SECRET`,
  which production must set. They carry the user's id and a token version, and last 7 days (a
  trial's lasts as long as the trial, 14).
- Each user has a `tokenVersion`. Changing or resetting the password increases it, so every older
  token stops working at once: other devices, and any stolen token, are signed out.
- Browsers keep the token in a cookie, `glazecalc_session`, that is `HttpOnly` (no script can read
  it), `SameSite=Strict` (not sent with requests that start on other sites), sent only to `/api`,
  and `Secure` in production. The server sets it on sign-up, sign-in and password change, and
  clears it on sign-out (`POST /api/signout`) and account deletion. Response bodies never contain
  a token.
- Requests that change something must not come from another site: the API refuses them when the
  browser marks them cross-site (`Sec-Fetch-Site`, or `Origin` on older browsers). Together with
  the SameSite cookie and JSON-only bodies, this stops cross-site request forgery.
- Scripts and tests send a token as `Authorization: Bearer`, which another site cannot make a
  browser send. The older `token` header is no longer accepted.
- The client keeps only a note that there is a session (and a trial's name and end date) in
  localStorage, so pages and guards know at once; the note is not a secret.
- Changing the account's email or deleting the account also needs the current password.

## Alternatives

- **Keep the token in localStorage** (versions up to 0.2): simpler, with no CSRF to think about,
  but any script on the page, including a future third-party one such as an ad, could read it.
- **Server-side sessions:** easy to withdraw, but a session store to run; the version number
  gives the withdrawal that mattered.

## Consequences

- An injected script could still act as the user while the page is open, but cannot take the
  token away to use elsewhere.
- Everyone signs in again once after moving from 0.2: the old stored tokens are dropped.
- Signing out on one device does not sign out the others; changing the password does.
