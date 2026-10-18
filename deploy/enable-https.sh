#!/usr/bin/env bash
# Turns on HTTPS for glazecalcapp.com: gets a Let's Encrypt certificate with
# certbot and switches nginx from glazecalc-http.conf to glazecalc.conf.
#
# Run once as root after the DNS switch: Let's Encrypt checks both names over
# port 80, so they must already point at this instance. Running it again is
# safe; it keeps the current certificate and refreshes the nginx files
# (install-nginx.sh). certbot.timer renews the certificate and reloads nginx
# afterwards. Deploys install the nginx files themselves, so after the first
# run this is needed only to add staging's name to the certificate.
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
# nginx files come from the commits production and staging run (master's before
# the first deploy); GLAZECALC_STAGING_REF (a branch or commit) takes the staging
# site's file from there instead.
set -euo pipefail

with_staging=false
certbot_args=()
for arg in "$@"; do
  if [ "$arg" = --with-staging ]; then with_staging=true; else certbot_args+=("$arg"); fi
done
staging=staging.glazecalcapp.com
staging_ref=${GLAZECALC_STAGING_REF:-master}
# It goes into a URL path: no "..", and no leading "/", "-" or ".".
if [[ ! "$staging_ref" =~ ^[A-Za-z0-9_][A-Za-z0-9._/-]*$ ]] || [[ "$staging_ref" == *..* ]]; then
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

# Install the HTTPS site with install-nginx.sh, which keeps the current files
# until nginx accepts the new ones. Production's files come from the commit
# production runs (its image's label), as deploy.sh installs them; master's
# before the first deploy. Staging's from GLAZECALC_STAGING_REF, else the
# commit staging runs, else master.
image_commit() {
  docker image inspect -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
    "ghcr.io/aaronfilson/glazecalc:$1" 2> /dev/null || true
}
production_tag=$(sed -n 's/^GLAZECALC_TAG=//p' /opt/glazecalc/.env 2> /dev/null || true)
production_ref=$( [ -n "$production_tag" ] && image_commit "$production_tag" || true)
[[ "$production_ref" =~ ^[0-9a-f]{40}$ ]] || production_ref=master
if [ -z "${GLAZECALC_STAGING_REF:-}" ]; then
  staging_tag=$(sed -n 's/^GLAZECALC_STAGING_TAG=//p' /opt/glazecalc/staging.tag 2> /dev/null || true)
  running_staging=$( [ -n "$staging_tag" ] && image_commit "$staging_tag" || true)
  if [[ "$running_staging" =~ ^[0-9a-f]{40}$ ]]; then staging_ref=$running_staging; fi
fi

# deploy.sh keeps install-nginx.sh beside this script; a copy run from
# elsewhere (deploy/README.md, Staging, step 5) takes it from the same commit.
installer=/opt/glazecalc/install-nginx.sh
if [ ! -f "$installer" ]; then
  installer=$(mktemp)
  trap 'rm -f "$installer"' EXIT
  curl -fsSL "https://raw.githubusercontent.com/AaronFilson/glazecalc/$production_ref/deploy/install-nginx.sh" \
    -o "$installer"
fi
bash "$installer" production "$production_ref"
staging_site=false
if [ "$with_staging" = true ] || [ "$has_staging" = true ]; then
  bash "$installer" staging "$staging_ref"
  staging_site=true
fi

curl -fsS https://glazecalcapp.com/api/health
echo
if [ "$staging_site" = true ]; then
  # Informational: 200 while staging runs, 503 while it is stopped (staging.sh).
  echo "Staging site on: https://$staging/api/health answers $(curl -s -o /dev/null -w '%{http_code}' "https://$staging/api/health" || true)"
fi
echo 'HTTPS is on.'
