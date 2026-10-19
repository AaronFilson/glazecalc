'use strict';

// Two unity formulas side by side (issue #6): the app's Compare, and the
// MCP blend_recipes tool's differences between two recipes. What the rows are
// is a key or a formula, never words: the app puts them in the page's language.

const { OXIDE_GROUPS, expansion, formatFormula } = require('../chemistry');

const STABILIZERS = ['Al2O3', 'B2O3'];
const GLASS_FORMERS = ['SiO2'];

/** The columns potters read a unity formula in, in order; an oxide goes under one of the first four. */
const UNITY_COLUMNS = ['fluxes', 'stabilizers', 'glassFormers', 'wildcards'];

/** Which of the UNITY_COLUMNS an oxide goes under, as an index. */
function unityColumnOf(oxide) {
  const group = OXIDE_GROUPS[oxide];
  if (group === 'R2O' || group === 'RO') return 0;
  return STABILIZERS.includes(oxide) ? 1 : GLASS_FORMERS.includes(oxide) ? 2 : 3;
}

/** The silica to alumina ratio, from the saved value or from the unity formula. */
function silicaAluminaRatio(analysis) {
  if (typeof analysis.siAlRatio === 'number') return analysis.siAlRatio;
  const { SiO2, Al2O3 } = analysis.uList;
  return Al2O3 > 0 ? (SiO2 ?? 0) / Al2O3 : null;
}

const value = (n) => (typeof n === 'number' && n > 0 ? n : null);

// A row. Its change counts an oxide one recipe lacks as 0, but only when both
// recipes have a unity formula: against a recipe that is not there, there is no change.
const row = (label, left, right, both, places = 3) => ({
  label,
  left,
  right,
  change: both && (left !== null || right !== null) ? (right ?? 0) - (left ?? 0) : null,
  places
});

// A ratio or total: a change only when both recipes have one.
const fact = (key, left, right, places) => ({
  key,
  ...row(key, left, right, left !== null && right !== null, places)
});

/**
 * Two unity formulas side by side: a row for every oxide in either, under the
 * columns potters read them in (fluxes, stabilizers, glass formers, others),
 * then a "balance" group: the silica to alumina ratio, the flux balance, the
 * loss on ignition and the calculated thermal expansion. Each group has a
 * `key` (UNITY_COLUMNS, or 'balance'); an oxide's row is labelled with its
 * formula and has `formula: true`; a balance row has a `key` (silicaToAlumina,
 * r2oFluxes, roFluxes, loi, expansion) and its label is that key. The first
 * three columns are always there; the wildcards only with a row.
 */
function compareUnity(left, right) {
  const groups = UNITY_COLUMNS.map((key) => ({ key, rows: [] }));
  const both = !!left && !!right;
  const oxides = [...new Set([...Object.keys(left?.uList ?? {}), ...Object.keys(right?.uList ?? {})])];
  for (const oxide of oxides) {
    const a = value(left?.uList[oxide]);
    const b = value(right?.uList[oxide]);
    if (a === null && b === null) continue;
    groups[unityColumnOf(oxide)].rows.push({ ...row(formatFormula(oxide), a, b, both), formula: true });
  }
  const ratio = (analysis) => (analysis ? silicaAluminaRatio(analysis) : null);
  // Worked out from the fired analysis when a saved one has no figure of its own.
  const expands = (analysis) => (analysis ? (analysis.expansion ?? expansion(analysis.analysis)) : null);
  const facts = {
    key: 'balance',
    rows: [
      fact('silicaToAlumina', ratio(left), ratio(right), 2),
      fact('r2oFluxes', left?.groups?.R2O ?? null, right?.groups?.R2O ?? null, 2),
      fact('roFluxes', left?.groups?.RO ?? null, right?.groups?.RO ?? null, 2),
      fact('loi', left?.loi ?? null, right?.loi ?? null, 1),
      fact('expansion', expands(left), expands(right), 2)
    ]
  };
  return [...groups.filter((group, i) => i < 3 || group.rows.length), facts];
}

module.exports = { UNITY_COLUMNS, compareUnity, silicaAluminaRatio, unityColumnOf };
