// Types for lib/recipe/messages.js (see index.d.ts).

/** A message's key in the app's recipe messages (client/public/i18n/recipe/en.json; messages.js). */
export type RecipeMessageCode =
  | 'checks.boronLowFire'
  | 'checks.boronLowFireProbably'
  | 'checks.boronLowFireTends'
  | 'checks.boronLowFireEffects'
  | 'checks.boronMidFire'
  | 'checks.boronMidFireProbably'
  | 'checks.boronMidFireTends'
  | 'checks.boronMidFireFix'
  | 'checks.boronShort'
  | 'checks.boronShortEffects'
  | 'checks.aluminaLow'
  | 'checks.aluminaLowProbably'
  | 'checks.aluminaLowTends'
  | 'checks.aluminaLowFix'
  | 'checks.aluminaHigh'
  | 'checks.aluminaHighEffects'
  | 'checks.aluminaHighLowFire'
  | 'checks.aluminaHighFix'
  | 'checks.boronBlue'
  | 'checks.boronBlueFix'
  | 'checks.boronBlueFixPink'
  | 'checks.alkali'
  | 'checks.alkaliProbably'
  | 'checks.alkaliTends'
  | 'checks.alkaliFix'
  | 'checks.magnesia'
  | 'checks.magnesiaProbably'
  | 'checks.magnesiaTends'
  | 'checks.magnesiaNote'
  | 'checks.zincChrome'
  | 'checks.zincIron'
  | 'checks.zincCopper'
  | 'checks.zincLowFire'
  | 'checks.whiting'
  | 'checks.whitingProbably'
  | 'checks.whitingTends'
  | 'checks.whitingFix'
  | 'checks.fluorine'
  | 'checks.clayLow'
  | 'checks.clayLowWas'
  | 'checks.clayNone'
  | 'checks.clayNoneWas'
  | 'checks.clayLowFix'
  | 'checks.clayHigh'
  | 'checks.clayHighProbably'
  | 'checks.clayHighTends'
  | 'checks.clayHighFix'
  | 'checks.soluble'
  | 'checks.boronFrit'
  | 'checks.lowExpansionFrit'
  | 'checks.alkaliFrit'
  | 'checks.expansionRises'
  | 'checks.expansionRisesProbably'
  | 'checks.expansionRisesMay'
  | 'checks.expansionRisesFix'
  | 'checks.expansionFalls'
  | 'checks.expansionFallsProbably'
  | 'checks.expansionFallsCan'
  | 'checks.expansionFallsTest'
  | 'checks.manyMaterials'
  | 'checks.smallAmount'
  | 'pool.changed'
  | 'pool.added'
  | 'lead.why.rawCalcium'
  | 'lead.why.lowExpansion'
  | 'lead.why.boronFrit'
  | 'lead.why.zinc'
  | 'lead.baseDoingLittle'
  | 'lead.antimony'
  | 'lead.chrome'
  | 'lead.copper'
  | 'lead.manganese'
  | 'lead.iron';

export const CODES: ReadonlyArray<RecipeMessageCode>;

/** A number in a message: `places` decimals, or up to `places` without trailing zeros. */
export interface Figure {
  value: number;
  places: number;
  upTo?: boolean;
}

/** One sentence: its code and its values (text, plain numbers for plurals, and figures). */
export interface RecipeMessage {
  code: RecipeMessageCode;
  params?: Record<string, string | number | Figure>;
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

/** A warning or note: the check, and its sentences, read one after another. */
export interface Caution {
  check: CheckName;
  sentences: RecipeMessage[];
}

export function figure(value: number, places: number): Figure;
export function upTo(value: number, places: number): Figure;
/** A saved plain number ("12.50") as a figure keeping its decimals; other text as it is. */
export function plainFigure(text: string | number | null | undefined): Figure | string;
/** A figure written in a locale (English by default). */
export function figureText(value: Figure, locale?: string): string;
/** A message's values for a message format: figures written by `write`, or in the locale. */
export function paramsText(
  message: RecipeMessage,
  locale?: string,
  write?: (value: Figure) => string
): Record<string, string | number>;
