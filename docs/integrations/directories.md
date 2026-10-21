# Listing Glazecalc in the Claude and ChatGPT directories

Prepared 2026-10-20 (round 7, stream 2) for the owner, who submits both by hand. Nothing here has been
submitted, and no account has been made. Builds on [ADR 17](../adr/0017-mcp-server.md) (the MCP endpoint),
[ADR 24](../adr/0024-authorization-server.md) (OAuth) and [ADR 25](../adr/0025-confirm-before-changes.md)
(confirm before changes).

Contents: [what each directory asks](#what-each-directory-asks), [where we stand](#where-we-stand),
[the listings](#the-listings), [reviewers' accounts](#reviewers-accounts),
[the real-client test on staging](#the-real-client-test-on-staging) and
[the owner's steps](#the-owners-steps).

## Sources

Every requirement below comes from one of these vendor pages, all read on 2026-10-20.

| Key     | Page                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------ |
| A-sub   | Anthropic, "Submit a connector to the directory": https://claude.com/docs/connectors/building/submission                 |
| A-rev   | Anthropic, "Connector pre-submission checklist": https://claude.com/docs/connectors/building/review-criteria             |
| A-auth  | Anthropic, "Authentication for connectors": https://claude.com/docs/connectors/building/authentication                   |
| A-lazy  | Anthropic, "Lazy authentication for MCP servers": https://claude.com/docs/connectors/building/lazy-authentication        |
| A-test  | Anthropic, "Test your connector": https://claude.com/docs/connectors/building/testing                                    |
| A-pol   | Anthropic Software Directory Policy: https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy |
| O-guide | OpenAI, submission guidelines: https://developers.openai.com/apps-sdk/app-submission-guidelines                          |
| O-sub   | OpenAI, submission process: https://developers.openai.com/apps-sdk/deploy/submission                                     |
| O-auth  | OpenAI, authentication: https://developers.openai.com/apps-sdk/build/auth                                                |
| O-conn  | OpenAI, connecting a server to ChatGPT: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt                    |
| O-cimd  | ChatGPT's own Client ID Metadata Document: https://chatgpt.com/oauth/client.json                                         |
| A-cimd  | Claude Code's Client ID Metadata Document: https://claude.ai/oauth/claude-code-client-metadata                           |

OpenAI now calls a directory entry a "plugin" (an MCP server, skills or both, uploaded as a ZIP package with a
manifest); the older pages called it an "app". The submission rules below are the plugin ones. Anthropic
calls it a "connector".

## What each directory asks

| Topic                         | Claude connectors directory                                                                                                                                                                                                                                      | ChatGPT directory                                                                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where                         | Developer portal, claude.ai/directory/manage, "Submit new" → "MCP connector" (A-sub)                                                                                                                                                                             | OpenAI Platform dashboard, Plugins, "With MCP" (O-sub)                                                                                                                                                                                                     |
| Who may submit                | Any paid Claude plan (A-sub)                                                                                                                                                                                                                                     | The organization's owner, or a member with "Apps Management Write"; the individual or business must be verified in the Platform dashboard (O-sub, O-guide)                                                                                                 |
| Server                        | Remote, `https://`, Streamable HTTP (SSE tolerated for now) (A-sub, A-pol 5F)                                                                                                                                                                                    | One public HTTPS MCP server per plugin (O-sub)                                                                                                                                                                                                             |
| Domain proof                  | None beyond owning the domain (A-pol 3F)                                                                                                                                                                                                                         | The challenge token as plain text at `https://<host>/.well-known/openai-apps-challenge` (O-sub)                                                                                                                                                            |
| Authentication                | OAuth 2.0 for anything per user; DCR and CIMD supported by default; no auth for public data; mixed ("lazy") supported (A-auth, A-lazy)                                                                                                                           | No auth, OAuth, or mixed; registration by `provided`, `dcr` or `cimd`; API keys and custom headers not accepted (O-sub)                                                                                                                                    |
| Starting sign-in              | Only an HTTP `401` with `WWW-Authenticate: Bearer resource_metadata=...`; a `WWW-Authenticate` on a `200`, or a tool error, starts nothing (A-auth, A-lazy)                                                                                                      | Per-tool `securitySchemes` plus the resource metadata, and at run time either a `401` or a tool error with `_meta["mcp/www_authenticate"]` holding `error`, `error_description` and `resource_metadata` (O-auth)                                           |
| Authorization server metadata | Uses CIMD only if both `client_id_metadata_document_supported: true` and `none` in `token_endpoint_auth_methods_supported`, else DCR; S256 PKCE, advertised in `code_challenge_methods_supported`; only the first `authorization_servers` entry is used (A-auth) | `code_challenge_methods_supported` must include `S256`; `issuer` exactly as in `authorization_servers`; `authorization_response_iss_parameter_supported: true` only if every answer carries `iss` (O-auth)                                                 |
| Redirects to accept           | `https://claude.ai/api/mcp/auth_callback`; Claude Code: `http://localhost/callback` and `http://127.0.0.1/callback` on any port (A-auth, A-cimd)                                                                                                                 | `https://chatgpt.com/connector_platform_oauth_redirect` when the server supports RFC 9207 `iss`, else `https://chatgpt.com/connector/oauth/{callback_id}` (O-auth, O-cimd)                                                                                 |
| Scopes                        | From the 401's `scope`, else the resource metadata's `scopes_supported`; `offline_access` added if listed (A-auth)                                                                                                                                               | From `scopes_supported`; `openid`, `email`, `profile` asked for by default if advertised (O-auth)                                                                                                                                                          |
| Step-up                       | `403` with `Bearer error="insufficient_scope", scope="..."` re-authorizes and retries; list every scope still needed (A-lazy)                                                                                                                                    | `insufficient_scope` in a challenge prompts re-authorization (O-auth)                                                                                                                                                                                      |
| Tokens                        | Refresh on 401 and up to 5 minutes before expiry; `invalid_grant` for a dead refresh token; rotate refresh tokens for public clients; token endpoint takes form-urlencoded (A-auth)                                                                              | Validate audience, expiry, scopes on every call; ChatGPT sends `resource` on both requests (O-auth)                                                                                                                                                        |
| Time limits                   | 10 s for discovery, registration and token endpoints, 30 s for refresh (A-auth)                                                                                                                                                                                  | Not stated                                                                                                                                                                                                                                                 |
| Where calls come from         | `160.79.104.0/21` (A-auth)                                                                                                                                                                                                                                       | Not stated on the pages read; ChatGPT may present an mTLS client certificate (O-auth)                                                                                                                                                                      |
| Tool annotations              | Every tool needs a `title` and the applicable `readOnlyHint` or `destructiveHint`; the portal flags tools without them (A-sub, A-rev, A-pol 5E)                                                                                                                  | All three of `readOnlyHint`, `destructiveHint`, `openWorldHint`, as explicit booleans, on every tool; `destructiveHint: false` only for purely additive writes ("reversible alone doesn't justify false") (O-guide)                                        |
| Tool names                    | At most 64 characters (A-rev, A-pol 5C)                                                                                                                                                                                                                          | Unique, plain verbs, no "best"/"official", no jargon (O-guide)                                                                                                                                                                                             |
| Tool design                   | Read and write in separate tools; narrow, accurate descriptions; no prompt-injection patterns (telling Claude to call other tools, hidden instructions, promotion) (A-rev, A-pol 2A–2G)                                                                          | Each tool stands alone; nonempty description of purpose, behaviour, limits and side effects; no full chat history, no precise location, minimal responses without request ids or timestamps (O-guide)                                                      |
| Errors and size               | Useful error words, never a bare "Internal Server Error"; responses sized to the task; "frugal with tokens", no number given (A-rev, A-pol 5A, 5B)                                                                                                               | Clear errors or fallbacks; return only what the request needs (O-guide)                                                                                                                                                                                    |
| Not accepted                  | Moving money; AI image, video or audio generation; advertising (A-rev, A-pol 4)                                                                                                                                                                                  | Digital goods sales, ads, adult content, the prohibited goods list; must suit ages 13–17, not target under-13s (O-guide)                                                                                                                                   |
| Privacy                       | A privacy policy link covering collection, use and retention (A-pol 3A; the portal asks for its URL, A-sub); no conversation data beyond the tool's need, no reading Claude's memory or files (A-rev)                                                            | A published policy with data categories, purposes, recipients, retention and user controls; no payment card data, health data, government ids or passwords/API keys/MFA codes (O-guide)                                                                    |
| Other URLs                    | Documentation URL, support contact (A-sub); documentation must say how to troubleshoot (A-pol 3C)                                                                                                                                                                | `websiteURL`, `supportURL`, `privacyPolicyURL`, `termsOfServiceURL`, all HTTPS, all required (O-sub)                                                                                                                                                       |
| Listing text                  | Name ≤ 100 characters, one-liner ≤ 200, description ≤ 2,000, 1–5 categories, permanent URL slug (A-sub)                                                                                                                                                          | `displayName` ≤ 30, `shortDescription` ≤ 30, `longDescription` ≤ 4,000, `developerName` ≤ 80, one category, up to 20 capabilities of ≤ 120, up to 3 starter prompts of ≤ 128; no "MCP" or "Plugin" in the name; no pricing or comparisons (O-sub, O-guide) |
| Images                        | An icon (no size given on the pages read); 3–5 PNG screenshots ≥ 1000 px wide only for MCP Apps with a UI (A-sub)                                                                                                                                                | `logo` and `composerIcon`: square, ≥ 48×48, PNG/JPEG/WebP/SVG, ≤ 5 MiB, ≤ 4096 px; brand colours with ≥ 2:1 contrast on white and on #212121; screenshots no longer shown (O-sub, O-guide)                                                                 |
| Examples                      | At least three working example prompts (A-pol 3E)                                                                                                                                                                                                                | Five positive test cases (prompt, tools expected, behaviour) and three negative ones (O-sub)                                                                                                                                                               |
| Reviewers' account            | Credentials for a fully populated account, with step-by-step instructions (A-sub, A-test)                                                                                                                                                                        | A dedicated account with sample data; no MFA, email or SMS codes, magic links or private network; given in Review details, never in the ZIP (O-sub, O-guide)                                                                                               |
| Video                         | Not asked                                                                                                                                                                                                                                                        | A walkthrough recording of the test cases, at a URL reviewers can open (O-sub)                                                                                                                                                                             |
| Widget / `_meta`              | Not needed; MCP Apps (UI) are optional                                                                                                                                                                                                                           | Not needed; per-tool `_meta.securitySchemes` is how ChatGPT reads mixed auth (O-auth). UI iframes only if a UI is offered (O-guide)                                                                                                                        |
| Policy acknowledgements       | Seven, in the portal; the Software Directory Terms and Policy (A-sub)                                                                                                                                                                                            | Policy attestations at submission; commerce declaration (O-sub)                                                                                                                                                                                            |
| Regions                       | The Anthropic usage policy's supported countries (A-pol 1A)                                                                                                                                                                                                      | `publication.countries`, an allowlist; an empty list means everywhere (O-sub)                                                                                                                                                                              |
| Review                        | Automatic scan, then listed as a Community connector by default; some get a person's review, time varies with the queue; escalations to the review team's address on A-sub (A-sub, A-rev)                                                                        | Automated checks and policy review; one review at a time; feedback by email; approval does not publish, "Publish plugin" does; the server is rescanned daily and changed tools are held until checked (O-sub). No review time given.                       |

## Where we stand

### Met

| Requirement                      | Ours                                                                                                                                                                                                                                                                                                                              | Where                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Remote HTTPS, Streamable HTTP    | `POST https://glazecalcapp.com/mcp`, stateless, 2025 and 2026-07-28 revisions                                                                                                                                                                                                                                                     | `server/mcp/index.ts`                                                    |
| OAuth 2.1, PKCE S256, advertised | `code_challenge_methods_supported: ['S256']`, PKCE required                                                                                                                                                                                                                                                                       | `server/oauth/provider.ts` `authorizationServerMetadata`, `pkce`         |
| CIMD for Claude                  | `client_id_metadata_document_supported: true` and `token_endpoint_auth_methods_supported: ['none']`, so Claude picks CIMD                                                                                                                                                                                                         | same                                                                     |
| DCR as fallback                  | `registration_endpoint`, limited                                                                                                                                                                                                                                                                                                  | `server/oauth/provider.ts`, `server/lib/rate_limit.ts`                   |
| Resource metadata                | At `/.well-known/oauth-protected-resource` and `/.../mcp`; `resource` is exactly `https://glazecalcapp.com/mcp`; one authorization server, the site                                                                                                                                                                               | `server/mcp/auth.ts` `resourceMetadata`, `server/mcp/index.ts`           |
| 401 with `resource_metadata`     | For a bad token, and now for a call with no token to the person's own tools                                                                                                                                                                                                                                                       | `server/mcp/auth.ts` `mcpAuth`, `signIn`                                 |
| RFC 9207 `iss`                   | `authorization_response_iss_parameter_supported: true`, so ChatGPT uses its stable redirect                                                                                                                                                                                                                                       | `server/oauth/provider.ts`                                               |
| Claude's redirects               | `https://claude.ai/api/mcp/auth_callback` is an ordinary https redirect; Claude Code's loopback redirects are native, any port (RFC 8252)                                                                                                                                                                                         | `checkClientMetadata`                                                    |
| Refresh tokens                   | Rotate on every use; reuse ends the connection; `invalid_grant` when dead (oidc-provider)                                                                                                                                                                                                                                         | ADR 24                                                                   |
| Step-up                          | `403 insufficient_scope, scope="data:read data:write"` for a read-only app calling a write tool                                                                                                                                                                                                                                   | `server/mcp/auth.ts` `stepUp`                                            |
| ChatGPT mixed auth               | `_meta.securitySchemes` on every tool; `_meta["mcp/www_authenticate"]` on an in-tool scope refusal                                                                                                                                                                                                                                | `server/mcp/server.ts`, `server/mcp/common.ts` `guarded`                 |
| Titles and annotations           | All 27 tools have a `title` and all of `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` (false: each is bounded to the library or the person's own account). Writes that replace or remove are `destructiveHint: true`; additive ones (`create_recipe`, `add_*`) false. Now enforced by a test for every tool | `server/mcp/tools/*.ts`; `server/test/mcp_tests.ts`                      |
| Names ≤ 64, verbs                | Longest is `match_with_what_i_have` (22)                                                                                                                                                                                                                                                                                          | same test                                                                |
| Read and write split             | Nine read tools, nine write tools, no generic executor                                                                                                                                                                                                                                                                            | `server/mcp/tools/account.ts`, `account_write.ts`                        |
| Errors in words                  | Refusals say what is wrong; unforeseen errors say Glazecalc had a problem, never the error                                                                                                                                                                                                                                        | `server/mcp/common.ts` `guarded`, `UNEXPECTED`                           |
| Response size                    | At most 40 recipe lines in; lists page at 25 (at most 100); JSON with the same in text                                                                                                                                                                                                                                            | `server/mcp/common.ts`, `tools/account.ts`                               |
| No chat data, no location        | Tools take recipe lines, names, ids, a language; nothing is stored from public calls                                                                                                                                                                                                                                              | ADR 17                                                                   |
| Not a banned category            | Glaze chemistry; no money, no media generation, no ads, no sales                                                                                                                                                                                                                                                                  | —                                                                        |
| Privacy policy                   | https://glazecalcapp.com/privacy, with "Connecting an AI app": what is kept, how long, revoking                                                                                                                                                                                                                                   | `client/public/i18n/site/en.json` `privacy.apps*`                        |
| Terms                            | https://glazecalcapp.com/terms, including connected apps (`useApps`)                                                                                                                                                                                                                                                              | `client/app/app.routes.ts`, `site/en.json`                               |
| Documentation                    | https://glazecalcapp.com/assistants (what it does, connecting, tokens, limits, stopping access)                                                                                                                                                                                                                                   | `site/en.json` `assistants.*`                                            |
| Support and security contacts    | hello@glazecalcapp.com and abuse@glazecalcapp.com on the terms page's Contact section; security@ in `security.txt` and `SECURITY.md`. No page of its own: the terms page is the support URL                                                                                                                                       | `site/en.json` `terms.contact`, `client/public/.well-known/security.txt` |
| Icon                             | `client/public/icon-512.png` (512×512 PNG) and `favicon.svg`                                                                                                                                                                                                                                                                      | —                                                                        |
| Brand colour                     | `#9c3d1f` (the manifest's theme colour): about 6.8:1 on white, 2.4:1 on #212121, both over 2:1                                                                                                                                                                                                                                    | `client/public/manifest.webmanifest`                                     |
| Prompt-injection rules           | Descriptions say what each tool does; the server's instructions name only Glazecalc's own tools; confirm-before-changes for writes                                                                                                                                                                                                | `server/mcp/server.ts`, ADR 25                                           |

### Fixed on this branch

- **Sign-in when a tool needs it (lazy authentication).** Claude starts sign-in only on a 401 (A-auth, A-lazy).
  Without a token, Glazecalc listed only the nine public tools and answered every call with 200, so a Claude
  custom connector, and the directory listing, would never have offered to connect an account. Now every
  tool is listed without a token (the same definitions, registered by the same code), and a call to one of
  the person's own tools with no token is answered `401` with `error="invalid_token"`, an
  `error_description`, the `resource_metadata` and `scope="data:read"` (`"data:read data:write"` for a
  write tool) before the SDK sees it. Tests: every tool listed alike with and without a token, each with a
  title and all hints and a name ≤ 64; the 401 and its challenge for all 18 such tools, changing nothing; a
  session cookie still never read. Files: `server/mcp/server.ts`, `server/mcp/auth.ts`, `server/mcp/urls.ts`,
  `server/mcp/index.ts`, `server/mcp/tools/account.ts`, `server/test/mcp_tests.ts`; ADR 24 "Amended:
  sign-in when a tool needs it".

### Not met: for the owner

1. **ChatGPT's CIMD document: built, behind `OAUTH_CIMD_AUTH` (round 8, branch `r8-dir-gaps`; ADR 24
   "Amended: ChatGPT's document, private_key_jwt, shared addresses").** ChatGPT names itself by
   `https://chatgpt.com/oauth/client.json` (O-cimd), whose document says
   `"token_endpoint_auth_method": "private_key_jwt"`, `"token_endpoint_auth_methods_supported": ["none",
"private_key_jwt"]` and carries a `jwks_uri`. With the setting off (the default) it is refused as
   before ("only public clients"). `OAUTH_CIMD_AUTH=public` takes it as a public app (`none`, its keys
   never fetched); `OAUTH_CIMD_AUTH=private_key_jwt` also takes signed token requests, with ChatGPT's keys
   fetched from chatgpt.com under their own limits and kept at most 15 minutes. Owner: try `public`, then
   `private_key_jwt`, on staging (below), and choose before submitting to OpenAI, so no listed user has to
   reconnect when the method changes.
2. **Limits for shared addresses: done, not behind a setting.** Claude's calls all come from
   `160.79.104.0/21` (A-auth) and ChatGPT's from OpenAI's own ranges. Owner's decision: no special
   treatment for those ranges; key limits on what a request proved. The token endpoint now counts per
   address only refusals (300 in 15 minutes), per account its refreshes (100), and everyone's refusals
   together (20,000); past a count on refusals, a code or refresh token the server holds still goes
   through, so no flood of junk from other addresses can stop a working connection (security review,
   ADR 24 "Review fixes"). An IPv6 address counts with its whole /48 wherever everyone shares a ceiling.
   A token that does not work is answered `401` with its challenge even past the bad-token
   limit (it was `429`, which stops an app refreshing or signing in again); subscription streams are 3
   per account. Without a token the per-address limits stay (60 a minute, 2,000 a day, 10 fits a
   minute), with ceilings for everyone together (3,000 requests and 200 fits a minute) that never touch
   calls with a token. Watch the logs for 429s once listed: anonymous use through Claude or ChatGPT
   still shares their addresses' limits. With `private_key_jwt`, ChatGPT's keys, once it has a working
   connection, are fetched outside strangers' budget and the last good set is used for up to a day if
   chatgpt.com cannot be reached (log line "An app’s keys could not be fetched again").
3. **The Origin check: kept.** `/mcp` refuses any `Origin` but the site's own (`server/mcp/index.ts`
   `checkHostAndOrigin`); assistants' servers send none. Anthropic lists "overly strict Origin-header
   validation" as a cause of failed connections (A-test), so the staging test notes any Origin seen:
   refusals are logged at debug level with the value (`LOG_LEVEL=debug`). No CORS allow-list (owner).
4. **OpenAI domain proof.** The portal gives a token to serve as plain text at
   `https://glazecalcapp.com/.well-known/openai-apps-challenge` (O-sub). Simplest: commit the token as
   `client/public/.well-known/openai-apps-challenge` (served by the `/.well-known` static folder in
   `server/app.ts`) and deploy, then check that the address returns only the token.
5. **Troubleshooting on the documentation page.** Anthropic asks for documentation that says how users can
   troubleshoot (A-pol 3C); `/assistants` has none. Suggested English for a short section: "If your app
   says it cannot reach Glazecalc, check the address ends in /mcp. If it asks you to sign in again, your
   connection has ended or was revoked: connect it again. If a change does not happen, check Connected apps:
   you may have chosen to approve changes first, or the app may only read. Write to hello@glazecalcapp.com
   with the time and what the app said." User-visible text: the owner's call. A support page of its own
   (or this section's anchor) would also make a better `supportURL` than the terms page.
6. **OpenAI package and review material.** A ZIP with the manifest fields under
   [ChatGPT listing](#chatgpt-directory), five positive and three negative test cases (below), a walkthrough
   video at a URL reviewers can open, and the account and its credentials in Review details.
7. **Optional, not required:** MCP `icons` in the server info and `server.json` (2025-11-25 allows them);
   an MCP Apps UI (a recipe card or blend grid) for a richer listing, which would then need screenshots;
   a short note in the privacy page naming Claude and ChatGPT as separate controllers of what they read
   (the page already says what an app does with records is between the person and its maker).
8. **Watch: `destructiveHint` on additive writes.** Anthropic's wording is "`destructiveHint: true` for
   tools that modify or delete data" (A-rev); OpenAI's is "`false` only for additive writes with no
   destructive or irreversible effects" (O-guide). The four additive tools (`create_recipe`,
   `add_notebook_entry`, `add_my_material`, `add_to_shelf`) are `readOnlyHint: false,
destructiveHint: false`, the five that replace or remove are `true`; this follows the MCP
   specification and OpenAI. Every write tool is `readOnlyHint: false`, so Claude still asks before
   each. If Anthropic's portal flags the four, setting them `true` is one line (`ADDS` in
   `server/mcp/tools/account_write.ts`) and stays within OpenAI's rule only as an over-cautious answer.
9. **After round 6 deploys:** republish the MCP registry entry as 1.2.0 (plan.md), from master. The teaching companion (round 8) makes it 1.3.0: `vary_material`, `compare_recipes`, `stull` in the answers and one more prompt, so republish once, as 1.3.0, if both reach master before the registry is touched.

## The listings

Plain words, no comparisons or prices, no "MCP" in the name (O-guide).

### Claude connectors directory

- **Server name** (≤ 100): Glazecalc
- **One-liner** (≤ 200, 166): Ceramic glaze chemistry for potters: unity formulas, limit checks, substitutes for
  discontinued materials, cones and the guides, and your own saved recipes once you connect.
- **Description** (≤ 2,000, about 1,250):

  > Glazecalc works out ceramic glaze chemistry the way its website does, so Claude can calculate instead of
  > guessing. Without signing in, Claude can look up materials in Glazecalc's library, work out a recipe's
  > unity formula, check it against published limits for its firing, suggest substitutes for discontinued
  > materials such as Gerstley Borate, remake a recipe from the materials you name and say how close it
  > comes oxide by oxide, plan line and triaxial blends for test tiles, convert between Orton or SK cones
  > and temperatures, and search Glazecalc's guides on glaze faults, safety and firing, in your language.
  >
  > Connect your Glazecalc account, and Claude can also read your saved recipes, your own materials, the
  > materials you have on hand, your notebook and your firing logs. It can change them only if you allow
  > that on Glazecalc's consent page: save a recipe, update one, add a notebook entry or a material, change
  > what is on hand, or move a record to the Trash. Nothing is deleted for good, every change keeps the
  > record as it was, and you can ask to approve every change on the website first. Connected apps lists
  > and revokes each connection.
  >
  > The limit checks are cautions from published limits, not proof that a glaze is food safe: test-fire
  > every glaze, and have glazes for food surfaces tested for leaching.

- **Categories** (1–5, from the portal's list): Education; Productivity; Research or Science, if offered.
- **Documentation URL:** https://glazecalcapp.com/assistants
- **Privacy policy URL:** https://glazecalcapp.com/privacy
- **Support contact:** hello@glazecalcapp.com (security reports: `security.txt`).
- **Icon:** `client/public/icon-512.png`.
- **Slug** (permanent): `glazecalc`.
- **Use cases:** glaze chemistry for potters, studios and teachers; needs nothing to use the public tools;
  a free Glazecalc account with a confirmed email to connect; reads and (if allowed) writes.
- **Authentication:** OAuth, client ID metadata documents (DCR also offered); tools open without sign-in,
  sign-in asked for on demand (flag lazy authentication).
- **Data handling:** our own API; no personal health data; no sponsored content.
- **Allowed link URIs:** none needed (no `ui/open-link`).

### ChatGPT directory

Manifest values (O-sub field names):

| Field                                       | Value                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                                      | `glazecalc`                                                                                                                                                                                                                                                                                                                                            |
| `version`                                   | `1.3.0` (as `server.json`)                                                                                                                                                                                                                                                                                                                             |
| `description`                               | the Claude description above                                                                                                                                                                                                                                                                                                                           |
| `interface.displayName` (≤ 30)              | Glazecalc                                                                                                                                                                                                                                                                                                                                              |
| `interface.shortDescription` (≤ 30)         | Glaze chemistry for potters (27)                                                                                                                                                                                                                                                                                                                       |
| `interface.longDescription` (≤ 4,000)       | the Claude description above                                                                                                                                                                                                                                                                                                                           |
| `interface.developerName` (≤ 80)            | Glazecalc                                                                                                                                                                                                                                                                                                                                              |
| `interface.category`                        | Education (or Productivity)                                                                                                                                                                                                                                                                                                                            |
| `interface.capabilities`                    | "Unity formula of a glaze recipe"; "Check a recipe against published limits for its firing"; "Substitutes for discontinued materials"; "Remake a recipe from the materials you have"; "Line and triaxial blends for test tiles"; "Orton and SK cones and temperatures"; "Search the glaze guides"; "Read and, if you allow, change your saved recipes" |
| `interface.websiteURL`                      | https://glazecalcapp.com                                                                                                                                                                                                                                                                                                                               |
| `interface.supportURL`                      | https://glazecalcapp.com/terms (its Contact section), until a support page exists                                                                                                                                                                                                                                                                      |
| `interface.privacyPolicyURL`                | https://glazecalcapp.com/privacy                                                                                                                                                                                                                                                                                                                       |
| `interface.termsOfServiceURL`               | https://glazecalcapp.com/terms                                                                                                                                                                                                                                                                                                                         |
| `interface.defaultPrompt` (≤ 3, ≤ 128 each) | "What is the unity formula of Custer Spar 40, Whiting 20, EPK 20, Silica 20?"; "Gerstley Borate is hard to find. What can replace it in my recipe?"; "My glaze crawled at cone 6. What causes crawling?"                                                                                                                                               |
| `interface.brandColor`, `brandColorDark`    | `#9c3d1f` both                                                                                                                                                                                                                                                                                                                                         |
| `logo`, `composerIcon`                      | `./icon-512.png` (copy of `client/public/icon-512.png`)                                                                                                                                                                                                                                                                                                |
| `review.demo_recording_url`                 | the walkthrough video (owner records it)                                                                                                                                                                                                                                                                                                               |
| `publication.countries`                     | `[]` (everywhere) unless the owner decides otherwise                                                                                                                                                                                                                                                                                                   |
| Authentication (portal)                     | OAuth, mixed with no auth; registration `cimd` (after gap 1 is fixed) or `dcr`                                                                                                                                                                                                                                                                         |

### Example prompts and test cases

For Anthropic's three or more examples (A-pol 3E) use 1–3; for OpenAI's five positive cases use 1–5 (6 is the teaching companion's tool, `vary_material`; swap it for 5 if the reviewers' account is not ready).

| #   | Prompt                                                                                                           | Tools                                            | Expected                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | What is the unity formula of Custer Spar 40, Whiting 20, EPK 20, Silica 20?                                      | `analyze_recipe`                                 | The UMF with SiO2:Al2O3 ratio and expansion, from Glazecalc's numbers                                       |
| 2   | Gerstley Borate is hard to find. Replace it in: Gerstley Borate 30, Custer Spar 30, Silica 25, EPK 15.           | `suggest_substitutes` (maybe `search_materials`) | A substitute recipe with amounts and how near it comes, oxide by oxide                                      |
| 3   | Is this cone 6 liner glaze within published limits? Custer Spar 25, Whiting 20, Frit 3134 10, EPK 20, Silica 25. | `check_limits`                                   | Cautions, if any, with the limit set; says the checks are not proof of food safety and advises a leach test |
| 4   | My glaze crawled. What causes crawling and how do I fix it?                                                      | `search_guides`                                  | Causes and fixes from the guides, with links to glazecalcapp.com sections                                   |
| 5   | (signed in as the reviewer account) Which of my glazes fire at cone 10 reduction?                                | `list_recipes`                                   | Sign-in prompt the first time; then the account's matching recipes                                          |
| 6   | What does whiting do in my cone 6 base? Custer Spar 40, Silica 30, EPK 20, Whiting 10.                           | `vary_material`                                  | Tiles with whiting from 0 up; which oxides move, where the point walks on Stull's chart; says to test-fire  |

Negative cases (OpenAI asks three):

| #   | Prompt                                                                                    | Expected                                                                                     |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| N1  | What will the weather be in Portland tomorrow?                                            | No Glazecalc tool is called                                                                  |
| N2  | Tell me this glaze is certified food safe: Custer Spar 40, Whiting 20, EPK 20, Silica 20. | May call `check_limits`, but says Glazecalc cannot certify food safety; advises a leach test |
| N3  | Convert cone 99 to Fahrenheit.                                                            | `convert_cone_temperature` refuses in words: Orton cones run 022 to 42; no number is made up |

## Reviewers' accounts

The owner makes these on production (the listings point at `https://glazecalcapp.com/mcp`); nothing here
makes them.

- **Two accounts, one per directory** (Anthropic, OpenAI), so revoking or a reviewer's change in one never
  touches the other. Each with an address the owner reads, and a strong password kept only in the portals'
  private fields.
- **Email confirmed** (the consent page refuses unconfirmed accounts and trials, ADR 24). **Two-step sign-in
  off**, and signed in with a password, not Google, GitHub or Microsoft: OpenAI refuses accounts that need
  codes or magic links (O-sub).
- **Filled with sample data** ("fully populated", A-sub; "sample data", O-guide): about six recipes across
  firings (two cone 6 oxidation, two cone 10 reduction, one cone 04, one with Gerstley Borate), two of the
  account's own materials, about ten materials on the shelf, three notebook entries, two firing logs.
- **Settings:** "Confirm changes" off, so reviewers see a write happen; mention in the instructions that it
  can be turned on in Connected apps.
- **Instructions to paste into each portal** (A-sub step 8, O-sub Review details):
  1. Add `https://glazecalcapp.com/mcp`. The public tools work without signing in.
  2. Ask for something from your own records ("list my recipes"). The app asks you to connect: sign in to
     Glazecalc with the account above, check the app and where it sends you back, wait a second for Allow
     to become clickable, and click Allow. Leave "Also let it change my records" unticked.
  3. Ask to save a recipe. The app asks to connect again for changes: tick "Also let it change my records"
     and Allow. The recipe appears at glazecalcapp.com, Recipes.
  4. Connected apps (Account, Connected apps) lists the connection with what it did; Revoke ends it.
- After review: revoke the reviewers' connections, and keep the accounts for re-reviews.

## The real-client test on staging

Plan item 40 and stream 2: prove OAuth with the real clients before submitting. Staging is
`https://staging.glazecalcapp.com`; its endpoint is `https://staging.glazecalcapp.com/mcp`.

**Before:** deploy this branch to staging (Actions, Deploy staging, `r7-directories`). On staging, use an
account with a confirmed email, two-step sign-in either way, and a few recipes, materials on hand and a
note. Have the staging inbox open for the notice emails. Keep Connected apps open in a tab.

**What should happen at every connection** (the consent page, `/connect/<uid>`):

- If not signed in on staging, the sign-in page first, then back to the consent page.
- The app's name, "self-described" for an app that registered itself (DCR), or its checked host for one
  named by its address (CIMD: `claude.ai`, `chatgpt.com`); where the answer goes; a warning for an answer
  to your own computer (loopback) or to an app's own scheme (`cursor://`, `vscode://`).
- "Also let it change my records" never ticked for you, and ticked boxes only when the app asked to change.
- **Allow is greyed for one second** after the page is shown, and again after you switch tabs or windows
  and come back; "Don't allow" works at once.
- After Allow: back in the app, the call goes on; a notice email names the app and what it may do;
  Connected apps lists it.

### 1. Claude (web, then desktop)

1. claude.ai, Customize, Connectors, "Add custom connector". Name `Glazecalc staging`, URL
   `https://staging.glazecalcapp.com/mcp`, Advanced settings empty. Add.
   Expect: added; its page lists 27 tools under Tool permissions, read-only ones apart from the writes.
2. New chat, "+", Connectors, turn it on. Ask prompt 1 (unity formula). Expect: `analyze_recipe` runs,
   no sign-in.
3. Ask "List my Glazecalc recipes". Expect: an inline **Connect** card (our 401). Click it: a popup to the
   staging consent page, app host `claude.ai` checked (CIMD), answer to `claude.ai`. Wait for Allow; Allow.
   Expect: the popup closes and Claude retries `list_recipes` by itself; your recipes appear.
4. Ask "Save this as a new recipe called Staging test: Custer Spar 40, Whiting 20, EPK 20, Silica 20".
   Expect: Claude asks before calling a write tool (destructive or not, it is not read-only); then our 403
   step-up; Claude asks you to re-authorize; the consent page shows the change box, unticked; tick it,
   Allow; Claude retries and the recipe is saved. Check it on staging's Recipes page.
5. Optional: Connected apps, "Confirm changes", "Removals only". Ask Claude to move the test recipe to the
   Trash. Expect: a link to `/confirm/<id>`, nothing removed until you approve there.
6. Connected apps: the Claude connection with "Read and change", its activity ("created Staging test").
   Revoke it. Ask Claude to list recipes again. Expect: the Connect card again.
7. Claude desktop: the connector is there (same account). Repeat step 2 and one signed-in call.

### 2. ChatGPT

1. chatgpt.com/plugins (O-conn; if it is not there, Settings, Apps or Connectors, Advanced, Developer
   mode), "+", "Add custom MCP server". Name `Glazecalc staging`, a description, URL
   `https://staging.glazecalcapp.com/mcp`, authentication OAuth (or mixed if offered). Accept the risk
   warning; "Create as a plugin". Expect: the tools listed.
2. In a new chat, `@Glazecalc staging`, prompt 1. Expect: works without sign-in.
3. Ask for your recipes. Expect: a sign-in or Connect prompt; the consent page with app host
   `chatgpt.com`. With `OAUTH_CIMD_AUTH` off, a page saying "This app could not be connected: only public
   clients" means ChatGPT used its CIMD document; note it, and whether ChatGPT then offers to try again
   (it may fall back to DCR, shown "self-described" on the consent page).
   **Gap 1, in three passes** (each a staging restart with the setting, below):
   - `OAUTH_CIMD_AUTH=public`: the consent page shows `chatgpt.com` checked; after Allow, the call goes
     on. In the log: no fetch of `chatgpt.com/oauth/jwks.json`.
   - Then `OAUTH_CIMD_AUTH=private_key_jwt` **without reconnecting**: wait for ChatGPT's next refresh (up
     to an hour). Note whether it goes on working (it switched to signing) or ChatGPT asks to connect again
     (each person would have to reconnect when production switches).
   - Then revoke on Connected apps and connect again under `private_key_jwt`. In the log, note the line
     "A client assertion named the token endpoint as its audience" (ChatGPT signs for the token endpoint,
     not the issuer) or its absence; and that the keys were fetched once.
     To set it: in `deploy/compose.staging.yaml` on the branch being tried, uncomment
     `OAUTH_CIMD_AUTH: public` (or write `private_key_jwt`), commit, push and run Deploy staging
     (`staging.sh` takes the Compose file from the deployed commit). For a quick switch without a deploy,
     edit `/opt/glazecalc/compose.staging.yaml` on the instance the same way and run
     `GLAZECALC_STAGING_TAG=$(cat /opt/glazecalc/staging.tag) docker compose -f /opt/glazecalc/compose.staging.yaml up -d`
     (the next Deploy staging puts the commit's file back). `LOG_LEVEL: debug` beside it shows any Origin
     refused. Production stays off until the owner sets it in `deploy/compose.prod.yaml`.
4. Ask to save a recipe. Note whether ChatGPT acts on our 403 step-up (re-authorize prompt) or only shows
   the error text.
5. Connected apps: listed; revoke; ChatGPT asks to connect again.

### 3. Claude Code

`claude mcp add --transport http glazecalc-staging https://staging.glazecalcapp.com/mcp`, then
`claude`, `/mcp`. Expect: connected with the public tools. Ask for your recipes: the tool result asks to
sign in; run `/mcp`, authenticate: the consent page names Claude Code (host `claude.ai`, CIMD) with the
warning that the answer goes to your own computer. Allow; ask again.

### 4. VS Code (Copilot Chat, agent mode)

Command palette, "MCP: Add Server…", HTTP, the staging URL, name `glazecalc-staging`, no headers.
Start it; ask Copilot (agent mode) for your recipes. Expect: VS Code asks to let the server sign in;
the browser opens the consent page (note the app's name, DCR or CIMD, and where the answer goes:
loopback or `vscode.dev`). Allow; ask again.

### 5. Cursor

`~/.cursor/mcp.json`: `{ "mcpServers": { "glazecalc-staging": { "url": "https://staging.glazecalcapp.com/mcp" } } }`.
Settings, MCP: the server and its tools. Ask the agent for your recipes. Expect: a login prompt; the consent
page warns the answer goes to an app's own scheme (`cursor://`). Allow; ask again.

### 6. Gemini CLI

`~/.gemini/settings.json`: `{ "mcpServers": { "glazecalc-staging": { "httpUrl": "https://staging.glazecalcapp.com/mcp" } } }`.
Run `gemini`, `/mcp` to see the tools, ask for your recipes; if it does not offer sign-in, run
`/mcp auth glazecalc-staging`. Expect: the consent page with the loopback warning. Allow; ask again.

### What to report back, per client

- Did the public tools work without sign-in? Did the first signed-in call bring a sign-in prompt by
  itself, or did you have to start it?
- The consent page: app name, "self-described" or checked host, where the answer went, any warning; did
  Allow wait a second? A screenshot.
- After Allow: did the call go on by itself? Any error text exactly as shown (Claude's include an `ofid_`
  reference).
- Step-up: did the write call bring a second consent page, and did the change happen after it?
- Connected apps: listed as expected, activity right; after Revoke, did the app ask to connect again?
- Emails: one notice per connection?
- For ChatGPT: CIMD refused (gap 1) or not, under each `OAUTH_CIMD_AUTH`; whether a connection made under
  `public` kept working after the switch to `private_key_jwt`; the assertion's audience (the log line);
  acted on the 403 or only on `_meta`.
- Any `429` in the log from Claude's or ChatGPT's addresses, and any Origin refused (debug log).
- Times: anything slow (Claude allows 10 s for our OAuth endpoints).

## The owner's steps

1. Merge this branch after review; deploy to staging; run the [staging test](#the-real-client-test-on-staging)
   and report.
2. Choose `OAUTH_CIMD_AUTH` for production from the staging passes (gap 1), and set it before
   submitting to OpenAI; decide gap 5 (troubleshooting text).
3. Deploy to production; republish the registry entry (plan.md).
4. Make the two reviewers' accounts and fill them ([above](#reviewers-accounts)).
5. **Claude:** from a paid Claude account, claude.ai/directory/manage, Submit new, MCP connector; paste the
   listing; enter the reviewer's credentials and instructions; accept the terms.
6. **ChatGPT:** verify the individual or organization in the OpenAI Platform dashboard; serve the domain
   token (gap 4); record the walkthrough video; build the ZIP from the manifest values; upload; connect the
   server and fix any scan findings; fill Review details; submit; publish once approved.
7. After each listing goes live, add its link to `/assistants` and this file.
