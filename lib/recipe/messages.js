'use strict';

// The core's messages (lib/core/recipe/messages.js), codes and their values, and the figures written in the
// reader's locale (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/messages');

/** A figure written in a locale, 4-digit numbers kept together (1240, 12 345). */
function figureText(value, locale = 'en') {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: value.upTo ? 0 : value.places,
    maximumFractionDigits: value.places,
    useGrouping: 'min2',
    signDisplay: 'negative'
  }).format(value.value);
}

/** A message's values as text and plain numbers, for a message format: figures written in the locale. */
function paramsText(message, locale = 'en', write = (value) => figureText(value, locale)) {
  return Object.fromEntries(
    Object.entries(message.params ?? {}).map(([name, value]) => [
      name,
      value && typeof value === 'object' ? write(value) : value
    ])
  );
}

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
