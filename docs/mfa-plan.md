# Two-step sign-in: feature list

This plan adds optional two-step sign-in (MFA) for accounts: passkeys (WebAuthn), authenticator-app codes (TOTP) and recovery codes. It was planned on 13 October 2026 against branch `eu-data-protection`, and builds on a branch from it. Effort: S = under a day, M = one to three days, L = a week or more. Translation into 23 languages is not counted. Paths are from the repo root.

**Not to build:** email codes as a second factor. A password reset already goes by email, so an email code adds nothing against someone who holds the mailbox. SMS is out for the same reason, and for its cost.

**How it works, in short.** Sign-in still starts with the password (`GET /api/signin`, Basic). When the account has a factor on, the server answers 200 with `code: 'second-step'`, the factors the account has and a short-lived signed `pending` token, and sets no session. The page keeps the token in memory (decision 2: no cookie). Then `POST /api/signin/second-step` takes the token and one of three things: a TOTP code, a passkey assertion or a recovery code. Only that step calls `session.start`, merges a trial on this browser, and honours "Keep me signed in". A "Sign in with a passkey" button (and passkey autofill) signs in with a passkey alone, which counts as both steps (decision 1, item 17).

## Two phases (owner, 14 October 2026)

**Phase 1** builds two-step sign-in as below. **Phase 2** adds a **staging copy of the site on the same EC2 instance**, deployed by hand, without CI/CD, so MFA can go through several rounds of real-browser testing (real passkeys, real authenticator apps, real email) before production. CI/CD stays as it is for production.

### Phase 1 must already be staging-ready

Everything that differs between production and staging comes from the environment, never from code. Phase 1 adds and uses:

- **`SITE_URL`** (production `https://glazecalcapp.com`, staging `https://staging.glazecalcapp.com`, development `http://localhost:3000`). The WebAuthn relying-party id is its host name and the expected origin is the URL itself, so passkeys made on staging belong to the staging host and never appear for production. Mail links, the TOTP `otpauth://` issuer and any absolute URL use it. Where a page's canonical URL or hreflang names glazecalcapp.com, that stays production's: staging is never indexed (below).
- **`SITE_LABEL`** (empty in production, `staging` on staging): the TOTP issuer becomes "Glazecalc (staging)" so authenticator apps keep the two apart, and mail subjects and a thin banner on every page say "Staging".
- **`MFA_KEY`** per environment: production `/glazecalc/mfa-key`, staging `/glazecalc/staging/mfa-key`. A staging key never decrypts production secrets.
- **`NOINDEX=1`**: every response carries `X-Robots-Tag: noindex, nofollow`, robots.txt disallows everything, and no sitemap is served.
- **`MAIL_ALLOWLIST`** (comma-separated addresses or `@domain`): when set, mail to any other address is dropped and logged by error code only. Staging sets it to the owner's addresses, so a staging database can never email a real user.
- **Cookies stay host-only** (no `Domain=` attribute), so staging's and production's sessions never meet. A test checks the `Set-Cookie` headers.

### Phase 2: staging on the same instance

- **Address:** `https://staging.glazecalcapp.com`, a subdomain, not a port on the main name. Cookies are shared across ports of one host, and passkeys are bound to the host, so `glazecalcapp.com:8443` would mix staging and production sessions and passkeys. nginx serves the subdomain on 443 and proxies to the staging app on **127.0.0.1:3001**. No security-group change.
- **App:** a second Compose project, `glazecalc-staging` (`deploy/compose.staging.yaml`), with only an `app` service on port 3001, `restart: unless-stopped`, `mem_limit` about 300 MB.
- **Database:** the same `mongod`, its own database `glazecalc_staging` and its own user `glazecalc_staging` (readWrite on that database only), password in `/glazecalc/staging/mongo-password`. No second MongoDB, to fit the 1 GB instance. Staging data is never backed up and never copied from production.
- **Secrets:** `/glazecalc/staging/{app-secret,mfa-key,mongo-password}` in SSM, read by the staging script. The SMTP setting is shared, made safe by `MAIL_ALLOWLIST`.
- **Deploying without CI:** `deploy/staging.sh`, run by hand in Session Manager. The image is built on the owner's computer with `docker buildx` (the Angular build runs natively on the build machine; only the small runtime stage is arm64), `scripts/build-staging.sh <ref>`, and pushed to GHCR as `ghcr.io/aaronfilson/glazecalc:staging-<sha>`, or, if the owner prefers no registry token on the PC, uploaded to S3 and loaded on the instance. `staging.sh staging-<sha>` pulls it, writes `staging.env`, starts it and waits for `/api/health`, like deploy.sh. Any branch can be staged; production deploys are unchanged.
- **Memory:** the t4g.micro has 1 GB. A second Node process needs about 150–250 MB. Phase 2 adds a 1 GB swap file if none exists, and the owner may stop staging between test rounds (`docker compose -p glazecalc-staging down`). If that is not enough, move to a t4g.small (owner's call).
- **Owner's AWS steps (drafted for approval, nothing changed without it):** a DNS record for `staging.glazecalcapp.com`; the three SSM parameters; extending the certificate with certbot (`enable-https.sh` learns the extra name); the new database user, created by hand as in deploy/README.md.
- **Docs:** deploy/README.md gets a "Staging" section: build, push, deploy, reset the staging database, stop staging.

## Must do

1. **Contract commit (do this first, alone). Done on branch `mfa`, 14 October 2026.** After it the four workstreams never edit the same file. It added:
   - the `mfa` sub-document on User, with `clearRequestedAt` (item 15), the unique partial index on `mfa.passkeys.credentialId`, and the pure helpers `mfaOn(user)` and `factorMethods(user)` (item 5);
   - `server/models/auth_challenge.ts` (WebAuthn challenges and unconfirmed TOTP secrets) and `server/models/pending_sign_in.ts` (decision 2: the server half of the pending second step, TTL index), both removed with the account in `account_data.ts`;
   - every new server message code in `server/lib/messages.ts` (passkey-first included), and `client/public/i18n/server/en.json` regenerated;
   - stubs with the contract in JSDoc: `server/lib/{mfa_key,totp,recovery_codes,webauthn,qr,factors}.ts` (stream A), `server/lib/second_step.ts` (stream B), the four `accountMail.send*` functions and `accountMail.noticeMfa` (stream D), and an empty `server/routes/mfa_routes.ts` already mounted at `/api/mfa`;
   - `limits.secondStep` and `limits.secondStepAccount` in `server/lib/rate_limit.ts` (`req.mfaUserId` in `server/types.d.ts`);
   - `server/lib/site.ts`: `SITE_URL` (required in production; `APP_URL` still read as its older name), `SITE_LABEL`, `NOINDEX`, `MAIL_ALLOWLIST`, and `rpId()`, `origin()`, `rpName()`, `totpIssuer()`. `mailer.appUrl()` and `server/app.ts` read it. Its hooks `noindexHeaders`, `robotsTxt`, `sitemapAllowed` (wired into `server/app.ts`) and `mailAllowed` (wired into `mailer.send`) do nothing yet: stream D fills them in. `deploy/compose.prod.yaml` sets `SITE_URL`; `.env.example` documents all five settings and `MFA_KEY`;
   - the shared client contract `lib/mfa.js` + `lib/mfa.d.ts`: the limits (`PASSKEY_LIMIT`, `RECOVERY_CODE_COUNT` …) and the request and reply types (`SecondStepResponse`, `FactorProof`, `IdentityProof`, `MfaSummary` …) both sides import;
   - the dependencies, pinned: `@simplewebauthn/server` 14.0.3 and `qrcode-generator` 2.0.4 (dependencies), `@simplewebauthn/browser` 14.0.0 (devDependencies, as the client's packages are).

   Effort S.

2. **Encryption key for TOTP secrets.** Encrypt the TOTP secret at rest with AES-256-GCM (node:crypto). The stored form is `v1.<iv>.<tag>.<ciphertext>`, base64url. The additional authenticated data (AAD) is the user id, so a ciphertext can't be moved to another account. The key is `MFA_KEY` (32 bytes, base64), kept in a new SSM SecureString `/glazecalc/mfa-key` like `/glazecalc/app-secret`. `deploy.sh` copies it into `app.env` and stops if it is missing, as it does for `mongo-password`. Production throws without it, as `app_secret.ts` does. Development and tests use a fixed, plainly labelled development key with a warning. A random key per run, as APP_SECRET gets, would break every enrolment on restart. The `v1` prefix leaves room to rotate the key later.
   - Why encrypt: the nightly dumps in S3 would otherwise hold working TOTP seeds. The key is never in a dump.
   - The README tells the owner to keep an offline copy of the key. If the key is lost, users fall back to passkeys or recovery codes.
   - The same key, through HMAC, hashes recovery codes (item 6).

   Effort S. Files: new `server/lib/mfa_key.ts`, `deploy/deploy.sh`, `deploy/aws/README.md` (parameter list near line 61), `.env.example`, `playwright.config.js` (webServer env), `server/test/support/env.ts`.

3. **TOTP on node:crypto, no library.** RFC 6238 takes about 60 lines: a base32 codec, HMAC-SHA1, dynamic truncation, 6 digits, a 30 s step, ±1 step allowed, and `timingSafeEqual`.
   - The secret is 20 random bytes.
   - The URI is `otpauth://totp/Glazecalc:<email>?secret=…&issuer=Glazecalc`, the issuer being `site.totpIssuer()`: "Glazecalc (staging)" on staging.
   - Test against the RFC 6238 Appendix B SHA-1 vectors (8 digits), then 6 digits.
   - otplib is not used: it pulls in several packages to do the same thing.

   Effort S. Files: new `server/lib/totp.ts`, `server/test/totp_tests.ts`.

4. **QR code made on the server, as a `data:` SVG.** Use `qrcode-generator`, which has no dependencies, in the server's dependencies. It renders the `otpauth:` URI to an SVG string. The route returns it as `data:image/svg+xml;base64,…`, and the client shows it in an `<img>` with alt text. This needs no CSP change (`img-src 'self' data:` is already in `server/app.ts`), no `innerHTML`, and adds nothing to the client bundle. The secret is also shown as text, in groups of 4, for people who type it in or can't scan. Effort S. Files: `server/lib/qr.ts` (the dependency is added in step 0).

5. **Data model.** Embed the factors in User. Deletion, the deletion-log re-apply and the export field whitelist then cover them with no new code, and `currentUser` can leave them out.

   ```
   mfa?: {
     handle: string                     // WebAuthn user handle: 16 random bytes, base64url, never the ObjectId
     totp?: { secret, lastStep: number, addedAt, lastUsedAt? }      // lastStep = replay guard
     passkeys: [{ credentialId, publicKey: Buffer, counter, transports: [String],
                  deviceType, backedUp, name (≤ 60 chars), addedAt, lastUsedAt? }]    // at most 10
     recoveryCodes: [{ hash, usedAt? }], recoveryMadeAt?
   }
   ```
   - Add a unique partial index on `mfa.passkeys.credentialId`. It is needed for passkey-first sign-in later.
   - "MFA on" means a `totp` entry or at least one passkey. Removing the last factor deletes the recovery codes.
   - Each passkey entry has its own `_id`: that is the id the routes and the app use. The credential id never leaves the server.
   - `jwt_auth.ts` `currentUser` changes its projection to `{ password: 0, mfa: 0 }` (stream B). `/verify` returns `mfa: true` when it is on; `mfaOn(user)` and `factorMethods(user)` are pure helpers in `server/models/user.ts`, so `/verify` loads `mfa` itself.
   - A collection `AuthChallenge` (`server/models/auth_challenge.ts`), modelled on `email_token.ts`. Its fields are `userId` (absent for passkey-first), `kind` (`totp-add | passkey-add | passkey-confirm | passkey-signin`), `challenge` (unique when present), `secret` (encrypted, `totp-add`), `attempts`, `expiresAt` (TTL index) and `usedAt`. It holds unconfirmed TOTP secrets (10 minutes) and WebAuthn challenges (5 minutes). A passkey's record is found by the challenge its response carries. Each record is single use, ended by an atomic `findOneAndUpdate({ usedAt: null, expiresAt: { $gt: now } })`.
   - A collection `PendingSignIn` (`server/models/pending_sign_in.ts`) for decision 2: `tokenId` (the pending token's random id, unique), `userId`, `tokenVersion`, `keep`, `trialId`, `challenge` (when the second step offers a passkey), `attempts`, `expiresAt` (TTL index), `usedAt`.

   Effort S. Files: `server/models/user.ts`, `server/models/auth_challenge.ts`, `server/models/pending_sign_in.ts` (step 0); `server/lib/jwt_auth.ts`, `server/routes/user_routes.ts` (`/verify`) (stream B).

6. **Recovery codes.** Make 10 codes of 10 Crockford base32 characters each (50 bits), shown as `xxxxx-xxxxx`.
   - Store `HMAC-SHA256(MFA_KEY, normalized code)`. The codes have high entropy, so bcrypt is not needed, and the key stops anyone guessing codes offline from a dump.
   - Codes are made automatically when the first factor is added, and shown once with Download (.txt), Copy and Print.
   - A code is used up atomically: `updateOne({ 'mfa.recoveryCodes': { $elemMatch: { hash, usedAt: null } } }, { $set: { 'mfa.recoveryCodes.$.usedAt': now } })`.
   - The account page warns when 2 or fewer are left.

   Effort S. Files: new `server/lib/recovery_codes.ts`.

7. **Passkeys on the server** with `@simplewebauthn/server`, as integrations-plan item 46 named. It adds about 8 small transitive packages (ASN.1, CBOR, base64); pin it exactly.
   - **RP ID and origin both come from `SITE_URL`** (`site.rpId()`, `site.origin()` in `server/lib/site.ts`): `rpID = hostname`, `expectedOrigin = origin`. The RP name is `site.rpName()` ("Glazecalc", or "Glazecalc (staging)").
     - Production: `glazecalcapp.com` and `https://glazecalcapp.com`. nginx redirects www to the bare domain, so there is one origin.
     - Staging: `staging.glazecalcapp.com` and `https://staging.glazecalcapp.com`.
     - Development: `localhost` and `http://localhost:3000`. The Angular dev server proxies `/api`, so it is one origin.
     - e2e: `http://localhost:${E2E_PORT || 3100}`. `playwright.config.js` already sets `APP_URL` (read as `SITE_URL`'s older name) from the port.
   - Registration: `attestationType: 'none'`, `residentKey: 'preferred'` (discoverable, so passkey-first can come later without enrolling again), `userVerification: 'preferred'`, algorithms -7 and -257, and `excludeCredentials` set to the account's existing passkeys.
   - Assertion as a second factor uses `userVerification: 'preferred'`: the password is already the first factor.
   - Challenges are stored in `AuthChallenge` and expire after 5 minutes. On each use, update the counter and `lastUsedAt`.

   Effort M. Files: `server/lib/webauthn.ts` (the dependency is added in step 0).

8. **Enrolment routes**, all behind `jwtAuth, notGuest`. Every change to how the account signs in takes an `IdentityProof` (`lib/mfa.d.ts`): the current `password` and, once MFA is on, one current factor as well, `code`, `recoveryCode` or `passkey` (decision 6). One helper checks it, `factors.confirmIdentity(req, body)` in `server/lib/factors.ts`, which uses the same `checkFactor` as the second step at sign-in. Adding the first factor needs only the password, as there is no factor yet. Someone who has lost their authenticator app uses a recovery code; someone who has lost everything uses item 15.

   ```
   GET    /api/mfa                          MfaSummary: on, emailConfirmed, totp {addedAt,lastUsedAt}, passkeys [{id,name,addedAt,lastUsedAt}], codesLeft
   POST   /api/mfa/confirm/options          → { options }   passkey assertion options for an IdentityProof (AuthChallenge passkey-confirm, 5 min)
   POST   /api/mfa/totp/start  IdentityProof            → { secret, uri, qr }   (secret held in AuthChallenge totp-add, 10 min)
   POST   /api/mfa/totp        {code}                   → { recoveryCodes? }    'totp-added'
   DELETE /api/mfa/totp        IdentityProof            'totp-removed', or 'mfa-off' for the last factor
   POST   /api/mfa/passkeys/options IdentityProof       → { options }   creation options (AuthChallenge passkey-add, 5 min)
   POST   /api/mfa/passkeys    {response, name}         → { recoveryCodes? }    'passkey-added'
   PATCH  /api/mfa/passkeys/:id {name}                  'passkey-renamed' (no password: a rename changes nothing about sign-in)
   DELETE /api/mfa/passkeys/:id IdentityProof           'passkey-removed', or 'mfa-off'
   POST   /api/mfa/recovery-codes IdentityProof         → { recoveryCodes }     'recovery-codes-made'
   ```
   - The second half of each two-part change (`POST /api/mfa/totp`, `POST /api/mfa/passkeys`) needs no proof again: the identity was confirmed for the first half, and the `AuthChallenge` ties the two.
   - Turning MFA on needs a confirmed email (decision 5). Otherwise the server answers 400 `mfa-needs-confirmed-email`.
   - Adding or removing a factor, or making new recovery codes, raises `tokenVersion` and renews this browser's cookie with `session.start(res, user, 7, keepsSignIn(req))`, as a password change does (decision 3).
   - Rate limits: `limits.changePassword` per address and `limits.passwordCheck` per account, shared with the existing password checks. The TOTP confirm step uses `limits.secondStep` and `limits.secondStepAccount` (item 9). All are in `rate_limit.ts` since step 0.
   - Notices go through `accountMail.noticeMfa(user, notice)` (item 10), which never throws.
   - `sameOrigin` already covers these POST, PATCH and DELETE routes.

   Effort M. Files: `server/routes/mfa_routes.ts` (mounted at `/api/mfa` in step 0), `server/lib/factors.ts`, `server/test/mfa_routes_tests.ts`.

9. **The second step at sign-in** (decision 2: a token held by the page, no cookie).
   - **Password step:** in `GET /signin`, after the password matches, if `mfaOn(user)`, call `second_step.begin(user, { keep, trialId, passkeyChallenge })`. It writes a `PendingSignIn` record: a random `tokenId` (16 bytes), `keep = session.wantsKept(req)`, `trialId` (from `currentUser(req)`, if it is a trial), `tokenVersion`, `attempts: 0`, the WebAuthn challenge when the account has passkeys, and an expiry `SECOND_STEP_MINUTES` (5) ahead. It signs the `pending` token: a JWT, HS256 with `APP_SECRET`, `{ sub: userId, tv, jti: tokenId, typ: 'second-step' }`, audience `glazecalc:second-step`, 5 minutes. It has no `id` claim, so `jwtAuth` can never take it for a sign-in. Reply 200 with `say('second-step', undefined, { methods, pending, expiresAt, passkeyOptions? })` (`SecondStepResponse` in `lib/mfa.d.ts`; `methods` is `factorMethods(user)`). No cookie is set and the trial is not merged yet.
   - **Finish:** `POST /api/signin/second-step` takes `{ pending } & ({ code } | { recoveryCode } | { passkey })`. `second_step.load(pending)` checks the signature and expiry, finds the record by `jti`, and refuses it (`second-step-expired`) if it has expired, has been used, or the user's `tokenVersion` has changed (a reset in between), or (`second-step-tries`) after `SECOND_STEP_TRIES` (5) wrong tries. It sets `req.mfaUserId` for `limits.secondStepAccount`. Then `factors.checkFactor(user, body, { passkeyChallenge: pending.challenge })`; a wrong factor calls `second_step.countTry`.
     - TOTP is accepted only if the step is newer than `lastStep`, with one atomic `updateOne` on `{ 'mfa.totp.lastStep': { $lt: step } }` (inside `checkFactor`).
     - On success: `second_step.finish` marks the record used (atomic, so the token is single use), `mergeTrial` if `trialId` is still a trial, and `session.start(res, user, 7, pending.keep)`. The reply is the same as today's sign-in, `{ email, kept }` (`SignedInResponse`). A recovery code also sends the "code used" email (inside `checkFactor`).
   - **Why a token in the page plus a server record (decision 2):**
     - No new cookie, so the privacy notice's storage table is unchanged. A reload means typing the password again, which is acceptable for a 5-minute step.
     - The token alone would be stateless; the server record, keyed by the token's random id, makes it single use and counts wrong codes, so guessing is still limited.
     - The token travels in the JSON body of a same-origin POST; `sameOrigin` covers CSRF. It is kept in memory only, never in `localStorage` or `sessionStorage`.
   - **Passkey-first sign-in (decision 1, item 17):**
     - `POST /api/signin/passkey/options` → `{ options }`: `webauthn.authenticationOptions(null, 'required')`, no `allowCredentials`; the challenge is kept as an `AuthChallenge` of kind `passkey-signin`, 5 minutes.
     - `POST /api/signin/passkey { response }` (with `X-Keep-Signed-In` like the password): takes the `passkey-signin` challenge the response answers (once), finds the account with `webauthn.accountOf(response)` (credential id and user handle), checks it with `webauthn.verifyAuthentication(user, response, challenge, true)`, merges a trial on this browser and calls `session.start`. Same reply as a sign-in. Unknown passkey: 401 `passkey-unknown`; failed check: 401 `passkey-failed`. Passkey autofill (conditional mediation) uses the same two routes.
     - Both routes use `limits.signIn`.
   - **Limits:**
     - `limits.secondStep`: 20 per 15 minutes per address.
     - `limits.secondStepAccount`: 10 per 15 minutes per account, keyed `'mfa:' + req.mfaUserId` after the pending record is loaded.
     - 5 tries per pending sign-in, after which the password must be entered again (which hits `limits.signIn`).
     - No hard lockout, which a stranger could use to lock someone out. With 10 tries per 15 minutes and 3 codes valid at a time, a 6-digit guess succeeds about 0.3% of the time a day.

   Effort M (with passkey-first, M+). Files: `server/routes/auth_routes.ts`, `server/lib/second_step.ts`, `server/test/auth_routes_tests.ts`, `server/test/session_cookie_tests.ts`. `session.ts` needs no change: there is no pending cookie.

10. **Notice emails**, reusing `inLanguage`/`fill`, English only for now as with `VERIFY`.
    - `MFA_ADDED` and `MFA_REMOVED`: `{account}`, `{method}`, `{forgot}`, `{app}`. `{method}` is a whole phrase from a small per-language table ("an authenticator app", "the passkey "{name}"").
    - `RECOVERY_USED`: `{left}`.
    - `RECOVERY_NEW`.
    - Sent only when `!user.emailUnverified`, never to a trial, after the reply. Failures log only the error code, as `logMailError` does.
    - The functions (stubs since step 0): `sendMfaAdded(to, method, language?)`, `sendMfaRemoved(to, method, language?)`, `sendRecoveryUsed(to, left, language?)`, `sendRecoveryNew(to, language?)`, with `method` an `MfaMethod` (`{ kind: 'totp' } | { kind: 'passkey', name }`). Streams A and B call only `noticeMfa(user, notice)`, which checks the address, sends and logs; it never throws. Until stream D lands, it does nothing.
    - On a staging copy (`SITE_LABEL`), subjects say so, and `MAIL_ALLOWLIST` drops mail to anyone else: `site.mailAllowed(to)`, already called by `mailer.send`.

    Effort S. Files: `server/lib/account_mail.ts`, `server/lib/mailer.ts`, `server/lib/site.ts` (`mailAllowed`), `server/test/messages_tests.ts` (fingerprints).

11. **Deletion, export and restore.**
    - **Deletion:** the embedded `mfa` goes with the User document. `deleteRecords` in `account_data.ts` removes `AuthChallenge` and `PendingSignIn` records (added in step 0), so `deleteAccount`, `deleteExpiredTrial` and `reapplyDeletions` all cover it. The admin delete path in `user_routes.ts` goes through `deleteAccount`, so it is covered too.
    - **Export:** add `signIn: { authenticatorApp: { addedAt, lastUsedAt } | null, passkeys: [{ name, addedAt, lastUsedAt }], recoveryCodes: { madeAt, left } }`. Never the secret, public keys, credential ids, the handle or hashes. `EXPORT_VERSION` stays 1, because this only adds a field.
    - **Restore:** document that restoring a backup brings back the MFA state from that night. A factor removed since then, or a recovery code used since then, works again until the user acts. Recommend no MFA change log: restores are rare, and the owner's restore steps should email affected users only if asked (see decision 8).

    Effort S. Files: `server/lib/account_data.ts`, `server/lib/export_data.ts`, `server/test/export_routes_tests.ts`, `server/test/deletion_log_tests.ts`, `deploy/README.md` (restore note).

12. **Client: the second step at sign-in.**
    - `AuthService.signIn` resolves either `{ done, kept }` or `{ secondStep: SecondStepResponse }` (`lib/mfa.d.ts`). The `pending` token stays in memory (a field of the service or the component), never in `localStorage` or `sessionStorage`. The new `finishSignIn(pending, proof)` posts `SecondStepRequest` and does not send `X-Keep-Signed-In`: the choice is already on the pending record.
    - A new `SecondStep` component inside `auth-page.ts` shows:
      - a code field (`autocomplete="one-time-code"`, `inputmode="numeric"`, labelled, no auto-submit);
      - a "Use a passkey" button, which calls `startAuthentication` from `@simplewebauthn/browser`, loaded with `import()` so it lands in a lazy chunk outside the 650 kB initial budget;
      - "Use a recovery code";
      - "Start over".
    - If the 5 minutes run out (`second-step-expired`, `second-step-tries`, or `expiresAt` passed), say so and go back to the password form with the email still filled in. A reload goes back to the password form too.
    - **Passkey-first (decision 1):** a "Sign in with a passkey" button on the sign-in form (`POST /api/signin/passkey/options`, `startAuthentication`, `POST /api/signin/passkey`, with the "Keep me signed in" header), and passkey autofill: the email field gets `autocomplete="username webauthn"` and, when `browserSupportsWebAuthnAutofill()`, the page starts `startAuthentication({ optionsJSON, useBrowserAutofill: true })` in the background and cancels it on leaving. `AuthService.signInWithPasskey(keep)` and `passkeySignInOptions()`.

    Effort M (with passkey-first, M+). Files: `client/app/core/auth.service.ts`, `client/app/pages/auth/auth-page.ts`, new `client/app/pages/auth/second-step.ts` + spec, `client/public/i18n/account/en.json`. The dependency is added in step 0.

13. **Client: the "Two-step sign-in" section on the account page,** like `export-section.ts`.
    - Status, and why it matters.
    - **Authenticator app:** QR `<img alt>`, the key in text with Copy, a code to confirm, Remove.
    - **Passkeys:** a list with name and dates, Add (asks for a name), Rename, Remove. If WebAuthn is missing (`browserSupportsWebAuthn()`), say so.
    - **Recovery codes:** the count left, Make new codes.
    - Each change asks for the current password inline and, once two-step sign-in is on, a current factor too (decision 6): a code field, "Use a passkey" (`POST /api/mfa/confirm/options`, then `startAuthentication`) or "Use a recovery code". The body is an `IdentityProof`. One small shared confirm component for all the changes.
    - Codes are shown once in a `<ol>` in monospace, with Download, Copy and Print, and an "I have saved them" button to close.
    - Trials don't see the section. An unconfirmed address shows "confirm your email first".
    - `reset-page.ts`: after a reset, one line saying a second step is still needed if it is on.

    Effort M. Files: new `client/app/pages/password/sign-in-section.ts` + spec, `client/app/pages/password/account-page.ts`, `client/app/pages/password/reset-page.ts`, `client/public/i18n/account/en.json`.

14. **Privacy notice, processing record and ADR.**
    - Add `storedSignIn`: whether two-step sign-in is on; the authenticator key (encrypted); for each passkey a public key, a name and dates; recovery codes (only a keyed hash); pending sign-ins for 5 minutes.
    - Add `keptSignIn`: until the user removes it or deletes the account.
    - No new storage row (decision 2): there is no pending-sign-in cookie, and the page holds the pending token in memory only. If the notice's storage table has a line on what the browser keeps during sign-in, it says "nothing new".
    - Mention it in `rightsExport`.
    - Add a row to `docs/processing-record.md`: contract basis, AWS, `server/models/user.ts`, `server/models/auth_challenge.ts`, `server/models/pending_sign_in.ts`. Add `MFA_KEY` to the security notes.
    - Write ADR 0014 "Two-step sign-in", and renumber the OAuth ADR in integrations-plan to 0015.

    Effort S. Files: `client/public/i18n/site/en.json`, `client/app/pages/privacy/privacy-page.ts`, `docs/processing-record.md`, new `docs/adr/0014-two-step-sign-in.md`, `docs/adr/README.md`, `docs/integrations-plan.md`.

15. **Lost every factor, and the admin path.**
    - **No self-service bypass:** a password reset never turns MFA off. The reset already does not sign in (`password_routes.ts` sets no session), and the next sign-in still asks for a factor.
    - **For someone who has lost every factor and every code,** the owner runs a script in a Session Manager shell, like `server/reapply_deletions.ts`:
      - `node server/clear_mfa.ts --notify <email>` emails the address: "two-step sign-in will be turned off on <date + 7 days> unless you reply".
      - `--clear <email>` (refused before 7 days, using a `clearRequestedAt` field) removes the factors and codes, raises `tokenVersion` and sends `MFA_REMOVED`.
      - The owner runs it only for a request from the account's confirmed address, after the requester has done a password reset. This is the rule already in `docs/data-requests.md`: verify by a link, never by ID.
    - **No admin route over HTTP,** so a stolen admin session can't remove anyone's factors. `selfOrAdmin` and `SETTABLE_FIELDS` stay as they are, and `mfa` is never settable.

    Effort S. Files: new `server/clear_mfa.ts` (stream B; `mfa.clearRequestedAt` is in the model since step 0), `docs/data-requests.md`, `deploy/README.md` (stream D).

16. **Tests and accessibility.** See the test plan. Effort M.

17. **Passkey-first (passwordless) sign-in: now (decision 1).** A "Sign in with a passkey" button, then conditional mediation (autofill), using `userVerification: 'required'` and a lookup by `credentialId` and user handle (`webauthn.accountOf`). A passkey sign-in counts as both steps. Routes `POST /api/signin/passkey/options` and `POST /api/signin/passkey` (item 9, stream B); the server half of `webauthn.ts` (stream A); the button and autofill (item 12, stream C); tests in `auth_routes_tests.ts` and `e2e/mfa.spec.js`. Passkeys are registered as discoverable (`residentKey: 'preferred'`), so a passkey added as a second factor also works here. It belongs in the "Sign-in methods" section of integrations-plan item 14. Effort M.

## Later

18. **Require MFA for the `admin` role**, once the owner's account has it. Effort S.
19. **Translate the four emails** in the next wave of server text.

## Decisions for the owner

**Decided on 14 October 2026.** Six as recommended (3, 4, 5, 7, 8, 9); three differ:

- **1. Passkey-first sign-in: now.** Item 17 moves into the first release: a "Sign in with a passkey" button and conditional mediation (autofill), `userVerification: 'required'`, lookup by `credentialId` and user handle. A passkey sign-in counts as both steps. Add its routes, tests and messages to items 8–10 and 16; effort grows by about M.
- **2. The pending second step: a token held by the page, no cookie.** The password step returns a short-lived signed token (user id, `tokenVersion`, a random id, expiry about 5 minutes) that the page keeps in memory and sends with `POST /api/signin/second-step`. Wrong-code counting and single use stay on the server, keyed by the token's random id (a small TTL collection), so guessing is still limited. A reload means typing the password again. No new cookie, so the privacy table is unchanged.
- **6. Re-authentication for changes: password and a second step.** Every change to how the account signs in (add or remove a factor, new recovery codes, turning MFA off) asks for the current password and a current factor: a code, a passkey or a recovery code. Someone who has lost their authenticator replaces it with a recovery code; someone who has lost everything uses item 15. `confirmIdentity` takes both; when OAuth arrives, a fresh `reauthUntil` must also have passed the second step.

1. **Passkey-first sign-in now or later?** Recommend **later** (item 17). The first release keeps one sign-in flow and a smaller test and translation load. Passkeys are registered as discoverable now, so nobody has to enrol again.
2. **How the pending second step is held.** Recommend **an httpOnly `glazecalc_signin` cookie bound to a server record** (item 9). It is single use, counts attempts and survives a reload. The cost is one more line in the privacy table.
3. **Raise `tokenVersion` when a factor is added or removed?** Recommend **yes, for any change to how the account signs in**: factor added or removed, new recovery codes. This browser's cookie is renewed. It is the same rule as for a password or email change, and turning MFA on ends any session a password thief already had.
4. **Losing everything.** Recommend **the 7-day script in item 15.** The alternative is "the account is lost; ask for deletion", which is simpler but harsh for a recipe archive kept for years. Either way, the notice and the account page say plainly: keep the recovery codes.
5. **MFA only with a confirmed email?** Recommend **yes.** The notices and the recovery path both rely on the address.
6. **Re-authentication for changes.** Recommend **the current password with each change, now**, through `confirmIdentity`. When OAuth arrives, the same helper also accepts a fresh `reauthUntil` (integrations-plan item 11) that has passed the second step.
7. **`MFA_KEY` required in production?** Recommend **yes.** `deploy.sh` stops without it, so there is no silent "TOTP off" mode. Create the parameter before merging.
8. **After restoring a backup,** recommend **documenting only** that the MFA state goes back to the backup's night (item 11). No change log.
9. **Translation timing.** About **70 new English messages**, plus 4 English-only emails:
   - account scope ~38 (section ~30, second step ~8);
   - server messages ~16 (`second-step`, `code-wrong`, `second-step-expired`, `too-many-codes`, `passkey-failed`, `passkey-limit`, `mfa-needs-confirmed-email`, the added, removed and new-codes successes, and others); step 0 added 26, passkey-first and decision 6 included;
   - site ~6 (privacy), plus 1 changed (`rightsExport`).

   Recommend **finishing this, privacy text included, before the next catch-up translation run**, so all 23 languages get it in one pass. Until then those pages fall back to English, as the app already does.

## Test plan

- **Unit (mocha):**
  - `totp_tests.ts`: RFC 6238 vectors, the ±1 window, replay refused.
  - `mfa_key` round trip; tampering with the ciphertext or the AAD fails.
  - Recovery codes: format, used once, normalized (case, dash).
- **Routes (chai-http):**
  - `mfa_routes_tests.ts`: enrol and remove TOTP; wrong password; unconfirmed email refused; trial gets 403; `tokenVersion` raised and the cookie renewed; codes shown only once; cap of 10 passkeys; rename without a password.
  - Decision 6: with MFA on, every change refused with the password alone (`factor-needed`) and with a wrong factor; accepted with a code, a recovery code (used up) or a passkey from `POST /api/mfa/confirm/options`; that challenge works once.
  - Passkeys through a small software authenticator in `server/test/support/soft_authenticator.ts`: an ES256 key from node:crypto, `none` attestation, hand-written CBOR. It also tests a wrong origin, a wrong RP ID and a counter regression.
- **Sign-in (`auth_routes_tests.ts`):**
  - MFA off: unchanged.
  - MFA on: the password step sets no cookie at all and answers `second-step` with `methods` and a `pending` token; the token is refused by `jwtAuth` (`/api/verify` with it as a Bearer token is 401).
  - Each of the three factors finishes the sign-in.
  - Keep-me-signed-in carries through: `Max-Age` with it, none without; the `ss` claim.
  - Refused: 5 tries; expired (token and record); token reused after success; a token with a bad signature or another audience; `tokenVersion` changed by a reset in between.
  - Passkey-first: options, then sign-in with a discoverable passkey from the soft authenticator; user verification required; an unknown credential (`passkey-unknown`); a challenge used twice; keep-me-signed-in; trial merge.
  - Cookies stay host-only: no `Domain=` in any `Set-Cookie` (`session_cookie_tests.ts`).
  - Trial merge after the second step.
  - Per-account limiter, with `RATE_LIMITS` on in that one test.
- **Reset:** reset, then sign in: a factor is still needed.
- **Mail (`support/mail.ts`):** the four notices; none to an unconfirmed address; fingerprints.
- **Export and deletion:** the export has names and dates, and no `secret`, `publicKey`, `hash` or `credentialId` in the JSON text. Deleting an account, the deletion-log re-apply and expired-trial sweeps remove `AuthChallenge` and `PendingSignIn` records.
- **Client (vitest):** specs for `second-step.ts` and `sign-in-section.ts`, with `@simplewebauthn/browser` mocked; `auth.service` handling of both sign-in replies, the pending token never written to storage, and passkey-first.
- **e2e (Playwright, Chromium, Windows and Linux CI):** a new `e2e/mfa.spec.js`.
  - TOTP: enrol by computing codes in the test from the shown key (a copy of the RFC code in `e2e/helpers.js`), sign out, sign in, a recovery code, the notice email via `e2e/mail.js`.
  - Passkeys: a CDP session with `WebAuthn.enable` and `WebAuthn.addVirtualAuthenticator({ protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true })`, then add, sign in with the password and a passkey, sign in with the passkey alone (passkey-first), rename and remove (with password and passkey, decision 6).
  - Runs on the configured port (`E2E_PORT`, 3100 by default). `MFA_KEY` is set in the webServer env.
  - Staging settings: with `NOINDEX=1`, `X-Robots-Tag` on a page and an API reply, robots.txt disallows all, no sitemap (server tests in stream D are enough; no e2e needed). `MAIL_ALLOWLIST` drops other mail (server test).
  - Add the second step and the account section to `accessibility.spec.js` (axe), and keep `csp.spec.js` passing with no CSP change.
- **Manual once:** a real phone authenticator and a platform passkey (Windows Hello or iCloud Keychain) on staging (phase 2).

## Build order

**Step 0 (one agent, half a day):** item 1, the contract commit. Done on branch `mfa` (14 October 2026); the four streams branch from it.

Then four parallel worktrees, each on its own files. Files step 0 made or changed and that no stream edits: `server/lib/messages.ts` and `client/public/i18n/server/en.json`, `server/models/{user,auth_challenge,pending_sign_in}.ts`, `server/lib/rate_limit.ts`, `server/types.d.ts`, `server/app.ts`, `lib/mfa.{js,d.ts}`, `package.json` and `package-lock.json`. If a stream finds it truly needs a change to one (a message code, a field), it says so to the coordinator, who makes it as a small commit on `mfa` that every stream then merges, rather than the stream editing it.

| Stream                             | Items                                       | Files it alone edits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Implements                                                                                                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A: factors on the server**       | 2–8, 11 (server), 17 (`webauthn.ts`)        | `server/lib/{mfa_key,totp,qr,recovery_codes,webauthn,factors}.ts`, `server/routes/mfa_routes.ts`, `server/lib/account_data.ts`, `server/lib/export_data.ts`, `server/test/{totp,mfa_key,recovery_codes,mfa_routes,export_routes,deletion_log}_tests.ts`, `server/test/support/soft_authenticator.ts`                                                                                                                                                                                                  | every stub in its six lib files, `factors.checkFactor` and `factors.confirmIdentity`; the ten `/api/mfa` routes (item 8); export `signIn` (item 11)                                                                                                                                |
| **B: sign-in flow on the server**  | 9, 15, 17 (routes)                          | `server/routes/auth_routes.ts`, `server/lib/second_step.ts`, `server/lib/session.ts` (if needed), `server/lib/jwt_auth.ts`, `server/routes/user_routes.ts` (`/verify`), `server/clear_mfa.ts`, `server/test/{auth_routes,session_cookie,clear_mfa}_tests.ts`                                                                                                                                                                                                                                          | `second_step.{begin,load,countTry,finish}`; `GET /api/signin` (second-step reply), `POST /api/signin/second-step`, `POST /api/signin/passkey/options`, `POST /api/signin/passkey`; `currentUser` projection `{ password: 0, mfa: 0 }`; `/verify` `mfa: true`; the clear-MFA script |
| **C: client**                      | 12, 13, 17 (button and autofill)            | `client/app/core/auth.service.ts` + spec, `client/app/pages/auth/*`, `client/app/pages/password/{account-page,reset-page,sign-in-section}.ts` + specs, `client/public/i18n/account/en.json`                                                                                                                                                                                                                                                                                                           | the second step, passkey-first and the account section, typed by `lib/mfa.d.ts`                                                                                                                                                                                                    |
| **D: mail, operations, docs, e2e** | 10, 14, 2 (deploy), 16 (e2e), staging-ready | `server/lib/account_mail.ts`, `server/lib/mailer.ts`, `server/lib/site.ts`, `server/lib/pages.ts` (staging banner), `server/test/{messages,site}_tests.ts`, `deploy/deploy.sh`, `deploy/compose.prod.yaml`, `deploy/aws/README.md`, `deploy/README.md`, `.env.example`, `compose.yaml`, `playwright.config.js`, `server/test/support/env.ts`, `e2e/mfa.spec.js`, `e2e/helpers.js`, `e2e/accessibility.spec.js`, privacy i18n and page, `docs/processing-record.md`, `docs/data-requests.md`, ADR 0014 | the four `accountMail.send*` and `noticeMfa`; `site.{mailAllowed,noindexHeaders,robotsTxt,sitemapAllowed}`; `SITE_LABEL` in mail subjects and the page banner; `MFA_KEY` in deploy.sh and the e2e env                                                                              |

Step 0 added both `@simplewebauthn/*` packages and `qrcode-generator` to `package.json`, so no stream touches it.

**Merge order:** A, then B (B calls A's verifiers and `factors.checkFactor`), then C, then D. B can build against the stubs and finish the tests that need a real factor once A is merged into its branch. Then run `npm run i18n:sources`, `npm run check:i18n`, `npm test`, `npm run test:client`, `npm run test:e2e` on Windows and `npm run test:e2e:linux`. Before deploying, create `/glazecalc/mfa-key` in SSM.
