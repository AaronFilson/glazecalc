'use strict';

// The core's compare (lib/core/recipe/compare.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { HOST, withHost } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/index.ts');
const { formatFormula } = require('../chemistry/formula');

/**
 * Two unity formulas side by side (lib/core/recipe/compare.js), each oxide's row labelled with its formula
 * as it is shown: K₂O.
 */
function compareUnity(left, right) {
  const groups = core.compareUnity(HOST, left, right);
  for (const group of groups) for (const row of group.rows) if (row.formula) row.label = formatFormula(row.oxide);
  return groups;
}

const silicaAluminaRatio = inWords(core.silicaAluminaRatio);
const unityColumnOf = inWords(withHost(core.unityColumnOf));

const UNITY_COLUMNS = core.UNITY_COLUMNS;

module.exports = {
  UNITY_COLUMNS,
  compareUnity,
  silicaAluminaRatio,
  unityColumnOf
};
