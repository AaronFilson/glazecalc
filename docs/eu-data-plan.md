# EU data protection: feature list

Plan drawn from the report "No cookie banner, a real delete button, and an honest word on where the data lives" (12 October 2026). Effort: S = under a day, M = one to three days, L = a week or more. Every English text change also goes through the translation waves for 23 languages; that cost is not counted in the effort below.

**Already done:** sign-in emails are kept out of nginx's access log (branch `nginx-log-no-email`, commit 2e81ae0). After the merge, rerun `enable-https.sh` on the live server and scrub the existing `/var/log/nginx/access.log*`.

**Not to build:** a cookie banner. Nothing the app stores needs consent.

## Must do

1. **Rewrite the privacy notice.** Cover every GDPR Art. 13 item: controller and private contact, representatives, purposes and legal bases, AWS as processor, US hosting and the safeguards, a retention period per kind of data, the rights, the right to complain, and no automated decisions. Fix the four places where it contradicts the code. Add a "Cookies and browser storage" table listing all ~24 keys with their purpose and lifetime. Mention the SES suppression list and bounce notices. Effort M. Files: `client/public/i18n/site/en.json` (`privacy`), `client/app/pages/privacy/privacy-page.ts`, `client/i18n-fingerprints/*`.
2. **Privacy link and one-line summary on the sign-up form**, plus the minimum-age line. Effort S. Files: `client/app/pages/auth/auth-page.ts`, `client/public/i18n/account/en.json`.
3. **A private contact address** (e.g. `privacy@glazecalcapp.com`) with inbound forwarding. It also serves as the UK electronic complaints route, acknowledged within 30 days. Effort S. Files: DNS and mail setup outside the repo, `deploy/aws/README.md`, the privacy text.
4. **Download my data.** `GET /api/export` returning versioned JSON with the user's preferences, shelf and all seven kinds of record, and no password hash, `tokenVersion` or reset records. Add CSV for recipes and materials, and an "Export" button on the account page. Effort M. Files: `server/routes/user_routes.ts` (or a new `export_routes.ts`), `server/lib/account_data.ts`, `client/app/pages/password/account-page.ts`, `client/public/i18n/account/en.json`, `server/test/`.
5. **Deletion log, re-applied on restore.** Record user id and time for each deletion (no email), keep it ≥37 days (TTL), and make it survive a `--drop` restore: exclude it from the restore, or also write each entry to S3. Add a restore script or steps that re-apply it before the app goes live. Test one restore. Effort M. Files: `server/lib/account_data.ts`, a new `server/models/deletion.ts`, `deploy/backup.sh`, `deploy/README.md`, `deploy/aws/instance-policy.json` (if S3).
6. **Time limits on every log:**
   - pin nginx log rotation in the repo;
   - give Docker logs a time limit, or state their size-based limit;
   - stop MongoDB logging query filters (raise `slowms` or lower verbosity);
   - log only the error code on mail failures.

   Effort S–M. Files: `deploy/setup-instance.sh`, `deploy/compose.prod.yaml`, `deploy/cloud-init.yaml`, `server/routes/password_routes.ts:33`, `server/lib/log.ts`.

7. **Backup hygiene:**
   - confirm S3 versioning is off on the live bucket;
   - delete, or record a reason for, the 2017 instance snapshots and the 2026-10-05 dumps on the old server and the local PC.

   Effort S. Files: `deploy/aws/README.md` (to record the result).

8. **Store preferences only when chosen.** Stop writing all 14 preference copies at sign-in and at session end. Keep account preferences in memory, and write a key only on a user change. Check the library `region` filter write too. Effort M. Files: `client/app/core/preferences.service.ts:156-215`, `client/app/core/auth.service.ts:122-143`, `client/app/core/locale.service.ts:58-61`, client unit tests.
9. **Email-change screen, done safely:**
   - add the UI;
   - send a confirmation link to the new address and a notice to the old one;
   - raise `tokenVersion` on change.

   Effort M. Files: `server/routes/user_routes.ts:130-166`, `server/lib/account_mail.ts`, a token model like `server/models/password_reset.ts`, `client/app/pages/password/account-page.ts`, account i18n.

10. **Sign out everywhere.** A route that raises `tokenVersion` and clears the cookie, and a button on the account page. Effort S. Files: `server/routes/auth_routes.ts`, `client/app/core/auth.service.ts`, `account-page.ts`.
11. **Finish deletion:**
    - send a confirmation email that says backups expire within 30 days;
    - clear localStorage preference copies on deletion;
    - remove the address from the SES suppression list (needs `ses:DeleteSuppressedDestination`, or a manual owner step).

    Effort S. Files: `server/routes/user_routes.ts:168-175`, `server/lib/account_mail.ts`, `client/app/core/auth.service.ts:178-183`, `deploy/aws/mailer-policy.json`.

12. **Record of processing (Art. 30), breach plan and lawful-basis note.** One page each, kept outside the app: the processing table, a list of every EU authority's breach form plus the ICO's, a 72-hour template, a breach log, a few lines balancing legitimate interests, and a dated link to the AWS DPA (Service Terms §1.14). Effort S. Files: new docs outside the repo or under `docs/`; no code.
13. **Request handling.** A short procedure: answer within one month, verify identity by sign-in or a confirmation link (never ID), and keep a simple request log. Effort S. Files: `docs/` only.

## Should do

14. **"Keep me signed in on this device" (unticked).** Without it, a session cookie with no Max-Age; with it, 7 days. Trials keep 14 days. Effort S–M. Files: `server/lib/session.ts:12-23`, `server/routes/auth_routes.ts` (the sign-in flag; sign-in is a GET with Basic auth, so send the flag as a header or query parameter), `client/app/pages/auth/auth-page.ts`, `client/app/core/auth.service.ts:111-116`, e2e tests.
15. **Content-Security-Policy header** limiting `connect-src`, `img-src`, `font-src`, `style-src`, `frame-src` and `form-action` to `'self'`, leaving `script-src` to Angular's `autoCsp` meta tag. Also `Cache-Control: no-store` on authenticated `/api` responses. Effort S. Files: `deploy/nginx/glazecalc-proxy.conf`, `server/app.ts`, e2e check on both Windows and Linux.
16. **EU and UK representatives.** If the owner agrees (see decisions), appoint them in writing, add them to the notice and give them the Art. 30 record. Effort S, plus the yearly fee. Files: privacy text.
17. **Inactive-account rule.** Add a `lastSeenAt` field (updated at most daily on sign-in or verify), a sweeper that warns by email and later deletes, and a statement in the notice. Effort M. Files: `server/models/user.ts`, `server/lib/jwt_auth.ts` or `auth_routes.ts`, a new sweeper beside `server/lib/guest_sweeper.ts`, `server/main.ts`, `server/lib/account_mail.ts`.
18. **Email verification at sign-up**, so a stranger's address cannot be registered. Effort M. Files: `server/routes/auth_routes.ts:28-47`, `server/models/user.ts`, `server/lib/account_mail.ts`, auth pages.
19. **MongoDB authentication** on the Compose network, as defence in depth. Effort M. Files: `deploy/compose.prod.yaml`, `deploy/deploy.sh`, `deploy/setup-instance.sh`, `.env.example`, `server/` connection config.
20. **Move to eu-west-1 (Ireland)**, if chosen (see decisions). Do it after item 4. Steps:
    - change the region strings;
    - set up SES production access, the identity and MAIL FROM in the EU;
    - do the cut-over;
    - delete the US copies;
    - update the privacy hosting text.

    Effort M (2–3 days). Files: `deploy/aws/*.json`, `deploy/aws/create-mailer.sh`, `deploy/aws/README.md`, ADRs 0001 and 0006, `server/lib/mailer.ts` comments, `.env.example`, `site.privacy.hosting`.

21. **Remove or document unused personal-data fields.** These are the legacy `settings` field, the unset account `displayname` and the unused Trash collection. Effort S. Files: `server/models/user.ts`, `server/routes/user_routes.ts:114`, `server/models/trash.ts`.
22. **Ask a lawyer or representative service about the DSA.** Find out whether an Art. 13 DSA legal representative is needed, and whether it can be bundled. Effort S. No code.

## Later

23. **Expiry dates on localStorage values.** Store a date per key and drop keys unused for 12 months. Version the translation-notice flag. Effort S. Files: `client/app/core/preferences.service.ts`, `client/app/i18n/translation-notice.ts`.
24. **Admin action log.** Record who changed or deleted which account, and when. Effort S–M. Files: `server/routes/user_routes.ts:101-126`, a new model.
25. **Import** (`POST /api/import`). Only needed for a second region or for moving between accounts. Effort M. Files: new route, `server/routes/records.ts` field lists, `deploy/nginx/glazecalc-proxy.conf` (body size).
26. **A user choice of region (two stacks, separate hostnames)**, only if users ask. About $25 a month and 2–4 weeks. Files: as in the EU storage note §6.
27. **An imprint page**, if a lawyer says the studio link makes the site commercial. Effort S.
28. **Watch list:** the Digital Omnibus (cookie and breach rules), the DPF appeal C-703/25 P, and the Art. 30 small-organisation relief. Recheck the notice when any of them lands.

## Decisions for the owner

**Decided (13 October 2026):**

- Stay in us-west-2. Item 20 is dropped, and the notice says plainly where the data is.
- No EU or UK representatives. Item 16 is dropped, and the private contact address is answered promptly instead.
- No deletion of inactive accounts, because what counts as inactive can't be told reliably. Item 17 is dropped, and the notice says accounts are kept until the user deletes them.

- No minimum age. The app is a science tool with no chat and no content shared between users. The basis for processing is running the account, not consent, so GDPR Art. 8 doesn't apply. The site isn't directed at children, so COPPA asks nothing unless the owner learns that a child under 13 has an account, in which case the account is deleted. The notice says the site isn't directed at children. Item 2 keeps the privacy link and summary, with no age line.
- The contact point is the project's GitHub. No separate address is set up (item 3 is dropped). The notice warns that issues are public and points to the account page for anything personal: export, correction and deletion are self-service. See [data-requests.md](data-requests.md).
- The old copies (the 2017 snapshots and the 2026-10-05 dumps) hold no EU or UK users, so item 7 is out of scope here.

Items 4–6, 8–11, 13, 15, 18, 19 and 21 are built first. They go out in the next release.

1. **Move to eu-west-1 or not.** Not legally required. It costs about +$0.75 a month and 2–3 days of work. US users' API calls get about 0.1 s slower.
   _Recommendation:_ move, after the export is built, if an EU storage statement matters to European potters. Word it as everyone's data in Ireland, run by a US operator on a US company's cloud. If US latency matters more, stay in Oregon and disclose it plainly (option d). Do not offer a per-user choice unless users ask.
2. **EU and UK representatives.** Required on the EDPB's and ICO's reading. About €420 a year (EU) plus about €378 (UK) from Prighter, or about €1,000 a year elsewhere. The enforcement risk of skipping them is very low.
   _Recommendation:_ ask two providers for non-profit pricing, and whether they bundle the DSA representative. Appoint both if the total stays near €800 a year. If not, write down the decision and the reasoning, and keep the private contact address answered promptly.
3. **Keep me signed in.** Either a 7-day cookie for everyone, as today, or an opt-in box.
   _Recommendation:_ add the unticked box. It is small work and settles the one storage use the authorities disagree on.
4. **Inactive-account deletion.** Needs a period, and a `lastSeenAt` field first.
   _Recommendation:_ delete after 3 years without a sign-in, with warning emails 30 days and 7 days before. The CNIL calls 2 years proportionate, but a recipe archive is kept for years, which justifies longer. State the rule in the notice. Trials keep their 14 days.
5. **Minimum age.**
   _Recommendation:_ "You must be 16, or 13 with a parent's or guardian's permission", as one line on the sign-up form and in the notice. No date of birth and no checkbox.
6. **The contact address to publish.**
   _Recommendation:_ `privacy@glazecalcapp.com`, forwarded to the owner. Name the owner as controller, with no home address. Use the EU representative's postal address for post, if one is appointed. Keep GitHub issues for bugs and translations only, and say in the notice that they are public.
7. **Old data copies** (the 2017 snapshots and the 2026-10-05 dumps).
   _Recommendation:_ delete them now. If any must be kept, record why and until when.
