// Writes test/snapshots/ again from the stacks as they are now (npm run
// test:update), after a change to the templates that was meant. Read the diff
// before committing it: it is what the next deploy would change.
import { mkdirSync, writeFileSync } from 'node:fs';
import { builtWithDefaults } from './helpers.ts';
import { SNAPSHOTS, templatesByStack } from './snapshots.ts';

mkdirSync(SNAPSHOTS, { recursive: true });
for (const [name, template] of templatesByStack(builtWithDefaults())) {
  writeFileSync(new URL(`${name}.json`, SNAPSHOTS), JSON.stringify(template, null, 2) + '\n');
  console.log(`Wrote test/snapshots/${name}.json`);
}
