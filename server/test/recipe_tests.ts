import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import { IntlMessageFormat } from 'intl-messageformat';
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

  it('costs a batch from the account’s prices, naming the materials with none rather than guessing', () => {
    const lines = {
      materials: [
        { key: 'potash', amount: '60' },
        { key: 'whiting', amount: '40' },
        { key: 'blank', amount: '' }
      ],
      additives: [{ key: 'cobalt', amount: '2', unit: 'percent' as const }]
    };
    const prices = [
      { key: 'potash', perKg: 2 },
      { key: 'whiting', perKg: 0.5 },
      { key: 'cobalt', perKg: 80 }
    ];
    // 600 g at 2 a kg, 400 g at 0.5, and 20 g of cobalt at 80: 1.2 + 0.2 + 1.6.
    const all = recipe.recipeCost(lines, 1000, prices)!;
    expect(all.cost).to.be.closeTo(3, 1e-9);
    expect(all.grams).to.be.closeTo(1020, 1e-9);
    expect(all.perKg).to.be.closeTo((3 / 1020) * 1000, 1e-9);
    expect(all).to.include({ complete: true });
    expect(all.missing).to.eql([]);
    // A line that weighs nothing needs no price.
    expect(all.lines[2]).to.eql({ key: 'blank', grams: 0, perKg: null, cost: 0 });
    // Twice the batch, twice the cost; the same per kilogram.
    const twice = recipe.recipeCost(lines, 2000, prices)!;
    expect(twice.cost).to.be.closeTo(6, 1e-9);
    expect(twice.perKg).to.be.closeTo(all.perKg!, 1e-9);

    // Without cobalt's price: the cost of the rest, cobalt named, and no cost per kilogram.
    const some = recipe.recipeCost(
      lines,
      1000,
      new Map([
        ['potash', 2],
        ['whiting', 0.5]
      ])
    )!;
    expect(some.cost).to.be.closeTo(1.4, 1e-9);
    expect(some).to.include({ complete: false, perKg: null });
    expect(some.missing).to.eql(['cobalt']);
    expect(some.lines[3]).to.include({ key: 'cobalt', perKg: null, cost: null });

    // A price that is not one counts as none; a price of 0 is a price.
    const odd = recipe.batchCost(
      [
        { key: 'a', grams: 500 },
        { key: 'b', grams: 500 },
        { key: 'a', grams: 100 }
      ],
      [
        { key: 'a', perKg: -1 },
        { key: 'b', perKg: 0 }
      ]
    );
    expect(odd.missing).to.eql(['a']);
    expect(odd.cost).to.equal(0);
    expect(recipe.isPrice(0)).to.equal(true);
    expect([NaN, Infinity, -0.01, '3', null].some((value) => recipe.isPrice(value))).to.equal(false);
    // No amounts or no batch size: nothing to cost.
    expect(recipe.recipeCost({ materials: [{ key: 'a', amount: '' }] }, 1000, prices)).to.equal(null);
    expect(recipe.recipeCost(lines, 0, prices)).to.equal(null);
  });

  it('gathers the hazards the records give, each once, and names those that give none', () => {
    const records = [
      { name: 'Silica', hazards: 'Contains crystalline silica; avoid breathing the dust.' },
      { name: 'Kaolin', hazards: ' Contains crystalline silica; avoid breathing the dust. ' },
      { name: 'My frit' },
      { name: 'Silica', hazards: 'Contains crystalline silica; avoid breathing the dust.' },
      { name: 'Cobalt Carbonate', hazards: 'Danger: H350i may cause cancer by inhalation.' },
      { name: 'My frit', hazards: '' }
    ];
    const { hazards, unknown } = recipe.hazardsOf(records);
    expect(hazards.map((h) => [h.text, h.names])).to.eql([
      ['Contains crystalline silica; avoid breathing the dust.', ['Silica', 'Kaolin']],
      ['Danger: H350i may cause cancer by inhalation.', ['Cobalt Carbonate']]
    ]);
    expect(hazards[1].record).to.equal(records[4]);
    expect(unknown).to.eql(['My frit']);
    // Every standard material and additive has its hazards, so none of them is unknown.
    const standard = [
      ...(standardData.load('materials') as MaterialRecord[]),
      ...(standardData.load('additives') as MaterialRecord[])
    ] as Array<{ name: string; hazards?: string }>;
    expect(recipe.hazardsOf(standard).unknown).to.eql([]);
  });
});
