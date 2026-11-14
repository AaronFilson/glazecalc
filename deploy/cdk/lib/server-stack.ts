// The server: one Graviton instance running Docker Compose and nginx
// (docs/adr/0001, 0003), with its role, security group, launch template and
// Elastic IP, and what keeps it safe: a private bucket of nightly MongoDB dumps,
// daily EBS snapshots, and the status-check alarms that recover or reboot it
// (deploy/aws/README.md, steps 2 to 4 and 6 to 10).
import { readFileSync } from 'node:fs';
import { Duration, Stack, Validations, type StackProps } from 'aws-cdk-lib';
import { Alarm, ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { Ec2Action, Ec2InstanceAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { CfnLifecyclePolicy } from 'aws-cdk-lib/aws-dlm';
import { CfnEIP, CfnInstance, CfnLaunchTemplate, CfnSecurityGroup } from 'aws-cdk-lib/aws-ec2';
import {
  InstanceProfile,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal
} from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import { bucketArnInFinding } from './nag.ts';
import { APP_TAG, type Settings } from './settings.ts';

export interface ServerStackProps extends StackProps {
  readonly settings: Settings;
}

/** The official Debian 13 arm64 image, newest build: the Debian cloud team's public parameter (step 7). */
export const DEBIAN_AMI_PARAMETER = '/aws/service/debian/release/13/latest/arm64';

export class ServerStack extends Stack {
  readonly backups: Bucket;
  readonly instanceRole: Role;
  readonly securityGroup: CfnSecurityGroup;
  readonly launchTemplate: CfnLaunchTemplate;
  readonly instance: CfnInstance;

  constructor(scope: Construct, id: string, props: ServerStackProps) {
    super(scope, id, props);
    const { settings } = props;
    const { account, region } = settings;
    const app = { key: APP_TAG.key, value: APP_TAG.value };
    const nameAndApp = [{ key: 'Name', value: 'glazecalc' }, app];

    // Step 3: nightly dumps (backup.sh), each with its deletion log, kept 30
    // days. Private and encrypted, as a new bucket is anyway, said here so
    // the template and its tests show it.
    this.backups = new Bucket(this, 'Backups', {
      bucketName: `glazecalc-backups-${account}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      // Requests without TLS are refused (the AWS CLI on the instance always uses it).
      enforceSSL: !settings.import,
      lifecycleRules: [
        { id: 'expire-dumps', prefix: 'mongodump/', expiration: Duration.days(30) },
        ...(settings.stagingImages
          ? [{ id: 'expire-staging-images', prefix: 'staging-images/', expiration: Duration.days(7) }]
          : [])
      ]
    });
    Validations.of(this.backups).acknowledge({
      id: 'AwsSolutions-S1',
      reason:
        'Only the instance role reads and writes here, a few objects a night; a second bucket for access logs would be one more to keep private and expire, for a one-instance app (docs/adr/0001).'
    });
    if (settings.import) {
      Validations.of(this.backups).acknowledge({
        id: 'AwsSolutions-S10',
        reason:
          'Import mode: the bucket as it is live, with no policy. The deploy after the import adds the TLS-only one.'
      });
    }

    // The scripts on the instance find the bucket by this parameter (backup.sh, restore.sh).
    new StringParameter(this, 'BackupBucketParameter', {
      parameterName: '/glazecalc/backup-bucket',
      stringValue: this.backups.bucketName
    });

    // Step 4: Session Manager and Run Command (the managed policy), the app's
    // settings in Parameter Store, and the dumps. Written out rather than
    // granted: StringParameter.grantRead would add ssm:GetParameters,
    // ssm:GetParameterHistory and ssm:DescribeParameters, and the bucket's
    // grantPut and grantRead would add object tagging, legal holds,
    // s3:GetBucket* and s3:List* to the two actions the scripts use. The
    // SecureStrings use the account's aws/ssm key, whose policy already lets
    // whoever may read them through SSM decrypt them: no kms statement.
    const parameters = `arn:aws:ssm:${region}:${account}:parameter/glazecalc/*`;
    this.instanceRole = new Role(this, 'InstanceRole', {
      roleName: 'glazecalc-instance',
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
      inlinePolicies: {
        'glazecalc-app': new PolicyDocument({
          statements: [
            new PolicyStatement({ sid: 'ReadAppSettings', actions: ['ssm:GetParameter'], resources: [parameters] }),
            new PolicyStatement({
              sid: 'WriteAndRestoreDatabaseDumps',
              actions: ['s3:PutObject', 's3:GetObject'],
              resources: [this.backups.arnForObjects('mongodump/*')]
            }),
            new PolicyStatement({
              sid: 'FindDumpsToRestore',
              actions: ['s3:ListBucket'],
              resources: [this.backups.bucketArn],
              conditions: { StringLike: { 's3:prefix': 'mongodump/*' } }
            })
          ]
        }),
        // deploy/README.md, Staging, step 8 (optional): staging.sh reads images uploaded by build-staging.sh.
        ...(settings.stagingImages
          ? {
              'glazecalc-staging-images': new PolicyDocument({
                statements: [
                  new PolicyStatement({
                    sid: 'ReadStagingImages',
                    actions: ['s3:GetObject'],
                    resources: [this.backups.arnForObjects('staging-images/*')]
                  })
                ]
              })
            }
          : {})
      }
    });
    Validations.of(this.instanceRole).acknowledge(
      {
        id: 'AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonSSMManagedInstanceCore]',
        reason:
          'Session Manager replaces SSH and Run Command carries the deploys (docs/adr/0002); AWS keeps this policy in step with the SSM agent.'
      },
      {
        id: `AwsSolutions-IAM5[Resource::arn:aws:ssm:${region}:${account}:parameter/glazecalc/*]`,
        reason:
          'The scripts on the instance read every /glazecalc/* setting (deploy.sh, staging.sh, backup.sh, enable-https.sh), and new ones are added without a policy change (deploy/README.md).'
      },
      {
        id: `AwsSolutions-IAM5[Resource::${bucketArnInFinding(this.backups)}/mongodump/*]`,
        reason: 'Each dump has its own key under mongodump/, named by the time it was taken.'
      },
      ...(settings.stagingImages
        ? [
            {
              id: `AwsSolutions-IAM5[Resource::${bucketArnInFinding(this.backups)}/staging-images/*]`,
              reason: 'Each staging image has its own key under staging-images/, named by its commit.'
            }
          ]
        : [])
    );

    const profile = new InstanceProfile(this, 'InstanceProfile', {
      instanceProfileName: 'glazecalc-instance',
      role: this.instanceRole
    });

    // Step 6: web traffic only, no port 22 (Session Manager instead of SSH).
    // L1: the L2 SecurityGroup needs the VPC as an object (a lookup, so
    // credentials at synth) and writes a description on each rule. With no
    // VpcId, CloudFormation uses the default VPC, as the README's commands did.
    this.securityGroup = new CfnSecurityGroup(this, 'WebSecurityGroup', {
      groupName: 'glazecalc-web',
      groupDescription: 'glazecalc: HTTP and HTTPS',
      securityGroupIngress: [80, 443].flatMap((port) => [
        { ipProtocol: 'tcp', fromPort: port, toPort: port, cidrIp: '0.0.0.0/0' },
        { ipProtocol: 'tcp', fromPort: port, toPort: port, cidrIpv6: '::/0' }
      ]),
      tags: [{ key: 'Name', value: 'glazecalc-web' }, app]
    });
    Validations.of(this.securityGroup).acknowledge({
      id: 'AwsSolutions-EC23',
      reason:
        'The public site on ports 80 and 443, open to everyone by design: one instance with nginx in front of the app and no load balancer (docs/adr/0001, 0003).'
    });

    // Step 8. L1, so the data reads like the README's JSON: the L2
    // LaunchTemplate names the profile by ARN and makes tag specifications of
    // its own. The image is resolved by EC2 at each launch, so a rebuild
    // starts from the newest Debian 13, as the README's commands did. Changes
    // here make a new version, which the running instance never sees.
    this.launchTemplate = new CfnLaunchTemplate(this, 'LaunchTemplate', {
      launchTemplateName: 'glazecalc',
      tagSpecifications: [{ resourceType: 'launch-template', tags: [app] }],
      launchTemplateData: {
        imageId: `resolve:ssm:${DEBIAN_AMI_PARAMETER}`,
        instanceType: settings.instanceType,
        // A long busy spell slows the instance down instead of adding charges.
        creditSpecification: { cpuCredits: 'standard' },
        iamInstanceProfile: { name: profile.instanceProfileName },
        securityGroupIds: [this.securityGroup.attrGroupId],
        // One hop: the instance role's credentials stay away from the containers.
        metadataOptions: { httpTokens: 'required', httpPutResponseHopLimit: 1, httpEndpoint: 'enabled' },
        blockDeviceMappings: [
          {
            deviceName: settings.rootDeviceName,
            ebs: { volumeSize: 20, volumeType: 'gp3', encrypted: true }
          }
        ],
        userData: readFileSync(new URL('../../cloud-init.yaml', import.meta.url)).toString('base64'),
        tagSpecifications: [
          { resourceType: 'instance', tags: nameAndApp },
          { resourceType: 'volume', tags: nameAndApp }
        ]
      }
    });

    // L1: the L2 Instance builds an instance from parts (image, subnet, role,
    // user data); this one is launched from the template, as run-instances
    // did. The template version is pinned (settings.ts says why). The app tag
    // is what the deploy roles may run their documents on.
    this.instance = new CfnInstance(this, 'Instance', {
      launchTemplate: { launchTemplateId: this.launchTemplate.ref, version: settings.launchTemplateVersion },
      tags: nameAndApp,
      // The one copy of the database between backups: refuse to terminate it by mistake.
      ...(settings.import ? {} : { disableApiTermination: true })
    });
    Validations.of(this.instance).acknowledge(
      {
        id: 'AwsSolutions-EC26',
        reason:
          'The root volume is encrypted: the launch template it comes from sets Encrypted on it, which cdk-nag does not follow, and the account encrypts new volumes by default (deploy/aws/README.md, step 1).'
      },
      {
        id: 'AwsSolutions-EC28',
        reason:
          "Basic monitoring's five-minute metrics are enough here, and detailed monitoring is billed; the status checks the alarms watch come every minute without it."
      }
    );
    if (settings.import) {
      Validations.of(this.instance).acknowledge({
        id: 'AwsSolutions-EC29',
        reason: 'Import mode: the instance as it is live. The deploy after the import turns termination protection on.'
      });
    }

    // Step 9: the address DNS points at.
    new CfnEIP(this, 'ElasticIp', { domain: 'vpc', instanceId: this.instance.ref, tags: nameAndApp });

    // Step 10: a snapshot of the instance's volumes every day at 10:00 UTC,
    // seven kept, made with the account's default DLM role (created by
    // `aws dlm create-default-role`, shared with any other policy).
    new CfnLifecyclePolicy(this, 'Snapshots', {
      description: 'glazecalc daily snapshots',
      state: 'ENABLED',
      executionRoleArn: `arn:aws:iam::${account}:role/AWSDataLifecycleManagerDefaultRole`,
      policyDetails: {
        policyType: 'EBS_SNAPSHOT_MANAGEMENT',
        resourceTypes: ['INSTANCE'],
        targetTags: [app],
        schedules: [
          {
            name: 'Daily keep 7',
            createRule: { interval: 24, intervalUnit: 'HOURS', times: ['10:00'] },
            retainRule: { count: 7 },
            copyTags: true,
            tagsToAdd: [{ key: 'snapshot-of', value: 'glazecalc' }]
          }
        ]
      }
    });

    // Step 10: a failed system check (the host) recovers the instance onto
    // other hardware; a failed instance check reboots it.
    const statusCheck = (metricName: string) =>
      new Metric({
        namespace: 'AWS/EC2',
        metricName,
        dimensionsMap: { InstanceId: this.instance.ref },
        statistic: 'Maximum',
        period: Duration.minutes(1)
      });
    new Alarm(this, 'RecoverAlarm', {
      alarmName: 'glazecalc-recover',
      metric: statusCheck('StatusCheckFailed_System'),
      evaluationPeriods: 2,
      threshold: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    }).addAlarmAction(new Ec2Action(Ec2InstanceAction.RECOVER));
    new Alarm(this, 'RebootAlarm', {
      alarmName: 'glazecalc-reboot',
      metric: statusCheck('StatusCheckFailed_Instance'),
      evaluationPeriods: 3,
      threshold: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    }).addAlarmAction(new Ec2Action(Ec2InstanceAction.REBOOT));
  }
}
