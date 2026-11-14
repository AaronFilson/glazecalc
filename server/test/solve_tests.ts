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

  it('gives a recipe that adds up to 100 exactly, as shown', () => {
    // Each amount rounded on its own came to 100.1 (the matte) or 99.9 (the boron glaze).
    const tenths = (solved: { materials: MaterialRecord[] }) =>
      solved.materials.reduce((sum, m) => sum + Math.round(10 * Number(m.amount)), 0);
    const four = shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica');
    for (const oxides of [
      { K2O: 0.25, CaO: 0.75, Al2O3: 0.6, SiO2: 2.6 },
      { Na2O: 0.3, CaO: 0.7, B2O3: 0.9, Al2O3: 0.3, SiO2: 2.6 },
      GLOSSY_UNITY
    ]) {
      const solved = recipe.solveTarget({ kind: 'unity', oxides }, four);
      expect(tenths(solved), JSON.stringify(solved.materials.map((m) => m.amount))).to.equal(1000);
      for (const m of solved.materials) expect(m.amount).to.match(/^\d+(\.\d)?$/);
    }
  });

  it('does not hold the raw clay down with a material that has no oxides', () => {
    // A potter's own material saved with no oxides costs the match nothing: it was made half the batch
    // (Target & Solve 25%, Match with what I have 47%) to bring the raw clay to 20% of it.
    const nothing = { name: 'My placeholder', percentmole: 'percent', loi: 0, fields: [] } as MaterialRecord;
    const target = { kind: 'unity' as const, oxides: { K2O: 0.25, CaO: 0.75, Al2O3: 0.6, SiO2: 2.6 } };
    const shelf = shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica');
    const without = recipe.solveTarget(target, shelf);
    const withIt = recipe.solveTarget(target, [...shelf, { material: nothing, must: false }]);
    expect(amountIn(withIt, 'My placeholder')).to.equal(0);
    expect(withIt.materials).to.deep.equal(without.materials);
    const old = recipeOf([
      ['Custer Spar', 30],
      ['Whiting', 20],
      ['Calcined Kaolin (theoretical)', 20],
      ['EPK Kaolin', 15],
      ['Silica', 15]
    ]);
    const match = recipe.matchFromShelf(old, [...shelf, { material: nothing, must: false }]);
    expect(amountIn(match, 'My placeholder')).to.equal(0);
    expect(match.materials).to.deep.equal(recipe.matchFromShelf(old, shelf).materials);
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
    // A flux so slight that the unity formula is past any number (the MCP's schema takes it): no flux, as
    // above, not the chemistry's "no oxides to aim for".
    expect(refusal(() => recipe.solveTarget({ kind: 'unity', oxides: { CaO: 5e-324, SiO2: 3 } }, shelf)).code).to.equal(
      'solve.noFlux'
    );
    // Match with what I have, when nothing on the shelf has any of the recipe's oxides, says what Target &
    // Solve says, in a code with its English, not the chemistry's "no materials to work out".
    expect(refusal(() => recipe.matchFromShelf(recipeOf([['Whiting', 100]]), shelfOf('Silica'))).code).to.equal(
      'solve.noMatch'
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

// A list of many materials and a target with many oxides took minutes, holding the server for everyone,
// or the page, all that time: the work one search may do is bounded now (lib/chemistry/fit.js WORK). The
// worst cases found, each with what it took before on a 2015 laptop (each about a second now). The work
// is counted, not timed, so the bound holds anywhere, and the tests hold the work: a time limit failed on
// a machine busy with other tests (5 s allowed, 5.6 to 12.6 s taken).
describe('Target & Solve, Match with what I have and Suggest amounts: the work bounded', function () {
  this.timeout(60000);
  const MANY_OXIDES = {
    K2O: 0.2,
    Na2O: 0.1,
    CaO: 0.5,
    MgO: 0.1,
    ZnO: 0.05,
    BaO: 0.05,
    Al2O3: 0.4,
    B2O3: 0.3,
    SiO2: 3.2,
    TiO2: 0.1,
    Fe2O3: 0.05,
    Li2O: 0.05,
    SrO: 0.05
  };
  // What past the bound may still be done (C on the few kept, the report): a quarter of it at most.
  const ALLOWED = 1.25 * chemistry.WORK;
  const offered = (from: number, to: number) => LIBRARY.slice(from, to).map((material) => ({ material, must: false }));

  it('solves 80 materials for a 13-oxide target within the work allowed, with the best found (93 s before)', () => {
    const meter = chemistry.newMeter();
    const solved = recipe.solveTarget({ kind: 'unity', oxides: MANY_OXIDES }, offered(0, 80), { meter });
    // The steps that refine stop at the bound; what has to be done after it is a part of it at most.
    expect(meter.used).to.be.at.most(ALLOWED);
    expect(solved.report.cutShort).to.equal(true);
    // Still a recipe: in percent, from no more materials than the target has oxides.
    expect(total(solved)).to.be.closeTo(100, 0.5);
    expect(solved.materials.length).to.be.within(1, Object.keys(MANY_OXIDES).length);
    expect(solved.report.closeness!.verdict).to.be.oneOf(['close', 'fair', 'poor']);
  });

  it('solves from a shelf at its most, 500 materials, with the work 60 take (twenty times it before)', () => {
    // The first match over every material offered was not bounded: over 364 it alone took the work
    // allowed, and the whole search up to nine times it. Now it stops with the rest.
    const shelf = [0, 1, 2]
      .flatMap((copy) => LIBRARY.map((m) => (copy ? { ...m, name: `${m.name} (${copy + 1})` } : m)))
      .slice(0, 500)
      .map((material) => ({ material, must: false }));
    expect(shelf.length).to.equal(500);
    const sixty = chemistry.newMeter();
    recipe.solveTarget({ kind: 'unity', oxides: MANY_OXIDES }, offered(0, 60), { meter: sixty });
    const meter = chemistry.newMeter();
    const solved = recipe.solveTarget({ kind: 'unity', oxides: MANY_OXIDES }, shelf, { meter });
    expect(meter.used).to.be.at.most(sixty.used + 0.25 * chemistry.WORK);
    expect(meter.used).to.be.at.most(ALLOWED);
    expect(solved.report.cutShort).to.equal(true);
    // A recipe the best found can stand by: in percent, as many materials as the target has oxides at
    // most, and no oxide far off (the first trim kept the largest amounts and lost the minor oxides').
    expect(total(solved)).to.be.closeTo(100, 1e-9);
    expect(solved.materials.length).to.be.within(1, Object.keys(MANY_OXIDES).length);
    expect(solved.report.closeness!.verdict).to.not.equal('poor');
  });

  it('matches a 13-oxide recipe from 100 materials within the work allowed (80 s before)', () => {
    const analysis = { SiO2: 55, Al2O3: 12, B2O3: 8, CaO: 6, MgO: 2, K2O: 3, Na2O: 3, ZnO: 3 };
    const line = {
      name: 'Frit-like',
      percentmole: 'percent',
      loi: 0,
      amount: '100',
      fields: Object.entries({ ...analysis, BaO: 2, SrO: 2, Li2O: 1, TiO2: 2, Fe2O3: 1 }).map(([name, amount]) => ({
        name,
        amount
      }))
    } as unknown as MaterialRecord;
    const meter = chemistry.newMeter();
    const match = recipe.matchFromShelf([line], offered(0, 100), { meter });
    expect(meter.used).to.be.at.most(ALLOWED);
    expect(match.report.cutShort).to.equal(true);
    expect(match.materials.length).to.be.within(1, 13);
  });

  it('suggests amounts for 40 lines, the plan and the suggestion on one meter (19 s before)', () => {
    const lookUp = (name: string) =>
      LIBRARY.find((m) => m.name === name || (m as { aliases?: string[] }).aliases?.includes(name));
    const lines = LIBRARY.slice(100, 140).map((m) => ({ ...m, amount: '2.5' }));
    const meter = chemistry.newMeter();
    const plan = recipe.planSuggestion(lines, lookUp, LIBRARY, '', { meter });
    expect(plan.swaps).to.not.eql([]);
    const suggestion = recipe.suggestAmounts(lines, lookUp, [], '', { meter });
    expect(meter.used).to.be.at.most(ALLOWED);
    expect(suggestion.materials.length).to.be.above(0);
  });

  it('stops ranking what could bring a short oxide back once the work is spent', () => {
    const lines = recipeOf([
      ['Lepidolite', 7.62],
      ['Ferro Frit 9146 (zircon white)', 7.85],
      ['Silica', 40],
      ['Whiting', 20]
    ]);
    const lookUp = (name: string) => LIBRARY.find((m) => m.name === name);
    const whole = chemistry.newMeter();
    const full = recipe.planSuggestion(lines, lookUp, LIBRARY, '', { meter: whole });
    expect(full.shortfalls.length).to.be.above(0);
    const meter = chemistry.newMeter(1);
    const plan = recipe.planSuggestion(lines, lookUp, LIBRARY, '', { meter });
    expect(meter.cut).to.equal(true);
    expect(meter.used).to.be.below(whole.used / 4);
    // The same oxides, with the materials that could bring them back still offered.
    expect(plan.shortfalls.map((s) => s.oxide)).to.eql(full.shortfalls.map((s) => s.oxide));
    for (const shortfall of plan.shortfalls) expect(shortfall.choices.length).to.be.above(0);
  });

  it('leaves a shelf as potters have one alone: a small part of the work, nothing cut', () => {
    const meter = chemistry.newMeter();
    const shelf = shelfOf('Custer Spar', 'Nepheline Syenite', 'Whiting', 'Dolomite', 'Talc', 'EPK Kaolin', 'Silica');
    const solved = recipe.solveTarget({ kind: 'unity', oxides: GLOSSY_UNITY }, shelf, { meter });
    expect(solved.report).to.not.have.property('cutShort');
    expect(meter.used).to.be.below(chemistry.WORK / 100);
  });

  it('says it was cut short when the work runs out holding the clay, even if the free choosing is kept', () => {
    // Raw kaolin is the only alumina here, so the free choosing (28% EPK) is kept; the work allowed is
    // what the free choosing takes and a little more, so it runs out in the held one.
    const target = { kind: 'unity' as const, oxides: { K2O: 0.25, CaO: 0.75, Al2O3: 0.6, SiO2: 2.5 } };
    const shelf = shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica');
    const { moles } = recipe.targetOf(target);
    const lines = shelf.map((tried) => ({ material: { ...tried.material, amount: '' }, start: 0, least: 1 }));
    const alone = chemistry.newMeter();
    chemistry.selectMaterials(lines, moles, { meter: alone });
    const meter = chemistry.newMeter(alone.used + 1);
    const chosen = recipe.selectHoldingClay(lines, moles, { batch: 100, meter });
    expect(meter.cut).to.equal(true);
    expect(chosen.selection.cutShort).to.equal(true);
    const solved = recipe.solveTarget(target, shelf, { meter: chemistry.newMeter(alone.used + 1) });
    expect(solved.report.cutShort).to.equal(true);
  });
});
