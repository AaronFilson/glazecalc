// Who may change what from outside the instance: GitHub Actions' OIDC
// provider, the production and staging deploy roles with the one SSM command
// document each may run (deploy/aws/README.md, section 5; docs/adr/0002), and
// the operator's policy for the CLI user (section 0).
import { Stack, Tags, Validations, type StackProps } from 'aws-cdk-lib';
import {
  ManagedPolicy,
  OidcProviderNative,
  PolicyDocument,
  PolicyStatement,
  Role,
  WebIdentityPrincipal
} from 'aws-cdk-lib/aws-iam';
import { CfnDocument } from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import { APP_TAG, type Settings } from './settings.ts';

export interface AccessStackProps extends StackProps {
  readonly settings: Settings;
}

/** One GitHub environment's role and the command document it may run. */
interface DeployTarget {
  /** Construct ids: they become CloudFormation logical ids, so they never change after the import. */
  readonly id: string;
  readonly roleName: string;
  /** The GitHub environment whose workflow runs may assume the role. */
  readonly environment: string;
  readonly policyName: string;
  readonly documentName: string;
  readonly documentSid: string;
  readonly script: string;
  readonly stepName: string;
  readonly description: string;
  readonly tagDescription: string;
  readonly tagPattern: string;
}

const TARGETS: DeployTarget[] = [
  {
    id: 'Deploy',
    roleName: 'glazecalc-github-deploy',
    environment: 'production',
    policyName: 'ssm-deploy',
    documentName: 'glazecalc-deploy',
    documentSid: 'OnlyTheDeployDocument',
    script: 'deploy.sh',
    stepName: 'deploy',
    description:
      'Deploys a glazecalc image tag on this instance with /opt/glazecalc/deploy.sh. The only command the GitHub deploy role may run.',
    tagDescription: 'latest, or sha-<full commit SHA>',
    tagPattern: '^(latest|sha-[0-9a-f]{40})$'
  },
  {
    id: 'Staging',
    roleName: 'glazecalc-github-staging',
    environment: 'staging',
    policyName: 'ssm-staging-deploy',
    documentName: 'glazecalc-staging-deploy',
    documentSid: 'OnlyTheStagingDocument',
    script: 'staging.sh',
    stepName: 'stage',
    description:
      'Deploys a glazecalc staging image on this instance with /opt/glazecalc/staging.sh. The only command the GitHub staging role may run.',
    tagDescription: 'staging-<full commit SHA>, or sha-<full commit SHA> (a master build)',
    tagPattern: '^(staging|sha)-[0-9a-f]{40}$'
  }
];

/** GitHub's OIDC issuer, and the audience configure-aws-credentials asks for. */
const GITHUB_ISSUER = 'token.actions.githubusercontent.com';
const STS_AUDIENCE = 'sts.amazonaws.com';

export class AccessStack extends Stack {
  readonly github: OidcProviderNative;
  readonly roles: Record<string, Role> = {};
  readonly documents: Record<string, CfnDocument> = {};
  readonly operatorPolicy: ManagedPolicy;

  constructor(scope: Construct, id: string, props: AccessStackProps) {
    super(scope, id, props);
    const { account, region, repository } = props.settings;

    // Shared by both roles. The native resource (AWS::IAM::OIDCProvider), not
    // OpenIdConnectProvider's custom resource, which could not be imported. No
    // thumbprints: AWS checks GitHub's certificate against its own trusted CAs.
    this.github = new OidcProviderNative(this, 'GitHubOidc', {
      url: `https://${GITHUB_ISSUER}`,
      clientIds: [STS_AUDIENCE]
    });

    for (const target of TARGETS) {
      // Only workflow runs in this repository's environment, which needs the
      // reviewer's approval, get the role: the sub claim names both.
      const role = new Role(this, `${target.id}Role`, {
        roleName: target.roleName,
        assumedBy: new WebIdentityPrincipal(this.github.oidcProviderArn, {
          StringEquals: {
            [`${GITHUB_ISSUER}:aud`]: STS_AUDIENCE,
            [`${GITHUB_ISSUER}:sub`]: `repo:${repository}:environment:${target.environment}`
          }
        }),
        // Inline, in the role itself (AWS::IAM::Role's Policies), under the name
        // setup-github-deploy.sh gave it: a separate AWS::IAM::Policy could not
        // be imported, and would sit beside the live one under another name.
        inlinePolicies: {
          [target.policyName]: new PolicyDocument({
            statements: [
              // SSM has no grant…() for documents: the two halves of
              // ssm:SendCommand (where, and what) are spelled out as in the JSON.
              new PolicyStatement({
                sid: 'RunOnTaggedInstanceOnly',
                actions: ['ssm:SendCommand'],
                resources: [`arn:aws:ec2:${region}:${account}:instance/*`],
                conditions: { StringEquals: { [`ssm:resourceTag/${APP_TAG.key}`]: APP_TAG.value } }
              }),
              new PolicyStatement({
                sid: target.documentSid,
                actions: ['ssm:SendCommand'],
                resources: [`arn:aws:ssm:${region}:${account}:document/${target.documentName}`]
              }),
              // These three take no resource; they only read what ran.
              new PolicyStatement({
                sid: 'ReadCommandResults',
                actions: ['ssm:ListCommands', 'ssm:ListCommandInvocations', 'ssm:GetCommandInvocation'],
                resources: ['*']
              })
            ]
          })
        }
      });
      Tags.of(role).add(APP_TAG.key, APP_TAG.value);
      Validations.of(role).acknowledge(
        {
          id: `AwsSolutions-IAM5[Resource::arn:aws:ec2:${region}:${account}:instance/*]`,
          reason:
            'The instance is chosen by its tag, not its id: the condition ssm:resourceTag/app = glazecalc limits it to glazecalc instances (docs/adr/0002).'
        },
        {
          id: 'AwsSolutions-IAM5[Resource::*]',
          reason:
            'ssm:ListCommands, ssm:ListCommandInvocations and ssm:GetCommandInvocation accept no resource; they only read the output of the command the role ran.'
        }
      );
      this.roles[target.id] = role;

      // The command each role may run: its script and nothing else, with a tag
      // AWS checks against the pattern. A changed document becomes a new
      // version and the default one (NewVersion; Replace would need a new name).
      this.documents[target.id] = new CfnDocument(this, `${target.id}Document`, {
        name: target.documentName,
        documentType: 'Command',
        documentFormat: 'JSON',
        updateMethod: 'NewVersion',
        content: {
          schemaVersion: '2.2',
          description: target.description,
          parameters: {
            tag: { type: 'String', description: target.tagDescription, allowedPattern: target.tagPattern }
          },
          mainSteps: [
            {
              action: 'aws:runShellScript',
              name: target.stepName,
              inputs: { timeoutSeconds: '900', runCommand: [`/opt/glazecalc/${target.script} '{{ tag }}'`] }
            }
          ]
        },
        tags: [{ key: APP_TAG.key, value: APP_TAG.value }]
      });
    }

    this.operatorPolicy = new ManagedPolicy(this, 'OperatorPolicy', {
      managedPolicyName: 'glazecalc-operator',
      document: operatorPolicyDocument(props.settings)
    });
    for (const finding of operatorWildcards(props.settings)) {
      Validations.of(this.operatorPolicy).acknowledge({
        id: `AwsSolutions-IAM5[${finding}]`,
        reason:
          'The operator policy for the CLI user (deploy/aws/README.md, step 0), as written in deploy/aws/operator-policy.json: reads take wildcards, and what it may create or change is limited by the app=glazecalc tag, the instance types, the instance role, the dlm role and the domain.'
      });
    }
  }
}

/**
 * deploy/aws/operator-policy.json: what the CLI user (copper-bell) may do. It
 * creates only resources tagged app=glazecalc, launches only t4g.micro or
 * t4g.small, changes DNS only for the domain, and reads the rest. Close to
 * IAM's 6,144-character limit for a managed policy.
 */
function operatorPolicyDocument({ account, region, domain, oldServers }: Settings): PolicyDocument {
  const ec2 = `arn:aws:ec2:${region}:${account}`;
  const snapshots = `arn:aws:ec2:${region}::snapshot/*`;
  const backups = `arn:aws:s3:::glazecalc-backups-${account}`;
  return new PolicyDocument({
    statements: [
      new PolicyStatement({
        sid: 'Read',
        actions: [
          'ec2:Describe*',
          'ec2:GetEbsEncryptionByDefault',
          'ec2:GetInstanceMetadataDefaults',
          'ssm:DescribeInstanceInformation',
          'ssm:DescribeParameters',
          'ssm:DescribeSessions',
          'ssm:ListCommand*',
          'ssm:GetCommandInvocation',
          'cloudwatch:DescribeAlarms',
          'dlm:GetLifecyclePolicies',
          'ce:GetCostAndUsage',
          'route53:Get*',
          'route53:List*'
        ],
        resources: ['*']
      }),
      new PolicyStatement({
        sid: 'AccountDefaults',
        actions: ['ec2:EnableEbsEncryptionByDefault', 'ec2:ModifyInstanceMetadataDefaults'],
        resources: ['*']
      }),
      new PolicyStatement({
        sid: 'AppParams',
        actions: ['ssm:PutParameter', 'ssm:GetParameter*', 'ssm:DeleteParameter'],
        resources: [
          `arn:aws:ssm:${region}:${account}:parameter/glazecalc`,
          `arn:aws:ssm:${region}:${account}:parameter/glazecalc/*`
        ]
      }),
      new PolicyStatement({
        sid: 'AmiParams',
        actions: ['ssm:GetParameter*'],
        resources: [`arn:aws:ssm:${region}::parameter/aws/service/*`]
      }),
      new PolicyStatement({
        sid: 'Bucket',
        actions: [
          's3:CreateBucket',
          's3:ListBucket',
          's3:GetBucketLocation',
          's3:*BucketPublicAccessBlock',
          's3:*LifecycleConfiguration'
        ],
        resources: [backups]
      }),
      new PolicyStatement({ sid: 'Dumps', actions: ['s3:GetObject', 's3:PutObject'], resources: [`${backups}/*`] }),
      new PolicyStatement({
        sid: 'CreateTagged',
        actions: ['ec2:CreateSecurityGroup', 'ec2:CreateLaunchTemplate', 'ec2:AllocateAddress'],
        resources: [`${ec2}:security-group/*`, `${ec2}:launch-template/*`, `${ec2}:elastic-ip/*`],
        conditions: { StringEquals: { [`aws:RequestTag/${APP_TAG.key}`]: APP_TAG.value } }
      }),
      new PolicyStatement({ sid: 'SgVpc', actions: ['ec2:CreateSecurityGroup'], resources: [`${ec2}:vpc/*`] }),
      new PolicyStatement({
        sid: 'TagOnCreate',
        actions: ['ec2:CreateTags'],
        resources: [`${ec2}:*/*`, snapshots],
        conditions: {
          StringEquals: {
            'ec2:CreateAction': [
              'RunInstances',
              'CreateSecurityGroup',
              'CreateLaunchTemplate',
              'AllocateAddress',
              'CreateSnapshot'
            ]
          }
        }
      }),
      new PolicyStatement({
        sid: 'LaunchT4g',
        actions: ['ec2:RunInstances'],
        resources: [`${ec2}:instance/*`],
        conditions: { StringEquals: { 'ec2:InstanceType': ['t4g.micro', 't4g.small'] } }
      }),
      new PolicyStatement({
        sid: 'LaunchParts',
        actions: ['ec2:RunInstances'],
        resources: [
          `arn:aws:ec2:${region}::image/*`,
          `${ec2}:volume/*`,
          `${ec2}:network-interface/*`,
          `${ec2}:subnet/*`,
          `${ec2}:security-group/*`,
          `${ec2}:launch-template/*`
        ]
      }),
      new PolicyStatement({
        sid: 'PassInstanceRole',
        actions: ['iam:PassRole'],
        resources: [`arn:aws:iam::${account}:role/glazecalc-instance`],
        conditions: { StringEquals: { 'iam:PassedToService': 'ec2.amazonaws.com' } }
      }),
      new PolicyStatement({
        sid: 'ManageTagged',
        actions: [
          'ec2:StartInstances',
          'ec2:StopInstances',
          'ec2:RebootInstances',
          'ec2:TerminateInstances',
          'ec2:ModifyInstanceAttribute',
          'ec2:GetConsoleOutput',
          'ec2:AuthorizeSecurityGroupIngress',
          'ec2:RevokeSecurityGroupIngress',
          'ec2:DeleteSecurityGroup',
          'ec2:CreateLaunchTemplateVersion',
          'ec2:ModifyLaunchTemplate',
          'ec2:DeleteLaunchTemplate',
          'ec2:DisassociateAddress',
          'ec2:ReleaseAddress',
          'ec2:DeleteSnapshot',
          'ec2:CreateTags'
        ],
        resources: [`${ec2}:*/*`, snapshots],
        conditions: { StringEquals: { [`aws:ResourceTag/${APP_TAG.key}`]: APP_TAG.value } }
      }),
      new PolicyStatement({ sid: 'AttachIp', actions: ['ec2:AssociateAddress'], resources: [`${ec2}:*/*`] }),
      // The servers from before this setup, to stop or retire; none once they are gone.
      ...(oldServers.length === 0
        ? []
        : [
            new PolicyStatement({
              sid: 'OldServers',
              actions: ['ec2:StopInstances', 'ec2:StartInstances', 'ec2:TerminateInstances', 'ec2:GetConsoleOutput'],
              resources: oldServers.map((id) => `${ec2}:instance/${id}`)
            })
          ]),
      new PolicyStatement({
        sid: 'Snapshots',
        actions: ['ec2:CreateSnapshot'],
        resources: [`${ec2}:volume/*`, snapshots]
      }),
      new PolicyStatement({
        sid: 'SsmOnApp',
        actions: ['ssm:SendCommand', 'ssm:StartSession'],
        resources: [`${ec2}:instance/*`],
        conditions: { StringEquals: { [`ssm:resourceTag/${APP_TAG.key}`]: APP_TAG.value } }
      }),
      new PolicyStatement({
        sid: 'SsmDocs',
        actions: ['ssm:SendCommand', 'ssm:StartSession'],
        resources: [
          `arn:aws:ssm:${region}::document/AWS-RunShellScript`,
          `arn:aws:ssm:${region}:${account}:document/SSM-SessionManagerRunShell`
        ]
      }),
      // ${aws:username} is IAM's policy variable, not a template string.
      new PolicyStatement({
        sid: 'OwnSessions',
        actions: ['ssm:ResumeSession', 'ssm:TerminateSession'],
        resources: [`arn:aws:ssm:${region}:${account}:session/` + '${aws:username}-*']
      }),
      new PolicyStatement({
        sid: 'Alarms',
        actions: ['cloudwatch:PutMetricAlarm', 'cloudwatch:DeleteAlarms', 'cloudwatch:DescribeAlarmHistory'],
        resources: [`arn:aws:cloudwatch:${region}:${account}:alarm:glazecalc-*`]
      }),
      new PolicyStatement({
        sid: 'AlarmEc2Actions',
        actions: ['iam:CreateServiceLinkedRole'],
        resources: [
          `arn:aws:iam::${account}:role/aws-service-role/events.amazonaws.com/AWSServiceRoleForCloudWatchEvents*`
        ],
        conditions: { StringEquals: { 'iam:AWSServiceName': 'events.amazonaws.com' } }
      }),
      new PolicyStatement({
        sid: 'Dlm',
        actions: [
          'dlm:CreateLifecyclePolicy',
          'dlm:UpdateLifecyclePolicy',
          'dlm:DeleteLifecyclePolicy',
          'dlm:GetLifecyclePolicy'
        ],
        resources: [`arn:aws:dlm:${region}:${account}:policy/*`]
      }),
      new PolicyStatement({
        sid: 'PassDlmRole',
        actions: ['iam:PassRole'],
        resources: [`arn:aws:iam::${account}:role/AWSDataLifecycleManagerDefaultRole`],
        conditions: { StringEquals: { 'iam:PassedToService': 'dlm.amazonaws.com' } }
      }),
      new PolicyStatement({
        sid: 'ReadRoles',
        actions: ['iam:GetRole*', 'iam:List*RolePolicies', 'iam:GetInstanceProfile'],
        resources: [`arn:aws:iam::${account}:role/glazecalc-*`, `arn:aws:iam::${account}:instance-profile/glazecalc-*`]
      }),
      new PolicyStatement({
        sid: 'Budget',
        actions: ['budgets:ViewBudget', 'budgets:ModifyBudget'],
        resources: [`arn:aws:budgets::${account}:budget/*`]
      }),
      new PolicyStatement({
        sid: 'Dns',
        actions: ['route53:ChangeResourceRecordSets'],
        resources: ['arn:aws:route53:::hostedzone/*'],
        conditions: {
          'ForAllValues:StringLike': {
            'route53:ChangeResourceRecordSetsNormalizedRecordNames': [domain, `*.${domain}`]
          }
        }
      })
    ]
  });
}

/**
 * Every wildcard cdk-nag finds in the operator policy (AwsSolutions-IAM5), each
 * acknowledged on its own: a new wildcard in the policy fails the synth until
 * someone looks at it.
 */
function operatorWildcards({ account, region }: Settings): string[] {
  const ec2 = `arn:aws:ec2:${region}:${account}`;
  return [
    'Action::ec2:Describe*',
    'Action::ssm:ListCommand*',
    'Action::route53:Get*',
    'Action::route53:List*',
    'Resource::*',
    'Action::ssm:GetParameter*',
    `Resource::arn:aws:ssm:${region}:${account}:parameter/glazecalc/*`,
    `Resource::arn:aws:ssm:${region}::parameter/aws/service/*`,
    'Action::s3:*BucketPublicAccessBlock',
    'Action::s3:*LifecycleConfiguration',
    `Resource::arn:aws:s3:::glazecalc-backups-${account}/*`,
    `Resource::${ec2}:security-group/*`,
    `Resource::${ec2}:launch-template/*`,
    `Resource::${ec2}:elastic-ip/*`,
    `Resource::${ec2}:vpc/*`,
    `Resource::${ec2}:*/*`,
    `Resource::arn:aws:ec2:${region}::snapshot/*`,
    `Resource::${ec2}:instance/*`,
    `Resource::arn:aws:ec2:${region}::image/*`,
    `Resource::${ec2}:volume/*`,
    `Resource::${ec2}:network-interface/*`,
    `Resource::${ec2}:subnet/*`,
    // cdk-nag writes the policy variable ${aws:username} as <aws:username>.
    `Resource::arn:aws:ssm:${region}:${account}:session/<aws:username>-*`,
    `Resource::arn:aws:cloudwatch:${region}:${account}:alarm:glazecalc-*`,
    `Resource::arn:aws:iam::${account}:role/aws-service-role/events.amazonaws.com/AWSServiceRoleForCloudWatchEvents*`,
    `Resource::arn:aws:dlm:${region}:${account}:policy/*`,
    'Action::iam:GetRole*',
    'Action::iam:List*RolePolicies',
    `Resource::arn:aws:iam::${account}:role/glazecalc-*`,
    `Resource::arn:aws:iam::${account}:instance-profile/glazecalc-*`,
    `Resource::arn:aws:budgets::${account}:budget/*`,
    'Resource::arn:aws:route53:::hostedzone/*'
  ];
}
