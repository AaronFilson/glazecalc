// Mail out (deploy/aws/README.md, section 14; docs/adr/0006): the SES domain
// identity with 2048-bit DKIM and its own MAIL FROM domain, the alerts topic
// that bounces, complaints and the reputation alarms go to, and the IAM user
// whose SMTP credentials the app sends with.
import { Duration, Stack, Tags, Validations, type StackProps } from 'aws-cdk-lib';
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { PolicyDocument, PolicyStatement, User } from 'aws-cdk-lib/aws-iam';
import {
  DkimIdentity,
  EasyDkimSigningKeyLength,
  EmailIdentity,
  Identity,
  MailFromBehaviorOnMxFailure
} from 'aws-cdk-lib/aws-ses';
import { Topic } from 'aws-cdk-lib/aws-sns';
import type { Construct } from 'constructs';
import { inlinePolicy } from './inline-policy.ts';
import { APP_TAG, type Settings } from './settings.ts';

export interface MailStackProps extends StackProps {
  readonly settings: Settings;
}

export class MailStack extends Stack {
  readonly identity: EmailIdentity;
  readonly alerts: Topic;
  readonly mailer: User;

  constructor(scope: Construct, id: string, props: MailStackProps) {
    super(scope, id, props);
    const { account, region, domain } = props.settings;

    // Identity.domain, not publicHostedZone: the DNS records (DKIM, MAIL FROM,
    // SPF, DMARC) stay in Route 53 as they are (README.md, "What stays outside").
    this.identity = new EmailIdentity(this, 'Domain', {
      identity: Identity.domain(domain),
      dkimIdentity: DkimIdentity.easyDkim(EasyDkimSigningKeyLength.RSA_2048_BIT),
      mailFromDomain: `mail.${domain}`,
      mailFromBehaviorOnMxFailure: MailFromBehaviorOnMxFailure.USE_DEFAULT_VALUE
    });
    Tags.of(this.identity).add(APP_TAG.key, APP_TAG.value);

    // Emailed to the owner (the subscription is made by hand: it names the
    // owner's address and needs a click to confirm).
    this.alerts = new Topic(this, 'Alerts', { topicName: 'glazecalc-alerts' });
    Tags.of(this.alerts).add(APP_TAG.key, APP_TAG.value);
    Validations.of(this.alerts).acknowledge(
      {
        id: 'AwsSolutions-SNS2',
        reason:
          'Encrypting with the AWS-managed SNS key would stop CloudWatch and SES from publishing (its key policy cannot let them); a key of its own costs more than the topic carries: alarm states and bounce notices, which are emailed to the owner anyway.'
      },
      {
        id: 'AwsSolutions-SNS3',
        reason:
          "The topic keeps SNS's default access policy, which is what lets this account's alarms and SES identity publish; a TLS-only policy of our own would replace it, and that path can only be tested live."
      }
    );

    // AWS reviews an account at a 5% bounce rate and a 0.1% complaint rate;
    // these warn first, at 4% and 0.08%. No data (no mail sent) is fine.
    const reputation = (id: string, alarmName: string, metricName: string, threshold: number) => {
      const alarm = new Alarm(this, id, {
        alarmName,
        metric: new Metric({ namespace: 'AWS/SES', metricName, statistic: 'Maximum', period: Duration.minutes(15) }),
        evaluationPeriods: 1,
        threshold,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING
      });
      alarm.addAlarmAction(new SnsAction(this.alerts));
      alarm.addOkAction(new SnsAction(this.alerts));
    };
    reputation('BounceRateAlarm', props.settings.bounceAlarmName, 'Reputation.BounceRate', 0.04);
    reputation('ComplaintRateAlarm', props.settings.complaintAlarmName, 'Reputation.ComplaintRate', 0.0008);

    // The app's SMTP credentials (create-mailer.sh turns its access key into
    // the SecureString /glazecalc/smtp-url): it may send only as no-reply@.
    // Access keys are not declared: they are secrets, rotated by the script.
    this.mailer = new User(this, 'Mailer', { userName: 'glazecalc-mailer' });
    Tags.of(this.mailer).add(APP_TAG.key, APP_TAG.value);
    inlinePolicy(
      this.mailer,
      'send-as-no-reply',
      new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: 'SendOnlyAsNoReplyThroughSmtp',
            actions: ['ses:SendRawEmail'],
            resources: [`arn:aws:ses:${region}:${account}:identity/*`],
            conditions: { StringEquals: { 'ses:FromAddress': `no-reply@${domain}` } }
          })
        ]
      })
    );
    Validations.of(this.mailer).acknowledge({
      id: `AwsSolutions-IAM5[Resource::arn:aws:ses:${region}:${account}:identity/*]`,
      reason: `SES checks a send against every identity the message touches (the domain, and the recipient while in the sandbox); the condition ses:FromAddress = no-reply@${domain} is what limits it.`
    });
  }
}
