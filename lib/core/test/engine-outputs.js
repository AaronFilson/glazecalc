// What the core gives over its own fixture (standard.json, tables.json), for the three-engine check
// (scripts/engines.mjs): the same calls run in Node, JavaScriptCore and SpiderMonkey must give the same text.
// It uses nothing of Node's, nor any global beyond ES2024 but structuredClone (the core's one, lib/core/globals.d.ts),
// so the check can be bundled and run in a bare engine shell.
import { HOST, MATERIALS, ADDITIVES, GLOSSY, IDS, linesOf } from './support.js';
import * as core from '../index.ts';

const { chemistry, recipe, cones } = core;

/** What a call gives, or what it threw: its code and values, or for an error with no code its name and message. */
const run = (work) => {
  try {
    return work();
  } catch (error) {
    if (error?.code) return { threw: error.code, ...(error.params && { params: error.params }) };
    return { threw: error?.name ?? 'Error', message: String(error?.message ?? error) };
  }
};

/** The same numbers, every time: a linear congruential generator from a fixed seed. */
const seeded = (seed) => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

const copy = (value) => JSON.parse(JSON.stringify(value));
const BANDS = ['low', 'mid', 'high'];
const CELSIUS = { low: 1000, mid: 1222, high: 1285 };
const REGIONS = ['', 'US', 'UK', 'DE', 'AU', 'JP'];
const RED_LEAD = '9965f3fd-a90f-459f-8ad1-e874fc915e13';
const LEAD_BISILICATE = '2f4cdb59-6c8e-4b19-b513-11df791ccc9a';

/** Each output as [key, value], in a fixed order. */
export function* outputs() {
  const byId = new Map([...MATERIALS, ...ADDITIVES].map((r) => [r.id, r]));
  const find = (wanted) => byId.get(typeof wanted === 'string' ? wanted : wanted?.id);
  const standard = copy(MATERIALS);
  const additives = copy(ADDITIVES);

  yield ['constants', { WORK: chemistry.WORK, WORK_CEILING: chemistry.WORK_CEILING, CODES: recipe.CODES }];

  for (const m of standard)
    yield [
      `material ${m.id}`,
      {
        weights: run(() => chemistry.materialWeights(HOST, m)),
        sg: run(() => recipe.materialSg(HOST, m)),
        rawClay: run(() => recipe.isRawClay(HOST, m)),
        ideal: run(() => recipe.isIdealMineral(HOST, m)),
        lead: run(() => recipe.hasLead(m)),
        role: run(() => recipe.roleOf(HOST, m)),
        given: run(() => chemistry.oxidesGivenIn(m)),
        regions: REGIONS.filter((region) => run(() => recipe.suggestable(HOST, m, { region })) === true)
      }
    ];
  for (const a of additives)
    yield [
      `additive ${a.id}`,
      { weights: run(() => chemistry.materialWeights(HOST, a)), sg: run(() => recipe.materialSg(HOST, a)) }
    ];

  // The recipes: the glossy base, two lead glazes, then seeded ones of standard materials.
  const recipes = [
    { key: 'glossy', lines: linesOf(GLOSSY) },
    {
      key: 'red lead',
      lines: linesOf([
        [RED_LEAD, 55],
        [IDS.epk, 15],
        [IDS.silica, 30]
      ])
    },
    {
      key: 'bisilicate',
      lines: linesOf([
        [LEAD_BISILICATE, 55],
        [IDS.whiting, 10],
        [IDS.epk, 15],
        [IDS.silica, 20]
      ])
    }
  ];
  const random = seeded(20261120);
  for (let i = 0; i < 80; i++) {
    const lines = [];
    const n = 3 + Math.floor(random() * 4);
    for (let j = 0; j < n; j++) {
      const m = standard[Math.floor(random() * standard.length)];
      if (!lines.some((line) => line.id === m.id))
        lines.push({ ...m, amount: String(Math.round(random() * 400) / 10 + 1) });
    }
    recipes.push({ key: 'random ' + i, lines });
  }

  const shelves = new Map();
  const shelfIn = (region) => {
    if (!shelves.has(region))
      shelves.set(
        region,
        standard
          .filter((m) => recipe.suggestable(HOST, m, { region }))
          .map((material) => ({ material: { ...material, amount: '' }, must: false }))
      );
    return shelves.get(region);
  };

  let before = null;
  for (const [index, { key, lines }] of recipes.entries()) {
    const recipeLines = lines.map((line) => ({ material: line, amount: line.amount }));
    const umf = run(() => chemistry.calculateUMF(HOST, recipeLines));
    const unity = umf.umf ?? {};
    const analysis = umf.umf ? { ...umf, uList: umf.umf } : null;
    yield [`${key} unity`, umf];
    yield [
      `${key} chemistry`,
      {
        expansion: run(() => recipe.expansionOf(HOST, lines)),
        stull: run(() => recipe.stullPoint(HOST, unity)),
        molePercent: run(() => recipe.molePercent(unity)),
        silicaAlumina: run(() => analysis && recipe.silicaAluminaRatio(analysis)),
        compared: run(() => recipe.compareUnity(HOST, analysis, before)),
        drySg: run(() => recipe.recipeDrySg(HOST, lines)),
        rawClay: run(() => recipe.rawClayPercent(HOST, lines)),
        barium: run(() => recipe.bariumIn(HOST, lines)),
        lead: run(() => recipe.leadIn(HOST, lines)),
        closeness: run(() => chemistry.closeness(HOST, unity, unity)),
        leadFree: run(() => chemistry.leadFreeTarget(HOST, unity, { celsius: CELSIUS.low }))
      }
    ];
    before = analysis;
    for (const band of BANDS)
      yield [
        `${key} ${band}`,
        {
          coneFit: run(() => recipe.coneFit(HOST, unity, band)),
          limits: [HOST.limits.own, HOST.limits.forFit].map((set) =>
            run(() => recipe.limitRows(HOST, unity, set, band))
          ),
          cautions: run(() =>
            recipe.pastLimits(HOST, { lines: recipeLines, unity, celsius: CELSIUS[band], band, additives })
          ),
          sizes: run(() => recipe.sizeNotes(HOST, recipeLines, band === 'low'))
        }
      ];
    // The shelf tools search the whole library, so a few recipes in a few regions: enough to cross the solvers.
    if (index >= 12) continue;
    const lead = lines.some((line) => recipe.hasLead(line));
    for (const region of REGIONS.slice(0, 2)) {
      const shelf = shelfIn(region);
      const row = {
        modern: run(() => recipe.modernMaterials(HOST, lines, find, region)),
        match: run(() => recipe.matchFromShelf(HOST, lines, shelf))
      };
      if (umf.umf)
        row.solve = run(() =>
          recipe.solveTarget(HOST, { kind: 'unity', oxides: umf.umf }, shelf, { celsius: CELSIUS.mid, band: 'mid' })
        );
      if (lead) {
        const bases = run(() => recipe.leadFreeBases(HOST, lines, additives, find, standard, region, CELSIUS.low));
        row.bases = bases;
        if (Array.isArray(bases) && bases.length)
          row.replaced = run(() =>
            recipe.replaceLead(HOST, lines, additives, find, standard, region, {
              base: bases[0].id,
              celsius: CELSIUS.low,
              mode: 'rebuild'
            })
          );
      }
      yield [`${key} ${region || 'anywhere'}`, row];
    }
  }

  for (const [kind, { min, max }] of Object.entries(recipe.BLEND_STEPS))
    for (let steps = min - 1; steps <= max + 1; steps++) {
      const layout = run(() => recipe.blendTiles(kind, steps));
      const corners = recipes
        .slice(steps, steps + recipe.BLEND_CORNERS[kind])
        .map(({ lines }) => ({ materials: lines }));
      const mixed = (layout?.tiles ?? []).map((tile) => run(() => recipe.mixRecipes(HOST, corners, tile.shares)));
      yield [`blend ${kind} ${steps}`, { layout, mixed }];
    }
  for (const { key, lines } of recipes.slice(0, 20)) {
    const base = lines.map((line) => ({ name: line.id, amount: Number(line.amount) }));
    yield [
      `vary ${key}`,
      {
        add: run(() => recipe.varyMaterial(base, IDS.silica, [1, 2.5, 5, 10, 40], 'add')),
        replace: run(() => recipe.varyMaterial(base, IDS.silica, [5, 10, 20], 'replace', lines[0].id))
      }
    ];
  }

  for (const dry of [2.2, 2.6, 3])
    yield [
      `slurry dry ${dry}`,
      [0.9, 1, 1.15, 1.3, 1.45, 1.6, 1.8, 2.6].map((sg) => ({
        perLitre: run(() => recipe.dryPerLitre(sg, dry)),
        contents: run(() => recipe.slurryContents(5, sg, dry)),
        toReach: [1.2, 1.45, 1.7].map((target) => run(() => recipe.waterToReach(5, sg, target, dry))),
        forBatch: run(() => recipe.waterForBatch(1000, sg, dry)),
        forVolume: run(() => recipe.batchForVolume(10, sg, dry)),
        baume: run(() => recipe.baumeFromSg(sg)),
        pint: run(() => recipe.pintFromSg(sg))
      }))
    ];

  for (const scale of cones.SCALES) {
    const choices = run(() => cones.coneChoices(HOST, scale));
    const all = Array.isArray(choices) ? choices.flatMap((group) => group.cones) : [];
    yield [
      `cones ${scale}`,
      {
        choices,
        each: all.map((cone) => ({
          ordinal: run(() => cones.ordinal(HOST, scale, cone)),
          celsius: run(() => cones.approxCelsius(HOST, scale, cone)),
          band: run(() => cones.coneBand(HOST, scale, cone)),
          others: cones.SCALES.map((to) => run(() => cones.approxCone(HOST, scale, cone, to)))
        })),
        between: all.map((low, i) =>
          run(() => cones.conesBetween(HOST, scale, low, all[Math.min(all.length - 1, i + 3)]))
        )
      }
    ];
    for (const [i, low] of all.entries()) {
      if (i % 4) continue;
      const block = { scale, low, high: all[i + 2], atmospheres: [cones.ATMOSPHERES[i % cones.ATMOSPHERES.length]] };
      yield [
        `firing ${scale} ${low}`,
        {
          problem: run(() => cones.firingProblem(HOST, block)),
          clean: run(() => cones.cleanFiring(HOST, block)),
          bands: run(() => cones.firingBands(HOST, block)),
          inRange: all.filter((cone) => run(() => cones.inRange(HOST, block, scale, cone)) === true)
        }
      ];
    }
  }
}
