// Types for lib/recipe/worked.js (see index.d.ts).

import type { OxideGroup, RecipeLine } from '../chemistry';

/** One oxide a material leaves after firing, as worked out for its grams in the batch. */
export interface WorkedOxide {
  oxide: string;
  /** Its weight percent of the raw material. */
  percent: number;
  /** Grams of it in the material's grams: grams × percent ÷ 100. */
  grams: number;
  /** Grams in a mole of it. */
  molarMass: number;
  /** Its moles: grams ÷ molar mass. */
  moles: number;
}

export interface WorkedMaterial {
  name: string;
  /** The material's amount, read as grams. */
  grams: number;
  /** Its loss on ignition, in percent: the part that burns away. */
  loi: number;
  oxides: WorkedOxide[];
}

export interface WorkedTotal {
  oxide: string;
  group: OxideGroup;
  /** Whether it is one of the fluxes (R₂O and RO), which the unity formula makes 1 in all. */
  flux: boolean;
  /** Its moles in the whole batch. */
  moles: number;
  /** Its moles divided by the fluxes' total: the unity formula. */
  unity: number;
}

export interface WorkedCalculation {
  /** The amounts added up, as grams. */
  batchGrams: number;
  /** Each material with an amount, in the recipe's order. */
  materials: WorkedMaterial[];
  /** The fluxes' moles in the batch, which are added up. */
  fluxes: Array<{ oxide: string; moles: number }>;
  fluxMoles: number;
  /** Every oxide in the batch, fluxes first. */
  oxides: WorkedTotal[];
}

export function workedCalculation(lines: RecipeLine[]): WorkedCalculation;
