// The catalog (lib/catalog, docs/adr/0031-functional-core.md): the data the core is given, which will be a
// library of its own as the core will. It imports only itself and the core, never the app. Its files are
// read as text here, so a slip fails before it reaches the library repository.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect } from 'chai';

const LIB = path.join(import.meta.dirname, '..', '..', 'lib');
const CATALOG = path.join(LIB, 'catalog');
const CORE = path.join(LIB, 'core');
const filesIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? filesIn(full) : /\.(ts|js)$/.test(full) ? [full] : [];
  });
const code = (file: string) =>
  readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

describe('the catalog (lib/catalog)', () => {
  const files = filesIn(CATALOG);
  const tests = path.join(CATALOG, 'test') + path.sep;

  it('has its files: its tables and its tests', () => {
    expect(files.filter((file) => !file.startsWith(tests)).length).to.be.greaterThan(0);
    expect(files.filter((file) => file.startsWith(tests)).length).to.be.greaterThan(0);
  });

  it('imports only its own modules and the core', () => {
    let read = 0;
    for (const file of files) {
      const text = code(file);
      const targets = [
        ...text.matchAll(/\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g),
        ...text.matchAll(/\bimport\s*['"]([^'"]+)['"]/g),
        ...text.matchAll(/\b(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g)
      ].map((m) => m[1]!);
      for (const target of targets) {
        read++;
        // Its own tests may use Node's test runner and assert as well.
        if (file.startsWith(tests) && target.startsWith('node:')) continue;
        const resolved = path.resolve(path.dirname(file), target);
        const inside = [CATALOG, CORE].some((dir) => resolved.startsWith(dir + path.sep));
        expect(target.startsWith('.') && inside, `${path.relative(LIB, file)} imports ${target}`).to.equal(true);
      }
    }
    expect(read).to.be.greaterThan(3);
  });

  it('is imported by no part of the core', () => {
    for (const file of filesIn(CORE)) expect(/\bcatalog\//.test(code(file)), path.relative(LIB, file)).to.equal(false);
  });
});
