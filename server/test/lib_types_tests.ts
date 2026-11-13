import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { expect } from './support/app.ts';

// lib/ is CommonJS with a hand-written .d.ts beside each module. Its type check
// (lib/tsconfig.json) holds each module's use of another to that one's .d.ts,
// but a module's own exports are compared with nothing: TypeScript reads only
// the .d.ts. So a renamed or removed export would pass the type check and fail
// when the page runs. This compares the values each .d.ts declares (functions,
// constants, classes; not types) with what its .js exports.
const LIB = path.resolve(import.meta.dirname, '..', '..', 'lib');
const require = createRequire(import.meta.url);

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

  it('has declarations that are correct TypeScript, the ones no module of lib reads included', () => {
    // lib/tsconfig.json checks only the .d.ts files its JavaScript reaches, and the server's and the
    // client's checks skip declaration files, so entry points such as recipe/index.d.ts were checked by
    // nothing. This checks every one, with the library's own settings.
    const checked = ts.createProgram(files, {
      noEmit: true,
      target: ts.ScriptTarget.ES2024,
      lib: ['lib.es2024.d.ts'],
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: ['node'],
      skipLibCheck: false
    });
    const problems = ts.getPreEmitDiagnostics(checked).map((diagnostic) => {
      const where = diagnostic.file ? path.relative(LIB, diagnostic.file.fileName) + ': ' : '';
      return where + ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    });
    expect(problems).to.eql([]);
  });

  for (const file of files) {
    const name = path
      .relative(LIB, file)
      .replace(/\\/g, '/')
      .replace(/\.d\.ts$/, '');
    it(`lib/${name}.js exports what lib/${name}.d.ts declares`, () => {
      const exported = Object.keys(require(file.replace(/\.d\.ts$/, '.js')) as object).sort();
      expect(exported).to.eql(declared(file));
    });
  }
});
