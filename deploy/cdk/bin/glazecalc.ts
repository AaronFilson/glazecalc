// glazecalc's AWS setup as CDK stacks (deploy/cdk/README.md). The CDK CLI runs
// this file through cdk.json's "app"; Node runs the TypeScript as it is, as it
// does the server's (docs/adr/0008), and the app synthesizes when it exits.
import { glazecalcApp } from '../lib/app.ts';

glazecalcApp();
