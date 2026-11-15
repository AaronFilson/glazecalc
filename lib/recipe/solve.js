'use strict';

// The core's solve (lib/core/recipe/solve.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/solve');

const solveTarget = inWords(core.solveTarget);
const solveCautions = inWords(core.solveCautions);
const targetOf = inWords(core.targetOf);
const parseTarget = inWords(core.parseTarget);
const SOLVE_BATCH = core.SOLVE_BATCH;

module.exports = { solveTarget, solveCautions, targetOf, parseTarget, SOLVE_BATCH };
