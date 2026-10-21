// Types for lib/recipe/blends.js (see index.d.ts).

import type { AdditiveUnit } from './library';

export type BlendKind = 'line' | 'biaxial' | 'triaxial';

export const BLEND_CORNERS: Readonly<Record<BlendKind, number>>;
export const BLEND_STEPS: Readonly<Record<BlendKind, { min: number; max: number }>>;

export interface BlendTile {
  /** From 1. */
  number: number;
  row: number;
  col: number;
  /** Each corner's share, 0 to 1, in the corners' order. */
  shares: number[];
}

export interface Blend {
  kind: BlendKind;
  steps: number;
  corners: number;
  rows: number;
  tiles: BlendTile[];
}

export function blendTiles(kind: BlendKind, steps: number): Blend | null;

/** A line of a corner recipe: a material or additive with its amount as saved. */
export interface BlendLine {
  _id?: string;
  name: string;
  amount?: string;
  unit?: AdditiveUnit;
}

export interface MixedRecipe<M, A> {
  /** Percent of the base: they add up to 100. */
  materials: Array<{ line: M; amount: number }>;
  /** Percent of the base. */
  additives: Array<{ line: A; amount: number }>;
}

/** One tile of an ingredient blend: its amount of the material and its lines (amounts above nothing). */
export interface VariedTile {
  amount: number;
  lines: Array<{ name: string; amount: number }>;
}

/** The tiles, or the first amount at which the material it replaces would go below nothing. */
export function varyMaterial(
  base: ReadonlyArray<{ name: string; amount: number }>,
  material: string,
  amounts: readonly number[],
  mode: 'add' | 'replace',
  instead?: string
): { tiles: VariedTile[]; tooMuch?: undefined } | { tooMuch: number; tiles?: undefined };

export function mixRecipes<M extends BlendLine, A extends BlendLine>(
  corners: ReadonlyArray<{ materials?: M[]; additives?: A[] }>,
  shares: readonly number[]
): MixedRecipe<M, A> | null;
