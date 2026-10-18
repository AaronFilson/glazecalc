# 20. A recipe is shared by an unguessable, read-only link

Accepted, 2026-10-16. Item 10 of the top ten in
[Features for industry and advanced users](../../reports/Features%20for%20industry%20and%20advanced%20users.md):
a read-only share link and a worked-calculation view, for teachers handing out recipes, without
class accounts.

## Context

Everything a potter saves has been theirs alone. Teachers and studios want to hand a recipe to
others: a class, a studio's members, a friend. Glazy is built on public recipes; Insight shares
records by link. A class-account system (teachers, students, assignments) would cost far more,
and accounts for minors change the privacy duties. The owner decided: anyone with the link can
view the recipe, no account needed; the link is unguessable, revocable and replaceable; it is
never indexed; and it never shows prices, private notes, the owner's email or account.

## Decision

- **One link a recipe, made by its owner.** Share, under a saved recipe's More, makes the link.
  Making a new one replaces the old (which stops working at once); Stop sharing removes it. The
  routes are `/api/share/recipe/:id` (GET, POST, PUT, DELETE), for the web session only: not a
  trial, not an access token (default deny, as for the export and the account).
- **The secret is 256 random bits** (`crypto.randomBytes(32)`, base64url, 43 characters), and only
  its SHA-256 is stored (`server/models/share_link.ts`), as for access tokens and reset links. So
  a backup, a database dump or the owner cannot read a link back: it is shown once, when made.
  An unsalted hash is enough for a secret this long; the database is searched by it.
- **The secret goes after `#`:** the link is `https://glazecalcapp.com/shared#<secret>`. A browser
  never sends the part after `#`, so it is not in nginx's access log (which keeps addresses for 14
  days), the app's log, or any Referer. The page sends it to `GET /api/shared/recipe` in an
  `X-Share-Secret` header, also never logged.
- **The view is live and an allowlist.** The shared page gets the recipe as it is now, so the
  owner's edits show, but only the fields `server/lib/share_links.ts` names: the title and date,
  each material's and additive's name, amount, unit and chemistry (fields, basis, LOI, weight),
  for a standard one its hazards (below),
  whether additives count in the unity formula, the firing as stated (its cone, atmosphere and
  process, and whether it is for a food surface; never the firing logs it is linked to;
  ADR 0021), and the notes, with the firing's schedule note, only when the owner ticks Show the
  recipe's notes (off by default). Never ids, the owner, their email, a material's own notes, or
  any field a later version adds to a recipe (prices, costs): a new field stays private until it
  is named there. Additives that borrow another record's chemistry by name get that chemistry
  sent with the recipe (`borrowed`), found as the recipe page finds it, so the numbers match. A
  standard record is sent with its library name and aliases (public); the owner's own record is
  sent under the name the recipe itself asked for, never its own name or aliases. Only the
  records asked for are read; the standard library is kept in memory for ten minutes.
- **The same safety words as the recipe page** (the owner's decision, 2026-10-17). The shared
  page shows the recipe's hazards, the lead caution and the line to the safety guides (safe
  mixing, safety at home) as the recipe page does, in both views and on paper, in the viewer's
  language. A line that is a standard material or additive is sent marked `ownedBy: 'Standard'`
  with the library's hazards as they are now (its safety data sheet may have changed since the
  recipe was saved; the copy in the line if the library no longer has the record), which are
  public and translated as on the recipe page. A potter's own material or additive is sent with
  nothing of its own beyond the allowlist above, so neither its hazards nor its notes: the page
  names it among those whose records give no hazards and points to the safety data sheet, as the
  recipe page does for any record without them, so nothing is claimed for it either way. The lead
  caution is worked out in the browser from the lines' chemistry (PbO), as the recipe page does.
- **The numbers are worked out in the viewer's browser** by the same code as the recipe page
  (`evaluate` and `unityLines` in `recipe-analysis.ts`, on `lib/chemistry`), not sent by the
  server, so a link always agrees with the owner's page.
- **Gone is one answer.** An unknown, replaced or stopped link, a recipe in the Trash, deleted or
  in a deleted account all answer `404 not-shared`, and the page says the recipe is not shared.
  Moving a recipe to the Trash removes its link, so putting it back does not share it again: the
  Trash's restore also deletes any link of that recipe (so it holds even if the Trash could not
  stop the link, or one was made while the recipe was in it), and making a link checks again,
  after saving it, that the recipe is still the account's and takes the link back if not.
- **A password reset and Sign out everywhere stop every link of the account,** as they revoke
  every access token (the same reasoning: someone else may have had the account). The reset's
  notice email says the links were stopped and can be made again. An ordinary password change and
  an email change keep them, as they keep access tokens.
- **Not indexed, nothing passed on.** `/shared` (in every language) is in `PRIVATE_PAGES`
  (`server/lib/pages.ts`): never in the sitemap or prerendered, no canonical address or hreflang,
  and its replies and the API's carry `X-Robots-Tag: noindex, nofollow, noarchive`,
  `Referrer-Policy: no-referrer` and `Cache-Control: no-store`. nginx adds its own
  `Referrer-Policy` after the app's, which a browser would follow, so the page also has
  `<meta name="referrer" content="no-referrer">` (and `<meta name="robots">`), which wins.
- **Rate-limited per address:** 300 views in 15 minutes (a class behind one school address), and
  50 links that open nothing. The no-index and no-cache headers are set before the limiters, so a
  429 carries them too.
- **The viewer's language, the owner's words.** The page is a normal app page: a viewer who chose
  a language is taken to `/de/shared#...` as on any page, and the labels are theirs; the recipe's
  title, materials and notes are as the owner wrote them.
- **Trials cannot share.** A trial is a throwaway account that is deleted after 14 days; a link to
  it would break, and anyone could start trials to publish content anonymously. Its Share says an
  account is needed.
- **Account data.** Links go with the account (`OWNED_HISTORY` in `server/lib/account_data.ts`)
  and the export lists them (recipe, when made, notes shown), without the hash.

The worked calculation (Show the working) is not part of the sharing: `lib/recipe/worked.js`
does `calculateUMF`'s arithmetic step by step (grams, each material's oxides and their moles,
the totals, the fluxes added up, each oxide divided by them), from the recipe page's own lines,
and a server test checks its answer equals `calculateUMF`'s. The recipe page shows it as a third
kind of print, and the shared page as its second view.

## Alternatives

- **The secret in the path** (`/shared/<secret>`): simpler, but every access log and Referer
  would hold working links.
- **Storing the link** (encrypted) so the owner can copy it again: more convenient, but a leak of
  the database and key would open every shared recipe. Making a new link costs one click.
- **A snapshot when shared:** fixed and simple, but the owner asked that edits show, and a copy
  is one more place a deleted recipe would linger.
- **Expiring links:** not asked for; a teacher's handout should keep working. It can be added.
- **Class accounts:** the report's "skip for now"; share links and the worked view cover most of
  what a class needs.

## Consequences

- A link works for anyone who has it, forwarded or not; the owner can only stop it or replace it
  (or reset the password, or sign out everywhere, which stops all of them).
  The privacy page says so.
- A new field on a recipe is private by default; showing it on shared pages takes a change here.
- Viewers are not recorded beyond the in-memory rate-limit count.
