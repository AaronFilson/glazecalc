import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import { IntlMessageFormat } from 'intl-messageformat';
import chemistry from '../../lib/chemistry/index.js';
import recipe from '../../lib/recipe/index.js';
import density from '../../lib/recipe/density.js';
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

  it('writes an amount as a plain decimal however small, never with an exponent', () => {
    // String(0.0000001) is "1e-7", which isAmount and the chemistry refuse.
    expect([0.0000001, 2.5e-8, 12.5, 0, 1.25e21].map((value) => recipe.plainAmount(value))).to.eql([
      '0.0000001',
      '0.000000025',
      '12.5',
      '0',
      '1250000000000000000000'
    ]);
    for (const value of [1e-7, 1.234567e-9, 5e-324]) {
      expect(recipe.isAmount(recipe.plainAmount(value)), String(value)).to.equal(true);
      expect(recipe.amountOf(recipe.plainAmount(value)), String(value)).to.equal(value);
    }
    // A tiny amount scaled keeps three figures, written plainly too.
    expect(recipe.formatScaled(4.99999995e-7)).to.equal('0.0000005');
  });

  it('reads typed numbers by the decimal mark and the locale', () => {
    expect(recipe.parseNumber('1 234,5', 'either', 'fr')).to.equal(1234.5);
    expect(recipe.parseNumber('12.5', 'comma')).to.equal(null);
    expect(recipe.parseNumber('١٢٫٥')).to.equal(12.5);
    expect(recipe.toPlain('12,5', 'comma')).to.equal('12.5');
    expect(recipe.forTyping('12.5', 'either', 'de')).to.equal('12,5');
  });

  it('reads Indian digit groups, native digits, the Arabic marks and the marks that keep a direction', () => {
    // The marks Intl writes around a sign or a percent in Arabic: the Arabic letter mark, and left-to-right marks.
    const ALM = String.fromCodePoint(0x61c);
    const LRM = String.fromCodePoint(0x200e);
    const RLM = String.fromCodePoint(0x200f);
    const isolated = (text: string) => String.fromCodePoint(0x2066) + text + String.fromCodePoint(0x2069);
    // A lakh, and Indian groups with a decimal point (en-IN, hi-IN, bn-BD).
    expect(recipe.parseNumber('1,00,000')).to.equal(100000);
    expect(recipe.parseNumber('12,34,567.5')).to.equal(1234567.5);
    expect(recipe.parseNumber('1,23,45,67,890')).to.equal(1234567890);
    expect(recipe.parseNumber('1,00,000', 'point')).to.equal(100000);
    // Arabic-Indic digits with the Arabic thousands and decimal marks (ar-EG), and Extended ones (ur-IN).
    expect(recipe.parseNumber('١٬٢٣٤٫٥')).to.equal(1234.5);
    expect(recipe.parseNumber('۱٬۲۳۴٫۵')).to.equal(1234.5);
    // Bengali and Devanagari digits in Indian groups.
    expect(recipe.parseNumber('১২,৩৪,৫৬৭.৫')).to.equal(1234567.5);
    expect(recipe.parseNumber('१,००,०००')).to.equal(100000);
    // A sign or a percent among the marks that keep its direction, as Intl writes them.
    expect(recipe.parseNumber(ALM + '-3')).to.equal(-3);
    expect(recipe.parseNumber(ALM + '-٣')).to.equal(-3);
    expect(recipe.parseNumber(LRM + '-' + LRM + '۳')).to.equal(-3);
    expect(recipe.parseNumber(RLM + '12.5' + RLM)).to.equal(12.5);
    expect(recipe.parseNumber(isolated('12,5'))).to.equal(12.5);
    // A percentage reads as its number, the sign before or after it.
    expect(recipe.parseNumber('٥٪')).to.equal(5);
    expect(recipe.parseNumber('٥٪' + ALM)).to.equal(5);
    expect(recipe.parseNumber('5' + LRM + '%' + LRM)).to.equal(5);
    expect(recipe.parseNumber('%5')).to.equal(5);
    expect(recipe.parseNumber('-%5')).to.equal(-5);
    expect(recipe.parseNumber('7 %', 'either', 'fr')).to.equal(7);
    // Not numbers: groups of two below the thousands, a sign alone, two signs, a sign inside.
    for (const text of ['12,5,3', '1,000,00', '1,00,00', '12,34,567,5', '1.00.000', '%', '٪', '5%%', '5%5', '%-5']) {
      expect(recipe.parseNumber(text), text).to.equal(null);
    }
    // One separator is still a decimal, or a thousand as the locale reads it, and Arabic's marks read as English's.
    expect(recipe.parseNumber('1,00')).to.equal(1);
    expect(recipe.parseNumber('1,250', 'either', 'ar-EG-u-nu-arab')).to.equal(1250);
    expect(recipe.parseNumber('1,250', 'either', 'ar-MA')).to.equal(1.25);
    expect(recipe.separators('ar-EG-u-nu-arab')).to.eql({ decimal: '.', group: ',' });
    expect(recipe.forTyping('12.5', 'either', 'ar-EG-u-nu-arab')).to.equal('12.5');
    expect(recipe.plainDigits(LRM + '-' + LRM + '۳ ١٢٫٥ १२')).to.equal('-3 12٫5 12');
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

  it('knows a potter’s own raw clay and whiting, which have no category, by their analysis', () => {
    const library = standardData.load('materials') as MaterialRecord[];
    const epk = library.find((m) => m.name === 'EPK Kaolin')!;
    const whiting = library.find((m) => m.name === 'Whiting')!;
    // A potter's own, typed in from the data sheet: no category, no ownedBy 'Standard'.
    const own = (record: MaterialRecord, name: string): MaterialRecord => ({
      name,
      percentmole: record.percentmole,
      loi: record.loi,
      fields: record.fields
    });
    const myEpk = own(epk, 'My EPK');
    const myWhiting = own(whiting, 'Calcium carbonate from the feed store');
    expect(recipe.isRawClay(myEpk)).to.equal(true);
    const unity = { K2O: 0.2, CaO: 0.8, Al2O3: 0.3, B2O3: 0.6, SiO2: 3 };
    const checks = (clay: MaterialRecord, flux: MaterialRecord, amounts: [number, number, number]) => {
      const lines = [
        { material: clay, amount: String(amounts[0]) },
        { material: flux, amount: String(amounts[1]) },
        { material: SILICA, amount: String(amounts[2]) }
      ];
      return {
        clay: recipe.rawClayPercent(lines.map((line) => ({ ...line.material, amount: line.amount }))),
        checks: recipe.pastLimits({ lines, unity, celsius: 1060 }).map((c) => [c.check, c.severity, c.value])
      };
    };
    // My EPK and my whiting behave as the library's: too much clay, too little, and raw whiting at low fire.
    for (const amounts of [
      [30, 10, 60],
      [3, 10, 87],
      [15, 12, 73]
    ] as Array<[number, number, number]>) {
      expect(checks(myEpk, myWhiting, amounts), String(amounts)).to.deep.equal(checks(epk, whiting, amounts));
    }
    expect(checks(myEpk, myWhiting, [30, 10, 60]).checks.map((c) => c[0])).to.include.members(['clay-high', 'whiting']);
    // Calcined clay (no LOI) and wollastonite (calcium, no LOI) are neither.
    expect(recipe.isRawClay({ ...myEpk, name: 'My calcined kaolin', loi: 0 })).to.equal(false);
    const wollastonite = { name: 'My wollastonite', percentmole: 'molecular' as const, loi: 0, fields: whiting.fields };
    expect(checks(myEpk, wollastonite, [15, 12, 73]).checks.map((c) => c[0])).to.not.include('whiting');
    // A library record keeps its category: kaolin's analysis filed as something else is not raw clay.
    expect(recipe.isRawClay({ ...myEpk, category: 'feldspar' })).to.equal(false);
  });

  it('knows a potter’s own dolomite by its analysis, as raw calcium at low fire', () => {
    const library = standardData.load('materials') as MaterialRecord[];
    const dolomite = library.find((m) => m.name === 'Dolomite')!;
    const own = (name: string, loi: number, oxides: Record<string, number>): MaterialRecord => ({
      name,
      percentmole: 'percent',
      loi,
      fields: Object.entries(oxides).map(([oxide, amount]) => ({ name: oxide, amount }))
    });
    // Typed in from a data sheet, and the library's own copied under another name: no category.
    const local = own('Local dolomite', 47, { CaO: 30.4, MgO: 21.7 });
    const copied: MaterialRecord = {
      name: 'Dolomite from the garden centre',
      percentmole: dolomite.percentmole,
      loi: dolomite.loi,
      fields: dolomite.fields
    };
    const unity = { K2O: 0.2, CaO: 0.8, Al2O3: 0.3, B2O3: 0.6, SiO2: 3 };
    const whiting = (material: MaterialRecord, amount: number) =>
      recipe
        .pastLimits({
          lines: [
            { material, amount: String(amount) },
            { material: SILICA, amount: String(100 - amount) }
          ],
          unity,
          celsius: 1060
        })
        .filter((c) => c.check === 'whiting')
        .map((c) => [c.severity, c.value]);
    // Raw dolomite barely melts at cone 04 and gives off gas, as whiting does: as the library's Dolomite.
    for (const amount of [3, 8, 20]) {
      expect(whiting(local, amount), String(amount)).to.deep.equal(whiting(dolomite, amount));
      expect(whiting(copied, amount), String(amount)).to.deep.equal(whiting(dolomite, amount));
    }
    expect(whiting(local, 20)).to.deep.equal([['likely', 20]]);
    // Magnesite (MgO alone, LOI 52%) and talc (LOI 5.5%) are not raw calcium.
    expect(whiting(own('My magnesite', 52.2, { MgO: 47.8 }), 20)).to.deep.equal([]);
    expect(whiting(own('My talc', 5.5, { SiO2: 61, MgO: 31, CaO: 0.5 }), 20)).to.deep.equal([]);
  });

  it('does not warn of what the old recipe already had', () => {
    const unity = { K2O: 0.6, Na2O: 0.1, CaO: 0.3, Al2O3: 0.3, SiO2: 3 };
    const lines = [{ material: KAOLIN, amount: '10' }];
    const checks = recipe.pastLimits({ lines, unity, old: unity, celsius: 1222 }).map((c) => c.check);
    expect(checks).not.to.include('alkali');
    // Nor as much raw clay as it had (to rounding, or a little more); more than that is news.
    const clay = (amount: number, oldClay: number) =>
      recipe
        .pastLimits({
          lines: [
            { material: KAOLIN, amount: String(amount) },
            { material: SILICA, amount: String(100 - amount) }
          ],
          unity,
          old: unity,
          oldClay,
          celsius: 1222
        })
        .map((c) => c.check);
    expect(clay(20.1, 20)).not.to.include('clay-high');
    expect(clay(30, 28)).not.to.include('clay-high');
    expect(clay(27, 20)).to.include('clay-high');
    expect(clay(21, 15)).to.include('clay-high');
  });

  it('counts a caution as the old recipe’s only when it raised the same one, as serious or more', () => {
    const lines = [{ material: KAOLIN, amount: '10' }];
    const glaze = { K2O: 0.15, Na2O: 0.1, CaO: 0.5, B2O3: 0.2, Al2O3: 0.3, SiO2: 3 };
    const severity = (check: string, oxide: string, was: number, now: number, celsius: number) => {
      const unity = (value: number) => ({ ...glaze, [oxide]: value, ...(oxide === 'K2O' && { Na2O: 0 }) });
      return recipe
        .pastLimits({ lines, unity: unity(now), old: unity(was), celsius })
        .find((caution) => caution.check === check)?.severity;
    };
    // From a caution to likely: low-fire alumina 0.11 to 0.10, mid-fire 0.21 to 0.195 (shown as 0.20).
    expect(severity('alumina-low', 'Al2O3', 0.11, 0.1, 1060)).to.equal('likely');
    expect(severity('alumina-low', 'Al2O3', 0.21, 0.195, 1222)).to.equal('likely');
    // On the limit, the old recipe had no caution: 0.15 to 0.14 at low fire crosses it.
    expect(severity('alumina-low', 'Al2O3', 0.15, 0.14, 1060)).to.equal('caution');
    // The same on the high side: soda and potash, boron, magnesia and barium.
    expect(severity('alkali', 'K2O', 0.38, 0.41, 1222)).to.equal('likely');
    expect(severity('alkali', 'K2O', 0.3, 0.32, 1222)).to.equal('caution');
    expect(severity('boron-high', 'B2O3', 0.37, 0.4, 1222)).to.equal('likely');
    expect(severity('magnesia', 'MgO', 0.28, 0.3, 1060)).to.equal('likely');
    expect(severity('barium', 'BaO', 0.38, 0.41, 1222)).to.equal('likely');
    expect(severity('barium', 'BaO', 0.1, 0.106, 1222)).to.equal('caution');
    // As serious as the old recipe's, and no more than a tenth worse: not news.
    expect(severity('alumina-low', 'Al2O3', 0.12, 0.115, 1060)).to.equal(undefined);
    expect(severity('alumina-low', 'Al2O3', 0.1, 0.095, 1060)).to.equal(undefined);
    expect(severity('alkali', 'K2O', 0.42, 0.44, 1222)).to.equal(undefined);
    expect(severity('boron-high', 'B2O3', 0.35, 0.36, 1222)).to.equal(undefined);
    expect(severity('barium', 'BaO', 0.2, 0.21, 1222)).to.equal(undefined);
    // Nor less serious than it was.
    expect(severity('alumina-low', 'Al2O3', 0.09, 0.12, 1060)).to.equal(undefined);
    expect(severity('alkali', 'K2O', 0.45, 0.39, 1222)).to.equal(undefined);
    // Raw clay the same way: from the caution's 24% to the likely 26% is news, 26% to 27% is not.
    const clay = (amount: number, oldClay: number) =>
      recipe
        .pastLimits({
          lines: [
            { material: KAOLIN, amount: String(amount) },
            { material: SILICA, amount: String(100 - amount) }
          ],
          unity: glaze,
          old: glaze,
          oldClay,
          celsius: 1222
        })
        .find((caution) => caution.check === 'clay-high')?.severity;
    expect(clay(26, 24)).to.equal('likely');
    expect(clay(27, 26)).to.equal(undefined);
    expect(recipe.rawClayHigh(26, 24)).to.equal(true);
    expect(recipe.rawClayHigh(24.5, 24)).to.equal(false);
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

  it('has no figures from cone 12 up (1320 °C), in either set: published limits stop at cone 10', () => {
    expect(recipe.FIRING_BANDS).to.eql(['low', 'mid', 'high', 'top']);
    for (const set of [recipe.HESSELBERTH_ROY_LIMITS, recipe.GLAZECALC_LIMITS]) {
      expect(recipe.bandOf(set, 1319), set.id).to.not.equal('top');
      expect(recipe.bandOf(set, 1320), set.id).to.equal('top');
      expect(recipe.bandOf(set, 1450), set.id).to.equal('top');
      expect(recipe.unityFor(set, 'top'), set.id).to.equal(null);
      expect(recipe.limitRows({ SiO2: 6, Al2O3: 0.8 }, set, 'top'), set.id).to.equal(null);
      expect(set.unity, set.id).to.not.have.property('top');
    }
    // A band the set names is read as itself; the app's own set reads high fire as its mid fire.
    expect(recipe.bandIn(recipe.HESSELBERTH_ROY_LIMITS, 'high')).to.equal('high');
    expect(recipe.bandIn(recipe.GLAZECALC_LIMITS, 'high')).to.equal('mid');
    expect(recipe.bandIn(recipe.GLAZECALC_LIMITS, 'top')).to.equal('top');
  });

  it('checks a cone by its band where it is given, and nothing by range in the top band', () => {
    const lines = [{ material: KAOLIN, amount: '10' }];
    // Too much alkali and boron, too little alumina, for any firing's figures.
    const unity = { K2O: 0.4, Na2O: 0.2, CaO: 0.4, Al2O3: 0.1, B2O3: 0.6, SiO2: 3 };
    const checks = (input: Partial<Parameters<typeof recipe.pastLimits>[0]>) =>
      recipe.pastLimits({ lines, unity, ...input }).map((c) => c.check);
    const ranged = ['boron-high', 'alumina-low', 'alkali'];
    for (const limitSet of [recipe.HESSELBERTH_ROY_LIMITS, recipe.GLAZECALC_LIMITS]) {
      expect(checks({ band: 'high', limitSet }), limitSet.id).to.include.members(['alkali', 'alumina-low']);
      expect(
        checks({ band: 'top', limitSet }).filter((c) => ranged.includes(c)),
        limitSet.id
      ).to.eql([]);
      expect(
        checks({ celsius: 1400, limitSet }).filter((c) => ranged.includes(c)),
        limitSet.id
      ).to.eql([]);
      // What does not hang on the firing is still checked: the clay.
      expect(checks({ band: 'top', limitSet }), limitSet.id).to.include('clay-high');
    }
    // The band wins over a temperature: SK 8 is mid fire though JIS says 1250 °C.
    expect(checks({ band: 'mid', celsius: 1250, limitSet: recipe.HESSELBERTH_ROY_LIMITS })).to.include('boron-high');
    // A low band with no temperature skips Katz's "too little boron", which needs one.
    const lean = { ...unity, K2O: 0.2, Na2O: 0.1, B2O3: 0 };
    expect(recipe.pastLimits({ lines, unity: lean, band: 'low' }).map((c) => c.check)).to.not.include('boron-short');
    expect(recipe.pastLimits({ lines, unity: lean, celsius: 1060 }).map((c) => c.check)).to.include('boron-short');
    // Nor for a lead or alkaline glaze, which melts without boron (Katz's rule is for neither, as in cone-fit).
    const short = (u: Record<string, number>) =>
      recipe.pastLimits({ lines, unity: u, celsius: 1060 }).map((c) => c.check);
    expect(short({ ...lean, PbO: 0.06 })).to.not.include('boron-short');
    expect(short({ ...lean, PbO: 0.05 })).to.include('boron-short');
    expect(short({ ...lean, K2O: 0.25, Na2O: 0.2 })).to.not.include('boron-short');
    // A firing of null (or NaN) is not known, not 0 °C: the same as none.
    for (const celsius of [null, NaN, Infinity]) {
      const unknown = recipe.pastLimits({ lines, unity: lean, celsius: celsius as unknown as number });
      expect(unknown, String(celsius)).to.deep.equal(recipe.pastLimits({ lines, unity: lean }));
      expect(recipe.bandOf(recipe.GLAZECALC_LIMITS, celsius as unknown as number), String(celsius)).to.equal(undefined);
    }
    expect(Number.isNaN(chemistry.boronFor(null as unknown as number))).to.equal(true);
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

  it('cautions of barium, which can leach, past 0.1 in the unity formula and likely from 0.4, at any firing, as shown', () => {
    const lines = [{ material: KAOLIN, amount: '10' }];
    const unity = { K2O: 0.1, Na2O: 0.1, CaO: 0.5, Al2O3: 0.3, B2O3: 0.2, SiO2: 3 };
    const barium = (baO: number, celsius?: number, old?: Record<string, number>) =>
      recipe.pastLimits({ lines, unity: { ...unity, BaO: baO }, celsius, old }).find((c) => c.check === 'barium');
    // Digitalfire's Limit Formula page: "low BaO levels can often be tolerated (e.g. 0.05-0.1)". Compared
    // at the two decimals shown, as the other limits are: 0.10 is within, and so is 0.104, shown as 0.10.
    expect(barium(0.1, 1222)).to.equal(undefined);
    expect(barium(0.104, 1222)).to.equal(undefined);
    expect(barium(0.106, 1222)).to.include({ severity: 'caution', quantity: 'BaO', limit: 0.1, direction: 'above' });
    // Shown as 0.20, it is past the figure (the old figure, 0.2, read 0.1996 as under it).
    expect(barium(0.1996, 1222)).to.include({ severity: 'caution' });
    // "Any glaze that has 0.4 BaO would be off-the-scale for potential to leach": likely from 0.40 as shown.
    expect(barium(0.394, 1060)).to.include({ severity: 'caution' });
    expect(barium(0.396, 1060)).to.include({ severity: 'likely' });
    expect(barium(0.4, 1060)).to.include({ severity: 'likely' });
    expect(barium(0.3)).to.include({ severity: 'caution' });
    expect(words(barium(0.4)!)).to.match(/barium oxide \(BaO\) 0\.40 .*leach.*food/);
    expect(words(barium(0.3)!)).to.match(/leach.*food/);
    // Not news when the old recipe had as much.
    expect(barium(0.3, 1222, { ...unity, BaO: 0.3 })).to.equal(undefined);
    // For the warning beside lead's: BaO in the unity formula of the lines, as leadIn reads them, compared
    // as the check compares it.
    const BARIUM_CARBONATE = material('Barium carbonate', [['BaO', 1]], 22.3);
    const bariumIn = (grams: number) =>
      recipe.bariumIn([line(BARIUM_CARBONATE, grams), line(WHITING, 10), line(SILICA, 30)]);
    // 10 g of whiting is 0.0999 mol CaO; barium carbonate is 197.3 g a mole.
    expect(bariumIn(2.19)).to.equal(null);
    expect(bariumIn(2.29)).to.equal(null);
    expect(bariumIn(2.34)).to.deep.include({ likely: false });
    expect(bariumIn(2.34)!.unity).to.be.closeTo(0.106, 0.001);
    expect(bariumIn(12.85)).to.deep.include({ likely: false });
    expect(bariumIn(12.9)).to.deep.include({ likely: true });
    expect(bariumIn(13.2)).to.deep.include({ likely: true });
    expect(recipe.bariumIn([line(WHITING, 10), line(SILICA, 30)])).to.equal(null);
    expect(recipe.CHECK_LIMITS.barium).to.deep.equal({ caution: 0.1, likely: 0.4 });
  });

  it('has no unity formula without a flux, as calculateUMF says', () => {
    for (const moles of [{ SiO2: 1, Al2O3: 0.1 }, {}] as Array<Record<string, number>>) {
      expect(() => recipe.unityOf(moles), JSON.stringify(moles))
        .to.throw()
        .with.property('code', 'no-flux');
    }
    expect(recipe.unityOf({ CaO: 0.2, K2O: 0.05, SiO2: 1 })).to.deep.equal({ CaO: 0.8, K2O: 0.2, SiO2: 4 });
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
    // Nor when it had as little (or a little less, to 10%); much less than it had is news.
    const thin = { ...unity, Al2O3: 0.15 };
    const was = (u: Record<string, number>) =>
      recipe.pastLimits({ lines, unity: u, old: thin, celsius: 1222 }).map((c) => c.check);
    expect(was(thin)).not.to.include('alumina-low');
    expect(was({ ...thin, Al2O3: 0.14 })).not.to.include('alumina-low');
    expect(was({ ...thin, Al2O3: 0.1 })).to.include('alumina-low');
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

  it('reads Stull’s outlines to their edges: nothing bright between semi-matte and matte, nor on the chart’s rim', () => {
    const point = (SiO2: number, Al2O3: number) => recipe.stullPoint({ SiO2, Al2O3 })!;
    // Semi-matte meets matte along matte's lower edge, (0.6, 0.08) to (4, 1). Glazy's semi-matte stopped up to
    // 0.00035 under it, and a point between them read as bright.
    for (let x = 1.25; x < 4; x += 0.25) {
      const edge = 0.08 + (0.92 * (x - 0.6)) / 3.4;
      for (const y of [edge - 3e-4, edge - 1e-4, edge - 1e-12, edge, edge + 1e-12, edge + 1e-4]) {
        expect(['semi-matte', 'matte'], `${x}, ${y}`).to.include(point(x, y).region);
      }
    }
    // A point on an outline is in it: alumina 1.0, the chart's top, and silica 0.6 and 7.2 read as the regions they
    // bound, not bright; so does the line between unfused and matte.
    expect([1.5, 3.5, 4.5, 6].map((silica) => point(silica, 1).region)).to.eql([
      'unfused',
      'matte',
      'semi-matte',
      'bright'
    ]);
    expect(
      [point(0.6, 0.08), point(0.6, 0.3), point(0.6, 0.7), point(7.2, 0.3), point(7.2, 0.8)].map((p) => p.region)
    ).to.eql(['matte', 'matte', 'unfused', 'underfired', 'bright']);
    expect(point(1.48, 0.652).region).to.equal('unfused');
    expect([point(7.2, 0.3).crazed, point(1, 1).crazed, point(7.2, 0.8).crazed]).to.eql([true, true, false]);
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
    expect(recipe.dryPerLitre(1.5, 2.5)).to.be.closeTo(0.8333, 1e-4);
    const contents = recipe.slurryContents(10, 1.5, 2.5)!;
    expect(contents.glaze).to.be.closeTo(8.333, 1e-3);
    expect(contents.water).to.be.closeTo(6.667, 1e-3);
    // Thinning 10 L from 1.5 to 1.45: water = 10 × 0.05 ÷ 0.45 kg, whatever the materials.
    expect(recipe.waterToReach(10, 1.5, 1.45, 2.5)).to.be.closeTo(1.111, 1e-3);
    expect(recipe.waterToReach(10, 1.5, 1.45, 2.6)).to.be.closeTo(1.111, 1e-3);
    // At the SG wanted already: under half a gram of water a litre either way, for the page and the MCP tool alike.
    expect(recipe.reachedAlready(recipe.waterToReach(100, 1.4502, 1.45, null)!, 100)).to.equal(true);
    expect(recipe.reachedAlready(recipe.waterToReach(1, 1.452, 1.45, null)!, 1)).to.equal(false);
    expect([0.0049, -0.0049, 0.005, -0.005].map((water) => recipe.reachedAlready(water, 10))).to.eql([
      true,
      true,
      false,
      false
    ]);
    // Under a litre, half a gram all the same: the page writes the water to the gram, so it never says to add 0 g.
    for (const litres of [0.1, 0.5, 1]) {
      expect([0.00049, -0.00049, 0.0005, -0.0005].map((water) => recipe.reachedAlready(water, litres))).to.eql([
        true,
        true,
        false,
        false
      ]);
    }
    // Thickening is water to pour off; the glaze stays the same.
    const off = recipe.waterToReach(10, 1.4, 1.5, 2.5)!;
    expect(off).to.be.closeTo(-2, 1e-9);
    expect(recipe.slurryContents(10 + off, 1.5, 2.5)!.glaze).to.be.closeTo(
      recipe.slurryContents(10, 1.4, 2.5)!.glaze,
      1e-9
    );
    // A batch: 5 kg of dry glaze at 1.45, and back again.
    const batch = recipe.waterForBatch(5, 1.45, 2.5)!;
    expect(recipe.slurryContents(batch.litres, 1.45, 2.5)!.glaze).to.be.closeTo(5, 1e-9);
    expect(batch.water).to.be.closeTo(batch.litres * 1.45 - 5, 1e-9);
    expect(recipe.batchForVolume(10, 1.5, 2.5)).to.deep.equal(contents);
    // What it cannot take: water, a slurry heavier than its materials, no volume, no dry SG.
    expect(recipe.dryPerLitre(1, 2.5)).to.equal(null);
    expect(recipe.dryPerLitre(2.6, 2.5)).to.equal(null);
    expect(recipe.slurryContents(0, 1.5, 2.5)).to.equal(null);
    expect(recipe.waterToReach(10, 1.5, 0.9, 2.5)).to.equal(null);
    expect((recipe.dryPerLitre as (sg: number) => number | null)(1.5)).to.equal(null);
    // Densities as potters read them.
    expect(recipe.sgFromBaume(recipe.baumeFromSg(1.45))).to.be.closeTo(1.45, 1e-12);
    expect(recipe.sgFromPint(29)).to.equal(1.45);
    expect(recipe.pintFromSg(1.5)).to.equal(30);
    expect(recipe.LITRES.usGallon).to.be.closeTo(3.785, 1e-3);
    // The water to add needs no dry SG at all.
    expect(recipe.waterToReach(10, 1.5, 1.45, null)).to.be.closeTo(1.111, 1e-3);
    expect(recipe.waterToReach(10, 2.7, 1.45, null)).to.be.closeTo(27.778, 1e-3);
    expect(recipe.waterToReach(10, 1.5, 1, null)).to.equal(null);
  });

  it('estimates a material’s dry SG from its mineral, its kind or, for a frit, its oxides', () => {
    const library = standardData.load<MaterialRecord>('materials');
    const additives = standardData.load<MaterialRecord>('additives');
    // Standard records, as the app has them (the data files carry no owner).
    const named = (name: string) => ({
      ...[...library, ...additives].find((m) => m.name === name)!,
      ownedBy: 'Standard'
    });
    // Minerals: quartz, calcite, zircon.
    expect(recipe.materialSg(named('Silica'))).to.deep.equal({ sg: 2.65, basis: 'mineral', source: 'quartz' });
    expect(recipe.materialSg(named('Whiting')).sg).to.equal(2.71);
    expect(recipe.materialSg(named('Zircon')).sg).to.equal(4.65);
    // Checked against three sources each (docs/sources/dry-sg-sources.md).
    expect(recipe.materialSg(named('Bone Ash')).sg).to.equal(3.16);
    expect(recipe.materialSg(named('Copper oxide')).sg).to.equal(6.4);
    expect(recipe.materialSg(named('Litharge')).sg).to.equal(9.35);
    // Crystal-structure densities settle the disagreements: K2CO3 2.435, Co3O4 6.06, CeO2 7.22.
    expect(recipe.materialSg(named('Pearl Ash')).sg).to.equal(2.43);
    expect(recipe.materialSg(named('Cobalt Oxide')).sg).to.equal(6.07);
    expect(recipe.materialSg(named('Cerium oxide')).sg).to.equal(7.22);
    // Kinds: commercial feldspars and clays.
    expect(recipe.materialSg(named('Custer Spar'))).to.include({ sg: 2.6, basis: 'kind', source: 'feldspar' });
    expect(recipe.materialSg(named('EPK Kaolin'))).to.include({ sg: 2.6, basis: 'kind', source: 'clay' });
    // Frits from Appen's factors: a lead bisilicate near the 4.5 to 4.7 published, Ferro 3110 near 2.5.
    expect(recipe.materialSg(named('Ferro Frit 4064 (lead bisilicate)'))).to.include({ basis: 'glass' });
    expect(recipe.materialSg(named('Ferro Frit 4064 (lead bisilicate)')).sg).to.be.within(4.45, 4.7);
    expect(recipe.materialSg(named('Ferro Frit 3110')).sg).to.be.within(2.4, 2.6);
    // Silica as a mineral or a glass: the crystal matters, so calcined flint has none.
    expect(recipe.materialSg(named('Flint (UK calcined)'))).to.include({ sg: null, reason: 'crystal-form-unknown' });
    expect(recipe.materialSg(named('Gerstley Borate'))).to.include({ sg: null, reason: 'mixture-unknown' });
    // A potter's own material with no kind: no guess.
    expect(recipe.materialSg({ name: 'Creek clay', fields: [{ name: 'SiO2', amount: '60' }] })).to.include({
      sg: null,
      basis: 'none',
      reason: 'not-classified'
    });
    // Every standard material has a number or a reason.
    for (const material of [...library, ...additives]) {
      const estimate = recipe.materialSg({ ...material, ownedBy: 'Standard' });
      expect(estimate.sg !== null || Boolean(estimate.reason), material.name).to.equal(true);
    }
    // Known glasses: soda-lime float about 2.50, borosilicate 3.3 about 2.23.
    const glass = (wt: Record<string, number>) => density.glassDensity(wt).sg!;
    expect(glass({ SiO2: 72.5, Na2O: 13.5, CaO: 9, MgO: 3.5, Al2O3: 1.5 })).to.be.closeTo(2.5, 0.03);
    expect(glass({ SiO2: 80.6, B2O3: 12.6, Na2O: 4.2, Al2O3: 2.2 })).to.be.closeTo(2.23, 0.04);
    // A tile frit with its analysis and density (Barba et al. 2016, frit FCP, 2.654): within 1%.
    const fcp = { SiO2: 60, Al2O3: 6.5, B2O3: 1.74, CaO: 14.1, MgO: 1.75, Na2O: 0.34, K2O: 4.37, ZnO: 10.6 };
    expect(glass(fcp)).to.be.closeTo(2.654, 0.03);
    expect(density.glassDensity({ SiO2: 90, Fe2O3: 10 }).sg).to.equal(null);
    // A frit with more than 1% of an oxide outside Appen's table has no estimate, and says which.
    const ironFrit = {
      name: 'Iron frit',
      category: 'frit',
      percentmole: 'percent',
      fields: [
        { name: 'SiO2', amount: '60' },
        { name: 'B2O3', amount: '20' },
        { name: 'Na2O', amount: '15' },
        { name: 'Fe2O3', amount: '5' }
      ]
    };
    expect(recipe.materialSg(ironFrit)).to.deep.include({ sg: null, reason: 'oxides-not-in-factors' });
    expect(recipe.materialSg(ironFrit).oxides).to.include('Fe2O3');
  });

  it('knows a material by its name only when it is a standard record', () => {
    const library = standardData.load<MaterialRecord>('materials');
    const whiting = library.find((m) => m.name === 'Whiting')!;
    // A potter's own "Whiting" or "Silica" may be anything: no mineral by its name.
    expect(recipe.materialSg({ ...whiting, ownedBy: 'someone' }).basis).to.not.equal('mineral');
    expect(recipe.materialSg({ name: 'Silica', fields: [{ name: 'SiO2', amount: '100' }] })).to.include({
      sg: null,
      reason: 'not-classified'
    });
    // Their own clay still goes by its kind, and the standard one by its mineral.
    expect(recipe.materialSg({ name: 'Whiting', category: 'clay', ownedBy: 'someone' })).to.include({
      sg: 2.6,
      basis: 'kind'
    });
    expect(recipe.materialSg({ ...whiting, ownedBy: 'Standard' })).to.include({ sg: 2.71, source: 'calcite' });
  });

  it('estimates a recipe’s dry SG as its weight over the sum of each weight over its SG', () => {
    const library = standardData.load<MaterialRecord>('materials');
    const additives = standardData.load<MaterialRecord>('additives');
    const named = (name: string, amount: number) => ({
      ...[...library, ...additives].find((m) => m.name === name)!,
      ownedBy: 'Standard',
      amount: String(amount)
    });
    const lines = [named('Custer Spar', 40), named('Whiting', 20), named('EPK Kaolin', 20), named('Silica', 20)];
    const sg = recipe.recipeDrySg(lines);
    expect(sg.sg).to.equal(Math.round((100 / (40 / 2.6 + 20 / 2.71 + 20 / 2.6 + 20 / 2.65)) * 100) / 100);
    expect(sg.basis).to.equal('mixed');
    expect(sg.unknownShare).to.equal(0);
    // A little bentonite (2%) is left out and said; much Gerstley Borate is not.
    const some = recipe.recipeDrySg([...lines, named('Bentonite', 2)]);
    expect(some.sg).to.equal(sg.sg);
    expect(some.unknown).to.deep.equal(['Bentonite']);
    const much = recipe.recipeDrySg([...lines, named('Gerstley Borate', 20)]);
    expect(much).to.include({ sg: null, basis: 'none', reason: 'too-much-unknown' });
    expect(recipe.recipeDrySg([])).to.include({ sg: null, reason: 'no-amounts' });
    expect(recipe.recipeDrySg([named('Silica', 10)]).basis).to.equal('mineral');
    // Exactly 5% unknown still gives an estimate, in whatever amounts make it up; a little more does not.
    for (const [known, unknown] of [
      [95, 5],
      [19, 1],
      [0.95, 0.05],
      [57, 3]
    ]) {
      const edge = recipe.recipeDrySg([named('Silica', known), named('Bentonite', unknown)]);
      expect(edge.sg, `${known} + ${unknown}`).to.equal(2.65);
      expect(edge.unknownShare).to.be.closeTo(0.05, 1e-12);
    }
    expect(recipe.recipeDrySg([named('Silica', 94.9), named('Bentonite', 5.1)])).to.include({
      sg: null,
      reason: 'too-much-unknown'
    });
    // Every line unknown: no estimate, and every name said.
    const none = recipe.recipeDrySg([named('Bentonite', 50), named('Gerstley Borate', 50)]);
    expect(none).to.include({ sg: null, reason: 'too-much-unknown', unknownShare: 1 });
    expect(none.unknown).to.deep.equal(['Bentonite', 'Gerstley Borate']);
    // Zero amounts count for nothing: not as unknown, and alone they are no amounts.
    const zero = recipe.recipeDrySg([named('Silica', 10), named('Gerstley Borate', 0)]);
    expect(zero).to.include({ sg: 2.65, unknownShare: 0 });
    expect(zero.unknown).to.deep.equal([]);
    expect(recipe.recipeDrySg([named('Silica', 0)])).to.include({ sg: null, reason: 'no-amounts' });
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

  // A region's library: what is sold there, and in the markets it lists too (Japan's lists the US set).
  it("lists in a region's library what is sold there, Japan's the US set too, and general records everywhere", () => {
    const sold = (...region: string[]) => material(region.join(' ') || 'General', [['SiO2', 1]], 0, { region });
    const records = [sold('JP'), sold('US'), sold('EU'), sold('UK', 'AU'), sold()];
    const listed = (region: string) => records.filter((record) => recipe.inRegion(record, region)).map((r) => r.name);
    expect(listed('JP')).to.eql(['JP', 'US', 'General']);
    // The US's lists none of Japan's, and the others only their own.
    expect(listed('US')).to.eql(['US', 'General']);
    expect(listed('EU')).to.eql(['EU', 'General']);
    expect(listed('AU')).to.eql(['UK AU', 'General']);
    // No region: every one. A region no library has, whatever its name, lists the general ones.
    expect(listed('')).to.have.length(records.length);
    expect(listed('toString')).to.eql(['General']);
    // Suggestions follow it.
    expect(recipe.suggestable(sold('US'), { region: 'JP' })).to.equal(true);
    expect(recipe.suggestable(sold('EU'), { region: 'JP' })).to.equal(false);
  });

  it('swaps an old material for one sold in the region first, then one its library lists, then any', () => {
    const old = material('Old Spar', [['SiO2', 1]], 0, {
      status: 'discontinued',
      substitutes: ['Euro Spar', 'American Spar', 'Japanese Spar']
    });
    const euro = material('Euro Spar', [['SiO2', 1]], 0, { region: ['EU'] });
    const american = material('American Spar', [['SiO2', 1]], 0, { region: ['US'] });
    const japanese = material('Japanese Spar', [['SiO2', 1]], 0, { region: ['JP'] });
    const swapIn = (records: MaterialRecord[], region: string) =>
      recipe.modernMaterials([line(old, 40)], (name) => records.find((r) => r.name === name), region).swaps[0]!.to;
    // Japan's own first; with none, the US one its library lists, before the EU's listed first.
    expect(swapIn([old, euro, american, japanese], 'JP')).to.equal('Japanese Spar');
    expect(swapIn([old, euro, american], 'JP')).to.equal('American Spar');
    expect(swapIn([old, euro, american, japanese], 'US')).to.equal('American Spar');
    // Nothing the library lists: the first, as before.
    expect(swapIn([old, euro, japanese], 'UK')).to.equal('Euro Spar');
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

  it('replaces the lead of a batch so small its amounts need more decimals, never rounding the frit away', () => {
    // The base frit always has a flux; only rounding could leave a recipe without one, and its unity formula
    // (unityOf) then has none. A batch of 0.00035 g came to 0 of everything, and Replace lead failed.
    const library = standardData.load('materials') as MaterialRecord[];
    const find = (name: string) => library.find((m) => m.name === name);
    const batch = (scale: number) => [
      line(find('Lead Bisilicate Frit (Potclays 2261)')!, 0.0002 * scale),
      line(KAOLIN, 0.00005 * scale),
      line(SILICA, 0.0001 * scale)
    ];
    const replaced = (lines: MaterialRecord[], mode: 'colour' | 'rebuild') => {
      const [base] = recipe.leadFreeBases(lines, [], find, library, 'UK', 1060, mode);
      const { materials } = recipe.replaceLead(lines, [], find, library, 'UK', {
        base: base!.name,
        celsius: 1060,
        mode
      });
      return { base: base!.name, materials };
    };
    for (const mode of ['colour', 'rebuild'] as const) {
      const { base, materials } = replaced(batch(1), mode);
      expect(Number(materials.find((m) => m.name === base)?.amount), mode).to.be.above(0);
      expect(
        materials.reduce((sum, m) => sum + Number(m.amount), 0),
        mode
      ).to.be.closeTo(0.00035, 0.000005);
      expect(recipe.unityOf(recipe.molesOf(materials)), mode).to.be.an('object');
    }
    // A batch of 0.1 or more is written to 3 decimals, as before.
    const decimals = (amount?: string) => (amount?.split('.')[1] ?? '').length;
    for (const mode of ['colour', 'rebuild'] as const) {
      expect(Math.max(...replaced(batch(1000), mode).materials.map((m) => decimals(m.amount))), mode).to.equal(3);
    }
  });

  it('keeps the colour with a raw clay still sold, a kaolin or ball clay first, else China Clay', () => {
    const library = standardData.load('materials') as MaterialRecord[];
    const find = (name: string) => library.find((m) => m.name === name);
    const named = (name: string, amount: number) => line(find(name)!, amount);
    const BISILICATE = 'Lead Bisilicate Frit (Potclays 2261)';
    /** The clay of the frit and clay, 85 to 15, that keeps the colour, as the bases are ranked and as it is made. */
    const clay = (lines: MaterialRecord[], region: string) => {
      const bases = recipe.leadFreeBases(lines, [], find, library, region, 1060, 'colour');
      expect(bases.length, 'bases').to.be.above(0);
      const { materials } = recipe.replaceLead(lines, [], find, library, region, {
        base: bases[0].name,
        celsius: 1060,
        mode: 'colour'
      });
      expect(materials.map((m) => [m.name, m.amount])).to.deep.equal([
        [bases[0].name, '85'],
        [materials[1].name, '15']
      ]);
      return materials[1].name;
    };
    // Not a calcined clay listed first: by its name, or by its LOI (Molochite is calcined china clay).
    const calcinedFirst = [named(BISILICATE, 70), named('Glomax LL Calcined Kaolin', 5), named('EPK Kaolin', 10)];
    expect(clay([...calcinedFirst, named('Silica', 15)], 'US')).to.equal('EPK Kaolin');
    expect(
      clay([named(BISILICATE, 70), named('Molochite', 5), named('China Clay', 10), named('Silica', 15)], 'UK')
    ).to.equal('China Clay');
    expect(clay([named(BISILICATE, 70), named('Molochite', 15), named('Silica', 15)], 'UK')).to.equal('China Clay');
    expect(recipe.isRawClay(find('Molochite')!)).to.equal(false);
    // Not one no longer made: Albany Slip has been out of production since the late 1980s.
    expect(clay([named('Litharge', 50), named('Albany Slip', 30), named('Silica', 20)], 'US')).to.equal('China Clay');
    // A kaolin or ball clay before another raw clay, though there is less of it; the most of them first.
    expect(
      clay([named('Litharge', 50), named('Redart', 20), named('OM-4 Ball Clay', 5), named('Silica', 25)], 'US')
    ).to.equal('OM-4 Ball Clay');
    expect(
      clay([named('Litharge', 50), named('OM-4 Ball Clay', 5), named('EPK Kaolin', 10), named('Silica', 35)], 'US')
    ).to.equal('EPK Kaolin');
    // A potter's own kaolin, which has no category, is known by its analysis.
    const epk = find('EPK Kaolin')!;
    const myEpk: MaterialRecord = { name: 'My EPK', percentmole: epk.percentmole, loi: epk.loi, fields: epk.fields };
    expect(clay([named('Litharge', 50), line(myEpk, 10), named('Silica', 40)], 'US')).to.equal('My EPK');
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

  it('takes a material by name, and refuses the amounts calculateUMF refuses, as it does', () => {
    // By name from the built-in materials, as calculateUMF finds them.
    const byName = [
      { material: 'Whiting', amount: 20 },
      { material: 'silica', amount: '30' }
    ];
    const worked = recipe.workedCalculation(byName);
    const umf = chemistry.calculateUMF(byName).umf;
    expect(worked.materials.map((m) => m.name)).to.eql(['Whiting', 'Silica']);
    for (const total of worked.oxides) expect(total.unity).to.be.closeTo(umf[total.oxide], 1e-12);
    const codeOf = (run: () => unknown) => {
      try {
        run();
      } catch (error) {
        return (error as { code?: string }).code;
      }
      return undefined;
    };
    expect(codeOf(() => recipe.workedCalculation([{ material: 'Unobtainium', amount: 10 }]))).to.equal(
      'unknown-material'
    );
    // Each amount calculateUMF refuses, refused the same way; a blank one counts as 0, as there.
    for (const amount of ['abc', '-3', -3, '1e1', '0x10', true, NaN, Infinity]) {
      const lines = [
        { material: 'Whiting', amount: amount as unknown as string },
        { material: 'Silica', amount: 30 }
      ];
      expect(
        codeOf(() => recipe.workedCalculation(lines)),
        String(amount)
      ).to.equal('invalid-amount');
      expect(
        codeOf(() => chemistry.calculateUMF(lines)),
        String(amount)
      ).to.equal('invalid-amount');
    }
    const blank = recipe.workedCalculation([
      { material: 'Whiting', amount: 20 },
      { material: 'Silica', amount: '' }
    ]);
    expect(blank.materials.map((m) => m.name)).to.eql(['Whiting']);
  });
});
