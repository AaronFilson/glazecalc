#!/usr/bin/env bash
# Deploys a glazecalc image on this instance. Run as root; the GitHub deploy
# workflow runs it through SSM Run Command, or run it by hand in Session Manager.
#
#   /opt/glazecalc/deploy.sh sha-<full commit SHA>   a commit's image (CI tags every master build)
#   /opt/glazecalc/deploy.sh latest                  the newest master build
#
# To roll back, deploy the previous tag; it is printed at the end of each run.
# If the new version fails to pull or to become healthy, the previous one is
# started again and nothing is recorded, so a reboot never starts a failed deploy.
# Each deploy also loads the standard data that ships with the image, and the
# scripts here (deploy.sh, backup.sh, enable-https.sh) are updated from the
# image's commit, so a change to them takes effect with the deploy that ships it.
set -euo pipefail

tag="${1:-latest}"
if [[ ! "$tag" =~ ^(latest|sha-[0-9a-f]{40})$ ]]; then
  echo "Usage: $0 latest | sha-<full 40-character commit SHA>" >&2
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

# This commit's scripts. If deploy.sh itself changed, run the new one instead,
# once: it sees GLAZECALC_DEPLOY_REF and skips this step.
if [ "${GLAZECALC_DEPLOY_REF:-}" != "$ref" ]; then
  for f in deploy.sh backup.sh enable-https.sh; do
    curl -fsSL "$raw/$ref/deploy/$f" -o "$f.new"
    bash -n "$f.new"
    chmod 750 "$f.new"
  done
  mv backup.sh.new backup.sh
  mv enable-https.sh.new enable-https.sh
  if ! cmp -s deploy.sh.new deploy.sh; then
    mv deploy.sh.new deploy.sh
    echo "deploy.sh changed in ${ref:0:7}; running the new version."
    GLAZECALC_DEPLOY_REF="$ref" exec "$dir/deploy.sh" "$tag"
  fi
  rm -f deploy.sh.new
fi

# Region from the instance metadata service (IMDSv2).
token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
region=$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)

# The Compose file from the same commit as the image, so the two always match.
curl -fsSL "$raw/$ref/deploy/compose.prod.yaml" -o compose.prod.yaml.new

# APP_SECRET lives in SSM Parameter Store, never in the repository or user data.
# app.env is written whole and then moved into place, so a failed read leaves
# the old one.
umask 077
secret=$(aws ssm get-parameter --region "$region" --name /glazecalc/app-secret --with-decryption \
  --query Parameter.Value --output text)
printf 'APP_SECRET=%s\n' "$secret" > app.env.new
unset secret
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
  rm -f ssm-error.txt app.env.new compose.prod.yaml.new
  exit 1
fi
rm -f ssm-error.txt
unset smtp
mv app.env.new app.env
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
new up -d --remove-orphans --wait --wait-timeout 180 || restore_previous

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

# Rolling back pulls an older image again, so keep only the images in use.
docker image prune -af >/dev/null
curl -fsS http://127.0.0.1:3000/api/health && echo
