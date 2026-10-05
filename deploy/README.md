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
app can be checked by IP address before the DNS switch. After DNS points at the instance,
`enable-https.sh` (run once) gets the certificate and switches nginx to `nginx/glazecalc.conf`.

| File | Where it ends up | What it does |
| --- | --- | --- |
| `cloud-init.yaml` | launch template user data | first-boot packages and settings; runs `setup-instance.sh` |
| `setup-instance.sh` | `/usr/local/sbin/glazecalc-setup.sh` | installs the SSM agent, AWS CLI, Docker, nginx, certbot; installs the files below; first deploy |
| `compose.prod.yaml` | `/opt/glazecalc/` | the app image from GHCR plus MongoDB with production settings |
| `deploy.sh` | `/opt/glazecalc/` | deploys an image tag; refreshes the Compose file and secret; restarts the previous version if the new one fails; loads the standard materials, additives and advice from the image |
| `enable-https.sh` | `/opt/glazecalc/` | once, after the DNS switch: certificate from Let's Encrypt, nginx to HTTPS; re-run to refresh the nginx files |
| `backup.sh` | `/opt/glazecalc/` | `mongodump` streamed to the S3 backup bucket |
| `nginx/glazecalc-http.conf` | `/etc/nginx/sites-available/glazecalc` | first-boot site: plain HTTP to the app, plus Let's Encrypt's check path |
| `nginx/glazecalc.conf` | `/etc/nginx/sites-available/glazecalc` | after `enable-https.sh`: HTTPS, http→https and www→bare-domain redirects, HSTS |
| `nginx/glazecalc-proxy.conf`, `nginx/glazecalc-tls.conf` | `/etc/nginx/snippets/` | proxy settings and headers; TLS settings (Mozilla intermediate) |
| `systemd/*` | `/etc/systemd/system/` | the units listed above |
| `aws/*.json` | IAM, SSM, DLM | instance role, GitHub deploy role and its one command document, CLI user policy, snapshot policy |

Settings come from SSM Parameter Store, never from the repository or user data:
`/glazecalc/app-secret` (SecureString), `/glazecalc/backup-bucket`, and optionally
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
- **Restore a dump:** see the comment at the top of `backup.sh`.
