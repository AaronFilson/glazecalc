export const OUT: string;
/** The standard materials, as data/materials.ndjson has them. */
export function standardMaterials(): Array<{
  name: string;
  notes?: string[];
  hazards?: string;
  source?: { name: string };
}>;
/** The keys of the materials' notes and hazards in records/. */
export function materialKeys(): Set<string>;
/** The keys of the cone charts' notes in records/. */
export function coneKeys(): Set<string>;
/** Each language's materials file, by its name ('de.json'), from records/. */
export function materialFiles(): Record<string, string>;
/** Each language's cone notes file, by its name ('de.json'), from records/. */
export function coneFiles(): Record<string, string>;
