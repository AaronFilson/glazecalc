#!/usr/bin/env bash
# Turns on HTTPS for glazecalcapp.com: gets a Let's Encrypt certificate with
# certbot and switches nginx from glazecalc-http.conf to glazecalc.conf.
#
# Run once as root after the DNS switch: Let's Encrypt checks both names over
# port 80, so they must already point at this instance. Running it again is
# safe; it keeps the current certificate and refreshes the nginx files from
# master. certbot.timer renews the certificate and reloads nginx afterwards.
#
#   ./enable-https.sh --dry-run   test against Let's Encrypt's staging server
#                                 without saving a certificate or changing nginx
#   ./enable-https.sh --with-staging
#                                 also staging.glazecalcapp.com (docs/mfa-plan.md,
#                                 "Phase 2"): adds the name to the certificate
#                                 (certbot --expand) and turns on its nginx site,
#                                 nginx/glazecalc-staging.conf. Its DNS record
#                                 must exist first (deploy/README.md, Staging).
#
# Without --with-staging the certificate keeps the names it has: production's
# two, and the staging name only if it was added before (a run without the flag
# never removes it; deploy/README.md, Staging, says how to retire it). The
# nginx files come from master; GLAZECALC_STAGING_REF (a branch or commit) takes
# the staging site's file from there instead, to set staging up from a branch
# before it is merged. Production's files always come from master.
set -euo pipefail

with_staging=false
certbot_args=()
for arg in "$@"; do
  if [ "$arg" = --with-staging ]; then with_staging=true; else certbot_args+=("$arg"); fi
done
staging=staging.glazecalcapp.com
raw=https://raw.githubusercontent.com/AaronFilson/glazecalc/master/deploy/nginx
staging_ref=${GLAZECALC_STAGING_REF:-master}
if [[ ! "$staging_ref" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo "GLAZECALC_STAGING_REF '$staging_ref' is not a branch or commit." >&2
  exit 2
fi

domains=(glazecalcapp.com www.glazecalcapp.com)
cert=/etc/letsencrypt/live/glazecalcapp.com/cert.pem
has_staging=false
if [ -f "$cert" ] && openssl x509 -in "$cert" -noout -ext subjectAltName 2>/dev/null | grep -q "DNS:$staging"; then
  has_staging=true
fi
if [ "$with_staging" = true ] || [ "$has_staging" = true ]; then domains+=("$staging"); fi
expand=()
if [ "$with_staging" = true ] && [ "$has_staging" = false ]; then expand=(--expand); fi

token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')
imds() { curl -fsS -H "X-aws-ec2-metadata-token: $token" "http://169.254.169.254/latest/meta-data/$1"; }
region=$(imds placement/region)
public_ip=$(imds public-ipv4)

for name in "${domains[@]}"; do
  # getent fails when the name does not resolve at all; report that below too.
  resolved=$(getent ahostsv4 "$name" | awk 'NR == 1 { print $1 }' || true)
  if [ "$resolved" != "$public_ip" ]; then
    echo "$name resolves to '${resolved:-nothing}', not this instance ($public_ip)." >&2
    echo 'Point DNS here first (deploy/aws/README.md, DNS switch), then run this again.' >&2
    exit 1
  fi
done

# The contact email is optional: Let's Encrypt no longer sends expiry reminders,
# but uses it for notices about the account or problems with certificates.
email=$(aws ssm get-parameter --region "$region" --name /glazecalc/acme-email \
  --query Parameter.Value --output text 2>/dev/null || true)
if [ -n "$email" ]; then contact=(--email "$email"); else contact=(--register-unsafely-without-email); fi

certbot certonly --webroot --webroot-path /var/www/certbot \
  --non-interactive --agree-tos "${contact[@]}" \
  --cert-name glazecalcapp.com "${domains[@]/#/--domain=}" "${expand[@]}" \
  --keep-until-expiring --deploy-hook 'systemctl reload nginx' "${certbot_args[@]}"

if [[ " ${certbot_args[*]} " == *' --dry-run '* ]]; then
  echo 'Dry run passed; nothing was changed.'
  exit 0
fi

# Install the HTTPS site, keeping the current files until nginx accepts the new ones.
new=$(mktemp -d)
trap 'rm -rf "$new"' EXIT
for f in glazecalc-proxy.conf glazecalc-tls.conf glazecalc.conf; do
  curl -fsSL "$raw/$f" -o "$new/$f"
done
# The staging site, once the certificate has its name (after --with-staging).
staging_site=false
if [ "$with_staging" = true ] || [ "$has_staging" = true ]; then
  curl -fsSL "${raw%/master/deploy/nginx}/$staging_ref/deploy/nginx/glazecalc-staging.conf" \
    -o "$new/glazecalc-staging.conf"
  staging_site=true
fi
backup=$(mktemp -d)
cp -a /etc/nginx/snippets/glazecalc-proxy.conf /etc/nginx/sites-available/glazecalc "$backup/"
if [ -f /etc/nginx/sites-available/glazecalc-staging ]; then
  cp -a /etc/nginx/sites-available/glazecalc-staging "$backup/"
fi
staging_was_on=false
if [ -e /etc/nginx/sites-enabled/glazecalc-staging ]; then staging_was_on=true; fi
install -m 644 "$new/glazecalc-proxy.conf" "$new/glazecalc-tls.conf" /etc/nginx/snippets/
install -m 644 "$new/glazecalc.conf" /etc/nginx/sites-available/glazecalc
if [ "$staging_site" = true ]; then
  install -m 644 "$new/glazecalc-staging.conf" /etc/nginx/sites-available/glazecalc-staging
  ln -sf /etc/nginx/sites-available/glazecalc-staging /etc/nginx/sites-enabled/glazecalc-staging
fi
if ! nginx -t; then
  cp -a "$backup/glazecalc-proxy.conf" /etc/nginx/snippets/
  cp -a "$backup/glazecalc" /etc/nginx/sites-available/
  if [ -f "$backup/glazecalc-staging" ]; then
    cp -a "$backup/glazecalc-staging" /etc/nginx/sites-available/
  else
    rm -f /etc/nginx/sites-available/glazecalc-staging
  fi
  if [ "$staging_was_on" = false ]; then rm -f /etc/nginx/sites-enabled/glazecalc-staging; fi
  echo 'nginx rejected the new configuration; the previous one is back in place.' >&2
  exit 1
fi
rm -rf "$backup"
# The nginx log rotation (14 days) from the same place. A failed download or an
# invalid file leaves the one in use.
if curl -fsSL "${raw%/nginx}/logrotate/nginx" -o "$new/logrotate-nginx" \
  && logrotate --debug "$new/logrotate-nginx" >/dev/null 2>&1; then
  install -m 644 "$new/logrotate-nginx" /etc/logrotate.d/nginx
else
  echo 'Could not update the nginx log rotation; the current one is unchanged.' >&2
fi
systemctl reload nginx

curl -fsS https://glazecalcapp.com/api/health
echo
if [ "$staging_site" = true ]; then
  # Informational: 200 while staging runs, 503 while it is stopped (staging.sh).
  echo "Staging site on: https://$staging/api/health answers $(curl -s -o /dev/null -w '%{http_code}' "https://$staging/api/health" || true)"
fi
echo 'HTTPS is on.'
