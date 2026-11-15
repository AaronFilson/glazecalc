'use strict';

// The core's solve (lib/core/recipe/solve.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const { idsNamed } = require('./ids');
const core = require('../core/recipe/solve');

// The materials to avoid and the clays not to cap, given by name.
const solveTarget = inWords((target, offered, options = {}) => {
  const records = offered.map((tried) => tried.material);
  return core.solveTarget(target, offered, {
    ...options,
    avoid: idsNamed(options.avoid, records),
    uncapped: idsNamed(options.uncapped, records)
  });
});
const solveCautions = inWords(core.solveCautions);
const targetOf = inWords(core.targetOf);
const parseTarget = inWords(core.parseTarget);
const SOLVE_BATCH = core.SOLVE_BATCH;

module.exports = { solveTarget, solveCautions, targetOf, parseTarget, SOLVE_BATCH };
