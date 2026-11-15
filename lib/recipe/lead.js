'use strict';

// The core's lead (lib/core/recipe/lead.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/lead');

const recipeHasLead = inWords(core.recipeHasLead);
const leadFreeBases = inWords(core.leadFreeBases);
// A base frit not in the library is refused, as it always was, in English.
const replaceLead = inWords((lines, additives, find, standard, region, options) => {
  try {
    return core.replaceLead(lines, additives, find, standard, region, options);
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
