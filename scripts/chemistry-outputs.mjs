// What the chemistry gives, kept as a hash of each output: the check that a change moves no answer unless it
// means to. It runs the app's chemistry (lib/chemistry, lib/recipe, lib/cones) over the standard materials, the
// famous glazes in every region, seeded recipes of standard materials, and the text, cones and slurries a potter
// types, and compares each output's hash with scripts/chemistry-outputs.json. A change that should move nothing
// (a refactor, a table moved to another module) leaves every hash as it was. One that moves some says which, and
// why, in its PR, and records them with --write.
//
//   node scripts/chemistry-outputs.mjs          compares with the kept hashes; fails on any difference
//   node scripts/chemistry-outputs.mjs --write  keeps the hashes as they are now
//   node scripts/chemistry-outputs.mjs --rows   prints each output in full, "key<TAB>JSON" a line, to compare two
//                                               checkouts: diff <(node scripts/chemistry-outputs.mjs --rows) <(...)
//
// The tables the app exports are outputs too, so a table moved elsewhere has to come back as it was, in its order.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const KEPT = path.join(ROOT, 'scripts', 'chemistry-outputs.json');

const chemistry = require('../lib/chemistry/index.js');
const messages = require('../lib/chemistry/messages.js');
const recipe = require('../lib/recipe/index.js');
const recipeMessages = require('../lib/recipe/messages.js');
const cones = require('../lib/cones/index.js');
const firing = require('../lib/cones/firing.js');
const coneResults = require('../lib/cones/results.js');
const data = require('../data/index.js');
const famous = require('../lib/famous-glazes.js');
const { REGION_CODES } = require('../lib/regions/index.js');

/** An output as text: its JSON, as JSON.stringify writes it, so a key moved within an object is a difference. */
const textOf = (value) => JSON.stringify(value) ?? 'undefined';

/** The hash kept for an output: the first 16 hex digits of the SHA-256 of its text. */
export const hashOf = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

/** What a call gives, or what it threw: its code and values, or for an error with no code its name and message. */
const run = (work) => {
  try {
    return work();
  } catch (error) {
    if (error?.code) return { threw: error.code, ...(error.params && { params: error.params }) };
    return { threw: error?.name ?? 'Error', message: String(error?.message ?? error) };
  }
};

/** The same outputs, every time: a linear congruential generator from a fixed seed. */
const seeded = (seed) => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

const plain = (records) => JSON.parse(JSON.stringify(records));
const BANDS = ['low', 'mid', 'high'];
const CELSIUS = { low: 1000, mid: 1222, high: 1285 };

/** Each output as [key, value], in a fixed order. */
export function* outputs() {
  const standard = plain(data.load('materials'));
  const additives = plain(data.load('additives'));
  const byName = new Map();
  for (const m of standard) for (const n of [m.name, ...(m.aliases ?? [])]) byName.set(String(n).toLowerCase(), m);
  const find = (name) => byName.get(String(name).toLowerCase());

  yield* tables();
  yield* materials(standard, additives);

  // The recipes: the famous glazes in every region, then seeded ones in a spread of regions.
  const recipes = [];
  for (const glaze of famous.loadGlazes()) {
    if (!glaze.recipe) continue;
    const lines = glaze.recipe.lines
      .map((line) => ({ record: find(line.material), amount: line.amount }))
      .filter((line) => line.record)
      .map((line) => ({ ...line.record, amount: String(line.amount) }));
    if (lines.length) recipes.push({ key: glaze.slug, lines, regions: REGION_CODES });
  }
  const random = seeded(20261116);
  const someRegions = REGION_CODES.filter((_, i) => i % 9 === 0);
  for (let i = 0; i < 150; i++) {
    const lines = [];
    const n = 3 + Math.floor(random() * 4);
    for (let j = 0; j < n; j++) {
      const m = standard[Math.floor(random() * standard.length)];
      if (!lines.some((line) => line.name === m.name))
        lines.push({ ...m, amount: String(Math.round(random() * 400) / 10 + 1) });
    }
    recipes.push({ key: 'random ' + i, lines, regions: someRegions });
  }

  const shelves = new Map();
  const shelfIn = (region) => {
    if (!shelves.has(region))
      shelves.set(
        region,
        standard
          .filter((m) => recipe.suggestable(m, { region }))
          .map((material) => ({ material: { ...material, amount: '' }, must: false }))
      );
    return shelves.get(region);
  };

  let before = null;
  for (const { key, lines, regions } of recipes) {
    const recipeLines = lines.map((line) => ({ material: line, amount: line.amount }));
    const umf = run(() => chemistry.calculateUMF(recipeLines));
    const unity = umf.umf ?? {};
    const analysis = umf.umf ? { ...umf, uList: umf.umf } : null;
    yield [`${key} unity`, umf];
    yield [
      `${key} chemistry`,
      {
        worked: run(() => recipe.workedCalculation(recipeLines)),
        expansion: run(() => recipe.expansionOf(lines)),
        stull: run(() => recipe.stullPoint(unity)),
        molePercent: run(() => recipe.molePercent(unity)),
        silicaAlumina: run(() => analysis && recipe.silicaAluminaRatio(analysis)),
        compared: run(() => recipe.compareUnity(analysis, before)),
        drySg: run(() => recipe.recipeDrySg(lines)),
        rawClay: run(() => recipe.rawClayPercent(lines)),
        barium: run(() => recipe.bariumIn(lines)),
        lead: run(() => recipe.leadIn(lines)),
        hasLead: run(() => recipe.recipeHasLead(lines)),
        closeness: run(() => chemistry.closeness(unity, unity)),
        leadFree: run(() => chemistry.leadFreeTarget(unity, { celsius: CELSIUS.low }))
      }
    ];
    before = analysis;
    for (const band of BANDS) {
      yield [
        `${key} ${band}`,
        {
          coneFit: run(() => recipe.coneFit(unity, band)),
          limits: Object.fromEntries(
            Object.entries(recipe.LIMIT_SETS).map(([name, set]) => [
              name,
              run(() => recipe.limitRows(unity, set, band))
            ])
          ),
          cautions: run(() =>
            recipe.pastLimits({ lines: recipeLines, unity, celsius: CELSIUS[band], band, additives })
          ),
          sizes: run(() => recipe.sizeNotes(recipeLines, band === 'low'))
        }
      ];
    }
    yield [`${key} text`, targetTexts(unity)];
    const lead = lines.some((line) => recipe.hasLead(line));
    for (const region of regions) {
      const shelf = shelfIn(region);
      const row = {
        modern: run(() => recipe.modernMaterials(lines, find, region)),
        match: run(() => recipe.matchFromShelf(lines, shelf))
      };
      if (umf.umf)
        row.solve = run(() =>
          recipe.solveTarget({ kind: 'unity', oxides: umf.umf }, shelf, { celsius: CELSIUS.mid, band: 'mid' })
        );
      if (lead) {
        const bases = run(() => recipe.leadFreeBases(lines, additives, find, standard, region, CELSIUS.low));
        row.bases = bases;
        if (Array.isArray(bases) && bases.length)
          row.replaced = run(() =>
            recipe.replaceLead(lines, additives, find, standard, region, {
              base: bases[0].name,
              celsius: CELSIUS.low,
              mode: 'rebuild'
            })
          );
      }
      yield [`${key} ${region}`, row];
    }
  }

  yield* blends(recipes);
  yield* slurries();
  yield* coneOutputs();
  yield* firingText();
  yield* pastes(recipes, standard);
  yield* numbers();
  yield* english();
}

/** The tables the app exports, each as it is. */
function* tables() {
  const kept = {
    chemistry: [
      'ATOMIC_WEIGHTS',
      'MOLAR_MASS',
      'OXIDE_GROUPS',
      'EXPANSION',
      'CONES',
      'FORMULA_MATERIALS',
      'MESSAGES',
      'WORK',
      'WORK_CEILING'
    ],
    recipe: [
      'BLEND_CORNERS',
      'BLEND_STEPS',
      'CHECK_LIMITS',
      'CODES',
      'CONE_FIT',
      'CONE_FIT_SOURCES',
      'UNITY_COLUMNS',
      'DEFAULT_LIMIT_SET',
      'SG_TARGET_RANGE',
      'FIRING',
      'FIRING_BANDS',
      'GRAMS_PER_KG',
      'GLAZECALC_LIMITS',
      'HESSELBERTH_ROY_LIMITS',
      'LIKE_FOR_LIKE_GRAMS',
      'LIMIT_SETS',
      'LITRES',
      'STULL',
      'PASTE_LIMITS',
      'SOLVE_BATCH'
    ],
    cones: ['SK', 'ORTON'],
    firing: ['SCALES', 'ATMOSPHERES', 'PROCESSES', 'FIRING_LIMITS', 'SK_MEASURED'],
    coneResults: ['CONE_RESULTS']
  };
  const modules = { chemistry, recipe, cones, firing, coneResults };
  for (const [module, names] of Object.entries(kept))
    for (const name of names) yield [`table ${module}.${name}`, modules[module][name]];
  yield ['table cones.texts()', cones.texts()];
}

/** What the chemistry makes of each standard material and additive on its own. */
function* materials(standard, additives) {
  for (const m of standard) {
    yield [
      `material ${m.uuid}`,
      {
        weights: run(() => chemistry.materialWeights(m)),
        sg: run(() => recipe.materialSg(m)),
        rawClay: recipe.isRawClay(m),
        ideal: recipe.isIdealMineral(m),
        lead: recipe.hasLead(m),
        role: run(() => recipe.roleOf(m)),
        given: run(() => chemistry.oxidesGivenIn(m)),
        hazards: run(() => recipe.hazardsOf([m])),
        regions: REGION_CODES.filter((region) => recipe.suggestable(m, { region })),
        names: [m.name, ...(m.aliases ?? [])].map((name) => [recipe.foldedName(name), recipe.compactName(name)])
      }
    ];
  }
  for (const a of additives) {
    yield [
      `additive ${a.uuid}`,
      {
        weights: run(() => chemistry.materialWeights(a)),
        sg: run(() => recipe.materialSg(a)),
        hazards: run(() => recipe.hazardsOf([a]))
      }
    ];
  }
  for (const material of chemistry.FORMULA_MATERIALS)
    yield [`formula ${material.name}`, run(() => chemistry.formulaToAnalysis(material.formula))];
  for (const oxide of Object.keys(chemistry.OXIDE_GROUPS))
    yield [`oxide ${oxide}`, { text: chemistry.formatFormula(oxide), column: run(() => recipe.unityColumnOf(oxide)) }];
}

/** A unity formula as a potter might type it, in four ways, and what parseTarget reads of each. */
function targetTexts(unity) {
  const entries = Object.entries(unity).filter(([, amount]) => amount > 0);
  const k = unity.K2O ?? 0;
  const na = unity.Na2O ?? 0;
  const together = entries.filter(([oxide]) => oxide !== 'K2O' && oxide !== 'Na2O');
  if (k + na > 0) together.unshift(['KNaO', k + na]);
  const texts = [
    entries.map(([oxide, amount]) => `${amount.toFixed(3)} ${oxide}`).join('\n'),
    entries.map(([oxide, amount]) => `${oxide} ${amount.toFixed(2)}`).join(', '),
    entries.map(([oxide, amount]) => `${chemistry.formatFormula(oxide)} ${amount.toFixed(3)}`).join('  '),
    together.map(([oxide, amount]) => `${oxide}: ${amount.toFixed(2)}`).join('; ')
  ];
  return texts.map((text) => ({ text, read: run(() => recipe.parseTarget(text)) }));
}

/** Blend layouts of every size, recipes mixed at their tiles, and a material varied. */
function* blends(recipes) {
  for (const [kind, { min, max }] of Object.entries(recipe.BLEND_STEPS))
    for (let steps = min - 1; steps <= max + 1; steps++) {
      const layout = run(() => recipe.blendTiles(kind, steps));
      const corners = recipes.slice(steps, steps + recipe.BLEND_CORNERS[kind]).map(({ lines }) => ({
        materials: lines.map((line) => ({ name: line.name, amount: line.amount, fields: line.fields, loi: line.loi }))
      }));
      const mixed = (layout?.tiles ?? []).map((tile) => run(() => recipe.mixRecipes(corners, tile.shares)));
      yield [`blend ${kind} ${steps}`, { layout, mixed }];
    }
  for (const { key, lines } of recipes.slice(0, 20)) {
    const base = lines.map((line) => ({ name: line.name, amount: Number(line.amount) }));
    const material = lines[0].name;
    yield [
      `vary ${key}`,
      {
        add: run(() => recipe.varyMaterial(base, 'Silica', [1, 2.5, 5, 10, 40], 'add')),
        replace: run(() => recipe.varyMaterial(base, 'Silica', [5, 10, 20], 'replace', material)),
        much: run(() => recipe.varyMaterial(base, material, [200], 'replace'))
      }
    ];
  }
}

/** The slurry tools over the readings a potter takes. */
function* slurries() {
  for (const dry of [2.2, 2.6, 3]) {
    const rows = [];
    for (const sg of [0.9, 1, 1.15, 1.3, 1.45, 1.6, 1.8, 2.6]) {
      rows.push({
        sg,
        perLitre: run(() => recipe.dryPerLitre(sg, dry)),
        contents: run(() => recipe.slurryContents(5, sg, dry)),
        toReach: [1.2, 1.45, 1.7].map((target) => run(() => recipe.waterToReach(5, sg, target, dry))),
        forBatch: run(() => recipe.waterForBatch(1000, sg, dry)),
        forVolume: run(() => recipe.batchForVolume(10, sg, dry)),
        baume: run(() => recipe.baumeFromSg(sg)),
        pint: run(() => recipe.pintFromSg(sg))
      });
    }
    yield [`slurry dry ${dry}`, rows];
  }
  yield [
    'slurry readings',
    [0, 10, 35, 50, 70].map((reading) => ({
      fromBaume: run(() => recipe.sgFromBaume(reading)),
      fromPint: run(() => recipe.sgFromPint(reading * 0.5))
    }))
  ];
}

/** Every cone of every scale: its place, temperature, band and match on the other scales; and firing blocks. */
function* coneOutputs() {
  for (const scale of firing.SCALES) {
    const choices = firing.coneChoices(scale);
    const all = choices.flatMap((group) => group.cones);
    yield [
      `cones ${scale}`,
      {
        choices,
        each: all.map((cone) => ({
          cone,
          is: firing.isCone(scale, cone),
          ordinal: run(() => firing.ordinal(scale, cone)),
          celsius: run(() => firing.approxCelsius(scale, cone)),
          band: run(() => firing.coneBand(scale, cone)),
          label: firing.coneLabel(cone),
          others: firing.SCALES.map((to) => run(() => firing.approxCone(scale, cone, to))),
          any: coneResults.isAnyCone(cone)
        })),
        between: all.map((low, i) => run(() => firing.conesBetween(scale, low, all[Math.min(all.length - 1, i + 3)]))),
        compared: all.slice(1).map((cone, i) => firing.compareCones(scale, all[i], cone))
      }
    ];
    for (const [i, low] of all.entries()) {
      if (i % 4) continue;
      for (const high of new Set([undefined, all[i + 2], all[i - 1]])) {
        const block = {
          scale,
          low,
          ...(high && { high }),
          atmospheres: [firing.ATMOSPHERES[i % firing.ATMOSPHERES.length]],
          ...(i % 8 === 0 && { processes: [firing.PROCESSES[i % firing.PROCESSES.length]] }),
          ...(high && { tested: [low] })
        };
        yield [
          `firing ${scale} ${low} ${high ?? ''}`,
          {
            problem: run(() => firing.firingProblem(block)),
            clean: run(() => firing.cleanFiring(block)),
            bands: run(() => firing.firingBands(block)),
            tested: run(() => firing.testedCones(block)),
            stated: run(() => firing.isStated(block)),
            inRange: all.filter((cone) => run(() => firing.inRange(block, scale, cone)) === true),
            matches: all.filter((cone) => run(() => firing.matchesCone(block, scale, cone)) === true),
            glazy: run(() => firing.glazyFiring(block)),
            cell: run(() => firing.glazyConeCell(block))
          }
        ];
      }
    }
  }
  const broken = [null, {}, { scale: 'orton' }, { scale: 'nope', low: '6' }, { scale: 'orton', low: '6', high: '4' }];
  yield ['firing problems', broken.map((block) => run(() => firing.firingProblem(block)))];
}

/** Firing text as potters write it, read with a point and with a comma for decimals. */
function* firingText() {
  const lines = [
    'Cone 6 oxidation',
    '^6 ox',
    'Δ10 reduction',
    'C/6 electric',
    'cone 04-06',
    'Cone 5½',
    'cone 6 to 7',
    'SK 8',
    'SK 6a',
    '1222°C',
    '1222 °C (cone 6)',
    '2232°F',
    'Firing: cone 6 (1222 °C), oxidation',
    'cone 10 reduction, wood',
    'Bisque 04, glaze 6',
    'Raku',
    'mid-fire',
    '1.222,5 °C',
    'cone 6, 1.222,5 °C',
    'Silica 20'
  ];
  for (const decimalComma of [false, true])
    yield [
      `firing text ${decimalComma ? 'comma' : 'point'}`,
      lines.map((line) => ({
        line,
        firing: run(() => firing.readFiring(line, { decimalComma })),
        isLine: run(() => firing.isFiringLine(line, { decimalComma })),
        orton: run(() => firing.readCone(line, 'orton')),
        sk: run(() => firing.readCone(line, 'sk')),
        skToken: run(() => firing.skCone(line))
      }))
    ];
}

/** Recipes pasted as potters paste them, read as the import page reads them. */
function* pastes(recipes, standard) {
  const names = new Set(standard.flatMap((m) => [m.name, ...(m.aliases ?? [])]).map(recipe.foldedName));
  const match = recipe.nameMatcher();
  const options = (locale, mark) => ({
    locale,
    mark,
    isName: (text) => names.has(recipe.foldedName(text)),
    known: (text) => match(text, standard).how !== 'none'
  });
  for (const { key, lines } of recipes.slice(0, 40)) {
    const comma = (amount) => String(amount).replace('.', ',');
    const texts = {
      plain: lines.map((line) => `${line.name} ${line.amount}`).join('\n'),
      titled: [
        `${key} glaze`,
        'Cone 6 oxidation',
        ...lines.map((line) => `${line.amount}\t${line.name}`),
        'Total 100'
      ].join('\n'),
      grams: lines.map((line) => `${line.name}: ${line.amount} g`).join('\n'),
      comma: lines.map((line) => `${line.name} ${comma(line.amount)}`).join('\n')
    };
    const read = Object.fromEntries(
      Object.entries(texts).map(([how, text]) => {
        const pasted = run(() =>
          recipe.parsePaste(text, how === 'comma' ? options('de', 'comma') : options('en', 'point'))
        );
        return [
          how,
          { pasted, amounts: Array.isArray(pasted) ? pasted.map((p) => run(() => recipe.importAmounts(p))) : null }
        ];
      })
    );
    const likeness = lines.map((line) => recipe.likeness(line.name.toLowerCase().replace(/[aeiou]/, ''), line.name));
    yield [`paste ${key}`, { read, likeness, ambiguous: recipe.ambiguousNumbers(texts.comma, 'either') }];
  }
}

/** Numbers as typed in each kind of locale, with each decimal mark. */
function* numbers() {
  const typed = [
    '0.25',
    '1,5',
    '1.500',
    '1,500',
    '1 500',
    '1 500,25',
    '12.345,6',
    '½',
    '1½',
    '-2',
    '1e3',
    '٠٫٥',
    '१२',
    '',
    'x'
  ];
  for (const locale of ['en', 'de', 'fr', 'ar', 'hi', 'ja'])
    for (const mark of ['either', 'comma', 'point'])
      yield [`numbers ${locale} ${mark}`, typed.map((text) => run(() => recipe.parseNumber(text, mark, locale)))];
}

/** The English of every code, with a value in each place it names. */
function* english() {
  const sample = (text) =>
    Object.fromEntries(
      [...String(text).matchAll(/\{(\w+)/g)].map(([, name], i) => [name, i % 2 ? 1.23456 : `<${name}>`])
    );
  yield [
    'english chemistry',
    Object.entries(messages.MESSAGES).map(([code, text]) => messages.english(code, sample(text)))
  ];
  // The recipe tools' English is the app's (client/public/i18n). They give a code and values, and the values'
  // figures are written in the reader's locale.
  const figures = [
    recipe.figure(12.5, 1),
    recipe.figure(1 / 3, 3),
    recipe.upTo(1234.5678, 2),
    recipe.upTo(5, 2),
    recipe.plainFigure('12.50'),
    recipe.plainFigure('abc')
  ];
  const values = Object.fromEntries(figures.map((value, i) => ['v' + i, value]));
  yield [
    'message values',
    ['en', 'de', 'fr', 'ar', 'hi', 'ja'].map((locale) =>
      recipe.paramsText(recipeMessages.say(recipe.CODES[0], values), locale)
    )
  ];
}

/** The hashes now, as an object of key to hash, in the order the outputs come. */
export function hashes(rows = outputs()) {
  const now = {};
  for (const [key, value] of rows) {
    if (Object.hasOwn(now, key)) throw new Error(`Two outputs have the key ${key}`);
    now[key] = hashOf(textOf(value));
  }
  return now;
}

/** What differs from the kept hashes: outputs whose hash changed, outputs gone, and outputs new. */
export function compare(kept, now) {
  const changed = Object.keys(now).filter((key) => Object.hasOwn(kept, key) && kept[key] !== now[key]);
  const gone = Object.keys(kept).filter((key) => !Object.hasOwn(now, key));
  const added = Object.keys(now).filter((key) => !Object.hasOwn(kept, key));
  return { changed, gone, added, same: !changed.length && !gone.length && !added.length };
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  if (process.argv.includes('--rows')) {
    for (const [key, value] of outputs()) process.stdout.write(`${key}\t${textOf(value)}\n`);
  } else if (process.argv.includes('--write')) {
    const now = hashes();
    writeFileSync(KEPT, JSON.stringify(now, null, 2) + '\n');
    console.log(`Kept ${Object.keys(now).length} outputs in scripts/chemistry-outputs.json`);
  } else {
    const { changed, gone, added, same } = compare(JSON.parse(readFileSync(KEPT, 'utf8')), hashes());
    if (same) {
      console.log('Every output of the chemistry is as kept.');
    } else {
      const list = (what, keys) =>
        keys.length && console.error(`${keys.length} ${what}:\n  ${keys.slice(0, 40).join('\n  ')}`);
      list('outputs changed', changed);
      list('outputs gone', gone);
      list('outputs new', added);
      console.error(
        'If the change means to move them, say why in the PR and keep them: node scripts/chemistry-outputs.mjs --write.\n' +
          'To see what moved, compare the full outputs of two checkouts: node scripts/chemistry-outputs.mjs --rows.\n' +
          `Numbers read and written in a locale follow Node's CLDR data, here ${process.versions.cldr} (Node ${process.version}).`
      );
      process.exit(1);
    }
  }
}
