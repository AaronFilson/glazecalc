# 7. Trials are real accounts with placeholder emails

Accepted, 2026-10-05.

## Context

Visitors should be able to try the calculator without signing up, as the free tools they already
use allow. Whatever they make should carry over if they then create an account, and the trial must
not open the small server to abuse. Every account has a unique email today, and that should stay
true.

## Decision

- "Try it now" creates a real user with `guest: true` and an expiry 14 days out (long enough for a
  bisque and a glaze firing), so every page, route and ownership check works unchanged.
- The trial gets a generated three-word name, such as "speckled quiet kilns", from hand-written
  word lists, and a placeholder email made from it: `speckled-quiet-kilns@guest.invalid`. The
  `.invalid` top-level domain is reserved (RFC 2606), so no real address can match and no mail can
  be delivered. The existing unique email index keeps names unique, with no migration; a clash
  draws another name.
- Its password is the hash of a random secret nobody knows, so the trial's token is the only way
  in. Sign-in refuses trials, nobody can sign up with or change to a `guest.invalid` address, and
  the mailer refuses to send to one.
- Creating an account during a trial turns the trial into the account in place: nothing is
  copied, the name stays as the display name, and the trial's token is retired. Signing in to an
  existing account on the same browser moves the trial's records into that account instead (the
  server sees both the trial's session cookie and the account's credentials at that moment).
- Limits keep it small: 10 trials an hour per address, 500 at once, 25 records of each kind and
  32 KB per request per trial. The server removes expired trials with everything in them every
  hour.

## Alternatives

- **Keep trial work in the browser and upload it at sign-up:** no accounts for visitors, but every
  page would need a second storage path, work would be lost with the browser's storage, and the
  upload could half fail.
- **Make email optional for trials:** the unique index would need to become sparse, a migration
  on live data, and every place that assumes an email would need checking.
- **A MongoDB TTL index to expire trials:** it would delete the user and leave the records behind,
  so the sweep deletes records first, then the user.

## Consequences

- Trials cost a few hundred bytes plus what they save, and disappear on their own.
- Someone with many addresses could use up the 500 trials and block new ones until theirs expire.
- A trial opened on one browser and an account signed in on another do not meet: the trial stays
  separate until it expires.
