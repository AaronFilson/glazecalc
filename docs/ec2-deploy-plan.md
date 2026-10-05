# Plan: a new EC2 instance for glazecalcapp.com

Drafted 2026-10-05 on the `building10-4` branch, from the research summary below, the
AWS EC2 guidance, and a check of the current site. Nothing in AWS has been created or
changed yet.

## What exists today

| Item | Found |
| --- | --- |
| DNS | `glazecalcapp.com` A record → `34.211.187.250`, on Route 53 (ns-501.awsdns-62.com and others). No `www` record. |
| Server | Debian 12 (bookworm): SSH banner `OpenSSH_9.2p1 Debian-2+deb12u10`. The address is in AWS's us-west-2 (Oregon) range, so the instance is most likely there, not in us-east-1 (the CLI's default region). |
| Ports | 22 open. 80, 443, 3000 and 4000 refuse connections: the firewall lets them through but nothing is listening, so **the app is not running**, likely since a reboot (it was started by hand). 4001, 8080 and 27017 do not answer (blocked), so MongoDB is not exposed. |
| AWS CLI access | Works as IAM user `copper-bell` in account 724654236968, but that user has **no read permissions** (EC2, VPC, Route 53, SSM, ECR, IAM, S3, pricing and billing calls are all denied). So the instance itself, its volumes, security groups and the Route 53 zone could not be inspected. |

## Target design

From the research (Debian cloud team, AWS, Docker, MongoDB, nginx and certbot documentation):

- **Instance:** Debian 13 "trixie", official AMI from the Debian cloud team (owner account
  `136693071363`; look up the latest ID via the SSM public parameters under
  `/aws/service/debian/release/13/latest`). Debian 12 is LTS-only since June 2026.
- **Size:** `t4g.micro` (2 vCPU Graviton, 1 GB; MongoDB cache 0.25 GB plus 2 GB swap). Fine for
  this site's traffic; `t4g.small` (2 GB) is the step up if memory gets tight. Set CPU credits to `standard` so a busy
  spell throttles instead of adding surprise charges (T4g defaults to `unlimited`).
- **Launch template:** IMDSv2 required with hop limit 1 (keeps the instance role's
  credentials away from the containers; only host scripts use the role), 20 GB
  gp3 encrypted root volume, instance profile, detailed monitoring off (not needed at this size).
- **Access:** no SSH. Install the SSM agent from cloud-init (Debian AMIs do not include it) and
  use Session Manager. Security group: 80 and 443 from anywhere, nothing else.
- **Address:** one Elastic IP (about $3.65/month, billed even when idle), Route 53 A record.
- **HTTPS:** nginx on the host with a Let's Encrypt certificate from certbot (both from Debian's
  own repository; `certbot.timer` renews), proxying to `127.0.0.1:3000`. Chosen over Caddy
  (automatic HTTPS) because nginx is the industry standard worth knowing; the cost is one
  manual step, `enable-https.sh` after the DNS switch. A load balancer would cost about $16-22/month more.
- **App:** Docker Engine and Compose from Docker's apt repository. Compose runs the app image
  and `mongo:9.0` with a named volume, started by a systemd unit at boot. MongoDB must run
  from the Docker image on Graviton: MongoDB publishes no arm64 Debian packages.
- **Images:** built in GitHub Actions for arm64, tagged with the commit, pushed to a registry
  (GHCR or ECR). The instance only pulls; nothing is built on it.
- **Deploys:** GitHub Actions assumes an AWS role through OIDC (no stored keys) that may only run
  one SSM command document, `glazecalc-deploy`, on instances tagged for this app. It runs
  `deploy.sh <tag>`, which pulls and starts the new image and goes back to the previous one if
  it fails its health check. Deploys wait for a manual approval.
- **MongoDB settings** (production notes for 8.0+): transparent huge pages **enabled** (the old
  advice to disable them no longer applies), open-files limit at least 64000,
  `vm.swappiness=1`, a 1-2 GB swap file, and an explicit WiredTiger cache size in the container.
- **Backups:** daily EBS snapshots with Data Lifecycle Manager (keep 7), plus a nightly
  `mongodump --archive --gzip` to an S3 bucket with a 30-day expiry rule.
- **Monitoring:** status-check alarms that recover or reboot the instance, an external uptime
  check on `/api/health`, a monthly AWS budget alert, and Docker's `local` log driver (rotates).

Rough monthly cost in us-west-2, on-demand, before tax (check current pricing):
t4g.micro about $6, 20 GB gp3 about $1.60, public IPv4 about $3.65, snapshots and S3 about $1,
Route 53 zone $0.50. **About $13/month** (the old t2.micro setup bills $15-17/month).

## Decisions (made 2026-10-05)

1. **Region:** us-west-2, next to the old instance.
2. **Registry:** GHCR, with the package public so the instance pulls without a token.
3. **Database:** self-hosted `mongo:9.0` in a container on the instance. (Not Atlas; not
   DocumentDB, which is only partly MongoDB-compatible.)
4. **Size:** `t4g.micro`, to save money at this site's traffic. (The owner's other site, a
   static shop page, goes to S3 separately and does not share this instance.)
5. **Running the AWS setup:** AWS CloudShell with the console login (see
   [deploy/aws/README.md](../deploy/aws/README.md)); the `copper-bell` key stays read-only.
6. **Old data:** start fresh; no restore for now. The old accounts are all the owner's own. A
   `mongodump` of `glazecalc_app_dev` taken 2026-10-05 is kept off the server in case it is
   wanted later (restore it with `mongorestore --nsFrom 'glazecalc_app_dev.*' --nsTo 'glazecalc.*'`).

Still open: the email address for Let's Encrypt expiry notices and the budget alert.

## Phases

### 0. AWS access for setup

- Give the setup identity read access so the account can be inspected (the managed
  `ReadOnlyAccess` policy is enough for planning). For the build itself it also needs to create
  EC2, IAM role, SSM, S3, DLM, CloudWatch and Route 53 resources.
- Better than a long-lived access key on an IAM user: IAM Identity Center with short-lived
  credentials (`aws login` / `aws sso login`). Rotate or remove the `copper-bell` key afterwards.

### 1. Rescue data from the old instance (before anything else)

1. Snapshot the old instance's EBS volume(s) in the console. This keeps a full copy whatever
   happens next.
2. Connect over SSH (`admin@34.211.187.250`, or whatever user that box uses), find the database
   name and version (`mongod --version`; the old app's `MONGOLAB_URI`), and check whether there
   are real users: `mongosh <db> --eval 'db.users.countDocuments()'`.
3. Dump it: `mongodump --uri "$MONGOLAB_URI" --archive=glazecalc-old.gz --gzip`, and copy the
   file off the server (`scp`). A logical dump restores fine into MongoDB 9.
4. Before importing into the new app, check for accounts whose emails differ only by case; the
   new case-insensitive unique index will not build while duplicates exist.

Notes for restored data: old password hashes still work; everyone signs in again because the
token secret changes; recipes saved by the old app display correctly (the app reads their
`uList` analysis); run `npm run seed` afterwards to refresh the standard materials, additives
and advice.

### 2. Repository work (no AWS needed)

**Done** on the `deploy-ec2` branch (2026-10-05): see [deploy/README.md](../deploy/README.md)
and the drafted AWS commands in [deploy/aws/README.md](../deploy/aws/README.md). The image is
published for both amd64 and arm64, so the instance type can still change.

- `/api/health` endpoint that pings MongoDB; point the Docker, Compose, Playwright and CI health
  checks at it (code review finding: `/api/verify` stays healthy when the database is down).
- `compose.prod.yaml`: app image from the registry by tag, `mongo:9.0` with the ulimit, cache and
  `local` log driver settings, app on `127.0.0.1:3000`.
- `deploy/` folder: nginx site files, systemd unit for Compose, cloud-init user-data (SSM agent,
  Docker, nginx, certbot, swap, sysctl, unattended-upgrades), backup script and timer.
- CI: build the arm64 image and push it to the registry on merges to master; a deploy workflow
  (OIDC role, `aws ssm send-command`) behind a manual approval.

### 3. Build the instance

AWS commands are drafted and reviewed before running; nothing is created without approval.

1. IAM: instance role with `AmazonSSMManagedInstanceCore` plus write access to the backup
   bucket (and ECR read if using ECR); GitHub OIDC provider and a deploy role limited to
   `ssm:SendCommand` on instances tagged `app=glazecalc`.
2. S3 backup bucket (private, encrypted, 30-day expiry), DLM snapshot policy on the tag.
3. Security group (80/443 only), launch template (above), instance, Elastic IP.
4. Alarms: `StatusCheckFailed_System` → recover, `StatusCheckFailed_Instance` → reboot;
   budget alert.

### 4. Cut over

1. Lower the Route 53 record's TTL to 60 seconds a day ahead.
2. Restore the dump into the new instance's MongoDB, run the seed, sign in and check recipes.
3. Test with a hosts-file entry pointing glazecalcapp.com at the new Elastic IP.
4. Switch the A record to the new Elastic IP, then run `enable-https.sh` on the instance to get the certificate and turn on HTTPS.
5. Keep the old instance **stopped, not terminated**, for two weeks with its snapshot; then
   terminate it and release its address (public IPv4 is billed while held).

### 5. After

- Test a restore from both backup types.
- Confirm Dependabot and CI keep the image current; patching of the host is unattended-upgrades.

## Not yet verified

- The old instance's region, size, volumes, security groups and IAM role (needs read access).
- Whether anyone has data on the old instance (phase 1).
- From the research: the exact SSM parameter names under `/latest`, whether Debian AMIs require
  IMDSv2 by default (the launch template sets it anyway), and which network configuration tool
  trixie cloud images use.
