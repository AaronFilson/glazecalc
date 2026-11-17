// What the core's chemistry takes in (lib/core/chemistry/materials.js, umf.js, expansion.js): formulas,
// analyses and the stored { fields, percentmole, loi, molecularweight } shape, by id; and the problems and
// warnings it gives for what will not do, as codes and values. Ported from server/test/chemistry_tests.ts
// ('theoretical material analyses', 'UMF calculation', 'app material format', 'invalid input'), without the
// app's names: the theoretical materials it finds by name are records with ids here.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as chemistry from '../chemistry/index.ts';
import { formulaToAnalysis } from '../chemistry/materials.ts';
import { IDS, MATERIALS, ADDITIVES, record, thrown } from './support.js';

const MW = chemistry.MOLAR_MASS;
const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);
const codeOf = (run) => {
  try {
    run();
  } catch (error) {
    return error.code;
  }
  return undefined;
};
const codes = (result) => result.warningCodes.map((w) => w.code);

// The app's theoretical materials (lib/chemistry/materials.js), as records with ids.
const T = {
  potash: { id: 'potash-feldspar', formula: { K2O: 1, Al2O3: 1, SiO2: 6 } },
  kaolin: { id: 'kaolin', formula: { Al2O3: 1, SiO2: 2, H2O: 2 } },
  whiting: { id: 'whiting', formula: { CaO: 1, CO2: 1 } },
  silica: { id: 'silica', formula: { SiO2: 1 } },
  iron: { id: 'red-iron-oxide', formula: { Fe2O3: 1 } },
  cobalt: { id: 'cobalt-carbonate', formula: { CoO: 1, CO2: 1 } },
  copper: { id: 'copper-carbonate', formula: { CuO: 2, H2O: 1, CO2: 1 } }
};
const recipe = (pairs) => pairs.map(([material, amount]) => ({ material, amount }));
const LEACH = () =>
  recipe([
    [T.potash, 40],
    [T.silica, 30],
    [T.whiting, 20],
    [T.kaolin, 10]
  ]);

// Kamado Feldspar (釜戸長石) and China Clay, from data/materials.ndjson.
const KAMADO = '069377b4-2632-42c4-b453-884d6f855dc7';
const CHINA_CLAY = 'c4eeb157-5c2b-4875-90c5-808f75079658';
// Orthoclase, from data/materials.ndjson.
const ORTHOCLASE = '13b27725-61c3-48a5-9750-617053add56b';

describe('theoretical material analyses (formulaToAnalysis)', () => {
  test('potash feldspar (K2O.Al2O3.6SiO2) in weight percents', () => {
    const result = formulaToAnalysis({ K2O: 1, Al2O3: 1, SiO2: 6 });
    near(result.analysis.K2O, 16.92, 0.01);
    near(result.analysis.Al2O3, 18.32, 0.01);
    near(result.analysis.SiO2, 64.76, 0.01);
    assert.equal(result.loi, 0);
  });

  test("whiting's CO2 and kaolin's bound water are loss on ignition", () => {
    const whiting = formulaToAnalysis({ CaO: 1, CO2: 1 });
    near(whiting.analysis.CaO, 56.03, 0.01);
    near(whiting.loi, 43.97, 0.01);
    const kaolin = formulaToAnalysis({ Al2O3: 1, SiO2: 2, H2O: 2 });
    near(kaolin.analysis.Al2O3, 39.5, 0.01);
    near(kaolin.analysis.SiO2, 46.55, 0.01);
    near(kaolin.loi, 13.96, 0.01);
  });

  test('refuses a compound that is neither an oxide nor a volatile, by code', () => {
    const error = thrown(() => formulaToAnalysis({ Xx: 1 }, 'm'));
    assert.equal(error.code, 'unknown-compound');
    assert.deepEqual(error.params, { compound: 'Xx' });
  });
});

describe('calculateUMF', () => {
  test('gives whole-number moles for a formula-weight batch', () => {
    // 1 mol CaCO3 + 3 mol SiO2 fires to CaO.3SiO2
    const result = chemistry.calculateUMF(
      recipe([
        [T.whiting, MW.CaO + 44.009],
        [T.silica, 3 * MW.SiO2]
      ])
    );
    near(result.umf.CaO, 1, 1e-9);
    near(result.umf.SiO2, 3, 1e-9);
    assert.equal(result.siAlRatio, null);
  });

  test('works out a Leach 4321 celadon base', () => {
    const result = chemistry.calculateUMF(LEACH());
    near(result.umf.K2O, 0.2645, 0.0001);
    near(result.umf.CaO, 0.7355, 0.0001);
    near(result.umf.Al2O3, 0.4071, 0.0001);
    near(result.umf.SiO2, 3.7099, 0.0001);
    near(result.siAlRatio, 9.114, 0.001);
    near(result.loi, 10.19, 0.01);
    near(result.groups.R2O + result.groups.RO, 1, 1e-9);
    const total = Object.values(result.analysis).reduce((sum, p) => sum + p, 0);
    near(total, 100, 1e-9);
    near(result.analysis.SiO2, 67.43, 0.01);
  });

  test("works out the expansion as Digitalfire and Glazy do: Leach 4321's 7.49", () => {
    near(chemistry.calculateUMF(LEACH()).expansion, 7.49, 0.005);
    // Weight percent times each oxide's coefficient, on an analysis normalized to 100.
    near(chemistry.expansion({ SiO2: 50, Na2O: 50 }), 50 * 0.035 + 50 * 0.387, 1e-9);
    near(chemistry.expansion({ SiO2: 1, Na2O: 1 }), 50 * 0.035 + 50 * 0.387, 1e-9);
    // A colorant with no coefficient adds nothing but still counts in the total, as in Glazy.
    near(chemistry.expansion({ SiO2: 50, CoO: 50 }), 50 * 0.035, 1e-9);
    assert.equal(chemistry.expansion({}), null);
  });

  test("gives the README's Leach 4321 from the standard records as an independent calculation does", () => {
    const lines = [
      [ORTHOCLASE, 40],
      [IDS.silica, 30],
      [IDS.whiting, 20],
      [CHINA_CLAY, 10]
    ];
    const moles = {};
    for (const [id, grams] of lines) {
      const r = record(id);
      assert.equal(r.percentmole, 'molecular', id);
      const fired = r.fields.reduce((sum, f) => sum + Number(f.amount) * MW[f.name], 0);
      const raw = fired / (1 - r.loi / 100);
      for (const f of r.fields) moles[f.name] = (moles[f.name] ?? 0) + (grams / raw) * Number(f.amount);
    }
    const flux = moles.K2O + moles.CaO;
    const mine = Object.fromEntries(Object.entries(moles).map(([o, m]) => [o, m / flux]));
    const published = { K2O: 0.26448, CaO: 0.73552, Al2O3: 0.40705, SiO2: 3.70983 };
    for (const [oxide, value] of Object.entries(published)) assert.equal(mine[oxide].toFixed(5), String(value), oxide);
    const theirs = chemistry.calculateUMF(lines.map(([id, amount]) => ({ material: record(id), amount })));
    assert.deepEqual(Object.keys(theirs.umf).sort(), Object.keys(mine).sort());
    for (const oxide of Object.keys(mine)) near(theirs.umf[oxide], mine[oxide], 1e-12, oxide);
    near(theirs.siAlRatio, mine.SiO2 / mine.Al2O3, 1e-12);
  });

  test("round-trips Digitalfire's G1214M: its analysis gives its unity formula and expansion, 7.15", () => {
    const analysis = {
      CaO: 14.84,
      K2O: 2.13,
      MgO: 0.09,
      Na2O: 2.78,
      TiO2: 0.31,
      B2O3: 4.79,
      Al2O3: 11.74,
      SiO2: 63.08,
      Fe2O3: 0.23,
      MnO: 0.03
    };
    const published = {
      CaO: 0.79,
      K2O: 0.07,
      MgO: 0.01,
      Na2O: 0.13,
      TiO2: 0.01,
      B2O3: 0.21,
      Al2O3: 0.34,
      SiO2: 3.14,
      Fe2O3: 0.0,
      MnO: 0.0
    };
    const result = chemistry.calculateUMF([{ material: { id: 'g1214m', analysis }, amount: 100 }]);
    assert.deepEqual(Object.keys(result.umf).sort(), Object.keys(published).sort());
    for (const [oxide, value] of Object.entries(published))
      assert.equal(result.umf[oxide].toFixed(2), value.toFixed(2));
    near(result.expansion, 7.149, 0.0005);
    assert.deepEqual(result.warningCodes, []);
  });

  test('does not depend on batch size', () => {
    const small = chemistry.calculateUMF(LEACH());
    const large = chemistry.calculateUMF(LEACH().map((line) => ({ ...line, amount: line.amount * 100 })));
    for (const oxide of Object.keys(small.umf)) near(large.umf[oxide], small.umf[oxide], 1e-9, oxide);
  });

  test('takes analyses entered by hand, with their colorants', () => {
    const spar = {
      id: 'my-feldspar',
      analysis: { SiO2: 68.5, Al2O3: 17.0, K2O: 10.0, Na2O: 3.0, CaO: 0.3, Fe2O3: 0.1 },
      loi: 0.3
    };
    const result = chemistry.calculateUMF(
      recipe([
        [spar, 40],
        [T.silica, 30],
        [T.whiting, 20],
        [T.kaolin, 10],
        [T.iron, 1]
      ])
    );
    const k = (40 * 0.1) / MW.K2O;
    const na = (40 * 0.03) / MW.Na2O;
    const ca = (40 * 0.003) / MW.CaO + 20 / (MW.CaO + 44.009);
    const flux = k + na + ca;
    near(result.umf.K2O, k / flux, 1e-9);
    near(result.umf.Na2O, na / flux, 1e-9);
    near(result.umf.Fe2O3, ((40 * 0.001) / MW.Fe2O3 + 1 / MW.Fe2O3) / flux, 1e-9);
    assert.deepEqual(result.warningCodes, []);
  });

  test('takes a record given directly, with no LOI', () => {
    const result = chemistry.calculateUMF(
      recipe([
        [{ id: 'cao', analysis: { CaO: 100 } }, MW.CaO],
        [T.silica, 2 * MW.SiO2]
      ])
    );
    near(result.umf.SiO2, 2, 1e-9);
    assert.equal(result.loi, 0);
  });

  test('a stored dolomite record and a formula together', () => {
    const result = chemistry.calculateUMF(
      recipe([
        [record('da635f29-076f-4223-8e75-65d4dfa11700'), 20], // Dolomite
        [T.silica, 30]
      ])
    );
    near(result.umf.CaO + result.umf.MgO, 1, 1e-9);
  });

  test('warns, by id, when an analysis does not total about 100%', () => {
    const result = chemistry.calculateUMF([
      { material: { id: 'bad-spar', analysis: { SiO2: 50, K2O: 10 } }, amount: 10 }
    ]);
    assert.deepEqual(result.warningCodes, [{ code: 'analysis-total', params: { material: 'bad-spar', total: 60 } }]);
  });

  test('warns when the fluxes are only traces, as in a slip of clay and silica', () => {
    const slip = chemistry.calculateUMF([
      { material: record(IDS.silica), amount: 60 },
      { material: record(IDS.epk), amount: 40 }
    ]);
    assert.deepEqual(codes(slip), ['trace-flux']);
    const glaze = recipe([
      [T.potash, 25],
      [T.whiting, 10],
      [T.kaolin, 15],
      [T.silica, 50]
    ]);
    assert.deepEqual(codes(chemistry.calculateUMF(glaze)), []);
  });

  test('keeps colorant oxides as fluxes, and warns when they are most of the flux or silica runs past 10', () => {
    const cobalt = chemistry.calculateUMF(
      recipe([
        [T.silica, 70],
        [T.kaolin, 25],
        [T.cobalt, 5]
      ])
    );
    near(cobalt.umf.CoO, 1, 1e-9);
    assert.ok(cobalt.umf.SiO2 > 30);
    assert.deepEqual(codes(cobalt), ['colorant-flux', 'silica-high']);
    assert.deepEqual(cobalt.warningCodes[0].params, { oxides: ['CoO'] });
    near(cobalt.warningCodes[1].params.silica, 32.32, 0.005);
    // Kamado feldspar with 20% kaolin is a Shino at 11.2: still said.
    const shino = chemistry.calculateUMF([
      { material: record(KAMADO), amount: 80 },
      { material: record(CHINA_CLAY), amount: 20 }
    ]);
    near(shino.umf.SiO2, 11.23, 0.01);
    assert.deepEqual(codes(shino), ['silica-high']);
    const of = (pairs) => codes(chemistry.calculateUMF(recipe(pairs)));
    // Most of the flux: 10 g of whiting is 0.0999 mol CaO; cobalt carbonate is 118.9 g a mole.
    const colored = (grams) => [
      [T.whiting, 10],
      [T.cobalt, grams],
      [T.silica, 30],
      [T.kaolin, 10]
    ];
    assert.deepEqual(of(colored(9.7)), []);
    assert.deepEqual(of(colored(14.5)), ['colorant-flux']);
    // Silica past 10: 59 g of silica is 9.8 on 10 g of whiting, 61 g is 10.2.
    assert.deepEqual(
      of([
        [T.whiting, 10],
        [T.silica, 59]
      ]),
      []
    );
    assert.deepEqual(
      of([
        [T.whiting, 10],
        [T.silica, 61]
      ]),
      ['silica-high']
    );
    // Where the flux is only a trace, that is the warning.
    assert.deepEqual(
      of([
        [T.silica, 99.5],
        [T.whiting, 0.5]
      ]),
      ['trace-flux']
    );
    assert.deepEqual(of([...LEACH().map((l) => [l.material, l.amount]), [T.copper, 5]]), []);
  });

  test('finds a reference only through the host lookup', () => {
    assert.equal(
      codeOf(() => chemistry.calculateUMF([{ material: 'ref-1', amount: 1 }])),
      'unknown-material'
    );
    const found = chemistry.calculateUMF([{ material: 'ref-1', amount: 1 }], {
      lookup: (ref) => (ref === 'ref-1' ? chemistry.prepareMaterial(T.whiting) : undefined)
    });
    near(found.umf.CaO, 1, 1e-12);
    // A { reference: amount } map is read the same way.
    const map = chemistry.calculateUMF({ 'ref-1': 5 }, { lookup: () => chemistry.prepareMaterial(T.whiting) });
    near(map.umf.CaO, 1, 1e-12);
  });
});

describe('the stored shape (materialWeights)', () => {
  const dolomite = {
    id: 'dolomite',
    percentmole: 'molecular',
    loi: 47.73,
    fields: [
      { name: 'CaO', amount: '1' },
      { name: 'MgO', amount: '1' }
    ]
  };

  test('works out the equivalent weight of a molecular formula from its LOI', () => {
    const weights = chemistry.materialWeights(dolomite);
    // CaMg(CO3)2 is 184.4 g per formula, which holds 2 moles of flux
    near(weights.equivalent, 92.2, 0.01);
    near(weights.unity.CaO, 0.5, 1e-4);
    near(weights.unity.MgO, 0.5, 1e-4);
    near(weights.firedWeight, (MW.CaO + MW.MgO) / 2, 0.01);
    near(weights.molecularWeight, 184.4, 0.01);
  });

  test('falls back to the molecular weight when no LOI is given', () => {
    const talc = {
      id: 'talc',
      molecularweight: 379.27,
      loi: '',
      fields: [
        { name: 'MgO', amount: '3' },
        { name: 'SiO2', amount: '4' }
      ]
    };
    const weights = chemistry.materialWeights(talc);
    near(weights.loi, 4.75, 0.01);
    near(weights.equivalent, 379.27 / 3, 0.01);
  });

  test('turns a percent analysis into a unity formula, on the raw basis when there is an LOI', () => {
    const spar = chemistry.materialWeights({
      id: 'spar',
      percentmole: 'percent',
      loi: 0,
      fields: [
        { name: 'K2O', amount: '16.92' },
        { name: 'Al2O3', amount: '18.32' },
        { name: 'SiO2', amount: '64.76' }
      ]
    });
    near(spar.unity.Al2O3, 1, 0.001);
    near(spar.unity.SiO2, 6, 0.001);
    near(spar.equivalent, 556.65, 0.1);
    const whiting = chemistry.materialWeights({
      id: 'whiting-analysis',
      percentmole: 'percent',
      loi: 43.97,
      fields: [{ name: 'CaO', amount: '56.03' }]
    });
    near(whiting.equivalent, 100.08, 0.01);
    near(whiting.firedWeight, MW.CaO, 0.01);
    assert.deepEqual(whiting.warningCodes, []);
  });

  test('compares only stored amounts it can read, for oxides the analysis has, with an equivalent it can read', () => {
    const stored = (equivalent, silicaUnity) => ({
      id: 'stored',
      percentmole: 'percent',
      loi: 0,
      equivalent,
      fields: [
        { name: 'SiO2', amount: 100, amountUnity: silicaUnity },
        { name: 'CaO', amount: 0, amountUnity: 0.5 }
      ]
    });
    const codes = (material) => chemistry.materialWeights(material).warningCodes.map((w) => w.code);
    // 9 moles of SiO2 in 150 g is far from the 2.5 the analysis gives.
    assert.deepEqual(codes(stored(150, 9)), ['stored-equivalent']);
    // Not when the figure, or the equivalent, is not a number; and the CaO the analysis lacks is not compared.
    assert.deepEqual(codes(stored(150, 'about 2')), []);
    assert.deepEqual(codes(stored('n/a', 9)), []);
  });

  test('warns when a stored equivalent weight disagrees with the formula, but not over a rounded trace', () => {
    const stored = structuredClone(dolomite);
    stored.equivalent = 184;
    stored.fields.forEach((field) => (field.amountUnity = 0.5));
    assert.deepEqual(chemistry.materialWeights(stored).warningCodes, [
      { code: 'stored-equivalent', params: { material: 'dolomite' } }
    ]);
    // 0.04% Fe2O3 in a whiting, stored to 4 places as 0.0003: 20% off, though the stored weights are right.
    const traced = {
      id: 'traced',
      percentmole: 'percent',
      loi: 43.96,
      fields: [
        { name: 'CaO', amount: '56.00' },
        { name: 'Fe2O3', amount: '0.04' }
      ]
    };
    const weights = chemistry.materialWeights(traced);
    const rounded = {
      ...traced,
      equivalent: weights.equivalent,
      fields: traced.fields.map((field) => ({ ...field, amountUnity: Number(weights.unity[field.name].toFixed(4)) }))
    };
    near(rounded.fields[1].amountUnity / weights.unity.Fe2O3, 1.2, 0.01);
    assert.deepEqual(chemistry.materialWeights(rounded).warningCodes, []);
  });

  test('uses the formula as written for a material with no flux', () => {
    const weights = chemistry.materialWeights({
      id: 'clay',
      loi: 13.96,
      fields: [
        { name: 'Al2O3', amount: '1' },
        { name: 'SiO2', amount: '2' }
      ]
    });
    near(weights.unity.Al2O3, 1, 1e-9);
    near(weights.unity.SiO2, 2, 1e-9);
    near(weights.equivalent, 258.17, 0.01);
    assert.equal(weights.equivalent, weights.molecularWeight);
  });

  test('every standard record with chemistry: its LOI and molecular weight agree', () => {
    for (const r of [...MATERIALS, ...ADDITIVES]) {
      if (!r.fields?.length || r.noChemistry) continue;
      assert.ok(!codes(chemistry.materialWeights(r)).includes('loi-molecular-weight'), r.id);
    }
  });
});

describe('input that will not do', () => {
  const withWhiting = (material) => () =>
    chemistry.calculateUMF([
      { material, amount: 10 },
      { material: T.whiting, amount: 10 }
    ]);

  test('a recipe with no flux, or a shape that is not a recipe', () => {
    assert.equal(
      codeOf(() =>
        chemistry.calculateUMF(
          recipe([
            [T.silica, 60],
            [T.kaolin, 40]
          ])
        )
      ),
      'no-flux'
    );
    assert.equal(
      codeOf(() => chemistry.calculateUMF(42)),
      'recipe-shape'
    );
    assert.equal(
      codeOf(() => chemistry.calculateUMF([{ amount: 5 }])),
      'missing-material'
    );
  });

  test('a misspelled oxide such as Si02, named with the record', () => {
    const error = thrown(() =>
      chemistry.calculateUMF([{ material: { id: 'typo', analysis: { Si02: 100 } }, amount: 1 }])
    );
    assert.equal(error.code, 'unknown-oxide');
    assert.deepEqual(error.params, { oxide: 'Si02', material: 'typo' });
  });

  test('a record with no identity, or no chemistry', () => {
    assert.equal(
      codeOf(() => chemistry.prepareMaterial(null)),
      'no-name'
    );
    assert.equal(
      codeOf(() => chemistry.prepareMaterial({ formula: { SiO2: 1 } })),
      'no-name'
    );
    assert.equal(
      codeOf(() => chemistry.prepareMaterial({ id: '', formula: { SiO2: 1 } })),
      'no-name'
    );
    const error = thrown(() => chemistry.prepareMaterial({ id: 'bare' }));
    assert.equal(error.code, 'no-analysis');
    assert.deepEqual(error.params, { material: 'bare' });
  });

  test('negative, non-numeric or overflowing amounts', () => {
    const line = (amount) => () =>
      chemistry.calculateUMF([
        { material: T.whiting, amount },
        { material: T.silica, amount: 30 }
      ]);
    for (const odd of [-5, 'lots', '1e1', '0x10', true, '12,5', 'Infinity']) {
      assert.equal(codeOf(line(odd)), 'invalid-amount', String(odd));
    }
    const error = thrown(line(-5));
    assert.deepEqual(error.params, { material: 'whiting' });
    assert.equal(
      codeOf(() =>
        chemistry.calculateUMF(
          recipe([
            [T.whiting, 1e308],
            [T.silica, 1e308]
          ])
        )
      ),
      'invalid-amount'
    );
    // A plain decimal as saved, with spaces, reads as the number; blank as nothing.
    const plain = chemistry.calculateUMF(
      recipe([
        [T.whiting, 20],
        [T.silica, 30]
      ])
    ).umf;
    assert.deepEqual(
      chemistry.calculateUMF(
        recipe([
          [T.whiting, ' 20 '],
          [T.silica, '30.0']
        ])
      ).umf,
      plain
    );
    assert.deepEqual(
      chemistry.calculateUMF(
        recipe([
          [T.whiting, 20],
          [T.silica, 30],
          [T.kaolin, '']
        ])
      ).umf,
      plain
    );
  });

  test('formulas and LOIs that would give negative or not-a-number results', () => {
    assert.equal(codeOf(withWhiting({ id: 'odd', formula: { CaO: -1, SiO2: 2 } })), 'invalid-oxide-amount');
    assert.equal(codeOf(withWhiting({ id: 'odd', formula: { CaO: NaN } })), 'invalid-oxide-amount');
    assert.equal(codeOf(withWhiting({ id: 'odd', formula: { CaO: 0 } })), 'no-oxides');
    assert.equal(
      codeOf(() => chemistry.materialWeights({ id: 'water', formula: { H2O: 1 } })),
      'no-oxides'
    );
    assert.equal(codeOf(withWhiting({ id: 'odd', analysis: { CaO: 56 }, loi: 150 })), 'loi-range');
    assert.equal(codeOf(withWhiting({ id: 'odd', analysis: { CaO: 56 }, loi: -50 })), 'loi-range');
    const bad = { id: 'bad', loi: 100, fields: [{ name: 'CaO', amount: '1' }] };
    assert.deepEqual(thrown(() => chemistry.materialWeights(bad)).params, { material: 'bad' });
    assert.equal(
      codeOf(() => chemistry.materialWeights(bad)),
      'loi-range'
    );
    // Stored fields with no oxide amount at all, in moles.
    const none = { id: 'none', fields: [{ name: 'CaO', amount: '0' }] };
    assert.equal(
      codeOf(() => chemistry.materialWeights(none)),
      'no-oxides'
    );
  });

  test('an oxide given twice: each amount checked, in either order', () => {
    const twice = (first, second) => () =>
      chemistry.materialWeights({
        id: 'twice',
        percentmole: 'percent',
        fields: [
          { name: 'CaO', amount: first },
          { name: 'CaO', amount: second }
        ]
      });
    assert.equal(codeOf(twice('abc', '56')), 'invalid-oxide-amount');
    assert.equal(codeOf(twice('56', 'abc')), 'invalid-oxide-amount');
    near(twice('28', '28')().unity.CaO, 1, 1e-9);
  });

  test('oxides in percent or moles, in any case, and nothing else (oxidesGivenIn)', () => {
    const given = (percentmole) => () =>
      chemistry.materialWeights({ id: 'odd', percentmole, fields: [{ name: 'CaO', amount: '56' }] });
    assert.equal(codeOf(given('weight')), 'unknown-percentmole');
    assert.equal(codeOf(given('percent')), undefined);
    assert.equal(codeOf(given('molecular')), undefined);
    assert.deepEqual(given('Percent')(), given('percent')());
    assert.deepEqual(given(' MOLECULAR ')(), given('molecular')());
    assert.deepEqual(given('')(), given('molecular')());
    for (const percentmole of ['percent', 'Percent', ' PERCENT ']) {
      assert.equal(chemistry.oxidesGivenIn({ percentmole }), 'percent', percentmole);
    }
    for (const percentmole of ['molecular', 'Molecular', ' MOLECULAR ', '', null, undefined]) {
      assert.equal(chemistry.oxidesGivenIn({ percentmole }), 'molecular', String(percentmole));
    }
    assert.equal(chemistry.oxidesGivenIn({ percentmole: 'weight' }), null);
    assert.equal(chemistry.oxidesGivenIn({ analysis: { PbO: 100 }, percentmole: 'molecular' }), 'percent');
    assert.equal(chemistry.oxidesGivenIn({ formula: { CaO: 1 }, percentmole: 'percent' }), 'molecular');
  });

  test('an LOI or molecular weight given but not a number, and when the two disagree', () => {
    const whiting = { id: 'my-whiting', percentmole: 'molecular', fields: [{ name: 'CaO', amount: '1' }] };
    const weights = (extra) => chemistry.materialWeights({ ...whiting, ...extra });
    for (const odd of ['43,97', Infinity, NaN, 'abc', true]) {
      assert.equal(
        codeOf(() => weights({ loi: odd })),
        'invalid-loi',
        String(odd)
      );
      assert.equal(
        codeOf(() => weights({ molecularweight: odd })),
        'invalid-molecular-weight',
        String(odd)
      );
    }
    const percent = { percentmole: 'percent', fields: [{ name: 'CaO', amount: '56' }], loi: '43,97' };
    assert.equal(
      codeOf(() => weights(percent)),
      'invalid-loi'
    );
    assert.deepEqual(thrown(() => weights(percent)).params, { material: 'my-whiting' });
    for (const blank of [undefined, null, '', '  ']) assert.equal(weights({ loi: blank }).loi, 0);
    assert.equal(weights({ loi: '43.97' }).loi, 43.97);
    near(weights({ molecularweight: '100.09' }).loi, 43.97, 0.01);
    assert.deepEqual(weights({ loi: 43.6, molecularweight: 100.09 }).warningCodes, []);
    const apart = weights({ loi: 30, molecularweight: 100.09 });
    assert.equal(apart.loi, 30);
    assert.equal(apart.warningCodes.length, 1);
    const [{ code, params }] = apart.warningCodes;
    assert.equal(code, 'loi-molecular-weight');
    assert.equal(params.material, 'my-whiting');
    assert.equal(params.loi, 30);
    near(params.implied, 43.97, 0.01);
    const low = weights({ molecularweight: 50 });
    assert.equal(low.loi, 0);
    assert.deepEqual(codes(low), ['molecular-weight-low']);
    assert.equal(low.warningCodes[0].params.molecularWeight, 50);
    near(low.warningCodes[0].params.firedWeight, MW.CaO, 1e-9);
    assert.deepEqual(codes(weights({ loi: 43.97, molecularweight: 50 })), ['molecular-weight-low']);
    // The fired weight itself (no LOI) is not a slip.
    assert.deepEqual(weights({ molecularweight: 56.08 }).warningCodes, []);
  });
});
