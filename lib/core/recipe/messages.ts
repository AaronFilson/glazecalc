// What the recipe tools tell a person (docs/adr/0019-shared-recipe-tools.md):
// each sentence is a code and its values, never words, so the app and the
// server can each put it in the reader's language. A code is the message's key
// in the app's recipe messages (client/public/i18n/recipe/en.json): the app
// shows 'checks.alkali' as recipe.checks.alkali. A number in a message is a
// figure, written in the reader's locale with its decimals: 0.30, not 0.3.

import type { Identity } from '../identity.ts';

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
  'checks.barium',
  'checks.bariumLikely',
  'checks.bariumTends',
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
  // A substitution's changes, and why raw clay is held back (pool.js).
  'pool.changed',
  'pool.added',
  'pool.why.rawClay',
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
  // Solving for a target (solve.js).
  'solve.unknownOxide',
  'solve.together',
  'solve.badAmount',
  'solve.noFlux',
  'solve.noMaterials',
  'solve.noMatch',
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
  'coneFit.skip.belowChart',
  'coneFit.skip.aboveChart'
] as const);

/** A message's key in the app's recipe messages (client/public/i18n/recipe/en.json). */
export type RecipeMessageCode = (typeof CODES)[number];

/** A number in a message: `places` decimals, or up to `places` without trailing zeros. */
export interface Figure {
  value: number;
  places: number;
  upTo?: boolean;
}

/** A message's values: text, plain numbers for plurals, and figures. */
export type MessageParams = Record<string, Identity | Figure | undefined>;

/** One sentence: its code and its values. */
export interface RecipeMessage {
  code: RecipeMessageCode;
  params?: MessageParams;
}

/** The check that raised a caution. */
export type CheckName =
  | 'boron-high'
  | 'boron-short'
  | 'alumina-low'
  | 'alumina-high'
  | 'boron-blue'
  | 'alkali'
  | 'magnesia'
  | 'zinc-chrome'
  | 'zinc-iron'
  | 'zinc-copper'
  | 'zinc-low-fire'
  | 'barium'
  | 'whiting'
  | 'fluorine'
  | 'clay-low'
  | 'clay-high'
  | 'soluble'
  | 'frit-role'
  | 'expansion-rises'
  | 'expansion-falls'
  | 'many-materials'
  | 'small-amount'
  | 'base-doing-little'
  | 'lead-antimony'
  | 'lead-chrome'
  | 'lead-copper'
  | 'lead-manganese'
  | 'lead-iron';

/** How serious a caution is: past the likely figure, past the recommended limit, or a note. */
export type Severity = 'likely' | 'caution' | 'note';

/**
 * What a check measured: an oxide or sum in the unity formula, a ratio, a share of the batch in
 * percent, calculated expansion, or the number of materials.
 */
export type Quantity =
  | 'B2O3'
  | 'Al2O3'
  | 'K2O+Na2O'
  | 'MgO'
  | 'ZnO'
  | 'BaO'
  | 'SiO2:Al2O3'
  | 'raw-clay-percent'
  | 'raw-calcium-percent'
  | 'material-percent'
  | 'expansion'
  | 'materials';

/** A warning or note: the check, its sentences, and the same as data. */
export interface Caution {
  check: CheckName;
  severity: Severity;
  quantity?: Quantity;
  value?: number;
  limit?: number;
  direction?: 'above' | 'below';
  /** The material it is about: its label (identity.ts labelOf). */
  material?: unknown;
  sentences: RecipeMessage[];
}

/** A message: its code, and its values. */
const say = (code: RecipeMessageCode, params?: MessageParams): RecipeMessage => (params ? { code, params } : { code });

/** A number to show with exactly `places` decimals: 0.30. */
const figure = (value: number, places: number): Figure => ({ value, places });

/** A number to show with up to `places` decimals, without trailing zeros: 12.5. */
const upTo = (value: number, places: number): Figure => ({ value, places, upTo: true });

/**
 * A saved plain number ("12.50") as a figure keeping its decimals; other text
 * as it is.
 */
function plainFigure(text: unknown): Figure | string {
  const plain = String(text ?? '').trim();
  const match = /^-?\d+(?:\.(\d+))?$/.exec(plain);
  return match ? figure(Number(plain), match[1]?.length ?? 0) : String(text ?? '');
}

/**
 * What a recipe tool throws when it cannot do what it was asked: its message
 * is the code, and it carries the code and values as a message does, for the
 * caller to put in the reader's language.
 */
class RecipeError extends Error {
  declare code: RecipeMessageCode;
  declare params?: MessageParams;
  constructor(code: RecipeMessageCode, params?: MessageParams) {
    super(code);
    this.name = 'RecipeError';
    this.code = code;
    if (params) this.params = params;
  }
}

export { CODES, RecipeError, say, figure, upTo, plainFigure };
