# Integrations feature list: sign-in, MCP server, tokens

Effort is in working days for one person who knows the codebase. Figures come from the research notes, adjusted for shared work _(inferred)_. Paths are relative to the repo root. ADR numbers: 0014 is two-step sign-in and 0016 the prerendered pages (`docs/adr/README.md`), so this plan's are 0015 (sign-in), 0017 (publishing) and 0018 (the assistant's privacy notice). Each phase ships on its own. Run `npm run test:e2e:linux` before calling any phase done.

## Phase 0: Foundations (8–11 days)

1. **Soft delete through Trash.** Deletes made by a token, an OAuth client or the assistant move the record to Trash and can be restored for 30 days. Finish the Trash page. M (2 d). `server/lib/record_routes.ts`, `server/routes/records.ts`, `server/models/trash.ts`, `client/app/pages/trash/trash-page.ts`, `client/public/i18n/notebook/*.json`.
2. **Record versions.** Save the previous document on each token or assistant change, keep the last 20 per record or 90 days, and offer Undo. M (1–2 d). New `server/models/record_version.ts`; `record_routes.ts`.
3. **One activity log** for token, OAuth and assistant writes, kept 90 days with a TTL index, and never the full note text. S (1 d). New `server/models/activity.ts`; `record_routes.ts`.
4. **One grants and tokens table** (`kind: pat | oauth`, scopes, expiry, last used, revoked) and a shared verifier. M (2 d). New `server/models/access_token.ts`, `server/lib/token_auth.ts`; `server/lib/jwt_auth.ts`.
5. **Scope list and `requireScope` with default deny.** Tokens never reach `usersettings`, `deleteuser`, `password/*` or `signout`. Errors follow RFC 6750. S–M (1–2 d). `server/lib/token_auth.ts`, `server/routes/*.ts`.
6. **Extract client-only logic into `lib/recipe/`** (limits, shelf match, substitutions, temperature format), returning message codes. M (2–3 d). `client/app/pages/recipe/{checks,shelf,try-materials,suggest,lead,pool,rebase}.ts`, `client/app/shared/format.ts`, new `lib/recipe/`.
7. **Full CSP header** (`default-src 'self'`, `connect-src 'self'`) and `Cache-Control: no-store` on authenticated `/api`. S (0.5–1 d plus testing). `deploy/nginx/glazecalc-proxy.conf`.
8. **Deletion and export hooks** for every new collection. S (0.5 d). `server/lib/account_data.ts`.

## Phase 1: Sign in with Google, GitHub and Microsoft (6–9 days)

Google and GitHub are built ([ADR 0015](adr/0015-provider-sign-in.md)), on `fetch` and `node:crypto` rather than `openid-client`, with the cookie as `__Host-glazecalc_oauth` on `Path=/` in production. Still to do: Microsoft (decision 1), and a fresh provider re-authentication in place of the password for accounts that have none (item 13).

9. **Provider table and flow** on `openid-client` 6: start, then callback, with PKCE, `state`, `nonce` and one callback URL per provider. M–L (2–3 d). New `server/lib/oauth.ts`, `server/routes/oauth_routes.ts`, `server/models/oauth_login.ts` (TTL).
10. **`SameSite=Lax` transaction cookie** `glazecalc_oauth` on `Path=/api/auth`, 10 minutes. Record the trial id at start, and use the query response mode (no `form_post`). S. `oauth_routes.ts`, `server/lib/session.ts`.
11. **Identities on User.** Store `{provider, subject, tid?, linkedAt, lastUsedAt}` with a unique index, plus `hasPassword` and `reauthUntil`. S. `server/models/user.ts`.
12. **Linking rules.** Link by subject only; a new account needs a verified email; an email collision needs one password sign-in; link and unlink with notice emails; never remove the last method. M (1–2 d). `oauth_routes.ts`, `auth_routes.ts`, `server/lib/account_mail.ts`, `server/lib/messages.ts`.
13. **Passwordless accounts.** "Set a password" uses the reset email, and email change or deletion accepts a fresh provider re-authentication. S. `user_routes.ts`, `password_routes.ts`.
14. **Buttons and a "Sign-in methods" settings section.** Self-hosted SVG logos, one key per provider in 24 languages, email form first. M (1–2 d). `client/app/pages/auth`, account page, `client/app/core/auth.service.ts`, `client/public/i18n/**`.
15. **Return path and language.** Check the return path with `isPage()` and 303 to it. Errors land on `<lang>/signin`. S. `server/lib/pages.ts`.
16. **Ops.** SSM secrets per provider (absent means off), `PUBLIC_URL`, an `invalid_client` warning, and the instance policy. S. `deploy/deploy.sh`, `deploy/aws/instance-policy.json`, `deploy/README.md`, `aws/README.md`.
17. **Tests.** Mocha against `oauth2-mock-server`; Playwright on Chromium, Firefox and WebKit, including the Strict cookie after the redirect; Windows and Linux runs. M (1–2 d). New `server/test/oauth_routes_tests.ts`, e2e specs.
18. **Docs.** ADR 0015 for sign-in (0014 is two-step sign-in, `docs/mfa-plan.md`), the privacy notice (providers as separate controllers, the cookies), and the CHANGELOG. S. `docs/adr/`, `client/app/pages/privacy`, `client/public/i18n/site/*.json`.

## Phase 2: Public MCP tools, no account (4–6 days after item 6)

Built ([ADR 0017](adr/0017-mcp-server.md)). Round 5 added `blend_recipes` (item 20) and a fifth prompt,
`glaze_course_lesson`, which pairs a unit of John Britt's free Glaze Course with the guide sections to read (item 21;
it links his videos, never embeds them or sends anything to YouTube).

19. **`POST /mcp`** on SDK v2, stateless, also serving 2025-era clients; GET and DELETE return 405; Origin and Host checks. M (1–2 d). New `server/mcp/index.ts`; `server/app.ts` (mount before the SPA fallback).
20. **Tools:** `search_materials`, `get_material`, `analyze_recipe`, `check_limits`, `convert_cone_temperature`, `suggest_substitutes`, `search_guides`, and later `blend_recipes` (test tiles of a blend, or a comparison of two recipes; `server/mcp/tools/blends.ts`), with structured output and `language`/`temperature` arguments. M (2 d). `server/mcp/tools/*.ts`, `lib/chemistry`, `lib/recipe`, `data/`.
21. **Resources and prompts** (guides per language and section, materials, cones; four prompts). S (0.5–1 d). `server/mcp/`.
22. **Server-side translator** over `client/public/i18n/<lang>.json` using `intl-messageformat`. S. `server/mcp/i18n.ts`.
23. **Limits and caps.** Per IP 60 a minute and 2,000 a day (with a token, per account 300 and 20,000); fitting tools 10 a minute; at most 40 recipe lines. S. `server/lib/rate_limit.ts`.
24. **Tests:** a `tools/list` snapshot, known values, the conformance suite (2026-07-28 and 2025-11-25) and an Inspector CLI smoke test in Ubuntu CI. M (1–2 d). `server/test/mcp_tests.ts`, CI workflow.
25. **Publishing:** a "Use Glazecalc from your AI assistant" page (24 languages), `server.json`, the registry name `com.glazecalcapp/glazecalc`, and ADR 0017. S (1 d). `/.well-known/mcp-registry-auth`, docs page.

## Phase 3: Read-only personal tokens (7–10 days)

26. **Token format and creation.** `glazecalc_pat_` + base62 + CRC32; shown once; SHA-256 at rest; expiry required; cap of 10; no trials. Creating one needs a recent password or provider confirmation _(inferred)_. M (2 d). `access_token.ts`, new `server/routes/token_routes.ts`.
27. **"Access tokens" settings page.** Create with a preset, list (hint, scopes, expires, last used), revoke, revoke all. M (2–3 d). New client page, i18n.
28. **Emails** on creation and 7 days before expiry. S. `server/lib/account_mail.ts`, a sweeper like `guest_sweeper.ts`.
29. **Lazy-auth gate on `/mcp`.** Answer 401 before the SDK, publish Protected Resource Metadata, accept PATs. Never accept the session JWT. M (1–2 d). `server/mcp/auth.ts`.
30. **Account read tools:** `list_recipes`, `get_recipe`, notebook, my materials, shelf, `match_with_what_i_have`, `get_my_settings`. M (2 d). `server/mcp/tools/account/*.ts`.
31. **Per-token and per-account rate limits.** S. `rate_limit.ts`.
32. **Help text** for Claude Code (`--header`), VS Code, Cursor and Gemini CLI. Test Cursor's header behaviour first. S. Docs page.

## Phase 4: Own authorization server and write tools (11–16 days)

Built in round 5 (October 2026), items 33–38 and the English of 39: the authorization server
([ADR 0024](adr/0024-authorization-server.md)), the consent page, Connected apps (`/account/apps`: activity, the Trash
each connection filled, with Put back and Put all back; revoke one or all), the write tools with the REST shelf and its
one Undo, and the ChatGPT step-up. Dynamic Client Registration is kept as the second way for apps to name themselves, though the
MCP authorization specification of 2026-07-28 calls it deprecated (still MAY) and prefers Client ID Metadata
Documents (SHOULD). Still to do: the notice's other languages (39) and the real-client checks on staging (40).

33. **`oidc-provider`** in Express: CIMD with an SSRF guard, DCR (rate-limited and expiring), PKCE S256, resource indicators (`aud` = `/mcp`), rotating refresh tokens, and RFC 9207 `iss` if supported; a MongoDB adapter. L (4–6 d). New `server/oauth/`; `server/app.ts`.
34. **Session-scoped AS cookies.** Login runs through `/connect`, which uses same-site `/api` calls with the existing session; no persistent AS session. S–M. `server/oauth/interactions.ts`.
35. **Consent page `/connect`** (24 languages). Shows the client host, redirect host, permissions and privacy line, with a loopback warning; trials are refused. M (1–2 d). Client page, `client/public/i18n/<lang>.json` `connect.*`.
36. **Settings → Connected apps.** Lists PATs and OAuth grants together, shows recent activity, offers Disconnect and Disconnect all. M (1–2 d). `GET/DELETE /api/connections`, client page.
37. **Write scopes and tools:** `create_recipe` (the server computes the analysis), `update_recipe` (keeps a version), `add_notebook_entry`, my materials, shelf add and remove (round 5: also `undo_shelf_change`, and over REST `GET /api/shelf` with `shelf:read` and `POST /api/shelf/add`, `/remove`, `/undo` with `shelf:write`; the list before the last change is kept in `User.shelfPrevious` for one Undo, and every change by a token is in the activity log as 'change' or 'undo' on 'shelf'). M (2–3 d). `server/mcp/tools/account/*.ts`.
38. **ChatGPT mixed auth:** `securitySchemes` plus `_meta["mcp/www_authenticate"]`; 403 step-up. S. `server/mcp/auth.ts`.
39. **Privacy notice "Connecting an AI assistant"** (24 languages, with back-translation) and ADR 0018. S + translation pipeline time.
40. **Tests:** the OAuth flow, CIMD fixture, DCR, scopes, ownership, revocation, Playwright for consent and Connected apps, and real-client checks (Claude, Claude Code, ChatGPT, VS Code, Cursor, Gemini CLI). M (2–3 d).

## Phase 5: Optional (8–13 days)

41. **In-app assistant on the person's key.** Anthropic browser-direct; key not stored by default, opt-in "this device only", never sent to Glazecalc (tested); client-side tools with the same scopes; a confirm card with a diff for each write; token usage shown; no web or image fetch. L (6–9 d). New client feature; needs item 7.
42. **OpenRouter PKCE** for other models, OpenAI included. S (1–2 d).
43. **`move_to_trash` over MCP** with elicitation confirmation. S (1 d).
44. **GitHub secret-scanning partner endpoint** `/api/token-leak`. S (1–2 d plus GitHub's wait).
45. **Directory submissions** (Claude Connectors, ChatGPT apps) and an MCP Apps UMF widget. S–M. Prepared 2026-10-20 in [integrations/directories.md](integrations/directories.md): requirements, gaps, listings, the reviewers' accounts and the staging test; the widget is optional for both.
46. **Passkeys** in the same "Sign-in methods" section, using `@simplewebauthn/server`. M.
47. **`/api/v1` and OpenAPI**, only if script users ask. S–M (2–3 d).

## Decisions for the owner

1. **Which providers first?** Recommend **Google and GitHub together, Microsoft second.** Google reaches the most potters with the least setup. GitHub is trivial and suits the developer-tool users who will also want tokens. Microsoft needs an Entra tenant (a payment card for it is **unconfirmed**), key handling for nOAuth and a calendar for secret rotation.
2. **Own authorization server or WorkOS?** Recommend **`oidc-provider` in the app.** Data stays on the EC2 box, there is no new US sub-processor and no cost. Keep WorkOS Standalone Connect as the fallback if CIMD does not work with real clients in testing. It is free up to 1M users and 3–5 days of work.
3. **Scope shape?** Recommend **two scopes for consent and tokens** (read, write), named for what they cover rather than `recipes:*`, for example `data:read` and `data:write` _(inferred)_. Write the per-area list as constants so it can be split later without breaking tokens.
4. **Token expiry default?** Recommend **30 days, with expiry required** (choices 7/30/90/365, no "never") and a reminder email 7 days before. OAuth access tokens last 1 hour, with rotating refresh tokens of 30–90 days; recommend 60.
5. **What does a password change do?** Recommend: a password **reset** revokes every token and grant; an ordinary change keeps them but lists them with "Revoke all" on the confirmation page. Add a "Sign out everywhere" that revokes everything.
6. **Tokens before or after the authorization server?** Recommend **before**: cheaper, and they reach Claude Code, Cursor, VS Code and Gemini CLI at once.
7. **In-app assistant on the person's own key?** Recommend **not now.** Revisit only if potters who do not already use an assistant ask for one. If built, browser-direct only, never a server relay, never stored keys, and never "sign in with your Claude/ChatGPT plan".
8. **Verify email at sign-up?** Recommend **yes, before or with provider sign-in.** It closes the pre-hijacking setup for Google and GitHub and an EU audit gap. Microsoft still links by subject only.
9. **Allow trials to connect assistants or make tokens?** Recommend **no.** Both notes agree.
10. **Write access over MCP at all in the first OAuth release?** Recommend **yes, but only after Phase 0**, with no delete except `move_to_trash` later.
