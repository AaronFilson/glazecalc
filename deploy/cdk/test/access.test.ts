// The deploy roles GitHub assumes (docs/adr/0002): who may assume each, the one
// thing each may do, the documents they run, and the operator's policy. Each
// is checked against the JSON document in deploy/aws/ the manual setup used.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Match } from 'aws-cdk-lib/assertions';
import { awsDocument, build, builtWithDefaults, inlinePolicyOf, resolve, resourceNamed, type Json } from './helpers.ts';

const ROLES = [
  {
    roleName: 'glazecalc-github-deploy',
    trust: 'github-oidc-trust.json',
    policyName: 'ssm-deploy',
    policy: 'deploy-policy.json',
    documentName: 'glazecalc-deploy',
    document: 'deploy-document.json'
  },
  {
    roleName: 'glazecalc-github-staging',
    trust: 'github-oidc-trust-staging.json',
    policyName: 'ssm-staging-deploy',
    policy: 'staging-deploy-policy.json',
    documentName: 'glazecalc-staging-deploy',
    document: 'staging-deploy-document.json'
  }
];

describe('access stack', () => {
  it("has GitHub's OIDC provider for STS, natively and without thumbprints", () => {
    const { access } = builtWithDefaults().templates;
    access.resourceCountIs('AWS::IAM::OIDCProvider', 1);
    access.hasResourceProperties('AWS::IAM::OIDCProvider', {
      Url: 'https://token.actions.githubusercontent.com',
      ClientIdList: ['sts.amazonaws.com'],
      ThumbprintList: Match.absent()
    });
  });

  for (const role of ROLES) {
    describe(role.roleName, () => {
      it(`is assumed only from this repository's environment, as ${role.trust}`, () => {
        const { access } = builtWithDefaults().templates;
        const resource = resourceNamed(access, 'AWS::IAM::Role', 'RoleName', role.roleName);
        assert.deepEqual(resolve(resource.Properties!.AssumeRolePolicyDocument, access), awsDocument(role.trust));
      });

      it(`may only run ${role.documentName} on glazecalc's instance, as ${role.policy}`, () => {
        const { access } = builtWithDefaults().templates;
        const resource = resourceNamed(access, 'AWS::IAM::Role', 'RoleName', role.roleName);
        // One inline policy, nothing managed, nothing attached from elsewhere.
        assert.deepEqual(
          ((resource.Properties!.Policies ?? []) as { PolicyName: string }[]).map((p) => p.PolicyName),
          [role.policyName]
        );
        assert.equal(resource.Properties!.ManagedPolicyArns, undefined);
        const policy = resolve(inlinePolicyOf(resource, role.policyName), access);
        assert.deepEqual(policy, awsDocument(role.policy));

        // And in so many words: every document it may send is this one.
        const statements = (policy as { Statement: { Action: Json; Resource: Json }[] }).Statement;
        const documents = statements
          .filter((s) => [s.Action].flat().includes('ssm:SendCommand'))
          .flatMap((s) => [s.Resource].flat() as string[])
          .filter((arn) => arn.includes(':document/'));
        assert.deepEqual(documents, [`arn:aws:ssm:us-west-2:724654236968:document/${role.documentName}`]);
      });

      it(`runs ${role.document}, whose new versions become the default`, () => {
        const { access } = builtWithDefaults().templates;
        const document = resourceNamed(access, 'AWS::SSM::Document', 'Name', role.documentName);
        assert.deepEqual(document.Properties!.Content, awsDocument(role.document));
        assert.equal(document.Properties!.DocumentType, 'Command');
        assert.equal(document.Properties!.UpdateMethod, 'NewVersion');
      });
    });
  }

  it('has the operator policy of operator-policy.json', () => {
    const { access } = builtWithDefaults().templates;
    const policy = resourceNamed(access, 'AWS::IAM::ManagedPolicy', 'ManagedPolicyName', 'glazecalc-operator');
    assert.deepEqual(resolve(policy.Properties!.PolicyDocument, access), awsDocument('operator-policy.json'));
    // Attached to the CLI user's group by hand (README.md), so not here.
    for (const attachment of ['Groups', 'Users', 'Roles']) assert.equal(policy.Properties![attachment], undefined);
  });

  it('declares no other resource', () => {
    const { access } = builtWithDefaults().templates;
    const types = Object.values(access.toJSON().Resources as Record<string, { Type: string }>).map((r) => r.Type);
    assert.deepEqual(types.sort(), [
      'AWS::IAM::ManagedPolicy',
      'AWS::IAM::OIDCProvider',
      'AWS::IAM::Role',
      'AWS::IAM::Role',
      'AWS::SSM::Document',
      'AWS::SSM::Document'
    ]);
  });

  it('takes the repository and the account from the context', () => {
    const { templates } = build({ repository: 'someone/fork', account: '111122223333', region: 'eu-west-1' });
    const role = resourceNamed(templates.access, 'AWS::IAM::Role', 'RoleName', 'glazecalc-github-deploy');
    const trust = JSON.stringify(role.Properties!.AssumeRolePolicyDocument);
    assert.match(trust, /"repo:someone\/fork:environment:production"/);
    assert.match(
      JSON.stringify(role.Properties!.Policies),
      /"arn:aws:ssm:eu-west-1:111122223333:document\/glazecalc-deploy"/
    );
    // An instance list of none drops the operator policy's OldServers statement.
    const { templates: none } = build({ oldServers: '' });
    const operator = resourceNamed(none.access, 'AWS::IAM::ManagedPolicy', 'ManagedPolicyName', 'glazecalc-operator');
    assert.doesNotMatch(JSON.stringify(operator.Properties!.PolicyDocument), /OldServers/);
  });
});
