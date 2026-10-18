import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import type { Caution, Figure, RecipeMessage, RecipeMessageCode } from '../../../../lib/recipe/messages';
import { paramsText } from '../../../../lib/recipe/messages';
import { fixed, upTo } from '../../shared/format';

// What the shared recipe tools say (lib/recipe), in the page's language: each
// code is its message's key in the recipe scope, listed here so the
// keys manager and npm run check:i18n see every one.

const KEYS: Record<RecipeMessageCode, string> = {
  'checks.boronLowFire': marker('recipe.checks.boronLowFire'),
  'checks.boronLowFireProbably': marker('recipe.checks.boronLowFireProbably'),
  'checks.boronLowFireTends': marker('recipe.checks.boronLowFireTends'),
  'checks.boronLowFireEffects': marker('recipe.checks.boronLowFireEffects'),
  'checks.boronMidFire': marker('recipe.checks.boronMidFire'),
  'checks.boronMidFireSet': marker('recipe.checks.boronMidFireSet'),
  'checks.boronHighFire': marker('recipe.checks.boronHighFire'),
  'checks.boronMidFireProbably': marker('recipe.checks.boronMidFireProbably'),
  'checks.boronMidFireTends': marker('recipe.checks.boronMidFireTends'),
  'checks.boronMidFireFix': marker('recipe.checks.boronMidFireFix'),
  'checks.boronShort': marker('recipe.checks.boronShort'),
  'checks.boronShortEffects': marker('recipe.checks.boronShortEffects'),
  'checks.aluminaLow': marker('recipe.checks.aluminaLow'),
  'checks.aluminaLowProbably': marker('recipe.checks.aluminaLowProbably'),
  'checks.aluminaLowTends': marker('recipe.checks.aluminaLowTends'),
  'checks.aluminaLowFix': marker('recipe.checks.aluminaLowFix'),
  'checks.aluminaHigh': marker('recipe.checks.aluminaHigh'),
  'checks.aluminaHighEffects': marker('recipe.checks.aluminaHighEffects'),
  'checks.aluminaHighLowFire': marker('recipe.checks.aluminaHighLowFire'),
  'checks.aluminaHighFix': marker('recipe.checks.aluminaHighFix'),
  'checks.boronBlue': marker('recipe.checks.boronBlue'),
  'checks.boronBlueFix': marker('recipe.checks.boronBlueFix'),
  'checks.boronBlueFixPink': marker('recipe.checks.boronBlueFixPink'),
  'checks.alkali': marker('recipe.checks.alkali'),
  'checks.alkaliProbably': marker('recipe.checks.alkaliProbably'),
  'checks.alkaliTends': marker('recipe.checks.alkaliTends'),
  'checks.alkaliFix': marker('recipe.checks.alkaliFix'),
  'checks.magnesia': marker('recipe.checks.magnesia'),
  'checks.magnesiaProbably': marker('recipe.checks.magnesiaProbably'),
  'checks.magnesiaTends': marker('recipe.checks.magnesiaTends'),
  'checks.magnesiaNote': marker('recipe.checks.magnesiaNote'),
  'checks.zincChrome': marker('recipe.checks.zincChrome'),
  'checks.zincIron': marker('recipe.checks.zincIron'),
  'checks.zincCopper': marker('recipe.checks.zincCopper'),
  'checks.zincLowFire': marker('recipe.checks.zincLowFire'),
  'checks.whiting': marker('recipe.checks.whiting'),
  'checks.whitingProbably': marker('recipe.checks.whitingProbably'),
  'checks.whitingTends': marker('recipe.checks.whitingTends'),
  'checks.whitingFix': marker('recipe.checks.whitingFix'),
  'checks.fluorine': marker('recipe.checks.fluorine'),
  'checks.clayLow': marker('recipe.checks.clayLow'),
  'checks.clayLowWas': marker('recipe.checks.clayLowWas'),
  'checks.clayNone': marker('recipe.checks.clayNone'),
  'checks.clayNoneWas': marker('recipe.checks.clayNoneWas'),
  'checks.clayLowFix': marker('recipe.checks.clayLowFix'),
  'checks.clayHigh': marker('recipe.checks.clayHigh'),
  'checks.clayHighProbably': marker('recipe.checks.clayHighProbably'),
  'checks.clayHighTends': marker('recipe.checks.clayHighTends'),
  'checks.clayHighFix': marker('recipe.checks.clayHighFix'),
  'checks.soluble': marker('recipe.checks.soluble'),
  'checks.boronFrit': marker('recipe.checks.boronFrit'),
  'checks.lowExpansionFrit': marker('recipe.checks.lowExpansionFrit'),
  'checks.alkaliFrit': marker('recipe.checks.alkaliFrit'),
  'checks.expansionRises': marker('recipe.checks.expansionRises'),
  'checks.expansionRisesProbably': marker('recipe.checks.expansionRisesProbably'),
  'checks.expansionRisesMay': marker('recipe.checks.expansionRisesMay'),
  'checks.expansionRisesFix': marker('recipe.checks.expansionRisesFix'),
  'checks.expansionFalls': marker('recipe.checks.expansionFalls'),
  'checks.expansionFallsProbably': marker('recipe.checks.expansionFallsProbably'),
  'checks.expansionFallsCan': marker('recipe.checks.expansionFallsCan'),
  'checks.expansionFallsTest': marker('recipe.checks.expansionFallsTest'),
  'checks.manyMaterials': marker('recipe.checks.manyMaterials'),
  'checks.smallAmount': marker('recipe.checks.smallAmount'),
  'pool.changed': marker('recipe.pool.changed'),
  'pool.added': marker('recipe.pool.added'),
  'lead.why.rawCalcium': marker('recipe.lead.why.rawCalcium'),
  'lead.why.lowExpansion': marker('recipe.lead.why.lowExpansion'),
  'lead.why.boronFrit': marker('recipe.lead.why.boronFrit'),
  'lead.why.zinc': marker('recipe.lead.why.zinc'),
  'lead.baseDoingLittle': marker('recipe.lead.baseDoingLittle'),
  'lead.antimony': marker('recipe.lead.antimony'),
  'lead.chrome': marker('recipe.lead.chrome'),
  'lead.copper': marker('recipe.lead.copper'),
  'lead.manganese': marker('recipe.lead.manganese'),
  'lead.iron': marker('recipe.lead.iron'),
  'shelf.empty': marker('recipe.shelf.empty')
};

/** A figure as the reader writes numbers: 0,30 or 0.30. */
export const figureText = (value: Figure): string =>
  value.upTo ? upTo(value.value, value.places) : fixed(value.value, value.places);

/** A message from the recipe tools, in the page's language. */
export const recipeText = (message: RecipeMessage): string =>
  translate(KEYS[message.code], paramsText(message, undefined, figureText));

/** A caution's sentences, one after another, in the page's language. */
export const cautionText = (caution: Caution): string => caution.sentences.map(recipeText).join(' ');
