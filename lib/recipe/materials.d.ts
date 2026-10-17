// Types for lib/recipe/materials.js (see index.d.ts).

import type { MaterialInput } from '../chemistry';
import type { FritRole, MaterialRecord } from './library';

export const LIKE_FOR_LIKE_GRAMS: number;
export function oxidePercent(material: MaterialInput, oxide: string): number;
export function gramsApart(a: MaterialInput, b: MaterialInput): number | null;
export function likeForLike(a: MaterialInput, b: MaterialInput): boolean;
export function roleOf(frit: MaterialRecord): FritRole | undefined;
export function fluxesOf(moles: Record<string, number>): number;
export function unityOf(moles: Record<string, number>): Record<string, number>;
/** Moles of each fired oxide in recipe lines, each a material with its amount as saved. */
export function molesOf(lines: MaterialRecord[]): Record<string, number>;
export function expansionOf(lines: MaterialRecord[]): number | null;
