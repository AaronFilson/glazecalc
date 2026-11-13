// The snapshots: each stack's whole template as cdk synth makes it, one JSON
// file a stack in test/snapshots/. snapshot.test.ts compares them;
// update-snapshots.ts (npm run test:update) writes them.
import type { Built, Json } from './helpers.ts';

export const SNAPSHOTS = new URL('./snapshots/', import.meta.url);

/** Each stack's name and template. */
export function templatesByStack(built: Built): [string, Json][] {
  return [
    [built.access.stackName, built.templates.access.toJSON() as Json],
    [built.server.stackName, built.templates.server.toJSON() as Json],
    [built.mail.stackName, built.templates.mail.toJSON() as Json],
    [built.inbound.stackName, built.templates.inbound.toJSON() as Json]
  ];
}
