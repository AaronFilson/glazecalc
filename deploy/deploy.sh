#!/usr/bin/env bash
# Deploys a glazecalc image on this instance. Run as root; the GitHub deploy
# workflow runs it through SSM Run Command, or run it by hand in Session Manager.
#
#   /opt/glazecalc/deploy.sh sha-<full commit SHA>   a commit's image (CI tags every master build)
#   /opt/glazecalc/deploy.sh latest                  the newest master build
#   /opt/glazecalc/deploy.sh --allow-pre-mfa sha-…   an image from before two-step sign-in (by hand only)
#
# To roll back, deploy the previous tag; it is printed at the end of each run.
# An image from before two-step sign-in is refused without --allow-pre-mfa:
# that code ignores the factors accounts have set, so it would sign them in
# with the password alone (deploy/README.md, "Roll back").
# If the new version fails to pull or to become healthy, the previous one is
# started again and nothing is recorded, so a reboot never starts a failed deploy.
# Each deploy first backs up MongoDB (backup.sh; GLAZECALC_SKIP_BACKUP=1 skips
# it, by hand only). It also loads the standard data that ships with the image,
# and the scripts here (deploy.sh, backup.sh, restore.sh, enable-https.sh,
# install-nginx.sh) and nginx's files are updated from the image's commit, so a
# change to them takes effect with the deploy that ships it.
set -euo pipefail

allow_pre_mfa=no
if [ "${1:-}" = --allow-pre-mfa ]; then
  allow_pre_mfa=yes
  shift
fi
tag="${1:-latest}"
if [[ ! "$tag" =~ ^(latest|sha-[0-9a-f]{40})$ ]] || [ "$#" -gt 1 ]; then
  echo "Usage: $0 [--allow-pre-mfa] latest | sha-<full 40-character commit SHA>" >&2
  exit 2
fi
dir=/opt/glazecalc
image=ghcr.io/aaronfilson/glazecalc
raw=https://raw.githubusercontent.com/AaronFilson/glazecalc
cd "$dir"

# The version running now. compose.prod.yaml and .env (read by Compose and by
# glazecalc.service at boot) describe it; they change only after the new one is
# healthy. Its image is kept by id too, since pulling "latest" over "latest"
# moves that tag to the new image. It is read from the container, so a re-run
# of this script after the pull still finds the old one.
previous=$(sed -n 's/^GLAZECALC_TAG=//p' .env 2>/dev/null || true)
running=$(docker compose -f compose.prod.yaml ps -a -q app 2>/dev/null || true)
previous_image=$( [ -n "$running" ] && docker inspect -f '{{.Image}}' "$running" 2>/dev/null || true)
# Its exact build, for rolling back by hand: "latest" names none.
previous_name=$previous
if [ -n "$previous_image" ]; then
  previous_ref=$(docker image inspect -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
    "$previous_image" 2>/dev/null || true)
  if [[ "$previous_ref" =~ ^[0-9a-f]{40}$ ]]; then previous_name="sha-$previous_ref"; fi
fi

# Until the new version is running, a failure points the tag back at the image
# that was running, so neither the rollback nor a reboot starts the new one.
put_back_tag() {
  if [ -n "$previous" ] && [ -n "$previous_image" ]; then
    docker tag "$previous_image" "$image:$previous" || true
  fi
}
trap put_back_tag EXIT

# Images exist only for master commits that passed CI, so pulling first proves
# the tag is a real build before any file from its commit is used. The image's
# revision label names that commit, so the scripts and Compose file below come
# from the image's own commit, "latest" included.
if ! docker pull --quiet "$image:$tag" >/dev/null; then
  echo "There is no published image $image:$tag (CI publishes one for each master commit)." >&2
  exit 1
fi
ref=$(docker image inspect -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image:$tag")
if [[ ! "$ref" =~ ^[0-9a-f]{40}$ ]]; then
  echo "$image:$tag has no commit label (org.opencontainers.image.revision)." >&2
  exit 1
fi

# Every image since two-step sign-in carries this label (Dockerfile). One
# without it is older code that ignores accounts' factors: deploying it turns
# two-step sign-in off for everyone without a word. Checked here, by the script
# running now, before any older deploy.sh from the image's commit takes over.
mfa_label=$(docker image inspect -f '{{ index .Config.Labels "com.glazecalcapp.two-step-sign-in" }}' "$image:$tag")
if [ "$mfa_label" != 1 ]; then
  if [ "$allow_pre_mfa" != yes ]; then
    echo "$image:$tag (${ref:0:7}) is from before two-step sign-in: it would sign every account in with" >&2
    echo "the password alone, ignoring the authenticator apps and passkeys they have set. Nothing was changed." >&2
    echo "To deploy it anyway, run by hand: $0 --allow-pre-mfa $tag (deploy/README.md, \"Roll back\")." >&2
    exit 1
  fi
  echo "Deploying $tag from before two-step sign-in (--allow-pre-mfa): accounts sign in with the password alone until a newer image is deployed." >&2
fi

# A backup before anything changes, since a release may add collections and
# indexes or change the shape of records. Made once per deploy, by whichever
# deploy.sh gets here first (GLAZECALC_BACKED_UP goes on to the new one below),
# and only while production's MongoDB runs: a new instance has nothing to save.
if [ -z "${GLAZECALC_BACKED_UP:-}" ] && [ "${GLAZECALC_SKIP_BACKUP:-}" != 1 ] \
  && [ -n "$(docker compose -f compose.prod.yaml ps -q --status running mongo 2>/dev/null)" ]; then
  echo "Backing up MongoDB before deploying."
  if ! ./backup.sh; then
    echo "The backup failed, so nothing was deployed. To deploy without one, by hand:" >&2
    echo "GLAZECALC_SKIP_BACKUP=1 $0 $tag" >&2
    exit 1
  fi
  export GLAZECALC_BACKED_UP=1
fi

# This commit's scripts. If deploy.sh itself changed, run the new one instead,
# once: it sees GLAZECALC_DEPLOY_REF and skips this step.
if [ "${GLAZECALC_DEPLOY_REF:-}" != "$ref" ]; then
  for f in deploy.sh backup.sh restore.sh enable-https.sh; do
    curl -fsSL "$raw/$ref/deploy/$f" -o "$f.new"
    bash -n "$f.new"
    chmod 750 "$f.new"
  done
  mv backup.sh.new backup.sh
  mv restore.sh.new restore.sh
  mv enable-https.sh.new enable-https.sh
  if ! cmp -s deploy.sh.new deploy.sh; then
    mv deploy.sh.new deploy.sh
    echo "deploy.sh changed in ${ref:0:7}; running the new version."
    GLAZECALC_DEPLOY_REF="$ref" exec "$dir/deploy.sh" "$tag"
  fi
  rm -f deploy.sh.new
fi
# install-nginx.sh too, outside the step above: a deploy.sh from before it
# hands over with that step done. Commits before it have none (a rollback):
# the copy here stays.
if curl -fsSL "$raw/$ref/deploy/install-nginx.sh" -o install-nginx.sh.new 2>/dev/null; then
  bash -n install-nginx.sh.new
  chmod 750 install-nginx.sh.new
  mv install-nginx.sh.new install-nginx.sh
fi
rm -f install-nginx.sh.new

# Region from the instance metadata service (IMDSv2).
token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
region=$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)

# The Compose file from the same commit as the image, so the two always match.
curl -fsSL "$raw/$ref/deploy/compose.prod.yaml" -o compose.prod.yaml.new

# APP_SECRET lives in SSM Parameter Store, never in the repository or user data,
# as do the MongoDB password and the two-step sign-in key below. SITE_URL is no
# secret: compose.prod.yaml sets it.
# app.env is written whole and then moved into place, so a failed read leaves
# the old one.
umask 077
secret=$(aws ssm get-parameter --region "$region" --name /glazecalc/app-secret --with-decryption \
  --query Parameter.Value --output text)
printf 'APP_SECRET=%s\n' "$secret" > app.env.new
unset secret
# The password of the app's MongoDB user. The app gets it in its connection
# string, and MongoDB (mongo.env) uses it to create the user in a new database.
# Letters and digits only (openssl rand -hex 32), so the string needs no escaping.
if ! mongo_password=$(aws ssm get-parameter --region "$region" --name /glazecalc/mongo-password --with-decryption \
    --query Parameter.Value --output text 2>ssm-error.txt); then
  cat ssm-error.txt >&2
  echo "Could not read /glazecalc/mongo-password (deploy/README.md, MongoDB sign-in); the running version is unchanged." >&2
  rm -f ssm-error.txt app.env.new mongo.env.new compose.prod.yaml.new
  exit 1
fi
rm -f ssm-error.txt
if [[ ! "$mongo_password" =~ ^[A-Za-z0-9]{20,}$ ]]; then
  echo "/glazecalc/mongo-password must be 20 or more letters and digits (openssl rand -hex 32); the running version is unchanged." >&2
  rm -f app.env.new mongo.env.new compose.prod.yaml.new
  exit 1
fi
printf 'MONGODB_URI=mongodb://glazecalc:%s@mongo:27017/glazecalc?authSource=glazecalc\n' "$mongo_password" >> app.env.new
printf 'MONGO_APP_PASSWORD=%s\n' "$mongo_password" > mongo.env.new
unset mongo_password
# The key that encrypts authenticator-app secrets and hashes recovery codes
# (server/lib/mfa_key.ts): 32 random bytes, base64. The app does not start in
# production without it, so stop here with the running version unchanged
# (deploy/README.md, "Two-step sign-in key"). Never replace it once in use: a
# new key undoes every authenticator app and recovery code made with the old.
if ! mfa_key=$(aws ssm get-parameter --region "$region" --name /glazecalc/mfa-key --with-decryption \
    --query Parameter.Value --output text 2>ssm-error.txt); then
  cat ssm-error.txt >&2
  echo "Could not read /glazecalc/mfa-key (deploy/README.md, Two-step sign-in key); the running version is unchanged." >&2
  rm -f ssm-error.txt app.env.new mongo.env.new compose.prod.yaml.new
  exit 1
fi
rm -f ssm-error.txt
if [[ ! "$mfa_key" =~ ^[A-Za-z0-9+/]{43}=$ ]]; then
  echo "/glazecalc/mfa-key must be 32 bytes in base64 (openssl rand -base64 32); the running version is unchanged." >&2
  rm -f app.env.new mongo.env.new compose.prod.yaml.new
  exit 1
fi
printf 'MFA_KEY=%s\n' "$mfa_key" >> app.env.new
unset mfa_key
# Sign in with Google, GitHub and Microsoft (docs/adr/0015-provider-sign-in.md,
# 0023-microsoft-sign-in.md): each provider is on once both
# /glazecalc/<provider>-client-id and /glazecalc/<provider>-client-secret
# exist, and off, with no button, until then (deploy/README.md, "Sign in with
# Google, GitHub and Microsoft"). Any other error reading them stops the
# deploy here, rather than turning a provider off.
for provider in google github microsoft; do
  upper=$(printf '%s' "$provider" | tr '[:lower:]' '[:upper:]')
  if client_id=$(aws ssm get-parameter --region "$region" --name "/glazecalc/$provider-client-id" \
      --with-decryption --query Parameter.Value --output text 2>ssm-error.txt) \
    && client_secret=$(aws ssm get-parameter --region "$region" --name "/glazecalc/$provider-client-secret" \
      --with-decryption --query Parameter.Value --output text 2>ssm-error.txt); then
    printf '%s_CLIENT_ID=%s\n%s_CLIENT_SECRET=%s\n' "$upper" "$client_id" "$upper" "$client_secret" >> app.env.new
    echo "Sign in with $provider: on."
  elif grep -q ParameterNotFound ssm-error.txt; then
    echo "Sign in with $provider: off (no /glazecalc/$provider-client-id or -client-secret)."
  else
    cat ssm-error.txt >&2
    echo "Could not read /glazecalc/$provider-client-id or -client-secret; the running version is unchanged." >&2
    rm -f ssm-error.txt app.env.new mongo.env.new compose.prod.yaml.new
    exit 1
  fi
  rm -f ssm-error.txt
  unset client_id client_secret
done
# Email (Amazon SES over SMTP) is on once /glazecalc/smtp-url exists (see
# deploy/aws/create-mailer.sh); until then reset by email says it is unavailable.
# Any other error reading it (throttling, the network) stops the deploy here,
# rather than turning email off.
if smtp=$(aws ssm get-parameter --region "$region" --name /glazecalc/smtp-url --with-decryption \
    --query Parameter.Value --output text 2>ssm-error.txt); then
  printf 'MAIL_TRANSPORT=smtp\nSMTP_URL=%s\n' "$smtp" >> app.env.new
  echo "Email: on (SMTP settings from /glazecalc/smtp-url)."
elif grep -q ParameterNotFound ssm-error.txt; then
  echo "Email: off (no /glazecalc/smtp-url)."
else
  cat ssm-error.txt >&2
  echo "Could not read /glazecalc/smtp-url; the running version is unchanged." >&2
  rm -f ssm-error.txt app.env.new mongo.env.new compose.prod.yaml.new
  exit 1
fi
rm -f ssm-error.txt
unset smtp
mv app.env.new app.env
mv mongo.env.new mongo.env
umask 022

# Compose's progress lines go to stderr, where the SSM log shows them as if
# they were errors. Quiet still prints Compose's own errors; the states and the
# app's last lines below say the rest.
compose() { docker compose --progress quiet "$@"; }

restore_previous() {
  echo "Deploying $tag failed." >&2
  new ps -a --format '{{.Service}}: {{.Status}}' >&2 || true
  new logs --no-color --tail 20 app >&2 || true
  rm -f compose.prod.yaml.new
  if [ -n "$previous" ] && [ -f compose.prod.yaml ]; then
    put_back_tag
    echo "Starting the previous version again: $previous_name" >&2
    GLAZECALC_TAG="$previous" compose -f compose.prod.yaml up -d --remove-orphans \
      --wait --wait-timeout 180 \
      || echo "The previous version is not healthy either: docker compose -f $dir/compose.prod.yaml ps" >&2
  fi
  exit 1
}

new() { GLAZECALC_TAG="$tag" compose -f compose.prod.yaml.new "$@"; }
new pull --quiet || restore_previous
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
new up -d --remove-orphans --wait --wait-timeout 180 || restore_previous
# The app builds its indexes before it answers /api/health (server/main.ts). One
# it could not build, such as an index changed in place (IndexOptionsConflict),
# goes back to the previous version: drop the old index by hand, then deploy again
# (deploy/README.md, "An index the app cannot build"). GLAZECALC_ALLOW_INDEX_ERRORS=1,
# by hand only, keeps the new version anyway.
index_errors=$(new logs --no-color --since "$started" app 2>&1 | grep 'Could not build the indexes' || true)
if [ -n "$index_errors" ]; then
  echo "$index_errors" >&2
  if [ "${GLAZECALC_ALLOW_INDEX_ERRORS:-}" = 1 ]; then
    echo "Keeping $tag although it could not build an index (GLAZECALC_ALLOW_INDEX_ERRORS=1)." >&2
  else
    restore_previous
  fi
fi

mv compose.prod.yaml.new compose.prod.yaml
printf 'GLAZECALC_TAG=%s\n' "$tag" > .env
trap - EXIT
echo "Deployed $tag (previous: ${previous_name:-none})"
compose -f compose.prod.yaml ps --format '{{.Service}}: {{.Status}}'

# Standard materials, additives and advice from this image's data files. Safe to
# repeat: records are replaced by _id and users' own records are not touched.
if ! compose -f compose.prod.yaml run --rm --no-deps app node scripts/seed-standard.js; then
  echo "The app is running $tag, but loading the standard data failed; run deploy.sh again." >&2
  exit 1
fi

# Rolling back pulls an older image again, so keep only the images in use, and
# staging's: scripts/build-staging.sh labels them, and staging.sh keeps its
# current and previous ones (which may have no container, or come from S3 and
# cannot be pulled again) and removes the older ones itself.
docker image prune -af --filter 'label!=com.glazecalcapp.staging' >/dev/null

# nginx's files from the same commit (install-nginx.sh): the security headers,
# routes and log rules this code expects. If nginx rejects them it keeps its own.
if [ ! -x install-nginx.sh ]; then
  echo "nginx: no install-nginx.sh here or at ${ref:0:7}; nginx's files are unchanged."
elif ! ./install-nginx.sh production "$ref"; then
  echo "The app runs $tag, but nginx kept its previous files (above). Fix them and deploy again." >&2
  exit 1
fi

# Staging's scripts, once. A staging.sh from before it updated itself (without
# GLAZECALC_STAGING_SELF) is replaced by this commit's, with its Compose file
# and mongo-users.sh, so that the Deploy staging workflow can run it; from then
# on each staging deploy keeps them current and this leaves them alone. A
# running staging copy is not restarted. Never while staging.sh runs (its
# lock): the next deploy tries again.
if [ -f staging.sh ] && ! grep -q GLAZECALC_STAGING_SELF staging.sh; then
  exec 9> /run/glazecalc-staging.lock
  if ! flock -n 9; then
    echo "Staging's scripts: not updated now, as staging.sh is running; the next deploy will."
  elif curl -fsSL "$raw/$ref/deploy/staging.sh" -o staging.sh.new 2>/dev/null \
    && grep -q GLAZECALC_STAGING_SELF staging.sh.new && bash -n staging.sh.new \
    && curl -fsSL "$raw/$ref/deploy/mongo-users.sh" -o mongo-users.sh.new && bash -n mongo-users.sh.new \
    && curl -fsSL "$raw/$ref/deploy/compose.staging.yaml" -o compose.staging.yaml.new; then
    chmod 750 staging.sh.new mongo-users.sh.new
    mv mongo-users.sh.new mongo-users.sh
    mv compose.staging.yaml.new compose.staging.yaml
    mv staging.sh.new staging.sh
    echo "Staging's scripts: now ${ref:0:7}'s, which keep themselves current."
  else
    echo "Staging's scripts: not updated (${ref:0:7} has none that keep themselves current)."
  fi
  rm -f staging.sh.new mongo-users.sh.new compose.staging.yaml.new
  exec 9>&-
fi

curl -fsS http://127.0.0.1:3000/api/health && echo
