// Replace lead (lib/core/recipe/lead.js, docs/adr/0011) over the standard records, by id. Ported from
// server/test/recipe_tests.ts: the base frit is chosen by its id, and the results name records by id.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as lead from '../recipe/lead.ts';
import { calculateUMF } from '../chemistry/index.ts';
import { isRawClay } from '../recipe/checks.ts';
import { amountOf, plainAmount } from '../recipe/amounts.ts';
import { FIRING } from '../recipe/limits.ts';
import { expansionOf, molesOf, unityOf } from '../recipe/materials.ts';
import { traitsOf } from '../traits.ts';
import { HOST, IDS, MATERIALS, ADDITIVES, GLOSSY, linesOf, record, thrown } from './support.js';

// Standard records not in support.js's IDS, by their uuid in data/materials.ndjson.
const BISILICATE = '2f4cdb59-6c8e-4b19-b513-11df791ccc9a'; // Lead Bisilicate Frit (Potclays 2261)
const CHINA_CLAY = 'c4eeb157-5c2b-4875-90c5-808f75079658'; // China Clay
const MOLOCHITE = '43347617-270a-4b36-8a36-8f01dd9a7197'; // Molochite
const LITHARGE = '917fe201-8324-4036-b117-30d9fe09665a'; // Litharge
const ALBANY = 'edf14a13-7ad2-4299-b654-ee27f87ead6f'; // Albany Slip
const REDART = '99f16124-cd46-404b-9ac0-c1bbad7ab1e2'; // Redart
const OM4 = '1d11721f-d939-4ed6-be30-f9a7645f1a0a'; // OM-4 Ball Clay
const GLOMAX = '1e8b5b5d-2179-4ff8-a87a-ef8a335a70d9'; // Glomax LL Calcined Kaolin
const HIGH_ALKALINE = 'fe7a3d68-f434-47ea-a10b-abe6d83daa61'; // High Alkaline Frit (Bath Potters / CTM)

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
const amountIn = (materials, id) => amountOf(materials.find((m) => m.id === id)?.amount);

/** A line saved with an oxide the chemistry does not know, so it cannot be read. */
const UNREADABLE = {
  id: 'unreadable',
  percentmole: 'percent',
  loi: 0,
  fields: [{ name: 'Xx2O', amount: '1' }],
  amount: '5'
};
/** A chrome colorant known by its traits alone: it lists no oxides. */
const CHROME = { id: 'my-chrome', traits: { chrome: true }, amount: '1' };

/** Rebuilds the recipe on the first base frit offered for it. */
const rebuild = (lines, { region = 'UK', celsius = 1060, additives = [], library = MATERIALS, ...extras } = {}) => {
  const [base] = lead.leadFreeBases(HOST, lines, additives, find, library, region, celsius);
  return lead.replaceLead(HOST, lines, additives, find, library, region, {
    base: base.name,
    celsius,
    mode: 'rebuild',
    ...extras
  });
};

describe('replaceLead', () => {
  test('rebuilds a lead glaze on a lead-free base frit from the standard library', () => {
    const lines = bisilicate();
    assert.equal(lead.recipeHasLead(lines), true);
    assert.ok(lead.leadIn(HOST, lines).percent > 40);
    assert.ok(lead.leadIn(HOST, lines).unity > 0);
    const bases = lead.leadFreeBases(HOST, lines, [], find, MATERIALS, 'UK', 1060);
    assert.ok(bases.length >= 1 && bases.length <= 3);
    for (const base of bases) assert.ok(byId.has(base.name) && typeof base.boron === 'number');
    const replaced = lead.replaceLead(HOST, lines, [], find, MATERIALS, 'UK', {
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
      lead.replaceLead(HOST, bisilicate(), [], find, MATERIALS, 'UK', { base: 'nope', celsius: 1060, mode: 'rebuild' })
    );
    assert.equal(error.code, 'no-frit');
    assert.deepEqual(error.params, { base: 'nope' });
  });

  test('replaces the lead of a batch so small its amounts need more decimals, never rounding the frit away', () => {
    const replaced = (lines, mode) => {
      const [base] = lead.leadFreeBases(HOST, lines, [], find, MATERIALS, 'UK', 1060, mode);
      const { materials } = lead.replaceLead(HOST, lines, [], find, MATERIALS, 'UK', {
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
      assert.equal(typeof unityOf(molesOf(HOST, materials)), 'object');
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
      const [base] = lead.leadFreeBases(HOST, lines, [], find, MATERIALS, 'UK', 1060, mode);
      const { materials } = lead.replaceLead(HOST, lines, [], find, MATERIALS, 'UK', {
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
      const bases = lead.leadFreeBases(HOST, lines, [], find, MATERIALS, region, 1060, 'colour');
      assert.ok(bases.length > 0, 'bases');
      const { materials, changes, report } = lead.replaceLead(HOST, lines, [], find, MATERIALS, region, {
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
    assert.equal(isRawClay(HOST, record(MOLOCHITE)), false);
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

  test('keeps the colour on the base frit alone where the library has no standard clay, if it has alumina enough', () => {
    const library = MATERIALS.filter((m) => !traitsOf(HOST, m).defaultClay);
    const lines = [named(BISILICATE, 80), line(SILICA, 20)];
    assert.equal(lead.clayFor(HOST, lines, library), undefined);
    const bases = (from) =>
      lead.leadFreeBases(HOST, lines, [], find, from, 'UK', 1060, 'colour').map((base) => base.name);
    const alumina = (id) => calculateUMF(HOST, [{ material: record(id), amount: 1 }]).umf.Al2O3;
    const alone = bases(library);
    assert.ok(alone.length > 0);
    for (const id of alone) assert.ok(alumina(id) >= 0.2, id);
    // One that China Clay brings up to enough.
    assert.ok(bases(MATERIALS).some((id) => !alone.includes(id) && alumina(id) < 0.2));
    const { materials } = lead.replaceLead(HOST, lines, [], find, library, 'UK', {
      base: alone[0],
      celsius: 1060,
      mode: 'colour'
    });
    assert.deepEqual(
      materials.map((m) => m.id),
      [alone[0]]
    );
  });

  test("keeps the colour on the bases of lowest expansion first when the old glaze's is unknown", () => {
    // With an alkaline frit the old glaze expands more than any base with the clay, so the nearest are not the lowest.
    const lines = [named(BISILICATE, 50), named(HIGH_ALKALINE, 30), line(KAOLIN, 10), line(SILICA, 10)];
    const clay = lead.clayFor(HOST, lines, MATERIALS);
    const expansion = (id) =>
      calculateUMF(HOST, [
        { material: record(id), amount: 85 },
        { material: clay, amount: 15 }
      ]).expansion;
    const bases = (recipe) =>
      lead.leadFreeBases(HOST, recipe, [], find, MATERIALS, 'UK', 1060, 'colour').map((b) => b.name);
    const was = expansionOf(HOST, lines);
    const away = (id) => Math.abs(expansion(id) - was);
    const nearest = bases(lines);
    assert.deepEqual(
      nearest,
      [...nearest].sort((p, q) => away(p) - away(q))
    );
    const unknown = [...lines, UNREADABLE];
    assert.equal(expansionOf(HOST, unknown), null);
    const lowest = bases(unknown);
    assert.deepEqual(
      lowest,
      [...lowest].sort((p, q) => expansion(p) - expansion(q))
    );
    assert.notDeepEqual(lowest, nearest);
  });

  test('passes over a base frit whose analysis cannot be read', () => {
    const offered = (library) =>
      lead.leadFreeBases(HOST, bisilicate(), [], find, library, 'UK', 1060, 'colour').map((base) => base.name);
    const [best] = offered(MATERIALS);
    const copy = { ...record(best), id: 'copy' };
    assert.ok(offered([...MATERIALS, copy]).includes('copy'));
    // The same frit with an oxide the chemistry does not know: its 85:15 base cannot be worked out.
    const unreadable = { ...copy, fields: [...copy.fields, { name: 'Xx2O', amount: '1' }] };
    assert.deepEqual(offered([...MATERIALS, unreadable]), offered(MATERIALS));
  });

  test('cautions of what changes without lead for the colorants, as codes', () => {
    const colour = (oxide, amount = 2) => ({ ...material('c-' + oxide, [[oxide, 1]], 0), amount: String(amount) });
    const additives = [colour('CuO'), colour('MnO'), colour('Fe2O3'), colour('Cr2O3'), colour('Sb2O3')];
    const lines = bisilicate();
    const [base] = lead.leadFreeBases(HOST, lines, additives, find, MATERIALS, 'UK', 1060, 'colour');
    const { cautions } = lead.replaceLead(HOST, lines, additives, find, MATERIALS, 'UK', {
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
      const rebuilt = lead.replaceLead(HOST, lines, [{ ...chrome, amount: '1' }], find, MATERIALS, 'UK', {
        base: base.name,
        celsius: 1222,
        mode: 'rebuild'
      });
      assert.equal(lead.recipeHasLead(rebuilt.materials), false);
    }
  });

  test('cautions of chrome only where lead was half the fluxes or more, knowing chrome by its traits alone', () => {
    const leadChecks = (lines) => {
      const [base] = lead.leadFreeBases(HOST, lines, [CHROME], find, MATERIALS, 'UK', 1060, 'colour');
      const { cautions } = lead.replaceLead(HOST, lines, [CHROME], find, MATERIALS, 'UK', {
        base: base.name,
        celsius: 1060,
        mode: 'colour'
      });
      return cautions.map((c) => c.check).filter((check) => check.startsWith('lead-'));
    };
    // All its flux was lead; and with no oxides listed, nothing but chrome's.
    assert.deepEqual(leadChecks(bisilicate()), ['lead-chrome']);
    const some = [named(BISILICATE, 10), ...linesOf(GLOSSY)];
    assert.ok(lead.leadIn(HOST, some).unity < 0.5);
    assert.deepEqual(leadChecks(some), []);
    assert.deepEqual(leadChecks(linesOf(GLOSSY)), []);
    // A batch with no flux at all has no share of lead, not 0/0.
    assert.deepEqual(leadChecks([line(KAOLIN, 50), line(SILICA, 50)]), []);
  });

  test('takes what the potter adds to try, leaves out what they avoid, and says when the base does little', () => {
    const lines = bisilicate();
    const [base] = lead.leadFreeBases(HOST, lines, [], find, MATERIALS, 'UK', 1060);
    const rebuilt = lead.replaceLead(HOST, lines, [], find, MATERIALS, 'UK', {
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

  test('brings in zinc oxide from cone 03, where it melts, but not with iron or chrome', () => {
    const zinc = (celsius, additives = []) =>
      amountIn(rebuild(bisilicate(), { celsius, additives }).materials, IDS.zinc);
    assert.equal(zinc(FIRING.zincMeltsFrom - 1), 0);
    assert.ok(zinc(FIRING.zincMeltsFrom) > 0);
    const iron = ADDITIVES.find((a) => traitsOf(HOST, a).iron);
    assert.equal(zinc(FIRING.zincMeltsFrom, [{ ...iron, amount: '2' }]), 0);
    assert.equal(zinc(FIRING.zincMeltsFrom, [CHROME]), 0);
  });

  test('lifts the cap on raw calcium at low fire from a material the potter allows more of', () => {
    const whiting = (replaced) => amountIn(replaced.materials, IDS.whiting);
    const held = rebuild(bisilicate());
    const cap = held.report.capped.find((c) => c.name === IDS.whiting);
    assert.equal(cap.group, 'raw calcium');
    assert.deepEqual(cap.why, { code: 'lead.why.rawCalcium' });
    // Amounts are rounded to a tenth.
    assert.ok(whiting(held) <= cap.most + 0.05, String(whiting(held)));
    const allowed = rebuild(bisilicate(), { uncapped: [IDS.whiting] });
    assert.equal(
      allowed.report.capped.find((c) => c.name === IDS.whiting),
      undefined
    );
    assert.ok(whiting(allowed) > cap.most, String(whiting(allowed)));
  });

  test("keeps the recipe's own whiting as one line, not held to the cap on raw calcium brought in", () => {
    const lines = [named(BISILICATE, 60), named(IDS.whiting, 10), line(KAOLIN, 10), line(SILICA, 20)];
    const { materials, report } = rebuild(lines);
    const whiting = materials.filter((m) => m.id === IDS.whiting);
    assert.equal(whiting.length, 1);
    // Raw calcium brought in at low fire is held to 5% of the batch.
    assert.ok(amountOf(whiting[0].amount) > 5, whiting[0].amount);
    assert.equal(report.capped.filter((c) => c.group === 'raw calcium').length, 0);
  });

  test('brings in wollastonite where it is sold, calcium not held to the cap on raw calcium', () => {
    const { materials, report } = rebuild([named(LITHARGE, 50), line(KAOLIN, 15), line(SILICA, 35)], { region: 'US' });
    const wollastonite = materials.find((m) => traitsOf(HOST, m).wollastonite);
    assert.ok(amountOf(wollastonite?.amount) > 5, wollastonite?.amount);
    assert.equal(
      report.capped.find((c) => c.name === wollastonite.id),
      undefined
    );
  });

  test("adds kaolin to a recipe without raw clay, a tenth of the batch: the region's, else the library's standard one", () => {
    const lines = [named(BISILICATE, 80), line(SILICA, 20)];
    const kaolin = ({ materials, report }) => {
      const clay = materials.find((m) => m.category === 'clay');
      assert.ok(traitsOf(HOST, clay).kaolin, clay.id);
      // A tenth of the batch of 100, as rounded.
      assert.ok(amountOf(clay.amount) >= 10 - 0.05, clay.amount);
      assert.equal(report.uses.find((use) => use.name === clay.id).fixed, true);
      return clay.id;
    };
    assert.ok(record(kaolin(rebuild(lines))).region.includes('UK'));
    // A library whose only kaolin is its standard one, a formula the rebuild never offers otherwise.
    const library = MATERIALS.filter((m) => !traitsOf(HOST, m).kaolin || traitsOf(HOST, m).defaultClay);
    assert.equal(kaolin(rebuild(lines, { library })), CHINA_CLAY);
  });

  test('offers silica to a recipe without any of its own', () => {
    const { materials, report } = rebuild([named(BISILICATE, 85), line(KAOLIN, 15)]);
    assert.ok(amountIn(materials, IDS.silica) > 0);
    assert.equal(report.uses.find((use) => use.name === IDS.silica).fixed, false);
  });
});

describe('leadIn and bariumIn', () => {
  test('read what can be read, and nothing of a glaze without lead or barium', () => {
    const plain = [line(SILICA, 50), { ...record(IDS.whiting), amount: '50' }, UNREADABLE];
    assert.deepEqual(lead.leadIn(HOST, plain), { unity: 0, percent: 0 });
    assert.equal(lead.bariumIn(HOST, plain), null);
    assert.equal(lead.recipeHasLead(plain), false);
    const barium = (moles) => [
      line(material('ba', [['BaO', 1]], 0), moles),
      line(material('ca', [['CaO', 1]], 0), 1 - moles),
      line(SILICA, 3)
    ];
    // Amounts are grams, so the moles come from each record's weight: read them back from the unity formula.
    const some = lead.bariumIn(HOST, barium(0.5));
    assert.ok(some && some.unity > 0.1);
    const likely = lead.bariumIn(HOST, [line(material('ba', [['BaO', 1]], 0), 10), line(SILICA, 3)]);
    assert.deepEqual(likely, { unity: 1, likely: true });
    assert.equal(lead.bariumIn(HOST, [line(material('ba', [['BaO', 1]], 0), 0)]), null);
  });

  test('read nothing, not NaN, of a recipe with no flux or none that can be read', () => {
    assert.deepEqual(lead.leadIn(HOST, [line(SILICA, 50)]), { unity: 0, percent: 0 });
    assert.deepEqual(lead.leadIn(HOST, [UNREADABLE]), { unity: 0, percent: 0 });
    assert.equal(lead.bariumIn(HOST, [UNREADABLE]), null);
  });
});
