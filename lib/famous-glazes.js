'use strict';

// Famous glazes (docs/famous-glazes.md): one file per glaze in data/famous-glazes/<slug>.json, with its
// names, where and when it was made, its firing, its native recipe (the traditional local materials) or
// a historic analysis, its safety notes and the sources each part rests on. A glaze has a public page
// (/famous-glazes/<slug>) only once it is marked published AND meets the publish bar (publishProblems):
// three or more sources actually opened, every claim tied to one, every material resolvable, no gaps
// left open, and a lead glaze shown as history with a lead-free version. The test fixture in
// data/famous-glazes/fixtures/ meets the bar but is never published on the site.
const fs = require('node:fs');
const path = require('node:path');
const { MOLAR_MASS } = require('./chemistry');

const DATA = path.join(__dirname, '..', 'data');
/** Where the glazes' files are. */
const GLAZE_DIR = path.join(DATA, 'famous-glazes');
/** The tests' glaze, which meets the bar and is never on the site. */
const FIXTURE_DIR = path.join(GLAZE_DIR, 'fixtures');
/** A published glaze rests on at least this many sources, each actually opened. */
const MIN_SOURCES = 3;
/** Where a glaze's page is. */
const INDEX_PAGE = '/famous-glazes';
const glazePath = (slug) => INDEX_PAGE + '/' + slug;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ATMOSPHERES = ['oxidation', 'reduction', 'neutral', 'wood', 'salt', 'soda'];
/** The words on a page that come from the glaze's file, by field: each a map of language to text. */
const PROSE = ['origin', 'period', 'summary', 'safety'];

const ndjson = (file) =>
  fs
    .readFileSync(path.join(DATA, file), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

let library;
/** The standard materials and additives, by name and by each alias, case folded. */
function libraryRecords() {
  if (!library) {
    library = { materials: new Map(), additives: new Map() };
    for (const [kind, file] of [
      ['materials', 'materials.ndjson'],
      ['additives', 'additives.ndjson']
    ]) {
      for (const record of ndjson(file)) {
        const { _id, __v, ...rest } = record;
        void __v;
        const clean = { ...rest, _id: typeof _id === 'object' && _id ? _id.$oid : _id };
        for (const name of [record.name, ...(record.aliases ?? [])]) {
          const key = String(name).toLowerCase();
          if (!library[kind].has(key)) library[kind].set(key, clean);
        }
      }
    }
  }
  return library;
}

/**
 * Every glaze's file in a folder, in order of slug, each with the file's name as `file`.
 * @param {string} [dir]
 */
function loadGlazes(dir = GLAZE_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => ({ ...JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf8')), file: entry.name }))
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
}

/** A material of the glaze's recipe: the standard library's, by name or alias (the glaze is kept for the call's shape). */
function findMaterial(_glaze, name, kind) {
  return libraryRecords()[kind].get(String(name).toLowerCase());
}

const isProse = (value) =>
  !!value &&
  typeof value === 'object' &&
  typeof value.en === 'string' &&
  value.en.trim() !== '' &&
  Object.values(value).every((text) => typeof text === 'string');

const oxideProblems = (label, oxides) => {
  const problems = [];
  if (!oxides || typeof oxides !== 'object' || !Object.keys(oxides).length) return [`${label}: no oxides`];
  for (const [oxide, amount] of Object.entries(oxides)) {
    if (!(oxide in MOLAR_MASS)) problems.push(`${label}: ${oxide} is not an oxide the app knows`);
    if (typeof amount !== 'number' || !(amount >= 0)) problems.push(`${label}: ${oxide} is not an amount`);
  }
  return problems;
};

/** The materials a glaze's recipe names that the standard library does not have (yet). */
const missingMaterials = (glaze) => [
  ...(glaze.recipe?.lines ?? []).filter((l) => !findMaterial(glaze, l.material, 'materials')).map((l) => l.material),
  ...(glaze.recipe?.additives ?? []).filter((l) => !findMaterial(glaze, l.material, 'additives')).map((l) => l.material)
];

/** Whether a glaze's recipe or analysis has lead in it. */
function hasLead(glaze) {
  const inAnalysis = (glaze.analysis?.oxides?.PbO ?? 0) > 0;
  const inRecipe = [...(glaze.recipe?.lines ?? []), ...(glaze.recipe?.additives ?? [])].some((line) => {
    const record = findMaterial(glaze, line.material, 'materials') ?? findMaterial(glaze, line.material, 'additives');
    return (record?.fields ?? []).some((field) => field.name === 'PbO' && Number(field.amount) > 0);
  });
  return inAnalysis || inRecipe;
}

/**
 * What is wrong with a glaze's file whether or not it is published: its shape, its names, every material
 * of its recipe found, every source it names listed. Empty when it is sound.
 * @param {any} glaze
 * @returns {string[]}
 */
function glazeProblems(glaze) {
  const problems = [];
  const label = glaze.file ?? glaze.slug ?? 'a glaze';
  if (typeof glaze.slug !== 'string' || !SLUG.test(glaze.slug)) problems.push(`${label}: its slug is not an address`);
  if (glaze.file && glaze.file !== glaze.slug + '.json') problems.push(`${label}: the file is not named for its slug`);
  if (typeof glaze.published !== 'boolean') problems.push(`${label}: published is not true or false`);
  if (!isProse(glaze.names)) problems.push(`${label}: names has no English`);
  if (!glaze.native || typeof glaze.native.name !== 'string' || typeof glaze.native.lang !== 'string')
    problems.push(`${label}: no native name and its language`);
  for (const field of PROSE) {
    if (glaze[field] !== undefined && !isProse(glaze[field])) problems.push(`${label}: ${field} has no English`);
  }
  const ids = new Set();
  for (const source of glaze.sources ?? []) {
    if (!source.id || ids.has(source.id)) problems.push(`${label}: a source has no id of its own`);
    ids.add(source.id);
    if (typeof source.citation !== 'string' || !source.citation.trim())
      problems.push(`${label}: source ${source.id} has no citation`);
    if (source.opened !== undefined && !DATE.test(source.opened))
      problems.push(`${label}: source ${source.id} has no date it was opened`);
  }
  const cites = (what, list) => {
    for (const id of list ?? []) if (!ids.has(id)) problems.push(`${label}: ${what} cites ${id}, which is not listed`);
  };
  if (glaze.firing) {
    if (glaze.firing.atmosphere !== undefined && !ATMOSPHERES.includes(glaze.firing.atmosphere))
      problems.push(`${label}: the firing's atmosphere is not one of ${ATMOSPHERES.join(', ')}`);
    if (glaze.firing.temperatureUnknown !== undefined && typeof glaze.firing.temperatureUnknown !== 'boolean')
      problems.push(`${label}: the firing's temperatureUnknown is not true or false`);
    if (glaze.firing.note !== undefined && !isProse(glaze.firing.note))
      problems.push(`${label}: the firing's note has no English`);
    cites('the firing', glaze.firing.sources);
  }
  // The owner's decision: no materials of the glazes' own; every one is the standard library's.
  if (glaze.records !== undefined) problems.push(`${label}: a glaze has no records of its own; use the library's`);
  if (glaze.recipe) {
    if (!Array.isArray(glaze.recipe.lines) || !glaze.recipe.lines.length)
      problems.push(`${label}: the recipe has no materials`);
    for (const list of [glaze.recipe.lines ?? [], glaze.recipe.additives ?? []]) {
      for (const line of list) {
        if (typeof line.material !== 'string') problems.push(`${label}: a recipe line names no material`);
        if (typeof line.amount !== 'number' || !(line.amount > 0))
          problems.push(`${label}: ${line.material} has no amount`);
      }
    }
    // As the lead-free version: a recipe not test-fired yet is shown marked so.
    if (glaze.recipe.tested !== undefined && typeof glaze.recipe.tested !== 'boolean')
      problems.push(`${label}: the recipe's tested is not true or false`);
    if (glaze.recipe.note !== undefined && !isProse(glaze.recipe.note))
      problems.push(`${label}: the recipe's note has no English`);
    cites('the recipe', glaze.recipe.sources);
  }
  if (glaze.analysis) {
    problems.push(...oxideProblems(`${label} analysis`, glaze.analysis.oxides));
    cites('the analysis', glaze.analysis.sources);
  }
  if (!glaze.recipe && !glaze.analysis) problems.push(`${label}: neither a recipe nor an analysis`);
  if (glaze.leadFree) {
    const version = glaze.leadFree;
    // The owner's decision: a calculated version is shown marked "calculated, not yet test-fired".
    if (typeof version.tested !== 'boolean')
      problems.push(`${label}: the lead-free version does not say if it was tested`);
    if (!(version.celsius > 0)) problems.push(`${label}: the lead-free version has no firing temperature`);
    for (const line of version.additives ?? []) {
      if (!findMaterial(glaze, line.material, 'additives'))
        problems.push(`${label}: ${line.material} is not a standard additive`);
    }
    for (const name of version.prefer ?? []) {
      if (!findMaterial(glaze, name, 'materials')) problems.push(`${label}: ${name} is not a standard material`);
    }
  }
  return problems;
}

/**
 * Why a glaze may not be published yet (the publish bar, docs/famous-glazes.md); empty when it may.
 * @param {any} glaze
 * @returns {string[]}
 */
function publishProblems(glaze) {
  const problems = [...glazeProblems(glaze)];
  const label = glaze.file ?? glaze.slug;
  const opened = (glaze.sources ?? []).filter(
    (source) => DATE.test(source.opened ?? '') && (source.url || source.isbn) && source.citation
  );
  if (opened.length < MIN_SOURCES)
    problems.push(`${label}: ${opened.length} source(s) opened, with an address or ISBN; at least ${MIN_SOURCES}`);
  for (const name of missingMaterials(glaze))
    problems.push(`${label}: ${name} is not in the standard library yet (data/materials.ndjson, additives.ndjson)`);
  if ((glaze.gaps ?? []).length) problems.push(`${label}: ${glaze.gaps.length} gap(s) still open`);
  // A temperature no source documents is said so (temperatureUnknown) in the firing's note, never guessed.
  const temperature =
    glaze.firing &&
    (glaze.firing.celsius ||
      glaze.firing.cone ||
      (glaze.firing.temperatureUnknown === true && isProse(glaze.firing.note)));
  if (!glaze.firing || !temperature || !glaze.firing.atmosphere)
    problems.push(
      `${label}: no firing (a temperature or cone, or temperatureUnknown with a note saying so, and an atmosphere)`
    );
  else if (!(glaze.firing.sources ?? []).length) problems.push(`${label}: the firing cites no source`);
  if (glaze.recipe && !(glaze.recipe.sources ?? []).length) problems.push(`${label}: the recipe cites no source`);
  if (glaze.analysis && !(glaze.analysis.sources ?? []).length) problems.push(`${label}: the analysis cites no source`);
  for (const field of ['origin', 'period', 'summary', 'safety']) {
    if (!isProse(glaze[field])) problems.push(`${label}: no ${field}`);
  }
  if (hasLead(glaze)) {
    // The owner's decision: a lead glaze is history, its analysis alone, with a lead-free version beside it.
    if (!glaze.history) problems.push(`${label}: has lead, so it is shown as history only (history: true)`);
    if (glaze.recipe) problems.push(`${label}: has lead, so no recipe to mix is shown`);
    if (!glaze.leadFree || !isProse(glaze.leadFree.note))
      problems.push(`${label}: has lead, so it needs its lead-free version (leadFree.note)`);
  }
  return problems;
}

/**
 * The glazes on the site: published, meeting the bar, and not the tests' fixture.
 * @param {any[]} [glazes]
 */
const publishedGlazes = (glazes = loadGlazes()) =>
  glazes.filter((glaze) => glaze.published === true && !glaze.fixture && !publishProblems(glaze).length);

/**
 * The pages of the glazes given: the index and one per glaze, or none at all while none is published
 * (the index is hidden until there is one).
 * @param {ReadonlyArray<{ slug: string }>} glazes
 * @returns {string[]}
 */
const famousGlazePages = (glazes) => (glazes.length ? [INDEX_PAGE, ...glazes.map((g) => glazePath(g.slug))] : []);

/**
 * Whether a glaze's own words (its name, origin, period, summary, safety and its notes) are in a
 * language; English always is.
 * @param {any} glaze
 * @param {string} code
 */
function glazeTranslatedIn(glaze, code) {
  if (code === 'en') return true;
  const prose = [
    glaze.names,
    ...PROSE.map((field) => glaze[field]),
    glaze.firing?.note,
    glaze.recipe?.note,
    glaze.analysis?.note,
    glaze.leadFree?.note
  ].filter(Boolean);
  return prose.every((text) => typeof text[code] === 'string' && text[code].trim() !== '');
}

/**
 * A glaze as its page reads it (/i18n/famous-glazes/<language>.json, glazeIn, scripts/famous-glazes.mjs): each
 * material of its recipe as its full record, so the page needs no other request.
 * @param {any} glaze
 */
function resolveGlaze(glaze) {
  const { file, gaps, fixture, ...rest } = glaze;
  void file;
  void gaps;
  void fixture;
  const line = (kind) => (entry) => ({
    record: findMaterial(glaze, entry.material, kind),
    amount: entry.amount
  });
  return {
    ...rest,
    lead: hasLead(glaze),
    recipe: glaze.recipe
      ? {
          ...glaze.recipe,
          lines: glaze.recipe.lines.map(line('materials')),
          additives: (glaze.recipe.additives ?? []).map(line('additives'))
        }
      : null,
    analysis: glaze.analysis ?? null,
    leadFree: glaze.leadFree
      ? {
          ...glaze.leadFree,
          additives: (glaze.leadFree.additives ?? []).map(line('additives')),
          prefer: (glaze.leadFree.prefer ?? []).map((name) => findMaterial(glaze, name, 'materials'))
        }
      : null
  };
}

/** Whether a value is a glaze's prose: text by language, English always. */
const proseShaped = (value) =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  typeof value.en === 'string' &&
  Object.values(value).every((text) => typeof text === 'string');

/**
 * A resolved glaze (resolveGlaze) for the pages in one language: each piece of its prose kept in English
 * and in that language only, so the page shows the language's words or the English, marked as such. The
 * materials' records and everything else stay as they are. Every page carries the file it loads
 * (Angular's transfer state), so it holds one language, not all of them.
 * @param {any} resolved
 * @param {string} code
 */
function glazeIn(resolved, code) {
  const walk = (value, key) => {
    if (key === 'record' || key === 'prefer') return value;
    if (proseShaped(value)) {
      const kept = { en: value.en };
      if (code !== 'en' && typeof value[code] === 'string' && value[code].trim()) kept[code] = value[code];
      return kept;
    }
    if (Array.isArray(value)) return value.map((item) => walk(item));
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, k)]));
    return value;
  };
  return walk(resolved);
}

module.exports = {
  ATMOSPHERES,
  FIXTURE_DIR,
  GLAZE_DIR,
  INDEX_PAGE,
  MIN_SOURCES,
  famousGlazePages,
  glazeIn,
  glazePath,
  glazeProblems,
  glazeTranslatedIn,
  hasLead,
  loadGlazes,
  publishProblems,
  publishedGlazes,
  resolveGlaze
};
