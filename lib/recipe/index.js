'use strict';

// The recipe tools the app and the server share (docs/adr/0019-shared-recipe-tools.md):
// amounts and scaling, typed numbers, temperatures, limits, substitutions,
// matching with the materials on hand and replacing lead. Plain functions of
// plain data; what they say is message codes (messages.js), never words.

const amounts = require('./amounts');
const checks = require('./checks');
const lead = require('./lead');
const library = require('./library');
const limits = require('./limits');
const materials = require('./materials');
const messages = require('./messages');
const numbers = require('./numbers');
const pool = require('./pool');
const shelf = require('./shelf');
const suggest = require('./suggest');
const swaps = require('./swaps');
const temperature = require('./temperature');

module.exports = exports = {
  CHECK_LIMITS: limits.CHECK_LIMITS,
  CODES: messages.CODES,
  FIRING: limits.FIRING,
  LIKE_FOR_LIKE_GRAMS: materials.LIKE_FOR_LIKE_GRAMS,
  amountOf: amounts.amountOf,
  batchWeights: amounts.batchWeights,
  celsius: temperature.celsius,
  expansionOf: materials.expansionOf,
  explain: pool.explain,
  fahrenheit: temperature.fahrenheit,
  figure: messages.figure,
  figureText: messages.figureText,
  fluxesOf: materials.fluxesOf,
  formatAmount: amounts.formatAmount,
  formatScaled: amounts.formatScaled,
  forTyping: numbers.forTyping,
  gramsApart: materials.gramsApart,
  hasLead: library.hasLead,
  inRegion: library.inRegion,
  inScale: temperature.inScale,
  isAmount: amounts.isAmount,
  isIdealMineral: library.isIdealMineral,
  leadFreeBases: lead.leadFreeBases,
  leadIn: lead.leadIn,
  likeForLike: materials.likeForLike,
  matchFromShelf: shelf.matchFromShelf,
  modernMaterials: swaps.modernMaterials,
  molesOf: materials.molesOf,
  oxidePercent: materials.oxidePercent,
  paramsText: messages.paramsText,
  parseNumber: numbers.parseNumber,
  pastLimits: checks.pastLimits,
  placesFor: pool.placesFor,
  plainFigure: messages.plainFigure,
  plainNumber: amounts.plainNumber,
  planSuggestion: suggest.planSuggestion,
  rawClayPercent: checks.rawClayPercent,
  rebase: amounts.rebase,
  recipeFrom: pool.recipeFrom,
  recipeHasLead: lead.recipeHasLead,
  replaceLead: lead.replaceLead,
  roleOf: materials.roleOf,
  separators: numbers.separators,
  sizeNotes: checks.sizeNotes,
  suggestable: library.suggestable,
  suggestAmounts: suggest.suggestAmounts,
  temperatureText: temperature.temperatureText,
  toPlain: numbers.toPlain,
  totalOf: amounts.totalOf,
  unitOf: amounts.unitOf,
  unityOf: materials.unityOf,
  upTo: messages.upTo,
  wholePartsFactor: amounts.wholePartsFactor
};
