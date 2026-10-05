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

From the research (Debian cloud team, AWS, Docker, MongoDB and Caddy documentation):

- **Instance:** Debian 13 "trixie", official AMI from the Debian cloud team (owner account
  `136693071363`; look up the latest ID via the SSM public parameters under
  `/aws/service/debian/release/13/latest`). Debian 12 is LTS-only since June 2026.
- **Size:** `t4g.small` (2 vCPU Graviton, 2 GB). Set CPU credits to `standard` so a busy
  spell throttles instead of adding surprise charges (T4g defaults to `unlimited`).
- **Launch template:** IMDSv2 required with hop limit 2 (containers need the extra hop), 20 GB
  gp3 encrypted root volume, instance profile, detailed monitoring off (not needed at this size).
- **Access:** no SSH. Install the SSM agent from cloud-init (Debian AMIs do not include it) and
  use Session Manager. Security group: 80 and 443 from anywhere, nothing else.
- **Address:** one Elastic IP (about $3.65/month, billed even when idle), Route 53 A record.
- **HTTPS:** Caddy on the host (official apt repository), automatic Let's Encrypt certificates,
  `reverse_proxy 127.0.0.1:3000`. A load balancer would cost about $16-22/month more.
- **App:** Docker Engine and Compose from Docker's apt repository. Compose runs the app image
  and `mongo:9.0` with a named volume, started by a systemd unit at boot. MongoDB must run
  from the Docker image on Graviton: MongoDB publishes no arm64 Debian packages.
- **Images:** built in GitHub Actions for arm64, tagged with the commit, pushed to a registry
  (GHCR or ECR). The instance only pulls; nothing is built on it.
- **Deploys:** GitHub Actions assumes an AWS role through OIDC (no stored keys) that may only run
  SSM commands on instances tagged for this app; the command runs
  `docker compose pull && docker compose up -d`. Start with a manual-approval deploy job.
- **MongoDB settings** (production notes for 8.0+): transparent huge pages **enabled** (the old
  advice to disable them no longer applies), open-files limit at least 64000,
  `vm.swappiness=1`, a 1-2 GB swap file, and an explicit WiredTiger cache size in the container.
- **Backups:** daily EBS snapshots with Data Lifecycle Manager (keep 7), plus a nightly
  `mongodump --archive --gzip` to an S3 bucket with a 30-day expiry rule.
- **Monitoring:** status-check alarms that recover or reboot the instance, an external uptime
  check on `/api/health`, a monthly AWS budget alert, and Docker's `local` log driver (rotates).

Rough monthly cost in us-west-2, on-demand, before tax (check current pricing):
t4g.small about $12, 20 GB gp3 about $1.60, public IPv4 about $3.65, snapshots and S3 about $1,
Route 53 zone $0.50. **About $19/month.**

## Decisions needed

1. **Region:** stay in us-west-2 next to the old instance (simplest: same Route 53 setup, can
   copy the old volume's snapshot directly), or move to us-east-1.
2. **Registry:** GHCR (free, needs a read token on the instance) or ECR (pull access through the
   instance role, about $0.10/GB-month).
3. **Database:** self-hosted `mongo:9.0` on the instance (as planned) or MongoDB Atlas Flex
   (about $8-30/month, managed backups). Skip Amazon DocumentDB: partial MongoDB
   compatibility, not version 9, and far larger than needed.
4. **Email for Let's Encrypt** expiry notices, and whether to add `www.glazecalcapp.com`.

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

- `/api/health` endpoint that pings MongoDB; point the Docker, Compose, Playwright and CI health
  checks at it (code review finding: `/api/verify` stays healthy when the database is down).
- `compose.prod.yaml`: app image from the registry by tag, `mongo:9.0` with the ulimit, cache and
  `local` log driver settings, app on `127.0.0.1:3000`.
- `deploy/` folder: Caddyfile, systemd unit for Compose, cloud-init user-data (SSM agent, Docker,
  Caddy, swap, sysctl, unattended-upgrades), backup script and timer.
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
4. Switch the A record to the new Elastic IP; Caddy gets the certificate on the first request.
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
