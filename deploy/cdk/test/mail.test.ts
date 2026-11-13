// Mail out (docs/adr/0006): the SES identity, the alerts topic and the
// reputation alarms on it, and the app's SMTP user (mailer-policy.json).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Match } from 'aws-cdk-lib/assertions';
import { awsDocument, build, builtWithDefaults, inlinePolicyOf, resolve, resourceNamed } from './helpers.ts';

describe('mail stack', () => {
  it('verifies the domain with 2048-bit DKIM and mail.glazecalcapp.com as MAIL FROM, and makes no DNS records', () => {
    const { mail } = builtWithDefaults().templates;
    mail.resourceCountIs('AWS::SES::EmailIdentity', 1);
    mail.hasResourceProperties('AWS::SES::EmailIdentity', {
      EmailIdentity: 'glazecalcapp.com',
      DkimSigningAttributes: { NextSigningKeyLength: 'RSA_2048_BIT' },
      MailFromAttributes: { MailFromDomain: 'mail.glazecalcapp.com', BehaviorOnMxFailure: 'USE_DEFAULT_VALUE' }
    });
    mail.resourceCountIs('AWS::Route53::RecordSet', 0);
  });

  it('alarms on the bounce rate over 4% and the complaint rate over 0.08%, to glazecalc-alerts', () => {
    const { mail } = builtWithDefaults().templates;
    mail.hasResourceProperties('AWS::SNS::Topic', { TopicName: 'glazecalc-alerts' });
    mail.resourceCountIs('AWS::SNS::Subscription', 0);
    const topic = { Ref: mail.getResourceId('AWS::SNS::Topic') };
    const expected = [
      ['glazecalc-ses-bounce-rate', 'Reputation.BounceRate', 0.04],
      ['glazecalc-ses-complaint-rate', 'Reputation.ComplaintRate', 0.0008]
    ] as const;
    for (const [name, metric, threshold] of expected) {
      const alarm = resourceNamed(mail, 'AWS::CloudWatch::Alarm', 'AlarmName', name);
      assert.deepEqual(alarm.Properties, {
        AlarmName: name,
        Namespace: 'AWS/SES',
        MetricName: metric,
        Statistic: 'Maximum',
        Period: 900,
        EvaluationPeriods: 1,
        Threshold: threshold,
        ComparisonOperator: 'GreaterThanThreshold',
        TreatMissingData: 'notBreaching',
        AlarmActions: [topic],
        OKActions: [topic]
      });
    }
  });

  it('takes the alarm names from the context, since the README gives none', () => {
    const { templates } = build({ bounceAlarmName: 'glazecalc-bounces', complaintAlarmName: 'glazecalc-complaints' });
    templates.mail.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'glazecalc-bounces' });
    templates.mail.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'glazecalc-complaints' });
    assert.throws(() => build({ bounceAlarmName: 'other-alarm' }), /bounceAlarmName must match/);
  });

  it('lets the app send only as no-reply@, as mailer-policy.json, with no access key in the stack', () => {
    const { mail } = builtWithDefaults().templates;
    const user = resourceNamed(mail, 'AWS::IAM::User', 'UserName', 'glazecalc-mailer');
    assert.deepEqual(
      (user.Properties!.Policies as { PolicyName: string }[]).map((p) => p.PolicyName),
      ['send-as-no-reply']
    );
    assert.deepEqual(resolve(inlinePolicyOf(user, 'send-as-no-reply'), mail), awsDocument('mailer-policy.json'));
    assert.equal(user.Properties!.ManagedPolicyArns, undefined);
    mail.resourceCountIs('AWS::IAM::AccessKey', 0);
    mail.resourceCountIs('AWS::IAM::Policy', 0);
    mail.hasResourceProperties('AWS::IAM::User', { Tags: Match.arrayWith([{ Key: 'app', Value: 'glazecalc' }]) });
  });
});
