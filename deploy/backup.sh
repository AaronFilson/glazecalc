#!/usr/bin/env bash
# Nightly MongoDB dump to S3 (run by glazecalc-backup.timer, as root).
# The bucket's lifecycle rule expires old dumps; EBS snapshots are the second copy.
#
# Restore a dump with restore.sh, never with mongorestore alone: it also
# deletes again the accounts deleted since the dump was made.
set -euo pipefail

cd /opt/glazecalc
token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
region=$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)
bucket=$(aws ssm get-parameter --region "$region" --name /glazecalc/backup-bucket --query Parameter.Value --output text)

key="mongodump/glazecalc-$(date -u +%Y-%m-%dT%H%M%SZ).archive.gz"
# The dump goes to a local file first and is uploaded only once mongodump has
# finished: streamed straight to S3, a dump that failed part way would still
# be stored, cut short, under a normal name.
dump=$(mktemp /var/tmp/glazecalc-dump.XXXXXX)
log=$(mktemp /var/tmp/glazecalc-deletions.XXXXXX)
trap 'rm -f "$dump" "$log"' EXIT
# The deletion log stays out of the dump, so restoring one, even with --drop,
# leaves the live log as it is; restore.sh then deletes again every account in
# it. The log goes up beside the dump, for when the live database is lost too.
docker compose -f compose.prod.yaml exec -T mongo mongodump --db glazecalc --excludeCollection deletions \
  --archive --gzip --quiet > "$dump"
docker compose -f compose.prod.yaml exec -T mongo mongodump --db glazecalc --collection deletions \
  --archive --gzip --quiet > "$log"
aws s3 cp "$dump" "s3://$bucket/$key" --region "$region" --only-show-errors
aws s3 cp "$log" "s3://$bucket/${key%.archive.gz}.deletions.archive.gz" --region "$region" --only-show-errors
echo "Backup written to s3://$bucket/$key ($(stat -c %s "$dump") bytes), with its deletion log"
