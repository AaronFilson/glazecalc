// Types for lib/recipe/slurry.js (see index.d.ts). Litres and kilograms throughout.
// Every function that needs the dry materials' SG takes it: there is no default.

/** The bounds of a recipe's `sgTarget`, the SG its glaze is mixed to: 1 to 2.5. */
export const SG_TARGET_RANGE: Readonly<{ min: number; max: number }>;
/** Litres in a US gallon, an imperial gallon and an imperial pint. */
export const LITRES: Readonly<{ usGallon: number; imperialGallon: number; imperialPint: number }>;

/** Kilograms of dry glaze in a litre of slurry of this SG (Brongniart); null where the formula cannot take it. */
export function dryPerLitre(sg: number, dry: number): number | null;
/** The dry glaze and water (kg) in a volume of slurry. */
export function slurryContents(litres: number, sg: number, dry: number): { glaze: number; water: number } | null;
/**
 * Water (kg) to add to take a volume of slurry from one SG to another; negative is water to pour off.
 * It does not depend on `dry`: given, the SGs must be under it; null, only over water's.
 */
export function waterToReach(litres: number, sg: number, target: number, dry: number | null): number | null;
/**
 * Whether a slurry is at the SG wanted already: the water to reach it (kg, from `waterToReach`) is under 0.05% of its
 * volume (litres), half a gram a litre either way, and under a litre under half a gram, which the page and the MCP tool
 * would write as 0. The recipe page and the MCP tool both decide so by it.
 */
export function reachedAlready(water: number, litres: number): boolean;
/** For a weight of dry glaze (kg) at a target SG: the water to add (kg) and the slurry it makes (litres). */
export function waterForBatch(glaze: number, target: number, dry: number): { water: number; litres: number } | null;
/** The dry glaze and water (kg) to mix a volume (litres) at a target SG. */
export function batchForVolume(litres: number, target: number, dry: number): { glaze: number; water: number } | null;

export function sgFromBaume(baume: number): number;
export function baumeFromSg(sg: number): number;
/** SG from the ounces an imperial pint weighs. */
export function sgFromPint(ounces: number): number;
export function pintFromSg(sg: number): number;
