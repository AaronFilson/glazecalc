// The instance and what keeps it (docs/adr/0001): its role and profile, the
// security group, launch template and Elastic IP, the backup bucket, the
// snapshot policy and the status-check alarms, against deploy/aws/README.md
// and the JSON documents there.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Match } from 'aws-cdk-lib/assertions';
import { awsDocument, build, builtWithDefaults, inlinePolicyOf, resolve, resourceNamed } from './helpers.ts';

describe('server stack', () => {
  it("gives the instance role instance-policy.json and SSM's managed policy, trusted by EC2 only", () => {
    const { server } = builtWithDefaults().templates;
    const role = resourceNamed(server, 'AWS::IAM::Role', 'RoleName', 'glazecalc-instance');
    assert.deepEqual(resolve(role.Properties!.AssumeRolePolicyDocument, server), awsDocument('instance-trust.json'));
    assert.deepEqual(resolve(role.Properties!.ManagedPolicyArns, server), [
      'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
    ]);
    assert.deepEqual(
      (role.Properties!.Policies as { PolicyName: string }[]).map((p) => p.PolicyName),
      ['glazecalc-app']
    );
    assert.deepEqual(resolve(inlinePolicyOf(role, 'glazecalc-app'), server), awsDocument('instance-policy.json'));
  });

  it('adds staging-images-policy.json and its 7-day rule only with stagingImages', () => {
    const { templates } = build({ stagingImages: 'true' });
    const role = resourceNamed(templates.server, 'AWS::IAM::Role', 'RoleName', 'glazecalc-instance');
    assert.deepEqual(
      resolve(inlinePolicyOf(role, 'glazecalc-staging-images'), templates.server),
      awsDocument('staging-images-policy.json')
    );
    templates.server.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: [
          Match.objectLike({ Id: 'expire-dumps', Prefix: 'mongodump/', ExpirationInDays: 30 }),
          Match.objectLike({ Id: 'expire-staging-images', Prefix: 'staging-images/', ExpirationInDays: 7 })
        ]
      }
    });
  });

  it('puts the role in the instance profile the launch template names', () => {
    const { server } = builtWithDefaults().templates;
    const profile = resourceNamed(server, 'AWS::IAM::InstanceProfile', 'InstanceProfileName', 'glazecalc-instance');
    assert.deepEqual(profile.Properties!.Roles, [{ Ref: server.getResourceId('AWS::IAM::Role') }]);
  });

  it('keeps the dumps in a private, encrypted bucket for 30 days, over TLS only', () => {
    const { server } = builtWithDefaults().templates;
    const bucket = resourceNamed(server, 'AWS::S3::Bucket', 'BucketName', 'glazecalc-backups-724654236968');
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
      Rules: [{ Id: 'expire-dumps', Prefix: 'mongodump/', ExpirationInDays: 30, Status: 'Enabled' }]
    });
    const [policy] = Object.values(server.findResources('AWS::S3::BucketPolicy'));
    assert.deepEqual(resolve(policy.Properties.PolicyDocument, server), {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: { AWS: '*' },
          Action: 's3:*',
          Resource: ['arn:aws:s3:::glazecalc-backups-724654236968', 'arn:aws:s3:::glazecalc-backups-724654236968/*'],
          Condition: { Bool: { 'aws:SecureTransport': 'false' } }
        }
      ]
    });
  });

  it("names the bucket in /glazecalc/backup-bucket for the instance's scripts", () => {
    const { server } = builtWithDefaults().templates;
    const parameter = resourceNamed(server, 'AWS::SSM::Parameter', 'Name', '/glazecalc/backup-bucket');
    assert.equal(parameter.Properties!.Type, 'String');
    assert.equal(resolve(parameter.Properties!.Value, server), 'glazecalc-backups-724654236968');
  });

  it('lets in ports 80 and 443 only, from everywhere, in the default VPC', () => {
    const { server } = builtWithDefaults().templates;
    const group = resourceNamed(server, 'AWS::EC2::SecurityGroup', 'GroupName', 'glazecalc-web');
    assert.equal(group.Properties!.VpcId, undefined);
    assert.equal(group.Properties!.SecurityGroupEgress, undefined);
    assert.deepEqual(group.Properties!.SecurityGroupIngress, [
      { IpProtocol: 'tcp', FromPort: 80, ToPort: 80, CidrIp: '0.0.0.0/0' },
      { IpProtocol: 'tcp', FromPort: 80, ToPort: 80, CidrIpv6: '::/0' },
      { IpProtocol: 'tcp', FromPort: 443, ToPort: 443, CidrIp: '0.0.0.0/0' },
      { IpProtocol: 'tcp', FromPort: 443, ToPort: 443, CidrIpv6: '::/0' }
    ]);
  });

  it("describes the launch template of the README's step 8", () => {
    const { server } = builtWithDefaults().templates;
    const template = resourceNamed(server, 'AWS::EC2::LaunchTemplate', 'LaunchTemplateName', 'glazecalc');
    const data = template.Properties!.LaunchTemplateData as Record<string, unknown>;
    const userData = Buffer.from(String(data.UserData), 'base64').toString('utf8');
    assert.equal(userData, readFileSync(new URL('../../cloud-init.yaml', import.meta.url), 'utf8'));
    assert.deepEqual(
      { ...data, UserData: 'cloud-init.yaml', IamInstanceProfile: '-', SecurityGroupIds: '-' },
      {
        ImageId: 'resolve:ssm:/aws/service/debian/release/13/latest/arm64',
        InstanceType: 't4g.micro',
        CreditSpecification: { CpuCredits: 'standard' },
        IamInstanceProfile: '-',
        SecurityGroupIds: '-',
        MetadataOptions: { HttpTokens: 'required', HttpPutResponseHopLimit: 1, HttpEndpoint: 'enabled' },
        BlockDeviceMappings: [{ DeviceName: '/dev/xvda', Ebs: { VolumeSize: 20, VolumeType: 'gp3', Encrypted: true } }],
        UserData: 'cloud-init.yaml',
        TagSpecifications: [
          {
            ResourceType: 'instance',
            Tags: [
              { Key: 'Name', Value: 'glazecalc' },
              { Key: 'app', Value: 'glazecalc' }
            ]
          },
          {
            ResourceType: 'volume',
            Tags: [
              { Key: 'Name', Value: 'glazecalc' },
              { Key: 'app', Value: 'glazecalc' }
            ]
          }
        ]
      }
    );
    assert.deepEqual(data.IamInstanceProfile, { Name: { Ref: server.getResourceId('AWS::IAM::InstanceProfile') } });
    assert.deepEqual(data.SecurityGroupIds, [
      { 'Fn::GetAtt': [server.getResourceId('AWS::EC2::SecurityGroup'), 'GroupId'] }
    ]);
  });

  it('launches the instance from a pinned template version, tagged app=glazecalc, protected from termination', () => {
    const { server } = builtWithDefaults().templates;
    server.resourceCountIs('AWS::EC2::Instance', 1);
    server.hasResourceProperties('AWS::EC2::Instance', {
      LaunchTemplate: { LaunchTemplateId: { Ref: server.getResourceId('AWS::EC2::LaunchTemplate') }, Version: '1' },
      Tags: Match.arrayWith([{ Key: 'app', Value: 'glazecalc' }]),
      DisableApiTermination: true
    });
    // Nothing that would make CloudFormation build the instance from parts.
    const [instance] = Object.values(server.findResources('AWS::EC2::Instance'));
    assert.deepEqual(Object.keys(instance.Properties).sort(), ['DisableApiTermination', 'LaunchTemplate', 'Tags']);
  });

  it('gives the instance its Elastic IP', () => {
    const { server } = builtWithDefaults().templates;
    server.resourceCountIs('AWS::EC2::EIP', 1);
    server.hasResourceProperties('AWS::EC2::EIP', {
      Domain: 'vpc',
      InstanceId: { Ref: server.getResourceId('AWS::EC2::Instance') }
    });
  });

  it('snapshots the instance daily as dlm-policy.json, with the default DLM role', () => {
    const { server } = builtWithDefaults().templates;
    server.resourceCountIs('AWS::DLM::LifecyclePolicy', 1);
    const [policy] = Object.values(server.findResources('AWS::DLM::LifecyclePolicy'));
    assert.deepEqual(policy.Properties.PolicyDetails, awsDocument('dlm-policy.json'));
    assert.equal(policy.Properties.State, 'ENABLED');
    assert.equal(policy.Properties.Description, 'glazecalc daily snapshots');
    assert.equal(
      policy.Properties.ExecutionRoleArn,
      'arn:aws:iam::724654236968:role/AWSDataLifecycleManagerDefaultRole'
    );
  });

  it('recovers the instance after two failed system checks and reboots it after three failed instance checks', () => {
    const { server } = builtWithDefaults().templates;
    server.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    const instanceId = { Ref: server.getResourceId('AWS::EC2::Instance') };
    const expected = [
      ['glazecalc-recover', 'StatusCheckFailed_System', 2, 'recover'],
      ['glazecalc-reboot', 'StatusCheckFailed_Instance', 3, 'reboot']
    ] as const;
    for (const [name, metric, periods, action] of expected) {
      const alarm = resourceNamed(server, 'AWS::CloudWatch::Alarm', 'AlarmName', name);
      assert.deepEqual(alarm.Properties, {
        AlarmName: name,
        Namespace: 'AWS/EC2',
        MetricName: metric,
        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        Statistic: 'Maximum',
        Period: 60,
        EvaluationPeriods: periods,
        Threshold: 1,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        AlarmActions: [`arn:aws:automate:us-west-2:ec2:${action}`]
      });
    }
  });
});
