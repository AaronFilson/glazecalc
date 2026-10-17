# 17. AI assistants reach Glazecalc through a stateless MCP endpoint, with personal tokens for their own records

Accepted, 2026-10-16. Phases 2 and 3 of [the integrations plan](../integrations-plan.md): the public
tools, and read-only personal access tokens. The plan's decisions 3, 4, 5, 6 and 9 are the owner's,
all as recommended.

## Context

Potters ask assistants such as Claude, Copilot, Cursor and Gemini about glazes, and the assistants
guess at the chemistry. Glazecalc already works it out, in `lib/chemistry` and, since
[ADR 19](0019-shared-recipe-tools.md), `lib/recipe`, both of which the server can run. The Model
Context Protocol (MCP) is how these assistants call tools on a remote server; its 2026-07-28
revision is stateless, and clients from 2025 still use the older Streamable HTTP exchange. Some of
the tools are useful with no account; the rest need a person's own records, which needs a way for
an assistant to act for one person that is not their web session.

## Decision

- **`POST /mcp` on the official TypeScript SDK, `@modelcontextprotocol/server` 2.2.0** (MIT,
  pinned; the 2.3 line was under two weeks old). `createMcpHandler` gives a fresh server for each
  request from one factory (`server/mcp/server.ts`) and serves both the 2026-07-28 revision and,
  statelessly, 2025-era clients. There are no sessions: GET, DELETE and every other method are 405.
  The SDK's only dependency, `zod` 4.6.5, was in the tree already (it is also Angular CLI's) and is
  now a direct dependency because the tools' schemas use it. No Node or Express adapter: the
  endpoint turns the Express request into a web `Request` itself (`server/mcp/index.ts`).
- **Mounted on the app, not under `/api`.** `/api` is the web session's (same-origin checks, the
  session cookie); `/mcp` has its own checks, in order: the Host must be the site's (or loopback, for
  development and tests) and any Origin the site's own, against DNS rebinding; the per-address
  limit on access tokens that do not work; who is calling; the request limits; a JSON body of at
  most 256 kB. There is no CORS, so a page on another site can neither call it with someone's
  cookies nor read an answer. The request's cookies and Authorization header never reach the SDK,
  and no answer sets a cookie. nginx sends `/mcp` to the app as before, with buffering off for the
  short event streams 2025-era clients may get; the Content-Security-Policy is unchanged.
- **Public tools need no account** (`server/mcp/tools/public.ts`): `search_materials`,
  `get_material`, `analyze_recipe`, `check_limits`, `convert_cone_temperature`,
  `suggest_substitutes` and `match_from_materials`. Each runs the app's own code on the standard
  library (`data/`), takes at most 40 recipe lines, answers with structured data and the same as
  JSON text, and words its cautions in the language asked for, from the app's recipe messages
  (`server/mcp/words.ts`); a language not offered gets English. All are marked read-only. The
  server's instructions tell the assistant that the limit checks are not proof of food safety.
  Nothing a caller sends is stored.
- **Personal access tokens** (`server/routes/token_routes.ts`, the account page's "Access
  tokens"): made with the password and, with two-step sign-in on, a second step, as other changes
  to how the account is reached are ([ADR 14](0014-two-step-sign-in.md), decision 6); shown once;
  stored as a SHA-256 hash and a four-character hint (wave 1's `access_token.ts`). Every token
  expires: 7, 30, 90 or 365 days, 30 by default, never "never". At most 10 work at once; trials
  make none. This release offers only `data:read`; `data:write` waits for Phase 4's write tools.
  Revoking needs only the session. An email goes when a token is made and, from a daily job in the
  server (`server/lib/token_reminders.ts`), once 7 days before one expires: each token is claimed
  with one atomic update before its email goes, so it is sent once however often the job runs. A
  password reset and "Sign out everywhere" revoke every token; an ordinary password change keeps
  them, and the account page then lists them with "Revoke all".
- **A token adds the read tools** (`server/mcp/tools/account.ts`): `list_recipes`, `get_recipe`,
  `list_my_materials`, `get_shelf`, `match_with_what_i_have`, `list_firings`, `get_firing`,
  `list_notes` and `get_my_settings`, each only if the token's scopes allow its area
  (`server/lib/scopes.ts`), each limited to the token's account, and none changing anything.
  Without a token the list has only the public tools. A request with an Authorization header that
  is not a working personal token (unknown, expired, revoked, a trial's, an OAuth one, the web
  session's sign-in token, or not Bearer) gets 401 before the SDK, with RFC 6750's
  `WWW-Authenticate` and RFC 9728's `resource_metadata`, and the Protected Resource Metadata is at
  `/.well-known/oauth-protected-resource/mcp` (no authorization server yet).
- **Limits** (`server/lib/rate_limit.ts`, in memory as the others): without a token, 60 requests a
  minute and 2,000 a day per address; with one, 120 and 5,000 per account. The tools that fit
  amounts (`suggest_substitutes`, `match_from_materials`, `match_with_what_i_have`) are also
  limited to 10 a minute per caller.

## Alternatives

- **The v1 SDK (`@modelcontextprotocol/sdk`):** older and widely used, but v2 is the stable line
  for the 2026-07-28 revision and serves 2025 clients from the same factory.
- **A session per client:** what 2025's Streamable HTTP allowed; it would need sticky state on
  one instance for no gain, since every tool answers from its arguments and the database.
- **Tools under `/api` behind `requireScope`:** reuses the record routes, but mixes the web
  session's cookie and CSRF rules with a protocol whose callers are not browsers.
- **OAuth first:** reaches the chat apps that cannot send a header, but is three times the work
  (Phase 4). Personal tokens reach Claude Code, VS Code, Cursor and Gemini CLI today (decision 6).

## Consequences

- An assistant can work out and check a recipe exactly as the app does, and read a person's own
  records with a token they made and can revoke.
- The chat apps (Claude, ChatGPT) get only the public tools until Phase 4's authorization server.
- The SDK is pinned and its updates are taken by hand; its stateless serving means a change in
  the protocol is a version bump, not a migration of stored state.
- The emails about tokens, the account page's strings and the "Use Glazecalc from your AI
  assistant" page are in English until the next translation wave; that page joins the sitemap
  with its translations.
- Still to do from the plan: `search_guides`, resources and prompts (items 20 and 21), the
  conformance suite and an Inspector smoke test in CI (item 24), `server.json` and the registry
  name (item 25).
