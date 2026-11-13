// Mail in (deploy/aws/README.md, section 15): the mail bucket and its policy,
// the forwarder's role, function and permission, the receipt rule, and the
// Gmail user, against the JSON documents create-inbound.sh used.
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { awsDocument, builtWithDefaults, inlinePolicyOf, resolve, resourceNamed, type Json } from './helpers.ts';

const BUCKET = 'glazecalc-mail-724654236968';
const RULE_ARN = 'arn:aws:ses:us-west-2:724654236968:receipt-rule-set/glazecalc-inbound:receipt-rule/forward-to-owner';

describe('inbound mail stack', () => {
  it('keeps mail in a private, encrypted bucket for 30 days', () => {
    const { inbound } = builtWithDefaults().templates;
    const bucket = resourceNamed(inbound, 'AWS::S3::Bucket', 'BucketName', BUCKET);
    assert.deepEqual(bucket.Properties!.PublicAccessBlockConfiguration, {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    });
    assert.deepEqual(bucket.Properties!.BucketEncryption, {
      ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }]
    });
    assert.deepEqual(bucket.Properties!.LifecycleConfiguration, {
      Rules: [
        {
          Id: 'expire-mail',
          Prefix: 'inbound/',
          ExpirationInDays: 30,
          AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
          Status: 'Enabled'
        }
      ]
    });
  });

  it('lets SES store mail for this rule only, as mail-bucket-policy.json, and refuses plain HTTP', () => {
    const { inbound } = builtWithDefaults().templates;
    const [policy] = Object.values(inbound.findResources('AWS::S3::BucketPolicy'));
    const statements = (resolve(policy.Properties.PolicyDocument, inbound) as { Statement: Json[] }).Statement;
    const expected = awsDocument('mail-bucket-policy.json') as { Statement: Json[] };
    assert.deepEqual(statements, [
      {
        Effect: 'Deny',
        Principal: { AWS: '*' },
        Action: 's3:*',
        Resource: [`arn:aws:s3:::${BUCKET}`, `arn:aws:s3:::${BUCKET}/*`],
        Condition: { Bool: { 'aws:SecureTransport': 'false' } }
      },
      ...expected.Statement
    ]);
  });

  it('gives the forwarder mail-forwarder-trust.json and mail-forwarder-policy.json', () => {
    const { inbound } = builtWithDefaults().templates;
    const role = resourceNamed(inbound, 'AWS::IAM::Role', 'RoleName', 'glazecalc-mail-forwarder');
    assert.deepEqual(
      resolve(role.Properties!.AssumeRolePolicyDocument, inbound),
      awsDocument('mail-forwarder-trust.json')
    );
    assert.deepEqual(
      (role.Properties!.Policies as { PolicyName: string }[]).map((p) => p.PolicyName),
      ['forward-mail']
    );
    assert.equal(role.Properties!.ManagedPolicyArns, undefined);
    assert.deepEqual(resolve(inlinePolicyOf(role, 'forward-mail'), inbound), awsDocument('mail-forwarder-policy.json'));
  });

  it('runs the forwarder on Node 24 and arm64, with the inbox read from Parameter Store at deploy', () => {
    const built = builtWithDefaults();
    const { inbound } = built.templates;
    const fn = resourceNamed(inbound, 'AWS::Lambda::Function', 'FunctionName', 'glazecalc-mail-forwarder');
    const p = fn.Properties!;
    assert.equal(p.Runtime, 'nodejs24.x');
    assert.deepEqual(p.Architectures, ['arm64']);
    assert.equal(p.Handler, 'index.handler');
    assert.equal(p.Timeout, 30);
    assert.equal(p.MemorySize, 256);
    assert.deepEqual(resolve(p.Role, inbound), 'arn:aws:iam::724654236968:role/glazecalc-mail-forwarder');
    assert.deepEqual(resolve(p.Environment, inbound), {
      Variables: {
        // A dynamic reference: the address is in neither the code nor the template.
        OWNER_INBOX: '{{resolve:ssm:/glazecalc/owner-inbox:1}}',
        BUCKET,
        OBJECT_PREFIX: 'inbound/',
        FORWARDER_ADDRESS: 'forwarder@glazecalcapp.com'
      }
    });
    // The zip holds the two modules create-inbound.sh zipped, not the tests.
    const assembly = built.app.synth();
    const asset = String((fn.Metadata as Record<string, Json>)['aws:asset:path']);
    assert.deepEqual(readdirSync(path.join(assembly.directory, asset)).sort(), ['index.mjs', 'rewrite.mjs']);
  });

  it('keeps the log group Lambda writes to, forever as now', () => {
    const { inbound } = builtWithDefaults().templates;
    const group = resourceNamed(inbound, 'AWS::Logs::LogGroup', 'LogGroupName', '/aws/lambda/glazecalc-mail-forwarder');
    assert.equal(group.Properties!.RetentionInDays, undefined);
  });

  it('lets SES invoke the forwarder for this account and rule only', () => {
    const { inbound } = builtWithDefaults().templates;
    inbound.resourceCountIs('AWS::Lambda::Permission', 1);
    const [permission] = Object.values(inbound.findResources('AWS::Lambda::Permission'));
    assert.deepEqual(resolve(permission.Properties, inbound), {
      Action: 'lambda:InvokeFunction',
      FunctionName: 'arn:aws:lambda:us-west-2:724654236968:function:glazecalc-mail-forwarder',
      Principal: 'ses.amazonaws.com',
      SourceAccount: '724654236968',
      SourceArn: RULE_ARN
    });
  });

  it('has the receipt rule of mail-receipt-rule.json, made after the policy and permission it needs', () => {
    const { inbound } = builtWithDefaults().templates;
    inbound.hasResourceProperties('AWS::SES::ReceiptRuleSet', { RuleSetName: 'glazecalc-inbound' });
    inbound.resourceCountIs('AWS::SES::ReceiptRule', 1);
    const [rule] = Object.values(inbound.findResources('AWS::SES::ReceiptRule'));
    assert.deepEqual(resolve(rule.Properties.Rule, inbound), awsDocument('mail-receipt-rule.json'));
    assert.deepEqual(rule.Properties.RuleSetName, { Ref: inbound.getResourceId('AWS::SES::ReceiptRuleSet') });
    assert.deepEqual(
      [...rule.DependsOn].sort(),
      [inbound.getResourceId('AWS::Lambda::Permission'), inbound.getResourceId('AWS::S3::BucketPolicy')].sort()
    );
  });

  it('lets the Gmail user send only as the six addresses, as mail-send-policy.json', () => {
    const { inbound } = builtWithDefaults().templates;
    const user = resourceNamed(inbound, 'AWS::IAM::User', 'UserName', 'glazecalc-mail-send');
    assert.deepEqual(
      (user.Properties!.Policies as { PolicyName: string }[]).map((p) => p.PolicyName),
      ['send-as-the-six']
    );
    assert.deepEqual(resolve(inlinePolicyOf(user, 'send-as-the-six'), inbound), awsDocument('mail-send-policy.json'));
    inbound.resourceCountIs('AWS::IAM::AccessKey', 0);
  });
});
