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

  it('has Hesselberth & Roy’s limits as published, the recipe page’s default, applying at cone 6 and cone 10 only', () => {
    const hr = recipe.HESSELBERTH_ROY_LIMITS;
    expect(recipe.DEFAULT_LIMIT_SET).to.equal(hr.id);
    expect(recipe.LIMIT_SETS[hr.id]).to.equal(hr);
    expect(recipe.LIMIT_SETS.glazecalc).to.equal(recipe.GLAZECALC_LIMITS);
    // The article's table, cone 6 then cone 10 (Ceramics Monthly, September 2000).
    expect(hr.unity.mid).to.deep.equal({
      'K2O+Na2O': { min: 0.1, max: 0.3 },
      CaO: { min: 0.2, max: 0.6 },
      MgO: { min: 0, max: 0.3 },
      ZnO: { min: 0, max: 0.2 },
      SrO: { min: 0, max: 0.2 },
      Al2O3: { min: 0.25, max: 0.4 },
      B2O3: { min: 0.15, max: 0.35 },
      SiO2: { min: 2.5, max: 4 }
    });
    expect(hr.unity.high).to.deep.equal({
      'K2O+Na2O': { min: 0.1, max: 0.3 },
      CaO: { min: 0.3, max: 0.7 },
      MgO: { min: 0, max: 0.4 },
      SrO: { min: 0, max: 0.3 },
      Al2O3: { min: 0.3, max: 0.6 },
      B2O3: { min: 0, max: 0.3 },
      SiO2: { min: 3, max: 5 }
    });
    expect([1060, 1222, 1240, 1300].map((c) => recipe.bandOf(hr, c))).to.deep.equal(['low', 'mid', 'mid', 'high']);
    // At low fire it does not apply, rather than stretching cone 6's figures.
    expect(recipe.unityFor(hr, 'low')).to.equal(null);
    expect(recipe.limitRows({ SiO2: 3 }, hr, 'low')).to.equal(null);
    // The app's own set has no high band: cone 10 reads its mid fire figures.
    expect(recipe.unityFor(recipe.GLAZECALC_LIMITS, 'high')).to.equal(recipe.GLAZECALC_LIMITS.unity.mid);
  });

  it('gives a row per limit, with the sums added up and the side a value is past', () => {
    const unity = { K2O: 0.2, Na2O: 0.15, CaO: 0.65, Al2O3: 0.3, B2O3: 0.1, SiO2: 3.2 };
    const rows = recipe.limitRows(unity, recipe.HESSELBERTH_ROY_LIMITS, 'mid')!;
    const row = (oxide: string) => rows.find((r) => r.oxide === oxide);
    expect(row('K2O+Na2O')).to.include({ past: 'above', likely: false, max: 0.3 });
    expect(row('K2O+Na2O')?.value).to.be.closeTo(0.35, 1e-9);
    expect(row('CaO')).to.include({ past: 'above' });
    expect(row('B2O3')).to.include({ past: 'below', min: 0.15 });
    expect(row('Al2O3')).to.include({ past: null });
    expect(row('ZnO')).to.include({ value: 0, past: null });
    // The app's own set has a figure for a likely fault: past it, the row says so.
    const own = recipe.limitRows({ ...unity, Al2O3: 0.15 }, recipe.GLAZECALC_LIMITS, 'mid')!;
    expect(own.find((r) => r.oxide === 'Al2O3')).to.include({ past: 'below', likely: true });
  });

  it('counts a value at a bound as within it, in the table and the checks alike, and a thin glaze by its own likely figure', () => {
    const own = recipe.GLAZECALC_LIMITS;
    const lines = [{ material: KAOLIN, amount: '10' }];
    const boron = (unity: Record<string, number>) =>
      recipe.limitRows(unity, own, 'low')!.find((r) => r.oxide === 'B2O3')!;
    const boronHigh = (unity: Record<string, number>) =>
      recipe.pastLimits({ lines, unity, celsius: 1060 }).some((c) => c.check === 'boron-high');
    const sound = { K2O: 0.2, CaO: 0.8, Al2O3: 0.3, SiO2: 3 };
    // At exactly 0.8 boron it is within, in both; just over, both say past, and not likely for a sound glaze.
    expect(boron({ ...sound, B2O3: 0.8 })).to.include({ past: null });
    expect(boronHigh({ ...sound, B2O3: 0.8 })).to.equal(false);
    expect(boron({ ...sound, B2O3: 0.81 })).to.include({ past: 'above', likely: false });
    expect(boronHigh({ ...sound, B2O3: 0.81 })).to.equal(true);
    // A thin glaze (alumina under 0.15) is likely past 0.8 already, where a sound one needs 1.0.
    expect(boron({ ...sound, Al2O3: 0.1, B2O3: 0.81 })).to.include({ past: 'above', likely: true });
  });

  it('compares at the two decimals a value is shown with, so a float hair or a rounding is not past a bound', () => {
    const hr = recipe.HESSELBERTH_ROY_LIMITS;
    // K2O + Na2O is 0.30000000000000004; Al2O3 0.2496 and SiO2 2.499 show as 0.25 and 2.50.
    const unity = { K2O: 0.2, Na2O: 0.1, CaO: 0.6, B2O3: 0.35, Al2O3: 0.2496, SiO2: 2.499 };
    const rows = recipe.limitRows(unity, hr, 'mid')!;
    expect(rows.filter((r) => r.past)).to.deep.equal([]);
    const lines = [{ material: KAOLIN, amount: '10' }];
    const checks = recipe.pastLimits({ lines, unity, celsius: 1222, limitSet: hr }).map((c) => c.check);
    expect(checks).not.to.include.members(['alkali', 'boron-high', 'alumina-low']);
    // The same rule in both: past by more than the rounding, both say so.
    expect(recipe.pastSide(0.306, { max: 0.3 })).to.equal('above');
    expect(recipe.pastSide(0.304, { max: 0.3 })).to.equal(null);
    expect(recipe.pastSide(2.494, { min: 2.5 })).to.equal('below');
  });

  it('checks a glaze with no alumina at all as low in alumina, but not an empty one', () => {
    const lines = [{ material: KAOLIN, amount: '10' }];
    const unity = { K2O: 0.2, Na2O: 0.1, CaO: 0.7, B2O3: 0.4, Al2O3: 0, SiO2: 3 };
    const low = (u: Record<string, number>) =>
      recipe.pastLimits({ lines, unity: u, celsius: 1222 }).find((c) => c.check === 'alumina-low');
    expect(low(unity)).to.include({ severity: 'likely', value: 0, limit: 0.25, direction: 'below' });
    expect(low({})).to.equal(undefined);
    // Not news when the old recipe had none either.
    const old = recipe.pastLimits({ lines, unity, old: unity, celsius: 1222 }).map((c) => c.check);
    expect(old).not.to.include('alumina-low');
  });

  it('only cautions with Hesselberth & Roy’s set, which gives no figure for a likely fault, as its table does', () => {
    const hr = recipe.HESSELBERTH_ROY_LIMITS;
    const lines = [{ material: KAOLIN, amount: '10' }];
    const unity = { K2O: 0.2, Na2O: 0.11, CaO: 0.6, B2O3: 0.2, Al2O3: 0.24, SiO2: 3 };
    const cautions = recipe.pastLimits({ lines, unity, celsius: 1222, limitSet: hr });
    const of = (check: string) => cautions.find((c) => c.check === check)!;
    expect(of('alkali')).to.include({ severity: 'caution' });
    expect(of('alkali').sentences.map((s) => s.code)).to.include('checks.alkaliTends');
    expect(of('alumina-low')).to.include({ severity: 'caution' });
    expect(of('alumina-low').sentences.map((s) => s.code)).to.include('checks.aluminaLowTends');
    // The table says the same: past, not well past.
    const rows = recipe.limitRows(unity, hr, 'mid')!;
    expect(rows.filter((r) => r.past).map((r) => [r.oxide, r.likely])).to.deep.equal([
      ['K2O+Na2O', false],
      ['Al2O3', false]
    ]);
  });

  it('words boron by the band whose figures are used, and a set’s own figure as the set’s', () => {
    const hr = recipe.HESSELBERTH_ROY_LIMITS;
    const lines = [{ material: KAOLIN, amount: '10' }];
    const unity = { K2O: 0.15, Na2O: 0.1, CaO: 0.75, Al2O3: 0.3, B2O3: 0.4, SiO2: 3 };
    const boron = (input: { celsius?: number; limitSet?: LimitSet }) =>
      recipe.pastLimits({ lines, unity, ...input }).find((c) => c.check === 'boron-high');
    // The firing unknown, Hesselberth & Roy's cone 6 figures are used, so cone 6's words, not cone 06-04's.
    expect(english(boron({ limitSet: hr })!.sentences[0])).to.equal(
      'This is a lot of boron for cone 6 (0.40; this limit set counts 0.35 as high).'
    );
    expect(english(boron({ celsius: 1222, limitSet: hr })!.sentences[0])).to.match(/this limit set counts 0\.35/);
    // The app's own set keeps its sentence at cone 6, and low fire's words with the firing unknown.
    expect(english(boron({ celsius: 1222 })!.sentences[0])).to.equal(
      'This is a lot of boron for cone 6 (0.40; industry counts 0.33 as high).'
    );
    const lowFire = recipe.pastLimits({ lines, unity: { ...unity, B2O3: 0.9 } }).find((c) => c.check === 'boron-high');
    expect(lowFire!.sentences[0]!.code).to.equal('checks.boronLowFire');
  });

  it('words cone 10 boron in a set’s high band', () => {
    const lines = [{ material: KAOLIN, amount: '10' }];
    const unity = { K2O: 0.2, CaO: 0.8, Al2O3: 0.4, B2O3: 0.45, SiO2: 4 };
    const hr = recipe.HESSELBERTH_ROY_LIMITS;
    const boron = (celsius: number) =>
      recipe.pastLimits({ lines, unity, celsius, limitSet: hr }).find((c) => c.check === 'boron-high');
    expect(english(boron(1300)!.sentences[0])).to.equal(
      'This is a lot of boron for cone 10 (0.45; this limit set counts 0.30 as high).'
    );
    expect(english(boron(1222)!.sentences[0])).to.match(/cone 6/);
  });

  it('leaves a point under the lowest region’s alumina unclassified, not bright', () => {
    expect(recipe.stullPoint({ SiO2: 3.5, Al2O3: 0.05 })).to.include({ region: 'unclassified', crazed: false });
    expect(recipe.stullPoint({ SiO2: 3.5, Al2O3: 0.08 })?.region).to.not.equal('unclassified');
  });

  it('works out the analysis a unity formula implies: mole percent and the point on Stull’s chart', () => {
    const percent = recipe.molePercent({ CaO: 1, Al2O3: 0.5, SiO2: 3.5, ZnO: 0 });
    expect(percent).to.deep.equal({ CaO: 20, Al2O3: 10, SiO2: 70 });
    expect(recipe.molePercent({})).to.deep.equal({});
    expect(recipe.stullPoint({ SiO2: 3.5, Al2O3: 0.35 })).to.include({ region: 'bright', ratio: 10, crazed: false });
    expect(recipe.stullPoint({ SiO2: 2.5, Al2O3: 0.6 })?.region).to.equal('matte');
    expect(recipe.stullPoint({ SiO2: 1.5, Al2O3: 0.9 })?.region).to.equal('unfused');
    expect(recipe.stullPoint({ SiO2: 3.6, Al2O3: 0.75 })?.region).to.equal('semi-matte');
    expect(recipe.stullPoint({ SiO2: 6, Al2O3: 0.3 })).to.include({ region: 'underfired', crazed: true });
    expect(recipe.stullPoint({ SiO2: 9, Al2O3: 0.3 })?.region).to.equal(null);
    expect(recipe.stullPoint({ SiO2: 3 })).to.equal(null);
  });

  it('works out a slurry by Brongniart’s formula: dry glaze, water to reach an SG, and a batch', () => {
    // A litre at SG 1.5 with dry materials at 2.5: 0.5 × 2.5 ÷ 1.5 kg of glaze, the rest water.
    expect(recipe.dryPerLitre(1.5)).to.be.closeTo(0.8333, 1e-4);
    const contents = recipe.slurryContents(10, 1.5)!;
    expect(contents.glaze).to.be.closeTo(8.333, 1e-3);
    expect(contents.water).to.be.closeTo(6.667, 1e-3);
    // Thinning 10 L from 1.5 to 1.45: water = 10 × 0.05 ÷ 0.45 kg, whatever the materials.
    expect(recipe.waterToReach(10, 1.5, 1.45)).to.be.closeTo(1.111, 1e-3);
    expect(recipe.waterToReach(10, 1.5, 1.45, 2.6)).to.be.closeTo(1.111, 1e-3);
    // Thickening is water to pour off; the glaze stays the same.
    const off = recipe.waterToReach(10, 1.4, 1.5)!;
    expect(off).to.be.closeTo(-2, 1e-9);
    expect(recipe.slurryContents(10 + off, 1.5)!.glaze).to.be.closeTo(recipe.slurryContents(10, 1.4)!.glaze, 1e-9);
    // A batch: 5 kg of dry glaze at 1.45, and back again.
    const batch = recipe.waterForBatch(5, 1.45)!;
    expect(recipe.slurryContents(batch.litres, 1.45)!.glaze).to.be.closeTo(5, 1e-9);
    expect(batch.water).to.be.closeTo(batch.litres * 1.45 - 5, 1e-9);
    expect(recipe.batchForVolume(10, 1.5)).to.deep.equal(contents);
    // What it cannot take: water, a slurry heavier than its materials, no volume.
    expect(recipe.dryPerLitre(1)).to.equal(null);
    expect(recipe.dryPerLitre(2.6)).to.equal(null);
    expect(recipe.slurryContents(0, 1.5)).to.equal(null);
    expect(recipe.waterToReach(10, 1.5, 0.9)).to.equal(null);
    // Densities as potters read them.
    expect(recipe.sgFromBaume(recipe.baumeFromSg(1.45))).to.be.closeTo(1.45, 1e-12);
    expect(recipe.sgFromPint(29)).to.equal(1.45);
    expect(recipe.pintFromSg(1.5)).to.equal(30);
    expect(recipe.LITRES.usGallon).to.be.closeTo(3.785, 1e-3);
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
