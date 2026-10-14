#!/usr/bin/env bash
# Staging: a test build of glazecalc beside production on this instance, at
# https://staging.glazecalcapp.com (docs/mfa-plan.md, "Phase 2"; deploy/README.md,
# "Staging"). Run as root, by hand, in Session Manager; nothing in CI runs it.
#
#   /opt/glazecalc/staging.sh staging-<sha>   an image from scripts/build-staging.sh, pushed to GHCR
#   /opt/glazecalc/staging.sh sha-<sha>       a master build from CI, as production uses
#   /opt/glazecalc/staging.sh s3://<bucket>/staging-images/staging-<sha>.tar.gz
#                                             an image from build-staging.sh --to-s3
#   /opt/glazecalc/staging.sh status          what runs, its health, the instance's memory
#   /opt/glazecalc/staging.sh stop            stops staging between test rounds (frees its memory)
#   /opt/glazecalc/staging.sh reset-db        empties the staging database, after a typed confirmation
#
# <sha> is the full 40-character commit. A failed start puts the previous
# staging version back (or stops staging if there was none) and says so.
#
# Production is never touched, on any path:
#   - every Compose command goes through staging(), which names the project
#     glazecalc-staging and compose.staging.yaml, and checks that file first;
#     never compose.prod.yaml, app.env, mongo.env or .env (production's tag);
#   - the app signs in to MongoDB as glazecalc_staging, a user who can read and
#     write the database glazecalc_staging and nothing else, so even a mistake
#     here cannot read or change production's data;
#   - the staging secrets must differ from production's, and mail goes only to
#     the addresses in /glazecalc/staging/mail-allowlist, without which staging
#     does not start;
#   - production's MongoDB container is only used to run mongosh for reset-db,
#     signed in as glazecalc_staging;
#   - staging is never backed up (backup.sh dumps the glazecalc database only).
set -euo pipefail

dir=/opt/glazecalc
# The guards below depend on these three names; never point them at production.
project=glazecalc-staging
db=glazecalc_staging
file=$dir/compose.staging.yaml
env_file=$dir/staging.env
tag_file=$dir/staging.tag
image=ghcr.io/aaronfilson/glazecalc
health=http://127.0.0.1:3001/api/health

usage() {
  echo "Usage: $0 staging-<sha> | sha-<sha> | s3://<bucket>/staging-images/staging-<sha>.tar.gz | status | stop | reset-db" >&2
  exit 2
}
fail() {
  echo "$*" >&2
  exit 1
}

[ $# -eq 1 ] || usage
arg=$1
[ "$(id -u)" = 0 ] || fail "Run as root (sudo -i in Session Manager)."
[ "$project" = glazecalc-staging ] && [ "$db" = glazecalc_staging ] || fail "This script only runs staging."
cd "$dir"

# One run at a time.
exec 9> /run/glazecalc-staging.lock
flock -n 9 || fail "staging.sh is already running."

# Every Compose command for staging. --project-name keeps it in its own project
# whatever the file says; --env-file /dev/null keeps production's .env (its
# GLAZECALC_TAG) out of it. The image tag comes from $use_tag.
use_tag=
staging() {
  GLAZECALC_STAGING_TAG="${use_tag:-none}" docker compose --progress quiet --project-name "$project" \
    --project-directory "$dir" --env-file /dev/null -f "$file" "$@"
}

# compose.staging.yaml is installed by hand (deploy/README.md, "Staging"). Check
# that it is the staging file: its own project, only an app service.
[ -f "$file" ] || fail "$file is missing (deploy/README.md, Staging: install the files)."
grep -qx 'name: glazecalc-staging' "$file" || fail "$file is not the staging Compose file."
grep -qx '    env_file: /opt/glazecalc/staging.env' "$file" || fail "$file does not read staging.env."
if [ ! -f "$env_file" ]; then install -m 600 /dev/null "$env_file"; fi
services=$(staging config --services) || fail "$file is not valid Compose."
[ "$services" = app ] || fail "$file must have only the app service, not: $services"

# Production's MongoDB container, running; staging uses its server, never its database.
mongo_container() {
  docker ps -q --filter label=com.docker.compose.project=glazecalc \
    --filter label=com.docker.compose.service=mongo --filter status=running
}
running_tag() { sed -n 's/^GLAZECALC_STAGING_TAG=//p' "$tag_file" 2> /dev/null || true; }
healthy() { curl -fsS --max-time 5 "$health" 2> /dev/null; }

region() {
  if [ -n "${AWS_REGION:-}" ]; then
    echo "$AWS_REGION"
    return
  fi
  local token
  token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
  curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region
}

err=$(mktemp)
trap 'rm -f "$err" "$env_file.new"' EXIT

# One SSM parameter, decrypted. Any error stops here with staging unchanged, as
# deploy.sh does, naming the parameter.
param() {
  if ! aws ssm get-parameter --region "$region" --name "$1" --with-decryption \
    --query Parameter.Value --output text 2> "$err"; then
    cat "$err" >&2
    echo "Could not read $1 (deploy/README.md, Staging); staging is unchanged." >&2
    return 1
  fi
}

# Whether a line is in production's app.env. The value goes to grep on a pipe,
# never on a command line, where other users could see it.
in_production_env() { [ -f "$dir/app.env" ] && grep -qxF -f <(printf '%s\n' "$1") "$dir/app.env"; }

status() {
  local tag
  tag=$(running_tag)
  echo "Staging image: ${tag:-none yet}"
  staging ps -a --format '{{.Service}}: {{.Status}}'
  if healthy > /dev/null; then echo "Health: $(healthy)"; else echo "Health: not answering on $health"; fi
  echo
  free -m
  swapon --show
  docker stats --no-stream --format '{{.Name}}: {{.MemUsage}}'
}

case "$arg" in
  status)
    status
    exit 0
    ;;
  stop)
    use_tag=$(running_tag) staging down
    echo "Staging stopped. Start it again with: $0 $(running_tag)"
    exit 0
    ;;
  reset-db)
    # Drops every collection of glazecalc_staging, signed in as glazecalc_staging:
    # that user can drop nothing else. Typed confirmation, so never from Run Command.
    [ -t 0 ] || fail "reset-db asks for a typed confirmation; run it in a Session Manager shell."
    read -r -p "This deletes every account and record in the staging database $db. Type $db to go on: " answer
    [ "$answer" = "$db" ] || fail "Nothing was deleted."
    mongo=$(mongo_container)
    [ -n "$mongo" ] || fail "Production's MongoDB is not running; nothing was deleted."
    region=$(region)
    pw=$(param /glazecalc/staging/mongo-password)
    tag=$(running_tag)
    was_running=$(staging ps -q --status running app)
    if [ -n "$was_running" ]; then use_tag=$tag staging stop app; fi
    # mongosh connects without credentials and signs in from the environment, so
    # the password is on no command line. It refuses any other database.
    PW=$pw docker exec -i -e PW "$mongo" mongosh --quiet --norc "mongodb://localhost:27017/$db" --eval "
      const name = 'glazecalc_staging';
      if (db.getName() !== name) quit(2);
      db.auth(name, process.env.PW);
      const names = db.getCollectionNames();
      names.forEach((c) => db.getCollection(c).drop());
      print('Dropped ' + names.length + ' collections from ' + db.getName() + '.');
    " || fail "Emptying $db failed."
    unset pw
    if [ -n "$was_running" ]; then
      use_tag=$tag staging up -d --wait --wait-timeout 180
      use_tag=$tag staging run --rm --no-deps app node scripts/seed-standard.js
      echo "Staging is running $tag again, with the standard data only."
    fi
    exit 0
    ;;
esac

# Deploying an image. Its tag names its commit; the image's revision label must
# name the same one.
s3=
if [[ "$arg" =~ ^s3://[a-z0-9.-]+/staging-images/(staging-([0-9a-f]{40}))\.tar\.gz$ ]]; then
  s3=$arg
  tag=${BASH_REMATCH[1]}
  sha=${BASH_REMATCH[2]}
elif [[ "$arg" =~ ^(staging|sha)-([0-9a-f]{40})$ ]]; then
  tag=$arg
  sha=${BASH_REMATCH[2]}
else
  usage
fi
previous=$(running_tag)

# A second Node process on a 1 GB instance: only with swap to absorb peaks, so
# staging can never push production's MongoDB out of memory.
swapon --noheadings --show | grep -q . \
  || fail "No swap is on. Add the swap file first (deploy/README.md, Staging, step 1); nothing was changed."
docker network inspect glazecalc_default > /dev/null 2>&1 \
  || fail "Production's network glazecalc_default does not exist: start production first."
[ -n "$(mongo_container)" ] || fail "Production's MongoDB is not running: start production first."

region=$(region)

if [ -n "$s3" ]; then
  archive=$(mktemp /var/tmp/glazecalc-staging-image.XXXXXX)
  aws s3 cp "$s3" "$archive" --region "$region" --only-show-errors || {
    rm -f "$archive"
    fail "Could not download $s3; staging is unchanged."
  }
  docker load --quiet --input "$archive" > /dev/null || {
    rm -f "$archive"
    fail "$s3 is not an image archive; staging is unchanged."
  }
  rm -f "$archive"
elif ! docker pull --quiet "$image:$tag" > /dev/null; then
  fail "There is no image $image:$tag (scripts/build-staging.sh pushes one); staging is unchanged."
fi
ref=$(docker image inspect -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image:$tag" 2> /dev/null || true)
[ "$ref" = "$sha" ] || fail "$image:$tag is labelled with commit '${ref:-none}', not $sha; staging is unchanged."
[ "$(docker image inspect -f '{{.Architecture}}' "$image:$tag")" = "$(docker version -f '{{.Server.Arch}}')" ] \
  || fail "$image:$tag is not built for this instance's architecture; staging is unchanged."

# staging.env, from /glazecalc/staging/* and the shared SMTP setting. Written
# whole and moved into place, root-only.
umask 077
app_secret=$(param /glazecalc/staging/app-secret)
mfa_key=$(param /glazecalc/staging/mfa-key)
mongo_password=$(param /glazecalc/staging/mongo-password)
# Required: without it a staging database could email real people.
if ! allowlist=$(param /glazecalc/staging/mail-allowlist); then
  grep -q ParameterNotFound "$err" && echo "Staging never starts without a mail allowlist (deploy/README.md, Staging)." >&2
  exit 1
fi
allowlist=$(printf '%s' "$allowlist" | tr -d ' ')
[ -n "$allowlist" ] \
  || fail "/glazecalc/staging/mail-allowlist must be addresses or @domains, separated by commas; staging is unchanged."
IFS=, read -r -a entries <<< "$allowlist,"
for entry in "${entries[@]}"; do
  [[ "$entry" =~ ^([^@]+@|@)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$ ]] \
    || fail "/glazecalc/staging/mail-allowlist: '$entry' is not an address or an @domain; staging is unchanged."
done

[[ "$app_secret" =~ ^[A-Za-z0-9+/=_-]{32,}$ ]] \
  || fail "/glazecalc/staging/app-secret must be 32 or more characters (openssl rand -base64 48); staging is unchanged."
[[ "$mfa_key" =~ ^[A-Za-z0-9+/]{43}=$ ]] \
  || fail "/glazecalc/staging/mfa-key must be 32 bytes in base64 (openssl rand -base64 32); staging is unchanged."
[[ "$mongo_password" =~ ^[A-Za-z0-9]{20,}$ ]] \
  || fail "/glazecalc/staging/mongo-password must be 20 or more letters and digits (openssl rand -hex 32); staging is unchanged."
# Never production's: a shared key would let staging decrypt production's secrets.
if in_production_env "APP_SECRET=$app_secret" || in_production_env "MFA_KEY=$mfa_key" \
  || in_production_env "MONGODB_URI=mongodb://glazecalc:$mongo_password@mongo:27017/glazecalc?authSource=glazecalc"; then
  fail "A /glazecalc/staging/* secret is the same as production's; make a new one (openssl rand). Staging is unchanged."
fi

{
  printf 'APP_SECRET=%s\n' "$app_secret"
  printf 'MONGODB_URI=mongodb://%s:%s@mongo:27017/%s?authSource=%s\n' "$db" "$mongo_password" "$db" "$db"
  printf 'MFA_KEY=%s\n' "$mfa_key"
  printf 'MAIL_ALLOWLIST=%s\n' "$allowlist"
} > "$env_file.new"
unset app_secret mfa_key mongo_password
# The shared SES setting, as deploy.sh reads it: MAIL_ALLOWLIST keeps it to the owner.
if smtp=$(param /glazecalc/smtp-url 2> /dev/null); then
  printf 'MAIL_TRANSPORT=smtp\nSMTP_URL=%s\n' "$smtp" >> "$env_file.new"
  echo "Email: on, to $allowlist only."
elif grep -q ParameterNotFound "$err"; then
  echo "Email: off (no /glazecalc/smtp-url)."
else
  cat "$err" >&2
  fail "Could not read /glazecalc/smtp-url; staging is unchanged."
fi
unset smtp
grep -q '^MAIL_ALLOWLIST=.' "$env_file.new" || fail "No MAIL_ALLOWLIST; staging is unchanged."
mv "$env_file.new" "$env_file"
umask 022

restore_previous() {
  echo "Staging $tag failed." >&2
  use_tag=$tag staging ps -a --format '{{.Service}}: {{.Status}}' >&2 || true
  use_tag=$tag staging logs --no-color --tail 30 app >&2 || true
  if [ -n "$previous" ] && [ "$previous" != "$tag" ]; then
    echo "Starting the previous staging version again: $previous" >&2
    if use_tag=$previous staging up -d --wait --wait-timeout 180; then
      exit 1
    fi
    echo "The previous version is not healthy either." >&2
  fi
  # A failing container would only restart again and again, using memory.
  use_tag=$tag staging down || true
  echo "Staging is stopped." >&2
  exit 1
}

echo "Starting staging $tag (previous: ${previous:-none})"
use_tag=$tag staging up -d --wait --wait-timeout 180 || restore_previous
healthy > /dev/null || restore_previous
# The running app must have the allowlist, whatever the Compose file says.
container=$(use_tag=$tag staging ps -q app)
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" | grep -q '^MAIL_ALLOWLIST=.' \
  || restore_previous
printf 'GLAZECALC_STAGING_TAG=%s\n' "$tag" > "$tag_file"

# Standard materials, additives and advice from this image, as deploy.sh loads them.
use_tag=$tag staging run --rm --no-deps app node scripts/seed-standard.js > /dev/null \
  || echo "Staging runs $tag, but loading the standard data failed; run this again." >&2

# Older staging images, never production's (sha-*): this one and the previous stay.
docker image ls --format '{{.Repository}}:{{.Tag}}' "$image" \
  | grep -E ":staging-[0-9a-f]{40}$" \
  | grep -vxF -e "$image:$tag" -e "$image:${previous:-none}" \
  | xargs -r docker image rm > /dev/null 2>&1 || true

echo "Staged $tag (previous: ${previous:-none}): https://staging.glazecalcapp.com"
echo "Health: $(healthy)"
echo "Stop it after the round: $0 stop"
