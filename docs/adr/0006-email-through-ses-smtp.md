# 6. Email through Amazon SES over SMTP

Accepted, 2026-10-05.

## Context

Password reset needs email that arrives in the inbox, not the spam folder, from a site with no
mail server of its own. The app runs in a container that, by design, cannot use the instance's
AWS role (see [0002](0002-keyless-deploys.md)).

## Decision

- Amazon SES sends the mail, from `no-reply@glazecalcapp.com`. The domain is verified with
  2048-bit DKIM, has its own MAIL FROM subdomain (`mail.glazecalcapp.com`) so SPF passes for the
  domain itself, and publishes a DMARC policy (`p=none` while it settles in).
- The app talks SMTP through nodemailer, with credentials from an IAM user that may only send
  mail. They are stored encrypted in Parameter Store (`/glazecalc/smtp-url`), and `deploy.sh`
  writes them into the app's environment. Without them, email is off and the app says so.
- Bounces and complaints go to an SNS topic that emails the owner, and CloudWatch alarms watch the
  bounce and complaint rates SES uses to judge the account.
- `MAIL_TRANSPORT` picks how mail goes out: `smtp` in production, `log` (printed) in development,
  and `file` in the test suites, which read each message to follow reset links.

## Alternatives

- **The SES API with the instance role:** no stored password, but the role would have to be
  reachable from the containers, which the one-hop metadata limit is there to prevent.
- **A mail service such as SendGrid or Postmark:** quicker to start, but another vendor and
  account; SES costs about $0.10 per thousand messages.

## Consequences

- Mail is sent after the reply, so a slow or failing mail server never delays a request; failures
  are logged.
- Trials' placeholder addresses are refused before sending (see
  [0007](0007-trials-as-real-accounts.md)), so they can never bounce.
- The SMTP password is a long-lived credential. Rotating it means a new key for the IAM user and
  an updated parameter, then a deploy.
