#!/usr/bin/env bash
# Admin, in AWS CloudShell (us-west-2), from a clone of this repository:
#
#   OWNER_INBOX=you@example.com bash deploy/aws/create-inbound.sh          # set everything up
#   bash deploy/aws/create-inbound.sh smtp-key                             # new SMTP key for Gmail's "Send mail as"
#   bash deploy/aws/create-inbound.sh undo                                 # remove everything
#
# Gives privacy@, security@, postmaster@, abuse@, hello@ and contact@glazecalcapp.com
# real mailboxes: Amazon SES receives the mail, stores it in a private S3 bucket
# (kept 30 days), and a Lambda function forwards it to OWNER_INBOX (see
# deploy/aws/mail-forwarder). It also creates the IAM user glazecalc-mail-send,
# which may send only as those six addresses, for Gmail's "Send mail as".
#
# Every step shows what it will do and asks before it changes anything. Running
# the script again skips what already exists and updates the rest. The last step,
# the DNS record that sends the domain's mail to AWS, comes only after a separate
# confirmation. OWNER_INBOX is stored only in the Lambda function's environment.
set -euo pipefail

region=us-west-2
account=724654236968
zone=Z383KEIS9CPHD5
domain=glazecalcapp.com
bucket=glazecalc-mail-$account
function=glazecalc-mail-forwarder
role=glazecalc-mail-forwarder
sender_user=glazecalc-mail-send
ruleset=glazecalc-inbound
rule=forward-to-owner
forwarder=forwarder@$domain
mx_value="10 inbound-smtp.$region.amazonaws.com"
here=$(cd "$(dirname "$0")" && pwd)
export AWS_REGION=$region AWS_DEFAULT_REGION=$region AWS_PAGER=""

changes=0

say() { printf '\n== %s\n' "$*"; }

# Shows a command and runs it after a yes. Any other answer skips this step (q quits).
confirm() {
  local answer
  read -r -p "$1 [y/N/q] " answer || answer=q
  case "$answer" in
    y | Y | yes) return 0 ;;
    q | Q) echo "Stopped. Run the script again to continue."; exit 0 ;;
    *) echo "Skipped."; return 1 ;;
  esac
}

# change "what this does" command args...   Prints the command, asks, runs it.
change() {
  local what=$1
  shift
  printf '\n-> %s\n   $ %s\n' "$what" "$*"
  if confirm "   Run it?"; then
    "$@"
    changes=$((changes + 1))
  fi
}

exists() { "$@" >/dev/null 2>&1; }

check_account() {
  local who
  who=$(aws sts get-caller-identity --query Account --output text)
  if [ "$who" != "$account" ]; then
    echo "Signed in to account $who, but this script is for $account." >&2
    exit 1
  fi
}

# ---------------------------------------------------------------------------
smtp_key() {
  check_account
  exists aws iam get-user --user-name "$sender_user" || { echo "Run the setup first: $sender_user does not exist." >&2; exit 1; }
  say "SMTP credentials for $sender_user (for Gmail's \"Send mail as\")"
  echo "A new access key is made, turned into an SMTP password, and shown once on screen."
  echo "Older keys are deleted afterwards, so update Gmail with the new password."
  confirm "Create a new key?" || exit 0
  local old_keys key secret
  old_keys=$(aws iam list-access-keys --user-name "$sender_user" --query 'AccessKeyMetadata[].AccessKeyId' --output text)
  read -r key secret < <(aws iam create-access-key --user-name "$sender_user" \
    --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text)
  [ -n "${key:-}" ] && [ -n "${secret:-}" ] || { echo "Could not create a key." >&2; exit 1; }
  # The SMTP password is derived from the secret key the way AWS documents
  # ("Obtaining Amazon SES SMTP credentials"), as in create-mailer.sh.
  local password
  password=$(SECRET="$secret" REGION="$region" python3 - <<'EOF'
import base64, hashlib, hmac, os

def sign(key, message):
    return hmac.new(key, message.encode('utf-8'), hashlib.sha256).digest()

signature = sign(('AWS4' + os.environ['SECRET']).encode('utf-8'), '11111111')
for part in (os.environ['REGION'], 'ses', 'aws4_request', 'SendRawEmail'):
    signature = sign(signature, part)
print(base64.b64encode(bytes([0x04]) + signature).decode('utf-8'), end='')
EOF
  )
  unset secret
  echo
  echo "SMTP server:    email-smtp.$region.amazonaws.com, port 587, TLS (STARTTLS)"
  echo "SMTP username:  $key"
  echo "SMTP password:  $password"
  echo
  echo "Copy these now; the password cannot be shown again. Clear the screen afterwards."
  for old in $old_keys; do
    aws iam delete-access-key --user-name "$sender_user" --access-key-id "$old"
    echo "Deleted the older access key $old."
  done
}

# ---------------------------------------------------------------------------
undo() {
  check_account
  say "Undo: removes the DNS record, the rules, the forwarder, the user and the stored mail"
  echo "Mail sent to the six addresses will bounce afterwards."
  local current
  current=$(aws route53 list-resource-record-sets --hosted-zone-id "$zone" \
    --query "ResourceRecordSets[?Name=='$domain.' && Type=='MX'].ResourceRecords[0].Value | [0]" --output text)
  if [ "$current" = "$mx_value" ]; then
    change "Delete the MX record $mx_value on $domain" aws route53 change-resource-record-sets --hosted-zone-id "$zone" \
      --change-batch "{\"Changes\":[{\"Action\":\"DELETE\",\"ResourceRecordSet\":{\"Name\":\"$domain\",\"Type\":\"MX\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$mx_value\"}]}}]}"
  else
    echo "The MX record on $domain is not ours ('${current}'); leaving it. (TTL differences also show here.)"
  fi
  if [ "$(aws ses describe-active-receipt-rule-set --query Metadata.Name --output text 2>/dev/null)" = "$ruleset" ]; then
    change "Deactivate the receipt rule set (no rule set is active afterwards)" aws ses set-active-receipt-rule-set
  fi
  exists aws ses describe-receipt-rule-set --rule-set-name "$ruleset" && {
    change "Delete the receipt rule" aws ses delete-receipt-rule --rule-set-name "$ruleset" --rule-name "$rule"
    change "Delete the receipt rule set" aws ses delete-receipt-rule-set --rule-set-name "$ruleset"
  }
  exists aws lambda get-function --function-name "$function" && {
    change "Delete the forwarder function" aws lambda delete-function --function-name "$function"
    change "Delete its log group" aws logs delete-log-group --log-group-name "/aws/lambda/$function"
  }
  exists aws iam get-role --role-name "$role" && {
    change "Delete the role's policy" aws iam delete-role-policy --role-name "$role" --policy-name forward-mail
    change "Delete the role" aws iam delete-role --role-name "$role"
  }
  if exists aws iam get-user --user-name "$sender_user"; then
    for key in $(aws iam list-access-keys --user-name "$sender_user" --query 'AccessKeyMetadata[].AccessKeyId' --output text); do
      change "Delete access key $key" aws iam delete-access-key --user-name "$sender_user" --access-key-id "$key"
    done
    change "Delete the user's policy" aws iam delete-user-policy --user-name "$sender_user" --policy-name send-as-the-six
    change "Delete the user $sender_user" aws iam delete-user --user-name "$sender_user"
  fi
  if exists aws s3api head-bucket --bucket "$bucket"; then
    change "Delete every stored message and the bucket $bucket" bash -c \
      "aws s3 rm s3://$bucket --recursive && aws s3api delete-bucket --bucket $bucket"
  fi
  echo "Undone ($changes changes). The identity glazecalcapp.com and its DNS records were not touched."
}

case "${1:-setup}" in
  smtp-key) smtp_key; exit 0 ;;
  undo) undo; exit 0 ;;
  setup) ;;
  *) echo "Usage: OWNER_INBOX=you@example.com bash $0 [setup|smtp-key|undo]" >&2; exit 2 ;;
esac

# ---------------------------------------------------------------------------
# Checks (nothing is changed here)
# ---------------------------------------------------------------------------
owner=${OWNER_INBOX:-}
if ! [[ "$owner" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "Set OWNER_INBOX to the address the mail is forwarded to, e.g. OWNER_INBOX=you@example.com" >&2
  exit 2
fi
check_account
say "Checks"
verified=$(aws sesv2 get-email-identity --email-identity "$domain" --query VerifiedForSendingStatus --output text)
if [ "$verified" != "True" ]; then
  echo "The SES identity $domain is not verified for sending in $region." >&2
  exit 1
fi
echo "SES identity $domain is verified. Forwarded mail is sent as $forwarder."
active=$(aws ses describe-active-receipt-rule-set --query Metadata.Name --output text 2>/dev/null || true)
if [ -n "$active" ] && [ "$active" != "None" ] && [ "$active" != "$ruleset" ]; then
  echo "Warning: the receipt rule set '$active' is already active in $region; activating $ruleset replaces it."
fi
current_mx=$(aws route53 list-resource-record-sets --hosted-zone-id "$zone" \
  --query "ResourceRecordSets[?Name=='$domain.' && Type=='MX'].ResourceRecords[].Value" --output text)
echo "MX records on $domain now: ${current_mx:-none}"
echo "Forwarding to: $owner"
echo
echo "Steps: 1 bucket, 2 bucket policy, 3 role, 4 function, 5 SES permission, 6 rule set and rule,"
echo "       7 sending user for Gmail, 8 activate the rule set, 9 the MX record (last, own confirmation)."

# ---------------------------------------------------------------------------
say "1. Private bucket for received mail (all public access blocked, messages deleted after 30 days)"
if ! exists aws s3api head-bucket --bucket "$bucket"; then
  change "Create the bucket $bucket" aws s3api create-bucket --bucket "$bucket" \
    --create-bucket-configuration LocationConstraint=$region
else
  echo "The bucket $bucket exists."
fi
if exists aws s3api head-bucket --bucket "$bucket"; then
  change "Block all public access" aws s3api put-public-access-block --bucket "$bucket" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  change "Delete messages after 30 days" aws s3api put-bucket-lifecycle-configuration --bucket "$bucket" \
    --lifecycle-configuration \
    '{"Rules":[{"ID":"expire-mail","Status":"Enabled","Filter":{"Prefix":"inbound/"},"Expiration":{"Days":30},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":1}}]}'
fi

say "2. Bucket policy: SES may store mail here, for this account and this receipt rule only"
if exists aws s3api head-bucket --bucket "$bucket"; then
  change "Attach mail-bucket-policy.json" aws s3api put-bucket-policy --bucket "$bucket" \
    --policy "file://$here/mail-bucket-policy.json"
fi

say "3. Role for the forwarder (reads the bucket, sends as $forwarder, writes logs)"
if ! exists aws iam get-role --role-name "$role"; then
  change "Create the role $role" aws iam create-role --role-name "$role" \
    --assume-role-policy-document "file://$here/mail-forwarder-trust.json" --tags Key=app,Value=glazecalc
fi
if exists aws iam get-role --role-name "$role"; then
  change "Attach mail-forwarder-policy.json to the role" aws iam put-role-policy --role-name "$role" \
    --policy-name forward-mail --policy-document "file://$here/mail-forwarder-policy.json"
fi

say "4. The forwarder function (Node 24, arm64) with $owner in its environment only"
umask 077
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
OWNER="$owner" BUCKET="$bucket" FORWARDER="$forwarder" python3 - "$work" "$here/mail-forwarder" <<'EOF'
import json, os, sys, zipfile
work, source = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(os.path.join(work, 'forwarder.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for name in ('index.mjs', 'rewrite.mjs'):
        z.write(os.path.join(source, name), name)
env = {'Variables': {'OWNER_INBOX': os.environ['OWNER'], 'BUCKET': os.environ['BUCKET'],
                     'OBJECT_PREFIX': 'inbound/', 'FORWARDER_ADDRESS': os.environ['FORWARDER']}}
with open(os.path.join(work, 'env.json'), 'w') as f:
    json.dump(env, f)
EOF
role_arn=arn:aws:iam::$account:role/$role
if ! exists aws lambda get-function --function-name "$function"; then
  if exists aws iam get-role --role-name "$role"; then
    echo "(A new role needs a few seconds before Lambda can use it; the command retries.)"
    change "Create the function $function" bash -c "
      for try in 1 2 3 4 5 6; do
        aws lambda create-function --function-name $function --runtime nodejs24.x --architectures arm64 \
          --handler index.handler --role $role_arn --timeout 30 --memory-size 256 \
          --zip-file fileb://$work/forwarder.zip --environment file://$work/env.json \
          --tags app=glazecalc --query FunctionArn --output text && exit 0
        echo 'Waiting for the role...'; sleep 8
      done
      exit 1"
  fi
else
  change "Update the function's code" aws lambda update-function-code --function-name "$function" \
    --zip-file "fileb://$work/forwarder.zip" --query LastUpdateStatus --output text
  aws lambda wait function-updated --function-name "$function"
  change "Update the function's settings and environment" aws lambda update-function-configuration \
    --function-name "$function" --runtime nodejs24.x --handler index.handler --timeout 30 --memory-size 256 \
    --environment "file://$work/env.json" --query LastUpdateStatus --output text
  aws lambda wait function-updated --function-name "$function"
fi

say "5. Let SES invoke the function (this account and this receipt rule only)"
rule_arn=arn:aws:ses:$region:$account:receipt-rule-set/$ruleset:receipt-rule/$rule
if exists aws lambda get-function --function-name "$function"; then
  if aws lambda get-policy --function-name "$function" --query Policy --output text 2>/dev/null | grep -q allow-ses-inbound; then
    echo "SES may already invoke the function."
  else
    change "Allow ses.amazonaws.com to invoke the function" aws lambda add-permission --function-name "$function" \
      --statement-id allow-ses-inbound --action lambda:InvokeFunction --principal ses.amazonaws.com \
      --source-arn "$rule_arn" --source-account "$account"
  fi
fi

say "6. Receipt rule set and rule: six recipients, scanning on, then store in S3, then run the function"
if ! exists aws ses describe-receipt-rule-set --rule-set-name "$ruleset"; then
  change "Create the rule set $ruleset" aws ses create-receipt-rule-set --rule-set-name "$ruleset"
fi
if exists aws ses describe-receipt-rule-set --rule-set-name "$ruleset"; then
  if aws ses describe-receipt-rule --rule-set-name "$ruleset" --rule-name "$rule" >/dev/null 2>&1; then
    change "Update the rule $rule from mail-receipt-rule.json" aws ses update-receipt-rule \
      --rule-set-name "$ruleset" --rule "file://$here/mail-receipt-rule.json"
  else
    change "Create the rule $rule from mail-receipt-rule.json" aws ses create-receipt-rule \
      --rule-set-name "$ruleset" --rule "file://$here/mail-receipt-rule.json"
  fi
fi

say "7. IAM user $sender_user: may send only as the six addresses (for Gmail's \"Send mail as\")"
if ! exists aws iam get-user --user-name "$sender_user"; then
  change "Create the user $sender_user" aws iam create-user --user-name "$sender_user" --tags Key=app,Value=glazecalc
fi
if exists aws iam get-user --user-name "$sender_user"; then
  change "Attach mail-send-policy.json to the user" aws iam put-user-policy --user-name "$sender_user" \
    --policy-name send-as-the-six --policy-document "file://$here/mail-send-policy.json"
fi
echo "Its SMTP credentials come later: bash deploy/aws/create-inbound.sh smtp-key"

say "8. Activate the receipt rule set (the account has one active set per region)"
if [ "$active" = "$ruleset" ]; then
  echo "$ruleset is already active."
elif exists aws ses describe-receipt-rule-set --rule-set-name "$ruleset"; then
  change "Make $ruleset the active receipt rule set (replaces '${active:-none}')" \
    aws ses set-active-receipt-rule-set --rule-set-name "$ruleset"
fi

# ---------------------------------------------------------------------------
say "9. DNS: send mail for $domain to Amazon SES (the last step)"
echo "Adds the MX record  $domain  MX  $mx_value  (TTL 300) in zone $zone."
echo "From then on, the six addresses receive mail. Other addresses are refused (no catch-all)."
echo "The apex SPF (v=spf1 -all) and _dmarc records are not changed."
if [ "$current_mx" = "$mx_value" ]; then
  echo "The record already exists."
elif [ -n "$current_mx" ]; then
  echo "The apex already has MX records ($current_mx); not touching them. Remove or change them yourself." >&2
else
  echo "Before this, check that steps 1 to 8 are all done:"
  echo "  aws ses describe-active-receipt-rule-set --query Metadata.Name --output text"
  read -r -p "Type mx to send $domain mail to AWS now, anything else to stop: " typed
  [ "$typed" = mx ] || { echo "Not done. Run the script again when ready."; exit 0; }
  change "Create the MX record" aws route53 change-resource-record-sets --hosted-zone-id "$zone" \
    --change-batch "{\"Changes\":[{\"Action\":\"CREATE\",\"ResourceRecordSet\":{\"Name\":\"$domain\",\"Type\":\"MX\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$mx_value\"}]}}]}"
fi

echo
echo "Done: $changes changes. Next: test each address (deploy/aws/README.md), then run the smtp-key step."
