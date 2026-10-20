import { expect } from 'chai';
import recipe from '../../lib/recipe/index.js';
import type { MaterialRecord } from '../../lib/recipe/index.js';
import standardData from '../../data/index.js';

// Match with what I have on the substitutions potters ask about most, over the
// standard library (docs/adr/0012, "How near a match comes"). Each is pinned
// by how near the new recipe's unity formula comes to the old one's, oxide
// group by oxide group, as a potter compares two glazes; and where a match
// cannot be near, by the report saying so.

const LIBRARY = standardData.load('materials') as MaterialRecord[];
const find = (name: string): MaterialRecord => {
  const found = LIBRARY.find((m) => m.name === name);
  if (!found) throw new Error('Not in the library: ' + name);
  return found;
};
const recipeOf = (pairs: Array<[string, number]>) =>
  pairs.map(([name, amount]) => ({ ...find(name), amount: String(amount) }));
const shelfOf = (...names: string[]) => names.map((name) => ({ material: find(name), must: false }));
type Match = ReturnType<typeof recipe.matchFromShelf>;

/** The unity formula, with potash and soda together as potters count them. */
const unity = (lines: MaterialRecord[]): Record<string, number> => {
  const formula = recipe.unityOf(recipe.molesOf(lines));
  return { ...formula, KNaO: (formula.K2O ?? 0) + (formula.Na2O ?? 0) };
};
/** How far an oxide moved, as a share of what the old recipe had. */
const moved = (now: Record<string, number>, was: Record<string, number>, oxide: string) =>
  Math.abs((now[oxide] ?? 0) - was[oxide]) / was[oxide];
const verdicts = (match: Match) => Object.fromEntries(match.report.closeness!.oxides.map((o) => [o.oxide, o.verdict]));
const amountIn = (match: Match, name: string) => Number(match.materials.find((m) => m.name === name)?.amount ?? 0);
const checks = (match: Match) => match.cautions.map((caution) => caution.check);
/** The share of an oxide a material supplies, as the report says it. */
const supplies = (match: Match, name: string, oxide: string) =>
  match.report.uses.find((use) => use.name === name)?.supplies.find((s) => s.oxide === oxide)?.share ?? 0;

describe('Match with what I have: classic substitutions', () => {
  // A staging session (2026-10-19): an assistant asked to replace Gerstley Borate called the
  // MCP tool, read its score (a miss of 20.5) as a wide miss, and built a recipe by hand instead.
  const GERSTLEY = recipeOf([
    ['Nepheline Syenite', 40],
    ['Silica', 25],
    ['Gerstley Borate', 15],
    ['EPK Kaolin', 20]
  ]);
  const ON_HAND = ['Custer Spar', 'Silica', 'Whiting', 'EPK Kaolin', 'Ferro Frit 3134', 'Talc'];

  it('replaces nepheline syenite and Gerstley Borate near the old unity formula, the boron from the frit', () => {
    const match = recipe.matchFromShelf(GERSTLEY, shelfOf(...ON_HAND));
    const [was, now] = [unity(GERSTLEY), unity(match.materials)];
    expect(match.materials.map((m) => m.name)).to.include.members(['Custer Spar', 'Ferro Frit 3134']);
    // Silica and alumina, the glass and what stiffens it, within 3% and 5%; boron and calcium,
    // which the frit brings together, within 12%; potash and soda together within 7%.
    expect(moved(now, was, 'SiO2')).to.be.below(0.03);
    expect(moved(now, was, 'Al2O3')).to.be.below(0.05);
    expect(moved(now, was, 'B2O3')).to.be.below(0.12);
    expect(moved(now, was, 'CaO')).to.be.below(0.12);
    expect(moved(now, was, 'KNaO')).to.be.below(0.07);
    expect(now.MgO).to.be.closeTo(was.MgO, 0.01);
    // All the boron is the frit's.
    expect(supplies(match, 'Ferro Frit 3134', 'B2O3')).to.be.closeTo(1, 1e-9);
    // The report says so: fair, as Custer Spar has a third of nepheline syenite's soda.
    expect(match.report.closeness!.verdict).to.equal('fair');
    expect(verdicts(match)).to.include({ SiO2: 'close', Al2O3: 'close', MgO: 'close' });
    expect(Object.values(verdicts(match))).to.not.include('far');
    // Nearer, on every main oxide, than the recipe the assistant built by hand.
    const hand = unity(
      recipeOf([
        ['Custer Spar', 45],
        ['Silica', 17],
        ['Ferro Frit 3134', 17],
        ['EPK Kaolin', 18],
        ['Whiting', 1],
        ['Talc', 2]
      ])
    );
    for (const oxide of ['SiO2', 'Al2O3', 'B2O3', 'CaO', 'KNaO']) {
      expect(moved(now, was, oxide), oxide).to.be.below(moved(hand, was, oxide));
    }
    // Only raw clay brings the alumina back here (27% EPK): the chemistry comes first, and the
    // check says to swap part of it for calcined kaolin.
    const clay = match.cautions.find((caution) => caution.check === 'clay-high')!;
    expect(clay.sentences.map((s) => s.code)).to.include('checks.clayHighFix');
    expect(recipe.rawClayPercent(match.materials)).to.be.within(25, 28);
  });

  it('holds raw clay within 10 to 20% of the batch where calcined kaolin on hand can take up the rest', () => {
    const match = recipe.matchFromShelf(GERSTLEY, shelfOf(...ON_HAND, 'Calcined Kaolin (theoretical)'));
    expect(recipe.rawClayPercent(match.materials)).to.be.within(9.9, 20.05);
    expect(amountIn(match, 'Calcined Kaolin (theoretical)')).to.be.above(5);
    expect(checks(match)).to.not.include.members(['clay-high', 'clay-low']);
    expect(verdicts(match)).to.include({ SiO2: 'close', Al2O3: 'close' });
    // Without the hold's floor, the calcined kaolin would take the place of all the raw clay.
    expect(amountIn(match, 'EPK Kaolin')).to.be.at.least(10);
  });

  it('holds raw clay to 20% where that costs the match little, says what more would give, and allows more', () => {
    const lines = recipeOf([
      ['Nepheline Syenite', 35],
      ['Silica', 25],
      ['Whiting', 10],
      ['EPK Kaolin', 15],
      ['Gerstley Borate', 15]
    ]);
    const held = recipe.matchFromShelf(lines, shelfOf(...ON_HAND));
    expect(recipe.rawClayPercent(held.materials)).to.be.within(19.9, 20.05);
    expect(checks(held)).to.not.include('clay-high');
    const [clay] = held.report.capped;
    expect(clay).to.include({ name: 'EPK Kaolin', group: 'raw clay' });
    expect(clay.members).to.deep.equal(['EPK Kaolin']);
    expect(clay.most).to.be.closeTo(20, 0.01);
    expect(clay.wouldBe).to.be.within(21, 23);
    expect(clay.why).to.deep.equal({ code: 'pool.why.rawClay' });
    // Allow more, as the report's button does: the match the chemistry alone gives.
    const more = recipe.matchFromShelf(lines, shelfOf(...ON_HAND), { uncapped: ['EPK Kaolin'] });
    expect(recipe.rawClayPercent(more.materials)).to.be.within(21, 23);
    expect(more.report.capped).to.deep.equal([]);
    expect(more.report.miss).to.be.below(held.report.miss);
  });

  it('swaps Gerstley Borate for Frit 3134 in a cone 6 clear, every oxide close but potash for soda', () => {
    const clear = recipeOf([
      ['Gerstley Borate', 20],
      ['Custer Spar', 25],
      ['Whiting', 10],
      ['EPK Kaolin', 20],
      ['Silica', 25]
    ]);
    const shelf = shelfOf('Custer Spar', 'Ferro Frit 3134', 'Whiting', 'EPK Kaolin', 'Silica', 'Talc');
    const match = recipe.matchFromShelf(clear, shelf);
    expect(verdicts(match)).to.include({
      KNaO: 'close',
      CaO: 'close',
      MgO: 'close',
      Al2O3: 'close',
      B2O3: 'close',
      SiO2: 'close'
    });
    // The frit's soda stands in for some of the feldspar's potash.
    expect(match.report.closeness!.verdict).to.equal('fair');
    expect(supplies(match, 'Ferro Frit 3134', 'B2O3')).to.be.closeTo(1, 1e-9);
    // With calcined kaolin on hand, the raw clay stays at the recipe's 20%.
    const calcined = recipe.matchFromShelf(clear, [...shelf, ...shelfOf('Calcined Kaolin (theoretical)')]);
    expect(recipe.rawClayPercent(calcined.materials)).to.be.within(19, 20.05);
    expect(checks(calcined)).to.not.include('clay-high');
    expect(verdicts(calcined)).to.include({ KNaO: 'close', Al2O3: 'close', B2O3: 'close', SiO2: 'close' });
  });

  const GLOSSY = recipeOf([
    ['Custer Spar', 40],
    ['Whiting', 20],
    ['EPK Kaolin', 20],
    ['Silica', 20]
  ]);

  it('swaps Custer Spar for G-200 EU one for one, and for Minspar 200 with potash and soda together close', () => {
    const potash = recipe.matchFromShelf(GLOSSY, shelfOf('G-200 EU Feldspar', 'Whiting', 'EPK Kaolin', 'Silica'));
    expect(potash.report.closeness!.verdict).to.equal('close');
    expect(amountIn(potash, 'G-200 EU Feldspar')).to.be.closeTo(40, 0.5);
    // The recipe had 20% raw clay already: no news.
    expect(checks(potash)).to.not.include('clay-high');
    const soda = recipe.matchFromShelf(GLOSSY, shelfOf('Minspar 200', 'Whiting', 'EPK Kaolin', 'Silica'));
    expect(soda.report.closeness!.verdict).to.equal('fair');
    expect(verdicts(soda)).to.include({ KNaO: 'close', CaO: 'close', Al2O3: 'close', SiO2: 'close' });
    const [was, now] = [unity(GLOSSY), unity(soda.materials)];
    expect(now.Na2O).to.be.above(was.Na2O);
    expect(now.K2O).to.be.below(was.K2O);
  });

  it('makes a cone 10 celadon base without whiting, its calcium from wollastonite', () => {
    const celadon = recipeOf([
      ['Custer Spar', 40],
      ['Silica', 30],
      ['Whiting', 20],
      ['EPK Kaolin', 10]
    ]);
    const match = recipe.matchFromShelf(
      celadon,
      shelfOf('G-200 EU Feldspar', 'Silica', 'Wollastonite (NYAD 400)', 'EPK Kaolin')
    );
    expect(match.report.closeness!.verdict).to.equal('close');
    // Wollastonite brings its own silica, so less flint.
    expect(amountIn(match, 'Wollastonite (NYAD 400)')).to.be.above(20);
    expect(amountIn(match, 'Silica')).to.be.below(30);
    expect(supplies(match, 'Wollastonite (NYAD 400)', 'CaO')).to.be.above(0.9);
  });

  it('says plainly when nothing on hand can bring an oxide back, and how far the rest comes', () => {
    // Lithia with no lithium source: the other fluxes make up its share.
    const lithium = recipeOf([
      ['Lithium Carbonate', 4],
      ['Custer Spar', 30],
      ['Whiting', 16],
      ['EPK Kaolin', 20],
      ['Silica', 30]
    ]);
    const match = recipe.matchFromShelf(lithium, shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica'));
    expect(match.report.unreachable).to.deep.equal(['Li2O']);
    expect(match.report.closeness!.verdict).to.equal('poor');
    const lithia = match.report.closeness!.oxides.find((o) => o.oxide === 'Li2O')!;
    expect(lithia).to.include({ now: 0, verdict: 'far' });
    expect(verdicts(match)).to.include({ K2O: 'close', Na2O: 'close' });
    expect(verdicts(match).SiO2).to.not.equal('far');
    // A boron glaze with no boron on hand: the rest of the formula close, the boron all missing.
    const boron = recipeOf([
      ['Ferro Frit 3134', 30],
      ['Custer Spar', 25],
      ['EPK Kaolin', 20],
      ['Silica', 25]
    ]);
    const without = recipe.matchFromShelf(boron, shelfOf('Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica', 'Talc'));
    expect(without.report.unreachable).to.deep.equal(['B2O3']);
    expect(without.report.closeness!.verdict).to.equal('poor');
    expect(verdicts(without)).to.include({ B2O3: 'far', KNaO: 'close', CaO: 'close', Al2O3: 'close', SiO2: 'close' });
  });

  it('says how near a suggestion for a discontinued material comes, too', () => {
    const lines = recipeOf([
      ['Oxford Spar', 40],
      ['Whiting', 20],
      ['EPK Kaolin', 10],
      ['Silica', 30]
    ]);
    const suggestion = recipe.suggestAmounts(lines, (name) => LIBRARY.find((m) => m.name === name), [], 'UK');
    expect(suggestion.report.closeness!.verdict).to.be.oneOf(['close', 'fair']);
    expect(suggestion.report.closeness!.oxides.map((o) => o.oxide)).to.include.members(['KNaO', 'Al2O3', 'SiO2']);
  });
});
