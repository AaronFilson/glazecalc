#!/usr/bin/env bash
# Nightly MongoDB dump to S3 (run by glazecalc-backup.timer, as root).
# The bucket's lifecycle rule expires old dumps; EBS snapshots are the second copy.
#
# Restore a dump:
#   aws s3 cp s3://<bucket>/mongodump/<file>.archive.gz - \
#     | docker compose -f compose.prod.yaml exec -T mongo mongorestore --archive --gzip --drop
set -euo pipefail

cd /opt/glazecalc
token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
region=$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)
bucket=$(aws ssm get-parameter --region "$region" --name /glazecalc/backup-bucket --query Parameter.Value --output text)

key="mongodump/glazecalc-$(date -u +%Y-%m-%dT%H%M%SZ).archive.gz"
# pipefail makes a failed dump fail the whole job, not just the upload.
docker compose -f compose.prod.yaml exec -T mongo mongodump --db glazecalc --archive --gzip --quiet \
  | aws s3 cp - "s3://$bucket/$key" --region "$region" --only-show-errors
echo "Backup written to s3://$bucket/$key"
