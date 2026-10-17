import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import { IntlMessageFormat } from 'intl-messageformat';
import chemistry from '../../lib/chemistry/index.js';
import recipe from '../../lib/recipe/index.js';
import type { Caution, LimitSet, MaterialRecord, RecipeMessage } from '../../lib/recipe/index.js';
import standardData from '../../data/index.js';

// The recipe tools the app and the server share (lib/recipe; docs/adr/0019).
// The app's own tests (client/app/pages/recipe/*.spec.ts) check them in words;
// these check that the server can load and run them, and that what they say,
// as codes, has its English in the app's messages for the server to use too.

/** The app's recipe messages in English, as flat keys: { checks: { alkali } } is 'checks.alkali'. */
function flatten(messages: Record<string, unknown>, prefix = '', into: Record<string, string> = {}) {
  for (const [key, value] of Object.entries(messages)) {
    const name = prefix ? prefix + '.' + key : key;
    if (value && typeof value === 'object') flatten(value as Record<string, unknown>, name, into);
    else into[name] = String(value);
  }
  return into;
}
const ENGLISH = flatten(JSON.parse(readFileSync('client/public/i18n/recipe/en.json', 'utf8')));

/** A message in English, as the server would show it. */
const english = (message: RecipeMessage): string =>
  String(new IntlMessageFormat(ENGLISH[message.code], 'en').format(recipe.paramsText(message)));
const words = (caution: Caution): string => caution.sentences.map(english).join(' ');

const material = (
  name: string,
  fields: Array<[string, number]>,
  loi: number,
  info: Partial<MaterialRecord> = {}
): MaterialRecord => ({
  name,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount })),
  ...info
});

const POTASH = material(
  'Potash feldspar',
  [
    ['K2O', 1],
    ['Al2O3', 1],
    ['SiO2', 6]
  ],
  0,
  { category: 'feldspar' }
);
const WHITING = material('Whiting', [['CaO', 1]], 43.97);
const SILICA = material('Silica', [['SiO2', 1]], 0, { category: 'silica' });
const KAOLIN = material(
  'Kaolin',
  [
    ['Al2O3', 1],
    ['SiO2', 2]
  ],
  13.96,
  { category: 'clay' }
);
const line = (m: MaterialRecord, amount: number) => ({ ...m, amount: String(amount) });

describe('Shared recipe tools', () => {
  it('has the English of every code it can say in the app’s recipe messages', () => {
    const missing = recipe.CODES.filter((code) => !(code in ENGLISH));
    expect(missing).to.deep.equal([]);
  });

  it('writes a message’s figures with their decimals, in the locale', () => {
    expect(recipe.figureText(recipe.figure(0.3, 2))).to.equal('0.30');
    expect(recipe.figureText(recipe.upTo(12.5, 3))).to.equal('12.5');
    expect(recipe.figureText(recipe.figure(1234.5, 1), 'de')).to.equal('1234,5');
    expect(recipe.plainFigure('12.50')).to.deep.equal({ value: 12.5, places: 2 });
    expect(recipe.plainFigure('abc')).to.equal('abc');
  });

  it('reads and scales amounts as the app does', () => {
    expect(recipe.amountOf('12.5')).to.equal(12.5);
    expect(recipe.amountOf('12,5')).to.equal(0);
    expect(recipe.isAmount('-3')).to.equal(false);
    expect(recipe.rebase(['3', '2', '5'], [{ amount: '1', unit: 'parts' }], { to: 'percent' })).to.deep.equal({
      materials: ['30', '20', '50'],
      additives: ['10']
    });
    expect(recipe.batchWeights(['60', '40'], [{ amount: '2' }], 500)).to.deep.equal({
      materials: [300, 200],
      additives: [10],
      base: 500,
      total: 510
    });
  });

  it('reads typed numbers by the decimal mark and the locale', () => {
    expect(recipe.parseNumber('1 234,5', 'either', 'fr')).to.equal(1234.5);
    expect(recipe.parseNumber('12.5', 'comma')).to.equal(null);
    expect(recipe.parseNumber('١٢٫٥')).to.equal(12.5);
    expect(recipe.toPlain('12,5', 'comma')).to.equal('12.5');
    expect(recipe.forTyping('12.5', 'either', 'de')).to.equal('12,5');
  });

  it('converts and writes temperatures in either scale', () => {
    expect(recipe.inScale(1240, 'F')).to.equal(2264);
    expect(recipe.temperatureText(1222, 'C')).to.equal('1222 °C');
    expect(recipe.celsius(recipe.fahrenheit(1000))).to.be.closeTo(1000, 1e-9);
  });

  it('warns of what is past a limit, as codes with figures, and words them from the app’s English', () => {
    const cautions = recipe.pastLimits({
      lines: [
        { material: POTASH, amount: '80' },
        { material: SILICA, amount: '20' }
      ],
      unity: { K2O: 0.6, Na2O: 0.1, CaO: 0.3, Al2O3: 0.3, SiO2: 3 },
      celsius: 1222
    });
    const alkali = cautions.find((caution) => caution.check === 'alkali');
    expect(alkali?.sentences[0]).to.deep.equal({
      code: 'checks.alkali',
      params: { alkali: { value: 0.7, places: 2 } }
    });
    expect(alkali?.sentences.map((s) => s.code)).to.deep.equal([
      'checks.alkali',
      'checks.alkaliProbably',
      'checks.alkaliFix'
    ]);
    expect(words(alkali!)).to.match(/^This has a lot of soda and potash \(0\.70\)\./);
    // No raw clay at all.
    expect(cautions.map((caution) => caution.check)).to.include('clay-low');
  });

  it('does not warn of what the old recipe already had', () => {
    const unity = { K2O: 0.6, Na2O: 0.1, CaO: 0.3, Al2O3: 0.3, SiO2: 3 };
    const lines = [{ material: KAOLIN, amount: '10' }];
    const checks = recipe.pastLimits({ lines, unity, old: unity, celsius: 1222 }).map((c) => c.check);
    expect(checks).not.to.include('alkali');
  });

  it('keeps the figures the checks warn at as data', () => {
    expect(recipe.CHECK_LIMITS.boronMidFire.caution).to.equal(0.33);
    expect(recipe.FIRING.lowFireBelow).to.equal(1150);
  });

  it('declares every code it can say, and no other, for TypeScript callers', () => {
    const declared = readFileSync('lib/recipe/messages.d.ts', 'utf8');
    const union = declared.slice(
      declared.indexOf('export type RecipeMessageCode'),
      declared.indexOf(';', declared.indexOf('export type RecipeMessageCode'))
    );
    const codes = [...union.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(codes).to.deep.equal([...recipe.CODES]);
  });

  it('gives each caution as data too: the quantity, its value, the limit, which side is past, how serious', () => {
    const lines = [
      { material: POTASH, amount: '80' },
      { material: SILICA, amount: '20' }
    ];
    const unity = { K2O: 0.6, Na2O: 0.1, CaO: 0.3, Al2O3: 0.3, SiO2: 3 };
    const alkali = recipe.pastLimits({ lines, unity, celsius: 1222 }).find((c) => c.check === 'alkali');
    expect(alkali).to.include({
      severity: 'likely',
      quantity: 'K2O+Na2O',
      limit: 0.3,
      direction: 'above'
    });
    expect(alkali?.value).to.be.closeTo(0.7, 1e-9);
    const tends = recipe.pastLimits({ lines, unity: { ...unity, K2O: 0.25 }, celsius: 1222 });
    expect(tends.find((c) => c.check === 'alkali')).to.include({ severity: 'caution', limit: 0.3 });
    const clay = recipe.pastLimits({ lines, unity, celsius: 1222 }).find((c) => c.check === 'clay-low');
    expect(clay).to.include({ quantity: 'raw-clay-percent', value: 0, limit: 5, direction: 'below' });
  });

  it('checks against a limit set, by its firing bands: the app’s own reads cone 10 as mid fire', () => {
    const own = recipe.GLAZECALC_LIMITS;
    expect(recipe.LIMIT_SETS[own.id]).to.equal(own);
    expect(own.source.title).to.be.a('string');
    expect(recipe.bandOf(own, 1060)).to.equal('low');
    expect(recipe.bandOf(own, 1222)).to.equal('mid');
    expect(recipe.bandOf(own, 1300)).to.equal('mid');
    expect(recipe.bandOf(own, undefined)).to.equal(undefined);
    expect(own.unity.mid?.['B2O3']?.max).to.equal(recipe.CHECK_LIMITS.boronMidFire.caution);
    // A set with a high band checks cone 10 by its own figures.
    const banded: LimitSet = {
      id: 'test',
      name: 'Test',
      source: { title: 'A test set' },
      bands: [{ band: 'low', belowC: 1150 }, { band: 'mid', belowC: 1250 }, { band: 'high' }],
      whenUnknown: 'mid',
      unity: { mid: { 'K2O+Na2O': { max: 0.3 } }, high: { 'K2O+Na2O': { max: 0.5 } } }
    };
    expect(recipe.bandOf(banded, 1300)).to.equal('high');
    const lines = [{ material: KAOLIN, amount: '10' }];
    const unity = { K2O: 0.4, CaO: 0.6, Al2O3: 0.4, SiO2: 4 };
    const checks = (celsius: number, limitSet?: LimitSet) =>
      recipe.pastLimits({ lines, unity, celsius, limitSet }).map((c) => c.check);
    expect(checks(1300)).to.include('alkali');
    expect(checks(1300, banded)).not.to.include('alkali');
    expect(checks(1222, banded)).to.include('alkali');
  });

  it('matches a recipe from the materials on hand, saying what changed as codes', () => {
    const lines = [line(POTASH, 40), line(WHITING, 20), line(KAOLIN, 10), line(SILICA, 30)];
    const shelf = [POTASH, WHITING, KAOLIN, SILICA].map((m) => ({ material: m, must: false }));
    const match = recipe.matchFromShelf(lines, shelf);
    expect(match.materials.map((m) => m.name)).to.have.members(['Potash feldspar', 'Whiting', 'Kaolin', 'Silica']);
    // The same materials make the same recipe: nothing to say.
    expect(match.changes).to.deep.equal([]);
    expect(match.report.miss).to.be.below(0.01);
    expect(match.report.uses[0].amount).to.have.keys('value', 'places', 'upTo');
    // Without whiting on the shelf, it goes.
    const without = recipe.matchFromShelf(lines, shelf.slice(0, 1).concat(shelf.slice(2)));
    expect(without.changes.map(english)).to.include('Whiting 20 → 0');
    // With nothing on hand it says so in a code, which has its English.
    expect(() => recipe.matchFromShelf(lines, []))
      .to.throw(recipe.RecipeError)
      .with.property('code', 'shelf.empty');
    try {
      recipe.matchFromShelf(lines, []);
    } catch (error) {
      expect(english(error as RecipeMessage)).to.equal('There are no materials on hand to match with.');
    }
  });

  it('replaces a discontinued material and suggests amounts, over the standard library', () => {
    const library = standardData.load('materials') as MaterialRecord[];
    const find = (name: string) => library.find((m) => m.name === name);
    const lines = [line(find('Oxford Spar')!, 40), line(WHITING, 20), line(KAOLIN, 10), line(SILICA, 30)];
    const plan = recipe.planSuggestion(lines, find, library, 'UK');
    expect(plan.swaps).to.have.length(1);
    expect(plan.swaps[0]).to.include({ from: 'Oxford Spar', status: 'discontinued' });
    const suggestion = recipe.suggestAmounts(lines, find, [], 'UK');
    expect(suggestion.materials.map((m) => m.name)).to.include(plan.swaps[0].to);
    for (const change of suggestion.changes) expect(english(change)).to.be.a('string').and.not.equal('');
  });

  it('rebuilds a lead glaze on a lead-free base frit from the standard library', () => {
    const library = standardData.load('materials') as MaterialRecord[];
    const find = (name: string) => library.find((m) => m.name === name);
    const lines = [line(find('Lead Bisilicate Frit (Potclays 2261)')!, 70), line(KAOLIN, 10), line(SILICA, 20)];
    expect(recipe.recipeHasLead(lines)).to.equal(true);
    expect(recipe.leadIn(lines).percent).to.be.above(40);
    const bases = recipe.leadFreeBases(lines, [], find, library, 'UK', 1060);
    expect(bases.length).to.be.within(1, 3);
    const replaced = recipe.replaceLead(lines, [], find, library, 'UK', {
      base: bases[0].name,
      celsius: 1060,
      mode: 'rebuild'
    });
    expect(recipe.recipeHasLead(replaced.materials)).to.equal(false);
    expect(replaced.report?.uses.some((use) => use.name === bases[0].name)).to.equal(true);
    for (const caution of replaced.cautions) expect(words(caution)).to.not.match(/\{|undefined/);
  });
});

describe('the unity formula worked step by step (workedCalculation)', () => {
  const library = standardData.load('materials') as MaterialRecord[];
  const named = (name: string) => {
    const found = library.find((m) => m.name === name);
    if (!found) throw new Error('No ' + name + ' in the library');
    return found;
  };
  // Leach's 4321 and a cone 6 clear, from the library's own records.
  const recipes = [
    [
      ['Custer Spar', 40],
      ['Silica', 30],
      ['Whiting', 20],
      ['EPK Kaolin', 10]
    ],
    [
      ['Ferro Frit 3134', 23.5],
      ['Wollastonite (Vansil W)', 12],
      ['EPK Kaolin', 20],
      ['Silica', 34.5],
      ['Talc', 10]
    ]
  ] as Array<Array<[string, number]>>;

  it('comes to the unity formula calculateUMF gives, oxide for oxide', () => {
    for (const lines of recipes) {
      const recipeLines = lines.map(([name, amount]) => ({ material: named(name), amount }));
      const worked = recipe.workedCalculation(recipeLines);
      const umf = chemistry.calculateUMF(recipeLines).umf;
      expect(worked.oxides.map((o) => o.oxide).sort()).to.eql(Object.keys(umf).sort());
      for (const total of worked.oxides) expect(total.unity).to.be.closeTo(umf[total.oxide], 1e-12);
      const fluxes = worked.oxides.filter((o) => o.flux).reduce((sum, o) => sum + o.unity, 0);
      expect(fluxes).to.be.closeTo(1, 1e-12);
    }
  });

  it('shows each step: grams of oxide, its molar mass and its moles, added up across the materials', () => {
    const worked = recipe.workedCalculation([
      { material: { name: 'Whiting', formula: { CaO: 1, CO2: 1 } }, amount: 20 },
      { material: { name: 'Silica', formula: { SiO2: 1 } }, amount: '30' },
      { material: { name: 'Nothing', formula: { SiO2: 1 } }, amount: 0 }
    ]);
    expect(worked.batchGrams).to.equal(50);
    expect(worked.materials.map((m) => m.name)).to.eql(['Whiting', 'Silica']);
    const [whiting] = worked.materials;
    expect(whiting.loi).to.be.closeTo(43.97, 0.01);
    const [lime] = whiting.oxides;
    expect(lime.oxide).to.equal('CaO');
    expect(lime.grams).to.be.closeTo((20 * lime.percent) / 100, 1e-12);
    expect(lime.moles).to.be.closeTo(lime.grams / lime.molarMass, 1e-12);
    expect(worked.fluxes.map((f) => f.oxide)).to.eql(['CaO']);
    expect(worked.fluxMoles).to.be.closeTo(lime.moles, 1e-12);
    // Fluxes first, then silica.
    expect(worked.oxides.map((o) => o.oxide)).to.eql(['CaO', 'SiO2']);
    expect(worked.oxides[0].unity).to.equal(1);
  });

  it('says there is no flux as calculateUMF does', () => {
    expect(() => recipe.workedCalculation([{ material: { name: 'Silica', formula: { SiO2: 1 } }, amount: 10 }]))
      .to.throw()
      .with.property('code', 'no-flux');
  });
});
