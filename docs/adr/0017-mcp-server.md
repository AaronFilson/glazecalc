# 17. AI assistants reach Glazecalc through a stateless MCP endpoint, with personal tokens for their own records

Accepted, 2026-10-16; the guides, resources, prompts, conformance check and registry listing added 2026-10-17. Phases 2 and 3 of [the integrations plan](../integrations-plan.md): the public
tools, and read-only personal access tokens. The plan's decisions 3, 4, 5, 6 and 9 are the owner's,
all as recommended. Amended 2026-10-19: personal tokens can also change records, and the MCP
endpoint has write tools (see [Amended: tokens that write](#amended-tokens-that-write)); and apps
connected with OAuth reach it too (see [Amended: OAuth](#amended-oauth)).

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
  `suggest_substitutes` and `match_from_materials` (which say how near they come, oxide by oxide:
  [ADR 12](0012-choosing-materials.md#amended-how-near-a-match-comes)), and (`server/mcp/tools/blends.ts`)
  `blend_recipes`: the test tiles of a line or triaxial blend between two or three recipes, each
  with its recipe, key unity formula figures, expansion, limit cautions and, with a firing, its
  cone fit, or a comparison of two recipes. A calculation, not a test result. Each runs the app's own code on the standard
  library (`data/`), takes at most 40 recipe lines, answers with structured data and the same as
  JSON text, and words its cautions in the language asked for, from the app's recipe messages
  (`server/mcp/words.ts`); a language not offered gets English. All are marked read-only. The
  server's instructions tell the assistant that the limit checks are not proof of food safety.
  Nothing a caller sends is stored by the app. nginx's access log, kept 14 days as for every page,
  records each request's IP address, time, request line (`POST /mcp`, never the body), status and
  user agent ([processing record](../processing-record.md), "Web server logs"); the privacy page and
  the assistants page say so.
- **The guides, as a tool and as resources** (`server/mcp/guides.ts`, `server/mcp/tools/guides.ts`):
  `search_guides` searches the guides' sections in the language asked for (an app language, else
  English), and the English guides where that language finds nothing, saying so; each hit has the
  guide and section titles, the anchor, an excerpt of about 240 characters, the address on the site
  in the caller's language and the section's resource URI. Words are matched without case, accents
  or common endings ("crawling" finds "crawl"); a section with every word ranks first, its heading
  counts most, and a list of sources comes last. Resources: `glazecalc://guides/{language}/{guide}`
  and `.../{guide}/{section}` (Markdown, with the address it comes from), `glazecalc://materials/{name}`
  (what `get_material` returns) and `glazecalc://cones` (the Orton and SK charts); only the five
  English guides and the cone charts are listed, the rest are templates with completions. The guides
  are read from the same Markdown the site shows, with the site's marks settled once for everyone:
  temperatures in both scales as the source gives them, the parts for Orton cones (search can ask for
  SK or temperature), and in place of what the site draws for the reader's country, a line pointing
  to the page. All are cacheable for an hour on the 2026-07-28 revision.
- **Four prompts** (`server/mcp/prompts.ts`): `diagnose_glaze_fault` (with the fault completed from
  crawling, crazing, pinholing and the like, and the guides' "Glaze fit and defects" section attached
  as an embedded resource in the caller's language), `make_lead_free`, `replace_discontinued` and
  `explain_recipe`. Each is a request in English that names the tools to use in order, repeats that
  the limit checks are not proof of food safety, and asks for the answer in the language given.
  A fifth, `glaze_course_lesson` (2026-10), sets up a unit of the companion to John Britt's free
  glaze course: his videos linked by title with credit and a request never to retell them, the
  unit's guide sections attached (the safe mixing habits first for lab units), and its exercises,
  all read from the English-only guide by `server/mcp/course.ts`.
- **Checked from outside in CI** (`npm run test:mcp`, `scripts/mcp-conformance.mjs`): the official
  conformance suite, `@modelcontextprotocol/conformance` 0.2.0-alpha.12, runs exactly what the
  2026-07-28 and 2025-11-25 revisions require against a server of its own, and the MCP Inspector
  2.9.0's command line lists the tools (with its schema portability check), calls two, lists and
  reads resources and gets a prompt. Both are installed apart from the app, at exact versions over
  two weeks old with a committed lockfile (`scripts/mcp-conformance/package.json` and
  `package-lock.json`), by `npm ci --ignore-scripts` in that folder, so they are not the app's
  dependencies and nothing newer can slip in; the CI job that runs them has no secrets in its
  environment and its checkout keeps no GitHub token. The run takes about a minute and a half. The
  scenarios that need the suite's own test tools (`test_simple_text`, `test://static-text` and so on) or optional features
  Glazecalc does not offer (logging, subscriptions, asking the client for input, the tasks
  extension) are listed with their reasons in `scripts/mcp-conformance/<revision>.yml`; the suite
  fails on anything else, and on a listed one that starts passing.
- **Listed in the MCP Registry as `com.glazecalcapp/glazecalc`** (`server.json`), proved by a DNS TXT
  record on the domain. The owner publishes it by hand (`deploy/README.md`, "Listing in the MCP
  Registry"); nothing in CI publishes.
- **Tokens need a confirmed email.** The notices about tokens go to the account's address, so an
  account whose address is not yet confirmed is refused a new token (403
  `token-needs-confirmed-email`, before the password is checked) and the account page asks it to
  confirm first, with the link sent again on request.
- **Personal access tokens** (`server/routes/token_routes.ts`, the account page's "Access
  tokens"): made, once the account's email is confirmed, with the password and, with two-step sign-in on, a second step, as other changes
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
  `get_recipe` checks a recipe as its page does: against the limit set chosen in Settings, for the
  firing asked about or else the firing band saved with the recipe, and returns that band and the
  target specific gravity; `get_my_settings` includes the limit set and the currency, never the
  prices.
  Without a token the list has only the public tools. A request with an Authorization header that
  is not a working personal token (unknown, expired, revoked, a trial's, an OAuth one, the web
  session's sign-in token, or not Bearer) gets 401 before the SDK, with RFC 6750's
  `WWW-Authenticate` and RFC 9728's `resource_metadata`, and the Protected Resource Metadata is at
  `/.well-known/oauth-protected-resource/mcp` (no authorization server yet).
- **Limits** (`server/lib/rate_limit.ts`, in memory as the others): without a token, 60 requests a
  minute and 2,000 a day per address; with one, 300 and 20,000 per account (raised from 120 and
  5,000 on 2026-10-18, for assistants that work with subagents; a token can be revoked, an address
  cannot). The tools that fit amounts (`suggest_substitutes`, `match_from_materials`,
  `match_with_what_i_have`) are also limited to 10 a minute per caller. A JSON-RPC batch is refused (400, `-32600`) before the SDK, so
  each request is one message: 2025-06-18 removed batches, and neither 2025-11-25 nor 2026-07-28
  has them (a 2025-03-26 client that batches is refused too). One address may keep at most 3
  subscription streams (`subscriptions/listen`) open, of the SDK's 1,024, and a stream ends when
  its client goes. The guides' cache holds only real guides in app languages and cone systems, at
  most 64. A tool that fails in a way nobody foresaw logs the error's kind and code and tells the
  assistant only that Glazecalc had a problem.
- **What the assistant is given is data, some of it the person's own words.** The read tools return
  the person's own free text (recipe titles and notes, the notebook, firing logs, material names),
  and the guides return the site's text; any of it could hold words written to steer an assistant
  (a note pasted from elsewhere, say). This is the endpoint's prompt-injection surface. It is
  returned only as tool results, never in the server's instructions; every tool is read-only and
  limited to the token's own account, so the most such words could get the server to do is read
  the same person's records to the same assistant. Treating tool results as data is the
  assistant's part. Phase 4's write tools must revisit this (asking the person before a change).

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
- Assistants can cite the guides by address, in the person's language where it is translated.
- The conformance suite is still in alpha: a new version can add required scenarios, so it is
  pinned and moved by hand, like the SDK.
- The registry listing must be republished, with a higher `version`, whenever `server.json` changes.
- Not built: the plan's `/.well-known/mcp-registry-auth` route, which the DNS proof makes
  unneeded. The prompts' requests and the resources' line about the parts drawn by country are in
  English, as the tools' descriptions are.

## Amended: tokens that write

2026-10-19, the owner's request ("token CRUD in this round, cap an account at 100,000 records of
all kinds"), with the plan's item 37 and decision 10 (no delete but the Trash), ahead of the
authorization server: personal tokens only, no OAuth client.

- **A token reads, or reads and changes.** The account page offers "Read only" (`data:read`, the
  default) and "Read and change" (`data:write`, `server/routes/token_routes.ts` `OFFERED_SCOPES`),
  confirmed as before with the password and a factor. A writing token lasts at most 90 days
  (`WRITE_PAT_MOST_DAYS`, `server/models/access_token.ts`); read tokens keep 7 to 365. The notice
  email (`TOKEN_MADE_WRITE`) and the token list say which a token is.
- **The record routes** already asked each route for its permission (`requireScope`); with
  `data:write` a script creates, changes, undoes and moves to the Trash every kind of record, and
  puts records back from it, as the website does. Every change keeps a version and an activity
  line; a removal is refused when the Trash is full rather than pushing anything out of it.
- **Nine MCP write tools** (`server/mcp/tools/account_write.ts`): `create_recipe` (the server
  works out the unity formula and saves it as the recipe page does), `update_recipe`,
  `add_notebook_entry`, `add_my_material`, `update_my_material`, `add_to_shelf`,
  `remove_from_shelf`, `undo_shelf_change` (puts back the shelf as it was before its last change,
  one step) and `move_to_trash` (to the Trash only). They are listed for every token, so
  an assistant holding a read-only one can say why nothing changed; each checks the token's scopes
  itself and refuses in words otherwise. They do what the record routes do for a change, and the
  server's instructions no longer say the tools never change anything.
- **Limits** (`server/lib/rate_limit.ts`): changes made with tokens, 60 a minute and 5,000 a day per
  account (`TOKEN_WRITE_LIMITS`), counted once for the record routes and the MCP tools, on top of
  the request limits (which reads keep to themselves: 120 and 5,000, or 300 and 20,000 on MCP);
  removals, 100 an hour per token (`TOKEN_DELETES_PER_HOUR`), shared the same way.
- **What an account keeps:** at most 100,000 records of every kind together
  (`ACCOUNT_RECORDS_MOST`, `server/lib/guest_limits.ts`; `ACCOUNT_MAX_RECORDS` sets another), in
  place of 2,000 of each kind. They are counted kind by kind on the `{ ownedBy, _id }` index,
  each kind asked only for as many as are still needed to reach the cap, so a full account costs
  at most 100,000 index keys and a usual one a few hundred. A running total was not chosen: records
  also arrive from a trial and the Trash, and a counter could drift from what is there. At most
  20,000 earlier versions per account (`VERSIONS_MOST_ACCOUNT`), the oldest first, but never a
  record's version from before the newest run of token changes, so Undo still reaches what the
  person had before a token started.
- **Prompt injection, revisited.** With write tools, words planted in a note or a recipe could
  steer an assistant into changing or removing records. What bounds it: the person chooses a
  writing token on purpose, for at most 90 days; nothing is deleted for good (the Trash keeps a
  removal 30 days, a version keeps each change); the limits above stop a runaway; the tools are
  marked as changing things (`readOnlyHint: false`, `destructiveHint` on the ones that replace or
  remove), which clients use to ask the person first; and the instructions ask the assistant to
  change only what the person asked for. Asking the person through MCP elicitation before a
  removal (plan item 43) is not built yet.
- **Revocation** is checked on every request, so a revoked or expired token stops writing at once.
- **OAuth clients** cannot write yet: nothing issues OAuth tokens, and the MCP endpoint takes only
  personal ones. The record routes judge any token by its scopes alone (decision 3), so when the
  authorization server comes, its consent screen decides whether a client may hold `data:write`.

## Amended: OAuth

2026-10-19, [ADR 24](0024-authorization-server.md): Glazecalc's own authorization server gives
apps connected with OAuth tokens for this endpoint alone. What changes here:

- The Protected Resource Metadata names the authorization server (`authorization_servers`: the
  site) and lists only `data:read` in `scopes_supported`.
- `server/mcp/auth.ts` takes an OAuth access token whose audience is this endpoint and whose
  connection (its row in `access_tokens`) still works, checked on every request as personal tokens
  are; `req.mcpCaller.via` is `oauth` and its `tokenId` the connection's row, so the limits and the
  activity log are the connection's. Every route under `/api` still refuses such a token.
- An app that may only read, calling a tool that changes records, gets HTTP 403
  `insufficient_scope` with `scope="data:read data:write"` before the SDK sees the call, and is
  asked to come back through the consent page (step-up). Personal tokens keep the refusal in words.
- Changes are recorded with the real `via` (`pat` or `oauth`) in the activity log, the versions and
  the Trash; every tool carries `_meta.securitySchemes` for ChatGPT.
- "OAuth clients cannot write yet" and "the chat apps get only the public tools until Phase 4",
  above, no longer hold once the consent page ships.

## Amended: confirm before changes

2026-10-19, [ADR 25](0025-confirm-before-changes.md), to the prompt-injection sections above
("What the assistant is given is data" and "Prompt injection, revisited"): asking the person before
a change is built. An account can choose that changes from assistants and access tokens wait for
its approval: removals only, or every change (off by default). A waiting change is made only when
the person approves it on the website, signed in, or (for a removal, by the owner's choice) answers
yes in the client's own form; no token can approve one, the state handed to the client is signed
and bound to the one change, and a change runs once, after everything is checked again. Words
planted in a note can still lead an assistant to ask for a change, but no longer to make one
unseen, when the setting is on. A form's yes is weaker than the website's (ADR 25, Consequences).
