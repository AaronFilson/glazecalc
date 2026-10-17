import mongoose from 'mongoose';
import firing from '../../lib/cones/firing.js';
import type { FiringBlock } from '../../lib/cones/firing.js';
import slurry from '../../lib/recipe/slurry.js';

/** How many firing logs a recipe can be linked to, and how long each one's result note can be. */
export const FIRING_LINKS = { most: 100, result: 500 } as const;

// A link to a firing log the recipe went through, with what came of it there.
const firingLinkSchema = new mongoose.Schema(
  {
    firing: {
      type: String,
      required: true,
      validate: { validator: (id: string) => mongoose.isValidObjectId(id), message: 'not an id' }
    },
    result: { type: String, maxlength: FIRING_LINKS.result }
  },
  { _id: false }
);

// A glaze recipe: materials and additives with amounts, and the unity formula
// the browser worked out for it (computed).
const recipeSchema = new mongoose.Schema({
  additives: [mongoose.Schema.Types.Mixed],
  computed: [mongoose.Schema.Types.Mixed],
  date: String,
  // The band its limits are checked in, chosen by hand: cone 06-02, cone 4-6 or cone 9-11
  // (lib/recipe/limits.js). It overrides the bands the firing block below gives; not saved until
  // chosen; null clears it. Kept under its wave-2 name (docs/adr/0021-recipe-firing.md).
  firing: { type: String, enum: ['low', 'mid', 'high'] },
  // The firing as the potter states it (lib/cones/firing.js): the cone scale, the low cone and an
  // optional high one, the cones tested, the atmosphere and process, and for a temperature the rate
  // and hold. The cone is kept as entered, never converted. None (or null) is "not stated".
  firedAt: {
    type: mongoose.Schema.Types.Mixed,
    set: (block: unknown) =>
      block === null || block === undefined || firing.firingProblem(block)
        ? block
        : firing.cleanFiring(block as FiringBlock),
    validate: {
      validator: (block: unknown) => block === null || block === undefined || firing.firingProblem(block) === null,
      message: 'not a firing'
    }
  },
  // Used on a food surface (a liner): the recipe page's safety note says food safety depends on firing
  // to the tested cone.
  foodSurface: Boolean,
  // The firing logs it went through, each with its result there.
  firings: {
    type: [firingLinkSchema],
    default: undefined,
    validate: { validator: (list: unknown[]) => list.length <= FIRING_LINKS.most, message: 'too many' }
  },
  // The specific gravity the glaze is mixed to, set from the recipe page's SG calculator and
  // read by the mix ticket. A number from 1 (water) to 2.5; null clears it.
  sgTarget: { type: Number, min: slurry.SG_TARGET_RANGE.min, max: slurry.SG_TARGET_RANGE.max },
  // Whether the unity formula counts the additives (colorants) too.
  includeAdditives: Boolean,
  materials: { type: [mongoose.Schema.Types.Mixed], required: true },
  notes: [String],
  ownedBy: { type: String, required: true },
  title: { type: String, required: true }
});

export default mongoose.model('Recipe', recipeSchema);
