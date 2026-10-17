// Types for lib/recipe/library.js (see index.d.ts).

import type { MaterialField, MaterialInput } from '../chemistry';

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

export type LibraryStatus = 'current' | 'scarce' | 'discontinued' | 'historical';

/** A material as the recipe tools read it: its chemistry, what the library says of it, and its amount in a recipe. */
export interface MaterialRecord extends MaterialInput {
  fields?: MaterialField[];
  category?: string;
  fritRole?: FritRole;
  region?: string[];
  status?: LibraryStatus;
  statusSince?: string;
  substitutes?: string[];
  soluble?: boolean;
  fluorine?: boolean;
  source?: { name: string; url?: string; date?: string; kind?: string };
  /** In a recipe, as saved: "12.5". */
  amount?: string;
}

/** What a colorant's or additive's amount is in (client/app/core/models.ts). */
export type AdditiveUnit = 'percent' | 'parts' | 'grams';

/** A colorant or additive on a recipe. */
export interface AdditiveRecord {
  name: string;
  amount?: string;
  unit?: AdditiveUnit;
  fields?: Array<{ name: string; amount: string | number }>;
}

/** A material the potter added to try, perhaps marked "must use". */
export interface TryMaterial<M extends MaterialRecord = MaterialRecord> {
  material: M;
  must: boolean;
}

export function hasLead(record: { fields?: Array<{ name: string; amount: string | number }> }): boolean;
export function inRegion(record: { region?: string[] }, region: string): boolean;
export function isIdealMineral(material: MaterialRecord): boolean;
export function suggestable(material: MaterialRecord, options: { region: string; allowLead?: boolean }): boolean;
