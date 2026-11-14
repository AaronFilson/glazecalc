// Mail in (deploy/aws/README.md, section 15): SES receives mail for six
// addresses, scans it, stores it in a private bucket for 30 days, and the
// forwarder Lambda (deploy/aws/mail-forwarder) sends it on to the owner's
// inbox. Also the IAM user the owner replies as from Gmail. What
// create-inbound.sh made, except the MX record and the rule set's activation
// (README.md, "What stays outside").
import { fileURLToPath } from 'node:url';
import { Duration, Stack, Tags, Validations, type StackProps } from 'aws-cdk-lib';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal, User } from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, Function as LambdaFunction, Runtime, type CfnPermission } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { ReceiptRule, ReceiptRuleSet, TlsPolicy, type IReceiptRuleAction } from 'aws-cdk-lib/aws-ses';
import type { Construct } from 'constructs';
import { inlinePolicy } from './inline-policy.ts';
import { bucketArnInFinding } from './nag.ts';
import { APP_TAG, type Settings } from './settings.ts';

export interface InboundStackProps extends StackProps {
  readonly settings: Settings;
}

/** The six addresses with mailboxes (no catch-all: mail to any other is refused). */
export const MAILBOXES = ['privacy', 'security', 'postmaster', 'abuse', 'hello', 'contact'];

export const FUNCTION_NAME = 'glazecalc-mail-forwarder';
export const RULE_SET_NAME = 'glazecalc-inbound';
export const RULE_NAME = 'forward-to-owner';
/** The owner's inbox, a String parameter made by hand: the address is in no file in this repository. */
export const OWNER_INBOX_PARAMETER = '/glazecalc/owner-inbox';
const PREFIX = 'inbound/';

export class InboundStack extends Stack {
  readonly mail: Bucket;
  readonly forwarderRole: Role;
  readonly forwarder: LambdaFunction;
  readonly rule: ReceiptRule;
  readonly sender: User;

  constructor(scope: Construct, id: string, props: InboundStackProps) {
    super(scope, id, props);
    const { settings } = props;
    const { account, region, domain } = settings;
    const forwarderAddress = `forwarder@${domain}`;
    // Receipt rules have no ARN attribute; this is the one SES gives the rule.
    const ruleArn = `arn:aws:ses:${region}:${account}:receipt-rule-set/${RULE_SET_NAME}:receipt-rule/${RULE_NAME}`;

    this.mail = new Bucket(this, 'Mail', {
      bucketName: `glazecalc-mail-${account}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: !settings.import,
      lifecycleRules: [
        {
          id: 'expire-mail',
          prefix: PREFIX,
          expiration: Duration.days(30),
          abortIncompleteMultipartUploadAfter: Duration.days(1)
        }
      ]
    });
    // SES may store mail for this account and this rule only (mail-bucket-policy.json).
    this.mail.addToResourcePolicy(
      new PolicyStatement({
        sid: 'SesMayStoreMailFromThisRuleOnly',
        principals: [new ServicePrincipal('ses.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [this.mail.arnForObjects(`${PREFIX}*`)],
        conditions: { StringEquals: { 'aws:SourceAccount': account, 'aws:SourceArn': ruleArn } }
      })
    );
    Validations.of(this.mail).acknowledge({
      id: 'AwsSolutions-S1',
      reason:
        'Only SES writes here and only the forwarder reads, one object a message; a second bucket for access logs would be one more to keep private and expire, for a few messages a month.'
    });
    if (settings.import) {
      Validations.of(this.mail).acknowledge({
        id: 'AwsSolutions-S10',
        reason:
          "Import mode: the bucket policy as it is live (SES's statement only). The deploy after the import adds the TLS-only statement."
      });
    }

    // mail-forwarder-trust.json and mail-forwarder-policy.json. Written out:
    // the bucket's grantRead would add s3:GetObject*, s3:GetBucket* and
    // s3:List*, and the log group's grantWrite lacks logs:CreateLogGroup.
    this.forwarderRole = new Role(this, 'ForwarderRole', {
      roleName: FUNCTION_NAME,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com', {
        conditions: { StringEquals: { 'aws:SourceAccount': account } }
      }),
      inlinePolicies: {
        'forward-mail': new PolicyDocument({
          statements: [
            new PolicyStatement({
              sid: 'ReadReceivedMail',
              actions: ['s3:GetObject'],
              resources: [this.mail.arnForObjects(`${PREFIX}*`)]
            }),
            new PolicyStatement({
              sid: 'SendOnlyAsTheForwarder',
              actions: ['ses:SendRawEmail'],
              resources: [`arn:aws:ses:${region}:${account}:identity/*`],
              conditions: { StringEquals: { 'ses:FromAddress': forwarderAddress } }
            }),
            new PolicyStatement({
              sid: 'Logs',
              actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: [`arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${FUNCTION_NAME}:*`]
            })
          ]
        })
      }
    });
    Tags.of(this.forwarderRole).add(APP_TAG.key, APP_TAG.value);
    Validations.of(this.forwarderRole).acknowledge(
      {
        id: `AwsSolutions-IAM5[Resource::${bucketArnInFinding(this.mail)}/${PREFIX}*]`,
        reason: 'Each message is its own object under inbound/, named by SES with the message id.'
      },
      {
        id: `AwsSolutions-IAM5[Resource::arn:aws:ses:${region}:${account}:identity/*]`,
        reason: `SES checks a send against every identity the message touches; the condition ses:FromAddress = ${forwarderAddress} is what limits it.`
      },
      {
        id: `AwsSolutions-IAM5[Resource::arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${FUNCTION_NAME}:*]`,
        reason: "The function's own log group; :* covers its log streams, which Lambda names by date."
      }
    );

    // Lambda makes this log group itself on the first message; declared so it
    // is imported and kept. Kept forever, as it is now: a line per message
    // (its id, forwarded or dropped), never an address.
    new LogGroup(this, 'ForwarderLogs', {
      logGroupName: `/aws/lambda/${FUNCTION_NAME}`,
      retention: RetentionDays.INFINITE
    });

    // create-inbound.sh, step 4: Node 24 on arm64, the two modules zipped (not
    // the tests). The AWS SDK comes with the runtime. The owner's inbox comes
    // from Parameter Store when CloudFormation deploys: a dynamic reference,
    // so neither this code nor the template holds the address, and no template
    // parameter, which cdk import could not pass.
    this.forwarder = new LambdaFunction(this, 'Forwarder', {
      functionName: FUNCTION_NAME,
      runtime: Runtime.NODEJS_24_X,
      architecture: Architecture.ARM_64,
      handler: 'index.handler',
      code: Code.fromAsset(fileURLToPath(new URL('../../aws/mail-forwarder', import.meta.url)), {
        exclude: ['test']
      }),
      role: this.forwarderRole,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        OWNER_INBOX: `{{resolve:ssm:${OWNER_INBOX_PARAMETER}:${settings.ownerInboxVersion}}}`,
        BUCKET: this.mail.bucketName,
        OBJECT_PREFIX: PREFIX,
        FORWARDER_ADDRESS: forwarderAddress
      }
    });
    Tags.of(this.forwarder).add(APP_TAG.key, APP_TAG.value);

    // Step 5: SES may invoke it for this account and this rule only.
    this.forwarder.addPermission('AllowSesInbound', {
      principal: new ServicePrincipal('ses.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceAccount: account,
      sourceArn: ruleArn
    });
    const permission = this.forwarder.node.findChild('AllowSesInbound') as CfnPermission;

    // Step 6 (mail-receipt-rule.json): the six recipients, scanned, stored,
    // then forwarded. The actions are written here rather than taken from
    // aws-ses-actions: its S3 action adds a bucket policy statement keyed on
    // aws:Referer, and its Lambda action a permission for any rule in the
    // account, both wider than the two above.
    const ruleSet = new ReceiptRuleSet(this, 'RuleSet', { receiptRuleSetName: RULE_SET_NAME });
    const store: IReceiptRuleAction = {
      bind: () => ({ s3Action: { bucketName: this.mail.bucketName, objectKeyPrefix: PREFIX } })
    };
    const forward: IReceiptRuleAction = {
      bind: () => ({ lambdaAction: { functionArn: this.forwarder.functionArn, invocationType: 'Event' } })
    };
    this.rule = new ReceiptRule(this, 'ForwardToOwner', {
      ruleSet,
      receiptRuleName: RULE_NAME,
      enabled: true,
      tlsPolicy: TlsPolicy.OPTIONAL,
      scanEnabled: true,
      recipients: MAILBOXES.map((box) => `${box}@${domain}`),
      actions: [store, forward]
    });
    // SES checks, when the rule is made, that it may write to the bucket and
    // invoke the function, so the policy and the permission come first.
    this.rule.node.addDependency(this.mail.policy!, permission);

    // Step 7: the user Gmail's "Send mail as" signs in as (create-inbound.sh
    // smtp-key makes its SMTP password); it may send only as the six.
    this.sender = new User(this, 'GmailSender', { userName: 'glazecalc-mail-send' });
    Tags.of(this.sender).add(APP_TAG.key, APP_TAG.value);
    inlinePolicy(
      this.sender,
      'send-as-the-six',
      new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: 'SendOnlyAsTheSixAddressesThroughSmtp',
            actions: ['ses:SendRawEmail'],
            resources: [`arn:aws:ses:${region}:${account}:identity/*`],
            conditions: { StringEquals: { 'ses:FromAddress': MAILBOXES.map((box) => `${box}@${domain}`) } }
          })
        ]
      })
    );
    Validations.of(this.sender).acknowledge({
      id: `AwsSolutions-IAM5[Resource::arn:aws:ses:${region}:${account}:identity/*]`,
      reason:
        'SES checks a send against every identity the message touches; the condition ses:FromAddress, the six addresses, is what limits it.'
    });
  }
}
