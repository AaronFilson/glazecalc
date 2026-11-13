// What holds for every stack: cdk-nag passes (and really runs), everything is
// retained, nothing the import cannot take (separate IAM policies, template
// parameters, references across stacks), no private address in a template,
// import mode, and the settings' checks.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { glazecalcApp } from '../lib/app.ts';
import { readSettings } from '../lib/settings.ts';
import { allResources, build, builtWithDefaults, CDK_JSON_CONTEXT } from './helpers.ts';

describe('the app', () => {
  it("passes cdk-nag's AWS Solutions rules, which do run on every stack", () => {
    const built = builtWithDefaults();
    const assembly = built.app.synth();
    const report = JSON.parse(readFileSync(path.join(assembly.directory, 'validation-report.json'), 'utf8'));
    assert.deepEqual(report.pluginReports, []);

    // A bucket with no acknowledgments, added to a stack, stops the synth.
    const unchecked = glazecalcApp({ context: { ...CDK_JSON_CONTEXT, '@aws-cdk/core:appMode': 'inmemory' } });
    new Bucket(unchecked.mail, 'Unchecked');
    assert.throws(() => unchecked.app.synth(), /AwsSolutions-S1[\s\S]*glazecalc-mail\/Unchecked/);
  });

  it('keeps every resource that leaves its stack or is replaced, and every stack refuses deletion', () => {
    const built = builtWithDefaults();
    for (const { stack, id, resource } of allResources(built)) {
      // Kept, except what a failed deploy has just made, which its rollback removes.
      assert.equal(resource.DeletionPolicy, 'RetainExceptOnCreate', `${stack}/${id}`);
      assert.equal(resource.UpdateReplacePolicy, 'Retain', `${stack}/${id}`);
    }
    for (const stack of [built.access, built.server, built.mail, built.inbound]) {
      assert.equal(stack.terminationProtection, true, stack.stackName);
    }
  });

  it('keeps each inline policy inside its role or user, where an import takes it along', () => {
    const types = allResources(builtWithDefaults()).map(({ resource }) => resource.Type);
    assert.ok(!types.includes('AWS::IAM::Policy'), 'AWS::IAM::Policy cannot be imported');
    assert.ok(!types.includes('AWS::IAM::RolePolicy'));
    assert.ok(!types.includes('AWS::IAM::UserPolicy'));
  });

  it('gives no resource a template parameter or another stack to refer to, which cdk import could not pass', () => {
    for (const template of Object.values(builtWithDefaults().templates)) {
      const json = template.toJSON();
      // CDK's own BootstrapVersion parameter is only read by its Rules.
      assert.deepEqual(Object.keys(json.Parameters ?? {}), ['BootstrapVersion']);
      const resources = JSON.stringify(json.Resources);
      assert.doesNotMatch(resources, /"Ref":"BootstrapVersion"/);
      assert.doesNotMatch(resources, /Fn::ImportValue/);
      assert.equal(json.Outputs, undefined);
      assert.equal(json.Conditions, undefined);
      assert.equal(json.Mappings, undefined);
    }
  });

  it("writes no address but the site's own: the owner's inbox stays in Parameter Store", () => {
    const allowed = [
      'no-reply@glazecalcapp.com',
      'forwarder@glazecalcapp.com',
      ...['privacy', 'security', 'postmaster', 'abuse', 'hello', 'contact'].map((box) => `${box}@glazecalcapp.com`)
    ];
    for (const template of Object.values(builtWithDefaults().templates)) {
      const addresses = JSON.stringify(template.toJSON()).match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
      for (const address of addresses) assert.ok(allowed.includes(address), address);
    }
  });

  it('in import mode, leaves out only what the first deploy after the import adds', () => {
    const live = build({ import: 'true' }).templates;
    const normal = builtWithDefaults().templates;
    // Every other stack is the same.
    assert.deepEqual(live.access.toJSON(), normal.access.toJSON());
    assert.deepEqual(live.mail.toJSON(), normal.mail.toJSON());

    // Server: no TLS-only policy on the backup bucket (it has none live), and
    // no termination protection on the instance.
    const server = structuredClone(normal.server.toJSON());
    delete server.Resources[normal.server.getResourceId('AWS::S3::BucketPolicy')];
    delete server.Resources[normal.server.getResourceId('AWS::EC2::Instance')].Properties.DisableApiTermination;
    assert.deepEqual(live.server.toJSON(), server);

    // Inbound: the mail bucket's policy is SES's statement alone, as it is live.
    const inbound = structuredClone(normal.inbound.toJSON());
    const policyId = normal.inbound.getResourceId('AWS::S3::BucketPolicy');
    const statements = inbound.Resources[policyId].Properties.PolicyDocument.Statement as { Effect: string }[];
    inbound.Resources[policyId].Properties.PolicyDocument.Statement = statements.filter((s) => s.Effect !== 'Deny');
    assert.deepEqual(live.inbound.toJSON(), inbound);
  });

  it('checks the settings, from cdk.json or -c', () => {
    const settings = (context: Record<string, unknown>) => readSettings(glazecalcApp({ context }).app.node);
    assert.equal(settings({}).account, '724654236968');
    assert.equal(settings({ stagingImages: 'true' }).stagingImages, true);
    assert.equal(settings({ stagingImages: false }).stagingImages, false);
    assert.equal(settings({ ownerInboxVersion: '3' }).ownerInboxVersion, 3);
    assert.deepEqual(settings({ oldServers: 'i-0123456789abcdef0' }).oldServers, ['i-0123456789abcdef0']);
    assert.throws(() => settings({ account: '72465423696' }), /account must match/);
    assert.throws(() => settings({ region: 'Oregon' }), /region must match/);
    assert.throws(() => settings({ launchTemplateVersion: '$Latest' }), /launchTemplateVersion must match/);
    assert.throws(() => settings({ stagingImages: 'yes' }), /stagingImages must be true or false/);
    assert.throws(() => settings({ ownerInboxVersion: '0' }), /ownerInboxVersion must be a whole number/);
    assert.throws(() => settings({ oldServers: 'web-1' }), /oldServers: "web-1" is not an instance id/);
  });

  it('puts every stack in the account and region of the context', () => {
    const built = build({ account: '111122223333', region: 'eu-west-1' });
    for (const stack of [built.access, built.server, built.mail, built.inbound]) {
      assert.equal(stack.account, '111122223333');
      assert.equal(stack.region, 'eu-west-1');
    }
    built.templates.inbound.hasResourceProperties('AWS::S3::Bucket', { BucketName: 'glazecalc-mail-111122223333' });
  });
});
