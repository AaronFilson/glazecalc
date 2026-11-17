// Cautions past a recommended limit (lib/core/recipe/checks.js) and the limits they read
// (lib/core/recipe/limits.js), on the standard records by id. Asserted on codes, figures and the
// measured fields, never words.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as checks from '../recipe/checks.ts';
import * as limits from '../recipe/limits.ts';
import { boronFor } from '../chemistry/index.ts';
import { CODES } from '../recipe/messages.ts';
import { HOST, IDS, record } from './support.js';

const { pastLimits, sizeNotes, rawClayPercent, isRawClay, rawClayHigh, bariumSeverity } = checks;
const { GLAZECALC_LIMITS: OWN, HESSELBERTH_ROY_LIMITS: HR } = limits;

// Standard records by id, named for the reader.
const DOLOMITE = 'da635f29-076f-4223-8e75-65d4dfa11700'; // Dolomite
const MOLOCHITE = '43347617-270a-4b36-8a36-8f01dd9a7197'; // Molochite (calcined china clay)
const CRYOLITE = 'c4a41952-a161-4c4e-bda0-61a64e2cb271'; // Cryolite (fluorine)
const BORAX = '13193904-f453-4fc7-b88a-f0def3e00828'; // Borax (soluble)
const BORON_FRIT = '9ccbcfc2-4be2-4e03-8ffa-9bd8d188f039'; // Calcium Borate Frit (Potterycrafts P2954)
const LOW_EXPANSION_FRIT = '7f5c512a-3f4f-400f-b192-223a7fa8343b'; // Ferro Frit 3249
const ALKALI_FRIT = '634e5cfa-5a35-4cfb-afd3-095e06d1b8c2'; // Ferro Frit 3110
const CHROME_OXIDE = '951c9362-c7f1-4f54-997b-200b1855e987'; // Chrome oxide (trait chrome)

/** Lines as pastLimits takes them: { material, amount }. */
const lines = (pairs) => pairs.map(([id, amount]) => ({ material: record(id), amount: String(amount) }));
const KAOLIN_10 = lines([[IDS.epk, 10]]);
const clayAndSilica = (clay) =>
  lines([
    [IDS.epk, clay],
    [IDS.silica, 100 - clay]
  ]);
const codes = (caution) => caution.sentences.map((s) => s.code);
const checksOf = (input) => pastLimits(HOST, input).map((c) => c.check);
const find = (input, check) => pastLimits(HOST, input).find((c) => c.check === check);
const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);

/** A record as a potter types it in from a data sheet: its chemistry, no category or traits. */
const own = (id) => {
  const { percentmole, loi, fields } = record(id);
  return { id: 'own-' + id, percentmole, loi, fields };
};

describe('pastLimits: what it says', () => {
  const ALKALINE = { K2O: 0.6, Na2O: 0.1, CaO: 0.3, Al2O3: 0.3, SiO2: 3 };

  test('warns of what is past a limit, as codes with figures', () => {
    const input = {
      lines: lines([
        [IDS.custer, 80],
        [IDS.silica, 20]
      ]),
      unity: ALKALINE,
      celsius: 1222
    };
    const alkali = find(input, 'alkali');
    assert.deepEqual(alkali.sentences[0], { code: 'checks.alkali', params: { alkali: { value: 0.7, places: 2 } } });
    assert.deepEqual(codes(alkali), ['checks.alkali', 'checks.alkaliProbably', 'checks.alkaliFix']);
    // No raw clay at all.
    const clay = find(input, 'clay-low');
    assert.deepEqual(codes(clay), ['checks.clayNone', 'checks.clayLowFix']);
  });

  test('gives each caution as data too: the quantity, its value, the limit, which side is past, how serious', () => {
    const input = {
      lines: lines([
        [IDS.custer, 80],
        [IDS.silica, 20]
      ]),
      unity: ALKALINE,
      celsius: 1222
    };
    const alkali = find(input, 'alkali');
    assert.equal(alkali.severity, 'likely');
    assert.equal(alkali.quantity, 'K2O+Na2O');
    assert.equal(alkali.limit, 0.3);
    assert.equal(alkali.direction, 'above');
    near(alkali.value, 0.7, 1e-9);
    const tends = find({ ...input, unity: { ...ALKALINE, K2O: 0.25 } }, 'alkali');
    assert.equal(tends.severity, 'caution');
    assert.ok(codes(tends).includes('checks.alkaliTends'));
    const clay = find(input, 'clay-low');
    assert.deepEqual([clay.quantity, clay.value, clay.limit, clay.direction], ['raw-clay-percent', 0, 5, 'below']);
  });

  test('every code it says is one of CODES', () => {
    const unity = { K2O: 0.4, Na2O: 0.2, CaO: 0.6, MgO: 0.4, ZnO: 0.1, BaO: 0.5, Al2O3: 0.1, B2O3: 1.2, SiO2: 1 };
    const said = pastLimits(HOST, {
      lines: lines([
        [IDS.whiting, 30],
        [CRYOLITE, 5],
        [BORAX, 5],
        [IDS.epk, 60]
      ]),
      unity,
      celsius: 1000,
      additives: [{ ...record(CHROME_OXIDE), amount: '1' }],
      expansion: { was: 6, now: 7 }
    });
    assert.ok(said.length > 8);
    for (const caution of said) for (const code of codes(caution)) assert.ok(CODES.includes(code), code);
  });

  test("shows a caution's percent with the decimal that agrees with its limit", () => {
    const high = find({ lines: clayAndSilica(20.3), unity: ALKALINE, celsius: 1222 }, 'clay-high');
    assert.deepEqual(high.sentences.find((s) => s.code === 'checks.clayHigh').params.clay, { value: 20.3, places: 1 });
    assert.equal(high.severity, 'caution');
    assert.deepEqual(codes(high), ['checks.clayHigh', 'checks.clayHighTends', 'checks.clayHighFix']);
    const likely = find({ lines: clayAndSilica(30), unity: ALKALINE, celsius: 1222 }, 'clay-high');
    assert.equal(likely.severity, 'likely');
    assert.ok(codes(likely).includes('checks.clayHighProbably'));
  });

  test('says how little clay there is, and how much the old recipe had', () => {
    const low = (clay, oldClay) =>
      find({ lines: clayAndSilica(clay), unity: ALKALINE, celsius: 1222, oldClay }, 'clay-low');
    assert.deepEqual(low(3).sentences[0], { code: 'checks.clayLow', params: { clay: { value: 3, places: 1 } } });
    assert.deepEqual(low(3, 10).sentences[0], {
      code: 'checks.clayLowWas',
      params: { clay: { value: 3, places: 1 }, was: { value: 10, places: 1 } }
    });
    assert.deepEqual(low(0, 10).sentences[0], {
      code: 'checks.clayNoneWas',
      params: { was: { value: 10, places: 1 } }
    });
    // The old recipe had as little: not news.
    assert.equal(low(3, 4), undefined);
    assert.equal(low(5), undefined);
  });
});

describe('pastLimits: what is not news', () => {
  const unity = { K2O: 0.6, Na2O: 0.1, CaO: 0.3, Al2O3: 0.3, SiO2: 3 };

  test('does not warn of what the old recipe already had', () => {
    assert.ok(!checksOf({ lines: KAOLIN_10, unity, old: unity, celsius: 1222 }).includes('alkali'));
    // Nor as much raw clay as it had (to rounding, or a little more); more than that is news.
    const clay = (amount, oldClay) =>
      checksOf({ lines: clayAndSilica(amount), unity, old: unity, oldClay, celsius: 1222 });
    assert.ok(!clay(20.1, 20).includes('clay-high'));
    assert.ok(!clay(30, 28).includes('clay-high'));
    assert.ok(clay(27, 20).includes('clay-high'));
    assert.ok(clay(21, 15).includes('clay-high'));
  });

  test('counts a caution as the old recipe’s only when it raised the same one, as serious or more', () => {
    const glaze = { K2O: 0.15, Na2O: 0.1, CaO: 0.5, B2O3: 0.2, Al2O3: 0.3, SiO2: 3 };
    const severity = (check, oxide, was, now, celsius) => {
      const at = (value) => ({ ...glaze, [oxide]: value, ...(oxide === 'K2O' && { Na2O: 0 }) });
      return find({ lines: KAOLIN_10, unity: at(now), old: at(was), celsius }, check)?.severity;
    };
    // From a caution to likely: low-fire alumina 0.11 to 0.10, mid-fire 0.21 to 0.195 (shown as 0.20).
    assert.equal(severity('alumina-low', 'Al2O3', 0.11, 0.1, 1060), 'likely');
    assert.equal(severity('alumina-low', 'Al2O3', 0.21, 0.195, 1222), 'likely');
    // On the limit, the old recipe had no caution: 0.15 to 0.14 at low fire crosses it.
    assert.equal(severity('alumina-low', 'Al2O3', 0.15, 0.14, 1060), 'caution');
    // The same on the high side: soda and potash, boron, magnesia and barium.
    assert.equal(severity('alkali', 'K2O', 0.38, 0.41, 1222), 'likely');
    assert.equal(severity('alkali', 'K2O', 0.3, 0.32, 1222), 'caution');
    assert.equal(severity('boron-high', 'B2O3', 0.37, 0.4, 1222), 'likely');
    assert.equal(severity('magnesia', 'MgO', 0.28, 0.3, 1060), 'likely');
    assert.equal(severity('barium', 'BaO', 0.38, 0.41, 1222), 'likely');
    assert.equal(severity('barium', 'BaO', 0.1, 0.106, 1222), 'caution');
    // As serious as the old recipe's, and no more than a tenth worse: not news.
    assert.equal(severity('alumina-low', 'Al2O3', 0.12, 0.115, 1060), undefined);
    assert.equal(severity('alumina-low', 'Al2O3', 0.1, 0.095, 1060), undefined);
    assert.equal(severity('alkali', 'K2O', 0.42, 0.44, 1222), undefined);
    assert.equal(severity('boron-high', 'B2O3', 0.35, 0.36, 1222), undefined);
    assert.equal(severity('barium', 'BaO', 0.2, 0.21, 1222), undefined);
    // Nor less serious than it was.
    assert.equal(severity('alumina-low', 'Al2O3', 0.09, 0.12, 1060), undefined);
    assert.equal(severity('alkali', 'K2O', 0.45, 0.39, 1222), undefined);
    // Raw clay the same way: from the caution's 24% to the likely 26% is news, 26% to 27% is not.
    const clay = (amount, oldClay) =>
      find({ lines: clayAndSilica(amount), unity: glaze, old: glaze, oldClay, celsius: 1222 }, 'clay-high')?.severity;
    assert.equal(clay(26, 24), 'likely');
    assert.equal(clay(27, 26), undefined);
    assert.equal(rawClayHigh(26, 24), true);
    assert.equal(rawClayHigh(24.5, 24), false);
    assert.equal(rawClayHigh(21), true);
    assert.equal(rawClayHigh(20), false);
  });

  test('checks a glaze with no alumina at all as low in alumina, but not an empty one', () => {
    const none = { K2O: 0.2, Na2O: 0.1, CaO: 0.7, B2O3: 0.4, Al2O3: 0, SiO2: 3 };
    const low = (u) => find({ lines: KAOLIN_10, unity: u, celsius: 1222 }, 'alumina-low');
    const caution = low(none);
    assert.deepEqual([caution.severity, caution.value, caution.limit, caution.direction], ['likely', 0, 0.25, 'below']);
    assert.deepEqual(codes(caution), ['checks.aluminaLow', 'checks.aluminaLowProbably', 'checks.aluminaLowFix']);
    assert.equal(low({}), undefined);
    assert.ok(!checksOf({ lines: KAOLIN_10, unity: none, old: none, celsius: 1222 }).includes('alumina-low'));
    const thin = { ...none, Al2O3: 0.15 };
    const was = (u) => checksOf({ lines: KAOLIN_10, unity: u, old: thin, celsius: 1222 });
    assert.ok(!was(thin).includes('alumina-low'));
    assert.ok(!was({ ...thin, Al2O3: 0.14 }).includes('alumina-low'));
    assert.ok(was({ ...thin, Al2O3: 0.1 }).includes('alumina-low'));
  });
});

describe('pastLimits: materials', () => {
  const unity = { K2O: 0.2, CaO: 0.8, Al2O3: 0.3, B2O3: 0.6, SiO2: 3 };
  const brief = (input) => pastLimits(HOST, input).map((c) => [c.check, c.severity, c.value]);

  test('finds no material past its share in a recipe with no amounts', () => {
    const lines = (amounts) => [IDS.whiting, IDS.epk].map((id, i) => ({ material: record(id), amount: amounts[i] }));
    assert.deepEqual(brief({ lines: lines([40, 60]), unity, celsius: 1000 }), [
      ['whiting', 'likely', 40],
      ['clay-high', 'likely', 60]
    ]);
    assert.deepEqual(brief({ lines: lines(['', '']), unity, celsius: 1000 }), [['clay-low', 'caution', 0]]);
  });

  test('knows a potter’s own raw clay and whiting, with no category, by their analysis', () => {
    const myEpk = own(IDS.epk);
    const myWhiting = own(IDS.whiting);
    assert.equal(isRawClay(HOST, myEpk), true);
    const run = (clay, flux, [c, f, s]) => {
      const ls = [
        { material: clay, amount: String(c) },
        { material: flux, amount: String(f) },
        { material: record(IDS.silica), amount: String(s) }
      ];
      return {
        clay: rawClayPercent(
          HOST,
          ls.map((l) => ({ ...l.material, amount: l.amount }))
        ),
        checks: brief({ lines: ls, unity, celsius: 1060 })
      };
    };
    for (const amounts of [
      [30, 10, 60],
      [3, 10, 87],
      [15, 12, 73]
    ]) {
      assert.deepEqual(
        run(myEpk, myWhiting, amounts),
        run(record(IDS.epk), record(IDS.whiting), amounts),
        String(amounts)
      );
    }
    const many = run(myEpk, myWhiting, [30, 10, 60]).checks.map((c) => c[0]);
    assert.ok(many.includes('clay-high') && many.includes('whiting'));
    // Calcined clay (no LOI) and wollastonite (calcium, no LOI) are neither.
    assert.equal(isRawClay(HOST, { ...myEpk, loi: 0 }), false);
    // A clay whose LOI is not given is taken as raw.
    assert.equal(isRawClay(HOST, { ...record(IDS.epk), loi: null }), true);
    const wollastonite = { id: 'w', percentmole: 'molecular', loi: 0, fields: record(IDS.whiting).fields };
    assert.ok(
      !run(myEpk, wollastonite, [15, 12, 73])
        .checks.map((c) => c[0])
        .includes('whiting')
    );
    // A record keeps its category: kaolin's analysis filed as something else is not raw clay.
    assert.equal(isRawClay(HOST, { ...myEpk, category: 'feldspar' }), false);
  });

  test('knows calcined clay by its traits or its LOI', () => {
    assert.equal(isRawClay(HOST, record(IDS.epk)), true);
    assert.equal(isRawClay(HOST, record(MOLOCHITE)), false);
    assert.equal(isRawClay(HOST, { ...record(IDS.epk), traits: { calcined: true } }), false);
    // An analysis the chemistry cannot read is nothing.
    assert.equal(isRawClay(HOST, { fields: [{ name: 'Unobtainium', amount: '1' }] }), false);
  });

  test('knows a potter’s own dolomite by its analysis, as raw calcium at low fire', () => {
    const whiting = (material, amount) =>
      pastLimits(HOST, {
        lines: [
          { material, amount: String(amount) },
          { material: record(IDS.silica), amount: String(100 - amount) }
        ],
        unity,
        celsius: 1060
      })
        .filter((c) => c.check === 'whiting')
        .map((c) => [c.severity, c.value]);
    const percent = (loi, oxides) => ({
      id: 'p',
      percentmole: 'percent',
      loi,
      fields: Object.entries(oxides).map(([name, amount]) => ({ name, amount }))
    });
    const local = percent(47, { CaO: 30.4, MgO: 21.7 });
    for (const amount of [3, 8, 20]) {
      assert.deepEqual(whiting(local, amount), whiting(record(DOLOMITE), amount), String(amount));
      assert.deepEqual(whiting(own(DOLOMITE), amount), whiting(record(DOLOMITE), amount), String(amount));
    }
    assert.deepEqual(whiting(local, 20), [['likely', 20]]);
    assert.deepEqual(whiting(local, 8), [['caution', 8]]);
    // Magnesite (MgO alone, LOI 52%) and talc (LOI 5.5%) are not raw calcium.
    assert.deepEqual(whiting(percent(52.2, { MgO: 47.8 }), 20), []);
    assert.deepEqual(whiting(percent(5.5, { SiO2: 61, MgO: 31, CaO: 0.5 }), 20), []);
  });

  test('says raw whiting only at low fire, with its percent', () => {
    const input = (celsius) => ({
      lines: lines([
        [IDS.whiting, 12],
        [IDS.silica, 88]
      ]),
      unity,
      celsius
    });
    const caution = find(input(1060), 'whiting');
    assert.deepEqual(codes(caution), ['checks.whiting', 'checks.whitingProbably', 'checks.whitingFix']);
    assert.deepEqual(caution.sentences[1].params, { percent: { value: 12, places: 1 } });
    assert.equal(find(input(1222), 'whiting'), undefined);
    assert.equal(find(input(undefined), 'whiting'), undefined);
  });

  test('names fluorine and soluble materials by id, and the main frit doing the wrong job', () => {
    const said = pastLimits(HOST, {
      lines: lines([
        [IDS.silica, 60],
        [CRYOLITE, 5],
        [BORAX, 5],
        [IDS.epk, 30]
      ]),
      unity,
      celsius: 1222
    });
    const fluorine = said.find((c) => c.check === 'fluorine');
    assert.equal(fluorine.material, CRYOLITE);
    assert.deepEqual(fluorine.sentences, [{ code: 'checks.fluorine', params: { name: CRYOLITE } }]);
    const soluble = said.find((c) => c.check === 'soluble');
    assert.equal(soluble.material, BORAX);
    assert.deepEqual(soluble.sentences, [{ code: 'checks.soluble', params: { name: BORAX } }]);
    // None for a line with nothing in it.
    assert.ok(
      !checksOf({
        lines: lines([
          [IDS.epk, 30],
          [CRYOLITE, 0]
        ]),
        unity,
        celsius: 1222
      }).includes('fluorine')
    );
    const role = (frit) =>
      find(
        {
          lines: lines([
            [frit, 70],
            [IDS.epk, 30]
          ]),
          unity,
          celsius: 1222
        },
        'frit-role'
      );
    assert.deepEqual(role(BORON_FRIT).sentences, [{ code: 'checks.boronFrit' }]);
    assert.equal(role(BORON_FRIT).severity, 'note');
    assert.equal(role(BORON_FRIT).material, BORON_FRIT);
    assert.deepEqual(role(LOW_EXPANSION_FRIT).sentences, [{ code: 'checks.lowExpansionFrit' }]);
    assert.deepEqual(role(ALKALI_FRIT).sentences, [{ code: 'checks.alkaliFrit' }]);
    assert.equal(role(IDS.frit3134), undefined);
  });

  test('says expansion rising or falling against the old recipe', () => {
    const expansion = (was, now) =>
      pastLimits(HOST, { lines: KAOLIN_10, unity, celsius: 1222, expansion: { was, now } }).find((c) =>
        c.check.startsWith('expansion')
      );
    assert.equal(expansion(6, 6.2), undefined);
    const rises = expansion(6, 6.3);
    assert.deepEqual(
      [rises.check, rises.severity, codes(rises)],
      ['expansion-rises', 'caution', ['checks.expansionRises', 'checks.expansionRisesMay', 'checks.expansionRisesFix']]
    );
    assert.deepEqual(rises.sentences[0].params, { was: { value: 6, places: 2 }, now: { value: 6.3, places: 2 } });
    assert.equal(expansion(6, 6.6).severity, 'likely');
    assert.ok(codes(expansion(6, 6.6)).includes('checks.expansionRisesProbably'));
    assert.equal(expansion(6, 5.5), undefined);
    const falls = expansion(6, 5.4);
    assert.deepEqual(
      [falls.check, falls.severity, codes(falls)],
      ['expansion-falls', 'caution', ['checks.expansionFalls', 'checks.expansionFallsCan', 'checks.expansionFallsTest']]
    );
    assert.equal(expansion(6, 4.9).severity, 'likely');
    assert.ok(codes(expansion(6, 4.9)).includes('checks.expansionFallsProbably'));
    assert.equal(
      pastLimits(HOST, { lines: KAOLIN_10, unity, expansion: { was: null, now: 9 } }).some((c) =>
        c.check.startsWith('expansion')
      ),
      false
    );
  });
});

describe('pastLimits: zinc, barium, boron and magnesia', () => {
  const unity = { K2O: 0.1, Na2O: 0.1, CaO: 0.8, Al2O3: 0.3, B2O3: 0.6, SiO2: 3 };
  const run = (changed, celsius, old, additives) =>
    pastLimits(HOST, { lines: KAOLIN_10, unity: { ...unity, ...changed }, celsius, old, additives });
  const has = (check, ...args) => run(...args).some((c) => c.check === check);

  test('reads zinc at the two decimals shown, and with each colorant', () => {
    assert.equal(has('zinc-low-fire', { ZnO: 0.014 }, 1060), false);
    assert.equal(has('zinc-low-fire', { ZnO: 0.0196 }, 1060), true);
    assert.deepEqual(run({ ZnO: 0.0196 }, 1060).find((c) => c.check === 'zinc-low-fire').sentences, [
      { code: 'checks.zincLowFire', params: { zinc: { value: 0.0196, places: 2 } } }
    ]);
    // Chrome by its oxide in a potter's own, or by its trait.
    const chromeField = [{ id: 'c', amount: '1', fields: [{ name: 'Cr2O3', amount: '1' }] }];
    assert.ok(has('zinc-chrome', { ZnO: 0.0196 }, 1222, undefined, chromeField));
    assert.ok(has('zinc-chrome', { ZnO: 0.05 }, 1222, undefined, [{ id: 'c', amount: '1', traits: { chrome: true } }]));
    assert.ok(has('zinc-chrome', { ZnO: 0.05 }, 1222, undefined, [{ ...record(CHROME_OXIDE), amount: '1' }]));
    // None for a colorant with nothing in it.
    assert.ok(!has('zinc-chrome', { ZnO: 0.05 }, 1222, undefined, [{ ...record(CHROME_OXIDE), amount: '0' }]));
    assert.ok(has('zinc-iron', { ZnO: 0.05 }, 1222, undefined, [{ id: 'i', amount: '2', traits: { iron: true } }]));
    assert.ok(
      has('zinc-iron', { ZnO: 0.05 }, 1222, undefined, [
        { id: 'i', amount: '2', fields: [{ name: 'FeO', amount: '9' }] }
      ])
    );
    assert.ok(has('zinc-copper', { ZnO: 0.05 }, 1222, undefined, [{ id: 'k', amount: '2', traits: { copper: true } }]));
    assert.ok(!has('zinc-low-fire', { ZnO: 0.05 }, 1222));
    // Not news when the old recipe had as much, as shown: its 0.019 is 0.02 too.
    assert.equal(has('zinc-low-fire', { ZnO: 0.02 }, 1060, { ...unity, ZnO: 0.019 }), false);
  });

  test('reads too little boron at low fire by Katz’s rule, as shown, but not for lead or alkaline glazes', () => {
    // Under 0.8 of Katz's 0.49 at cone 04, 0.392: 0.3924 is shown as 0.39.
    assert.equal(has('boron-short', { B2O3: 0.3924 }, 1060), true);
    assert.equal(has('boron-short', { B2O3: 0.396 }, 1060), false);
    const short = run({ B2O3: 0.2 }, 1060).find((c) => c.check === 'boron-short');
    assert.deepEqual(codes(short), ['checks.boronShort', 'checks.boronShortEffects']);
    assert.deepEqual(short.sentences[0].params, {
      boron: { value: 0.2, places: 2 },
      needed: { value: boronFor(1060), places: 2 }
    });
    assert.equal(has('boron-short', { B2O3: 0, PbO: 0.06 }, 1060), false);
    assert.equal(has('boron-short', { B2O3: 0, PbO: 0.05 }, 1060), true);
    assert.equal(has('boron-short', { B2O3: 0, K2O: 0.25, Na2O: 0.2 }, 1060), false);
  });

  test('reads boron blue over 0.5 of boron and calcia and under 0.2 of alumina, as shown', () => {
    const blue = { B2O3: 0.6, Al2O3: 0.18 };
    assert.equal(has('boron-blue', blue), true);
    assert.equal(has('boron-blue', { ...blue, B2O3: 0.5004 }), false);
    assert.equal(has('boron-blue', { ...blue, CaO: 0.5004 }), false);
    assert.equal(has('boron-blue', { ...blue, Al2O3: 0.1996 }), false);
    assert.equal(has('boron-blue', blue, undefined, { ...unity, ...blue, B2O3: 0.5004 }), true);
    assert.equal(has('boron-blue', blue, undefined, { ...unity, ...blue }), false);
    assert.deepEqual(codes(run(blue).find((c) => c.check === 'boron-blue')), [
      'checks.boronBlue',
      'checks.boronBlueFix'
    ]);
  });

  test('says the pink fix for boron blue when a pink stain is among the additives', () => {
    const blue = { B2O3: 0.6, Al2O3: 0.18 };
    const pink = [{ id: 'stain-1', amount: '5', traits: { pink: true } }];
    assert.deepEqual(codes(run(blue, undefined, undefined, pink).find((c) => c.check === 'boron-blue')), [
      'checks.boronBlue',
      'checks.boronBlueFixPink'
    ]);
    // A stain left out (amount 0) is not in the glaze.
    const none = [{ ...pink[0], amount: '0' }];
    assert.deepEqual(codes(run(blue, undefined, undefined, none).find((c) => c.check === 'boron-blue')), [
      'checks.boronBlue',
      'checks.boronBlueFix'
    ]);
  });

  test('reads a thin glaze’s boron by its own likely figure, as shown, in the checks and the table alike', () => {
    const boron = (alumina) => run({ B2O3: 0.9, Al2O3: alumina }, 1060).find((c) => c.check === 'boron-high');
    const row = (alumina) =>
      limits.limitRows({ ...unity, B2O3: 0.9, Al2O3: alumina }, OWN, 'low').find((r) => r.oxide === 'B2O3');
    assert.deepEqual([boron(0.144).severity, row(0.144).likely], ['likely', true]);
    assert.deepEqual([boron(0.1496).severity, row(0.1496).likely], ['caution', false]);
    assert.deepEqual(codes(boron(0.144)), [
      'checks.boronLowFire',
      'checks.boronLowFireProbably',
      'checks.boronLowFireEffects'
    ]);
    assert.ok(codes(boron(0.1496)).includes('checks.boronLowFireTends'));
  });

  test('says magnesia at low fire only', () => {
    const magnesia = (mgO, celsius) => run({ MgO: mgO }, celsius).find((c) => c.check === 'magnesia');
    assert.equal(magnesia(0.1, 1060), undefined);
    assert.equal(magnesia(0.2, 1060).severity, 'caution');
    assert.deepEqual(codes(magnesia(0.2, 1060)), ['checks.magnesia', 'checks.magnesiaTends', 'checks.magnesiaNote']);
    assert.ok(codes(magnesia(0.35, 1060)).includes('checks.magnesiaProbably'));
    assert.equal(magnesia(0.5, 1222), undefined);
    assert.equal(magnesia(0.5, undefined), undefined);
  });

  test('cautions of barium past 0.1, and likely from 0.4, at any firing, as shown', () => {
    const base = { K2O: 0.1, Na2O: 0.1, CaO: 0.5, Al2O3: 0.3, B2O3: 0.2, SiO2: 3 };
    const barium = (baO, celsius, old) =>
      find({ lines: KAOLIN_10, unity: { ...base, BaO: baO }, celsius, old }, 'barium');
    assert.equal(barium(0.1, 1222), undefined);
    assert.equal(barium(0.104, 1222), undefined);
    const past = barium(0.106, 1222);
    assert.deepEqual([past.severity, past.quantity, past.limit, past.direction], ['caution', 'BaO', 0.1, 'above']);
    assert.equal(barium(0.1996, 1222).severity, 'caution');
    assert.equal(barium(0.394, 1060).severity, 'caution');
    assert.equal(barium(0.396, 1060).severity, 'likely');
    assert.equal(barium(0.4, 1060).severity, 'likely');
    assert.equal(barium(0.3).severity, 'caution');
    assert.deepEqual(codes(barium(0.4)), ['checks.barium', 'checks.bariumLikely']);
    assert.deepEqual(codes(barium(0.3)), ['checks.barium', 'checks.bariumTends']);
    assert.deepEqual(barium(0.4).sentences[0].params, { barium: { value: 0.4, places: 2 } });
    assert.equal(barium(0.3, 1222, { ...base, BaO: 0.3 }), undefined);
    assert.deepEqual([0.1, 0.106, 0.394, 0.396].map(bariumSeverity), [null, 'caution', 'caution', 'likely']);
  });
});

describe('pastLimits: limit sets and bands', () => {
  test('checks against a set by its bands: the app’s own reads cone 10 as mid fire', () => {
    assert.equal(limits.LIMIT_SETS[OWN.id], OWN);
    assert.equal(limits.bandOf(OWN, 1060), 'low');
    assert.equal(limits.bandOf(OWN, 1222), 'mid');
    assert.equal(limits.bandOf(OWN, 1300), 'mid');
    assert.equal(limits.bandOf(OWN, undefined), undefined);
    assert.equal(OWN.unity.mid.B2O3.max, limits.CHECK_LIMITS.boronMidFire.caution);
    const banded = {
      id: 'test',
      bands: [{ band: 'low', belowC: 1150 }, { band: 'mid', belowC: 1250 }, { band: 'high' }],
      whenUnknown: 'mid',
      unity: { mid: { 'K2O+Na2O': { max: 0.3 } }, high: { 'K2O+Na2O': { max: 0.5 } } }
    };
    assert.equal(limits.bandOf(banded, 1300), 'high');
    const unity = { K2O: 0.4, CaO: 0.6, Al2O3: 0.4, SiO2: 4 };
    const at = (celsius, limitSet) => checksOf({ lines: KAOLIN_10, unity, celsius, limitSet });
    assert.ok(at(1300).includes('alkali'));
    assert.ok(!at(1300, banded).includes('alkali'));
    assert.ok(at(1222, banded).includes('alkali'));
  });

  test('checks a cone by its band where it is given, and nothing by range in the top band', () => {
    const unity = { K2O: 0.4, Na2O: 0.2, CaO: 0.4, Al2O3: 0.1, B2O3: 0.6, SiO2: 3 };
    const run = (input) => checksOf({ lines: KAOLIN_10, unity, ...input });
    const ranged = ['boron-high', 'alumina-low', 'alkali'];
    for (const limitSet of [HR, OWN]) {
      const high = run({ band: 'high', limitSet });
      assert.ok(high.includes('alkali') && high.includes('alumina-low'), limitSet.id);
      assert.deepEqual(
        run({ band: 'top', limitSet }).filter((c) => ranged.includes(c)),
        [],
        limitSet.id
      );
      assert.deepEqual(
        run({ celsius: 1400, limitSet }).filter((c) => ranged.includes(c)),
        [],
        limitSet.id
      );
      // What does not hang on the firing is still checked: the clay.
      assert.ok(run({ band: 'top', limitSet }).includes('clay-high'), limitSet.id);
    }
    // The band wins over a temperature: SK 8 is mid fire though JIS says 1250 °C.
    assert.ok(run({ band: 'mid', celsius: 1250, limitSet: HR }).includes('boron-high'));
    // A low band with no temperature skips Katz's "too little boron", which needs one.
    const lean = { ...unity, K2O: 0.2, Na2O: 0.1, B2O3: 0 };
    assert.ok(!checksOf({ lines: KAOLIN_10, unity: lean, band: 'low' }).includes('boron-short'));
    assert.ok(checksOf({ lines: KAOLIN_10, unity: lean, celsius: 1060 }).includes('boron-short'));
    // A firing of null (or NaN) is not known, not 0 °C: the same as none.
    for (const celsius of [null, NaN, Infinity]) {
      assert.deepEqual(
        pastLimits(HOST, { lines: KAOLIN_10, unity: lean, celsius }),
        pastLimits(HOST, { lines: KAOLIN_10, unity: lean }),
        String(celsius)
      );
      assert.equal(limits.bandOf(OWN, celsius), undefined, String(celsius));
    }
  });

  test('only cautions with Hesselberth & Roy’s set, which gives no figure for a likely fault', () => {
    const unity = { K2O: 0.2, Na2O: 0.11, CaO: 0.6, B2O3: 0.2, Al2O3: 0.24, SiO2: 3 };
    const said = pastLimits(HOST, { lines: KAOLIN_10, unity, celsius: 1222, limitSet: HR });
    const of = (check) => said.find((c) => c.check === check);
    assert.equal(of('alkali').severity, 'caution');
    assert.ok(codes(of('alkali')).includes('checks.alkaliTends'));
    assert.equal(of('alumina-low').severity, 'caution');
    assert.ok(codes(of('alumina-low')).includes('checks.aluminaLowTends'));
    assert.deepEqual(
      limits
        .limitRows(unity, HR, 'mid')
        .filter((r) => r.past)
        .map((r) => [r.oxide, r.likely]),
      [
        ['K2O+Na2O', false],
        ['Al2O3', false]
      ]
    );
  });

  test('words boron by the band whose figures are used, and a set’s own figure as the set’s', () => {
    const unity = { K2O: 0.15, Na2O: 0.1, CaO: 0.75, Al2O3: 0.3, B2O3: 0.4, SiO2: 3 };
    const boron = (input) => find({ lines: KAOLIN_10, unity, ...input }, 'boron-high').sentences[0];
    // The firing unknown, Hesselberth & Roy's cone 6 figures are used: the set's own words.
    assert.deepEqual(boron({ limitSet: HR }), {
      code: 'checks.boronMidFireSet',
      params: { boron: { value: 0.4, places: 2 }, high: { value: 0.35, places: 2 } }
    });
    assert.equal(boron({ celsius: 1222, limitSet: HR }).code, 'checks.boronMidFireSet');
    // The app's own set keeps its sentence at cone 6, and low fire's words with the firing unknown.
    assert.deepEqual(boron({ celsius: 1222 }), {
      code: 'checks.boronMidFire',
      params: { boron: { value: 0.4, places: 2 }, high: { value: 0.33, places: 2 } }
    });
    const lowFire = find({ lines: KAOLIN_10, unity: { ...unity, B2O3: 0.9 } }, 'boron-high');
    assert.equal(lowFire.sentences[0].code, 'checks.boronLowFire');
    // Cone 10 in a set's high band.
    const tenth = { K2O: 0.2, CaO: 0.8, Al2O3: 0.4, B2O3: 0.45, SiO2: 4 };
    const at = (celsius) => find({ lines: KAOLIN_10, unity: tenth, celsius, limitSet: HR }, 'boron-high').sentences;
    assert.deepEqual(at(1300)[0], {
      code: 'checks.boronHighFire',
      params: { boron: { value: 0.45, places: 2 }, high: { value: 0.3, places: 2 } }
    });
    assert.deepEqual(
      at(1300).map((s) => s.code),
      ['checks.boronHighFire', 'checks.boronMidFireTends', 'checks.boronMidFireFix']
    );
    assert.equal(at(1222)[0].code, 'checks.boronMidFireSet');
  });

  test('says alumina too high for its silica, and at low fire says so too', () => {
    const matte = { K2O: 0.2, CaO: 0.8, Al2O3: 0.6, B2O3: 0.2, SiO2: 2.4 };
    const high = (celsius, old) => find({ lines: KAOLIN_10, unity: matte, celsius, old }, 'alumina-high');
    assert.deepEqual(codes(high(1222)), ['checks.aluminaHigh', 'checks.aluminaHighEffects', 'checks.aluminaHighFix']);
    assert.deepEqual(high(1222).sentences[0].params, { ratio: { value: 4, places: 2 } });
    assert.equal(high(1222).quantity, 'SiO2:Al2O3');
    assert.ok(codes(high(1060)).includes('checks.aluminaHighLowFire'));
    assert.equal(high(1222, matte), undefined);
  });
});

describe('sizeNotes', () => {
  test('notes many materials, one fewer at low fire', () => {
    const seven = lines([
      [IDS.silica, 20],
      [IDS.talc, 10],
      [IDS.whiting, 10],
      [IDS.zinc, 10],
      [IDS.custer, 20],
      [IDS.epk, 20],
      [IDS.frit3134, 10]
    ]);
    assert.deepEqual(sizeNotes(HOST, seven), []);
    const low = sizeNotes(HOST, seven, true);
    assert.equal(low.length, 1);
    assert.equal(low[0].check, 'many-materials');
    assert.equal(low[0].severity, 'note');
    assert.deepEqual(low[0].sentences, [{ code: 'checks.manyMaterials', params: { count: 7 } }]);
    const eight = [...seven, ...lines([[IDS.gerstley, 10]])];
    assert.equal(sizeNotes(HOST, eight)[0].check, 'many-materials');
  });

  test('notes an amount too small to weigh in a test batch, by id', () => {
    const notes = sizeNotes(
      HOST,
      lines([
        [IDS.silica, 99.5],
        [IDS.zinc, 0.5],
        [IDS.talc, 0]
      ])
    );
    assert.equal(notes.length, 1);
    assert.equal(notes[0].check, 'small-amount');
    assert.equal(notes[0].material, IDS.zinc);
    assert.deepEqual(notes[0].sentences, [
      {
        code: 'checks.smallAmount',
        params: { name: IDS.zinc, percent: { value: 0.5, places: 2 }, reads: { value: 0.1, places: 1 } }
      }
    ]);
  });
});

describe('rawClayPercent', () => {
  test('is raw clay as a percent of the batch, none for no batch', () => {
    const recipeLines = [
      { ...record(IDS.epk), amount: '25' },
      { ...record(MOLOCHITE), amount: '25' },
      { ...record(IDS.silica), amount: '50' }
    ];
    assert.equal(rawClayPercent(HOST, recipeLines), 25);
    assert.equal(rawClayPercent(HOST, []), 0);
  });
});

describe('limits', () => {
  test('keeps the figures the checks warn at as data', () => {
    assert.equal(limits.CHECK_LIMITS.boronMidFire.caution, 0.33);
    assert.deepEqual(limits.CHECK_LIMITS.barium, { caution: 0.1, likely: 0.4 });
    assert.equal(limits.FIRING.lowFireBelow, 1150);
    assert.equal(limits.FIRING.topFrom, 1320);
    assert.deepEqual(limits.FIRING_BANDS, ['low', 'mid', 'high', 'top']);
  });

  test('has Hesselberth & Roy’s limits as published, the default, applying at cone 6 and cone 10 only', () => {
    assert.equal(limits.DEFAULT_LIMIT_SET, HR.id);
    assert.equal(limits.LIMIT_SETS[HR.id], HR);
    assert.equal(limits.LIMIT_SETS.glazecalc, OWN);
    assert.deepEqual(HR.unity.mid, {
      'K2O+Na2O': { min: 0.1, max: 0.3 },
      CaO: { min: 0.2, max: 0.6 },
      MgO: { min: 0, max: 0.3 },
      ZnO: { min: 0, max: 0.2 },
      SrO: { min: 0, max: 0.2 },
      Al2O3: { min: 0.25, max: 0.4 },
      B2O3: { min: 0.15, max: 0.35 },
      SiO2: { min: 2.5, max: 4 }
    });
    assert.deepEqual(HR.unity.high, {
      'K2O+Na2O': { min: 0.1, max: 0.3 },
      CaO: { min: 0.3, max: 0.7 },
      MgO: { min: 0, max: 0.4 },
      SrO: { min: 0, max: 0.3 },
      Al2O3: { min: 0.3, max: 0.6 },
      B2O3: { min: 0, max: 0.3 },
      SiO2: { min: 3, max: 5 }
    });
    assert.deepEqual(
      [1060, 1222, 1240, 1300].map((c) => limits.bandOf(HR, c)),
      ['low', 'mid', 'mid', 'high']
    );
    assert.equal(limits.unityFor(HR, 'low'), null);
    assert.equal(limits.limitRows({ SiO2: 3 }, HR, 'low'), null);
    assert.equal(limits.unityFor(OWN, 'high'), OWN.unity.mid);
  });

  test('has no figures from cone 12 up (1320 °C), in either set', () => {
    for (const set of [HR, OWN]) {
      assert.notEqual(limits.bandOf(set, 1319), 'top', set.id);
      assert.equal(limits.bandOf(set, 1320), 'top', set.id);
      assert.equal(limits.bandOf(set, 1450), 'top', set.id);
      assert.equal(limits.unityFor(set, 'top'), null, set.id);
      assert.equal(limits.limitRows({ SiO2: 6, Al2O3: 0.8 }, set, 'top'), null, set.id);
      assert.equal('top' in set.unity, false, set.id);
    }
    assert.equal(limits.bandIn(HR, 'high'), 'high');
    assert.equal(limits.bandIn(OWN, 'high'), 'mid');
    assert.equal(limits.bandIn(OWN, 'top'), 'top');
    assert.equal(limits.bandIn(OWN, 'low'), 'low');
  });

  test('gives a row per limit, with the sums added up and the side a value is past', () => {
    const unity = { K2O: 0.2, Na2O: 0.15, CaO: 0.65, Al2O3: 0.3, B2O3: 0.1, SiO2: 3.2 };
    const rows = limits.limitRows(unity, HR, 'mid');
    const row = (oxide) => rows.find((r) => r.oxide === oxide);
    assert.deepEqual([row('K2O+Na2O').past, row('K2O+Na2O').likely, row('K2O+Na2O').max], ['above', false, 0.3]);
    near(row('K2O+Na2O').value, 0.35, 1e-9);
    assert.equal(row('CaO').past, 'above');
    assert.deepEqual([row('B2O3').past, row('B2O3').min], ['below', 0.15]);
    assert.equal(row('Al2O3').past, null);
    assert.deepEqual([row('ZnO').value, row('ZnO').past], [0, null]);
    const mine = limits.limitRows({ ...unity, Al2O3: 0.15 }, OWN, 'mid').find((r) => r.oxide === 'Al2O3');
    assert.deepEqual([mine.past, mine.likely], ['below', true]);
  });

  test('counts a value at a bound as within it, in the table and the checks alike', () => {
    const sound = { K2O: 0.2, CaO: 0.8, Al2O3: 0.3, SiO2: 3 };
    const row = (u) => limits.limitRows(u, OWN, 'low').find((r) => r.oxide === 'B2O3');
    const boronHigh = (u) => checksOf({ lines: KAOLIN_10, unity: u, celsius: 1060 }).includes('boron-high');
    assert.equal(row({ ...sound, B2O3: 0.8 }).past, null);
    assert.equal(boronHigh({ ...sound, B2O3: 0.8 }), false);
    assert.deepEqual([row({ ...sound, B2O3: 0.81 }).past, row({ ...sound, B2O3: 0.81 }).likely], ['above', false]);
    assert.equal(boronHigh({ ...sound, B2O3: 0.81 }), true);
    const thin = row({ ...sound, Al2O3: 0.1, B2O3: 0.81 });
    assert.deepEqual([thin.past, thin.likely], ['above', true]);
  });

  test('compares at the two decimals a value is shown with', () => {
    const unity = { K2O: 0.2, Na2O: 0.1, CaO: 0.6, B2O3: 0.35, Al2O3: 0.2496, SiO2: 2.499 };
    assert.deepEqual(
      limits.limitRows(unity, HR, 'mid').filter((r) => r.past),
      []
    );
    const said = checksOf({ lines: KAOLIN_10, unity, celsius: 1222, limitSet: HR });
    for (const check of ['alkali', 'boron-high', 'alumina-low']) assert.ok(!said.includes(check), check);
    assert.equal(limits.pastSide(0.306, { max: 0.3 }), 'above');
    assert.equal(limits.pastSide(0.304, { max: 0.3 }), null);
    assert.equal(limits.pastSide(2.494, { min: 2.5 }), 'below');
    assert.equal(limits.asShown(0.30000000000000004), 0.3);
    assert.ok(Number.isNaN(limits.asShown(NaN)));
    assert.equal(limits.isLikely(0.5, { max: 0.3 }, 'above'), false);
    assert.equal(limits.isLikely(0.5, { max: 0.3 }, null), false);
    assert.equal(limits.isThin({ Al2O3: 0.3, SiO2: 1.9 }), true);
    assert.equal(limits.isThin({ Al2O3: 0.15, SiO2: 3 }), false);
    // An oxide the unity formula lacks is none of it.
    assert.equal(limits.isThin({ Al2O3: 0.3 }), true);
    assert.equal(limits.isThin({ SiO2: 3 }), true);
  });
});
