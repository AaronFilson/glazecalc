#!/usr/bin/env bash
# Runs a glazecalc SSM command document on the instance tagged app=glazecalc
# and waits for it, for the Deploy and Deploy staging workflows: prints its
# output and fails unless it succeeded there. AWS credentials come from the
# workflow (OIDC); the document checks the tag against its own pattern too.
#
#   .github/scripts/ssm-run.sh <document> <tag pattern> <tag>
set -euo pipefail

document=$1
pattern=$2
tag=$3
if [[ ! "$tag" =~ $pattern ]]; then
  echo "Tag must match $pattern: $tag"
  exit 1
fi

# SSM takes a comment of at most 100 characters; the document is named apart.
comment="GitHub run $GITHUB_RUN_ID: $tag"
command_id=$(aws ssm send-command \
  --document-name "$document" \
  --targets Key=tag:app,Values=glazecalc \
  --comment "${comment:0:100}" \
  --parameters "tag=$tag" \
  --timeout-seconds 900 \
  --query Command.CommandId --output text)
echo "SSM command: $command_id"

status=Pending
targets=0
for _ in $(seq 1 90); do
  # A failed request (throttling, say) is asked again: the command still runs.
  if state=$(aws ssm list-commands --command-id "$command_id" \
    --query 'Commands[0].[Status,TargetCount]' --output text); then
    read -r status targets <<< "$state"
  fi
  case "$status" in Pending | InProgress | Delayed) sleep 10 ;; *) break ;; esac
done
echo "Status: $status on $targets instance(s)"

# The script's output from each instance: get-command-invocation gives up to
# 24,000 characters of it (list-command-invocations, only the first 2,500).
for instance in $(aws ssm list-command-invocations --command-id "$command_id" \
  --query 'CommandInvocations[].InstanceId' --output text); do
  echo "== $instance"
  aws ssm get-command-invocation --command-id "$command_id" --instance-id "$instance" \
    --query 'StandardOutputContent' --output text || true
  aws ssm get-command-invocation --command-id "$command_id" --instance-id "$instance" \
    --query 'StandardErrorContent' --output text >&2 || true
done
# With no instance tagged app=glazecalc the command can finish with nothing deployed.
if [ "$targets" = 0 ]; then
  echo 'No instance tagged app=glazecalc took the command; nothing was deployed.'
  exit 1
fi
test "$status" = Success
