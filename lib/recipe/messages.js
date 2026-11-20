'use strict';

// The core's messages (lib/core/recipe/messages.js), codes and their values, and the figures written in the
// reader's locale (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/index.ts');
// The figures in the reader's locale are the catalog's (lib/catalog/english.ts).
const { figureText, paramsText } = require('../catalog/locale/index.ts');

const say = inWords(core.say);
const figure = inWords(core.figure);
const upTo = inWords(core.upTo);
const plainFigure = inWords(core.plainFigure);

const CODES = core.CODES;
const RecipeError = core.RecipeError;

module.exports = {
  CODES,
  RecipeError,
  say,
  figure,
  upTo,
  plainFigure,
  figureText,
  paramsText
};
