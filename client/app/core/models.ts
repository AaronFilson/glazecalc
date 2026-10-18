import type { MaterialField, UmfResult } from '../../../lib/chemistry';
import type { FiringBand } from '../../../lib/recipe/limits';
import type { FiringBlock } from '../../../lib/cones/firing';

/** Records the server stores per user; 'Standard' marks built-in records. */
export interface Owned {
  _id?: string;
  ownedBy?: string;
}

/** What a standard material or additive is and where its numbers come from (server/models/library_info.ts). */
/** A frit's job, from its maker's stated use (research_notes/Base frits for lead free glazes). */
export type FritRole =
  | 'base'
  | 'base-alkaline'
  | 'alkali'
  | 'boron'
  | 'low-expansion'
  | 'opacified'
  | 'zinc'
  | 'matte'
  | 'stoneware'
  | 'lead';

export interface LibraryInfo {
  aliases?: string[];
  category?: string;
  fritRole?: FritRole;
  region?: string[];
  status?: 'current' | 'scarce' | 'discontinued' | 'historical';
  statusSince?: string;
  substitutes?: string[];
  replaces?: string[];
  manufacturer?: string;
  /** Hazard classification from a current safety data sheet. */
  hazards?: string;
  source?: { name: string; url?: string; date?: string; kind?: string };
  /** Adds nothing to the unity formula: stains, gums, silicon carbide. */
  noChemistry?: boolean;
  /** Uses another record's chemistry, named here, for one with no analysis of its own. */
  chemistryOf?: string;
  /** Dissolves in water (borax, boric acid, soda ash): not suggested, though it can be added. */
  soluble?: boolean;
  /** Releases fluorine in firing (fluorspar, cryolite): not suggested, though it can be added. */
  fluorine?: boolean;
}

export interface Material extends Owned, LibraryInfo {
  name: string;
  rawformula?: string;
  relatedTo?: string[] | string;
  notes?: string[] | string;
  fields: MaterialField[];
  percentmole: 'molecular' | 'percent';
  loi: number | string | null;
  molecularweight?: number | string | null;
  equivalent?: number;
  formulaweight?: number;
}

/** A material placed in a recipe, with its batch amount. */
export interface RecipeMaterial extends Material {
  amount?: string;
}

/**
 * A colorant, opacifier or other additive. Its chemistry is stored as a
 * material's is, so a recipe can count it in the unity formula; additives saved
 * before that have only their fields, which may name elements.
 */
export interface Additive extends Owned, LibraryInfo {
  name: string;
  rawformula?: string;
  relatedTo?: string[] | string;
  notes?: string[] | string;
  fields: MaterialField[];
  percentmole?: 'molecular' | 'percent';
  loi?: number | string | null;
  molecularweight?: number | string | null;
  equivalent?: number;
  formulaweight?: number;
  amount?: string;
  /** On a recipe: what the amount is in (see AdditiveUnit). */
  unit?: AdditiveUnit;
}

/**
 * A colorant's or additive's amount on top of a recipe's base:
 *   percent  a percent of the base's total (2 = 2%), as most recipes give them
 *   parts    in the base's own unit
 *   grams    a weight, in the same batch as the base
 * Saved recipes from before units were chosen have none; they read as percent.
 */
export type AdditiveUnit = 'percent' | 'parts' | 'grams';

/** Saved analysis; recipes saved by older versions only have uList. */
export interface RecipeAnalysis extends Partial<UmfResult> {
  uList: Record<string, number>;
}

export interface Recipe extends Owned {
  title: string;
  date?: string;
  notes?: string[] | string;
  materials: RecipeMaterial[];
  additives?: Additive[];
  computed?: RecipeAnalysis[] | RecipeAnalysis;
  /** Whether the unity formula counts the additives too. */
  includeAdditives?: boolean;
  /** The firing it is for, as a band (lib/recipe/limits.js): cone 06-02, cone 4-6 or cone 9-11; null clears it. */
  firing?: FiringBand | null;
  /** The specific gravity its glaze is mixed to, 1 to 2.5, set from the SG calculator; null clears it. */
  sgTarget?: number | null;
  /** The firing as stated (lib/cones/firing.js): none or null is not stated. */
  firedAt?: FiringBlock | null;
  /** For a food surface (a liner); the safety note follows it. */
  foodSurface?: boolean | null;
  /** The firing logs it went through, each with its result. */
  firings?: FiringLink[];
}

/** A recipe's link to a firing log, by the log's id, with what came of it there. */
export interface FiringLink {
  firing: string;
  result?: string;
}

export interface Advice extends Owned {
  title: string;
  content: string;
  tags: string[] | string;
}

export interface Note extends Owned {
  title?: string;
  content: string;
  relatedCollection: string;
  relatedId: string;
}

export interface Firing extends Owned {
  title: string;
  kiln?: string;
  date?: string;
  notes?: string[] | string;
  fieldsIncluded: string[];
  rows: string[][];
}
