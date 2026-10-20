# 25. Confirm before changes: a change from an app waits for the person's yes

Accepted, 2026-10-19. Plan item 43 of [the integrations plan](../integrations-plan.md), with the
owner's decisions of 2026-10-19: the setting is off by default; its choices are off, removals
only, and every change; it covers access tokens on the REST routes as well as assistants; a
personal token can be made exempt, chosen when it is made; and, after review, approval happens
on the website only: "The reason for a confirm is to keep bad AI from going wild. It is up to
the user to set it up in a way that they like. If the confirm setting is on then the user needs
to use the website." Builds on
[ADR 17](0017-mcp-server.md) (the write tools) and [ADR 24](0024-authorization-server.md) (apps
connected with OAuth).

## Context

**What it guards against**: an assistant that misbehaves, or is led astray by words planted in
what it reads (prompt injection), going wild with the person's records. Not a stolen token:
whoever holds a token is trusted as far as the person chose when they made it (what it may do,
whether it is exempt, how long it lasts), and a stolen token is the person's to revoke. The
owner's words: "I do not care about a stolen token, that is not something to defend against."

Since the write tools (ADR 17, Phase 4), words planted in a note, a recipe or a web page an
assistant read could steer it into changing or removing the person's records. Versions and the
Trash make every change undoable, and the limits stop a runaway, but some people want nothing
changed without saying yes first. The MCP revision 2026-07-28 lets a server ask the person in the
middle of a tool call (multi-round-trip requests, `InputRequiredResult`): a form the client shows,
or a page the client opens (URL mode). A yes in the client's own form comes back through the
very assistant and client being guarded against, so it is not used. It asks the server to integrity-protect the state it hands
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
- **Where the person approves**: on the website only, signed in, on the change's page. No answer
  from an assistant or its client ever approves a change: not a yes in its own form, not a retry,
  not anything in the state it hands back. A client may only say the person would not open the
  page (which declines it).
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
  Once decided, its arguments are removed at once; what came of it stays readable, by the token
  that asked and on the person's page alike, until the row's time is up (reading it changes
  nothing). At most 5 wait from one token or app and 20 per account; more are refused (429, or the
  tool's refusal). The count is taken after the row is written, and the row taken back when it is
  one too many, so asks at the same moment cannot pass the limits together. Changes from a token
  or app that was revoked or has expired are not counted, and revoking one (`revokeOne`,
  `revokeAll`, and the OAuth grant's revokes) ends its waiting changes at once (`failed`,
  `pending-token-gone`). Asking counts against the account's limits on changes made with tokens,
  as making a change does.
- **One runner** (`server/lib/pending_changes.ts`): approving takes the change from `pending` to
  `running` in one `findOneAndUpdate`, so it runs once however many approve at the same moment.
  Then everything is checked again as if just asked: the token or connection still works, is
  still the account's and still allows the permission; the record or shelf is unchanged since it
  was asked for (else `conflict`, and nothing changes). It then runs the same code the tool or
  route runs when nothing waits: the MCP tools' work (`makeWork` in
  `server/mcp/tools/account_write.ts`) or the route's operation (`server/lib/rest_changes.ts`),
  as the token, with the same limits counted, the same versions, Trash entries and activity lines.
- **MCP**, for every write tool when the setting covers it:
  1. **URL elicitation** (a 2026-07-28 request whose client capabilities declare
     `elicitation.url`): an `InputRequiredResult` asking the client to open
     `https://<site>/confirm/<id>`, where the person approves it signed in. The address carries no
     credential. The client's retries are answered with the next round until the change is
     decided (at most 8 rounds, then the link in words), and then with what came of it.
  2. **Anything else** (every 2025 client, and one that declares only form elicitation): an
     `isError` result, "Nothing changed yet. Ask the person to approve it at <link>; it is made
     when they approve."
     The `requestState` handed out is signed with HMAC-SHA256 (the SDK's `createRequestStateCodec`,
     keyed by a key derived from `APP_SECRET` for this use alone) and expires with the change; it
     holds the change's id, the account, the token, the tool, the digest of the arguments and the
     round, and nothing about whether or how the change is to be approved. The SDK refuses state
     whose signature or time fails before any tool runs (`requestState.verify` in
     `server/mcp/server.ts`); the tool refuses state for another account, token, tool or
     arguments. A retry never makes the change itself: it reads the setting again, and asks the
     website whether the person approved. When the person has stopped asking for this kind of
     change meanwhile, the waiting change is withdrawn (declined in one step, so an approval at the
     same moment cannot also make it) and the tool runs as any call would now. The SDK's legacy
     shim, which would ask a 2025 client from the server inside the same request, is off
     (`inputRequired.legacyShim: false`): the endpoint is stateless.
- **REST**: a token's change that must wait is answered `202 { code: 'confirmation-needed',
pendingId, url, expiresAt }`. The script polls `GET /api/pending-changes/:id` with the same
  token: `pending` until decided, then the route's own answer (`outcome: { status, body }`), for as
  long as the row lasts. Another token, even the same account's, gets 404. Every route that takes
  a token's change has the gate: the record routes, the recipe's firing links (taking one off is a
  removal), the Trash's put back and the shelf. A test walks the app's routes and fails for any
  route behind a `:write` permission without it, and another calls every MCP write tool.
  A removal that waited counts against its token's removals once, when it is made.
- **The page** `/confirm/:id` (`client/app/pages/confirm/confirm-page.ts`) shows the summary; each
  field the change sets, as it is now and as it would be (built by the server for the signed-in
  owner only, from the waiting arguments and the record; long text cut short with "…" and a
  "Show all"); for a removal, what the record was called before this app's latest changes to it
  and how many minutes ago it changed it (from the record's versions, which now note the token or
  app that made each); who asked (an app that registered itself marked "self-described", as on
  Connected apps) and when it lapses; Approve and Decline, the heading focused and never the
  button. Every other change waiting from the same app is listed with the same detail, and
  "Approve all n changes from <app>" and "Decline all n changes from <app>" send exactly the ids
  shown: a change asked for after the page was opened is never approved with them. A change
  decided already shows what came of it. It is a private page (no Referer, noindex). Approve,
  Decline, approve-all and decline-all (`POST /api/pending-changes/:id/approve`, `/decline`,
  `/approve-all?tokenId=` and `/decline-all?tokenId=` with `{ ids }`) take the web session of the
  same account only: any access token is refused (403) before anything is read, another account's
  change is 404, and the site's same-origin check stops another site from approving through a
  signed-in browser. No password is asked again (owner's choice): being signed in as the account
  is enough.
- The gate keys on the caller's `via` only to record it: personal tokens (`pat`) and apps
  connected with OAuth (`oauth`) are asked the same way, and any later kind of token will be too.

## Consequences

- **What a prompt-injected assistant can and cannot do.** It can ask for a change; with the setting
  on, nothing happens until the person approves it on a page whose words the server wrote. It
  cannot approve: the approval routes refuse every token, the page needs the person's session, no
  answer from its client counts, the state it carries is signed and bound to this one change, and
  a change runs once. It can try to make a summary misleading: renaming a record to something
  harmless, then asking to remove it; the page shows the fields old and new, and for a removal
  the name before this app's changes and when it made them. It can flood the person with
  requests: at most 5 wait from it and 20 in all, each lapses after 30 minutes, asking counts
  against the limits on changes, and revoking the app ends all of its at once.
- **A token holder is trusted.** Someone who holds the token can do what the token allows, as the
  person chose; the confirmation is not built to stop them, and does not try to tell the person
  from their own scripts. The per-token exemption exists for that reason.
- A token's change made after approval still counts against the account's and token's limits, at
  the time it is made; the REST request that asked was counted against the limits on changes when
  it was made too, but a removal only once, when it is made.
- A change that waits may hold the text of a note or recipe for up to 30 minutes; the privacy page
  and the processing record say so. It is never exported (it is transient) and is deleted with the
  account.
- Per-client support for URL elicitation is unconfirmed; the website's link in words is the main
  path until real clients are tried on staging. Clients that offer only a form of their own get
  the link too.

## Alternatives

- **Re-entering the password to approve**: safer against a borrowed session, but the session is
  already what guards the records themselves. Not chosen (owner).
- **Approving in the assistant's chat ("say yes to the assistant")**: the assistant would be the
  one reporting the yes, the very thing a prompt injection controls. Rejected.
- **A per-request confirmation code sent by email**: slower, and email is not a second channel the
  assistant cannot read for many people. Not chosen.
- **Letting a yes in the client's own form count (form elicitation)**: built first for removals,
  then removed after review (owner decision, 2026-10-19): the yes comes back through the assistant
  and client the setting is there to hold back, so the server cannot tell it came from the
  person.
