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
set -euo pipefail

domains=(glazecalcapp.com www.glazecalcapp.com)
raw=https://raw.githubusercontent.com/AaronFilson/glazecalc/master/deploy/nginx

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
  --cert-name glazecalcapp.com "${domains[@]/#/--domain=}" \
  --keep-until-expiring --deploy-hook 'systemctl reload nginx' "$@"

if [[ " $* " == *' --dry-run '* ]]; then
  echo 'Dry run passed; nothing was changed.'
  exit 0
fi

# Install the HTTPS site, keeping the current files until nginx accepts the new ones.
new=$(mktemp -d)
trap 'rm -rf "$new"' EXIT
for f in glazecalc-proxy.conf glazecalc-tls.conf glazecalc.conf; do
  curl -fsSL "$raw/$f" -o "$new/$f"
done
backup=$(mktemp -d)
cp -a /etc/nginx/snippets/glazecalc-proxy.conf /etc/nginx/sites-available/glazecalc "$backup/"
install -m 644 "$new/glazecalc-proxy.conf" "$new/glazecalc-tls.conf" /etc/nginx/snippets/
install -m 644 "$new/glazecalc.conf" /etc/nginx/sites-available/glazecalc
if ! nginx -t; then
  cp -a "$backup/glazecalc-proxy.conf" /etc/nginx/snippets/
  cp -a "$backup/glazecalc" /etc/nginx/sites-available/
  echo 'nginx rejected the new configuration; the previous one is back in place.' >&2
  exit 1
fi
rm -rf "$backup"
systemctl reload nginx

curl -fsS https://glazecalcapp.com/api/health
echo
echo 'HTTPS is on.'
