import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import { IntlMessageFormat } from 'intl-messageformat';
import chemistry from '../../lib/chemistry/index.js';
import recipe from '../../lib/recipe/index.js';
import type { MaterialRecord, RecipeMessage } from '../../lib/recipe/index.js';
import standardData from '../../data/index.js';

// Target & Solve (lib/recipe/solve.js, docs/adr/0026): a recipe from the
// materials given whose unity formula comes as near a typed target as they
// allow, over the standard library. A known glaze's own unity formula, or its
// fired analysis, solved from its own materials comes back; a target the
// materials cannot reach says what is missing.

const LIBRARY = standardData.load('materials') as MaterialRecord[];
const find = (name: string): MaterialRecord => {
  const found = LIBRARY.find((m) => m.name === name);
  if (!found) throw new Error('Not in the library: ' + name);
  return found;
};
const recipeOf = (pairs: Array<[string, number]>) =>
  pairs.map(([name, amount]) => ({ ...find(name), amount: String(amount) }));
const shelfOf = (...names: string[]) => names.map((name) => ({ material: find(name), must: false }));
const amountIn = (solved: { materials: MaterialRecord[] }, name: string) =>
  Number(solved.materials.find((m) => m.name === name)?.amount ?? 0);
const total = (solved: { materials: MaterialRecord[] }) =>
  solved.materials.reduce((sum, m) => sum + Number(m.amount), 0);

const flatten = (messages: Record<string, unknown>, prefix = '', into: Record<string, string> = {}) => {
  for (const [key, value] of Object.entries(messages)) {
    const name = prefix ? prefix + '.' + key : key;
    if (value && typeof value === 'object') flatten(value as Record<string, unknown>, name, into);
    else into[name] = String(value);
  }
  return into;
};
const ENGLISH = flatten(JSON.parse(readFileSync('client/public/i18n/recipe/en.json', 'utf8')));
const english = (message: RecipeMessage): string =>
  String(new IntlMessageFormat(ENGLISH[message.code], 'en').format(recipe.paramsText(message)));
/** What a solve throws, as its code and English. */
const refusal = (run: () => unknown): { code: string; text: string } => {
  try {
    run();
  } catch (error) {
    expect(error).to.be.instanceOf(recipe.RecipeError);
    const message = error as RecipeMessage;
    return { code: message.code, text: english(message) };
  }
  throw new Error('It did not refuse');
};

// A cone 6 glossy base, and its unity formula and fired analysis.
const GLOSSY = recipeOf([
  ['Custer Spar', 40],
  ['Whiting', 20],
  ['EPK Kaolin', 20],
  ['Silica', 20]
]);
const GLOSSY_UNITY = recipe.unityOf(recipe.molesOf(GLOSSY));
const GLOSSY_ANALYSIS = chemistry.calculateUMF(GLOSSY.map((m) => ({ material: m, amount: m.amount }))).analysis;

describe('Target & Solve', () => {
  it('solves a glaze’s own unity formula back from its own materials, in percent', () => {
    const solved = recipe.solveTarget(
      { kind: 'unity', oxides: GLOSSY_UNITY },
      shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica')
    );
    expect(total(solved)).to.be.closeTo(100, 0.3);
    for (const [name, amount] of [
      ['Custer Spar', 40],
      ['Whiting', 20],
      ['EPK Kaolin', 20],
      ['Silica', 20]
    ] as const) {
      expect(amountIn(solved, name), name).to.be.closeTo(amount, 0.6);
    }
    expect(solved.report.closeness!.verdict).to.equal('close');
    for (const oxide of ['SiO2', 'Al2O3', 'CaO', 'K2O', 'Na2O']) {
      expect(solved.unity[oxide], oxide).to.be.closeTo(GLOSSY_UNITY[oxide]!, 0.02);
    }
    expect(solved.target.SiO2).to.be.closeTo(GLOSSY_UNITY.SiO2!, 1e-9);
    expect(solved.fluxes).to.be.closeTo(1, 1e-9);
    expect(solved.report.unreachable).to.deep.equal([]);
  });

  it('chooses the fewest that come near from a fuller shelf, and from a fired analysis as well', () => {
    const shelf = shelfOf(
      'Custer Spar',
      'Nepheline Syenite',
      'Whiting',
      'Dolomite',
      'Talc',
      'EPK Kaolin',
      'Silica',
      'Ferro Frit 3134'
    );
    for (const target of [
      { kind: 'unity' as const, oxides: GLOSSY_UNITY },
      { kind: 'analysis' as const, oxides: GLOSSY_ANALYSIS }
    ]) {
      const solved = recipe.solveTarget(target, shelf);
      expect(solved.report.closeness!.verdict, target.kind).to.equal('close');
      expect(solved.materials.length, target.kind).to.be.at.most(5);
      // No boron in the target: the boron frit is not used.
      expect(amountIn(solved, 'Ferro Frit 3134'), target.kind).to.equal(0);
      expect(solved.unity.SiO2!, target.kind).to.be.closeTo(GLOSSY_UNITY.SiO2!, 0.15);
      expect(solved.unity.Al2O3!, target.kind).to.be.closeTo(GLOSSY_UNITY.Al2O3!, 0.02);
    }
  });

  it('scales a unity formula whose fluxes do not add up to 1, and says what they came to', () => {
    const doubled = Object.fromEntries(Object.entries(GLOSSY_UNITY).map(([oxide, value]) => [oxide, 2 * value]));
    const solved = recipe.solveTarget(
      { kind: 'unity', oxides: doubled },
      shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica')
    );
    expect(solved.fluxes).to.be.closeTo(2, 1e-9);
    expect(solved.target.SiO2).to.be.closeTo(GLOSSY_UNITY.SiO2!, 1e-9);
    expect(amountIn(solved, 'Custer Spar')).to.be.closeTo(40, 0.6);
  });

  it('says what a target the materials cannot reach is missing, and that it comes out poor', () => {
    // A cone 6 boron glaze, with nothing on hand that has boron.
    const target = {
      kind: 'unity' as const,
      oxides: { K2O: 0.15, Na2O: 0.15, CaO: 0.7, B2O3: 0.4, Al2O3: 0.35, SiO2: 3 }
    };
    const solved = recipe.solveTarget(target, shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica'));
    expect(solved.report.unreachable).to.deep.equal(['B2O3']);
    expect(solved.report.closeness!.verdict).to.equal('poor');
    const boron = solved.report.closeness!.oxides.find((o) => o.oxide === 'B2O3')!;
    expect(boron).to.include({ verdict: 'far', now: 0 });
    // With a boron frit on hand, it comes near.
    const frit = recipe.solveTarget(
      target,
      shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica', 'Ferro Frit 3134')
    );
    expect(frit.report.unreachable).to.deep.equal([]);
    expect(amountIn(frit, 'Ferro Frit 3134')).to.be.above(10);
    expect(frit.unity.B2O3).to.be.closeTo(0.4, 0.05);
  });

  it('holds raw clay to 20% where calcined kaolin can take up the rest, and gives the recipe page’s cautions', () => {
    // A high-alumina matte: raw kaolin alone would be well over 20% of the batch.
    const target = { kind: 'unity' as const, oxides: { K2O: 0.25, CaO: 0.75, Al2O3: 0.6, SiO2: 2.5 } };
    const raw = recipe.solveTarget(target, shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica'));
    expect(raw.cautions.map((c) => c.check)).to.include('clay-high');
    const held = recipe.solveTarget(
      target,
      shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica', 'Calcined Kaolin (theoretical)')
    );
    expect(recipe.rawClayPercent(held.materials)).to.be.at.most(20.05);
    expect(amountIn(held, 'Calcined Kaolin (theoretical)')).to.be.above(1);
    expect(held.cautions.map((c) => c.check)).to.not.include('clay-high');
    // Cautions follow the firing: too much boron for cone 6 is said at mid fire.
    const boron = { kind: 'unity' as const, oxides: { Na2O: 0.3, CaO: 0.7, B2O3: 0.9, Al2O3: 0.3, SiO2: 2.6 } };
    const shelf = shelfOf('Ferro Frit 3134', 'Ferro Frit 3124', 'Nepheline Syenite', 'Whiting', 'EPK Kaolin', 'Silica');
    const mid = recipe.solveTarget(boron, shelf, { band: 'mid' });
    expect(mid.cautions.map((c) => c.check)).to.include('boron-high');
  });

  it('leaves out what it is told to, and keeps a must', () => {
    const shelf = shelfOf('Custer Spar', 'Nepheline Syenite', 'Whiting', 'EPK Kaolin', 'Silica');
    const without = recipe.solveTarget({ kind: 'unity', oxides: GLOSSY_UNITY }, shelf, { avoid: ['Custer Spar'] });
    expect(amountIn(without, 'Custer Spar')).to.equal(0);
    expect(amountIn(without, 'Nepheline Syenite')).to.be.above(10);
    const must = recipe.solveTarget({ kind: 'unity', oxides: GLOSSY_UNITY }, [
      ...shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica'),
      { material: find('Nepheline Syenite'), must: true }
    ]);
    expect(amountIn(must, 'Nepheline Syenite')).to.be.at.least(1);
  });

  it('refuses what it cannot solve, in codes with their English', () => {
    const shelf = shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica');
    expect(refusal(() => recipe.solveTarget({ kind: 'unity', oxides: { Xx2O: 1, SiO2: 3 } }, shelf))).to.deep.equal({
      code: 'solve.unknownOxide',
      text: 'Xx2O is not an oxide Glazecalc knows.'
    });
    expect(refusal(() => recipe.solveTarget({ kind: 'unity', oxides: { KNaO: 0.3, CaO: 0.7 } }, shelf)).code).to.equal(
      'solve.together'
    );
    expect(refusal(() => recipe.solveTarget({ kind: 'unity', oxides: { CaO: -1 } }, shelf)).text).to.equal(
      'The amount of CaO is not a number of 0 or more.'
    );
    expect(refusal(() => recipe.solveTarget({ kind: 'unity', oxides: { Al2O3: 0.3, SiO2: 3 } }, shelf)).code).to.equal(
      'solve.noFlux'
    );
    expect(refusal(() => recipe.solveTarget({ kind: 'unity', oxides: GLOSSY_UNITY }, [])).code).to.equal(
      'solve.noMaterials'
    );
    // Lithia alone, and nothing with lithium: no amount brings any of it.
    expect(refusal(() => recipe.solveTarget({ kind: 'unity', oxides: { Li2O: 1 } }, shelfOf('Silica'))).code).to.equal(
      'solve.noMatch'
    );
    // Every code has its English.
    for (const code of recipe.CODES.filter((c) => c.startsWith('solve.')))
      expect(ENGLISH[code], code).to.be.a('string');
  });

  it('reads a target pasted from another app', () => {
    expect(recipe.parseTarget('SiO2 3.20\nAl2O3: 0.35\nCaO\t0.7  K2O 0.3')).to.deep.equal({
      oxides: { SiO2: 3.2, Al2O3: 0.35, CaO: 0.7, K2O: 0.3 },
      unknown: [],
      together: false
    });
    // Subscripts, any case, a decimal comma, LOI left out, the first of two kept.
    expect(recipe.parseTarget('SiO₂ = 3,2; sio2 4; na2o .2; LOI 12; Total 100').oxides).to.deep.equal({
      SiO2: 3.2,
      Na2O: 0.2
    });
    // A row of oxides over a row of numbers.
    expect(recipe.parseTarget('K2O\tCaO\tAl2O3\tSiO2\n0.3\t0.7\t0.4\t3.1').oxides).to.deep.equal({
      K2O: 0.3,
      CaO: 0.7,
      Al2O3: 0.4,
      SiO2: 3.1
    });
    // What it does not know, and potash and soda together.
    expect(recipe.parseTarget('Xx2O 0.1 KNaO 0.3 CaO 0.7')).to.deep.equal({
      oxides: { CaO: 0.7 },
      unknown: ['Xx2O'],
      together: true
    });
    expect(recipe.parseTarget('nothing here').oxides).to.deep.equal({});
  });
});
