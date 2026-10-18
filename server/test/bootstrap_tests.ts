import fs from 'node:fs';
import path from 'node:path';
import * as sass from 'sass-embedded';
import { expect } from './support/app.ts';

// The client's stylesheet has only the parts of Bootstrap it uses (client/bootstrap.scss), not the whole
// bootstrap.min.css. A template that names a Bootstrap class whose part is left out would lose its style
// without any error, so this keeps the two in step.
const ROOT = path.join(import.meta.dirname, '..', '..');

/** The classes a stylesheet defines. */
const classesIn = (css: string): Set<string> => new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]!));

/** Every class the client's templates and code name: class="...", [class.x], className = '...'. */
function classesNamed(): Map<string, string> {
  const named = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(html|ts|md)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
        const text = fs.readFileSync(file, 'utf8');
        const found = [
          ...[...text.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1]!.split(/\s+/)),
          ...[...text.matchAll(/\[class\.([\w-]+)\]/g)].map((m) => m[1]!),
          ...[...text.matchAll(/className\s*=\s*'([^']*)'/g)].flatMap((m) => m[1]!.split(/\s+/))
        ];
        for (const name of found) if (/^[a-z][\w-]*$/.test(name)) named.set(name, path.relative(ROOT, file));
      }
    }
  };
  walk(path.join(ROOT, 'client'));
  return named;
}

describe("the client's Bootstrap", function () {
  this.timeout(30000);

  it('has every Bootstrap class the client names, and is far smaller than the whole of Bootstrap', () => {
    const full = fs.readFileSync(
      path.join(ROOT, 'node_modules', 'bootstrap', 'dist', 'css', 'bootstrap.min.css'),
      'utf8'
    );
    const bootstrap = classesIn(full);
    const trimmed = sass.compile(path.join(ROOT, 'client', 'bootstrap.scss'), {
      loadPaths: [path.join(ROOT, 'node_modules')],
      silenceDeprecations: ['import'],
      quietDeps: true,
      style: 'compressed'
    }).css;
    const have = classesIn(trimmed);
    const missing = [...classesNamed()].filter(([name]) => bootstrap.has(name) && !have.has(name));
    expect(missing.map(([name, file]) => `${name} (${file})`)).to.eql([]);
    // Some of the classes in use, from each part.
    for (const name of [
      'btn-check',
      'form-select-sm',
      'input-group-text',
      'table-sm',
      'visually-hidden',
      'border',
      'w-100'
    ]) {
      expect(have.has(name), name).to.equal(true);
    }
    expect(trimmed.length).to.be.below(full.length / 2);
  });
});
