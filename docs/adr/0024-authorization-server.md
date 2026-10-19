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
  most 30 fetches a minute for everyone together. oidc-provider checks that the document's
  `client_id` is its address and has no secret, and keeps it 1 to 24 hours. **DCR** is kept as the
  second way: 10 registrations an hour from one address and 500 a day from everyone; ids start
  `dcr_`; no registration access token; an app nobody connects goes after 7 days, one connected
  30 days after its last use. Both pass the same check of their metadata (`checkClientMetadata`):
  public, the code and refresh grants and the code response only, a name of at most 60 characters,
  1 to 10 redirect URIs that are https (not to loopback), an app's own scheme (cursor://, com.example.app:; never javascript:, data:, file: and the like), or
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

## Consequences

- Assistants that connect only with OAuth can use a person's records, and the person sees and
  revokes each connection like a token.
- Until the consent page ships (`r5-oauth-consent`), `/connect/:uid` is the client's not-found
  page, so nobody can finish a connection; the server side is complete and tested
  (`server/test/oauth_tests.ts`).
- oidc-provider's CIMD support is experimental (draft 02): a new draft may change it, so it is
  pinned and moved by hand. Its updates are taken like the MCP SDK's.
- Koa runs inside Express for `/oauth/` only; an error there is logged without the request.
- A chat app that gets the public tools without signing in may never ask to connect: the endpoint
  answers anyone, and only an Authorization header that fails gets 401. How Claude and ChatGPT
  behave here, and whether ChatGPT acts on the 403 step-up or only on
  `_meta["mcp/www_authenticate"]`, is to be checked with the real clients on staging.
- The MCP conformance suite's `auth/*` scenarios test clients, not servers; its authorization
  server scenarios are run where they can be (`npm run test:mcp`).
- The 30 CIMD fetches a minute are shared: someone sending many made-up addresses can hold up new
  CIMD apps for a minute at a time (apps already fetched are cached), not anything else.
