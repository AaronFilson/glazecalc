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

## The request log

Keep a short log outside the repository and the app, for example a private spreadsheet. Record for each request:

- the date received;
- the kind;
- how the person was checked;
- the date answered;
- what was done.

Keep no more than that: no copies of their data, and no correspondence beyond what proves the answer. Keep entries
for three years, then delete them.
