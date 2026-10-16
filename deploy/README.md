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
| `logrotate/nginx`                                        | `/etc/logrotate.d/nginx`               | nginx's logs kept 14 days                                                                                                                                                                                                                                                                                                                    |
| `journald/glazecalc.conf`                                | `/etc/systemd/journald.conf.d/`        | the system journal kept 14 days                                                                                                                                                                                                                                                                                                              |
| `systemd/*`                                              | `/etc/systemd/system/`                 | the units listed above                                                                                                                                                                                                                                                                                                                       |
| `compose.staging.yaml`, `staging.sh`                     | `/opt/glazecalc/` (by hand)            | the staging copy: see "Staging" below                                                                                                                                                                                                                                                                                                        |
| `nginx/glazecalc-staging.conf`                           | `/etc/nginx/sites-available/`          | staging.glazecalcapp.com to 127.0.0.1:3001, after `enable-https.sh --with-staging`                                                                                                                                                                                                                                                           |
| `aws/*.json`                                             | IAM, SSM, DLM                          | instance role, GitHub deploy role and its one command document, CLI user policy, snapshot policy                                                                                                                                                                                                                                             |

Settings come from SSM Parameter Store, never from the repository or user data:
`/glazecalc/app-secret` (SecureString), `/glazecalc/mongo-password` (SecureString, the app's
MongoDB user), `/glazecalc/mfa-key` (SecureString, two-step sign-in's key; see "Two-step sign-in key"
below), `/glazecalc/backup-bucket`, `/glazecalc/smtp-url` (SecureString,
the SES SMTP credentials that turn email on; see aws/README.md section 14), and optionally
`/glazecalc/acme-email` (Let's Encrypt account contact).

Day to day:

- **Deploy:** Actions → Deploy → Run workflow (blank tag = the current master commit).
- **Roll back:** run Deploy with the previous `sha-<commit>` tag (each deploy prints it). A
  deploy whose image fails to pull or to become healthy rolls itself back and fails the run.
  `deploy.sh` refuses an image from before two-step sign-in (one without the Dockerfile's
  `com.glazecalcapp.two-step-sign-in` label): that code ignores the factors accounts have set
  and would sign them in with the password alone. If going back that far is truly needed, run it
  by hand in Session Manager, `sudo /opt/glazecalc/deploy.sh --allow-pre-mfa sha-<commit>` (the
  Deploy workflow cannot pass the flag), knowing two-step sign-in is off until a newer image is
  deployed; the factors stay stored and work again then.
- **Shell:** `aws ssm start-session --target <instance-id>` (no SSH, port 22 is closed).
- **Logs:** see "How long logs are kept" below. `sudo docker compose -f /opt/glazecalc/compose.prod.yaml logs -f app`,
  `/var/log/nginx/access.log` and `error.log`, `journalctl -u glazecalc-backup`.
- **Certificate:** `sudo certbot certificates` (expiry), `systemctl list-timers certbot`
  (next renewal check), `sudo certbot renew --dry-run` (test a renewal).
- **nginx changes:** edit the files in `deploy/nginx/`, merge, then run
  `sudo /opt/glazecalc/enable-https.sh` on the instance (it checks the files with `nginx -t`
  and puts the old ones back if they fail).
- **Restore a dump:** `sudo /opt/glazecalc/restore.sh mongodump/glazecalc-<time>.archive.gz`; see below.
- **Staging:** a branch on https://staging.glazecalcapp.com, deployed by hand; see "Staging" below.
- **Rate limits** (sign-in, sign-up, resets, second steps; `server/lib/rate_limit.ts`) count per
  client address or per account in the app's memory, so every deploy or restart starts them again.
- **Session cookie:** in production it is `__Host-glazecalc_session` (Secure, `Path=/`, no
  `Domain`), so no subdomain can set one the site would read. The older `glazecalc_session` is
  not read in production (one set for the whole domain by a subdomain or a hostile network would
  sign a browser into someone else's account), so **everyone signs in once more after the
  release that brought two-step sign-in**; replies that set or end a session clear the older
  cookie, both host-only and for `Domain=<the SITE_URL host>`, on `Path=/api`. HSTS does not
  include subdomains (`nginx/glazecalc.conf`): adding `includeSubDomains` would also stop a
  network from serving a fake `http://` subdomain, but it binds every future subdomain to HTTPS
  for a year, so it is left as an option for the owner.

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
`sudo docker compose -f /opt/glazecalc/compose.prod.yaml exec -T mongo sh -c 'mongodump --db glazecalc --collection deletions --archive --gzip --username glazecalc --password "$MONGO_APP_PASSWORD" --authenticationDatabase glazecalc' > /var/tmp/deletions.archive.gz`,
then copy it off the volume (`aws s3 cp /var/tmp/deletions.archive.gz s3://glazecalc-backups-<account>/mongodump/deletions-saved.archive.gz`).
If the database no longer runs, use the newest `<dump>.deletions.archive.gz` instead.
The restored instance starts the app at boot with the snapshot's log, so at once, in a shell on it:

```bash
cd /opt/glazecalc && sudo docker compose -f compose.prod.yaml stop app
aws s3 cp s3://glazecalc-backups-<account>/mongodump/deletions-saved.archive.gz /var/tmp/deletions.archive.gz
# No --drop: the entries are added.
sudo docker compose -f compose.prod.yaml exec -T mongo sh -c 'mongorestore --archive --gzip --nsInclude glazecalc.deletions \
  --username glazecalc --password "$MONGO_APP_PASSWORD" --authenticationDatabase glazecalc' < /var/tmp/deletions.archive.gz
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

**Two-step sign-in after a restore.** The factors live in each account's record, so a restore
brings back each account's two-step sign-in as it was on the backup's night: a factor removed
since then works again, a recovery code used since then works again, and one added since then is
gone. Nothing records these changes (docs/mfa-plan.md, decision 8). Email the affected people only
if someone asks; anyone can put things right on the account page.

## Two-step sign-in key

`MFA_KEY` encrypts each account's authenticator-app secret (AES-256-GCM) and hashes its recovery
codes (HMAC-SHA256), so the nightly dumps in S3 never hold a working secret or code. It is 32
random bytes in base64, kept in the SSM SecureString `/glazecalc/mfa-key`. `deploy.sh` copies it
into `/opt/glazecalc/app.env` and **stops, with the running version unchanged, if it is missing or
malformed**, as it does for `/glazecalc/mongo-password`. The app refuses to start in production
without it.

**Create it once, before deploying the release with two-step sign-in** (from a machine with the
operator profile):

```bash
export MSYS_NO_PATHCONV=1   # Git Bash only: else it turns /glazecalc/... into C:/Program Files/Git/glazecalc/...
aws ssm put-parameter --region us-west-2 --name /glazecalc/mfa-key --type SecureString --value "$(openssl rand -base64 32)"
```

The instance role already reads `/glazecalc/*` (`aws/instance-policy.json`), so nothing else
changes. Then:

- **Keep an offline copy** (in the owner's password manager), read with
  `aws ssm get-parameter --region us-west-2 --name /glazecalc/mfa-key --with-decryption --query Parameter.Value --output text`.
  The key is never in a dump, so a backup without it cannot restore authenticator apps or
  recovery codes.
- **Never replace it** once anyone uses two-step sign-in: with another key, every authenticator
  app and every recovery code stops working (`put-parameter` refuses to overwrite without
  `--overwrite`, which is the point). Passkeys do not depend on it. If it is lost, people with a
  passkey sign in with it and set up their app again; people with only an app or codes need the
  steps in "Someone lost every factor" below.
- **It cannot be rotated.** The stored secrets and hashes carry no key id, so the app knows only
  one key at a time: a new key needs code that reads both, which does not exist. Treat the key as
  permanent.
- **The instance clock must be right** for authenticator codes (30-second steps, one step either
  side). It should keep time with the Amazon Time Sync Service (169.254.169.123). Check with
  `chronyc tracking`: "Reference ID" names 169.254.169.123, the "System time" offset is well under
  a second and "Leap status" is Normal. (If `chronyc` is missing, `timedatectl timesync-status`
  shows systemd-timesyncd instead.) If codes are refused for everyone, look here first.
- **Each copy of the site has its own key.** A staging copy (phase 2 of docs/mfa-plan.md) uses
  `/glazecalc/staging/mfa-key`, so it can never decrypt production's secrets.

## Someone lost every factor

Someone who has lost their authenticator app, every passkey and every recovery code cannot sign
in, and a password reset does not turn two-step sign-in off. There is no admin route for this
over HTTP. The owner turns it off by hand, only for a request from the account's confirmed
address, after the requester has reset their password, with seven days' notice to that address
(the steps are in [docs/data-requests.md](../docs/data-requests.md), "Turning off two-step
sign-in"). Both steps refuse while the account's email changed less than 30 days ago, and say
from when they work; verify the requester another way until then (the same section). In a
Session Manager shell, as root:

```bash
cd /opt/glazecalc
# Day 0: email the account that two-step sign-in will be turned off in 7 days unless they reply.
docker compose -f compose.prod.yaml run --rm --no-deps app node server/clear_mfa.ts --notify someone@example.com
# Day 7 or later (refused before then): remove the factors and codes, sign out every device,
# and email that it was done.
docker compose -f compose.prod.yaml run --rm --no-deps app node server/clear_mfa.ts --clear someone@example.com
```

## How long logs are kept

| Log                                                     | Kept                                              | Set in                             |
| ------------------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| nginx `access.log` and `error.log`                      | 14 days (rotated daily)                           | `logrotate/nginx`                  |
| Container logs (app and MongoDB), `docker compose logs` | by size only: 5 files of 10 MB for each container | `x-logging` in `compose.prod.yaml` |
| The system journal                                      | 14 days                                           | `journald/glazecalc.conf`          |

Docker has no time limit for container logs. On a quiet day 50 MB reaches back many days;
under load it is hours. The app writes error codes and request paths, never email addresses
(a mail failure logs only the error's code), and MongoDB is started with `--slowms 2147483647`
so it never writes a slow query with its filter. The logrotate file and the journal setting
reach an existing instance when `enable-https.sh` is run again (logrotate) or by hand (journal, see below).

## MongoDB sign-in

MongoDB runs with `--auth` on the Compose network. The app's user, `glazecalc`, can read
and write the `glazecalc` database and nothing else. Its password is the SSM parameter
`/glazecalc/mongo-password`; `deploy.sh` puts it in `/opt/glazecalc/app.env` (the app's connection
string) and `/opt/glazecalc/mongo.env` (read by the MongoDB container), both readable by root only. MongoDB's
port is not published, so only the app container can reach it. A new instance gets the user
by itself, when MongoDB first starts on an empty data directory (`configs` in `compose.prod.yaml`).
An administrator, `glazecalc_admin` (role `userAdminAnyDatabase`: it makes and changes users, so
a new user needs no downtime), is for use by hand only. Its password is the SSM parameter
`/glazecalc/mongo-admin-password`, in no file on the instance; it was added with staging's user
(Staging, step 4). A user admin can grant itself any role, so treat it as MongoDB's root. To use it:
`docker exec -it "$(docker compose -f compose.prod.yaml ps -q mongo)" mongosh -u glazecalc_admin --authenticationDatabase admin`
(it asks for the password). A new instance's empty data directory gets only the app's user.
Local development and the tests use the root `compose.yaml` and a local MongoDB, both without sign-in.
To use sign-in there, put the user in `MONGODB_URI` (see `.env.example`).

`backup.sh` signs in as the same user (`mongodump` and `mongorestore` need only its read and write rights).
If you ever lock yourself out (the administrator's password lost too), stop the stack, start `mongod` once by hand without `--auth` on the
volume, and fix the user from there.

### Moving the live server to sign-in (once)

MongoDB's data volume already exists, so the image will not create the user: it is made by hand
while MongoDB still has no sign-in, **before** the release is deployed. The order matters. Create
the password, then the user, check it, then deploy. Deploying first would start MongoDB with
`--auth` and no user; `deploy.sh` would see the app unhealthy and roll itself back, harmlessly,
but the user must exist for the deploy to work. No data is touched at any point.

1. **Backup** (Session Manager, as root) and check it reached S3:

   ```bash
   /opt/glazecalc/backup.sh
   ```

   If it asks for a password, a deploy of this release was already tried and stopped at the missing
   parameter. `deploy.sh` updates the scripts before it reads the parameters, so `backup.sh` is
   already the new one, which signs in as a user that does not exist yet. The nightly backup fails
   the same way until step 5 is done. Press Ctrl+C and take this backup the old way, without
   sign-in:

   ```bash
   cd /opt/glazecalc
   bucket=$(aws ssm get-parameter --region us-west-2 --name /glazecalc/backup-bucket --query Parameter.Value --output text)
   key="mongodump/glazecalc-$(date -u +%Y-%m-%dT%H%M%SZ)-before-auth.archive.gz"
   docker compose -f compose.prod.yaml exec -T mongo mongodump --db glazecalc --archive --gzip --quiet > /var/tmp/before-auth.gz
   aws s3 cp /var/tmp/before-auth.gz "s3://$bucket/$key" --region us-west-2 --only-show-errors && rm -f /var/tmp/before-auth.gz
   ```

   Run steps 3 and 4 in the same root shell (`sudo -i` first: a new shell does not keep `$pw`).

2. **Make the password** (from a machine with the operator profile):

   ```bash
   aws ssm put-parameter --region us-west-2 --name /glazecalc/mongo-password --type SecureString \
     --value "$(openssl rand -hex 32)"
   ```

3. **Create the user** on the running database (Session Manager, as root):

   ```bash
   cd /opt/glazecalc
   pw=$(aws ssm get-parameter --region us-west-2 --name /glazecalc/mongo-password --with-decryption \
     --query Parameter.Value --output text)
   docker compose -f compose.prod.yaml exec -T -e MONGO_APP_PASSWORD="$pw" mongo mongosh --quiet --eval "
     db.getSiblingDB('glazecalc').createUser({
       user: 'glazecalc',
       pwd: process.env.MONGO_APP_PASSWORD,
       roles: [{ role: 'readWrite', db: 'glazecalc' }]
     })"
   ```

4. **Check that the user can sign in** and sees the data (the old stack keeps running):

   ```bash
   docker compose -f compose.prod.yaml exec -T -e PW="$pw" mongo sh -c \
     'mongosh --quiet "mongodb://glazecalc:$PW@localhost/glazecalc?authSource=glazecalc" \
       --eval "printjson(db.getCollectionNames())"'
   unset pw
   ```

5. **Deploy the release** (Actions → Deploy). `deploy.sh` reads the password, writes `app.env` and
   `mongo.env`, and recreates MongoDB with `--auth` and the app with the new connection string:
   under a minute of downtime.

6. **Check** (Session Manager, as root):

   ```bash
   curl -fsS http://127.0.0.1:3000/api/health
   cd /opt/glazecalc
   # Refused (Unauthorized) without a password:
   docker compose -f compose.prod.yaml exec -T mongo mongosh --quiet glazecalc --eval 'db.getCollectionNames()'
   # The nightly backup, by hand, and its result in S3:
   ./backup.sh
   ```

7. **The log settings** on the existing instance. The nginx rotation arrives with `sudo /opt/glazecalc/enable-https.sh`;
   the journal setting by hand:

   ```bash
   mkdir -p /etc/systemd/journald.conf.d
   curl -fsSL https://raw.githubusercontent.com/AaronFilson/glazecalc/master/deploy/journald/glazecalc.conf \
     -o /etc/systemd/journald.conf.d/glazecalc.conf
   systemctl restart systemd-journald
   ```

To go back, deploy the previous `sha-<commit>` tag: its Compose file starts MongoDB without
`--auth` and the app without a password, and the user stays unused in the database.

## Staging

A second copy of the app on the same instance, at **https://staging.glazecalcapp.com**, for testing
a branch in real browsers (a phone's authenticator app, real passkeys, real email) before it is
merged ([docs/mfa-plan.md](../docs/mfa-plan.md), "Phase 2"). It is deployed by hand: no CI, and
production's deploys are unchanged.

```
PC: scripts/build-staging.sh <branch> ─► ghcr.io/aaronfilson/glazecalc:staging-<sha>  (or S3, --to-s3)
Session Manager: /opt/glazecalc/staging.sh staging-<sha>
  nginx :443 staging.glazecalcapp.com ─► 127.0.0.1:3001 app (project glazecalc-staging, 300 MB)
                                             └─► production's mongo container, database glazecalc_staging,
                                                 user glazecalc_staging (that database only)
```

What keeps it apart from production:

- **Its own host name.** Passkeys belong to `staging.glazecalcapp.com` and never appear on
  production; sessions are host-only cookies; authenticator apps show "Glazecalc (staging)"; every
  page has a "Staging" banner and every mail subject starts with "[Staging]".
- **Its own Compose project** (`glazecalc-staging`, only the app), so nothing it does can stop or
  replace a production container. `staging.sh` names that project in every command and checks
  `compose.staging.yaml` before using it.
- **Its own database and user.** `glazecalc_staging` can read and write the database
  `glazecalc_staging` and nothing else. MongoDB's port stays unpublished: the staging app reaches
  it on `glazecalc_data`, an internal network with only MongoDB on it. Production's app is not on
  that network, so staging cannot reach it (nor send it a made-up client address to get round the
  limits per address).
- **Its own secrets** in `/glazecalc/staging/*` (`staging.sh` refuses any that is production's).
- **Mail only to the owner:** `MAIL_ALLOWLIST` from `/glazecalc/staging/mail-allowlist`; staging
  does not start without it. It shares production's SES settings.
- **No indexing:** `X-Robots-Tag: noindex, nofollow` (from nginx and the app), a robots.txt that
  disallows everything, no sitemap.
- **Never backed up**, never copied from production. Its data is for testing and can be emptied at
  any time.

### One-time setup

Each step is a command for the owner to review and run; none has been run. Steps 1 and 3 to 6 are
in a Session Manager shell on the instance as root (`sudo -i`); steps 2 and 7 on the PC with the
operator profile (copper-bell). The instance role already reads `/glazecalc/*`
(`aws/instance-policy.json`) and the operator policy already writes those parameters and changes
`*.glazecalcapp.com` records, so no IAM change is needed (except for the optional S3 route, step 8).

1. **Swap.** A second Node process needs about 150 to 250 MB; `staging.sh` refuses to start without
   swap. `setup-instance.sh` made a 2 GB `/swapfile` at first boot, so this should already show it:

   ```bash
   swapon --show
   free -m
   ```

   Only if `swapon --show` prints nothing (1 GB, as the plan asks; kept across reboots):

   ```bash
   fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

2. **DNS:** an A record for `staging.glazecalcapp.com`, the same address as the site (Route 53 zone
   for glazecalcapp.com). `CREATE` fails rather than overwrite an existing record.

   ```bash
   ZONE=$(aws route53 list-hosted-zones-by-name --dns-name glazecalcapp.com \
     --query 'HostedZones[0].Id' --output text)
   IP=$(aws route53 list-resource-record-sets --hosted-zone-id "$ZONE" \
     --query "ResourceRecordSets[?Name=='glazecalcapp.com.' && Type=='A'].ResourceRecords[0].Value" --output text)
   echo "$ZONE $IP"   # expect /hostedzone/Z383KEIS9CPHD5 44.229.21.212
   # One command (&&): the record is sent only once the file is written, and the file removed after.
   cat > staging-dns.json <<EOF &&
   {
     "Comment": "Staging copy of glazecalc on the production instance (deploy/README.md, Staging)",
     "Changes": [
       {
         "Action": "CREATE",
         "ResourceRecordSet": {
           "Name": "staging.glazecalcapp.com",
           "Type": "A",
           "TTL": 300,
           "ResourceRecords": [{ "Value": "$IP" }]
         }
       }
     ]
   }
   EOF
   aws route53 change-resource-record-sets --hosted-zone-id "$ZONE" --change-batch file://staging-dns.json &&
     rm staging-dns.json
   ```

   **The parameters** (same machine). New secrets, never production's. Unlike production's key,
   the staging key may be replaced at any time: staging's data is disposable. The allowlist is the
   addresses (or `@domain`s) staging may mail, separated by commas.

   ```bash
   export MSYS_NO_PATHCONV=1   # Git Bash only: else it turns /glazecalc/... into C:/Program Files/Git/glazecalc/...
   aws ssm put-parameter --region us-west-2 --name /glazecalc/staging/app-secret --type SecureString \
     --value "$(openssl rand -base64 48)"
   aws ssm put-parameter --region us-west-2 --name /glazecalc/staging/mfa-key --type SecureString \
     --value "$(openssl rand -base64 32)"
   aws ssm put-parameter --region us-west-2 --name /glazecalc/staging/mongo-password --type SecureString \
     --value "$(openssl rand -hex 32)"
   aws ssm put-parameter --region us-west-2 --name /glazecalc/staging/mail-allowlist --type SecureString \
     --value 'you@example.com,you@example.org'
   ```

   And production MongoDB's administrator (MongoDB sign-in), made with staging's user in step 4:

   ```bash
   aws ssm put-parameter --region us-west-2 --name /glazecalc/mongo-admin-password --type SecureString \
     --value "$(openssl rand -hex 32)"
   ```

3. **The files.** `staging.sh`, `mongo-users.sh` and `compose.staging.yaml` are not installed by `deploy.sh` or
   `setup-instance.sh`; take them from a pushed branch or commit (`mfa` until it is merged, then
   `master`). Run this again whenever they change.

   ```bash
   ref=mfa
   cd /opt/glazecalc
   for f in staging.sh mongo-users.sh compose.staging.yaml; do
     curl -fsSL "https://raw.githubusercontent.com/AaronFilson/glazecalc/$ref/deploy/$f" -o "$f.new"
   done
   bash -n staging.sh.new && bash -n mongo-users.sh.new && mv staging.sh.new staging.sh &&
     mv mongo-users.sh.new mongo-users.sh && mv compose.staging.yaml.new compose.staging.yaml
   chmod 750 staging.sh mongo-users.sh
   ```

4. **The database users.** Production's MongoDB had no administrator, only the app's user, so
   `mongo-users.sh` (installed in step 3) adds staging's user and the administrator
   (`glazecalc_admin`, MongoDB sign-in) with MongoDB started once without sign-in, cut off from
   every network, on the volumes production's MongoDB container uses. **Production is down for
   about a minute**: do it at a quiet time. Data is not changed. It checks everything first (the
   container, its volumes, both passwords from SSM, production healthy), asks you to type `yes`,
   runs `backup.sh`, and from the moment production stops, starts it again whatever happens. A
   user already there is left as it is, so it can be run again. Later users need no downtime: the
   administrator makes them.

   ```bash
   /opt/glazecalc/mongo-users.sh
   ```

   It ends with each user's roles: `[{"role":"readWrite","db":"glazecalc_staging"}]` and
   `[{"role":"userAdminAnyDatabase","db":"admin"}]`.

   **The network staging uses to reach MongoDB, until the merge.** Staging joins `glazecalc_data`,
   which `compose.prod.yaml` makes once two-step sign-in is merged and deployed. Until then
   production runs master's Compose file, without it, so make it by hand, with the labels Compose
   gives its own networks: the first production deploy with the merged file then takes it over as
   is, with staging running (checked with stand-in containers on Docker 29 and Compose 5.6). No
   downtime: MongoDB joins the network while it runs.

   ```bash
   docker network create --internal \
     --label com.docker.compose.project=glazecalc --label com.docker.compose.network=data \
     glazecalc_data
   docker network connect --alias mongo glazecalc_data "$(docker compose -f compose.prod.yaml ps -q mongo)"
   docker network inspect -f '{{.Internal}} {{range .Containers}}{{.Name}} {{end}}' glazecalc_data
   # expect: true glazecalc-mongo-1
   ```

   A production deploy that makes a new MongoDB container (master's file names MongoDB's image by
   digest, so only when that changes) leaves the new one off the network: staging then cannot reach
   its database, and the `docker network connect` line above puts it back. After the merge,
   production's deploys keep it on the network themselves.

5. **Certificate and nginx.** `enable-https.sh --with-staging` adds the name to the certificate
   (certbot `--expand`, checked against DNS first) and turns on `nginx/glazecalc-staging.conf`.
   Until the branch is merged, the instance's `enable-https.sh` (master's) does not know the flag,
   so run the branch's copy; production's nginx files still come from master.

   ```bash
   curl -fsSL https://raw.githubusercontent.com/AaronFilson/glazecalc/mfa/deploy/enable-https.sh \
     -o /var/tmp/enable-https.sh
   GLAZECALC_STAGING_REF=mfa bash /var/tmp/enable-https.sh --with-staging --dry-run
   GLAZECALC_STAGING_REF=mfa bash /var/tmp/enable-https.sh --with-staging
   rm /var/tmp/enable-https.sh
   ```

   After the merge it is `/opt/glazecalc/enable-https.sh --with-staging`. Later runs without the
   flag keep the staging name. While staging is stopped the site answers 503 "stopped".

6. **Check:** `curl -sI https://staging.glazecalcapp.com/` answers 503 with `x-robots-tag`, and
   `sudo certbot certificates` lists the three names.

7. **Docker on the PC.** The image is built where Docker runs: Docker Engine in WSL (`wsl -d Debian`),
   or Docker Desktop with Git Bash. The instance is arm64, so Docker needs arm64 emulation for the
   image's small runtime stages; Docker Desktop has it, Docker Engine in WSL gets it with one
   command, again after each WSL restart (`docker buildx inspect default` then lists `linux/arm64`):

   ```bash
   docker run --privileged --rm tonistiigi/binfmt --install arm64
   ```

   **GHCR**, once per token: make a classic personal access token with only the `write:packages`
   scope and a short expiry (GitHub → Settings → Developer settings), then where Docker runs:

   ```bash
   docker login ghcr.io -u AaronFilson     # paste the token as the password
   ```

   The glazecalc package is public, so staging images can be pulled by anyone, as production's
   can. Delete old `staging-*` versions now and then (GitHub → Packages → glazecalc).

8. **Optional, instead of GHCR: images through S3** (no registry token on the PC). The admin lets
   the instance read `staging-images/` in the backup bucket, and the operator adds a rule that
   deletes those uploads after 7 days. `put-bucket-lifecycle-configuration` replaces every rule,
   so check the current ones first (`aws s3api get-bucket-lifecycle-configuration --bucket glazecalc-backups-724654236968`):
   the command below keeps `expire-dumps` as section 3 of aws/README.md made it.

   ```bash
   # Admin (CloudShell):
   aws iam put-role-policy --role-name glazecalc-instance --policy-name glazecalc-staging-images \
     --policy-document file://deploy/aws/staging-images-policy.json
   # Operator:
   aws s3api put-bucket-lifecycle-configuration --bucket glazecalc-backups-724654236968 --lifecycle-configuration \
     '{"Rules":[{"ID":"expire-dumps","Status":"Enabled","Filter":{"Prefix":"mongodump/"},"Expiration":{"Days":30}},{"ID":"expire-staging-images","Status":"Enabled","Filter":{"Prefix":"staging-images/"},"Expiration":{"Days":7}}]}'
   ```

### A test round

1. **Build and publish** on the PC, from the repository where Docker runs (step 7). Any branch or
   commit that has been committed; uncommitted changes are never included. It prints the next
   command. In WSL, from the repository's folder (`cd /mnt/c/Users/<you>/gh/glazecalc`):

   ```bash
   scripts/build-staging.sh mfa                    # or: --to-s3 glazecalc-backups-724654236968
   ```

   `--to-s3` needs the AWS CLI where it runs (WSL has none until it is installed there). Until the
   branch is merged, master's checkout has no `scripts/build-staging.sh`: run the branch's copy
   (`git show mfa:scripts/build-staging.sh > /tmp/build-staging.sh && bash /tmp/build-staging.sh mfa`),
   which builds the branch from a clean checkout of it whichever branch is checked out.

2. **Deploy** in Session Manager (`sudo -i`), with the tag it printed:

   ```bash
   /opt/glazecalc/staging.sh staging-<sha>
   ```

   It reads the parameters, pulls the image (checking that its label names the same commit),
   writes the root-only `staging.env`, starts the app and waits for `/api/health` on 3001, then
   loads the standard materials. If the new version does not become healthy, the staging version
   that was running is started again (or staging is left stopped) and it says so. A master
   build from CI works too: `staging.sh sha-<sha>`.

3. **Test** on the phone and the PC at https://staging.glazecalcapp.com.

4. **Repeat** from 1 with the next commit.

5. **Leave it running** between rounds, or stop it (`staging.sh stop`), as you like. It is capped
   small (below), and while nobody uses it the kernel moves its memory to swap, so production gets
   the memory back either way. Check with `staging.sh status`.

Also:

- `staging.sh status`: the running tag, its health, memory and swap, each container's memory.
- `staging.sh reset-db`: empties the staging database (every account and record) after you type
  its name, then reloads the standard data. It signs in as `glazecalc_staging`, which cannot touch
  production's database.
- Logs: `docker logs -f glazecalc-staging-app-1`; nginx writes `/var/log/nginx/staging-access.log`.
- After testing, remove the staging passkeys from the phone's password manager and the
  "Glazecalc (staging)" entries from the authenticator app.

Things to know:

- **Memory.** Staging's Node heap is capped at 96 MB (`NODE_OPTIONS`; about 30 MB in use at
  rest) and the container at 300 MB and half a processor; if the instance ever runs out, the
  kernel stops staging first (`oom_score_adj`). `staging.sh` loads the standard data in a second,
  short-lived container. If production slows while staging runs, stop staging; if it is often
  tight, move to a t4g.small (aws/README.md, "Defaults").
- **One MongoDB.** Staging's queries share production's `mongod` and its 0.25 GB cache. A heavy
  staging test slows production a little; nothing more.
- **Production's commands are unaffected,** with one exception: while staging runs,
  `docker compose -f compose.prod.yaml down` cannot remove `glazecalc_data` (staging is on it).
  Nothing here runs `down` (`glazecalc.service`, `deploy.sh` and `restore.sh` use `stop` and `up`);
  if you need it, run `staging.sh stop` first. A production deploy's `docker image prune` leaves staging's
  images alone (`scripts/build-staging.sh` labels them `com.glazecalcapp.staging`; one built before
  that label was added is removed when unused, so build it again), and `staging.sh` removes its own
  older ones.
- **The certificate now covers the staging name,** so certbot's renewals check it too: keep its DNS
  record while the name is on the certificate.

**Retiring staging:** `staging.sh stop`; `rm /etc/nginx/sites-enabled/glazecalc-staging && systemctl reload nginx`;
shrink the certificate to production's names with
`certbot certonly --webroot --webroot-path /var/www/certbot --non-interactive --cert-name glazecalcapp.com --domain glazecalcapp.com --domain www.glazecalcapp.com --deploy-hook 'systemctl reload nginx'`;
then delete the DNS record (`"Action": "DELETE"` with the same record), the four
`/glazecalc/staging/*` parameters, `/opt/glazecalc/{staging.sh,compose.staging.yaml,staging.env,staging.tag}`,
and the database (`dropDatabase` needs MongoDB without sign-in, as in step 4; an empty one can stay).
