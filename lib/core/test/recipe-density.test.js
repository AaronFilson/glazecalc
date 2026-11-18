// Dry specific gravity (lib/core/recipe/density.js): a material's from its traits' mineral, its kind, or a
// frit's oxides by Appen's factors; a recipe's as its weight over the sum of each weight over its SG.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as density from '../recipe/density.ts';
import { HOST, IDS, MATERIALS, ADDITIVES, record, linesOf } from './support.js';

const { materialSg, recipeDrySg, glassDensity } = density;
const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);

// Standard records by id, named for the reader.
const ZIRCON = '74230d74-ba50-4315-b67a-9aecde19c941'; // Zircon
const BONE_ASH = '835e6056-7426-4f08-9cec-16b9101c925b'; // Bone Ash
const COPPER_OXIDE = '3a8e91b0-1ee0-477b-9906-45eb4bda3192'; // Copper oxide
const LITHARGE = '917fe201-8324-4036-b117-30d9fe09665a'; // Litharge
const PEARL_ASH = '173a0a26-4b7b-420d-b54d-30ffdb28b43e'; // Pearl Ash
const COBALT_OXIDE = '7b0be949-d4e3-4c19-879f-78b7ab4b3230'; // Cobalt Oxide
const CERIUM_OXIDE = '6c2fd949-0abc-4229-bb67-5f9ceb7bd8a0'; // Cerium oxide
const FRIT_4064 = 'f8f9783b-a6c5-4616-9398-b9f093b3628d'; // Ferro Frit 4064 (lead bisilicate)
const FRIT_3110 = '634e5cfa-5a35-4cfb-afd3-095e06d1b8c2'; // Ferro Frit 3110
const FLINT_CALCINED = 'f94a492f-dcca-419c-8a58-2e24219cf024'; // Flint (UK calcined)
const BENTONITE = 'acf81c41-eb31-4107-847e-463f4a6bbf91'; // Bentonite

describe('a material’s dry SG', () => {
  test('goes by its mineral, as its traits name it', () => {
    assert.deepEqual(materialSg(HOST, record(IDS.silica)), { sg: 2.65, basis: 'mineral', source: 'quartz' });
    assert.equal(materialSg(HOST, record(IDS.whiting)).sg, 2.71);
    assert.equal(materialSg(HOST, record(ZIRCON)).sg, 4.65);
    // Checked against three sources each (docs/sources/dry-sg-sources.md).
    assert.equal(materialSg(HOST, record(BONE_ASH)).sg, 3.16);
    assert.equal(materialSg(HOST, record(COPPER_OXIDE)).sg, 6.4);
    assert.equal(materialSg(HOST, record(LITHARGE)).sg, 9.35);
    // Crystal-structure densities settle the disagreements: K2CO3 2.435, Co3O4 6.06, CeO2 7.22.
    assert.equal(materialSg(HOST, record(PEARL_ASH)).sg, 2.43);
    assert.equal(materialSg(HOST, record(COBALT_OXIDE)).sg, 6.07);
    assert.equal(materialSg(HOST, record(CERIUM_OXIDE)).sg, 7.22);
  });

  test('goes by its kind: commercial feldspars and clays', () => {
    assert.deepEqual(materialSg(HOST, record(IDS.custer)), { sg: 2.6, basis: 'kind', source: 'feldspar' });
    assert.deepEqual(materialSg(HOST, record(IDS.epk)), { sg: 2.6, basis: 'kind', source: 'clay' });
    // A trait may name a kind too.
    assert.deepEqual(materialSg(HOST, { traits: { density: { mineral: 'clay' } } }), {
      sg: 2.6,
      basis: 'kind',
      source: 'clay'
    });
  });

  test('works out a frit from its oxides by Appen’s factors', () => {
    const lead = materialSg(HOST, record(FRIT_4064));
    assert.equal(lead.basis, 'glass');
    assert.equal(lead.source, 'appen');
    assert.ok(lead.sg >= 4.45 && lead.sg <= 4.7, String(lead.sg));
    const ferro = materialSg(HOST, record(FRIT_3110)).sg;
    assert.ok(ferro >= 2.4 && ferro <= 2.6, String(ferro));
  });

  test('gives no estimate where the crystal, the mixture or the chemistry is unknown, and says why', () => {
    assert.deepEqual(materialSg(HOST, record(FLINT_CALCINED)), {
      sg: null,
      basis: 'none',
      reason: 'crystal-form-unknown'
    });
    assert.equal(materialSg(HOST, record(IDS.gerstley)).reason, 'mixture-unknown');
    assert.equal(materialSg(HOST, record(BENTONITE)).reason, 'swelling-clay');
    // A trait with no mineral and no reason: not classified.
    assert.equal(materialSg(HOST, { traits: { density: { mineral: null } } }).reason, density.WHY_NOT.unknown);
    // A potter's own with no kind: no guess.
    assert.deepEqual(materialSg(HOST, { id: 'creek', fields: [{ name: 'SiO2', amount: '60' }] }), {
      sg: null,
      basis: 'none',
      reason: 'not-classified'
    });
    assert.equal(materialSg(HOST, { noChemistry: true }).reason, 'no-chemistry');
    assert.equal(materialSg(HOST, undefined).reason, 'not-classified');
  });

  test('has no glass estimate for a frit with no oxides to read, and names none outside the factors', () => {
    assert.deepEqual(density.materialSg(HOST, { id: 'frit', category: 'frit' }), {
      sg: null,
      basis: 'none',
      reason: density.WHY_NOT.glassOxides,
      oxides: []
    });
  });

  test('never reads a name: a potter’s own record with no traits goes by its kind or none', () => {
    const { traits, ...bare } = record(IDS.whiting);
    assert.ok(traits);
    assert.equal(materialSg(HOST, { ...bare, name: 'Whiting' }).basis, 'none');
    assert.deepEqual(materialSg(HOST, { name: 'Whiting', category: 'clay' }), {
      sg: 2.6,
      basis: 'kind',
      source: 'clay'
    });
  });

  test('gives every standard record a number or a reason', () => {
    for (const material of [...MATERIALS, ...ADDITIVES]) {
      const estimate = materialSg(HOST, material);
      assert.ok(estimate.sg !== null || Boolean(estimate.reason), material.id);
      if (estimate.sg !== null) assert.ok(estimate.sg > 1 && estimate.sg < 10, material.id);
    }
  });

  test('a frit with more than 1% of an oxide outside Appen’s table has no estimate, and says which', () => {
    const ironFrit = {
      id: 'iron-frit',
      category: 'frit',
      percentmole: 'percent',
      fields: [
        { name: 'SiO2', amount: '60' },
        { name: 'B2O3', amount: '20' },
        { name: 'Na2O', amount: '15' },
        { name: 'Fe2O3', amount: '5' }
      ]
    };
    const estimate = materialSg(HOST, ironFrit);
    assert.equal(estimate.sg, null);
    assert.equal(estimate.reason, 'oxides-not-in-factors');
    assert.ok(estimate.oxides.includes('Fe2O3'));
  });
});

describe('a glass’s density (Appen)', () => {
  test('comes near known glasses', () => {
    // Soda-lime float about 2.50, borosilicate 3.3 about 2.23.
    near(glassDensity(HOST, { SiO2: 72.5, Na2O: 13.5, CaO: 9, MgO: 3.5, Al2O3: 1.5 }).sg, 2.5, 0.03);
    near(glassDensity(HOST, { SiO2: 80.6, B2O3: 12.6, Na2O: 4.2, Al2O3: 2.2 }).sg, 2.23, 0.04);
    // A tile frit with its analysis and density (Barba et al. 2016, frit FCP, 2.654).
    const fcp = { SiO2: 60, Al2O3: 6.5, B2O3: 1.74, CaO: 14.1, MgO: 1.75, Na2O: 0.34, K2O: 4.37, ZnO: 10.6 };
    near(glassDensity(HOST, fcp).sg, 2.654, 0.03);
  });

  test('passes over up to 1% of oxides outside its table, and no more', () => {
    assert.deepEqual(glassDensity(HOST, { SiO2: 90, Fe2O3: 10 }), { sg: null, outside: ['Fe2O3'] });
    const little = glassDensity(HOST, { SiO2: 99.5, Fe2O3: 0.5 });
    assert.ok(little.sg > 2);
    assert.deepEqual(little.outside, ['Fe2O3']);
    assert.equal(glassDensity(HOST, {}).sg, null);
    assert.equal(glassDensity(HOST, { SiO2: 0 }).sg, null);
  });
});

describe('a recipe’s dry SG', () => {
  const lines = linesOf([
    [IDS.custer, 40],
    [IDS.whiting, 20],
    [IDS.epk, 20],
    [IDS.silica, 20]
  ]);

  test('is its weight over the sum of each weight over its SG', () => {
    const sg = recipeDrySg(HOST, lines);
    assert.equal(sg.sg, Math.round((100 / (40 / 2.6 + 20 / 2.71 + 20 / 2.6 + 20 / 2.65)) * 100) / 100);
    assert.equal(sg.basis, 'mixed');
    assert.equal(sg.unknownShare, 0);
    assert.deepEqual(
      sg.parts.map((p) => p.label),
      lines.map((l) => l.id)
    );
    assert.equal(recipeDrySg(HOST, linesOf([[IDS.silica, 10]])).basis, 'mineral');
  });

  test('leaves out a little with no estimate and says which, by id; much is no estimate', () => {
    const some = recipeDrySg(HOST, [...lines, ...linesOf([[BENTONITE, 2]])]);
    assert.equal(some.sg, recipeDrySg(HOST, lines).sg);
    assert.deepEqual(some.unknown, [BENTONITE]);
    const much = recipeDrySg(HOST, [...lines, ...linesOf([[IDS.gerstley, 20]])]);
    assert.equal(much.sg, null);
    assert.equal(much.basis, 'none');
    assert.equal(much.reason, 'too-much-unknown');
  });

  test('takes exactly 5% unknown, in whatever amounts make it up, and not a little more', () => {
    for (const [known, unknown] of [
      [95, 5],
      [19, 1],
      [0.95, 0.05],
      [57, 3]
    ]) {
      const edge = recipeDrySg(
        HOST,
        linesOf([
          [IDS.silica, known],
          [BENTONITE, unknown]
        ])
      );
      assert.equal(edge.sg, 2.65, `${known} + ${unknown}`);
      near(edge.unknownShare, 0.05, 1e-12);
    }
    const over = recipeDrySg(
      HOST,
      linesOf([
        [IDS.silica, 94.9],
        [BENTONITE, 5.1]
      ])
    );
    assert.equal(over.reason, 'too-much-unknown');
  });

  test('has none with every line unknown, or no amounts; a zero amount counts for nothing', () => {
    const none = recipeDrySg(
      HOST,
      linesOf([
        [BENTONITE, 50],
        [IDS.gerstley, 50]
      ])
    );
    assert.equal(none.sg, null);
    assert.equal(none.unknownShare, 1);
    assert.deepEqual(none.unknown, [BENTONITE, IDS.gerstley]);
    const zero = recipeDrySg(
      HOST,
      linesOf([
        [IDS.silica, 10],
        [IDS.gerstley, 0]
      ])
    );
    assert.equal(zero.sg, 2.65);
    assert.equal(zero.unknownShare, 0);
    assert.deepEqual(zero.unknown, []);
    assert.equal(recipeDrySg(HOST, linesOf([[IDS.silica, 0]])).reason, 'no-amounts');
    assert.equal(recipeDrySg(HOST, []).reason, 'no-amounts');
    assert.equal(recipeDrySg(HOST, undefined).reason, 'no-amounts');
  });

  test('reads the densities it is given, and lets up to 5% of a recipe go without', () => {
    assert.equal(density.MOST_UNKNOWN_SHARE, 0.05);
    const host = { ...HOST, densities: { ...HOST.densities, kinds: { feldspar: 3, clay: 3 } } };
    assert.deepEqual(materialSg(host, { category: 'clay' }), { sg: 3, basis: 'kind', source: 'clay' });
  });
});
