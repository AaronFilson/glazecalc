# 24. AI assistants connect with Glazecalc's own OAuth authorization server

Accepted, 2026-10-19. Phase 4 of [the integrations plan](../integrations-plan.md), items 33, 34
and 38 (the server side; the consent page and the notice email are a later branch), with the
owner's decisions of 2026-10-19: changing records (`data:write`) is opt-in on the consent page,
unticked, reached by stepping up, and a connection that may change records lasts 90 days from the
yes, never renewed. Builds on [ADR 17](0017-mcp-server.md), whose endpoint, tools and limits are
unchanged.

## Context

Personal access tokens ([ADR 17](0017-mcp-server.md)) reach assistants that take a header (Claude
Code, VS Code, Cursor, Gemini CLI). The chat apps (Claude, ChatGPT) and many others connect only
through OAuth, as the MCP authorization specification (2025-11-25 and 2026-07-28) describes: the
endpoint's Protected Resource Metadata names an authorization server; the client finds it, names
itself (a Client ID Metadata Document, CIMD, which 2026-07-28 says SHOULD be supported; or Dynamic
Client Registration, DCR, which it keeps as MAY and calls deprecated), and runs the authorization
code flow with PKCE and resource indicators. Glazecalc has no identity provider to lean on, and an
assistant's grant must be a Glazecalc connection the person can see and revoke with their tokens.

## Decision

- **`oidc-provider` 9.12.2** (MIT, pinned exactly; the latest 9.x, over two weeks old;
  `@types/oidc-provider` 9.12.1 for its types), in `server/oauth/provider.ts`. It is a Koa app;
  only its own handler sees Koa, under `/oauth/`, mounted in `server/app.ts` before the client's
  pages. Its new dependencies are `koa` 3 and `jose` 6, which run only inside it. nginx already
  sends every path to the app.
- **Issuer: the site itself** (`SITE_URL`); metadata at `/.well-known/oauth-authorization-server`
  (RFC 8414), written by the app, listing only what is offered. Endpoints: `/oauth/authorize`,
  `/oauth/token`, `/oauth/register`, `/oauth/revoke` (and `/oauth/jwks`). Every request is handed
  over with the site's own host and scheme, whatever `Host` or `X-Forwarded-Host` it carried, so
  addresses, cookies and redirects are always the site's.
- **What it gives out:** the authorization code flow only, with **PKCE S256** required (plain and
  none refused); refresh tokens that **rotate** on every use, where a second use of a refresh token
  or code ends the whole connection (`revokedWhy: 'reused'`; the claim is atomic, so two uses
  racing each other are caught too); **RFC 9207** `iss` in every authorization answer; **resource
  indicators** (RFC 8707) with exactly one resource, the MCP endpoint (`https://<site>/mcp`, also
  the default), anything else `invalid_target`; **opaque access tokens for one hour**. Public
  clients only (`token_endpoint_auth_method: none`). No OpenID Connect (no `openid`, ID tokens or
  userinfo), no implicit or client-credentials grant, no device flow, no DPoP, no pushed requests,
  no logout endpoint, no introspection.
- **Scopes.** The authorization server knows `data:read` and `data:write` (`server/lib/scopes.ts`).
  Every authorization request is given `data:read` (an app asking for nothing, or only for
  `data:write`, still gets a token that reads). The Protected Resource Metadata lists **only
  `data:read`** in `scopes_supported`, because a client asks for every scope listed when a challenge
  names none; `data:write` comes only by **step-up**: an app with a read-only connection calling a
  tool that changes records gets HTTP 403 with
  `WWW-Authenticate: Bearer error="insufficient_scope", scope="data:read data:write", resource_metadata=...`
  before the SDK sees the call (`server/mcp/auth.ts` `stepUp`, `WRITE_TOOLS`), and comes back
  through the consent page. Personal tokens keep their refusal in words inside the tool.
- **Apps name themselves two ways.** **CIMD** from any HTTPS host (`server/oauth/cimd.ts`),
  acknowledged as oidc-provider's experimental draft 02: every fetch the server makes goes through
  a guard that allows only `https`, port 443, a host name (no IP address, `localhost`, `.local` or
  `.internal`), a path, and no query or credentials; resolves the name itself and refuses if any
  address is loopback, private, link-local (the cloud's metadata service, 169.254.169.254), CGNAT,
  unique-local, multicast, documentation, NAT64, 6to4 or otherwise special (IPv4-mapped IPv6
  judged as IPv4); connects to the address it checked, with the name only for TLS and `Host` (no
  DNS rebinding); follows no redirect; stops after 5 seconds or 5 kB; takes JSON only; and makes at
  most 10 fetches a minute from one address, 10 for one host and 120 for everyone together (see Review fixes). oidc-provider checks that the document's
  `client_id` is its address and has no secret, and keeps it 1 to 24 hours. **DCR** is kept as the
  second way: 10 registrations an hour from one address and 500 a day from everyone; ids start
  `dcr_`; no registration access token; an app nobody connects goes after 7 days, one connected
  30 days after its last use. Both pass the same check of their metadata (`checkClientMetadata`):
  public, the code and refresh grants and the code response only, a name of at most 60 characters,
  1 to 10 redirect URIs that are https (not to loopback, nor to this site: see An outside report), an app's own scheme (cursor://, com.example.app:; never javascript:, data:, file: and the like), or
  http to `127.0.0.1`, `[::1]` or `localhost`; no `jwks`, `jwks_uri`, `sector_identifier_uri`,
  `request_uris` or `initiate_login_uri`. An app whose redirects are all loopback or its own scheme
  is a native app, so its loopback port may change (RFC 8252). Names shown are cleaned of control,
  format and direction characters; a DCR app's name is only what it says of itself, and a CIMD
  app's host is the one thing checked about it.
- **The person says yes on the website** (`server/oauth/interactions.ts`). `/oauth/authorize`
  sends the browser to `/api/connect/:uid` with a short, httpOnly, path-bound interaction cookie;
  that address sends it on to the consent page `/connect/:uid` (a later branch). The page asks
  `GET /api/connect/:uid` what to show (the app's name, CIMD or DCR, its host when checked, the
  redirect host, whether that is the person's own computer, whether changing records was asked
  for) and sends `POST /api/connect/:uid {decision, write}`, then sends the browser where the
  answer says. The routes take the web session only, from the site's own pages (`sameOrigin`), and
  refuse trials and accounts whose email is not confirmed; no page may frame them (CSP
  `frame-ancestors 'none'`). `write` is false unless sent as true, and counts only when the app
  asked for `data:write`. There is no sign-in at the authorization server and no lasting session of
  its own: its session lasts 15 minutes, one left from an earlier yes is ended before the next, and
  no request rides on an earlier grant (`loadExistingGrant` reads only the grant just made).
- **A connection is its row.** Each yes makes a row in `access_tokens` (kind `oauth`,
  `server/models/access_token.ts`) beside the grant: the app's cleaned name, `clientId`,
  `clientSource` (`cimd` or `dcr`), `clientHost` (CIMD only), `redirectHost`, `grantId` and scopes.
  A connection that reads lasts 60 days from its last refresh, renewed each time; one that may
  change records lasts 90 days from the yes, never renewed. One connection per app: a new yes ends
  the person's earlier one to the same app (`revokedWhy: 'replaced'`). The MCP endpoint
  (`server/oauth/resource.ts`) and the token endpoint (`findAccount`) each ask for a working row,
  the same account and app, and an account that is not a trial, on every request; so revoking the
  row stops every access and refresh token of the connection at once. `revokeOne` and `revokeAll`
  (the account page, a password reset, "Sign out everywhere") and `revokeGrant` also delete the
  grant with its codes and tokens; deleting the account deletes them too. An app revoking its own
  refresh token ends the connection (`revokedWhy: 'app'`).
- **Storage** (`server/oauth/adapter.ts`): one collection, `oauth_records`, every record removed
  when it expires (TTL index). A record's id is its kind and the SHA-256 of oidc-provider's id; a
  code's or token's own value is never stored, so a copy of the database holds nothing anyone could
  use. The cookies are signed with a key derived from `APP_SECRET`; the signing key oidc-provider
  insists on is made for each process (nothing is signed with it).
- **Resource side.** `server/lib/token_auth.ts` recognises the authorization server's tokens (43
  base64url characters) beside personal ones and checks them through `resource.ts`: the token's
  audience must be exactly the MCP endpoint. The MCP endpoint takes them (`req.mcpCaller.via` is
  `oauth`, `tokenId` the connection's row, so the limits and the activity log are the
  connection's); every route under `/api` refuses them with 403 `token-not-here`, `requireScope`
  included. The write tools record changes with the real `via` (`pat` or `oauth`) in the activity
  log, the versions and the Trash. `glazecalc_oat_` stays reserved and is never given out.
- **ChatGPT.** Every tool's `_meta.securitySchemes` says how it may be called (public tools:
  `noauth` or `oauth2` with `data:read`; the person's own: `oauth2` with `data:read`; the tools that
  change records: `oauth2` with both), and a refusal for want of `data:write` carries the challenge
  in `_meta["mcp/www_authenticate"]`.
- **Limits** (`server/lib/rate_limit.ts`), per address: `/oauth/authorize` 100 in 15 minutes,
  `/oauth/token` 300, the rest of `/oauth/` 100, the consent API 100; DCR as above. Refusals from
  `/oauth/` are OAuth's shape, `{ error: 'too_many_requests' }`.

## Notices

The privacy page, the processing record and the `/assistants` page are a later branch
(`r5-docs-privacy`); they must say:

- **Privacy page, "Connecting an AI assistant":** what is kept for each connected app (its name as
  it gives it, its address or the address it registered with, where it sends the person back, what
  it may do, when it was connected, last used and ends, and whether it was revoked and why); that
  the app's own details are fetched from its address (CIMD) or given by the app (DCR) and kept at
  most 30 days after its last use (a registered app) or 24 hours (a fetched document); that codes
  and tokens are kept only as hashes, codes for a minute and access tokens for an hour, refresh
  tokens as long as the connection; that a connection that reads lasts 60 days from its last use
  and one that may change records 90 days, and that the person can end any of them on the account
  page, and every one ends with a password reset or "Sign out everywhere"; that what an assistant
  does with the records it reads is between the person and the assistant's maker.
- **Processing record**, a new activity "Connected AI apps": purpose (letting an assistant the
  person chose read, and if allowed change, their records); data (app metadata, grants, connection
  rows, token hashes, the fetched CIMD documents and the requests made for them, the
  authorization server's 15-minute interaction records and sessions); retention as above; no new
  sub-processor (the fetch goes to the app's own address, chosen by the app); the nginx log line
  for each `/oauth/` request, 14 days, as for every page.
- **`/assistants`, "Connect":** that Claude, ChatGPT and other apps can now connect by signing in
  to Glazecalc and saying yes; that "Read only" is the default and "Also let it change my records"
  is asked for separately; what the consent page shows (the app's host, where it sends you back,
  the warning for an app on your own computer); that the Connected apps list on the account page
  shows and revokes them.

## Alternatives

- **An outside identity service** (Auth0, WorkOS, Cognito): a sub-processor holding every
  person's connections, a monthly cost, and a second account for each person.
- **Hand-written OAuth:** less code to load, but PKCE, rotation with reuse detection, RFC 9207,
  resource indicators, CIMD and DCR are each easy to get subtly wrong; oidc-provider is certified
  and maintained.
- **DCR only:** what most 2025 clients send, but deprecated in 2026-07-28 and the only way open to
  anyone wanting to fill the database; CIMD only would shut out clients that have not moved yet.
- **`data:write` in `scopes_supported`:** clients would ask for it at the first connection, and the
  consent page would have to explain a write grant to everyone.
- **JWT access tokens:** checkable without the database, but not revocable before they expire; the
  endpoint already reads the connection's row on every request.

## Review fixes

A security review of this branch (2026-10-19) found five things, fixed on `r5-oauth-fixes`, each
with a test that failed before:

- **Exact addresses under `/oauth/`.** oidc-provider's router ignores letter case and a slash at
  the end, so `POST /oauth/REGISTER` or `/oauth/register/` reached registration without its
  limits. Now only the offered addresses, written exactly (`/oauth/authorize`, its way back
  `/oauth/authorize/<uid>`, `/oauth/token`, `/oauth/register`, `/oauth/revoke`, `/oauth/jwks`),
  reach it; anything else under `/oauth/` is 404 `not_found` (`offeredPath`). The limits also match
  paths as the router does, as a second line.
- **CIMD fetches and kept documents.** The one budget of 30 fetches a minute could be used up by
  anyone naming made-up addresses, and oidc-provider keeps fetched documents only in memory (100 of
  them), so a connected app pushed out could fail its next refresh. Now fetches are counted per
  requesting address (Express's `req.ip`, one proxy hop; a /56 for IPv6), 10 a minute, per host
  named, 10 a minute, and 120 a minute for everyone. And an app with at least one working
  connection has its document kept in `oauth_records` (`server/oauth/client_documents.ts`), which
  oidc-provider reads through the adapter's `Client.find` before its own memory or any fetch. It is
  checked again when its time is up (its Cache-Control, 1 to 24 hours); a new document that passes
  oidc-provider's checks replaces it, and a check that cannot be made or does not pass keeps the old
  one and tries again 5 minutes later: a connection ends by the person or the app, never by a failed
  fetch. The copy is the app's public metadata, nothing about a person; it goes after the last
  connection to the app ends (when the app is next looked up), at the latest when that connection
  would have run out (TTL). The privacy notice and the processing record say so.
- **DCR's day for everyone** counts only registrations made (`skipFailedRequests`): refused ones use
  up nothing. The 10 an hour per address counts an IPv6 /56 as one address (stricter than the /64
  the review asked for; express-rate-limit's default, now written out). A ceiling on unused apps
  kept was considered instead of the day's count, and not taken: someone filling it would block
  registration for the 7 days an unused app is kept, where the day's count recovers in a day, and
  CIMD, the way the specification now prefers, is unaffected either way.
- **More IPv6 blocks in the CIMD guard:** IPv4-compatible `::/96` and SIIT `::ffff:0:0:0/96` (NAT64
  `64:ff9b::/96` and `64:ff9b:1::/48`, 6to4 `2002::/16` and Teredo, inside `2001::/23`, were
  already blocked whole).
- **The consent API as the site.** `provider.proxy` is on, so Koa believes `X-Forwarded-Host` and
  `-Proto`; the `/api/connect` routes call oidc-provider directly, and now get the site's own host
  and scheme first, as `/oauth/` does (`asTheSiteForConnect`).

## An outside report

A security researcher wrote on 2026-10-20 that `/oauth/register` lets anyone register a public app
with an https redirect of their choosing, which could then ask people to connect it (consent
phishing). Open registration is this decision: it is how the chat apps and other MCP clients
connect, and an initial access token, a hand review or a list of allowed redirects would shut them
out. CIMD was already offered beside it. What stands between a registered app and anyone's records
is the consent page, on the website, signed in, each time. Checking the report found two ways
round that page, both closed, each with a test that failed before:

- **This site as the place the answer goes.** An app could register `https://glazecalcapp.com/...`
  (or `www.`, or the production site from staging), and the page would then say the answer goes to
  glazecalcapp.com. `checkClientMetadata` now refuses https redirects to the site's host, to any
  host under it and to any above it; an app registered before is refused too, as its details are
  checked whenever they are read.
- **A click meant for something else.** Allow took a click as soon as it was shown, so a site that
  asks for a double-click and brings the consent page forward under the pointer between its two
  halves (DoubleClickjacking) could have the second land on Allow. Allow now takes a click only
  once the page has been in front, without a break, for a second (`ALLOW_AFTER_MS`): the wait
  starts when the page is shown and again whenever its window comes to the front or its tab is
  shown, and Allow waits while either is away. Don't allow is never held back. Framing was already
  refused (`frame-ancestors 'none'`, `X-Frame-Options: DENY`).

Unchanged: a self-registered app's name is only its own word, marked "self-described", with where
the answer goes beneath it; the notice email for each connection; read-only unless ticked; revoking
on Connected apps. Once the chat apps have been tried on staging, registering could be kept for
apps that answer on the person's own computer or through an app's own scheme, which cannot be used
from afar, with every app on the web naming itself by its address (CIMD), whose host the page shows
checked.

## Amended: sign-in when a tool needs it

2026-10-20, preparing the directory submissions ([docs/integrations/directories.md](../integrations/directories.md)).
Anthropic's connector docs (claude.com/docs/connectors/building/authentication and
lazy-authentication, read 2026-10-20) say Claude starts sign-in only on an HTTP `401` with
`WWW-Authenticate`, never on a tool's error inside a `200`, and that a server whose public tools
answer anyone should list its other tools too and answer a call to one of them `401` before the
SDK. Glazecalc listed the person's own tools only to a request with a token, so a Claude custom
connector saw nine public tools and never offered to connect (the open question under
Consequences, below). Now:

- **Every tool is listed without a token** (`server/mcp/server.ts` `registerSignInTools`): the
  read and write tools with the same names, titles, descriptions, schemas, annotations and
  `securitySchemes` as with one, registered by the same code; their handlers there never reach a
  record and only answer, as a fallback, with the challenge in `_meta["mcp/www_authenticate"]`.
- **A call to one with no token is answered `401`** before the SDK (`server/mcp/auth.ts`
  `signIn`): `Bearer realm="glazecalc", error="invalid_token", error_description="Sign in to
Glazecalc to use this tool", resource_metadata=..., scope="data:read"`, or
  `scope="data:read data:write"` for a tool that changes records. The second asks for writing
  only because the person asked for a change; the consent page still leaves "Also let it change
  my records" unticked, so the person chooses as before. A personal token's calls, the public
  tools and the step-up for a read-only app are unchanged; a session cookie is still never read.
- The server's instructions say that calling one of them without a connection asks the person to
  sign in.

## Amended: ChatGPT's document, private_key_jwt, shared addresses

2026-10-21, round 8 (plan: `scratch/round8/dir-gaps/plan.md`; owner's decisions in
`scratch/round8/plan.md`). Sources, read 2026-10-21: the MCP authorization draft and its client
registration and security pages (modelcontextprotocol.io/specification/draft/basic/authorization),
draft-ietf-oauth-client-id-metadata-document-02, draft-ietf-oauth-rfc7523bis-11, OpenAI's Apps SDK
auth page (developers.openai.com/apps-sdk/build/auth), ChatGPT's own document and keys
(chatgpt.com/oauth/client.json, /oauth/jwks.json), and Anthropic's connector authentication page.

**ChatGPT's document.** ChatGPT names itself by `https://chatgpt.com/oauth/client.json`, which asks
for `private_key_jwt` (RS256), lists `["none", "private_key_jwt"]` in
`token_endpoint_auth_methods_supported` and has a `jwks_uri` on chatgpt.com. Every app had to be
public, so its consent step would have said "only public clients". Two answers are built, both
behind one setting, **`OAUTH_CIMD_AUTH`, off by default**; off, every setting and check is as
before (`server/oauth/provider.ts` `modeSettings`, `checkClientMetadata`):

- **`public` (step A).** A document named by its address whose list includes `none` is taken as a
  public app: `none`, with its `jwks_uri`, `jwks` and signing alg dropped, so nothing is fetched
  from them. Our metadata offers only `none`, and OpenAI says ChatGPT picks from what both sides
  list, so `none` is what it uses. Refresh tokens stay bearer and rotating, as Claude's.
- **`private_key_jwt` (step B).** As public, and a document that asks for `private_key_jwt` is
  taken as it says: every code exchange, refresh and revocation must carry a client assertion
  signed with the app's key, so a stolen code or refresh token is useless without OpenAI's key.
  The metadata then offers `["none", "private_key_jwt"]` (none first: Claude picks a document only
  with none listed) and the algs RS256, PS256 and ES256. Safeguards:
  - the keys only from an https address on the client_id's own site (same origin, port 443, a host
    name, not the document itself), or written in the document; fetched through the same guard as
    documents (public addresses only, pinned, no redirects, 5 s, 5 kB, JSON), with a budget of
    their own (6 a minute for one host, 60 for everyone; `cimd.ts` `JWKS_FETCH_LIMITS`), kept at
    most 15 minutes whatever their Cache-Control says (oidc-provider would take the longest it is
    given, so a year-long one would pin a replaced key for a year), and taken only as 1 to 5
    public signing keys, RSA of 2048 bits or more or EC on P-256 (`checkJwks`);
  - the assertion (`server/oauth/client_assertions.ts`): asymmetric algs only, never `HS*` or
    `none`; `typ` absent, `JWT` or `client-authentication+jwt`; `iat` required and at most 5
    minutes old; `exp` at most 5 minutes ahead; `aud` one value, the issuer, or for now the token
    endpoint's address (logged, until staging shows what ChatGPT sends; RFC 7523bis says issuer
    only); used once, by an insert on a unique id (iss and jti), so two requests at the same moment
    cannot both pass (oidc-provider's own check finds, then saves);
  - one method per app, from its document: a signing app's code or refresh token without an
    assertion is `invalid_client`, the grant untouched.
  - Never for an app that registered itself (DCR): its keys would be only as trustworthy as an
    anonymous registration, and its address one more a stranger chooses.

  Migration: oidc-provider has one method per client_id, so connections made under `public` and
  then refreshed under `private_key_jwt` depend on ChatGPT switching to signing. OpenAI does not
  say whether it does; test the switch on staging, or turn `private_key_jwt` on before ChatGPT has
  production users. Turning it off later changes the method back the same way.

**Shared addresses.** Claude's servers call from `160.79.104.0/21` and ChatGPT's from OpenAI's own
ranges, so per-address limits made for one person's computer would stop everyone using either app
at once. The owner chose no special treatment for those ranges: limits are keyed on what a request
has proven (an account, a token, a connection), never on a client_id anyone can type, with
per-address limits kept for what is unproven and ceilings for everyone together. Not behind a
setting:

- The token endpoint counts per address only what it refuses (300 in 15 minutes; a guesser's
  requests look like that), each account's codes and refresh tokens (100 in 15 minutes; a 429
  `too_many_requests` before the token is used, so it still works later), and everyone's requests
  together (20,000 in 15 minutes).
- Access tokens that do not work are still counted per address, but once over the answer is
  `401` with the same `WWW-Authenticate` challenge (`/mcp`) or RFC 6750's (`/api`), never `429`:
  an app refreshes or signs in again on a 401 and waits on a 429, so the 429 kept everyone behind
  Claude's or ChatGPT's addresses from reconnecting.
- Subscription streams: 3 for each account, or each address without a token (were 3 for each
  address, with a token or not).
- Without a token: still 60 requests a minute and 2,000 a day per address, plus 3,000 a minute from
  everyone together; fits still 10 a minute per caller, plus 200 a minute for everyone without a
  token together.
- Registering (DCR) stays 10 an hour per address and 500 a day in all; CIMD is the way for the
  chat apps.

**The Origin check** on `/mcp` is kept as it was (the site's own Origin, written exactly, or none);
tests now cover `null`, a slash at the end, other letter cases, a lookalike host, the default port
written out, two Origin headers, and that a refused request counts against no limit. Refusals are
logged at debug level with the Origin, for the staging test. No CORS allow-list.

## Consequences

- Assistants that connect only with OAuth can use a person's records, and the person sees and
  revokes each connection like a token.
- The consent page (`client/app/pages/connect/connect-page.ts`, route `connect/:uid`, a private
  page: noindex, no Referer, no cache) shows the app's name, "self-described" for a DCR app, its
  checked host, and where the answer goes: a host only for http and https (`redirectShown` in
  `interactions.ts`); an app's own scheme is shown whole with a warning, since
  `evilapp://claude.ai/cb` goes to whichever app opens `evilapp:`; a loopback answer and a CIMD
  app answering on another host than its own are warned about too. "Also let it change my records"
  is never ticked for the person, and neither button is focused; Allow takes a click only once the
  page has been in front for a second (An outside report). A visitor not signed in signs in
  and comes back (`?next=`, this site's paths only). Each yes emails the account a notice naming
  the app, its host and whether it may change records (`sendConnectionMade`).
- oidc-provider's CIMD support is experimental (draft 02): a new draft may change it, so it is
  pinned and moved by hand. Its updates are taken like the MCP SDK's.
- Koa runs inside Express for `/oauth/` only; an error there is logged without the request.
- A chat app that gets the public tools without signing in may never ask to connect: the endpoint
  answers anyone, and only an Authorization header that fails gets 401 (answered for Claude by
  "Amended: sign-in when a tool needs it", above). How Claude and ChatGPT
  behave here, and whether ChatGPT acts on the 403 step-up or only on
  `_meta["mcp/www_authenticate"]`, is to be checked with the real clients on staging.
- The MCP conformance suite's `auth/*` scenarios test clients, not servers; its authorization
  server scenarios are run where they can be (`npm run test:mcp`).
- The 120 CIMD fetches a minute for everyone are shared: someone sending made-up addresses from many
  addresses at once can hold up new CIMD apps for a minute at a time, not apps already connected
  (Review fixes).
