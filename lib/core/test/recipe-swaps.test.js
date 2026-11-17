// Old materials swapped for those that replace them (lib/core/recipe/swaps.js), the amounts suggested
// (suggest.js), what the library says of a material (library.js) and what the recipe tools work out from its
// chemistry (materials.js), by id. Ported from server/test/recipe_tests.ts, substitution_tests.ts and
// solve_tests.ts: `find` looks a record up by its id, or a substitute by the id its record names.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as chemistry from '../chemistry/index.ts';
import { IDS as RESULT_IDS } from '../identity.ts';
import { RecipeError } from '../recipe/messages.ts';
import { amountOf } from '../recipe/amounts.ts';
import { modernMaterials } from '../recipe/swaps.ts';
import { planSuggestion, suggestAmounts } from '../recipe/suggest.ts';
import * as library from '../recipe/library.ts';
import * as materials from '../recipe/materials.ts';
import { IDS, MATERIALS, ADDITIVES, record, linesOf, GLOSSY, thrown } from './support.js';

// Standard records not in support.js's IDS, by their uuid in data/materials.ndjson.
const OXFORD = 'b6434f62-52d1-4192-be59-ab53b4374e48'; // Oxford Spar (discontinued)
const G200 = 'c8c97af3-4d2a-4a62-bda5-7ecb7bd303e2'; // G-200 EU Feldspar
const CALCINED = '8a654512-2fbe-4a65-a079-ea82fa80d38d'; // Calcined Kaolin (theoretical)
const LEPIDOLITE = 'aa6179e2-51e5-41ab-9e48-feb2bc4c8943'; // Lepidolite (discontinued)
const FRIT9146 = 'e94cc5d0-a172-44e9-ae3c-062891c00761'; // Ferro Frit 9146 (zircon white) (discontinued)
const NEPHELINE = '7bb7c679-17b2-4e62-a091-877ac6ed5f85'; // Nepheline Syenite (typical)
const LEAD_FRIT = '2f4cdb59-6c8e-4b19-b513-11df791ccc9a'; // Lead Bisilicate Frit (Potclays 2261)

const byId = new Map([...MATERIALS, ...ADDITIVES].map((r) => [r.id, r]));
/** The library's record for a recipe line, or a substitute by its id. */
const find = (wanted) => byId.get(typeof wanted === 'string' ? wanted : wanted.id);

const material = (id, fields, loi, info = {}) => ({
  id,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount })),
  ...info
});
// A potter's own kaolin, not in the library (EPK is scarce there, and would be swapped too).
const KAOLIN = material(
  'my-kaolin',
  [
    ['Al2O3', 1],
    ['SiO2', 2]
  ],
  13.96,
  { category: 'clay' }
);
const withKaolin = (pairs, kaolin) => [...linesOf(pairs), { ...KAOLIN, amount: String(kaolin) }];

describe('modernMaterials', () => {
  test('swaps a discontinued material one for one, and keeps the ids out of sight', () => {
    const lines = withKaolin(
      [
        [OXFORD, 40],
        [IDS.whiting, 20],
        [IDS.silica, 30]
      ],
      10
    );
    const { materials: modern, swaps, colorants } = modernMaterials(lines, find, 'US');
    assert.equal(swaps.length, 1);
    const [swap] = swaps;
    assert.equal(swap.from, OXFORD);
    assert.equal(swap.status, 'discontinued');
    assert.ok(record(OXFORD).substitutes.includes(swap.to));
    assert.equal(swap.lead, false);
    assert.equal(typeof swap.like, 'boolean');
    assert.deepEqual(swap[RESULT_IDS], { from: OXFORD, to: swap.to });
    assert.ok(!Object.keys(swap).includes(String(RESULT_IDS)));
    assert.deepEqual(colorants, []);
    assert.deepEqual(
      modern.map((m) => [m.id, m.amount]),
      [
        [swap.to, '40'],
        [IDS.whiting, '20'],
        [IDS.silica, '30'],
        ['my-kaolin', '10']
      ]
    );
  });

  test('swaps an old material for one sold in the region first, then one its library lists, then any', () => {
    const old = material('old', [['SiO2', 1]], 0, {
      status: 'discontinued',
      substitutes: ['euro', 'american', 'japanese']
    });
    const euro = material('euro', [['SiO2', 1]], 0, { region: ['EU'] });
    const american = material('american', [['SiO2', 1]], 0, { region: ['US'] });
    const japanese = material('japanese', [['SiO2', 1]], 0, { region: ['JP'] });
    const swapIn = (records, region) =>
      modernMaterials([{ ...old, amount: '40' }], (w) => records.find((r) => r.id === (w.id ?? w)), region).swaps[0].to;
    assert.equal(swapIn([old, euro, american, japanese], 'JP'), 'japanese');
    assert.equal(swapIn([old, euro, american], 'JP'), 'american');
    assert.equal(swapIn([old, euro, american, japanese], 'US'), 'american');
    assert.equal(swapIn([old, euro, japanese], 'UK'), 'euro');
  });

  test('leaves a material with no current substitute, a lead one with lead off, and lists a colorant to move', () => {
    const old = material('old', [['SiO2', 1]], 0, { status: 'historical', statusSince: '1990', substitutes: ['gone'] });
    const gone = material('gone', [['SiO2', 1]], 0, { status: 'discontinued' });
    const leaded = material('old-lead', [['SiO2', 1]], 0, { status: 'discontinued', substitutes: ['lead'] });
    const lead = material('lead', [['PbO', 1]], 0);
    const colour = material('old-colour', [['CoO', 1]], 0, {
      category: 'colorant',
      status: 'discontinued',
      statusSince: '2001',
      substitutes: ['cobalt']
    });
    const records = [old, gone, leaded, lead, colour];
    const look = (w) => records.find((r) => r.id === (w.id ?? w));
    const lines = [old, leaded, colour].map((m) => ({ ...m, amount: '10' }));
    const result = modernMaterials(lines, look, '', {
      allowLead: false,
      findAdditive: (id) => (id === 'cobalt' ? { id: 'cobalt' } : undefined)
    });
    assert.deepEqual(result.swaps, []);
    assert.deepEqual(
      result.materials.map((m) => m.id),
      ['old', 'old-lead', 'old-colour']
    );
    assert.deepEqual(result.colorants, [
      { from: 'old-colour', status: 'discontinued', statusSince: '2001', to: 'cobalt' }
    ]);
    // With lead allowed, the lead one is swapped in and says so.
    const [swap] = modernMaterials([{ ...leaded, amount: '10' }], look).swaps;
    assert.equal(swap.to, 'lead');
    assert.equal(swap.lead, true);
  });

  test('makes one line of two old ones replaced by the same new one, adding their amounts', () => {
    const lines = linesOf([
      [OXFORD, 20],
      [OXFORD, 15.5],
      [IDS.silica, 30]
    ]);
    const { materials: modern, swaps } = modernMaterials(lines, find, 'US');
    assert.equal(swaps.length, 2);
    assert.deepEqual(
      modern.map((m) => [m.id, m.amount]),
      [
        [swaps[0].to, '35.5'],
        [IDS.silica, '30']
      ]
    );
    // An amount that is not a number keeps its own line.
    const odd = modernMaterials(
      [
        { ...record(IDS.silica), amount: 'x' },
        { ...record(IDS.silica), amount: '1' }
      ],
      find
    );
    assert.equal(odd.materials.length, 2);
  });
});

describe('planSuggestion and suggestAmounts', () => {
  const OXFORD_LINES = withKaolin(
    [
      [OXFORD, 40],
      [IDS.whiting, 20],
      [IDS.silica, 30]
    ],
    10
  );

  test('replaces a discontinued material and suggests amounts, over the standard library', () => {
    const plan = planSuggestion(OXFORD_LINES, find, MATERIALS, 'UK');
    assert.equal(plan.swaps.length, 1);
    assert.equal(plan.swaps[0].from, OXFORD);
    assert.equal(plan.swaps[0].status, 'discontinued');
    const suggestion = suggestAmounts(OXFORD_LINES, find, [], 'UK');
    assert.ok(suggestion.materials.some((m) => m.id === plan.swaps[0].to));
    for (const change of suggestion.changes) assert.match(change.code, /^pool\./);
    // It says how near it comes, too.
    assert.ok(['close', 'fair'].includes(suggestion.report.closeness.verdict));
    const oxides = suggestion.report.closeness.oxides.map((o) => o.oxide);
    for (const oxide of ['KNaO', 'Al2O3', 'SiO2']) assert.ok(oxides.includes(oxide), oxide);
    assert.ok(Array.isArray(suggestion.stillShort));
    assert.ok(Array.isArray(suggestion.cautions));
  });

  test('asks what brings back an oxide the swap leaves short, by id, the best few first', () => {
    const lines = linesOf([
      [LEPIDOLITE, 7.62],
      [FRIT9146, 7.85],
      [IDS.silica, 40],
      [IDS.whiting, 20]
    ]);
    const plan = planSuggestion(lines, find, MATERIALS, '');
    assert.ok(plan.shortfalls.length > 0);
    for (const short of plan.shortfalls) {
      assert.ok(short.now < 0.9 * short.was, short.oxide);
      assert.ok(short.from.every((id) => [LEPIDOLITE, FRIT9146].includes(id)));
      assert.ok(short.choices.length > 0 && short.choices.length <= 3);
      for (const choice of short.choices) {
        assert.ok(byId.has(choice.name), choice.name);
        assert.ok(choice.percent >= 3);
      }
    }
  });

  test('stops ranking what could bring a short oxide back once the work is spent', () => {
    const lines = linesOf([
      [LEPIDOLITE, 7.62],
      [FRIT9146, 7.85],
      [IDS.silica, 40],
      [IDS.whiting, 20]
    ]);
    const whole = chemistry.newMeter();
    const full = planSuggestion(lines, find, MATERIALS, '', { meter: whole });
    const meter = chemistry.newMeter(1);
    const plan = planSuggestion(lines, find, MATERIALS, '', { meter });
    assert.equal(meter.cut, true);
    assert.ok(meter.used < whole.used / 4);
    assert.deepEqual(
      plan.shortfalls.map((s) => s.oxide),
      full.shortfalls.map((s) => s.oxide)
    );
    for (const shortfall of plan.shortfalls) assert.ok(shortfall.choices.length > 0);
  });

  test('has nothing to ask of a recipe with nothing to swap', () => {
    const lines = withKaolin(
      [
        [NEPHELINE, 40],
        [IDS.whiting, 20],
        [IDS.silica, 20]
      ],
      20
    );
    const plan = planSuggestion(lines, find, MATERIALS, 'US');
    assert.deepEqual(plan, { swaps: [], shortfalls: [] });
  });

  test('uses a material brought in, and one added to try where it helps', () => {
    const lines = OXFORD_LINES;
    const brought = suggestAmounts(lines, find, [record(NEPHELINE)], 'US', {
      tries: [
        { material: record(IDS.talc), must: false },
        { material: record(NEPHELINE), must: false }
      ]
    });
    assert.ok(amountOf(brought.materials.find((m) => m.id === NEPHELINE)?.amount) > 0);
    const added = brought.changes.filter((c) => c.code === 'pool.added').map((c) => c.params.name);
    assert.ok(added.includes(NEPHELINE));
  });

  test('writes a small batch’s amounts to as many decimals as keep 1% of it', () => {
    const batch = (scale) =>
      linesOf([
        [IDS.custer, 40 * scale],
        [IDS.whiting, 20 * scale],
        [IDS.epk, 20 * scale],
        [IDS.silica, 20 * scale]
      ]);
    const small = suggestAmounts(batch(0.000005), find, [], 'US');
    assert.deepEqual(
      small.materials.map((m) => m.id),
      suggestAmounts(batch(1), find, [], 'US').materials.map((m) => m.id)
    );
    assert.equal(small.materials.length, 4);
    for (const m of small.materials) {
      assert.ok(amountOf(m.amount) >= 0.000005, m.id);
      assert.ok((m.amount.split('.')[1] ?? '').length <= 6, m.id);
    }
  });

  test('refuses a recipe with no flux, and one left with no flux it may use, in codes', () => {
    const slip = linesOf([
      [CALCINED, 50],
      [IDS.silica, 50]
    ]);
    const noRecipeFlux = thrown(() => suggestAmounts(slip, find, [], 'US'));
    assert.ok(noRecipeFlux instanceof RecipeError);
    assert.deepEqual([noRecipeFlux.code, noRecipeFlux.params], ['solve.noFlux', { of: 'recipe' }]);
    // Without the only flux it may use (the report's Leave it out on the spar's replacement, by id).
    const spar = linesOf([
      [IDS.custer, 30],
      [CALCINED, 20],
      [IDS.silica, 50]
    ]);
    const { swaps } = modernMaterials(spar, find, 'US', { allowLead: false });
    const avoid = swaps.length ? swaps.map((s) => s.to) : [IDS.custer];
    const noFlux = thrown(() => suggestAmounts(spar, find, [], 'US', { avoid }));
    assert.ok(noFlux instanceof RecipeError, String(noFlux));
    assert.deepEqual([noFlux.code, noFlux.params], ['solve.noFlux', { of: 'offered' }]);
  });
});

describe('library', () => {
  test("lists in a region's library what is sold there, Japan's the US set too, and general records everywhere", () => {
    const sold = (...region) => material(region.join(' ') || 'general', [['SiO2', 1]], 0, { region });
    const records = [sold('JP'), sold('US'), sold('EU'), sold('UK', 'AU'), sold()];
    const listed = (region) => records.filter((r) => library.inRegion(r, region)).map((r) => r.id);
    assert.deepEqual(listed('JP'), ['JP', 'US', 'general']);
    assert.deepEqual(listed('US'), ['US', 'general']);
    assert.deepEqual(listed('EU'), ['EU', 'general']);
    assert.deepEqual(listed('AU'), ['UK AU', 'general']);
    assert.equal(listed('').length, records.length);
    assert.deepEqual(listed('toString'), ['general']);
    assert.equal(library.suggestable(sold('US'), { region: 'JP' }), true);
    assert.equal(library.suggestable(sold('EU'), { region: 'JP' }), false);
  });

  test('suggests only what is current, sold, not a formula, not soluble or a fluorine source, and lead-free', () => {
    const plain = material('plain', [['SiO2', 1]], 0);
    assert.equal(library.suggestable(plain, {}), true);
    assert.equal(library.suggestable({ ...plain, status: 'discontinued' }, {}), false);
    assert.equal(library.suggestable({ ...plain, soluble: true }, {}), false);
    assert.equal(library.suggestable({ ...plain, fluorine: true }, {}), false);
    const lead = material('lead', [['PbO', 1]], 0);
    assert.equal(library.hasLead(lead), true);
    assert.equal(library.hasLead(plain), false);
    assert.equal(library.hasLead({ id: 'none' }), false);
    assert.equal(library.suggestable(lead, {}), false);
    assert.equal(library.suggestable(lead, { allowLead: true }), true);
    const ideal = { ...plain, category: 'feldspar', source: { kind: 'theoretical' } };
    assert.equal(library.isIdealMineral(ideal), true);
    assert.equal(library.suggestable(ideal, {}), false);
    assert.equal(
      library.isIdealMineral({ ...plain, source: { kind: 'theoretical' }, traits: { theoretical: true } }),
      true
    );
    // Whiting, a pure chemical, is offered as it is.
    assert.equal(library.isIdealMineral({ ...plain, source: { kind: 'theoretical' }, category: 'flux' }), false);
    assert.equal(library.hasLead(record(LEAD_FRIT)), true);
  });
});

describe('materials', () => {
  test('gives an oxide’s weight percent in a raw material, and 0 for one it cannot read', () => {
    const whiting = materials.oxidePercent(record(IDS.whiting), 'CaO');
    assert.ok(Math.abs(whiting - 56.03) < 0.05, String(whiting));
    assert.equal(materials.oxidePercent(record(IDS.whiting), 'K2O'), 0);
    assert.equal(materials.oxidePercent({ id: 'bad', percentmole: 'percent', fields: 'x' }, 'CaO'), 0);
    assert.equal(materials.oxidesPerGram({ id: 'bad', percentmole: 'percent', fields: 'x' }), null);
  });

  test('swaps one for one only what differs by 15 g of oxides per 100 g or less', () => {
    assert.equal(materials.LIKE_FOR_LIKE_GRAMS, 15);
    assert.equal(materials.likeForLike(record(IDS.custer), record(G200)), true);
    assert.equal(materials.likeForLike(record(IDS.whiting), record(IDS.silica)), false);
    assert.equal(materials.gramsApart(record(IDS.silica), record(IDS.silica)), 0);
    const empty = { id: 'empty', percentmole: 'percent', loi: 0, fields: [] };
    assert.equal(materials.gramsApart(empty, record(IDS.silica)), null);
    assert.equal(materials.likeForLike(empty, record(IDS.silica)), false);
  });

  test('knows a frit’s role from its maker or its oxides', () => {
    assert.equal(materials.roleOf({ fritRole: 'base' }), 'base');
    assert.equal(materials.roleOf(record(IDS.silica)), undefined);
    assert.equal(
      materials.roleOf(
        material(
          'pb',
          [
            ['PbO', 1],
            ['SiO2', 2]
          ],
          0,
          { category: 'frit' }
        )
      ),
      'lead'
    );
    const frit = (fields) => ({
      id: 'f',
      percentmole: 'percent',
      loi: 0,
      category: 'frit',
      fields: fields.map(([n, a]) => ({ name: n, amount: a }))
    });
    assert.equal(
      materials.roleOf(
        frit([
          ['Na2O', 15],
          ['SiO2', 85]
        ])
      ),
      'alkali'
    );
    assert.equal(
      materials.roleOf(
        frit([
          ['B2O3', 50],
          ['CaO', 20],
          ['SiO2', 30]
        ])
      ),
      'boron'
    );
    assert.equal(
      materials.roleOf(
        frit([
          ['B2O3', 20],
          ['SiO2', 50],
          ['CaO', 15],
          ['Na2O', 6],
          ['Al2O3', 9]
        ])
      ),
      'base'
    );
    assert.equal(materials.roleOf(frit([['SiO2', 100]])), undefined);
  });

  test('has no unity formula without a flux, as calculateUMF says', () => {
    for (const moles of [{ SiO2: 1, Al2O3: 0.1 }, {}]) {
      assert.equal(thrown(() => materials.unityOf(moles)).code, 'no-flux', JSON.stringify(moles));
    }
    assert.deepEqual(materials.unityOf({ CaO: 0.2, K2O: 0.05, SiO2: 1 }), { CaO: 0.8, K2O: 0.2, SiO2: 4 });
    assert.equal(materials.fluxesOf({ CaO: 0.2, K2O: 0.05, SiO2: 1 }), 0.25);
  });

  test('works out a recipe’s moles and expansion, and null where it cannot', () => {
    const lines = linesOf(GLOSSY);
    const moles = materials.molesOf(lines);
    assert.ok(moles.SiO2 > 0 && moles.CaO > 0);
    const expansion = materials.expansionOf(lines);
    assert.equal(
      expansion,
      chemistry.calculateUMF(lines.map((m) => ({ material: m, amount: amountOf(m.amount) }))).expansion
    );
    assert.equal(materials.expansionOf(linesOf([[IDS.silica, 10]])), null);
  });
});
