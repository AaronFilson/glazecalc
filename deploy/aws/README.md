# AWS setup for the glazecalc EC2 instance

Every AWS step, in order, as commands to review and run. Production was set up with them in
October 2026; they are kept to rebuild it or to set up another instance.
Background and reasoning: [docs/ec2-deploy-plan.md](../../docs/ec2-deploy-plan.md).

**Who runs what:**

- **Admin (once):** the steps marked _Admin_ create IAM roles, which a limited user must not be
  able to do (a user allowed to write role policies can make itself an administrator). Run them
  in AWS CloudShell, signed in to the console as your admin user (terminal icon, region
  us-west-2), after `git clone https://github.com/AaronFilson/glazecalc.git && cd glazecalc`.
- **Everything else:** the `copper-bell` CLI user, once the admin attaches
  [operator-policy.json](operator-policy.json) to its group (step 0). That policy lets it
  create only resources tagged `app=glazecalc`, launch only t4g.micro or t4g.small, change DNS
  only for glazecalcapp.com, and stop or terminate the two old servers.

Defaults chosen in these files, change them before running if you decide otherwise:
region **us-west-2** (where the old instance is), image registry **GHCR**, MongoDB
**self-hosted** in Docker, instance **t4g.micro** (arm64, 1 GB; resize to t4g.small with a
stop, `modify-instance-attribute --instance-type`, start if memory gets tight). The account ID 724654236968 and the
region appear in `instance-policy.json` and `deploy-policy.json` as well.

```bash
REGION=us-west-2
ACCOUNT=724654236968
BUCKET=glazecalc-backups-$ACCOUNT
export AWS_REGION=$REGION
```

## 0. Admin: permissions for the CLI user

A customer-managed policy, separate from other projects' policies (an inline group policy is
limited to 5,120 characters; this one is close to the 6,144 managed-policy limit). Replace
`<group>` with the IAM group `copper-bell` belongs to.

```bash
aws iam create-policy --policy-name glazecalc-operator \
  --policy-document file://deploy/aws/operator-policy.json
aws iam attach-group-policy --group-name <group> \
  --policy-arn arn:aws:iam::724654236968:policy/glazecalc-operator
```

After the policy changes, publish a new version (keeps up to 5):
`aws iam create-policy-version --policy-arn arn:aws:iam::724654236968:policy/glazecalc-operator --policy-document file://deploy/aws/operator-policy.json --set-as-default`.

Also run the _Admin_ parts of steps 4, 5 and 10 now.

## 1. Account defaults (new instances only)

```bash
aws ec2 enable-ebs-encryption-by-default
aws ec2 modify-instance-metadata-defaults --http-tokens required --http-put-response-hop-limit 1
```

## 2. Settings in Parameter Store

The app secret never appears in the repository, user data or logs.

```bash
aws ssm put-parameter --name /glazecalc/app-secret --type SecureString \
  --value "$(openssl rand -base64 48)"
aws ssm put-parameter --name /glazecalc/backup-bucket --type String --value "$BUCKET"
# Optional: a contact address for the Let's Encrypt account (no expiry reminders since 2025).
aws ssm put-parameter --name /glazecalc/acme-email --type String --value 'you@example.com'
```

## 3. Backup bucket (private, encrypted, dumps kept 30 days)

```bash
aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration LocationConstraint=$REGION
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration \
  '{"Rules":[{"ID":"expire-dumps","Status":"Enabled","Filter":{"Prefix":"mongodump/"},"Expiration":{"Days":30}}]}'
```

(New buckets already encrypt objects with SSE-S3 by default.)

## 4. Admin: instance role

Session Manager access plus reading `/glazecalc/*` parameters and writing dumps.

```bash
aws iam create-role --role-name glazecalc-instance \
  --assume-role-policy-document file://deploy/aws/instance-trust.json
aws iam attach-role-policy --role-name glazecalc-instance \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam put-role-policy --role-name glazecalc-instance --policy-name glazecalc-app \
  --policy-document file://deploy/aws/instance-policy.json
aws iam create-instance-profile --instance-profile-name glazecalc-instance
aws iam add-role-to-instance-profile --instance-profile-name glazecalc-instance --role-name glazecalc-instance
```

## 5. Admin: deploy role for GitHub Actions (OIDC, no stored keys)

Only workflow runs in this repository's `production` environment can assume it, and all it
can do is run the `glazecalc-deploy` command document on instances tagged `app=glazecalc`.
That document runs `deploy.sh` and nothing else, and AWS rejects any tag that is not `latest`
or `sha-<40 hex characters>`, so even an approved workflow run cannot run other commands.

```bash
aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
aws iam create-role --role-name glazecalc-github-deploy \
  --assume-role-policy-document file://deploy/aws/github-oidc-trust.json
aws iam put-role-policy --role-name glazecalc-github-deploy --policy-name ssm-deploy \
  --policy-document file://deploy/aws/deploy-policy.json
aws ssm create-document --name glazecalc-deploy --document-type Command --document-format JSON \
  --content file://deploy/aws/deploy-document.json --tags Key=app,Value=glazecalc
```

If `deploy-document.json` changes later:
`aws ssm update-document --name glazecalc-deploy --content file://deploy/aws/deploy-document.json --document-version '$LATEST'`,
then `aws ssm update-document-default-version --name glazecalc-deploy --document-version <new version>`.

## 6. Security group: web traffic only

No port 22: Session Manager is used instead of SSH.

```bash
VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
SG=$(aws ec2 create-security-group --group-name glazecalc-web --description 'glazecalc: HTTP and HTTPS' \
  --vpc-id "$VPC" --query GroupId --output text --tag-specifications \
  'ResourceType=security-group,Tags=[{Key=Name,Value=glazecalc-web},{Key=app,Value=glazecalc}]')
for port in 80 443; do
  aws ec2 authorize-security-group-ingress --group-id "$SG" --ip-permissions \
    "IpProtocol=tcp,FromPort=$port,ToPort=$port,IpRanges=[{CidrIp=0.0.0.0/0}],Ipv6Ranges=[{CidrIpv6=::/0}]"
done
```

## 7. Debian 13 AMI

Official images from the Debian cloud team (owner 136693071363), via the public parameter
for the newest build.

```bash
AMI=$(aws ssm get-parameter --name /aws/service/debian/release/13/latest/arm64 \
  --query Parameter.Value --output text)
ROOT=$(aws ec2 describe-images --image-ids "$AMI" --query 'Images[0].RootDeviceName' --output text)
echo "$AMI $ROOT"
```

## 8. Launch template and instance

```bash
USERDATA=$(base64 -w0 deploy/cloud-init.yaml)
aws ec2 create-launch-template --launch-template-name glazecalc \
  --tag-specifications 'ResourceType=launch-template,Tags=[{Key=app,Value=glazecalc}]' \
  --launch-template-data "{
  \"ImageId\": \"$AMI\",
  \"InstanceType\": \"t4g.micro\",
  \"CreditSpecification\": {\"CpuCredits\": \"standard\"},
  \"IamInstanceProfile\": {\"Name\": \"glazecalc-instance\"},
  \"SecurityGroupIds\": [\"$SG\"],
  \"MetadataOptions\": {\"HttpTokens\": \"required\", \"HttpPutResponseHopLimit\": 1, \"HttpEndpoint\": \"enabled\"},
  \"BlockDeviceMappings\": [{\"DeviceName\": \"$ROOT\", \"Ebs\": {\"VolumeSize\": 20, \"VolumeType\": \"gp3\", \"Encrypted\": true}}],
  \"UserData\": \"$USERDATA\",
  \"TagSpecifications\": [
    {\"ResourceType\": \"instance\", \"Tags\": [{\"Key\": \"Name\", \"Value\": \"glazecalc\"}, {\"Key\": \"app\", \"Value\": \"glazecalc\"}]},
    {\"ResourceType\": \"volume\", \"Tags\": [{\"Key\": \"Name\", \"Value\": \"glazecalc\"}, {\"Key\": \"app\", \"Value\": \"glazecalc\"}]}
  ]
}"
INSTANCE=$(aws ec2 run-instances --launch-template LaunchTemplateName=glazecalc \
  --query 'Instances[0].InstanceId' --output text)
aws ec2 wait instance-status-ok --instance-ids "$INSTANCE"
```

`CpuCredits: standard` means a long busy spell slows the instance down instead of adding
surplus-credit charges (T4g's default is `unlimited`). `HttpPutResponseHopLimit: 1` keeps the
instance role's credentials away from the containers: only the scripts on the host use the
role. (If the app itself ever calls AWS, such as SES for email, raise it to 2.)

## 9. Elastic IP

Public IPv4 is billed hourly (about $3.65/month) whether attached or not.

```bash
ALLOC=$(aws ec2 allocate-address --domain vpc --tag-specifications \
  'ResourceType=elastic-ip,Tags=[{Key=Name,Value=glazecalc},{Key=app,Value=glazecalc}]' \
  --query AllocationId --output text)
aws ec2 associate-address --instance-id "$INSTANCE" --allocation-id "$ALLOC"
aws ec2 describe-addresses --allocation-ids "$ALLOC" --query 'Addresses[0].PublicIp' --output text
```

## 10. Snapshots, alarms and a budget

```bash
aws dlm create-default-role --resource-type snapshot     # Admin (creates an IAM role)
aws dlm create-lifecycle-policy --description 'glazecalc daily snapshots' --state ENABLED \
  --execution-role-arn "arn:aws:iam::$ACCOUNT:role/AWSDataLifecycleManagerDefaultRole" \
  --policy-details file://deploy/aws/dlm-policy.json

aws cloudwatch put-metric-alarm --alarm-name glazecalc-recover --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_System --dimensions Name=InstanceId,Value="$INSTANCE" \
  --statistic Maximum --period 60 --evaluation-periods 2 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold --alarm-actions "arn:aws:automate:$REGION:ec2:recover"
aws cloudwatch put-metric-alarm --alarm-name glazecalc-reboot --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_Instance --dimensions Name=InstanceId,Value="$INSTANCE" \
  --statistic Maximum --period 60 --evaluation-periods 3 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold --alarm-actions "arn:aws:automate:$REGION:ec2:reboot"

aws budgets create-budget --account-id "$ACCOUNT" \
  --budget '{"BudgetName":"monthly","BudgetLimit":{"Amount":"30","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"you@example.com"}]}]'
```

## 11. Check the instance

```bash
aws ssm describe-instance-information --filters Key=InstanceIds,Values="$INSTANCE" \
  --query 'InstanceInformationList[0].PingStatus' --output text      # expect: Online
aws ssm start-session --target "$INSTANCE"                            # then:
#   sudo tail -n 50 /var/log/cloud-init-output.log
#   curl -s http://127.0.0.1:3000/api/health
```

Before the DNS switch, nginx serves plain HTTP: open `http://<elastic-ip>/` from your PC, or
add a hosts-file line `<elastic-ip> glazecalcapp.com` and open `http://glazecalcapp.com/`.
HTTPS comes after the DNS switch (section 13).

Pages load over plain HTTP, but signing in does not stay signed in: the session cookie is
`Secure`, and browsers keep it only over HTTPS. Check the API with curl instead, using a trial
(it removes itself after 14 days, so no test account is left behind):

```bash
IP=<elastic-ip>
curl -s http://$IP/api/health                                         # expect: {"status":"ok"}
token=$(curl -s -D - -o /dev/null -X POST http://$IP/api/guest |
  sed -nE 's/^[Ss]et-[Cc]ookie: glazecalc_session=([^;]+).*/\1/p')
curl -s -H "Authorization: Bearer $token" http://$IP/api/verify        # expect: "guest":true
curl -s http://$IP/api/materials/getStandard | grep -o '"ownedBy":"Standard"' | wc -l
grep -c . data/materials.ndjson                                       # expect: the same number
```

Sign in with a browser after `enable-https.sh`.

## 12. GitHub settings

1. After the first **Publish image** run, open the package (GitHub profile → Packages →
   glazecalc → Package settings) and set its visibility to **Public**, so the instance can pull
   without a token. (Or keep it private and add a pull token on the instance.)
2. Repository → Settings → Environments → **New environment** `production`: add yourself as a
   required reviewer; add variables `AWS_DEPLOY_ROLE_ARN` =
   `arn:aws:iam::724654236968:role/glazecalc-github-deploy` and `AWS_REGION` = `us-west-2`.
3. Actions → **Deploy** → Run workflow deploys the current master image.

## 13. DNS switch (after restoring data, see the plan)

```bash
ZONE=$(aws route53 list-hosted-zones-by-name --dns-name glazecalcapp.com \
  --query 'HostedZones[0].Id' --output text)
IP=$(aws ec2 describe-addresses --allocation-ids "$ALLOC" --query 'Addresses[0].PublicIp' --output text)
for name in glazecalcapp.com www.glazecalcapp.com; do
  aws route53 change-resource-record-sets --hosted-zone-id "$ZONE" --change-batch "{\"Changes\":[{
    \"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$name\",\"Type\":\"A\",\"TTL\":300,
    \"ResourceRecords\":[{\"Value\":\"$IP\"}]}}]}"
done
```

Then turn on HTTPS. Once both names resolve to the new address (`nslookup glazecalcapp.com`;
a few minutes), run `enable-https.sh` on the instance. It refuses to start if DNS does not
point there yet, so it is safe to try early. `--dry-run` tests against Let's Encrypt's staging
server first.

```bash
aws ssm send-command --document-name AWS-RunShellScript --targets Key=tag:app,Values=glazecalc \
  --parameters 'commands=["/opt/glazecalc/enable-https.sh --dry-run && /opt/glazecalc/enable-https.sh"]' \
  --query Command.CommandId --output text
# Output: aws ssm get-command-invocation --command-id <id> --instance-id "$INSTANCE"
```

(Or in a Session Manager shell: `sudo /opt/glazecalc/enable-https.sh`.) Afterwards
`https://glazecalcapp.com` serves the app and `http://` and `www.` redirect to it.

## 14. Email: Amazon SES (password reset links and notices)

Done 2026-10-05 as copper-bell, after the admin attached [mail-setup-policy.json](mail-setup-policy.json)
as the managed policy `glazecalc-mail`. The app sends with SMTP (phase 3 adds the credentials).

```bash
# Domain identity with Easy DKIM, and a custom MAIL FROM domain so SPF passes for our own domain.
aws sesv2 create-email-identity --email-identity glazecalcapp.com \
  --dkim-signing-attributes NextSigningKeyLength=RSA_2048_BIT --tags Key=app,Value=glazecalc
aws sesv2 put-email-identity-mail-from-attributes --email-identity glazecalcapp.com \
  --mail-from-domain mail.glazecalcapp.com --behavior-on-mx-failure USE_DEFAULT_VALUE
aws sesv2 get-email-identity --email-identity glazecalcapp.com --query DkimAttributes.Tokens
```

DNS records in the hosted zone (TTL 1800):

| Name                                                              | Type  | Value                                                                               |
| ----------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| `<token>._domainkey.glazecalcapp.com` (three, one per DKIM token) | CNAME | `<token>.dkim.amazonses.com`                                                        |
| `mail.glazecalcapp.com`                                           | MX    | `10 feedback-smtp.us-west-2.amazonses.com`                                          |
| `mail.glazecalcapp.com`                                           | TXT   | `"v=spf1 include:amazonses.com ~all"`                                               |
| `_dmarc.glazecalcapp.com`                                         | TXT   | `"v=DMARC1; p=none"` (tighten to `p=quarantine` after a few weeks of clean sending) |
| `glazecalcapp.com`                                                | TXT   | `"v=spf1 -all"` (the bare domain sends no mail)                                     |

Bounces and complaints: the account suppression list stops mail to those addresses, SES sends each
notice to the SNS topic `glazecalc-alerts` (emailed to the owner), and two alarms on that topic watch
`Reputation.BounceRate` (over 4%) and `Reputation.ComplaintRate` (over 0.08%); AWS reviews accounts
at 5% and 0.1%. `no-reply@glazecalcapp.com` has no mailbox, so notices must not rely on email forwarding.

```bash
aws sns create-topic --name glazecalc-alerts --tags Key=app,Value=glazecalc
aws sns subscribe --topic-arn arn:aws:sns:us-west-2:724654236968:glazecalc-alerts \
  --protocol email --notification-endpoint <owner email>          # then click the link in the email
for type in Bounce Complaint; do
  aws ses set-identity-notification-topic --identity glazecalcapp.com --notification-type $type \
    --sns-topic arn:aws:sns:us-west-2:724654236968:glazecalc-alerts
done
# Alarms: AWS/SES Reputation.BounceRate > 0.04 and Reputation.ComplaintRate > 0.0008, Maximum over
# 15 minutes, missing data not breaching, alarm and OK actions to glazecalc-alerts.
```

Testing from the sandbox: verify a recipient address (`aws sesv2 create-email-identity
--email-identity <address>`, then click the link AWS emails), send to it from
`no-reply@glazecalcapp.com`, and check the message source for `dkim=pass`, `spf=pass` and
`dmarc=pass`. SES's mailbox simulator (`bounce@simulator.amazonses.com`,
`complaint@simulator.amazonses.com`) tests the notices without affecting the account's reputation.

Production access (out of the sandbox) is requested once with `aws sesv2 put-account-details
--production-access-enabled --mail-type TRANSACTIONAL ...`; AWS answers within about a day. After
that, `glazecalc-mail` can be detached: day-to-day sending uses the app's own credentials.

### Turning email on: SMTP credentials (Admin)

The app sends through SES's SMTP interface as the IAM user `glazecalc-mailer`, whose only
permission is `ses:SendRawEmail` as `no-reply@glazecalcapp.com` ([mailer-policy.json](mailer-policy.json)).
The containers cannot reach the instance role (metadata hop limit 1), so the app needs its own
credentials. In CloudShell, from a clone of this repository:

```bash
bash deploy/aws/create-mailer.sh
```

It creates or updates the user, makes a new access key, turns it into SES SMTP credentials, and
stores `smtps://USER:PASSWORD@email-smtp.us-west-2.amazonaws.com:465` as the SecureString
`/glazecalc/smtp-url` without printing it. `deploy.sh` copies it into `app.env` as `SMTP_URL` with
`MAIL_TRANSPORT=smtp`, and logs "Email: on". Run Deploy afterwards (new credentials can take a few
minutes to work). Running the script again rotates the credentials: it stores the new key, then
deletes the older ones.

While SES is in the sandbox, reset emails reach verified addresses only; after production access
they reach everyone.
