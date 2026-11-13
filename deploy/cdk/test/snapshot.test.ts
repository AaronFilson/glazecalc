// Each stack's whole template, as cdk synth makes it, against its copy in
// test/snapshots/: any change to what would be deployed shows in review,
// including ones no other test looks for (a new default in aws-cdk-lib, an
// edit to cloud-init.yaml or the forwarder, whose zip is named by its hash).
// After a change that was meant, npm run test:update writes them again.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { builtWithDefaults } from './helpers.ts';
import { SNAPSHOTS, templatesByStack } from './snapshots.ts';

describe('templates', () => {
  for (const [name, template] of templatesByStack(builtWithDefaults())) {
    it(`${name} is unchanged`, () => {
      const file = new URL(`${name}.json`, SNAPSHOTS);
      assert.ok(existsSync(file), `No snapshot for ${name}: run npm run test:update and review it.`);
      assert.deepEqual(
        template,
        JSON.parse(readFileSync(file, 'utf8')),
        `${name} changed: if that was meant, run npm run test:update and commit the snapshot.`
      );
    });
  }
});
