// The four stacks, as bin/glazecalc.ts runs them under the CDK CLI and the
// tests build them in memory. Each stack is its own CloudFormation stack, so
// the live resources can be imported one stack at a time (README.md).
import { App, RemovalPolicies, Validations, type AppProps } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { AccessStack } from './access-stack.ts';
import { InboundStack } from './inbound-stack.ts';
import { MailStack } from './mail-stack.ts';
import { ServerStack } from './server-stack.ts';
import { readSettings, type Settings } from './settings.ts';

export interface GlazecalcApp {
  readonly app: App;
  readonly settings: Settings;
  readonly access: AccessStack;
  readonly server: ServerStack;
  readonly mail: MailStack;
  readonly inbound: InboundStack;
}

export function glazecalcApp(props: AppProps = {}): GlazecalcApp {
  // No CDKMetadata resource: the templates hold glazecalc's resources only,
  // and nothing about the app is reported to AWS. (cdk.json's feature flags
  // reach the app from the CLI, and from test/helpers.ts in the tests.)
  const app = new App({ analyticsReporting: false, ...props });
  const settings = readSettings(app.node);
  const stackProps = {
    env: { account: settings.account, region: settings.region },
    settings,
    // cdk destroy, or a stack deleted by mistake in the console, is refused.
    terminationProtection: true
  };
  const access = new AccessStack(app, 'glazecalc-access', {
    ...stackProps,
    description: "glazecalc: GitHub's OIDC provider, the deploy roles and their SSM documents, the operator policy"
  });
  const server = new ServerStack(app, 'glazecalc-server', {
    ...stackProps,
    description: 'glazecalc: the instance, its role, network, backups, snapshots and alarms'
  });
  const mail = new MailStack(app, 'glazecalc-mail', {
    ...stackProps,
    description: "glazecalc: SES sending, the alerts topic and reputation alarms, the app's SMTP user"
  });
  const inbound = new InboundStack(app, 'glazecalc-mail-inbound', {
    ...stackProps,
    description: 'glazecalc: SES receiving for six addresses, the mail bucket and the forwarder'
  });

  // Every resource is kept if it leaves its stack, is replaced, or the stack
  // is deleted: these are live resources (the instance holds the database),
  // and import needs a DeletionPolicy on each. To delete one, remove it here,
  // deploy, then delete it by hand. RetainExceptOnCreate rather than Retain:
  // what a failed deploy has just made is removed by its rollback, so a named
  // resource (a receipt rule set, say) does not block the next try.
  RemovalPolicies.of(app).retainOnUpdateOrDelete();

  // cdk-nag's AWS Solutions rules on every template: an unacknowledged
  // finding stops the synth. Each acknowledgment sits next to its resource,
  // with its reason.
  Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));

  return { app, settings, access, server, mail, inbound };
}
