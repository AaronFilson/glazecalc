#!/usr/bin/env bash
# Restores a nightly dump (backup.sh) over the live database, then deletes again
# every account in the deletion log, before the app serves anyone. Run as root:
#
#   /opt/glazecalc/restore.sh <dump> [--log <log>] [--without-log]
#
# <dump> is a key in the backup bucket (mongodump/glazecalc-<time>.archive.gz)
# or a file on the instance; so is <log> (mongodump/glazecalc-<time>.deletions.archive.gz).
#
# A dump still holds the accounts deleted after it was made. The deletion log
# (server/models/deletion.ts) names them. Dumps leave it out, so --drop keeps
# the live log, and the app's own code deletes those accounts again here. The
# app is stopped first, and started only once that has worked.
#
#   --log <log>     adds a saved log to the live one first (entries already there
#                   are kept). Use the newest one when the live database was lost.
#   --without-log   restores even though the log is empty (no account deleted yet).
#
# See "Restoring a backup" in deploy/README.md.
set -euo pipefail

usage() {
  echo "Usage: $0 <dump> [--log <log>] [--without-log]" >&2
  exit 2
}
dump_source=
log_source=
without_log=
while [ $# -gt 0 ]; do
  case $1 in
    --log)
      [ $# -ge 2 ] || usage
      log_source=$2
      shift 2
      ;;
    --without-log)
      without_log=yes
      shift
      ;;
    -*) usage ;;
    *)
      [ -z "$dump_source" ] || usage
      dump_source=$1
      shift
      ;;
  esac
done
[ -n "$dump_source" ] || usage

cd /opt/glazecalc
compose() { docker compose --progress quiet -f compose.prod.yaml "$@"; }

files=()
trap 'rm -f ${files[@]+"${files[@]}"}' EXIT
region=
bucket=
# Sets `fetched` to the path of a local file, or of a key in the backup bucket once downloaded.
fetch() {
  if [ -f "$1" ]; then
    fetched=$1
    return
  fi
  if [[ ! "$1" =~ ^mongodump/[A-Za-z0-9._:-]+\.archive\.gz$ ]]; then
    echo "No file $1, and it is not a key like mongodump/glazecalc-<time>.archive.gz" >&2
    exit 2
  fi
  if [ -z "$bucket" ]; then
    local token
    token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
    region=$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)
    bucket=$(aws ssm get-parameter --region "$region" --name /glazecalc/backup-bucket --query Parameter.Value \
      --output text)
  fi
  fetched=$(mktemp /var/tmp/glazecalc-restore.XXXXXX)
  files+=("$fetched")
  aws s3 cp "s3://$bucket/$1" "$fetched" --region "$region" --only-show-errors
}

# Both fetched before anything changes, so a wrong name stops here.
fetch "$dump_source"
dump=$fetched
log=
if [ -n "$log_source" ]; then
  fetch "$log_source"
  log=$fetched
fi

if [ -n "$log" ]; then
  # No --drop: the saved entries are added, and those already here stay.
  compose exec -T mongo sh -c 'mongorestore --archive --gzip --nsInclude glazecalc.deletions --quiet --username glazecalc --password "$MONGO_APP_PASSWORD" --authenticationDatabase glazecalc' < "$log"
  echo "Added the saved deletion log from $log_source."
fi

# With no log, accounts deleted since the dump would come back with it.
logged=$(compose exec -T mongo sh -c 'mongosh --quiet "mongodb://glazecalc:$MONGO_APP_PASSWORD@localhost/glazecalc?authSource=glazecalc" --eval "db.deletions.countDocuments()"')
echo "Deletion log: $logged entries."
if [ "$logged" = 0 ] && [ -z "$without_log" ]; then
  echo "The deletion log is empty, so nothing is restored. If the database is new, pass the newest" >&2
  echo "saved log with --log. If no account was ever deleted, use --without-log." >&2
  exit 1
fi

compose stop app
echo "App stopped."

echo "Restoring $dump_source"
compose exec -T mongo sh -c 'mongorestore --archive --gzip --drop --nsExclude glazecalc.deletions --quiet --username glazecalc --password "$MONGO_APP_PASSWORD" --authenticationDatabase glazecalc' < "$dump"

if ! compose run --rm --no-deps app node server/reapply_deletions.ts; then
  echo "The dump is restored, but the deletion log could not be re-applied, so the app stays stopped." >&2
  echo "Fix the cause, then: docker compose -f compose.prod.yaml run --rm --no-deps app node server/reapply_deletions.ts" >&2
  echo "and: docker compose -f compose.prod.yaml up -d app" >&2
  exit 1
fi

compose up -d --wait --wait-timeout 180 app
echo "Restored $dump_source, and the app is running."
