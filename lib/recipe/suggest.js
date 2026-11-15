'use strict';

// The core's suggest (lib/core/recipe/suggest.js), the library looked up by name and the materials to
// avoid or not cap given by name (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const { byName, idsNamed } = require('./ids');
const core = require('../core/recipe/suggest');

const planSuggestion = inWords((lines, find, standard, region, options) =>
  core.planSuggestion(lines, byName(find), standard, region, options)
);

const suggestAmounts = inWords((lines, find, bringIn, region, options = {}) => {
  const records = [...lines, ...(bringIn ?? []), ...(options.tries ?? []).map((t) => t.material)];
  return core.suggestAmounts(lines, byName(find), bringIn, region, {
    ...options,
    avoid: idsNamed(options.avoid, records, find),
    uncapped: idsNamed(options.uncapped, records, find)
  });
});

module.exports = { planSuggestion, suggestAmounts };
