'use strict';

// The recipe tools the app and the server share (docs/adr/0019-shared-recipe-tools.md):
// amounts and scaling, cost per batch, hazards, typed numbers, temperatures, limits, substitutions,
// matching with the materials on hand, replacing lead, reading pasted recipes, blends for test
// tiles, and the unity formula worked step by step. Plain functions of plain data; what they say
// is message codes (messages.js), never words.

const amounts = require('./amounts');
const analysis = require('./analysis');
const blends = require('./blends');
const checks = require('./checks');
const cost = require('./cost');
const hazards = require('./hazards');
const lead = require('./lead');
const library = require('./library');
const limits = require('./limits');
const materials = require('./materials');
const messages = require('./messages');
const numbers = require('./numbers');
const paste = require('./paste');
const pool = require('./pool');
const shelf = require('./shelf');
const slurry = require('./slurry');
const suggest = require('./suggest');
const swaps = require('./swaps');
const temperature = require('./temperature');
const worked = require('./worked');

module.exports = exports = {
  BLEND_CORNERS: blends.BLEND_CORNERS,
  BLEND_STEPS: blends.BLEND_STEPS,
  CHECK_LIMITS: limits.CHECK_LIMITS,
  CODES: messages.CODES,
  DEFAULT_LIMIT_SET: limits.DEFAULT_LIMIT_SET,
  DRY_SG: slurry.DRY_SG,
  SG_TARGET_RANGE: slurry.SG_TARGET_RANGE,
  FIRING: limits.FIRING,
  FIRING_BANDS: limits.FIRING_BANDS,
  GRAMS_PER_KG: cost.GRAMS_PER_KG,
  GLAZECALC_LIMITS: limits.GLAZECALC_LIMITS,
  HESSELBERTH_ROY_LIMITS: limits.HESSELBERTH_ROY_LIMITS,
  LIKE_FOR_LIKE_GRAMS: materials.LIKE_FOR_LIKE_GRAMS,
  LIMIT_SETS: limits.LIMIT_SETS,
  LITRES: slurry.LITRES,
  RecipeError: messages.RecipeError,
  STULL: analysis.STULL,
  amountOf: amounts.amountOf,
  bandOf: limits.bandOf,
  batchForVolume: slurry.batchForVolume,
  batchCost: cost.batchCost,
  blendTiles: blends.blendTiles,
  batchWeights: amounts.batchWeights,
  baumeFromSg: slurry.baumeFromSg,
  celsius: temperature.celsius,
  dryPerLitre: slurry.dryPerLitre,
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
  hazardsOf: hazards.hazardsOf,
  importAmounts: paste.importAmounts,
  inRegion: library.inRegion,
  inScale: temperature.inScale,
  isAmount: amounts.isAmount,
  isIdealMineral: library.isIdealMineral,
  isPrice: cost.isPrice,
  leadFreeBases: lead.leadFreeBases,
  leadIn: lead.leadIn,
  likeness: paste.likeness,
  likeForLike: materials.likeForLike,
  limitRows: limits.limitRows,
  matchFromShelf: shelf.matchFromShelf,
  matchName: paste.matchName,
  mixRecipes: blends.mixRecipes,
  modernMaterials: swaps.modernMaterials,
  molePercent: analysis.molePercent,
  molesOf: materials.molesOf,
  oxidePercent: materials.oxidePercent,
  paramsText: messages.paramsText,
  parseNumber: numbers.parseNumber,
  ambiguousNumbers: paste.ambiguousNumbers,
  parsePaste: paste.parsePaste,
  PASTE_LIMITS: paste.PASTE_LIMITS,
  pasteTooLong: paste.pasteTooLong,
  pastLimits: checks.pastLimits,
  pintFromSg: slurry.pintFromSg,
  placesFor: pool.placesFor,
  plainFigure: messages.plainFigure,
  plainNumber: numbers.plainNumber,
  planSuggestion: suggest.planSuggestion,
  rawClayPercent: checks.rawClayPercent,
  rebase: amounts.rebase,
  recipeCost: cost.recipeCost,
  recipeFrom: pool.recipeFrom,
  recipeHasLead: lead.recipeHasLead,
  replaceLead: lead.replaceLead,
  roleOf: materials.roleOf,
  separators: numbers.separators,
  sgFromBaume: slurry.sgFromBaume,
  sgFromPint: slurry.sgFromPint,
  sizeNotes: checks.sizeNotes,
  slurryContents: slurry.slurryContents,
  stullPoint: analysis.stullPoint,
  suggestable: library.suggestable,
  suggestAmounts: suggest.suggestAmounts,
  temperatureText: temperature.temperatureText,
  toPlain: numbers.toPlain,
  totalOf: amounts.totalOf,
  unitOf: amounts.unitOf,
  unityFor: limits.unityFor,
  unityOf: materials.unityOf,
  upTo: messages.upTo,
  waterForBatch: slurry.waterForBatch,
  waterToReach: slurry.waterToReach,
  wholePartsFactor: amounts.wholePartsFactor,
  workedCalculation: worked.workedCalculation
};
