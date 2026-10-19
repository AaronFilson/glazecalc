#!/usr/bin/env bash
# Installs glazecalc's nginx files from one commit of the repository, checks
# them with nginx -t and reloads nginx; if nginx rejects them, the files that
# were in place go back. Run as root. deploy.sh runs it after each production
# deploy and staging.sh after each staging one, each with its image's commit,
# so nginx always matches the code it serves; enable-https.sh runs it too.
#
#   install-nginx.sh production <commit>   production's site, the proxy and TLS snippets
#                                          and nginx's log rotation
#   install-nginx.sh staging <commit>      staging's site only (nginx/glazecalc-staging.conf)
#
# <commit> is a commit or a branch. Files already the same are left alone, and
# nginx is reloaded only when one changed. Nothing is installed before HTTPS is
# on (enable-https.sh makes the certificate), nor staging's site before the
# certificate has staging's name (enable-https.sh --with-staging): until then
# the HTTP-only site stays as setup-instance.sh installed it.
set -euo pipefail

usage() {
  echo "Usage: $0 production|staging <commit or branch>" >&2
  exit 2
}
fail() {
  echo "$*" >&2
  exit 1
}

[ $# -eq 2 ] || usage
site=$1
ref=$2
case "$site" in production | staging) ;; *) usage ;; esac
# It goes into a URL path: no "..", and no leading "/", "-" or ".".
if [[ ! "$ref" =~ ^[A-Za-z0-9_][A-Za-z0-9._/-]*$ ]] || [[ "$ref" == *..* ]]; then
  echo "'$ref' is not a branch or commit." >&2
  exit 2
fi
[ "$(id -u)" = 0 ] || fail "Run as root (sudo -i in Session Manager)."
# One install at a time: a production and a staging deploy can end together,
# and each nginx -t must see only its own new files.
exec 8> /run/glazecalc-nginx.lock
flock -w 120 8 || fail "Another install-nginx.sh is still running; nginx is unchanged."

raw=https://raw.githubusercontent.com/AaronFilson/glazecalc/$ref/deploy
cert=/etc/letsencrypt/live/glazecalcapp.com/cert.pem
staging=staging.glazecalcapp.com

if [ ! -f "$cert" ]; then
  echo "nginx: HTTPS is not on yet (enable-https.sh); the $site files are unchanged."
  exit 0
fi
if [ "$site" = staging ] \
  && ! openssl x509 -in "$cert" -noout -ext subjectAltName 2> /dev/null | grep -q "DNS:$staging"; then
  echo "nginx: the certificate has no $staging (enable-https.sh --with-staging); staging's site is unchanged."
  exit 0
fi

# Each file: where it is in the repository's deploy/, and where nginx reads it.
if [ "$site" = production ]; then
  files=(
    nginx/glazecalc-proxy.conf:/etc/nginx/snippets/glazecalc-proxy.conf
    nginx/glazecalc-tls.conf:/etc/nginx/snippets/glazecalc-tls.conf
    nginx/glazecalc.conf:/etc/nginx/sites-available/glazecalc
  )
else
  files=(nginx/glazecalc-staging.conf:/etc/nginx/sites-available/glazecalc-staging)
fi
enabled=/etc/nginx/sites-enabled/glazecalc-staging

new=$(mktemp -d)
backup=$(mktemp -d)
trap 'rm -rf "$new" "$backup"' EXIT

changed=()
for pair in "${files[@]}"; do
  src=${pair%%:*}
  dest=${pair#*:}
  curl -fsSL "$raw/$src" -o "$new/${dest##*/}" || fail "Could not download deploy/$src at $ref; nginx is unchanged."
  cmp -s "$new/${dest##*/}" "$dest" || changed+=("$pair")
done
# Staging's site comes from any branch staged: it may name only staging's host
# and never be the default server, so it can never answer for production.
if [ "$site" = staging ]; then
  site_file=$new/glazecalc-staging
  if grep -Eq '(^|[^#])\bdefault_server\b' "$site_file" \
    || grep -E '^\s*server_name\s' "$site_file" | grep -Eqv "^\s*server_name\s+$staging\s*;"; then
    fail "deploy/nginx/glazecalc-staging.conf at $ref names another host or a default server; nginx is unchanged."
  fi
fi
link_missing=false
if [ "$site" = staging ] && [ ! -e "$enabled" ]; then link_missing=true; fi

if [ ${#changed[@]} -gt 0 ] || [ "$link_missing" = true ]; then
  for pair in "${changed[@]}"; do
    dest=${pair#*:}
    if [ -f "$dest" ]; then cp -a "$dest" "$backup/${dest##*/}"; fi
    install -m 644 "$new/${dest##*/}" "$dest"
  done
  if [ "$link_missing" = true ]; then ln -s /etc/nginx/sites-available/glazecalc-staging "$enabled"; fi
  if ! nginx -t; then
    for pair in "${changed[@]}"; do
      dest=${pair#*:}
      if [ -f "$backup/${dest##*/}" ]; then cp -a "$backup/${dest##*/}" "$dest"; else rm -f "$dest"; fi
    done
    if [ "$link_missing" = true ]; then rm -f "$enabled"; fi
    fail "nginx rejected the $site files from $ref; the previous ones are back in place."
  fi
  systemctl reload nginx
  for pair in "${changed[@]}"; do echo "nginx: installed deploy/${pair%%:*} from $ref."; done
  if [ "$link_missing" = true ]; then echo "nginx: staging's site is on."; fi
else
  echo "nginx: the $site files are already those of $ref."
fi

# The nginx log rotation (14 days, as the privacy notice says), with
# production's files. Debian's cloud image has no logrotate, and an instance
# set up before setup-instance.sh installed it rotated nothing, so it is
# installed here once (its logrotate.timer runs daily). A failed download or
# an invalid file leaves the one in use, saying why.
if [ "$site" = production ]; then
  if ! command -v logrotate > /dev/null; then
    echo 'nginx: logrotate is not installed, so the logs are never rotated; installing it.'
    DEBIAN_FRONTEND=noninteractive apt-get -o DPkg::Lock::Timeout=120 install -y -q logrotate > /dev/null \
      || echo 'nginx: could not install logrotate (above); install it by hand: apt-get install -y logrotate' >&2
  fi
  if ! curl -fsSL "$raw/logrotate/nginx" -o "$new/logrotate-nginx"; then
    echo 'nginx: could not download the log rotation; the current one is unchanged.' >&2
  elif ! command -v logrotate > /dev/null; then
    echo 'nginx: no logrotate, so the log rotation is unchanged.' >&2
  elif ! check=$(logrotate --debug "$new/logrotate-nginx" 2>&1); then
    echo "$check" | grep -iE 'error|warning' | head -5 >&2
    echo 'nginx: logrotate refused the new log rotation (above); the current one is unchanged.' >&2
  elif ! cmp -s "$new/logrotate-nginx" /etc/logrotate.d/nginx; then
    install -m 644 "$new/logrotate-nginx" /etc/logrotate.d/nginx
    echo 'nginx: installed the log rotation (14 days).'
  fi
fi
