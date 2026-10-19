'use strict';

// What a recipe came out like at each cone and atmosphere it was fired in
// (docs/adr/0021-recipe-firing.md, "Result cards"): the potter's summary for a
// cone and, where the recipe states atmospheres, one of them, saved on the
// recipe as coneResults; and where a linked firing log was fired, read from
// the log when it says so clearly.
//
// A result is { cone, atmosphere?, summary }: the cone exactly as the firing
// block writes it ('6', '06', '5.5', SK '6a', '1240' for a temperature), with
// no scale of its own (the recipe's scale reads it), the atmosphere one of
// oxidation, reduction or neutral, and the summary the potter's own words. A
// result whose cone or atmosphere is outside a firing stated later is kept,
// and the page says it is outside.

const { ATMOSPHERES, SCALES, conesBetween, conesFromLog, isCone } = require('./firing');

/** Bounds of what the results hold: a summary's characters, results a recipe keeps, a cone's characters. */
const CONE_RESULTS = Object.freeze({ summary: 1000, most: 100, cone: 8 });

/** A cone in one of the scales, as a firing block would write it. */
const isAnyCone = (cone) =>
  typeof cone === 'string' && cone.length <= CONE_RESULTS.cone && SCALES.some((scale) => isCone(scale, cone));

const absent = (value) => value === undefined || value === null || value === '';

/** Why a list of results cannot be saved ('list', 'most', 'entry', 'cone', 'atmosphere', 'summary'), or null. */
function coneResultsProblem(list) {
  if (!Array.isArray(list)) return 'list';
  if (list.length > CONE_RESULTS.most) return 'most';
  for (const entry of list) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return 'entry';
    if (!isAnyCone(entry.cone)) return 'cone';
    if (!absent(entry.atmosphere) && !ATMOSPHERES.includes(entry.atmosphere)) return 'atmosphere';
    if (!absent(entry.summary)) {
      if (typeof entry.summary !== 'string' || entry.summary.trim().length > CONE_RESULTS.summary) return 'summary';
    }
  }
  return null;
}

/** The key a result is kept under: its cone and atmosphere. */
const resultKey = (cone, atmosphere) => cone + '|' + (atmosphere ?? '');

/**
 * A list of results as saved: unknown fields dropped, summaries trimmed, an
 * empty one left out, one result for each cone and atmosphere (the last one
 * given wins, in the place of the first). null when the list cannot be saved.
 */
function cleanConeResults(list) {
  if (coneResultsProblem(list)) return null;
  const kept = new Map();
  for (const entry of list) {
    const summary = typeof entry.summary === 'string' ? entry.summary.trim() : '';
    const atmosphere = absent(entry.atmosphere) ? undefined : entry.atmosphere;
    const key = resultKey(entry.cone, atmosphere);
    if (!summary) {
      kept.delete(key);
      continue;
    }
    kept.set(key, { cone: entry.cone, ...(atmosphere && { atmosphere }), summary });
  }
  return [...kept.values()];
}

// The words a log's Atmosphere column is read by: its cells are the potter's own ("ox", "body
// reduction", "light red", "neutral"), so "red" there means reduction.
const ATMOSPHERE_WORDS = [
  ['oxidation', /\b(?:ox|oxi|oxid|oxidation|oxidi[sz]ing|oxidi[sz]ed|oxidi[sz]e)\b/u],
  ['reduction', /\b(?:red|reduce|reduced|reducing|reduction)\b/u],
  ['neutral', /\bneutral\b/u]
];

/**
 * The atmosphere a firing log was fired in, read from its Atmosphere columns,
 * or null: only when every cell that names one names the same one. A log
 * that says "ox" early and "reduction" later is not clear, and is left to the
 * potter.
 */
function atmosphereFromLog(log) {
  if (!log) return null;
  const columns = (log.fieldsIncluded ?? [])
    .map((field, i) => (/^atmospheres?\b/i.test(String(field)) ? i : -1))
    .filter((i) => i >= 0);
  const found = new Set();
  for (const row of log.rows ?? []) {
    for (const i of columns) {
      const cell = String((Array.isArray(row) ? row[i] : '') ?? '')
        .normalize('NFKC')
        .toLowerCase();
      for (const [atmosphere, re] of ATMOSPHERE_WORDS) if (re.test(cell)) found.add(atmosphere);
    }
  }
  return found.size === 1 ? [...found][0] : null;
}

/**
 * Where a newly linked log puts the recipe: the cone, when exactly one cone
 * the log names in its cone columns is within the recipe's stated range, and
 * the atmosphere, when the log reads clearly as one the recipe states (or as
 * any, when the recipe states none). Either is left out when the log does not
 * say; the potter can set them on the link.
 */
function linkPlace(log, block, options) {
  const place = {};
  if (block && block.low && block.scale !== 'temperature') {
    const range = conesBetween(block.scale, block.low, block.high);
    const named = conesFromLog(log, block.scale, options).filter((cone) => range.includes(cone));
    if (named.length === 1) place.cone = named[0];
  }
  const atmosphere = atmosphereFromLog(log);
  const stated = block?.atmospheres ?? [];
  if (atmosphere && (!stated.length || stated.includes(atmosphere))) place.atmosphere = atmosphere;
  return place;
}

module.exports = {
  CONE_RESULTS,
  isAnyCone,
  coneResultsProblem,
  cleanConeResults,
  resultKey,
  atmosphereFromLog,
  linkPlace
};
