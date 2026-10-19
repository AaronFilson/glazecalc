# 25. Confirm before changes: a change from an app waits for the person's yes

Accepted, 2026-10-19. Plan item 43 of [the integrations plan](../integrations-plan.md), with the
owner's decisions of 2026-10-19: the setting is off by default; its choices are off, removals
only, and every change; it covers access tokens on the REST routes as well as assistants; and a
personal token can be made exempt, chosen when it is made. Builds on
[ADR 17](0017-mcp-server.md) (the write tools) and [ADR 24](0024-authorization-server.md) (apps
connected with OAuth).

## Context

Since the write tools (ADR 17, Phase 4), words planted in a note, a recipe or a web page an
assistant read could steer it into changing or removing the person's records. Versions and the
Trash make every change undoable, and the limits stop a runaway, but some people want nothing
changed without saying yes first. The MCP revision 2026-07-28 lets a server ask the person in the
middle of a tool call (multi-round-trip requests, `InputRequiredResult`): a form the client shows,
or a page the client opens (URL mode). It asks the server to integrity-protect the state it hands
the client (`requestState`), to bind it to the user, to let it expire, and to enforce single use
itself; in URL mode, to check that the person who opens the page is the same user, and never to
put credentials in the address. Which clients support it is not yet known, and 2025 clients do
not at all; scripts on the REST routes have no client to ask through.

## Decision

- **The setting**, `User.confirmChanges`: `off` (the default; an account without the field),
  `removals` (moving a record to the Trash: `move_to_trash` and `DELETE /api/<kind>/delete/:id`;
  taking materials off the shelf: `remove_from_shelf` and `POST /api/shelf/remove`), or `all`
  (every write tool, `undo_shelf_change` included, and every token write on the record routes, the
  Trash's put back and the shelf). Set on Connected apps with the web session only
  (`PUT /api/connections/confirm-setting`); a choice that asks less sends the owner a notice
  email. `get_my_settings` shows it, read only. When it cannot be read (the database fails, the
  value is unknown), changes wait: fail closed.
- **Per-token exemption**: a personal token that can change records may be made with "Changes from
  this token need no confirmation" (`AccessToken.noConfirm`), on the token form, which already
  needs the password and a current factor. It cannot be set later. OAuth connections are never
  exempt.
- **A waiting change** (`models/pending_change.ts`): its `_id` is 128 random bits (base64url),
  which is also its page's address, `/confirm/<id>`. It keeps the tool or route, its arguments, a
  digest of them, the permission it needs, a summary written by the server (a message code and its
  values: the kind of record, its title or name, the fields or materials; never a note's text),
  and, for a change to an existing record or an undo of the shelf, a digest of that record or
  shelf as it was (`base`). It waits 30 minutes (a TTL index; every query also checks the time).
  Once decided, its arguments are removed at once, and the row once the token that asked has read
  what came of it. At most 20 wait per account; more are refused.
- **One runner** (`server/lib/pending_changes.ts`): approving takes the change from `pending` to
  `running` in one `findOneAndUpdate`, so it runs once however many approve at the same moment.
  Then everything is checked again as if just asked: the token or connection still works, is
  still the account's and still allows the permission; the record or shelf is unchanged since it
  was asked for (else `conflict`, and nothing changes). It then runs the same code the tool or
  route runs when nothing waits: the MCP tools' work (`makeWork` in
  `server/mcp/tools/account_write.ts`) or the route's operation (`server/lib/rest_changes.ts`),
  as the token, with the same limits counted, the same versions, Trash entries and activity lines.
- **MCP**, for every write tool when the setting covers it, in this order of preference: for
  `removals`, the client's own form first; for `all`, the website first.
  1. **URL elicitation** (a 2026-07-28 request whose client capabilities declare
     `elicitation.url`): an `InputRequiredResult` asking the client to open
     `https://<site>/confirm/<id>`, where the person approves it signed in. The address carries no
     credential. The client's retries are answered with the next round until the change is
     decided (at most 8 rounds, then the link in words), and then with what came of it.
  2. **Form elicitation** (`elicitation.form`, or a bare `elicitation`): a yes/no question whose
     words are the server's summary and the asking token's name; a yes makes the change (owner's
     choice: it counts as confirmation).
  3. **Anything else** (every 2025 client): an `isError` result, "Nothing changed yet. Ask the
     person to approve it at <link>; it is made when they approve."
     The `requestState` handed out is signed with HMAC-SHA256 (the SDK's `createRequestStateCodec`,
     keyed by a key derived from `APP_SECRET` for this use alone) and expires with the change; it
     holds the change's id, the account, the token, the tool, the digest of the arguments, the
     mode and the round. The SDK refuses state whose signature or time fails before any tool runs
     (`requestState.verify` in `server/mcp/server.ts`); the tool refuses state for another account,
     token, tool or arguments. The SDK's legacy shim, which would ask a 2025 client from the server
     inside the same request, is off (`inputRequired.legacyShim: false`): the endpoint is stateless.
- **REST**: a token's change that must wait is answered `202 { code: 'confirmation-needed',
pendingId, url, expiresAt }`. The script polls `GET /api/pending-changes/:id` with the same
  token: `pending` until decided, then the route's own answer (`outcome: { status, body }`), after
  which the row is gone (404). Another token, even the same account's, gets 404.
- **The page** `/confirm/:id` (`client/app/pages/confirm/confirm-page.ts`) shows the summary, who
  asked (an OAuth app's name marked as the one it gave itself) and when it lapses; Approve and
  Decline, the heading focused and never the button; and "Also approve the n other changes waiting
  from <app>". It is a private page (no Referer, noindex). Approve, Decline and approve-all
  (`POST /api/pending-changes/:id/approve`, `/decline`, `/approve-all?tokenId=`) take the web
  session of the same account only: any access token is refused (403) before anything is read,
  another account's change is 404, and the site's same-origin check stops another site from
  approving through a signed-in browser. No password is asked again (owner's choice): being signed
  in as the account is enough.
- The gate keys on the caller's `via` only to record it: personal tokens (`pat`) and apps
  connected with OAuth (`oauth`) are asked the same way, and any later kind of token will be too.

## Consequences

- **What a prompt-injected assistant can and cannot do.** It can ask for a change; with the setting
  on, nothing happens until the person approves it on a page whose words the server wrote. It
  cannot approve: the approval routes refuse every token, the page needs the person's session, the
  state it carries is signed and bound to this one change, and a change runs once. It can try to
  make a summary misleading through what it puts in a title; the page shows titles as quoted data,
  next to the kind of change and the app that asked. It can flood the person with requests: at
  most 20 wait, and each lapses after 30 minutes.
- **Form elicitation is weaker than the website**, and the owner chose it for removals knowing
  that: the server cannot tell whether the client's yes came from the person. A client is trusted
  to show its form to the person, but anyone holding the token can send a 2026-07-28 request that
  declares form elicitation and answers yes itself (a script, or an assistant with the token in a
  place it can read). `FORM_CONFIRMS` in `account_write.ts` turns it off, leaving the website as
  the only way. URL mode is preferred for `all` for this reason.
- A token's change made after approval still counts against the account's and token's limits, at
  the time it is made; the REST request that asked was counted when it was made too.
- A change that waits may hold the text of a note or recipe for up to 30 minutes; the privacy page
  and the processing record say so. It is never exported (it is transient) and is deleted with the
  account.
- Per-client support for the 2026-07-28 mechanisms is unconfirmed; the website's link is the main
  path until real clients are tried on staging.

## Alternatives

- **Re-entering the password to approve**: safer against a borrowed session, but the session is
  already what guards the records themselves. Not chosen (owner).
- **Approving in the assistant's chat ("say yes to the assistant")**: the assistant would be the
  one reporting the yes, the very thing a prompt injection controls. Rejected.
- **A per-request confirmation code sent by email**: slower, and email is not a second channel the
  assistant cannot read for many people. Not chosen.
- **Keeping only the website (no form mode)**: the strongest, and one constant away; the owner
  chose to let a client's form count for removals.
