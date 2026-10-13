# What to do after a personal data breach

The owner's plan for a breach (GDPR and UK GDPR Articles 33 and 34). Item 12 of [eu-data-plan.md](eu-data-plan.md).
What Glazecalc holds, and where, is in [processing-record.md](processing-record.md).

## What counts as a breach

Any security incident that leads to personal data being lost, destroyed, changed, disclosed or reached by someone who
should not have it, by accident or on purpose. It covers confidentiality, integrity and availability. Examples here:

- someone else gets into the server, the database, a backup or the AWS account (a leaked key, a stolen session, an
  exposed bucket);
- a bug shows one person's records, email address or export to another;
- a backup or a database dump ends up somewhere it should not (a public place, a lost laptop);
- the database is wiped or corrupted and cannot be restored (loss of availability);
- mail with someone's data goes to the wrong person;
- a deleted account comes back after a restore and is used.

Not a breach: an attack that was blocked and reached no data (still worth a line in the log).

## The clock

**72 hours from becoming aware.** Awareness starts when the owner is reasonably sure that a breach happened and that
personal data was involved, not when every detail is known. A short check to find out is allowed; it must be prompt.

1. **Contain it (at once).** Stop the leak: rotate the exposed secret (`APP_SECRET` signs every session, so rotating it
   signs everyone out; the MongoDB password, SMTP keys, AWS keys), take the instance off the network or stop the app,
   block the bucket, revert the bad deploy. Keep evidence: don't wipe logs or volumes; snapshot first.
2. **Assess (within the first day).** What data, how many people, which countries (the users' `language` and `region`
   preferences are a guide, not proof), what could happen to them, and whether the data was encrypted with a key that
   was not exposed.
3. **Decide.**
   - _Unlikely to result in a risk_ to people (for example, an encrypted snapshot copied with its key safe): no
     notification. Record the reasoning in the breach log.
   - _A risk:_ notify the supervisory authorities **within 72 hours**. If not everything is known, notify with what is
     known and send the rest later, saying so. If the 72 hours are missed, notify anyway and give the reasons for the
     delay.
   - _A high risk_ (for example, passwords' hashes and email addresses taken together, or private notes exposed): also
     tell the people affected, **without undue delay**, in plain words.
4. **Log it**, notified or not (below).
5. **Afterwards:** fix the cause, check the fix, update this plan and the processing record if something changed.

## Where to notify

There is no lead authority: Glazecalc has no EU establishment, so the one-stop shop does not apply. A breach is
notified to **every authority in whose country affected people live** (EDPB Guidelines 9/2022, paragraph 73).

- **EU and EEA:** each national authority, listed with contact details and websites on the EDPB's
  [members page](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en). Each runs its own breach form; find it
  from the authority's site at the time, since the addresses change.
- **United Kingdom:** the ICO's [report a breach](https://ico.org.uk/for-organisations/report-a-breach/) page (online
  form, or its helpline).
- **Switzerland:** the FDPIC, only for a breach likely to bring a high risk, "as soon as possible" (FADP Art. 24).

With many countries, send the same text to each, translated where the form asks for its language; the template below
keeps it short.

## Notification template

Fill in and paste into each form, or send by email where an authority accepts it.

> **Personal data breach notification (GDPR Art. 33)**
>
> **Controller:** Aaron Filson, owner of Glazecalc (https://glazecalcapp.com), a free, non-profit, open-source glaze
> calculator, run from the United States. No EU or UK establishment or representative.
> **Contact:** privacy@glazecalcapp.com
>
> **When:** the breach happened on [date, time UTC, or "between … and …"]; found on [date, time UTC]; this notice
> sent on [date, time UTC]. [If over 72 hours: the reason for the delay.]
>
> **What happened:** [plain description: how, what system, whether it is over.]
>
> **Data concerned:** [for example: email addresses and bcrypt password hashes of user accounts; saved glaze
> recipes and notes.] No special categories of data are collected.
>
> **People concerned:** about [number] people, of whom about [number] appear to live in [country].
> Records concerned: about [number].
>
> **Likely consequences:** [for example: phishing emails to the addresses; password guessing against the hashes.]
>
> **What was done:** [containment and fixes, with dates.] **What people were told:** [the message and date, or why
> they were not told.]
>
> **Processor:** Amazon Web Services, Inc. (hosting, United States, us-west-2). [Whether AWS was involved.]
>
> This notice is [complete / the first of several; more will follow by (date)].

### Message to the people affected (high risk only)

> Subject: Something went wrong with your Glazecalc account
>
> On [date], [what happened, in one or two plain sentences]. It affected [your email address / your saved recipes /
> …]. [What it means for you.] We have [what was done]. You should [change your password at
> https://glazecalcapp.com/forgot / watch for emails pretending to be from Glazecalc / …]. Questions:
> privacy@glazecalcapp.com.

Send it in each person's preferred language where possible, from privacy@glazecalcapp.com, as individual messages
(never with addresses visible to each other). If that would take disproportionate effort, a clear notice on the site
does instead (Art. 34(3)(c)).

## The breach log

Keep it **outside the repository and the app**, beside the request log ([data-requests.md](data-requests.md)), for
example as a private spreadsheet. One row for every breach, notified or not, and for near misses worth remembering:

| Column          | What to write                                                                      |
| --------------- | ---------------------------------------------------------------------------------- |
| Id              | `B-2026-01`, and so on                                                             |
| Found           | Date and time (UTC), and how it was found                                          |
| Happened        | Date and time, or the window                                                       |
| What            | What happened, which systems                                                       |
| Data and people | Kinds of data; number of people and records; countries                             |
| Risk            | None / risk / high risk, and why (encryption, who got it, what they could do)      |
| Contained       | What was done to stop it, and when                                                 |
| Authorities     | Each authority notified, when, and its reference; or "not notified" and the reason |
| People told     | When and how; or why not                                                           |
| Fixed           | The lasting fix, and when                                                          |

Write facts, not people's data: counts and kinds, not addresses. Keep each entry for at least three years, so that an
authority can check the record (Art. 33(5)).
