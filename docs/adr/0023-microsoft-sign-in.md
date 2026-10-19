# 23. Sign in with Microsoft: found by tenant and subject, its email never trusted

Accepted, 2026-10-19. Decision 1 of [the integrations plan](../integrations-plan.md) (Google and
GitHub first, Microsoft second), with the owner's decisions of 2026-10-19: tenant `common`
(personal and work or school accounts); Microsoft's email never trusted for finding or linking an
account; a new account from Microsoft starts with its email unconfirmed; an email another account
has is refused with "sign in, then link from the account page"; a separate staging app; publisher
verification before production. Builds on [ADR 15](0015-provider-sign-in.md), whose flow, cookie,
records, linking from the account page, two-step sign-in and fresh sign-in for an account without
a password all apply unchanged; this records only what differs.

## Context

ADR 15 noted that Microsoft's `email` claim cannot be trusted. Microsoft says so itself: the claim
"isn't guaranteed to be correct, and is mutable over time - never use it for authorization or to
save data for a user"
([optional claims](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference),
[ID token claims](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)),
and "never use claims like `email`, `preferred_username` or `unique_name` to store or determine
whether the user ... should have access"
([validating claims](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation)).
Any Microsoft Entra tenant's administrator can give a user any address, unverified; apps that
matched accounts by it were taken over ("nOAuth", 2023). With `common`, every tenant in the world
can sign in, so the email proves nothing.

## Decision

- **Endpoints and request.** Authorization code flow at
  `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` and `.../token`, PKCE S256,
  `state`, `nonce`, scope **`openid email`** only (no `profile`: no name, no `oid`), and
  `prompt=select_account` for a sign-in, as Google's
  ([OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)).
  The client secret is sent in the token request (`client_secret_post`), as for Google and GitHub.
- **The ID token is checked as a multi-tenant app must**
  ([access tokens, "Validate the issuer"](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#validate-the-issuer)):
  the RS256 signature against the `common` key set
  (`https://login.microsoftonline.com/common/discovery/v2.0/keys`, fetched when a token names an
  unknown key, at most once a minute); `tid` a GUID; `iss` **exactly**
  `https://login.microsoftonline.com/{tid}/v2.0` with the token's own `tid`; the signing key's own
  `issuer` in the key set, its `{tenantid}` filled with that `tid`, equal to `iss` (so a key
  published for one tenant signs only that tenant's tokens, and a key with no issuer signs nothing);
  `aud` the client id; `exp` and `nbf` (60 seconds' tolerance); the nonce. `server/lib/oauth.ts`
  (`microsoftIdentity`).
- **The subject is `tid:sub`** (the identity's `uid` is `microsoft:{tid}:{sub}`). Microsoft allows
  `sub` or `oid` as the key, and asks that `tid` be part of it: "the `tid` claim must be part of
  the key used to access the user's data", and the same `sub` in two tenants is two people
  ([access tokens](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#validate-the-issuer),
  [ID token claims, "Use claims to reliably identify a user"](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)).
  **`sub` rather than `oid`**: `oid` needs the `profile` scope, which also sends the name, and is
  the same for every app the person uses, so it would let apps correlate them; `sub` is pairwise,
  unique to this app, comes with `openid` alone, is immutable and never reused. Its cost: each
  app registration sees a different `sub`, so production's registration must never be replaced
  (deploy/README.md), and staging's accounts are its own anyway.
- **The email is never trusted** (`oauth.trustsEmail`):
  - an account already linked to the subject signs in, whatever the email says;
  - otherwise, an email no account has (any case) makes a **new account with `emailUnverified`**,
    passwordless as in ADR 15, and the confirmation email of a sign-up is sent; the page shows
    "Confirm your email" as after a sign-up. Until it is confirmed the account cannot link another
    provider, take one by email match, or turn on two-step sign-in, as any unconfirmed account;
  - an email another account has (confirmed or not) is **refused**
    (`provider-email-in-use`: "sign in to it the usual way, then link Microsoft on your account
    page"). There is no "sign in to link" path as for Google and GitHub: that path rests on the
    provider vouching for the address;
  - no email at all is refused (`provider-email-missing`);
  - from the account page, after the password (or a fresh sign-in) and a second step when it is
    on, a Microsoft account links whatever its email, as Google and GitHub do (ADR 15).

  Someone who makes a Microsoft account claiming another person's address gets an unconfirmed
  account the address's owner never confirms. If that owner later signs up, the address is taken,
  as with any unconfirmed sign-up: "Forgot password" proves the address, confirms it, and unlinks
  every provider (ADR 15), so the owner ends up with the account and the claimant with nothing.

- **A fresh sign-in** (ADR 15) sends **`prompt=login`**, which "forces the user to enter their
  credentials on that request, which negates single sign-on"
  ([OpenID Connect](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)),
  and requires **`auth_time`** no earlier than the start of the reauth (60 seconds' tolerance), or
  nothing is confirmed (`provider-not-fresh`), as for Google. `auth_time` is **not** in Microsoft's
  ID tokens by default: it is an optional claim, turned on in the app registration's Token
  configuration ([optional claims](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference);
  deploy/README.md). Its "User Type" column does not say it reaches personal accounts; if it does
  not, their fresh sign-ins fail closed and those people confirm changes after setting a password
  with "Forgot password". Staging's check (deploy/README.md) tries both kinds of account.
  **No `max_age`**, which the plan had: Microsoft's authorize parameters do not include it, and
  with `max_age=0` its ID token has been reported to arrive already expired
  ([Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/1377508/oauth-tokens-endpoint-issues-expired-token));
  `prompt=login` with `auth_time` gives the same assurance. No `claims` parameter either.
- **The button follows Microsoft's branding guidelines**
  ([Sign in with Microsoft branding guidelines](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-branding-in-apps)):
  "Sign in with Microsoft" beside the Microsoft logo, which the guidelines offer for download for
  use in apps and ask not to be altered. The four squares are drawn inline from Microsoft's own SVG
  (`ms-symbollockup_mssymbol_19.svg`), unchanged, so nothing is fetched from Microsoft before the
  click (ADR 15); the light button (white, `#8c8c8c` border, `#5e5e5e` text) or, in the dark theme,
  the dark one (`#2f2f2f`, white text), 41 pixels high, Segoe UI where the device has it.
- **Publisher domain and verification.** The app serves
  `/.well-known/microsoft-identity-association.json` itself, written from `MICROSOFT_CLIENT_ID`
  (only while Microsoft is on), so each copy names its own app and nothing is committed or copied
  by hand ([publisher domain](https://learn.microsoft.com/en-us/entra/identity-platform/howto-configure-publisher-domain)).
  A client id is not secret: every sign-in sends it. Production is publisher verified before it
  goes live ([publisher verification](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview));
  without it the consent screen says "unverified", and organizations may block the app.
- **Configuration** as ADR 15: `/glazecalc/microsoft-client-id` and `-client-secret`
  (`/glazecalc/staging/...` for staging's own app registration) through `deploy.sh` and
  `staging.sh`. The secret expires (at most 24 months; Microsoft recommends under 12): the owner
  renews it from a calendar reminder.

## Consequences

- No new dependency, sub-processor or cost. Microsoft is a separate controller of what the person
  shares with it; the privacy notice and the record of processing name it, and say that the
  tenant id and `sub` are kept, and that an email from Microsoft is confirmed before it is trusted.
- Some people with a Microsoft account whose address another Glazecalc account has are turned
  away at first and must link from the account page: the price of not trusting the email.
- A work or school account whose tenant has no email for the person cannot make an account; it can
  still be linked from the account page.
- Microsoft recommends a certificate (`private_key_jwt`) over a client secret for production
  ([credentials](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials)).
  A secret is kept for now, alike with the other providers and rotated yearly; a certificate is a
  later change.
- Server tests run against the fake provider, which issues tokens per tenant and publishes its key
  with the `{tenantid}` issuer template; they cover another tenant's issuer, a key bound to another
  tenant, a stale or missing `auth_time`, the email collision and the unconfirmed new account. A
  real-provider check on staging stays a manual step (deploy/README.md).
