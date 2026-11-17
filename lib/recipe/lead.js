'use strict';

// The core's lead (lib/core/recipe/lead.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const { byName, idsNamed } = require('./ids');
const core = require('../core/recipe/lead.ts');
const { idOf } = require('../core/identity.ts');

const recipeHasLead = inWords(core.recipeHasLead);
const leadFreeBases = inWords((lines, additives, find, standard, region, celsius, mode) =>
  core.leadFreeBases(lines, additives, byName(find), standard, region, celsius, mode)
);
// A base frit not in the library is refused, as it always was, in English.
const replaceLead = inWords((lines, additives, find, standard, region, options) => {
  // The base frit, the materials to avoid and the clays not to cap are given by name.
  const records = [...lines, ...standard, ...(options.tries ?? []).map((tried) => tried.material)];
  const base = standard.find((material) => material.name === options.base);
  const byId = {
    ...options,
    base: base ? idOf(base) : options.base,
    avoid: idsNamed(options.avoid, records, find),
    uncapped: idsNamed(options.uncapped, records, find)
  };
  try {
    return core.replaceLead(lines, additives, byName(find), standard, region, byId);
  } catch (error) {
    // The plain Error it always threw, with no cause: callers see exactly what they did.
    // eslint-disable-next-line preserve-caught-error
    if (error && error.code === 'no-frit') throw new Error('No frit called ' + error.params.base);
    throw error;
  }
});
const clayFor = inWords(core.clayFor);
const leadIn = inWords(core.leadIn);
const bariumIn = inWords(core.bariumIn);

module.exports = { recipeHasLead, leadFreeBases, replaceLead, clayFor, leadIn, bariumIn };
