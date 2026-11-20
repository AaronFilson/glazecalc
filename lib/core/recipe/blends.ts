import { keyOf } from '../identity.ts';

// Blends for test tiles: line blends between two recipes, biaxial blends
// between four (the corners of a square) and triaxial blends between three
// (the corners of a triangle). Each tile is a mix of the corner recipes in
// set proportions; its recipe is the corners' recipes, each as a percent of
// its base, mixed in those proportions.

import { amountOf, totalOf, unitOf } from './amounts.ts';
import type { Amount } from './amounts.ts';
import type { AdditiveUnit } from './library.ts';
import type { Host } from '../host.ts';

export type BlendKind = 'line' | 'biaxial' | 'triaxial';

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

/** A line of a corner recipe: a material or additive with its amount as saved; keyOf says which are the same. */
export interface BlendLine {
  amount?: Amount;
  unit?: AdditiveUnit;
  [more: string]: unknown;
}

export interface MixedRecipe<M, A> {
  /** Percent of the base: they add up to 100. */
  materials: Array<{ line: M; amount: number }>;
  /** Percent of the base. */
  additives: Array<{ line: A; amount: number }>;
}

/** One tile of an ingredient blend: its amount of the material and its lines (amounts above nothing), by id. */
export interface VariedTile {
  amount: number;
  lines: Array<{ id: unknown; amount: number }>;
}

/** How many corner recipes each kind of blend mixes. */
const CORNERS: Readonly<Record<BlendKind, number>> = { line: 2, biaxial: 4, triaxial: 3 };

/**
 * The fewest and most steps each kind takes: tiles in a line, tiles along a
 * side of a biaxial square (8 is 64 tiles), rows of a triaxial triangle
 * (11 is 66 tiles).
 */
const STEPS: Readonly<Record<BlendKind, { min: number; max: number }>> = {
  line: { min: 2, max: 21 },
  biaxial: { min: 2, max: 8 },
  triaxial: { min: 2, max: 11 }
};

// Shares a hair off a round number (0.30000000000000004) are rounded to it.
const share = (value: number): number => Math.round(value * 1e9) / 1e9;

/**
 * A blend's tiles: each one's number (from 1), its row and column, and each
 * corner's share of it (0 to 1, adding up to 1), corners in order:
 *
 *   line      A at the first tile, B at the last
 *   biaxial   A top left, B top right, C bottom left, D bottom right; a grid of
 *             steps by steps, numbered across each row
 *   triaxial  A at the top, B bottom left, C bottom right; row r (from 0) has
 *             r + 1 tiles, numbered from the top, left to right
 *
 * Null for an unknown kind or steps out of range.
 */
function blendTiles(kind: BlendKind, steps: number): Blend | null {
  // Only STEPS' own kinds: an inherited key ('toString') has no range, and was read as a triaxial blend.
  if (!Object.hasOwn(STEPS, kind)) return null;
  const range = STEPS[kind];
  if (!Number.isInteger(steps) || steps < range.min || steps > range.max) return null;
  const last = steps - 1;
  const tiles: BlendTile[] = [];
  if (kind === 'line') {
    for (let col = 0; col < steps; col++) {
      tiles.push({ number: col + 1, row: 0, col, shares: [share(1 - col / last), share(col / last)] });
    }
  } else if (kind === 'biaxial') {
    for (let row = 0; row < steps; row++) {
      for (let col = 0; col < steps; col++) {
        const across = col / last;
        const down = row / last;
        tiles.push({
          number: tiles.length + 1,
          row,
          col,
          shares: [
            share((1 - across) * (1 - down)),
            share(across * (1 - down)),
            share((1 - across) * down),
            share(across * down)
          ]
        });
      }
    }
  } else {
    for (let row = 0; row < steps; row++) {
      for (let col = 0; col <= row; col++) {
        tiles.push({
          number: tiles.length + 1,
          row,
          col,
          shares: [share((last - row) / last), share((row - col) / last), share(col / last)]
        });
      }
    }
  }
  return { kind, steps, corners: CORNERS[kind], rows: kind === 'line' ? 1 : steps, tiles };
}

/**
 * A tile's recipe: the corner recipes mixed by their shares. Each corner's
 * base materials count as a percent of its base, so the tile's base adds up
 * to 100; each colorant or additive becomes a percent of the base (one in
 * parts or grams by the corner's base total). A material in several corners
 * (keyOf) is one line. Lines come in the order they first appear, corner by
 * corner, from the corners with a share; those with nothing in this tile are
 * left out. Amounts are numbers, not rounded. Null when a corner with a share
 * has no base to mix.
 */
function mixRecipes<M extends BlendLine, A extends BlendLine>(
  host: Host,
  corners: ReadonlyArray<{ materials?: M[]; additives?: A[] }>,
  shares: readonly number[]
): MixedRecipe<M, A> | null {
  const materials = new Map<string, { line: M; amount: number }>();
  const additives = new Map<string, { line: A; amount: number }>();
  const add = <L>(into: Map<string, { line: L; amount: number }>, line: L, amount: number) => {
    const key = keyOf(host, line);
    const entry = into.get(key);
    if (entry) entry.amount += amount;
    else into.set(key, { line, amount });
  };
  for (let i = 0; i < corners.length; i++) {
    const corner = corners[i];
    const weight = shares[i] ?? 0;
    const base = totalOf((corner.materials ?? []).map((m) => m.amount));
    if (!base) {
      if (weight > 0) return null;
      continue;
    }
    // A corner with no share has no lines in the tile, so none of its lines stands for another corner's.
    if (!(weight > 0)) continue;
    for (const material of corner.materials ?? [])
      add(materials, material, (weight * amountOf(material.amount) * 100) / base);
    for (const additive of corner.additives ?? []) {
      const amount = amountOf(additive.amount);
      const percent = unitOf(additive) === 'percent' ? amount : (amount * 100) / base;
      add(additives, additive, weight * percent);
    }
  }
  const kept = <L>(into: Map<string, { line: L; amount: number }>) =>
    [...into.values()]
      .filter((entry) => entry.amount > 1e-9)
      .map((entry) => ({ line: entry.line, amount: entry.amount }));
  return { materials: kept(materials), additives: kept(additives) };
}

/**
 * What one material does across a range (an ingredient blend, a progression
 * test): `amounts` of `material` put into the base recipe, one tile for each.
 * In mode 'add' the material goes on top of the base, as it stands, so the
 * tile's total grows; in mode 'replace' the same amount comes out of the line
 * whose id is `instead`, so the total stays the same. A material already in the base
 * has the amount added to its own line; otherwise it becomes a line at the end.
 * Lines with nothing in a tile are left out. Lines are { id, amount }, matched by id. Returns
 * the tiles, each with its amount of the material and its lines, or, if
 * `instead` would go below nothing, { tooMuch } with the first amount that
 * does it. Amounts are numbers, not rounded.
 */
function varyMaterial(
  base: ReadonlyArray<{ id: unknown; amount: number }>,
  material: unknown,
  amounts: readonly number[],
  mode: 'add' | 'replace',
  instead?: unknown
): { tiles: VariedTile[]; tooMuch?: undefined } | { tooMuch: number; tiles?: undefined } {
  const tiles: VariedTile[] = [];
  for (const amount of amounts) {
    const lines = base.map((line) => ({ id: line.id, amount: line.amount }));
    const own = lines.find((line) => line.id === material);
    if (own) own.amount += amount;
    else lines.push({ id: material, amount });
    if (mode === 'replace') {
      const taken = lines.find((line) => line.id === instead);
      if (taken) taken.amount -= amount;
      if (!taken || taken.amount < -1e-9) return { tooMuch: amount };
    }
    tiles.push({ amount, lines: lines.filter((line) => line.amount > 1e-9) });
  }
  return { tiles };
}

export { CORNERS as BLEND_CORNERS, STEPS as BLEND_STEPS, blendTiles, mixRecipes, varyMaterial };
