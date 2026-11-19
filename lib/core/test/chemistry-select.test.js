// Choosing among many materials (lib/core/chemistry/select.js) and how near a match comes (closeness.js),
// on the standard records by id. Ported from server/test/chemistry_tests.ts ('choosing among many materials').
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as chemistry from '../chemistry/index.ts';
import { WORTH_ADDING } from '../chemistry/select.ts';
import { HOST, IDS, MATERIALS, GLOSSY, record, thrown } from './support.js';

const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);

// Standard records, from lib/catalog/data/materials.ndjson.
const NITER = '7dffc301-0836-4f8b-be6f-e51dfc6ad36a'; // Niter
const CHINA_CLAY = 'c4eeb157-5c2b-4875-90c5-808f75079658'; // China Clay
const FRIT_3110 = '634e5cfa-5a35-4cfb-afd3-095e06d1b8c2'; // Ferro Frit 3110
const FRIT_3124 = '5049fe05-1766-419f-ac8f-5a6408b8898b'; // Ferro Frit 3124
const G200 = 'c8c97af3-4d2a-4a62-bda5-7ecb7bd303e2'; // G-200 EU Feldspar
const MAHAVIR = 'ea14ccfb-8446-4bcd-a7a1-1fdcd350fde1'; // Mahavir Potash Feldspar
const MINSPAR = '582e86c4-f772-4076-8d6d-840985f0f552'; // Minspar 200
const NEPH_A270 = 'cb5e1f52-4092-41f2-baff-9d503aefdb31'; // Nepheline Syenite A270
const NYAD = 'a4955e9d-e8f3-4fe8-bfde-478cdaad34b6'; // Wollastonite (NYAD 400)
const VANSIL = '71ead8e8-6fcd-4617-a7b9-362df0d56a29'; // Wollastonite (Vansil W)
const LITHIUM_CARBONATE = '6a4b728e-9a71-48b2-baa6-4635eb99e86d'; // Lithium Carbonate
const FLUORSPAR = 'd18eb0f6-fcd0-4461-b79a-9fa99de17938'; // Fluorspar
const NEPH_TYPICAL = '7bb7c679-17b2-4e62-a091-877ac6ed5f85'; // Nepheline Syenite (typical)
const CALCINED_KAOLIN = '8a654512-2fbe-4a65-a079-ea82fa80d38d'; // Calcined Kaolin (theoretical)
const FLINT = '62eaa6d6-1827-46ef-bd5e-7326ee27653f'; // Flint
const DOLOMITE = 'da635f29-076f-4223-8e75-65d4dfa11700'; // Dolomite
const POTCLAYS_3426 = '0744cbd7-6801-4cb9-98e2-605cda106233'; // Potash Feldspar (Potclays 3426)
const MM_1233 = '9a270034-c20e-4b5a-8acb-9133df4629a9'; // Mondré & Manz Frit M 1233
const VIBRANTZ_90368 = '3d959317-07c9-4946-8acc-b7e538fadeaf'; // Vibrantz Frit 90368
const RED_LEAD = '9965f3fd-a90f-459f-8ad1-e874fc915e13'; // Lead, Red
const P2960 = '34d9b517-068b-4da6-98cb-c32c88f8a62a'; // Low Expansion Frit (Potterycrafts P2960)
const KAOLIN_233 = 'f1c4b0ed-d351-44b6-be8e-0cbb8d03db17'; // Kaolin 233 (Carl Jäger)
const F2 = '653bed12-45a0-4c70-8777-a4099fb809a8'; // Fusion Frit F-2
const CORNWALL = 'af287dd4-a45d-499f-95b5-8d7f8572d404'; // Cornwall Stone
const FRIT_4113 = '95bc6cda-e298-4a5b-b489-ce9a08c4ea9d'; // Ferro Frit 4113

const POTASH = [G200, MAHAVIR, MINSPAR, NEPH_A270];
const RECIPE_OWN = [FRIT_3110, IDS.whiting, CHINA_CLAY, IDS.silica, IDS.talc];

const molesOf = (pairs) =>
  chemistry.oxideMoles(
    HOST,
    pairs.map(([id, amount]) => ({ material: record(id), amount }))
  );
const own = (id, start) => ({ material: record(id), start });
const offer = (id, extra = {}) => ({ material: record(id), start: 0, ...extra });
const ids = (lines, indexes) => indexes.map((i) => lines[i].material.id);
const share = (amounts, i) => amounts[i] / amounts.reduce((sum, a) => sum + a, 0);
const withMust = (lines, index) => lines.map((line, i) => (i === index ? { ...line, must: true } : line));

const NITER_TARGET = molesOf([
  [NITER, 10],
  [IDS.whiting, 20],
  [CHINA_CLAY, 20],
  [IDS.silica, 40],
  [IDS.talc, 10]
]);
const niterOwn = () => [
  own(FRIT_3110, 10),
  own(IDS.whiting, 20),
  own(CHINA_CLAY, 20),
  own(IDS.silica, 40),
  own(IDS.talc, 10)
];

describe('selectMaterials', () => {
  test("brings niter's potash back with one material from many, keeping the recipe's own", () => {
    const lines = [...niterOwn(), ...POTASH.map((id) => offer(id)), offer(NYAD), offer(FRIT_3124), offer(IDS.zinc)];
    const result = chemistry.selectMaterials(HOST, lines, NITER_TARGET);
    const added = ids(lines, result.chosen).filter((id) => !RECIPE_OWN.includes(id));
    assert.equal(added.length, 1);
    assert.ok(POTASH.includes(added[0]));
    assert.equal(result.amounts[1], 20);
    assert.equal(result.amounts[4], 10);
    assert.ok(result.miss < 1);
    assert.equal(result.cutShort, false);
    const feldspar = result.contributions.find((c) => POTASH.includes(lines[c.index].material.id));
    assert.equal(feldspar.supplies[0].oxide, 'K2O');
    near(feldspar.supplies[0].share, 1, 0.01);
    assert.ok(feldspar.missWithout > result.miss);
  });

  test("respects 'must use', 'don't use' and a limit on new materials, saying what the limit costs", () => {
    const lines = [...niterOwn(), offer(G200, { avoid: true }), offer(MAHAVIR), offer(FRIT_3124, { must: true })];
    const result = chemistry.selectMaterials(HOST, lines, NITER_TARGET);
    const chosen = ids(lines, result.chosen);
    assert.ok(!chosen.includes(G200));
    assert.ok(chosen.includes(FRIT_3124));
    assert.ok(chosen.includes(MAHAVIR));
    const limited = chemistry.selectMaterials(HOST, lines, NITER_TARGET, { extras: 0 });
    assert.ok(!ids(lines, limited.chosen).includes(MAHAVIR));
    assert.ok(limited.countCost > 0);
    assert.ok(limited.miss > result.miss);
  });

  test('names an oxide that nothing offered supplies', () => {
    const target = molesOf([
      [LITHIUM_CARBONATE, 5],
      [IDS.whiting, 20],
      [CHINA_CLAY, 25],
      [IDS.silica, 50]
    ]);
    const lines = [own(IDS.whiting, 20), own(CHINA_CLAY, 25), own(IDS.silica, 50), offer(IDS.talc)];
    assert.deepEqual(chemistry.selectMaterials(HOST, lines, target).unreachable, ['Li2O']);
  });

  const CALCIUM = molesOf([
    [IDS.whiting, 15],
    [G200, 40],
    [IDS.silica, 30],
    [CHINA_CLAY, 15]
  ]);
  const calciumBase = () => [own(G200, 40), own(IDS.silica, 30), own(CHINA_CLAY, 15)];

  test('keeps raw calcium sources to a shared cap, and says what lifting it would gain', () => {
    const lines = [
      ...calciumBase(),
      offer(IDS.whiting, { group: 'raw calcium' }),
      offer(FLUORSPAR, { group: 'raw calcium' })
    ];
    const result = chemistry.selectMaterials(HOST, lines, CALCIUM, { groups: { 'raw calcium': 5 } });
    assert.ok(result.amounts[3] + result.amounts[4] <= 5 + 1e-6);
    const shared = result.capped.find((c) => c.group === 'raw calcium');
    assert.equal(shared.most, 5);
    assert.ok(shared.wouldBe >= 10 && shared.wouldBe <= 15, String(shared.wouldBe));
    assert.ok(shared.missLifted < result.miss);
    const single = chemistry.selectMaterials(HOST, [...calciumBase(), offer(IDS.whiting, { most: 5 })], CALCIUM);
    assert.equal(single.capped.length, 1);
    near(single.capped[0].wouldBe, 15, 1);
    assert.ok(single.capped[0].missLifted < single.miss);
  });

  test('keeps a member at nothing rather than at a least that breaks its cap, and does not call a broken cap held', () => {
    const groups = { 'raw calcium': 5 };
    const chosen = chemistry.selectMaterials(
      HOST,
      [...calciumBase(), offer(IDS.whiting, { group: 'raw calcium', least: 8 }), offer(VANSIL, { least: 1 })],
      CALCIUM,
      { groups }
    );
    assert.equal(chosen.amounts[3], 0);
    assert.ok(chosen.amounts[4] > 10);
    assert.deepEqual(
      chosen.capped.filter((c) => c.group === 'raw calcium'),
      []
    );
    const must = chemistry.selectMaterials(
      HOST,
      [...calciumBase(), offer(IDS.whiting, { group: 'raw calcium', least: 8, must: true })],
      CALCIUM,
      { groups }
    );
    near(must.amounts[3], 8, 1e-9);
    assert.equal(must.capped.length, 1);
    assert.equal(must.capped[0].group, 'raw calcium');
    assert.equal(must.capped[0].most, 5);
    assert.equal(must.capped[0].broken, true);
    near(must.capped[0].wouldBe, 8, 1e-9);
  });

  test('names a shared cap the match comes to only where lifting it gains WORTH_ADDING or more', () => {
    const lines = [...calciumBase(), offer(IDS.whiting, { group: 'raw calcium' })];
    const heldTo = (cap) => chemistry.selectMaterials(HOST, lines, CALCIUM, { groups: { 'raw calcium': cap } });
    // The match wants 15 of whiting: held to 14.8, it comes less than WORTH_ADDING further off.
    const slight = heldTo(14.8);
    near(slight.amounts[3], 14.8, 1e-6);
    assert.ok(slight.miss < WORTH_ADDING, String(slight.miss));
    assert.deepEqual(slight.capped, []);
    const costly = heldTo(14.5);
    near(costly.amounts[3], 14.5, 1e-6);
    assert.deepEqual(
      costly.capped.map((c) => [c.group, c.most]),
      [['raw calcium', 14.5]]
    );
  });

  test("calls a share of the batch broken where a must's least alone comes to more", () => {
    // The rest held to what they have: the whiting's 30 is 15% only of a batch of 200, and they come to 85.
    const lines = [
      { ...own(G200, 40), most: 40 },
      { ...own(IDS.silica, 30), most: 30 },
      { ...own(CHINA_CLAY, 15), most: 15 },
      offer(IDS.whiting, { group: 'raw calcium', must: true, least: 30 })
    ];
    const result = chemistry.selectMaterials(HOST, lines, CALCIUM, { shares: { 'raw calcium': 0.15 } });
    const batch = result.amounts.reduce((sum, a) => sum + a, 0);
    near(result.amounts[3], 30, 1e-9);
    const shared = result.capped.find((c) => c.group === 'raw calcium');
    assert.equal(shared.broken, true);
    assert.deepEqual(shared.members, [3]);
    near(shared.most, 0.15 * batch, 1e-9);
    near(shared.wouldBe, 30, 1e-9);
    assert.equal(shared.missLifted, result.miss);
  });

  test("says what lifting a cap alone would give, keeping every other line's least", () => {
    const target = molesOf([
      [IDS.frit3134, 80],
      [CHINA_CLAY, 3],
      [IDS.silica, 10],
      [IDS.zinc, 7]
    ]);
    const lines = [
      { ...own(IDS.frit3134, 80), must: true },
      { ...own(CHINA_CLAY, 3), must: true, least: 10 },
      own(IDS.silica, 10),
      offer(IDS.zinc, { most: 5, least: 1 })
    ];
    const result = chemistry.selectMaterials(HOST, lines, target, { keepOwn: true });
    near(result.amounts[3], 5, 1e-6);
    assert.equal(result.capped.length, 1);
    const [zinc] = result.capped;
    near(zinc.wouldBe, 7, 0.1);
    const lifted = chemistry.bestFit(
      HOST,
      lines.map((line, i) => ({ ...line, least: i === 1 ? 10 : 0, most: undefined })),
      target
    );
    near(zinc.missLifted, lifted.miss, 1e-3);
    assert.ok(zinc.missLifted > 1);
  });

  test('says what lifting a cap would give with a line the recipe takes to nothing left free, not at its least', () => {
    const target = molesOf([
      [IDS.frit3134, 80],
      [CHINA_CLAY, 3],
      [IDS.silica, 10],
      [IDS.zinc, 7]
    ]);
    // The talc kept with keepOwn, but at nothing: the target has no magnesia.
    const lines = [
      { ...own(IDS.frit3134, 80), must: true },
      { ...own(CHINA_CLAY, 3), must: true, least: 10 },
      own(IDS.silica, 10),
      offer(IDS.zinc, { most: 5, least: 1 }),
      { ...own(IDS.talc, 5), least: 3 }
    ];
    const result = chemistry.selectMaterials(HOST, lines, target, { keepOwn: true });
    assert.equal(result.amounts[4], 0);
    const [zinc] = result.capped;
    assert.equal(zinc.index, 3);
    const lifted = (talcLeast) =>
      chemistry.bestFit(
        HOST,
        lines.map((line, i) => ({ ...line, least: i === 1 ? 10 : i === 4 ? talcLeast : 0, most: undefined })),
        target
      ).miss;
    near(zinc.missLifted, lifted(0), 1e-3);
    assert.ok(lifted(3) > zinc.missLifted + 1);
  });

  // Nepheline syenite and Gerstley Borate replaced from a shelf with Custer Spar and Frit 3134 (ADR 12).
  const GERSTLEY = molesOf([
    [NEPH_TYPICAL, 40],
    [IDS.silica, 25],
    [IDS.gerstley, 15],
    [IDS.epk, 20]
  ]);
  const SHELF = () => [
    offer(IDS.custer),
    own(IDS.silica, 25),
    offer(IDS.whiting),
    { ...own(IDS.epk, 20), group: 'raw clay' },
    offer(IDS.frit3134),
    offer(IDS.talc)
  ];

  test('keeps a share of the batch to its cap, and says what lifting it would give', () => {
    const lines = SHELF();
    const free = chemistry.selectMaterials(HOST, lines, GERSTLEY);
    assert.ok(share(free.amounts, 3) > 0.25);
    const held = chemistry.selectMaterials(HOST, lines, GERSTLEY, { shares: { 'raw clay': 0.2 } });
    assert.ok(share(held.amounts, 3) <= 0.2 + 1e-6);
    const [clay] = held.capped;
    assert.equal(clay.index, 3);
    assert.equal(clay.group, 'raw clay');
    const total = held.amounts.reduce((sum, a) => sum + a, 0);
    near(clay.most / total, 0.2, 1e-6);
    near(clay.wouldBe / total, share(free.amounts, 3), 0.01);
    assert.ok(clay.missLifted < held.miss);
    const calcined = chemistry.selectMaterials(HOST, [...lines, offer(CALCINED_KAOLIN)], GERSTLEY, {
      shares: { 'raw clay': 0.2 }
    });
    assert.ok(share(calcined.amounts, 3) <= 0.2 + 1e-6);
    assert.ok(calcined.amounts[6] > 3);
    assert.ok(calcined.miss < free.miss + 0.5);
  });

  test('names a share of the batch by its largest member, not the first', () => {
    // A must's token of ball clay, offered before the recipe's kaolin.
    const V161 = '9274d40f-34bc-4346-b5b9-e5157022162c'; // Sibelco V161 Ball Clay
    const lines = [offer(V161, { group: 'raw clay', must: true }), ...SHELF()];
    const held = chemistry.selectMaterials(HOST, lines, GERSTLEY, { shares: { 'raw clay': 0.2 } });
    const batch = held.amounts.reduce((sum, a) => sum + a, 0);
    assert.ok(held.amounts[0] < held.amounts[4], String(held.amounts));
    assert.equal(held.capped.length, 1);
    const [clay] = held.capped;
    assert.deepEqual([clay.index, clay.group, clay.members], [4, 'raw clay', [0, 4]]);
    near(clay.most, 0.2 * batch, 1e-6);
  });

  test('does not put an amount back at its start where that breaks a shared cap', () => {
    const lines = [
      { ...own(IDS.epk, 20), group: 'clay and silica' },
      { ...own(IDS.silica, 25), group: 'clay and silica' },
      own(IDS.custer, 40),
      own(IDS.whiting, 15)
    ];
    const target = molesOf([
      [IDS.epk, 20],
      [IDS.silica, 25],
      [IDS.custer, 40],
      [IDS.whiting, 15]
    ]);
    assert.deepEqual(chemistry.fitAmounts(HOST, lines, target).amounts, [20, 25, 40, 15]);
    const { amounts } = chemistry.fitAmounts(HOST, lines, target, { groups: { 'clay and silica': 44 } });
    assert.ok(amounts[0] + amounts[1] <= 44 + 1e-6);
    const shared = chemistry.fitAmounts(HOST, lines, target, { shares: { 'clay and silica': 0.44 } }).amounts;
    assert.ok(share(shared, 0) + share(shared, 1) <= 0.44 + 1e-6);
  });

  test('says what each material supplies, largest first in bands of 5%', () => {
    const target = molesOf([
      [POTCLAYS_3426, 8.1],
      [NEPH_A270, 16.2],
      [MM_1233, 2.3],
      [VIBRANTZ_90368, 4.9]
    ]);
    const lines = [RED_LEAD, P2960, KAOLIN_233, F2, DOLOMITE, CORNWALL, FRIT_4113].map((id) => offer(id));
    const result = chemistry.selectMaterials(HOST, lines, target);
    const band = (s) => Math.round(20 * s);
    let pairs = 0;
    for (const { supplies } of result.contributions) {
      supplies.slice(1).forEach((part, k) => {
        assert.ok(band(part.share) <= band(supplies[k].share));
        pairs++;
      });
    }
    assert.ok(pairs > 2);
  });

  test('makes up a flux nothing offered supplies from the others, keeping the formula near', () => {
    const lithium = molesOf([
      [LITHIUM_CARBONATE, 4],
      [IDS.custer, 30],
      [IDS.whiting, 16],
      [IDS.epk, 20],
      [IDS.silica, 30]
    ]);
    const lines = [own(IDS.custer, 30), own(IDS.whiting, 16), own(IDS.epk, 20), own(IDS.silica, 30)];
    const result = chemistry.selectMaterials(HOST, lines, lithium);
    assert.deepEqual(result.unreachable, ['Li2O']);
    const { oxides } = chemistry.closeness(HOST, lithium, result.moles);
    const row = (oxide) => oxides.find((o) => o.oxide === oxide);
    assert.equal(row('Li2O').verdict, 'far');
    for (const oxide of ['SiO2', 'Al2O3']) assert.notEqual(row(oxide).verdict, 'far', oxide);
  });

  describe('what it says of the materials', () => {
    const recipe = [
      [IDS.custer, 20],
      [IDS.frit3134, 20],
      [IDS.whiting, 15],
      [IDS.epk, 20],
      [IDS.silica, 25]
    ];
    const target = molesOf(recipe);
    const old = new Map(recipe);
    const shelf = [
      G200,
      MAHAVIR,
      MINSPAR,
      NEPH_A270,
      IDS.frit3134,
      FRIT_3124,
      IDS.whiting,
      DOLOMITE,
      IDS.talc,
      IDS.epk,
      IDS.silica,
      NYAD,
      IDS.zinc,
      IDS.gerstley
    ].map((id) => ({ material: record(id), start: old.get(id) ?? 0, least: 1 }));

    test('offers a material not used only for what adding it really gains, chosen again', () => {
      const result = chemistry.selectMaterials(HOST, shelf, target);
      assert.deepEqual(
        result.unused.filter((u) => u.helps >= 0.05),
        []
      );
      for (const { index, helps } of result.unused) {
        const added = chemistry.selectMaterials(HOST, withMust(shelf, index), target);
        assert.ok(helps <= Math.max(0, result.miss - added.miss) + 1e-9, shelf[index].material.id);
      }
      const lines = [...niterOwn(), offer(MAHAVIR), offer(FRIT_3124, { must: true })];
      const limited = chemistry.selectMaterials(HOST, lines, NITER_TARGET, { extras: 0 });
      const feldspar = limited.unused.find((u) => u.index === 5);
      const added = chemistry.selectMaterials(HOST, withMust(lines, 5), NITER_TARGET, { extras: 0 });
      assert.ok(feldspar.helps > 0.05);
      near(feldspar.helps, limited.miss - added.miss, 1e-9);
    });

    test('measures what each material used is worth against the best match within the recipe', () => {
      const result = chemistry.selectMaterials(HOST, shelf, target);
      const plain = shelf.map((line) => ({ ...line, least: 0 }));
      const bestWith = (use) =>
        chemistry.bestFit(
          HOST,
          plain.filter((_, i) => use.has(i)),
          target
        ).miss;
      const used = new Set(result.chosen);
      for (const { index, missWithout } of result.contributions) {
        const without = new Set(used);
        without.delete(index);
        near(missWithout - result.miss, bestWith(without) - bestWith(used), 0.01, shelf[index].material.id);
      }
    });
  });

  test("keeps the recipe's own materials when asked, and holds a must's least while choosing", () => {
    const recipe = [
      [IDS.whiting, 15],
      [NYAD, 4],
      [G200, 30],
      [CHINA_CLAY, 20],
      [IDS.silica, 31]
    ];
    const mine = recipe.map(([id, amount]) => own(id, amount));
    const fewest = chemistry.selectMaterials(HOST, mine, molesOf(recipe));
    assert.ok(!ids(mine, fewest.chosen).includes(NYAD));
    const kept = chemistry.selectMaterials(HOST, mine, molesOf(recipe), { keepOwn: true });
    assert.deepEqual(kept.chosen, [0, 1, 2, 3, 4]);
    assert.deepEqual(kept.amounts, [15, 4, 30, 20, 31]);
    const lines = [...niterOwn(), ...POTASH.map((id) => offer(id))];
    const held = [...lines];
    held[2] = { ...own(CHINA_CLAY, 20), must: true, least: 25 };
    const result = chemistry.selectMaterials(HOST, held, NITER_TARGET);
    assert.ok(result.amounts[2] >= 25 - 1e-6);
    const free = chemistry.selectMaterials(HOST, lines, NITER_TARGET);
    assert.ok(result.miss >= free.miss);
    assert.ok(result.miss - result.best < 0.5);
  });

  test('tries a material under its least at nothing and at its least, keeping the better', () => {
    const lines = [
      own(IDS.whiting, 20),
      own(IDS.silica, 35),
      own(CHINA_CLAY, 20),
      own(G200, 25),
      offer(IDS.talc, { least: 8 })
    ];
    const recipe = (talc) => [
      [IDS.whiting, 20],
      [IDS.silica, 35],
      [CHINA_CLAY, 20],
      [G200, 25],
      [IDS.talc, talc]
    ];
    assert.equal(chemistry.selectMaterials(HOST, lines, molesOf(recipe(1))).amounts[4], 0);
    near(chemistry.selectMaterials(HOST, lines, molesOf(recipe(6))).amounts[4], 8, 1e-6);
  });

  test('raises a material under its least to it when it is the only one chosen', () => {
    const result = chemistry.selectMaterials(HOST, [offer(IDS.whiting, { least: 8 })], molesOf([[IDS.whiting, 5]]));
    assert.deepEqual(result.chosen, [0]);
    near(result.amounts[0], 8, 1e-9);
  });

  test('adds back materials each worth a closer match, when asked, and ranks fast with the plain best', () => {
    const lines = [...niterOwn(), ...POTASH.map((id) => offer(id)), offer(NYAD)];
    const fewest = chemistry.selectMaterials(HOST, lines, NITER_TARGET);
    const closer = chemistry.selectMaterials(HOST, lines, NITER_TARGET, { closer: true });
    assert.ok(closer.miss <= fewest.miss + 1e-9);
    assert.ok(closer.chosen.length >= fewest.chosen.length);
    const best = chemistry.bestFit(HOST, lines, NITER_TARGET);
    assert.equal(best.amounts.length, lines.length);
    near(best.miss, fewest.best, 0.05);
    assert.ok(best.miss <= chemistry.fitAmounts(HOST, lines, NITER_TARGET).miss + 1e-9);
  });

  test('adds back a material that brings the match closer, when asked, after the fewest that come near enough', () => {
    // Three of these four come within a miss of 1 (GOOD_ENOUGH), so the fewest stop there; the feldspar
    // left out brings the match closer by more than WORTH_ADDING (0.1), so closer adds it back.
    const MINSPAR = '582e86c4-f772-4076-8d6d-840985f0f552'; // Minspar 200
    const KOREAN_KAOLIN = '3e7b54f9-7b16-499c-8111-58a1ac00c9c3'; // Korean Kaolin
    const ORTHOCLASE = '13b27725-61c3-48a5-9750-617053add56b'; // Orthoclase
    const F69 = '1790d254-3c27-4f54-91bf-59be2f06afdd'; // Fusion Frit F-69
    const OTHERS = [
      '38a5c35c-19b5-46e3-97e6-00edb391809a', // Lead Monosilicate Frit
      '9a270034-c20e-4b5a-8acb-9133df4629a9', // Mondré & Manz Frit M 1233
      'b6434f62-52d1-4192-be59-ab53b4374e48' // Oxford Spar
    ];
    const recipe = [
      [MINSPAR, 6],
      [KOREAN_KAOLIN, 8],
      [ORTHOCLASE, 32],
      [F69, 42]
    ];
    const target = chemistry.calculateUMF(
      HOST,
      recipe.map(([id, amount]) => ({ material: record(id), amount }))
    ).umf;
    const lines = [...recipe.map(([id]) => id), ...OTHERS].map((id) => offer(id));
    const fewest = chemistry.selectMaterials(HOST, lines, target);
    const closer = chemistry.selectMaterials(HOST, lines, target, { closer: true });
    assert.deepEqual(fewest.chosen, [1, 2, 3]);
    assert.ok(fewest.miss < 1, String(fewest.miss));
    assert.deepEqual(closer.chosen, [0, 1, 2, 3]);
    assert.ok(closer.miss < fewest.miss - 0.1, `${closer.miss} against ${fewest.miss}`);
  });

  test('calls materials alike only when they would do the same job in the match', () => {
    const lines = [
      own(IDS.whiting, 20),
      own(CHINA_CLAY, 20),
      own(IDS.silica, 40),
      own(IDS.talc, 10),
      offer(G200),
      offer(MAHAVIR),
      offer(FLINT)
    ];
    const result = chemistry.selectMaterials(HOST, lines, NITER_TARGET);
    const pairs = result.alike.map((pair) => [lines[pair.used].material.id, lines[pair.other].material.id]);
    assert.ok(pairs.some(([used, other]) => used === IDS.silica && other === FLINT));
    for (const pair of pairs) assert.notEqual(pair.filter((id) => POTASH.includes(id)).length, 1);
  });

  test('keeps a group and a share that pull against each other (the rerun review, seed 21, case 180)', () => {
    const VALENTINE_POTASH = '2daa835d-4ccf-462c-ac70-ab80b030e665'; // Potash Feldspar (Valentine Clays)
    const WALKER_SODA = '677441ad-a692-4056-92f2-9a151abe95da'; // Soda Feldspar (Walker BA340, India)
    const SODIUM_NITRATE = '3bd1afdd-e83d-47ff-9774-575451fac21b'; // Sodium Nitrate
    const ZETTLITZ = '3b0a1268-91a7-4990-b3c3-0bb5180fc0d3'; // Zettlitz Kaolin (Sedlec Ia)
    const CTM_37 = '712f6c99-2fb8-4d44-8962-7a4d08d90911'; // Calcium Borate Frit (CTM 37)
    const lines = [
      offer(VALENTINE_POTASH, { least: 1.9410058440230786, group: 's' }),
      offer(WALKER_SODA, { least: 0.31700000000000006, group: 'g' }),
      offer(SODIUM_NITRATE, { least: 4.065053042732179 }),
      offer(ZETTLITZ, { least: 3.3499269806724046, group: 's' }),
      offer(CTM_37, { least: 0.31700000000000006, group: 'g' })
    ];
    const target = {
      SiO2: 0.14481134430704193,
      Al2O3: 0.04797618697345064,
      Fe2O3: 0.0005535829466393632,
      TiO2: 0.00026043949164214616,
      K2O: 0.001892881787780668,
      B2O3: 0.15389775485872703,
      MgO: 0.000528483525208416,
      CaO: 0.10065624052641904
    };
    const options = { groups: { g: 4.614778675665148 }, shares: { s: 0.2217968927696347 } };
    const { amounts, capped } = chemistry.selectMaterials(HOST, lines, target, options);
    const batch = amounts.reduce((sum, amount) => sum + amount, 0);
    assert.ok(amounts[1] + amounts[4] <= 4.614778675665148 * (1 + 1e-6), 'the group');
    assert.ok(amounts[0] + amounts[3] <= 0.2217968927696347 * batch * (1 + 1e-6), 'the share');
    assert.deepEqual(
      capped.filter((c) => c.broken),
      []
    );
  });

  test("answers from the recipe's own, cut short, where the limit on new materials leaves none (budget-cut case 30)", () => {
    const BORIC_ACID = 'df0f5c7c-6eec-4fff-96c8-eb784a71ba64'; // Boric Acid
    const V161 = '9274d40f-34bc-4346-b5b9-e5157022162c'; // Sibelco V161 Ball Clay
    const CLAYS = [
      '6f64aca5-2809-403f-87f7-c48fc36b4459', // Wilco UPF Kaolin
      '1e8b5b5d-2179-4ff8-a87a-ef8a335a70d9', // Glomax LL Calcined Kaolin
      '1a95ab53-0df8-4603-96e3-99c522e337c8', // Hawthorn Bond Fireclay
      'd5f4853a-7a07-4031-a833-8704f7f202c3' // Caolín Nacional Superfino (Prodesco)
    ];
    const offered = [
      '835e6056-7426-4f08-9cec-16b9101c925b', // Bone Ash
      CLAYS[0],
      CLAYS[1],
      '0914b382-05f0-4c89-953a-54161c0bc908', // Feldspath mixte 64 (Ceradel)
      '5be00151-b2ee-4ef9-90f1-4e2a302de06f', // Reimbold & Strick Frit A 3021
      'c38346b9-4425-48fc-a505-90b95ee79b81', // Strontium Carbonate
      '13b27725-61c3-48a5-9750-617053add56b', // Orthoclase
      CORNWALL,
      'abc5287c-753a-4fcd-8cbe-d369aa403332', // Chestnut Wood Ash, washed (栗灰)
      CLAYS[2],
      'd766dd44-e979-40ce-ae35-969e8665c42a', // Tsushima Feldspar (対馬長石)
      '069377b4-2632-42c4-b453-884d6f855dc7', // Kamado Feldspar (釜戸長石)
      '712a2f0b-51a0-4aff-80dc-25318cbb877e', // Amakusa Pottery Stone (天草陶石)
      P2960,
      '99416ed2-f058-4825-bb4c-243a10dcd952', // Ferro Frit 3195
      '9724196b-50a8-4199-84e3-8868bc9d7d4a', // Petalite
      'c7afbcf1-1a74-42e9-b7fe-4d634a2b0132', // Calcium Borate Frit 32.21 (Keramikos)
      '3ce4062b-9f3b-4f60-b5fc-1d2e1d628086', // Zinc Frit 32.22 (Keramikos)
      CLAYS[3],
      FLINT
    ];
    const lines = [
      own(BORIC_ACID, 32.2),
      { ...own(V161, 9.9), group: 'clay' },
      ...offered.map((id) => offer(id, { least: 0.79, ...(CLAYS.includes(id) ? { group: 'clay' } : {}) }))
    ];
    const target = {
      B2O3: 0.27831707772526826,
      SiO2: 0.5101642727560207,
      TiO2: 0.0017354285356539158,
      Al2O3: 0.08458557683820286,
      Fe2O3: 0.0007562919962176007,
      Na2O: 0.021067135642717696,
      K2O: 0.037115027336907476,
      CaO: 0.0005809868573568485,
      MgO: 0.0008123263199682413
    };
    for (const most of [0, 1e-5 * chemistry.WORK]) {
      const meter = chemistry.newMeter(most);
      const cut = chemistry.selectMaterials(HOST, lines, target, { extras: 0, shares: { clay: 0.2 }, meter });
      assert.equal(cut.cutShort, true);
      assert.deepEqual(cut.chosen, [0, 1]);
    }
  });

  test('keeps every material used at its least, not only the last one raised to it', () => {
    const leasts = [
      ['c6481499-53de-4075-a2a7-7ec4e85e3614', 4.4988, { start: 5.6 }], // Standard Porcelain China Clay
      ['6c86bcfc-a83d-40c6-b3db-ced26b855bef', 9.1696], // Godfrey Spar
      ['7b37d8dd-0bdc-4a1f-9bbc-2868df8c09a6', 8.6795], // Eckalite 2 Kaolin
      ['835e6056-7426-4f08-9cec-16b9101c925b', 14.1091], // Bone Ash
      ['20d33aff-dd1a-4c5a-a1c7-9b8a236fb2d0', 10.1633, { avoid: true }], // Nepheline Syenite (Norwegian, UK)
      ['917fe201-8324-4036-b117-30d9fe09665a', 4.763], // Litharge
      ['ba99a3bc-81e5-4df3-b1dc-c0efef3326dc', 13.4878], // Hymod AT Ball Clay
      ['2daa835d-4ccf-462c-ac70-ab80b030e665', 6.2934], // Potash Feldspar (Valentine Clays)
      [IDS.talc, 12.9392, { must: true }],
      ['efed4cb3-f626-45f8-984e-c4f4db8f8b85', 14.0001], // Lead Bisilicate Frit 10.05 (Keramikos)
      [CHINA_CLAY, 14.635],
      ['5bf3c993-2d04-4954-b1a1-70f7bcd722ca', 12.798], // FFP 45 Feldspar
      ['e98c5b46-ada0-4d48-99b4-2fc9fc9c9ec5', 1.067] // Grolleg China Clay
    ];
    const lines = leasts.map(([id, least, extra]) => ({ ...offer(id, extra), least }));
    const target = {
      SiO2: 0.78733,
      Al2O3: 0.13688,
      Fe2O3: 0.00782,
      K2O: 0.04947,
      TiO2: 0.00219,
      Na2O: 0.01333,
      CaO: 0.12833,
      MgO: 0.00696,
      B2O3: 0.18208,
      PbO: 0.07001,
      MnO: 0.00043
    };
    const result = chemistry.selectMaterials(HOST, lines, target);
    assert.ok(result.chosen.length > 1);
    for (const i of result.chosen) {
      assert.ok(result.amounts[i] >= lines[i].least * (1 - 1e-6), lines[i].material.id);
    }
  });

  test('screens a pool of more than 60 to 40: a last resort half as rich, and of copies or the alike the first', () => {
    // The whole standard library as a shelf, and two more bags of whiting.
    const shelf = [...MATERIALS.map((m) => m.id), IDS.whiting, IDS.whiting];
    const target = molesOf(GLOSSY);
    const choose = (marked) => {
      // Fluorine and soluble materials marked last resorts as the recipe tools mark them (pool.ts lastResort).
      const lines = shelf.map((id) => {
        const material = record(id);
        return { material, start: 0, lastResort: marked && !!(material.fluorine || material.soluble) };
      });
      const result = chemistry.selectMaterials(HOST, lines, target);
      const considered = new Set([...result.chosen, ...result.unused.map((u) => u.index)]);
      const kept = (id) => [...considered].filter((i) => lines[i].material.id === id);
      return { result, considered, kept };
    };
    const marked = choose(true);
    assert.equal(marked.considered.size, 40);
    assert.equal(chemistry.closeness(HOST, target, marked.result.moles).verdict, 'close');
    // Whiting, not fluorspar, stands for the calcium: of the three whitings, the first offered.
    assert.deepEqual(marked.kept(IDS.whiting), [shelf.indexOf(IDS.whiting)]);
    assert.ok(marked.result.chosen.includes(shelf.indexOf(IDS.whiting)));
    assert.deepEqual(marked.kept(FLUORSPAR), []);
    // Of flint and silica, alike, the one offered first.
    assert.deepEqual(
      [...marked.kept(FLINT), ...marked.kept(IDS.silica)],
      [Math.min(shelf.indexOf(FLINT), shelf.indexOf(IDS.silica))]
    );
    // Not marked, fluorspar is the richer in calcium, and it stands for it in place of whiting.
    const unmarked = choose(false);
    assert.deepEqual(unmarked.kept(IDS.whiting), []);
    assert.ok(unmarked.result.chosen.includes(shelf.indexOf(FLUORSPAR)));
  });

  test('cut short with more in use than the target has oxides to aim for, keeps the musts and no more than that', () => {
    // NITER_TARGET aims at five oxides, K2O, CaO, Al2O3, SiO2 and MgO, and only the talc has magnesia.
    // Whiting comes in two bags of 5 at most.
    const shelf = [
      ...POTASH,
      POTCLAYS_3426,
      NEPH_TYPICAL,
      CORNWALL,
      IDS.custer,
      NYAD,
      VANSIL,
      IDS.whiting,
      IDS.whiting,
      CHINA_CLAY,
      KAOLIN_233,
      IDS.epk,
      CALCINED_KAOLIN,
      FLINT,
      IDS.silica,
      IDS.talc,
      FRIT_3124
    ];
    for (const musts of [[], [CHINA_CLAY, FRIT_3124]]) {
      const lines = shelf.map((id) =>
        offer(id, { ...(musts.includes(id) ? { must: true } : {}), ...(id === IDS.whiting ? { most: 5 } : {}) })
      );
      const whole = chemistry.newMeter();
      chemistry.selectMaterials(HOST, lines, NITER_TARGET, { meter: whole });
      const cut = chemistry.selectMaterials(HOST, lines, NITER_TARGET, { meter: chemistry.newMeter(whole.used / 5) });
      assert.equal(cut.cutShort, true);
      assert.ok(cut.chosen.length <= 5, JSON.stringify(cut.chosen));
      const chosen = ids(lines, cut.chosen);
      for (const id of [...musts, IDS.talc]) assert.ok(chosen.includes(id), id);
      for (const oxide of ['K2O', 'CaO', 'Al2O3', 'SiO2', 'MgO']) assert.ok(cut.moles[oxide] > 0, oxide);
    }
  });

  test('a meter spent at once: the search is cut short, and says so', () => {
    const lines = [...niterOwn(), ...POTASH.map((id) => offer(id))];
    const meter = chemistry.newMeter(0);
    const cut = chemistry.selectMaterials(HOST, lines, NITER_TARGET, { meter });
    assert.equal(cut.cutShort, true);
    assert.equal(meter.cut, true);
    assert.ok(cut.chosen.length > 0);
  });

  test('nothing to choose from, by code', () => {
    assert.equal(thrown(() => chemistry.selectMaterials(HOST, [], NITER_TARGET)).code, 'no-materials');
  });
});

describe('closeness', () => {
  const OLD = molesOf([
    [IDS.custer, 40],
    [IDS.whiting, 20],
    [IDS.epk, 20],
    [IDS.silica, 20]
  ]);

  test('says how near a match comes, oxide by oxide in the unity formula, with a verdict', () => {
    const same = chemistry.closeness(HOST, OLD, OLD);
    assert.equal(same.verdict, 'close');
    assert.deepEqual(
      same.oxides.map((o) => o.oxide),
      ['K2O', 'Na2O', 'KNaO', 'CaO', 'Al2O3', 'SiO2']
    );
    for (const o of same.oxides) {
      assert.equal(o.difference, 0);
      assert.equal(o.verdict, 'close');
    }
    const soda = chemistry.closeness(
      HOST,
      OLD,
      molesOf([
        [MINSPAR, 41.1],
        [IDS.whiting, 19.6],
        [IDS.epk, 18.9],
        [IDS.silica, 20.5]
      ])
    );
    assert.equal(soda.verdict, 'fair');
    const verdicts = Object.fromEntries(soda.oxides.map((o) => [o.oxide, o.verdict]));
    for (const [oxide, verdict] of Object.entries({
      K2O: 'off',
      Na2O: 'off',
      KNaO: 'close',
      CaO: 'close',
      Al2O3: 'close'
    }))
      assert.equal(verdicts[oxide], verdict, oxide);
    const thin = chemistry.closeness(
      HOST,
      OLD,
      molesOf([
        [IDS.custer, 40],
        [IDS.whiting, 20],
        [IDS.epk, 5],
        [IDS.silica, 30]
      ])
    );
    assert.equal(thin.verdict, 'poor');
    assert.equal(thin.oxides.find((o) => o.oxide === 'Al2O3').verdict, 'far');
  });

  test('does not call two formulas with no fluxes close: a target with none has no unity formula', () => {
    assert.equal(
      thrown(() => chemistry.closeness(HOST, { SiO2: 1, Al2O3: 0.2 }, { SiO2: 3, Al2O3: 0.1 })).code,
      'no-flux'
    );
    const fluxless = chemistry.closeness(HOST, { CaO: 0.01, SiO2: 0.03, Al2O3: 0.003 }, { SiO2: 3, Al2O3: 0.3 });
    assert.equal(fluxless.verdict, 'poor');
  });

  test('orders oxides that tie by name as plain text, whatever the reader’s language', () => {
    const target = { CaO: 1, Al2O3: 0.4, SiO2: 3 };
    const moles = { CaO: 1, Al2O3: 0.4, SiO2: 3, TiO2: 0.05, ZrO2: 0.05 };
    const original = String.prototype.localeCompare;
    String.prototype.localeCompare = function (that, locales, options) {
      return original.call(this, that, locales ?? 'et', options);
    };
    let order;
    try {
      order = chemistry.closeness(HOST, target, moles).oxides.map((o) => o.oxide);
    } finally {
      String.prototype.localeCompare = original;
    }
    assert.ok(order.indexOf('TiO2') < order.indexOf('ZrO2'));
  });
});
