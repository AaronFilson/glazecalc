# Deploying glazecalc to EC2

How the production setup fits together. The plan and reasoning are in
[docs/ec2-deploy-plan.md](../docs/ec2-deploy-plan.md); the AWS commands are in
[aws/README.md](aws/README.md).

```
GitHub: push to master ─► CI (tests, Docker check) ─► Publish image (amd64 + arm64)
                                                        └─► ghcr.io/aaronfilson/glazecalc:sha-<commit>, :latest
GitHub: Actions → Deploy (manual, approved) ─OIDC─► AWS role ─SSM Run Command─► /opt/glazecalc/deploy.sh <tag>

EC2 (Debian 13, t4g.micro):
  nginx :80/:443 ─► 127.0.0.1:3000 app container ─► mongo:9.0 container (named volume)
  certbot: Let's Encrypt certificate, renewed by certbot.timer (nginx reloads after each renewal)
  systemd: glazecalc.service (stack at boot), glazecalc-backup.timer (nightly mongodump to S3),
           mongodb-thp.service (kernel settings MongoDB asks for)
```

HTTPS comes in two stages. First boot serves plain HTTP (`nginx/glazecalc-http.conf`), so the
app can be checked by IP address before the DNS switch: pages load, and curl can check the API
(`deploy/aws/README.md`, section 11), but a browser does not stay signed in, because the
session cookie is `Secure`. After DNS points at the instance,
`enable-https.sh` (run once) gets the certificate and switches nginx to `nginx/glazecalc.conf`.

| File                                                     | Where it ends up                       | What it does                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloud-init.yaml`                                        | launch template user data              | first-boot packages and settings; runs `setup-instance.sh`                                                                                                                                                                                                                                                                                   |
| `setup-instance.sh`                                      | `/usr/local/sbin/glazecalc-setup.sh`   | installs the SSM agent, AWS CLI, Docker, nginx, certbot; installs the files below; first deploy                                                                                                                                                                                                                                              |
| `compose.prod.yaml`                                      | `/opt/glazecalc/`                      | the app image from GHCR plus MongoDB with production settings                                                                                                                                                                                                                                                                                |
| `deploy.sh`                                              | `/opt/glazecalc/`                      | deploys an image tag: pulls it first (only master builds that passed CI exist), then takes the Compose file and these scripts from the image's commit, re-running itself if `deploy.sh` changed; refreshes the secret; restarts the previous version if the new one fails; loads the standard materials, additives and advice from the image |
| `enable-https.sh`                                        | `/opt/glazecalc/`                      | once, after the DNS switch: certificate from Let's Encrypt, nginx to HTTPS; re-run to refresh the nginx files                                                                                                                                                                                                                                |
| `backup.sh`                                              | `/opt/glazecalc/`                      | `mongodump` (without the deletion log) to a local file, then to the S3 backup bucket once it is whole, with the log beside it                                                                                                                                                                                                                |
| `restore.sh`                                             | `/opt/glazecalc/`                      | restores a dump, then deletes again every account in the deletion log before the app starts (see below)                                                                                                                                                                                                                                      |
| `nginx/glazecalc-http.conf`                              | `/etc/nginx/sites-available/glazecalc` | first-boot site: plain HTTP to the app, plus Let's Encrypt's check path                                                                                                                                                                                                                                                                      |
| `nginx/glazecalc.conf`                                   | `/etc/nginx/sites-available/glazecalc` | after `enable-https.sh`: HTTPS, http→https and www→bare-domain redirects, HSTS                                                                                                                                                                                                                                                               |
| `nginx/glazecalc-proxy.conf`, `nginx/glazecalc-tls.conf` | `/etc/nginx/snippets/`                 | proxy settings and headers; TLS settings (Mozilla intermediate)                                                                                                                                                                                                                                                                              |
| `systemd/*`                                              | `/etc/systemd/system/`                 | the units listed above                                                                                                                                                                                                                                                                                                                       |
| `aws/*.json`                                             | IAM, SSM, DLM                          | instance role, GitHub deploy role and its one command document, CLI user policy, snapshot policy                                                                                                                                                                                                                                             |

Settings come from SSM Parameter Store, never from the repository or user data:
`/glazecalc/app-secret` (SecureString), `/glazecalc/backup-bucket`, `/glazecalc/smtp-url` (SecureString,
the SES SMTP credentials that turn email on; see aws/README.md section 14), and optionally
`/glazecalc/acme-email` (Let's Encrypt account contact).

Day to day:

- **Deploy:** Actions → Deploy → Run workflow (blank tag = the current master commit).
- **Roll back:** run Deploy with the previous `sha-<commit>` tag (each deploy prints it). A
  deploy whose image fails to pull or to become healthy rolls itself back and fails the run.
- **Shell:** `aws ssm start-session --target <instance-id>` (no SSH, port 22 is closed).
- **Logs:** `sudo docker compose -f /opt/glazecalc/compose.prod.yaml logs -f app`,
  `/var/log/nginx/access.log` and `error.log`, `journalctl -u glazecalc-backup`.
- **Certificate:** `sudo certbot certificates` (expiry), `systemctl list-timers certbot`
  (next renewal check), `sudo certbot renew --dry-run` (test a renewal).
- **nginx changes:** edit the files in `deploy/nginx/`, merge, then run
  `sudo /opt/glazecalc/enable-https.sh` on the instance (it checks the files with `nginx -t`
  and puts the old ones back if they fail).
- **Restore a dump:** `sudo /opt/glazecalc/restore.sh mongodump/glazecalc-<time>.archive.gz`; see below.

## Restoring a backup

A backup made before an account was deleted still holds that account. The app logs each
deletion by account id and time (no email) in the `deletions` collection, keeps each entry 37
days (longer than any backup lives: dumps 30 days, snapshots 7), and deletes those accounts
again, with the same code that deleted them, before it serves anyone: each time it starts, and
in `restore.sh`. Nightly dumps leave the log out, so a restore with `--drop` keeps the live log;
each dump has a copy of the log beside it, `mongodump/glazecalc-<time>.deletions.archive.gz`.

**From a dump, onto the running instance** (the usual case):

```bash
aws s3 ls s3://glazecalc-backups-<account>/mongodump/          # pick a dump
sudo /opt/glazecalc/restore.sh mongodump/glazecalc-<time>.archive.gz
```

It stops the app, restores the dump with `--drop` (leaving the log out), runs
`node server/reapply_deletions.ts` in the app's image (it prints how many accounts and records
came back and went again), and starts the app only if that worked. With an empty log it stops
before changing anything: pass `--log` (below), or `--without-log` if no account was ever
deleted. Never restore a dump with `mongorestore` alone.

**Onto a new database** (the volume or the instance was lost): the live log is gone too, so
add the newest saved copy first. `restore.sh` adds it to the (empty) log, then restores:

```bash
sudo /opt/glazecalc/restore.sh mongodump/glazecalc-<time>.archive.gz \
  --log mongodump/glazecalc-<newest time>.deletions.archive.gz
```

**From an EBS snapshot** (the whole volume, the log in it as old as the snapshot): before
replacing the volume, save the live log if the database still runs:
`sudo docker compose -f /opt/glazecalc/compose.prod.yaml exec -T mongo mongodump --db glazecalc --collection deletions --archive --gzip > /var/tmp/deletions.archive.gz`,
then copy it off the volume (`aws s3 cp /var/tmp/deletions.archive.gz s3://glazecalc-backups-<account>/mongodump/deletions-saved.archive.gz`).
If the database no longer runs, use the newest `<dump>.deletions.archive.gz` instead.
The restored instance starts the app at boot with the snapshot's log, so at once, in a shell on it:

```bash
cd /opt/glazecalc && sudo docker compose -f compose.prod.yaml stop app
aws s3 cp s3://glazecalc-backups-<account>/mongodump/deletions-saved.archive.gz /var/tmp/deletions.archive.gz
sudo docker compose -f compose.prod.yaml exec -T mongo mongorestore --archive --gzip \
  --nsInclude glazecalc.deletions < /var/tmp/deletions.archive.gz       # no --drop: entries are added
sudo docker compose -f compose.prod.yaml run --rm --no-deps app node server/reapply_deletions.ts
sudo docker compose -f compose.prod.yaml up -d app
```

What this guarantees: after a restore by these steps, no account in the log is back, with
none of its records (recipes, materials, additives, firings, notes, advice, trash, reset
requests), and the app served nothing in between (except after a snapshot restore, from boot
until the steps above, for accounts deleted after the snapshot). What it does not: a deletion
made after the newest saved copy of the log, when the live database is lost too (at most a day
of deletions), comes back with the backup and has to be deleted by hand if someone says so;
copies outside these backups (the old 2017 snapshots and 2026-10-05 dumps, anything on a
local PC) are not covered; and an entry older than 37 days is gone, so never restore a backup
older than that.
