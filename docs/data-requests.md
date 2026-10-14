# Answering data-protection requests

How the owner answers someone who asks to see, correct, move or delete their data, or objects to how it's used
(GDPR Articles 12–22, and the UK GDPR). Item 13 of [eu-data-plan.md](eu-data-plan.md).

## Where requests arrive

Mostly by email to `privacy@glazecalcapp.com`, the contact the privacy notice names (it reaches the owner's inbox;
[deploy/aws/README.md](../deploy/aws/README.md) section 15), or as a GitHub issue on the project, which the notice
also mentions. A request is valid however it is worded and wherever it is sent. Issues are public:

- Never ask for account details in an issue. Point the person to the account page, where export, correction, the
  email change and deletion are all self-service.
- If a request has personal details in it, edit or hide them, and say why.
- If the account page can't do what's asked, send a message to the account's own address (see below) and continue
  there.

## Time limits

- Answer within **one month** of receiving the request.
- For a complex request, or many from the same person, the deadline may be extended by **two more months**. Tell the
  person within the first month, and say why.
- A complaint about how their data is handled: acknowledge it within **30 days** (the UK's rule), then answer it.
- Answers are free. A request that is plainly unfounded or excessive may be refused, with the reason and with the
  right to complain to a supervisory authority.

## Checking who is asking

Check only that the person controls the account. **Never ask for an identity document.**

- First choice: ask the person to sign in and use the account page.
- If they can't sign in, use the password reset, which proves control of the address. Otherwise send a message to the
  account's address and act once it is answered.
- Someone asking about an account they say isn't theirs (for example, their address was registered by a stranger):
  send the confirmation link to that address; whoever can read it controls it.

## What to do for each right

| Request                             | What to do                                                                                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| See their data (Art. 15)            | Point them to **Download my data** on the account page. If they can't sign in, export it for them after the check above. Also tell them the purposes, who processes it (AWS), where it is stored (US, Oregon), how long it's kept and their rights, as the privacy notice says. |
| Take their data elsewhere (Art. 20) | The same export: JSON, with CSV for recipes and materials.                                                                                                                                                                                                                      |
| Correct their data (Art. 16)        | Most fields can be changed on the account page; the email address through the confirmation link. Change anything else by hand.                                                                                                                                                  |
| Delete their data (Art. 17)         | **Delete account** on the account page, or an admin deletion after the check. Either way the deletion is logged and re-applied if a backup is restored, and backups expire within the period the notice states. Tell the person that.                                           |
| Restrict or object (Art. 18, 21)    | Rare for this app; the only processing is running the account. Answer case by case, and record the decision.                                                                                                                                                                    |

## Turning off two-step sign-in

Someone who has lost every second step (their authenticator app, every passkey and every recovery code) cannot sign
in, and a password reset does not turn two-step sign-in off. This is the only way back, and it takes **seven days**,
so that someone who has only the password and the mailbox for a moment cannot use it quietly. There is no admin route
for it on the website ([ADR 0014](adr/0014-two-step-sign-in.md)); the owner runs a script on the server
([deploy/README.md](../deploy/README.md), "Someone lost every factor").

1. **The request must come from the account's confirmed address.** A request from any other address, an issue or a
   message with an ID document is answered with these steps and nothing else. Never act on a phone call or a
   document.
2. **Ask them to reset their password first** (the reset proves they read that mailbox today). The reset alone does
   not sign them in.
3. **Day 0:** run `clear_mfa.ts --notify <address>`. It records the request on the account (`mfa.clearRequestedAt`)
   and emails the address that two-step sign-in will be turned off on a date seven days later unless they write to
   `privacy@glazecalcapp.com` (the notice names that address for replies, and links the password reset). Note the
   date in the request log.
4. **If anyone writes to privacy@ to stop it** (from that address), do not go on. Ask what happened; if the request was not
   theirs, tell them to change their password, and the account stays as it is.
   **Using any factor also cancels the request:** if the account signs in with a second step or a passkey, or confirms
   a change on its account page with a factor, the server removes `mfa.clearRequestedAt` (the log says only
   `MFA_CLEAR_CANCELLED`). Whoever did that still has a factor. `--clear` then refuses ("Run --notify first"); if the
   person still wants it turned off, ask why, and run `--notify` again, which starts a new seven days.
5. **Day 7 or later:** run `clear_mfa.ts --clear <address>`. It refuses before seven days have passed. It removes
   every factor and recovery code, signs out every device and emails the address that two-step sign-in is off. Tell
   the person to sign in with the password and set up two-step sign-in again, and to keep the new recovery codes.
6. **Log it** as below: the date asked, the reset, the notice date, the date cleared.

If the person instead asks to delete the account, they can't sign in to do it themselves: delete it after the same
check (steps 1 and 2), without waiting the seven days.

## The request log

Keep a short log outside the repository and the app, for example a private spreadsheet. Record for each request:

- the date received;
- the kind;
- how the person was checked;
- the date answered;
- what was done.

Keep no more than that: no copies of their data, and no correspondence beyond what proves the answer. Keep entries
for three years, then delete them.
