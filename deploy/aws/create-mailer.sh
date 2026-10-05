#!/usr/bin/env bash
# Admin, in AWS CloudShell (us-west-2), from a clone of this repository:
#
#   bash deploy/aws/create-mailer.sh
#
# Creates (or updates) the IAM user glazecalc-mailer, which may only send email
# as no-reply@glazecalcapp.com, gives it a new access key, turns that into
# Amazon SES SMTP credentials, and stores them as the SecureString parameter
# /glazecalc/smtp-url (smtps://USER:PASSWORD@email-smtp.us-west-2.amazonaws.com:465).
# deploy.sh puts that in the app's environment, which turns email on.
#
# Nothing secret is printed. Running it again rotates the credentials: the new
# key is stored first, then older keys are deleted; deploy again afterwards.
set -euo pipefail

region=us-west-2
user=glazecalc-mailer
param=/glazecalc/smtp-url
here=$(cd "$(dirname "$0")" && pwd)

if ! aws iam get-user --user-name "$user" >/dev/null 2>&1; then
  aws iam create-user --user-name "$user" --tags Key=app,Value=glazecalc >/dev/null
  echo "Created IAM user $user."
fi
aws iam put-user-policy --user-name "$user" --policy-name send-as-no-reply \
  --policy-document "file://$here/mailer-policy.json"
echo "$user may send only as no-reply@glazecalcapp.com (ses:SendRawEmail)."

old_keys=$(aws iam list-access-keys --user-name "$user" --query 'AccessKeyMetadata[].AccessKeyId' --output text)
read -r key secret < <(aws iam create-access-key --user-name "$user" \
  --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text)
if [ -z "${key:-}" ] || [ -z "${secret:-}" ]; then
  echo "Could not create an access key for $user; nothing was stored." >&2
  exit 1
fi

# The SMTP password is derived from the secret key the way AWS documents
# ("Obtaining Amazon SES SMTP credentials"): a version byte, then an HMAC-SHA256
# chain over a fixed date, the region, "ses", "aws4_request" and "SendRawEmail".
umask 077
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
KEY="$key" SECRET="$secret" REGION="$region" python3 - > "$tmp" <<'EOF'
import base64, hashlib, hmac, os
from urllib.parse import quote

def sign(key, message):
    return hmac.new(key, message.encode('utf-8'), hashlib.sha256).digest()

signature = sign(('AWS4' + os.environ['SECRET']).encode('utf-8'), '11111111')
for part in (os.environ['REGION'], 'ses', 'aws4_request', 'SendRawEmail'):
    signature = sign(signature, part)
password = base64.b64encode(bytes([0x04]) + signature).decode('utf-8')
print('smtps://' + quote(os.environ['KEY'], safe='') + ':' + quote(password, safe='') +
      '@email-smtp.' + os.environ['REGION'] + '.amazonaws.com:465', end='')
EOF
unset secret

aws ssm put-parameter --region "$region" --name "$param" --type SecureString --overwrite \
  --value "file://$tmp" --query Version --output text >/dev/null
echo "Stored the SMTP URL in $param (SecureString)."

for old in $old_keys; do
  aws iam delete-access-key --user-name "$user" --access-key-id "$old"
  echo "Deleted the older access key $old."
done

echo "Done. New SMTP credentials can take a few minutes to start working; then run Deploy."
