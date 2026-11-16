// The nameless core (docs/adr/0030-nameless-chemistry-core.md): lib/core imports only itself,
// never reads what a record is called, and writes no words. Its files are read as text here, so
// a slip fails before it reaches the library repository.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect } from 'chai';

const CORE = path.join(import.meta.dirname, '..', '..', 'lib', 'core');
const TESTS = path.join(CORE, 'test') + path.sep;
const filesIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? filesIn(full) : full.endsWith('.js') ? [full] : [];
  });
// The code, without its comments, which may say what the host does.
const code = (file: string) =>
  readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

describe('the nameless core (lib/core)', () => {
  const files = filesIn(CORE);

  it('has its files', () => {
    expect(files.length).to.be.greaterThan(5);
  });

  it('requires only its own modules', () => {
    for (const file of files) {
      for (const [, target] of code(file).matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        // The core's own tests (lib/core/test) may use Node's test runner and assert as well.
        if (file.startsWith(TESTS) && target!.startsWith('node:')) continue;
        expect(target!.startsWith('.'), `${path.relative(CORE, file)} requires ${target}`).to.equal(true);
        const resolved = path.resolve(path.dirname(file), target!);
        expect(resolved.startsWith(CORE + path.sep), `${path.relative(CORE, file)} requires ${target}`).to.equal(true);
      }
    }
  });

  // An oxide field ({ name: 'SiO2', amount }) and a cap group are called by a name; so is an error class.
  it('never reads a name: only an oxide field, a cap group or an error class is called by one', () => {
    for (const file of files) {
      const reads = [...code(file).matchAll(/([\w$\]\)]+)\.name\b/g)].map((m) => m[1]);
      expect(
        reads.filter((owner) => !['field', 'group', 'this'].includes(owner!)),
        path.relative(CORE, file)
      ).to.deep.equal([]);
    }
  });

  it('writes no words: no English templates, no locale, no display formatting', () => {
    for (const file of files) {
      const text = code(file);
      for (const banned of [/\bIntl\b/, /toLocale\w*\(/, /\benglish\(/, /\bformatFormula\b/, /\bwarnings\s*:/]) {
        expect(banned.test(text), `${path.relative(CORE, file)}: ${banned}`).to.equal(false);
      }
    }
  });
});
