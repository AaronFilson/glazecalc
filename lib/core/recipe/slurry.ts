// A glaze in the bucket: how much dry glaze is in a slurry, how much water
// takes it to a specific gravity (SG), and what to mix for a bucket.
//
// Brongniart's formula: the dry weight in a volume of slurry is
//   (slurry weight − weight of the same volume of water) × S ÷ (S − 1)
// where S is the specific gravity of the dry materials. Potters take 2.5 or
// 2.6 for a glaze (quartz is 2.65, potash feldspar about 2.56, kaolinite about
// 2.6; Glazy's calculator assumes 2.6); the potter can change it. Per litre,
// with the slurry's SG d (its weight in kg per litre), that is
// (d − 1) × S ÷ (S − 1) kg. Water and dry glaze are taken to add their
// volumes, which is close for a glaze slurry. Digitalfire puts most dipping
// glazes near SG 1.45 (https://digitalfire.com/glossary/specific+gravity).
//
// Everything here is metric (litres and kilograms); the app converts what the
// potter types. A slurry's SG must be over 1 (water) and under the dry
// materials' own; where it is not, or a value is missing, the answer is null.

/** Litres in a US gallon, an imperial gallon and an imperial pint. */
const LITRES = Object.freeze({ usGallon: 3.785411784, imperialGallon: 4.54609, imperialPint: 0.56826125 });

const valid = (sg: number, dry: number): boolean =>
  Number.isFinite(sg) && Number.isFinite(dry) && dry > 1 && sg > 1 && sg < dry;

/** Kilograms of dry glaze in a litre of slurry of this SG (Brongniart). */
function dryPerLitre(sg: number, dry: number): number | null {
  return valid(sg, dry) ? ((sg - 1) * dry) / (dry - 1) : null;
}

/**
 * What a volume of slurry holds: its dry glaze and its water, in kilograms.
 * Null for a volume that is not positive or an SG the formula cannot take.
 */
function slurryContents(litres: number, sg: number, dry: number): { glaze: number; water: number } | null {
  const perLitre = dryPerLitre(sg, dry);
  if (perLitre === null || !(litres > 0)) return null;
  const glaze = litres * perLitre;
  return { glaze, water: litres * sg - glaze };
}

/**
 * Water to add to a volume of slurry to bring it from one SG to another, in
 * kilograms (a litre of water weighs a kilogram): negative is water to take
 * off, by letting the glaze settle and pouring off the clear water. It does
 * not depend on the dry materials' SG. The slurry ends at `litres` plus the
 * water. Null for values the formula cannot take. With `dry` null, the SGs
 * need only be over water's.
 */
function waterToReach(litres: number, sg: number, target: number, dry?: number | null): number | null {
  const fine = (value: number) =>
    dry === null || dry === undefined ? Number.isFinite(value) && value > 1 : valid(value, dry);
  if (!(litres > 0) || !fine(sg) || !fine(target)) return null;
  return (litres * (sg - target)) / (target - 1);
}

/**
 * Whether a slurry is at the SG wanted already: the water to reach it (from
 * waterToReach, in kilograms) is under 0.05% of the slurry's volume in litres,
 * half a gram a litre either way, and under a litre under half a gram, as the
 * page writes the water to the gram (and the MCP tool to 0.001 L): so water
 * it would write as 0 is never water to add or pour off. The recipe page and
 * the MCP tool both decide so by it.
 */
function reachedAlready(water: number, litres: number): boolean {
  return Math.abs(water) < 0.0005 * Math.max(litres, 1);
}

/**
 * Mixing a batch: for a weight of dry glaze (kg) at a target SG, the water to
 * add (kg) and the slurry it makes (litres). Null for values it cannot take.
 */
function waterForBatch(glaze: number, target: number, dry: number): { water: number; litres: number } | null {
  const perLitre = dryPerLitre(target, dry);
  if (perLitre === null || !(glaze > 0)) return null;
  const litres = glaze / perLitre;
  return { water: litres * target - glaze, litres };
}

/** Mixing for a bucket: the dry glaze and the water (kg) for a volume (litres) at a target SG. */
function batchForVolume(litres: number, target: number, dry: number): { glaze: number; water: number } | null {
  return slurryContents(litres, target, dry);
}

/** SG from degrees Baumé (heavier than water): SG = 145 ÷ (145 − °Bé). */
const sgFromBaume = (baume: number): number => 145 / (145 - baume);
/** Degrees Baumé from SG. */
const baumeFromSg = (sg: number): number => 145 - 145 / sg;
/** SG from the weight of an imperial pint in ounces: its water weighs 20 oz. */
const sgFromPint = (ounces: number): number => ounces / 20;
/** The ounces an imperial pint weighs at an SG. */
const pintFromSg = (sg: number): number => sg * 20;

export {
  LITRES,
  dryPerLitre,
  slurryContents,
  waterToReach,
  reachedAlready,
  waterForBatch,
  batchForVolume,
  sgFromBaume,
  baumeFromSg,
  sgFromPint,
  pintFromSg
};
