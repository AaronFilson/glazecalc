'use strict';

// The core's suggest (lib/core/recipe/suggest.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/suggest');

const planSuggestion = inWords(core.planSuggestion);
const suggestAmounts = inWords(core.suggestAmounts);

module.exports = { planSuggestion, suggestAmounts };
