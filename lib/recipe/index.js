'use strict';

// The recipe tools the app and the server share (docs/adr/0019-shared-recipe-tools.md):
// amounts and scaling, typed numbers, temperatures, limits, substitutions,
// matching with the materials on hand and replacing lead, reading pasted
// recipes, and blends for test tiles. Plain functions of
// plain data; what they say is message codes (messages.js), never words.

const amounts = require('./amounts');
const blends = require('./blends');
const checks = require('./checks');
const lead = require('./lead');
const library = require('./library');
const limits = require('./limits');
const materials = require('./materials');
const messages = require('./messages');
const numbers = require('./numbers');
const paste = require('./paste');
const pool = require('./pool');
const shelf = require('./shelf');
const suggest = require('./suggest');
const swaps = require('./swaps');
const temperature = require('./temperature');

module.exports = exports = {
  BLEND_CORNERS: blends.BLEND_CORNERS,
  BLEND_STEPS: blends.BLEND_STEPS,
  CHECK_LIMITS: limits.CHECK_LIMITS,
  CODES: messages.CODES,
  FIRING: limits.FIRING,
  FIRING_BANDS: limits.FIRING_BANDS,
  GLAZECALC_LIMITS: limits.GLAZECALC_LIMITS,
  LIMIT_SETS: limits.LIMIT_SETS,
  LIKE_FOR_LIKE_GRAMS: materials.LIKE_FOR_LIKE_GRAMS,
  RecipeError: messages.RecipeError,
  amountOf: amounts.amountOf,
  bandOf: limits.bandOf,
  blendTiles: blends.blendTiles,
  batchWeights: amounts.batchWeights,
  celsius: temperature.celsius,
  compactName: paste.compactName,
  expansionOf: materials.expansionOf,
  explain: pool.explain,
  fahrenheit: temperature.fahrenheit,
  figure: messages.figure,
  figureText: messages.figureText,
  fluxesOf: materials.fluxesOf,
  foldedName: paste.foldedName,
  formatAmount: amounts.formatAmount,
  formatScaled: amounts.formatScaled,
  forTyping: numbers.forTyping,
  gramsApart: materials.gramsApart,
  hasLead: library.hasLead,
  importAmounts: paste.importAmounts,
  inRegion: library.inRegion,
  inScale: temperature.inScale,
  isAmount: amounts.isAmount,
  isIdealMineral: library.isIdealMineral,
  leadFreeBases: lead.leadFreeBases,
  leadIn: lead.leadIn,
  likeness: paste.likeness,
  likeForLike: materials.likeForLike,
  matchFromShelf: shelf.matchFromShelf,
  matchName: paste.matchName,
  mixRecipes: blends.mixRecipes,
  modernMaterials: swaps.modernMaterials,
  molesOf: materials.molesOf,
  oxidePercent: materials.oxidePercent,
  paramsText: messages.paramsText,
  parseNumber: numbers.parseNumber,
  parsePaste: paste.parsePaste,
  PASTE_LIMITS: paste.PASTE_LIMITS,
  pasteTooLong: paste.pasteTooLong,
  pastLimits: checks.pastLimits,
  placesFor: pool.placesFor,
  plainFigure: messages.plainFigure,
  plainNumber: numbers.plainNumber,
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
