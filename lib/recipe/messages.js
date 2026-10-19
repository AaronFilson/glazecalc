'use strict';

// What the recipe tools tell a person (docs/adr/0019-shared-recipe-tools.md):
// each sentence is a code and its values, never words, so the app and the
// server can each put it in the reader's language. A code is the message's key
// in the app's recipe messages (client/public/i18n/recipe/en.json): the app
// shows 'checks.alkali' as recipe.checks.alkali. A number in a message is a
// figure, written in the reader's locale with its decimals: 0.30, not 0.3.

/** Every code the recipe tools say. */
const CODES = Object.freeze([
  // Limits (checks.js).
  'checks.boronLowFire',
  'checks.boronLowFireProbably',
  'checks.boronLowFireTends',
  'checks.boronLowFireEffects',
  'checks.boronMidFire',
  'checks.boronMidFireSet',
  'checks.boronHighFire',
  'checks.boronMidFireProbably',
  'checks.boronMidFireTends',
  'checks.boronMidFireFix',
  'checks.boronShort',
  'checks.boronShortEffects',
  'checks.aluminaLow',
  'checks.aluminaLowProbably',
  'checks.aluminaLowTends',
  'checks.aluminaLowFix',
  'checks.aluminaHigh',
  'checks.aluminaHighEffects',
  'checks.aluminaHighLowFire',
  'checks.aluminaHighFix',
  'checks.boronBlue',
  'checks.boronBlueFix',
  'checks.boronBlueFixPink',
  'checks.alkali',
  'checks.alkaliProbably',
  'checks.alkaliTends',
  'checks.alkaliFix',
  'checks.magnesia',
  'checks.magnesiaProbably',
  'checks.magnesiaTends',
  'checks.magnesiaNote',
  'checks.zincChrome',
  'checks.zincIron',
  'checks.zincCopper',
  'checks.zincLowFire',
  'checks.whiting',
  'checks.whitingProbably',
  'checks.whitingTends',
  'checks.whitingFix',
  'checks.fluorine',
  'checks.clayLow',
  'checks.clayLowWas',
  'checks.clayNone',
  'checks.clayNoneWas',
  'checks.clayLowFix',
  'checks.clayHigh',
  'checks.clayHighProbably',
  'checks.clayHighTends',
  'checks.clayHighFix',
  'checks.soluble',
  'checks.boronFrit',
  'checks.lowExpansionFrit',
  'checks.alkaliFrit',
  'checks.expansionRises',
  'checks.expansionRisesProbably',
  'checks.expansionRisesMay',
  'checks.expansionRisesFix',
  'checks.expansionFalls',
  'checks.expansionFallsProbably',
  'checks.expansionFallsCan',
  'checks.expansionFallsTest',
  'checks.manyMaterials',
  'checks.smallAmount',
  // A substitution's changes (pool.js).
  'pool.changed',
  'pool.added',
  // Replacing lead (lead.js).
  'lead.why.rawCalcium',
  'lead.why.lowExpansion',
  'lead.why.boronFrit',
  'lead.why.zinc',
  'lead.baseDoingLittle',
  'lead.antimony',
  'lead.chrome',
  'lead.copper',
  'lead.manganese',
  'lead.iron',
  // Matching with the materials on hand (shelf.js).
  'shelf.empty',
  // Chemistry against the stated cone (cone-fit.js).
  'coneFit.cooler',
  'coneFit.coolerSoft',
  'coneFit.hotter',
  'coneFit.hotterSoft',
  'coneFit.closer',
  'coneFit.coolerSilica',
  'coneFit.coolerAlumina',
  'coneFit.coolerBoth',
  'coneFit.hotterSilica',
  'coneFit.coolerEffect',
  'coneFit.hotterEffect',
  'coneFit.hotterEffectSoft',
  'coneFit.gerstley',
  'coneFit.guide',
  'coneFit.fits',
  'coneFit.skip.lead',
  'coneFit.skip.lithium',
  'coneFit.skip.alkali',
  'coneFit.skip.zinc',
  'coneFit.skip.notGlaze',
  'coneFit.skip.process',
  'coneFit.skip.ash',
  'coneFit.skip.noTemperature',
  'coneFit.skip.between',
  'coneFit.skip.belowChart'
]);

/** A message: its code, and its values. */
const say = (code, params) => (params ? { code, params } : { code });

/** A number to show with exactly `places` decimals: 0.30. */
const figure = (value, places) => ({ value, places });

/** A number to show with up to `places` decimals, without trailing zeros: 12.5. */
const upTo = (value, places) => ({ value, places, upTo: true });

/**
 * A saved plain number ("12.50") as a figure keeping its decimals; other text
 * as it is.
 */
function plainFigure(text) {
  const plain = String(text ?? '').trim();
  const match = /^-?\d+(?:\.(\d+))?$/.exec(plain);
  return match ? figure(Number(plain), match[1]?.length ?? 0) : String(text ?? '');
}

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

/**
 * What a recipe tool throws when it cannot do what it was asked: its message
 * is the code, and it carries the code and values as a message does, for the
 * caller to put in the reader's language.
 */
class RecipeError extends Error {
  constructor(code, params) {
    super(code);
    this.name = 'RecipeError';
    this.code = code;
    if (params) this.params = params;
  }
}

module.exports = { CODES, RecipeError, say, figure, upTo, plainFigure, figureText, paramsText };
