# 2. Deploy through GitHub OIDC and SSM, with no SSH

Accepted, 2026-10-05.

## Context

Deploys should be one approved click, leave no long-lived keys anywhere, and give whoever holds
the deploy credentials as little power as possible. The usual approach, an SSH key in GitHub
secrets, gives full shell access to the server and has to be rotated by hand.

## Decision

- The instance has no SSH: port 22 is closed and no key pair is set. People use SSM Session
  Manager.
- GitHub Actions gets short-lived AWS credentials through OpenID Connect, for a role trusted only
  for this repository's `production` environment. That environment needs a manual approval.
- The role may do one thing: run the SSM command document `glazecalc-deploy` on instances tagged
  `app=glazecalc`. The document runs `/opt/glazecalc/deploy.sh '<tag>'`, and its parameter must
  match `^(latest|sha-[0-9a-f]{40})$`, so no other command can be passed through it.
- `deploy.sh` pulls the image first, updates its own scripts from the commit the image was built
  from, starts the new version, and goes back to the previous image if the health check fails.

## Consequences

- There are no AWS keys in GitHub and no SSH keys anywhere. A leaked workflow token can, at
  worst, deploy an image that CI already built from this repository.
- Setting it up takes more IAM work than an SSH key (`deploy/aws/*.json`), and debugging goes
  through SSM command output instead of a terminal.
- Instance metadata allows one network hop, so only host scripts can use the instance role; the
  app's containers cannot.
