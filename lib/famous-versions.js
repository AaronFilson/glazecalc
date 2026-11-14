'use strict';

// A famous glaze's versions (docs/famous-glazes.md): the glaze made from the base materials sold in each
// of the library's regions, and a lead glaze from its lead-free version's own materials (leadFree.prefer).
// The build works them out (scripts/famous-glazes.mjs) and ships them with the glaze, so the page solves
// nothing. Each is solved for the glaze's target by the solver Target & Solve uses (lib/recipe/solve.js),
// on a meter that never cuts: the page's search in the browser stopped at about a second's work
// (lib/chemistry/fit.js WORK), the build's need not (the owner's decision, 2026-11-13).
const fs = require('node:fs');
const path = require('node:path');
const { OXIDE_GROUPS, calculateUMF, leadFreeTarget, newMeter } = require('./chemistry');
const { suggestable } = require('./recipe/library');
const { solveTarget, targetOf } = require('./recipe/solve');

/**
 * @typedef {import('./recipe/library').MaterialRecord} MaterialRecord
 * @typedef {import('./famous-versions').ResolvedGlaze} ResolvedGlaze
 * @typedef {import('./famous-versions').GlazeVersion} GlazeVersion
 */

/** The library's regions a version is made for, as the page offers them (client/app/shared/library-info.ts REGIONS). */
const VERSION_REGIONS = ['US', 'UK', 'EU', 'AU', 'JP'];
/** The kinds of material a base glaze is made of; colorants and the like come as additives. */
const BASE_KINDS = ['feldspar', 'clay', 'frit', 'boron', 'flux', 'silica', 'alumina'];

const isFlux = (oxide) => OXIDE_GROUPS[oxide] === 'R2O' || OXIDE_GROUPS[oxide] === 'RO';

/** @type {MaterialRecord[] | undefined} */
let standard;
/**
 * The standard materials as the app's bundle has them (client/app/pages/materials/standard-materials.ts): every
 * record of the file the database is seeded from (data/materials.ndjson), in its order, which settles the
 * solver's ties, with its id as text.
 * @returns {MaterialRecord[]}
 */
function standardMaterials() {
  standard ??= fs
    .readFileSync(path.join(__dirname, '..', 'data', 'materials.ndjson'), 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const { _id, ...rest } = JSON.parse(line);
      return { ...rest, _id: typeof _id === 'string' ? _id : _id.$oid };
    });
  return standard;
}

/**
 * The unity formula a version aims at: the native recipe's (its base, without the colorants), or for a lead
 * glaze its analysis with the lead's share of the fluxes handed to others (lib/chemistry leadFreeTarget) for
 * the lead-free version's firing. Tin and other oxides a colorant gives are left to the additives. Null with
 * nothing to aim at: a glaze with no recipe, unless it is a lead glaze with its analysis and lead-free version.
 * @param {ResolvedGlaze} glaze
 * @returns {Record<string, number> | null}
 */
function targetUnity(glaze) {
  if (!glaze.lead) {
    if (!glaze.recipe) return null;
    return calculateUMF(glaze.recipe.lines.map((line) => ({ material: line.record, amount: line.amount }))).umf;
  }
  if (!glaze.analysis || !glaze.leadFree) return null;
  const additiveOxides = new Set(
    glaze.leadFree.additives.flatMap((line) => (line.record.fields ?? []).map((field) => field.name))
  );
  const base = Object.fromEntries(
    Object.entries(glaze.analysis.oxides).filter(([oxide]) => !additiveOxides.has(oxide))
  );
  const { moles } = targetOf({ kind: 'analysis', oxides: base });
  const target = leadFreeTarget(moles, { celsius: glaze.leadFree.celsius });
  const fluxes = Object.entries(target).reduce((sum, [oxide, amount]) => (isFlux(oxide) ? sum + amount : sum), 0);
  return Object.fromEntries(Object.entries(target).map(([oxide, amount]) => [oxide, amount / fluxes]));
}

/**
 * The materials a version may use: for a region of the library (US, UK, EU, AU or JP), the standard
 * materials sold there that are current, have no lead, do not dissolve and are base materials; for ''
 * (no region chosen), a lead-free version's own (leadFree.prefer), or none.
 * @param {ResolvedGlaze} glaze
 * @param {string} library
 * @param {readonly MaterialRecord[]} [materials] the standard materials (standardMaterials if not given)
 * @returns {MaterialRecord[]}
 */
function offeredIn(glaze, library, materials = standardMaterials()) {
  if (!library) return [...(glaze.leadFree?.prefer ?? [])];
  return materials.filter(
    (material) =>
      BASE_KINDS.includes(material.category ?? '') && !material.soluble && suggestable(material, { region: library })
  );
}

/**
 * The glaze made from the materials offered, solved for its target on the meter given (one that never cuts
 * if not): each line as [the material's name, its percent of the base], as the solver writes it (one
 * decimal place), and how near it comes. Null with nothing to aim at or nothing offered; throws a
 * RecipeError as solveTarget does.
 * @param {ResolvedGlaze} glaze
 * @param {readonly MaterialRecord[]} offered
 * @param {import('./chemistry').Meter} [meter]
 * @returns {GlazeVersion | null}
 */
function versionOf(glaze, offered, meter = newMeter(Infinity)) {
  const target = targetUnity(glaze);
  if (!target || !offered.length) return null;
  const solved = solveTarget(
    { kind: 'unity', oxides: target },
    offered.map((material) => ({ material, must: false })),
    { meter }
  );
  return {
    lines: solved.materials.map((material) => [material.name, Number(material.amount)]),
    verdict: solved.report.closeness.verdict
  };
}

/** What a version is made from, for a message: "the EU library", or the lead-free version's own materials. */
const madeFrom = (library) => (library ? `the ${library} library` : "its lead-free version's own materials (prefer)");

/**
 * Every version of a glaze, by the region it is made for ('' for a lead-free version's own materials, when
 * it names them), and what keeps any from being shipped: a version that cannot be made (nothing to aim at,
 * nothing offered, or the solver's refusal) or whose search was cut short. Each search has a meter of its
 * own that never cuts, unless `work` bounds it (a test's).
 * @param {ResolvedGlaze} glaze
 * @param {{ materials?: readonly MaterialRecord[], work?: number }} [options]
 * @returns {{ versions: Record<string, GlazeVersion>, problems: string[] }}
 */
function glazeVersions(glaze, { materials = standardMaterials(), work = Infinity } = {}) {
  /** @type {Record<string, GlazeVersion>} */
  const versions = {};
  const problems = [];
  for (const library of ['', ...VERSION_REGIONS]) {
    const offered = offeredIn(glaze, library, materials);
    // With no region chosen, a glaze with no lead-free version of its own has none: the page asks where the reader buys.
    if (!library && !offered.length) continue;
    const meter = newMeter(work);
    let version;
    try {
      version = versionOf(glaze, offered, meter);
    } catch (error) {
      problems.push(`${glaze.slug}: no version from ${madeFrom(library)} (${error?.code ?? error})`);
      continue;
    }
    if (!version)
      problems.push(
        `${glaze.slug}: no version from ${madeFrom(library)}: ` +
          (offered.length ? "nothing to aim at (a recipe, or a lead glaze's analysis)" : 'no materials offered')
      );
    else if (meter.cut) problems.push(`${glaze.slug}: its version from ${madeFrom(library)} would be cut short`);
    else versions[library] = version;
  }
  return { versions, problems };
}

module.exports = { VERSION_REGIONS, glazeVersions, offeredIn, standardMaterials, targetUnity, versionOf };
