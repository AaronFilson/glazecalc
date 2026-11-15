'use strict';

// The core's shelf (lib/core/recipe/shelf.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/shelf');

const matchFromShelf = inWords(core.matchFromShelf);

module.exports = { matchFromShelf };
