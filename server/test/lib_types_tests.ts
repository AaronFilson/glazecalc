import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { expect } from './support/app.ts';

// lib/ is CommonJS with a hand-written .d.ts beside each module, and nothing
// else compares the two: TypeScript reads only the .d.ts. So a renamed or
// removed export would pass the type check and fail when the page runs. This
// compares the values each .d.ts declares (functions, constants, classes; not
// types) with what its .js exports.
const LIB = path.resolve(import.meta.dirname, '..', '..', 'lib');
const require = createRequire(import.meta.url);

/** Exported for the other lib modules only, so not declared for the app. */
const INTERNAL: Record<string, string[]> = {
  'recipe/messages': ['say'],
  'recipe/pool': ['added', 'changed', 'removed', 'scaled']
};

const declarations = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return declarations(file);
    return entry.name.endsWith('.d.ts') ? [file] : [];
  });

describe('lib types', () => {
  const files = declarations(LIB);
  const program = ts.createProgram(files, { noEmit: true, types: [] });
  const checker = program.getTypeChecker();

  /** The values a .d.ts exports, following export * to the modules it names. */
  const declared = (file: string): string[] => {
    const module = checker.getSymbolAtLocation(program.getSourceFile(file)!);
    if (!module) return [];
    return checker
      .getExportsOfModule(module)
      .filter((symbol) => {
        const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
        return (target.flags & ts.SymbolFlags.Value) !== 0;
      })
      .map((symbol) => symbol.name)
      .sort();
  };

  it('finds the declarations', () => {
    expect(files.length).to.be.greaterThan(30);
  });

  for (const file of files) {
    const name = path
      .relative(LIB, file)
      .replace(/\\/g, '/')
      .replace(/\.d\.ts$/, '');
    it(`lib/${name}.js exports what lib/${name}.d.ts declares`, () => {
      const internal = INTERNAL[name] ?? [];
      const exported = Object.keys(require(file.replace(/\.d\.ts$/, '.js')) as object)
        .filter((key) => !internal.includes(key))
        .sort();
      expect(exported).to.eql(declared(file));
    });
  }
});
