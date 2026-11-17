// Replace lead (lib/core/recipe/lead.js, docs/adr/0011) over the standard records, by id. Ported from
// server/test/recipe_tests.ts: the base frit is chosen by its id, and the results name records by id.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as lead from '../recipe/lead.ts';
import { isRawClay } from '../recipe/checks.ts';
import { amountOf, plainAmount } from '../recipe/amounts.ts';
import { molesOf, unityOf } from '../recipe/materials.ts';
import { IDS, MATERIALS, ADDITIVES, record, thrown } from './support.js';

// Standard records not in support.js's IDS, by their uuid in data/materials.ndjson.
const BISILICATE = '2f4cdb59-6c8e-4b19-b513-11df791ccc9a'; // Lead Bisilicate Frit (Potclays 2261)
const CHINA_CLAY = 'c4eeb157-5c2b-4875-90c5-808f75079658'; // China Clay
const MOLOCHITE = '43347617-270a-4b36-8a36-8f01dd9a7197'; // Molochite
const LITHARGE = '917fe201-8324-4036-b117-30d9fe09665a'; // Litharge
const ALBANY = 'edf14a13-7ad2-4299-b654-ee27f87ead6f'; // Albany Slip
const REDART = '99f16124-cd46-404b-9ac0-c1bbad7ab1e2'; // Redart
const OM4 = '1d11721f-d939-4ed6-be30-f9a7645f1a0a'; // OM-4 Ball Clay
const GLOMAX = '1e8b5b5d-2179-4ff8-a87a-ef8a335a70d9'; // Glomax LL Calcined Kaolin

const byId = new Map(MATERIALS.map((r) => [r.id, r]));
const find = (wanted) => byId.get(typeof wanted === 'string' ? wanted : wanted.id);

const material = (id, fields, loi, info = {}) => ({
  id,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount })),
  ...info
});
const KAOLIN = material(
  'kaolin',
  [
    ['Al2O3', 1],
    ['SiO2', 2]
  ],
  13.96,
  { category: 'clay' }
);
const SILICA = material('silica', [['SiO2', 1]], 0, { category: 'silica' });
const line = (m, amount) => ({ ...m, amount: String(amount) });
const named = (id, amount) => line(record(id), amount);

const bisilicate = (scale = 1) => [named(BISILICATE, 70 * scale), line(KAOLIN, 10 * scale), line(SILICA, 20 * scale)];

describe('replaceLead', () => {
  test('rebuilds a lead glaze on a lead-free base frit from the standard library', () => {
    const lines = bisilicate();
    assert.equal(lead.recipeHasLead(lines), true);
    assert.ok(lead.leadIn(lines).percent > 40);
    assert.ok(lead.leadIn(lines).unity > 0);
    const bases = lead.leadFreeBases(lines, [], find, MATERIALS, 'UK', 1060);
    assert.ok(bases.length >= 1 && bases.length <= 3);
    for (const base of bases) assert.ok(byId.has(base.name) && typeof base.boron === 'number');
    const replaced = lead.replaceLead(lines, [], find, MATERIALS, 'UK', {
      base: bases[0].name,
      celsius: 1060,
      mode: 'rebuild'
    });
    assert.equal(lead.recipeHasLead(replaced.materials), false);
    assert.ok(replaced.report.uses.some((use) => use.name === bases[0].name));
    // The lead frit taken out, said as a code with its id.
    assert.ok(replaced.changes.some((c) => c.code === 'pool.changed' && c.params.name === BISILICATE));
    for (const caution of replaced.cautions) {
      assert.equal(typeof caution.check, 'string');
      for (const sentence of caution.sentences ?? []) assert.equal(typeof sentence.code, 'string');
    }
    const total = replaced.materials.reduce((sum, m) => sum + amountOf(m.amount), 0);
    assert.ok(Math.abs(total - 100) < 0.05, String(total));
  });

  test('refuses a base frit that is not in the library, with its id', () => {
    const error = thrown(() =>
      lead.replaceLead(bisilicate(), [], find, MATERIALS, 'UK', { base: 'nope', celsius: 1060, mode: 'rebuild' })
    );
    assert.equal(error.code, 'no-frit');
    assert.deepEqual(error.params, { base: 'nope' });
  });

  test('replaces the lead of a batch so small its amounts need more decimals, never rounding the frit away', () => {
    const replaced = (lines, mode) => {
      const [base] = lead.leadFreeBases(lines, [], find, MATERIALS, 'UK', 1060, mode);
      const { materials } = lead.replaceLead(lines, [], find, MATERIALS, 'UK', {
        base: base.name,
        celsius: 1060,
        mode
      });
      return { base: base.name, materials };
    };
    for (const mode of ['colour', 'rebuild']) {
      const { base, materials } = replaced(bisilicate(0.000005), mode);
      assert.ok(Number(materials.find((m) => m.id === base)?.amount) > 0, mode);
      const total = materials.reduce((sum, m) => sum + Number(m.amount), 0);
      assert.ok(Math.abs(total - 0.0005) < 0.000005, `${mode} ${total}`);
      assert.equal(typeof unityOf(molesOf(materials)), 'object');
    }
    const decimals = (amount) => (amount?.split('.')[1] ?? '').length;
    for (const mode of ['colour', 'rebuild']) {
      const { materials } = replaced(bisilicate(0.005), mode);
      assert.equal(Math.max(...materials.map((m) => decimals(m.amount))), 3, mode);
    }
  });

  test('writes the amounts of a batch under a millionth plainly, so they read back and the frit is there', () => {
    const lines = [
      { ...record(BISILICATE), amount: plainAmount(0.0000002) },
      { ...KAOLIN, amount: plainAmount(0.00000005) },
      { ...SILICA, amount: plainAmount(0.0000001) }
    ];
    for (const mode of ['colour', 'rebuild']) {
      const [base] = lead.leadFreeBases(lines, [], find, MATERIALS, 'UK', 1060, mode);
      const { materials } = lead.replaceLead(lines, [], find, MATERIALS, 'UK', {
        base: base.name,
        celsius: 1060,
        mode
      });
      for (const m of materials) assert.match(m.amount, /^0\.0{6}\d+$/, `${mode}: ${m.id}`);
      assert.ok(amountOf(materials.find((m) => m.id === base.name)?.amount) > 0, mode);
      const total = materials.reduce((sum, m) => sum + amountOf(m.amount), 0);
      assert.ok(Math.abs(total - 0.00000035) < 0.000000005, `${mode} ${total}`);
    }
  });

  test('keeps the colour with a raw clay still sold, a kaolin or ball clay first, else China Clay', () => {
    const clay = (lines, region) => {
      const bases = lead.leadFreeBases(lines, [], find, MATERIALS, region, 1060, 'colour');
      assert.ok(bases.length > 0, 'bases');
      const { materials, changes, report } = lead.replaceLead(lines, [], find, MATERIALS, region, {
        base: bases[0].name,
        celsius: 1060,
        mode: 'colour'
      });
      assert.equal(report, null);
      assert.deepEqual(
        materials.map((m) => [m.id, m.amount]),
        [
          [bases[0].name, '85'],
          [materials[1].id, '15']
        ]
      );
      assert.ok(changes.length >= 2);
      return materials[1].id;
    };
    // Not a calcined clay listed first: by its traits, or by its LOI (Molochite is calcined china clay).
    assert.equal(
      clay([named(BISILICATE, 70), named(GLOMAX, 5), named(IDS.epk, 10), named(IDS.silica, 15)], 'US'),
      IDS.epk
    );
    assert.equal(
      clay([named(BISILICATE, 70), named(MOLOCHITE, 5), named(CHINA_CLAY, 10), named(IDS.silica, 15)], 'UK'),
      CHINA_CLAY
    );
    assert.equal(clay([named(BISILICATE, 70), named(MOLOCHITE, 15), named(IDS.silica, 15)], 'UK'), CHINA_CLAY);
    assert.equal(isRawClay(record(MOLOCHITE)), false);
    // Not one no longer made.
    assert.equal(clay([named(LITHARGE, 50), named(ALBANY, 30), named(IDS.silica, 20)], 'US'), CHINA_CLAY);
    // A kaolin or ball clay before another raw clay, though there is less of it; the most of them first.
    assert.equal(clay([named(LITHARGE, 50), named(REDART, 20), named(OM4, 5), named(IDS.silica, 25)], 'US'), OM4);
    assert.equal(clay([named(LITHARGE, 50), named(OM4, 5), named(IDS.epk, 10), named(IDS.silica, 35)], 'US'), IDS.epk);
    // A potter's own kaolin, which has no category, is known by its analysis.
    const epk = record(IDS.epk);
    const mine = { id: 'my-epk', percentmole: epk.percentmole, loi: epk.loi, fields: epk.fields };
    assert.equal(clay([named(LITHARGE, 50), line(mine, 10), named(IDS.silica, 40)], 'US'), 'my-epk');
  });

  test('cautions of what changes without lead for the colorants, as codes', () => {
    const colour = (oxide, amount = 2) => ({ ...material('c-' + oxide, [[oxide, 1]], 0), amount: String(amount) });
    const additives = [colour('CuO'), colour('MnO'), colour('Fe2O3'), colour('Cr2O3'), colour('Sb2O3')];
    const lines = bisilicate();
    const [base] = lead.leadFreeBases(lines, additives, find, MATERIALS, 'UK', 1060, 'colour');
    const { cautions } = lead.replaceLead(lines, additives, find, MATERIALS, 'UK', {
      base: base.name,
      celsius: 1060,
      mode: 'colour'
    });
    const checks = cautions.map((c) => c.check);
    for (const check of ['lead-antimony', 'lead-chrome', 'lead-copper', 'lead-manganese', 'lead-iron']) {
      assert.ok(checks.includes(check), check);
    }
    const copper = cautions.find((c) => c.check === 'lead-copper');
    assert.deepEqual(copper.sentences, [{ code: 'lead.copper' }]);
    // The standard additives, rebuilt with chrome on: no zinc offered.
    const chrome = ADDITIVES.find((a) => (a.fields ?? []).some((f) => f.name === 'Cr2O3' && Number(f.amount) > 0));
    if (chrome) {
      const rebuilt = lead.replaceLead(lines, [{ ...chrome, amount: '1' }], find, MATERIALS, 'UK', {
        base: base.name,
        celsius: 1222,
        mode: 'rebuild'
      });
      assert.equal(lead.recipeHasLead(rebuilt.materials), false);
    }
  });

  test('takes what the potter adds to try, leaves out what they avoid, and says when the base does little', () => {
    const lines = bisilicate();
    const [base] = lead.leadFreeBases(lines, [], find, MATERIALS, 'UK', 1060);
    const rebuilt = lead.replaceLead(lines, [], find, MATERIALS, 'UK', {
      base: base.name,
      celsius: 1060,
      mode: 'rebuild',
      tries: [{ material: record(IDS.talc), must: true }],
      avoid: [IDS.whiting],
      uncapped: [IDS.zinc]
    });
    assert.ok(amountOf(rebuilt.materials.find((m) => m.id === IDS.talc)?.amount) > 0);
    assert.equal(
      rebuilt.materials.find((m) => m.id === IDS.whiting),
      undefined
    );
    const little = rebuilt.cautions.find((c) => c.check === 'base-doing-little');
    if (little) {
      assert.equal(little.material, base.name);
      assert.equal(little.sentences[0].code, 'lead.baseDoingLittle');
    }
  });
});

describe('leadIn and bariumIn', () => {
  test('read what can be read, and nothing of a glaze without lead or barium', () => {
    const empty = { id: 'empty', percentmole: 'percent', loi: 0, fields: [{ name: 'Xx2O', amount: '1' }], amount: '5' };
    const plain = [line(SILICA, 50), { ...record(IDS.whiting), amount: '50' }, empty];
    assert.deepEqual(lead.leadIn(plain), { unity: 0, percent: 0 });
    assert.equal(lead.bariumIn(plain), null);
    assert.equal(lead.recipeHasLead(plain), false);
    const barium = (moles) => [
      line(material('ba', [['BaO', 1]], 0), moles),
      line(material('ca', [['CaO', 1]], 0), 1 - moles),
      line(SILICA, 3)
    ];
    // Amounts are grams, so the moles come from each record's weight: read them back from the unity formula.
    const some = lead.bariumIn(barium(0.5));
    assert.ok(some && some.unity > 0.1);
    const likely = lead.bariumIn([line(material('ba', [['BaO', 1]], 0), 10), line(SILICA, 3)]);
    assert.deepEqual(likely, { unity: 1, likely: true });
    assert.equal(lead.bariumIn([line(material('ba', [['BaO', 1]], 0), 0)]), null);
  });
});
