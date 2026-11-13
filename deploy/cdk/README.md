# The AWS setup as CDK stacks

glazecalc's AWS resources were made by hand, from the commands in [deploy/aws/README.md](../aws/README.md), the
JSON documents beside it and its scripts. This folder declares the same resources as code, with AWS CDK in
TypeScript ([ADR 29](../../docs/adr/0029-infrastructure-as-code-with-cdk.md)): the same names, the same conditions,
the same permissions. Nothing has been deployed from it yet. The live resources come under it with `cdk import`, one
stack at a time, by the steps in [Bringing the live resources under CDK](#bringing-the-live-resources-under-cdk).

It runs on Node 24, which runs the TypeScript as it is (`node bin/glazecalc.ts`, no build step and no ts-node), as the
server does ([ADR 8](../../docs/adr/0008-typescript-server-without-a-build.md)). Synthesizing needs no AWS account.

## What it declares

Four CloudFormation stacks, each imported and deployed on its own:

| Stack                    | Resources                                                                                                                                                                                                                                                                                                                                                                                                                  | Made by hand in                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `glazecalc-access`       | GitHub's OIDC provider; the roles `glazecalc-github-deploy` and `glazecalc-github-staging` with their inline policies `ssm-deploy` and `ssm-staging-deploy`; the SSM documents `glazecalc-deploy` and `glazecalc-staging-deploy`; the managed policy `glazecalc-operator`                                                                                                                                                  | `setup-github-deploy.sh` (`github-oidc-trust*.json`, `deploy-policy.json`, `staging-deploy-policy.json`, `deploy-document.json`, `staging-deploy-document.json`); step 0 (`operator-policy.json`) |
| `glazecalc-server`       | The bucket `glazecalc-backups-<account>`, its TLS-only policy and the parameter `/glazecalc/backup-bucket`; the role and instance profile `glazecalc-instance` (inline policy `glazecalc-app`, and `glazecalc-staging-images` if set); the security group `glazecalc-web`; the launch template `glazecalc`; the instance; its Elastic IP; the daily snapshot policy; the alarms `glazecalc-recover` and `glazecalc-reboot` | Steps 2 to 4 and 6 to 10 (`instance-trust.json`, `instance-policy.json`, `dlm-policy.json`, `cloud-init.yaml`); [deploy/README.md](../README.md), Staging, step 8 (`staging-images-policy.json`)  |
| `glazecalc-mail`         | The SES identity `glazecalcapp.com` (2048-bit DKIM, MAIL FROM `mail.glazecalcapp.com`); the topic `glazecalc-alerts`; the bounce and complaint rate alarms; the user `glazecalc-mailer` with its inline policy `send-as-no-reply`                                                                                                                                                                                          | Section 14 and `create-mailer.sh` (`mailer-policy.json`)                                                                                                                                          |
| `glazecalc-mail-inbound` | The bucket `glazecalc-mail-<account>` and its policy; the role `glazecalc-mail-forwarder` (inline `forward-mail`); the function `glazecalc-mail-forwarder` (from [mail-forwarder/](../aws/mail-forwarder)), its log group and SES's permission to invoke it; the receipt rule set `glazecalc-inbound` and its rule `forward-to-owner`; the user `glazecalc-mail-send` (inline `send-as-the-six`)                           | Section 15 and `create-inbound.sh` (`mail-bucket-policy.json`, `mail-forwarder-trust.json`, `mail-forwarder-policy.json`, `mail-receipt-rule.json`, `mail-send-policy.json`)                      |

The code is in `lib/`, a file a stack, and each resource's comment says where it came from and why it is written the
way it is. A few rules hold throughout, each because of the import:

- **Inline policies stay inside their role or user** (CloudFormation's `Policies` property), under the names the
  scripts gave them. A separate `AWS::IAM::Policy` cannot be imported and would sit beside the live policy.
- **Policies are written out as the JSON says.** `grant…()` and the L2 constructs are used where they give the same
  policy (bucket and role ARNs, the trust principals); where they would give more (`grantRead` on a bucket adds
  `s3:GetObject*`, `s3:GetBucket*` and `s3:List*`; `StringParameter.grantRead` adds three more SSM actions; the
  `aws-ses-actions` actions add wider permissions of their own), the statement is explicit. The tests compare every
  policy and document with its JSON file in `deploy/aws/`.
- **Nothing is deleted by CloudFormation.** Every resource has `DeletionPolicy: RetainExceptOnCreate` and
  `UpdateReplacePolicy: Retain`, and every stack has termination protection. A resource removed from the code stays
  in AWS; delete it by hand afterwards. (Only what a failed deploy has just made is removed by its rollback.)
- **No template parameters and no references between stacks.** The owner's inbox, the one value the forwarder needs
  that is not in this repository, is read from Parameter Store by a dynamic reference.
- **Secrets stay out.** Parameters are named, never given a value; no access key is declared.

### What stays outside, and why

| What                                                                                                                                                                                                       | Why                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The SecureString parameters (`/glazecalc/app-secret`, `mongo-password`, `mfa-key`, `smtp-url`, `mongo-admin-password`, the sign-in providers' secrets, `/glazecalc/staging/*`) and `/glazecalc/acme-email` | Secrets, or the owner's address: their values must never be in a template, and CloudFormation cannot make a SecureString anyway. The instance role reads them by name (`/glazecalc/*`).                                                |
| The access keys of `glazecalc-mailer` and `glazecalc-mail-send`, and the SMTP passwords made from them                                                                                                     | Secrets, rotated by `create-mailer.sh` and `create-inbound.sh smtp-key`, which keep working: they make keys and the `smtp-url` parameter, which the stacks do not declare.                                                             |
| DNS in Route 53: the site's A records (`glazecalcapp.com`, `www`, `staging`), the MX records, DKIM's CNAMEs, SPF, DMARC, and the MCP Registry's TXT value                                                  | CloudFormation cannot import record sets; making them anew means deleting the live ones first, which takes the site or the mail down. The apex TXT set also holds values other than SES's.                                             |
| Which receipt rule set is active                                                                                                                                                                           | CloudFormation has no property for it. It is set once by hand and stays set while the rule set keeps its name.                                                                                                                         |
| SES's notification topics for bounces and complaints (`set-identity-notification-topic`)                                                                                                                   | An SES (v1) setting with no CloudFormation property. They point at `glazecalc-alerts`, whose ARN the import keeps.                                                                                                                     |
| The email subscription to `glazecalc-alerts`, and the budget `monthly`                                                                                                                                     | Both name the owner's address, the subscription needs a click to confirm, and CloudFormation cannot import a budget.                                                                                                                   |
| SES account settings (production access, the suppression list and its monthly clean-up)                                                                                                                    | Account settings, not resources.                                                                                                                                                                                                       |
| EBS encryption by default and the instance metadata defaults (step 1)                                                                                                                                      | Account settings with no CloudFormation resource.                                                                                                                                                                                      |
| The roles `AWSDataLifecycleManagerDefaultRole` and `AWSServiceRoleForCloudWatchEvents`                                                                                                                     | AWS's own, shared by the whole account: the snapshot policy names the first by ARN.                                                                                                                                                    |
| The attachment of `glazecalc-operator` to the CLI user's group                                                                                                                                             | The group's name is not in the repository. The stack declares the policy; the attachment stays as the admin made it.                                                                                                                   |
| `glazecalc-mail` (`mail-setup-policy.json`) and `glazecalc-mail-inbound` (`mail-inbound-setup-policy.json`)                                                                                                | Policies for people running setup scripts once, not part of the app. The first names a personal test address; the README says it can be detached after production access. The second is not needed once the inbound stack is imported. |
| The SES identity of the sandbox test recipient                                                                                                                                                             | A test of the first setup, and a personal address.                                                                                                                                                                                     |
| GitHub's side: the environments, their reviewers and variables, the package's visibility                                                                                                                   | Not AWS.                                                                                                                                                                                                                               |

## Settings

Read from the CDK context: `cdk.json`'s `context`, or `-c key=value` on the command line. The defaults are
glazecalc's own values, all already published in `deploy/aws/` and the READMEs; a value that would make a wrong ARN
or name stops the synth (`lib/settings.ts`).

| Key                                     | Default                                                     | What                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `account`, `region`                     | `724654236968`, `us-west-2`                                 | Where the stacks go; every ARN is built from them.                                                                                              |
| `domain`                                | `glazecalcapp.com`                                          | The site's domain, for SES and the operator's DNS rights.                                                                                       |
| `repository`                            | `AaronFilson/glazecalc`                                     | The only repository whose `production` and `staging` environments may assume the deploy roles.                                                  |
| `instanceType`                          | `t4g.micro`                                                 | The launch template's instance type.                                                                                                            |
| `launchTemplateVersion`                 | `1`                                                         | The launch template version the instance was started from. Changing it replaces the instance: a new one, from that version, with an empty disk. |
| `rootDeviceName`                        | `/dev/xvda`                                                 | The Debian 13 AMI's root device (step 7).                                                                                                       |
| `stagingImages`                         | `false`                                                     | `true` if the optional S3 route for staging images was set up (deploy/README.md, Staging, step 8).                                              |
| `ownerInboxVersion`                     | `1`                                                         | The version of the String parameter `/glazecalc/owner-inbox` the forwarder is deployed with. See "Changing the inbox" below.                    |
| `oldServers`                            | `i-07a925b2d7d19f991`, `i-052d3dcd53fa88288`                | The servers from before this setup, which the operator may stop or terminate; an empty list (`-c oldServers=`) drops that statement.            |
| `bounceAlarmName`, `complaintAlarmName` | `glazecalc-ses-bounce-rate`, `glazecalc-ses-complaint-rate` | The SES reputation alarms. Section 14 gives no names: check the live ones before the import.                                                    |
| `import`                                | `false`                                                     | The stacks as they are live today, for `cdk import` (below).                                                                                    |

`cdk.json` also holds the CDK feature flags, each at the value AWS recommends for a new app except three:
`@aws-cdk/aws-iam:minimizePolicies` is off, so each statement stays as the JSON documents write it rather than merged
with others; `@aws-cdk/aws-lambda:useCdkManagedLogGroup` is off, because the forwarder's log group is declared on its
own, under the name Lambda gave it; and `@aws-cdk/core:enableAdditionalMetadataCollection` is off, as is
`cli-telemetry`: nothing about the app is reported to AWS (the App writes no `CDKMetadata` resource either). Of the
recommended ones, `@aws-cdk/core:validateAgainstDefaultRules` makes a property CloudFormation's schema refuses stop the
synth, and `@aws-cdk/core:enablePartitionLiterals` writes ARNs as `arn:aws:…`, as the README does. The tests read the
flags from `cdk.json`, so they build what `cdk synth` builds.

## Synthesize and test

```bash
cd deploy/cdk
npm ci --ignore-scripts      # installed apart from the app, like scripts/lighthouse/
npm run synth                # cdk synth --quiet: the templates in cdk.out/, and cdk-nag on each
npx cdk synth glazecalc-server          # one stack's template, printed
npx cdk synth -c import=true            # the stacks as they are live (import mode)
npm test                     # node --test: the tests and the snapshots
npm run test:update          # after a change you meant: writes the snapshots again; read the diff
npm run typecheck            # tsc -p .: the types (Node does not check them)
```

The tests (`test/*.test.ts`) use `aws-cdk-lib/assertions` under Node's own test runner, so nothing else is
installed. They hold every policy, trust policy, command document, the receipt rule and the snapshot policy to its
JSON document in `deploy/aws/`; check the GitHub trust conditions, the deploy roles' one permission each, the
instance role, the buckets' encryption, public access blocks and lifecycle rules, the alarms, import mode and the
settings; and compare each stack's whole template with its copy in `test/snapshots/`, which is what `cdk synth`
writes, so any change to what would be deployed shows in review. Building the stacks runs cdk-nag, so every test run
is also a cdk-nag run. The Infrastructure workflow (`.github/workflows/infrastructure.yml`) runs the audit, the type
check, the synth in both modes and the tests on every pull request and push that changes `deploy/`.

The versions are exact, each released at least two weeks before it was chosen: `aws-cdk-lib` 2.275.0, `constructs`
10.8.1, `cdk-nag` 3.0.2, and the CLI `aws-cdk` 2.1146.1, which must be at least as new as the library (Dependabot
moves them together); TypeScript and `@types/node` as the app's. `npm audit` reports no high or critical
vulnerability. It does report three moderate ones, all one advisory: the copy of `minimatch` that `aws-cdk-lib`
bundles inside its own package (GHSA-g3hv-75wg-m249, a denial of service from a crafted glob pattern). An
`overrides` entry cannot reach a bundled dependency, and the app gives `minimatch` no patterns but its own asset
exclude; it goes when `aws-cdk-lib` bundles a fixed one.

### cdk-nag

cdk-nag's AWS Solutions rules run on every template as it is synthesized (`lib/app.ts`). A finding fails the synth
unless it is fixed or acknowledged next to its resource with a reason (`Validations.of(…).acknowledge`); each IAM
wildcard is acknowledged on its own, so a new one fails until someone looks at it. What it found:

| Rule                                                      | Where                                    | Resolved                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S10, requests without TLS                                 | Both buckets                             | **Fixed:** both refuse plain HTTP (`enforceSSL`). The backup bucket gets its first policy; the mail bucket's gains the statement.                                                                                                                                                        |
| EC29, termination protection                              | The instance                             | **Fixed:** turned on. The instance holds the only copy of the database between backups. Stopping, resizing and rebooting are unaffected.                                                                                                                                                 |
| EC26, unencrypted volumes                                 | The instance                             | Acknowledged: a false finding. The volume comes from the launch template, which sets `Encrypted`, and the account encrypts new volumes by default.                                                                                                                                       |
| EC23, open to the world                                   | `glazecalc-web`                          | Acknowledged: ports 80 and 443 for the public site, by design (one instance, nginx, no load balancer: ADR 1 and 3).                                                                                                                                                                      |
| EC28, detailed monitoring                                 | The instance                             | Acknowledged: billed, and the status checks the alarms watch come every minute without it.                                                                                                                                                                                               |
| S1, server access logs                                    | Both buckets                             | Acknowledged: one reader and writer each, a handful of objects a day; a log bucket would be one more to keep private and expire.                                                                                                                                                         |
| SNS2, encryption                                          | `glazecalc-alerts`                       | Acknowledged: the AWS-managed SNS key would stop CloudWatch and SES from publishing, and a key of its own costs more than the topic carries (alarm states and bounce notices, emailed in clear anyway).                                                                                  |
| SNS3, requests without TLS                                | `glazecalc-alerts`                       | Acknowledged: a policy of our own would replace SNS's default one, which is what lets the alarms and SES publish; that path can only be tested live.                                                                                                                                     |
| IAM4, AWS managed policy                                  | `glazecalc-instance`                     | Acknowledged: `AmazonSSMManagedInstanceCore`, for Session Manager and Run Command (ADR 2), kept current by AWS.                                                                                                                                                                          |
| IAM5, wildcards (each acknowledged on its own, 43 in all) | Every role, user and the operator policy | Acknowledged, each with what limits it: the instances by tag, the parameters under `/glazecalc/`, the objects under one prefix, SES's `identity/*` with a `ses:FromAddress` condition, the forwarder's own log group, and the operator policy's 32 as written in `operator-policy.json`. |

In import mode, S10 and EC29 are acknowledged as such: that template is what is live today, and the deploy after the
import fixes them.

## Bringing the live resources under CDK

`cdk import` records resources that already exist in a CloudFormation stack, without touching them. Nothing in AWS
changes until the `cdk deploy` that follows each import, and `cdk diff` shows that deploy in full first. Read this
whole section before starting, then do one stack at a time, in this order: `glazecalc-access`, `glazecalc-mail`,
`glazecalc-server`, `glazecalc-mail-inbound`. The first two change nothing at all; the last may stop mail to the six
addresses for a minute, so do it at a quiet time.

Why `-c import=true`: CloudFormation does not compare the template with the resource when it imports, and later
applies only what changes between one template and the next. Imported with the hardened templates, the TLS-only
statement and termination protection would be recorded as done without ever being applied. Import mode leaves them
out, so the import records the resources as they are, and the deploy after it adds them, in the open.

### Once, before the first stack

1. **Where to run it:** as the admin (the stacks make IAM roles and users), from a clone of this repository, with
   Node 24 and the AWS CLI, in us-west-2. In CloudShell, check `node --version` and install Node 24 with nvm if it is
   older; or use a PC with the admin's credentials. Then:

   ```bash
   cd deploy/cdk && npm ci --ignore-scripts
   npm test                                  # all pass before anything else
   export AWS_REGION=us-west-2
   aws sts get-caller-identity --query Account --output text   # expect 724654236968
   ```

2. **Bootstrap** the account for CDK, once:

   ```bash
   npx cdk bootstrap aws://724654236968/us-west-2
   ```

   It makes the stack `CDKToolkit`: an S3 bucket where CDK puts the forwarder's zip, an ECR repository (unused here),
   and the roles CDK deploys through. By default CloudFormation deploys with administrator rights through those roles,
   which anyone allowed to assume them could use: check that no user or role but the admin may assume the
   `cdk-hnb659fds-*` roles (the operator policy allows no `sts:AssumeRole`).

3. **The owner's inbox in Parameter Store**, which the forwarder reads when it is deployed (the address stays out of
   the repository and the templates):

   ```bash
   aws ssm put-parameter --name /glazecalc/owner-inbox --type String --value '<the inbox create-inbound.sh was given>'
   ```

   It must be version 1, as `ownerInboxVersion` says. (The current value is the function's `OWNER_INBOX`:
   `aws lambda get-function-configuration --function-name glazecalc-mail-forwarder --query Environment.Variables.OWNER_INBOX`.)

4. **Check the settings against what is live**, and set in `cdk.json`'s `context` whatever differs:

   ```bash
   # The SES reputation alarms' names (bounceAlarmName, complaintAlarmName):
   aws cloudwatch describe-alarms --alarm-name-prefix glazecalc --query 'MetricAlarms[].[AlarmName,MetricName]' --output text
   # The instance: its launch template version (launchTemplateVersion), type and root device:
   aws ec2 describe-instances --filters Name=tag:app,Values=glazecalc Name=instance-state-name,Values=running \
     --query 'Reservations[].Instances[].[InstanceId,InstanceType,RootDeviceName,Tags[?Key==`aws:ec2launchtemplate:version`].Value|[0]]' --output text
   # The launch template's own type (instanceType), if the instance was resized since:
   aws ec2 describe-launch-template-versions --launch-template-name glazecalc --versions '$Default' \
     --query 'LaunchTemplateVersions[0].[VersionNumber,LaunchTemplateData.InstanceType]' --output text
   # The staging images route (stagingImages: true if glazecalc-staging-images is listed):
   aws iam list-role-policies --role-name glazecalc-instance --query PolicyNames
   aws s3api get-bucket-lifecycle-configuration --bucket glazecalc-backups-724654236968 --query 'Rules[].ID'
   ```

   A name that differs cannot simply be imported under another: the import would fail, or the deploy after it would
   replace the resource. Commit the `cdk.json` change, so that CI and the next person synthesize the same templates.

### Each stack

The same seven steps for each, with what is particular to each stack in the next sections. `<stack>` is the stack's
name.

1. **Look at what will be imported:** `npx cdk diff -c import=true <stack>`. The stack does not exist yet, so every
   resource shows as new (`[+]`). Check each name against the live resource.
2. **Record the identifiers:** `npx cdk import -c import=true <stack> --record-resource-mapping import-<stack>.json`.
   For each resource it asks what to import: where the template names the resource (a role name, a bucket name) it
   offers that name, so answer yes; otherwise it asks for the identifier, from the tables below. A resource type
   CloudFormation cannot import is skipped with "unsupported resource type"; the stack's section says what then. It
   writes the file and imports nothing. Read the file, and keep it out of the repository (the server's holds the
   instance's ids).
3. **Import:** `npx cdk import -c import=true <stack> --resource-mapping import-<stack>.json`. CloudFormation makes
   the stack from the existing resources: `IMPORT_COMPLETE`.
4. **Check for drift**, which shows where the live resources differ from the template:

   ```bash
   id=$(aws cloudformation detect-stack-drift --stack-name <stack> --query StackDriftDetectionId --output text)
   aws cloudformation describe-stack-drift-detection-status --stack-drift-detection-id "$id" --query DetectionStatus   # until DETECTION_COMPLETE
   aws cloudformation describe-stack-resource-drifts --stack-name <stack> --stack-resource-drift-status-filters MODIFIED DELETED \
     --query 'StackResourceDrifts[].[LogicalResourceId,PropertyDifferences[].[PropertyPath,ExpectedValue,ActualValue]]'
   ```

   Only the drift the stack's section expects is fine. Anything else: stop and compare. Change the code to match what
   is live (and the JSON document in `deploy/aws/`, which the tests compare with), or decide the live resource is
   wrong and let the deploy change it, which only happens if its template changes. Undo the import (below) if unsure.
   (SSM documents and bucket policies are not checked for drift.)

5. **Look at the deploy:** `npx cdk diff <stack>`, now without import mode. Besides CDK's own parameter
   `BootstrapVersion` and rule `CheckBootstrapVersion`, which the import leaves out, it must show only the changes the
   stack's section lists.
6. **Deploy:** `npx cdk deploy <stack>`. It asks before changing IAM; answer after reading.
7. **Check** as the stack's section says.

**Undoing an import:** turn off the stack's termination protection and delete the stack. Every resource is retained,
so CloudFormation forgets them and leaves them as they are (each shows `DELETE_SKIPPED` in the stack's events):

```bash
aws cloudformation update-termination-protection --no-enable-termination-protection --stack-name <stack>
aws cloudformation delete-stack --stack-name <stack>
```

After a deploy, deleting the stack would leave what that deploy made in place too (the TLS-only policies, a new
snapshot policy), so undo a deploy with a deploy instead: revert the change in the code and run `cdk deploy` again. A
failed deploy rolls itself back, removing what it had just made. A failed import rolls back too
(`IMPORT_ROLLBACK_COMPLETE`) and changes nothing; delete the empty stack as above before trying again.

### glazecalc-access

| Resource                            | Identifier                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `GitHubOidc`                        | `Arn`: `arn:aws:iam::724654236968:oidc-provider/token.actions.githubusercontent.com` |
| `DeployRole`, `StagingRole`         | offered: `glazecalc-github-deploy`, `glazecalc-github-staging`                       |
| `DeployDocument`, `StagingDocument` | offered: `glazecalc-deploy`, `glazecalc-staging-deploy`                              |
| `OperatorPolicy`                    | `PolicyArn`: `arn:aws:iam::724654236968:policy/glazecalc-operator`                   |

- **Drift expected:** none.
- **The deploy after it changes:** nothing.
- **Check:** the next Deploy and Deploy staging runs work as before.
- **Before the operator policy's first change through CDK:** IAM keeps five versions of a managed policy, and each
  change makes one. If `aws iam list-policy-versions --policy-arn arn:aws:iam::724654236968:policy/glazecalc-operator`
  lists five, delete the oldest that is not the default (`aws iam delete-policy-version`). The policy is 7 characters
  under IAM's limit of 6,144, so a change that adds anything must take something out.

### glazecalc-mail

| Resource                                | Identifier                                                        |
| --------------------------------------- | ----------------------------------------------------------------- |
| `Domain`                                | offered: `glazecalcapp.com`                                       |
| `Alerts`                                | `TopicArn`: `arn:aws:sns:us-west-2:724654236968:glazecalc-alerts` |
| `BounceRateAlarm`, `ComplaintRateAlarm` | offered: the names from the settings                              |
| `Mailer`                                | offered: `glazecalc-mailer`                                       |

- **Drift expected:** none.
- **The deploy after it changes:** nothing.
- **Check:** a password reset email still arrives (the app's credentials are unchanged).

### glazecalc-server

| Resource                           | Identifier                                                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Backups`, `BackupBucketParameter` | offered: `glazecalc-backups-724654236968`, `/glazecalc/backup-bucket`                                                                                            |
| `InstanceRole`, `InstanceProfile`  | offered: `glazecalc-instance` for both                                                                                                                           |
| `WebSecurityGroup`                 | its group id: `aws ec2 describe-security-groups --group-names glazecalc-web --query 'SecurityGroups[0].GroupId' --output text`                                   |
| `LaunchTemplate`                   | its id: `aws ec2 describe-launch-templates --launch-template-names glazecalc --query 'LaunchTemplates[0].LaunchTemplateId' --output text`                        |
| `Instance`                         | its id, from the settings check above                                                                                                                            |
| `ElasticIp`                        | `PublicIp` and `AllocationId`: `aws ec2 describe-addresses --filters Name=tag:app,Values=glazecalc --query 'Addresses[0].[PublicIp,AllocationId]' --output text` |
| `Snapshots`                        | its `PolicyId`, if offered: `aws dlm get-lifecycle-policies --query 'Policies[].[PolicyId,Description]' --output text`                                           |
| `RecoverAlarm`, `RebootAlarm`      | offered: `glazecalc-recover`, `glazecalc-reboot`                                                                                                                 |

- **Drift expected:** the launch template's `ImageId` and perhaps its `UserData`. The live version holds the AMI id
  and `cloud-init.yaml` of October 2026; the code names the newest Debian 13 through its public parameter (EC2
  resolves it at each launch) and today's `cloud-init.yaml`. Neither touches the running instance, which keeps its
  version (`launchTemplateVersion`). They meet the next time the launch template's data changes in the code, which
  makes a new version. Perhaps also the buckets' lifecycle rules, written with a filter by the CLI and with a plain
  prefix by CloudFormation: the same rule.
- **The deploy after it changes:** it adds the backup bucket's TLS-only policy (it has none now) and turns on the
  instance's termination protection (no restart). If CloudFormation could not import the snapshot policy, it makes a
  new one, the same as the old.
- **Check:** the nightly backup still reaches the bucket (or run `sudo /opt/glazecalc/backup.sh` in Session Manager);
  `aws ec2 describe-instance-attribute --instance-id <id> --attribute disableApiTermination` says true.
- **If a new snapshot policy was made:** both policies snapshot the instance until the old one goes. After the new
  one's first snapshot (10:00 UTC), delete the old: `aws dlm delete-lifecycle-policy --policy-id <old id>`. Its
  snapshots are no longer managed: once the new policy has seven of its own, delete the old ones by hand (tag
  `aws:dlm:lifecycle-policy-id` = the old id).

### glazecalc-mail-inbound

| Resource                                | Identifier                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Mail`                                  | offered: `glazecalc-mail-724654236968`                                                                               |
| `MailPolicy` (the bucket policy)        | `Bucket`: `glazecalc-mail-724654236968`                                                                              |
| `ForwarderRole`, `ForwarderLogs`        | offered: `glazecalc-mail-forwarder`, `/aws/lambda/glazecalc-mail-forwarder`                                          |
| `Forwarder`                             | offered: `glazecalc-mail-forwarder`                                                                                  |
| `ForwarderAllowSesInbound` (permission) | `FunctionName`: `arn:aws:lambda:us-west-2:724654236968:function:glazecalc-mail-forwarder`; `Id`: `allow-ses-inbound` |
| `RuleSet`, `ForwardToOwner` (the rule)  | if offered: `glazecalc-inbound`; the rule `forward-to-owner` in `glazecalc-inbound`                                  |
| `GmailSender`                           | offered: `glazecalc-mail-send`                                                                                       |

- **Drift expected:** none. The function keeps the code `create-inbound.sh` last uploaded until the forwarder's
  code next changes here; CloudFormation then uploads the new zip.
- **The deploy after it changes:** it adds the TLS-only statement to the mail bucket's policy.
- **If CloudFormation could not import the rule set and the rule:** the deploy must make them, and their names are
  taken. At a quiet time, run these together, then the check. Mail to the six addresses bounces back to its sender
  between the first command and the last (a minute or two):

  ```bash
  aws ses set-active-receipt-rule-set                     # no rule set active: mail to the six bounces
  aws ses delete-receipt-rule --rule-set-name glazecalc-inbound --rule-name forward-to-owner
  aws ses delete-receipt-rule-set --rule-set-name glazecalc-inbound
  npx cdk deploy glazecalc-mail-inbound                   # makes them again, as mail-receipt-rule.json says
  aws ses set-active-receipt-rule-set --rule-set-name glazecalc-inbound
  ```

  If the deploy fails, it rolls back what it made; make the rule set and rule again with the script
  (`OWNER_INBOX=<inbox> bash deploy/aws/create-inbound.sh`, answering yes to steps 6 and 8 only) and find out why
  before trying again.

- **Check:** the test in [deploy/aws/README.md](../aws/README.md), section 15: a message to each address arrives, and
  mail to any other address bounces.

### After the import

- **Changes go through the code:** change `lib/`, run `npm test` (and `npm run test:update` if the template is meant
  to change), open a pull request, and after the merge, as the admin, `npx cdk diff <stack>` then
  `npx cdk deploy <stack>`. A change made by hand in the console or the CLI is drift, and the next deploy may undo it.
- **The scripts:** do not run `setup-github-deploy.sh`, `create-inbound.sh` (setup or `undo`) or the README's
  `create-*` and `put-*` commands for these resources any more: they would change them behind CloudFormation's back.
  `create-mailer.sh` and `create-inbound.sh smtp-key` still rotate the SMTP keys; they also put each user's policy
  again, as it already is.
- **The JSON documents** in `deploy/aws/` stay while those scripts read them, and the tests keep the two in step: a
  policy changed in the code fails the tests until its JSON file says the same. Once the scripts' setup parts are
  retired, the files can go, with the tests that read them.
- **Changing the inbox:** put the new address as a new version of `/glazecalc/owner-inbox`
  (`aws ssm put-parameter --overwrite`), set `ownerInboxVersion` in `cdk.json` to that version, and deploy
  `glazecalc-mail-inbound`. CloudFormation reads the parameter only when the template changes, which the new version
  number does.
- **Rebuilding the instance** is a change of `launchTemplateVersion` to a newer version of the launch template:
  CloudFormation starts a new instance from it, moves the Elastic IP and the alarms to it, and keeps the old one
  running (`UpdateReplacePolicy: Retain`). The new one starts with an empty database: restore a dump onto it
  ([deploy/README.md](../README.md), "Restoring a backup"). The old one still has the `app=glazecalc` tag, so deploys
  and snapshots would reach it too: once the new one serves the site, remove that tag from the old one and stop it,
  and terminate it when nothing more is needed from its disk (turn off its termination protection first).
