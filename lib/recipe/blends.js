'use strict';

// Blends for test tiles: line blends between two recipes, biaxial blends
// between four (the corners of a square) and triaxial blends between three
// (the corners of a triangle). Each tile is a mix of the corner recipes in
// set proportions; its recipe is the corners' recipes, each as a percent of
// its base, mixed in those proportions.

const { amountOf, totalOf, unitOf } = require('./amounts');

/** How many corner recipes each kind of blend mixes. */
const CORNERS = { line: 2, biaxial: 4, triaxial: 3 };

/**
 * The fewest and most steps each kind takes: tiles in a line, tiles along a
 * side of a biaxial square (8 is 64 tiles), rows of a triaxial triangle
 * (11 is 66 tiles).
 */
const STEPS = { line: { min: 2, max: 21 }, biaxial: { min: 2, max: 8 }, triaxial: { min: 2, max: 11 } };

// Shares a hair off a round number (0.30000000000000004) are rounded to it.
const share = (value) => Math.round(value * 1e9) / 1e9;

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
function blendTiles(kind, steps) {
  const range = STEPS[kind];
  if (!range || !Number.isInteger(steps) || steps < range.min || steps > range.max) return null;
  const last = steps - 1;
  const tiles = [];
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

/** Which lines of the corner recipes are the same material: by saved id, else by name. */
const sameKey = (line) =>
  line._id ? 'id:' + line._id : 'name:' + String(line.name).normalize('NFKC').toLowerCase().trim();

/**
 * A tile's recipe: the corner recipes mixed by their shares. Each corner's
 * base materials count as a percent of its base, so the tile's base adds up
 * to 100; each colorant or additive becomes a percent of the base (one in
 * parts or grams by the corner's base total). A material in several corners
 * is one line. Lines come in the order they first appear, corner by corner;
 * those with nothing in this tile are left out. Amounts are numbers, not
 * rounded. Null when a corner with a share has no base to mix.
 */
function mixRecipes(corners, shares) {
  const materials = new Map();
  const additives = new Map();
  const add = (into, line, amount) => {
    const key = sameKey(line);
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
    for (const material of corner.materials ?? [])
      add(materials, material, (weight * amountOf(material.amount) * 100) / base);
    for (const additive of corner.additives ?? []) {
      const amount = amountOf(additive.amount);
      const percent = unitOf(additive) === 'percent' ? amount : (amount * 100) / base;
      add(additives, additive, weight * percent);
    }
  }
  const kept = (into) =>
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
 * named `instead`, so the total stays the same. A material already in the base
 * has the amount added to its own line; otherwise it becomes a line at the end.
 * Lines with nothing in a tile are left out. Lines are matched by name. Returns
 * the tiles, each with its amount of the material and its lines, or, if
 * `instead` would go below nothing, { tooMuch } with the first amount that
 * does it. Amounts are numbers, not rounded.
 */
function varyMaterial(base, material, amounts, mode, instead) {
  const tiles = [];
  for (const amount of amounts) {
    const lines = base.map((line) => ({ name: line.name, amount: line.amount }));
    const own = lines.find((line) => line.name === material);
    if (own) own.amount += amount;
    else lines.push({ name: material, amount });
    if (mode === 'replace') {
      const taken = lines.find((line) => line.name === instead);
      if (taken) taken.amount -= amount;
      if (!taken || taken.amount < -1e-9) return { tooMuch: amount };
    }
    tiles.push({ amount, lines: lines.filter((line) => line.amount > 1e-9) });
  }
  return { tiles };
}

module.exports = { BLEND_CORNERS: CORNERS, BLEND_STEPS: STEPS, blendTiles, mixRecipes, varyMaterial };
