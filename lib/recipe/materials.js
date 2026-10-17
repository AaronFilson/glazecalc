'use strict';

const { MOLAR_MASS, OXIDE_GROUPS, calculateUMF, materialWeights, molesPerGram, oxideMoles } = require('../chemistry');
const { amountOf } = require('./amounts');
const { hasLead } = require('./library');

// What the recipe tools work out from a material's chemistry: how much of an
// oxide it brings, how alike two are, a frit's job, and a recipe's oxides
// (docs/adr/0012-choosing-materials.md).

/** A material's weight percent of an oxide, as fired out of the raw material: G-200 EU Feldspar has 11% K₂O. */
function oxidePercent(material, oxide) {
  try {
    return (molesPerGram(material)[oxide] ?? 0) * MOLAR_MASS[oxide] * 100;
  } catch {
    return 0;
  }
}

/** Fired oxides per gram of the raw material, or null when it has no chemistry the app can read. */
function oxidesPerGram(material) {
  try {
    const { unity, equivalent } = materialWeights(material);
    return Object.fromEntries(
      Object.entries(unity).map(([oxide, moles]) => [oxide, (moles * MOLAR_MASS[oxide]) / equivalent])
    );
  } catch {
    return null;
  }
}

/** Grams of oxides two materials may differ by, per 100 g, and still swap one for one. */
const LIKE_FOR_LIKE_GRAMS = 15;

/**
 * How far apart two materials are: the grams by which their fired oxides per
 * 100 g of raw material differ, in all; null where either has no oxides to
 * compare.
 */
function gramsApart(a, b) {
  const [x, y] = [oxidesPerGram(a), oxidesPerGram(b)];
  if (!x || !y || !Object.keys(x).length || !Object.keys(y).length) return null;
  const oxides = new Set([...Object.keys(x), ...Object.keys(y)]);
  return [...oxides].reduce((sum, oxide) => sum + Math.abs((x[oxide] ?? 0) - (y[oxide] ?? 0)), 0) * 100;
}

/**
 * Whether one material can stand in for another gram for gram: their fired
 * oxides per 100 g of raw material differ by 15 g or less in all. Custer Spar
 * and G-200 EU Feldspar do; niter (potash) and a soda frit, or red lead and a
 * lead frit, do not, so their amounts need working out again.
 */
function likeForLike(a, b) {
  // Without oxides to compare, nothing says they are alike.
  const grams = gramsApart(a, b);
  return grams !== null && grams <= LIKE_FOR_LIKE_GRAMS;
}

/**
 * A frit's role: from its maker's stated use when the library has it, or
 * worked out from its oxides for one a potter entered (the research's window
 * for a base, and the alkali test for a partner).
 */
function roleOf(frit) {
  if (frit.fritRole) return frit.fritRole;
  if (frit.category !== 'frit') return undefined;
  if (hasLead(frit)) return 'lead';
  const p = (oxide) => oxidePercent(frit, oxide);
  const alkali = p('Na2O') + p('K2O') + p('Li2O');
  const minor = ['MgO', 'ZnO', 'BaO', 'SrO', 'ZrO2', 'Li2O'].every((oxide) => p(oxide) <= 3);
  if (p('B2O3') >= 10 && p('B2O3') <= 30 && p('SiO2') >= 40 && p('CaO') >= 8 && alkali >= 3 && alkali <= 13 && minor) {
    return 'base';
  }
  if (p('B2O3') < 10 && alkali >= 10) return 'alkali';
  if (p('B2O3') >= 40) return 'boron';
  return undefined;
}

/** The fluxes of a set of oxide moles: the unity formula's one mole. */
function fluxesOf(moles) {
  return Object.entries(moles).reduce(
    (sum, [oxide, amount]) => (OXIDE_GROUPS[oxide] === 'R2O' || OXIDE_GROUPS[oxide] === 'RO' ? sum + amount : sum),
    0
  );
}

/** The unity formula of oxide moles. */
function unityOf(moles) {
  const fluxes = fluxesOf(moles);
  return Object.fromEntries(Object.entries(moles).map(([oxide, amount]) => [oxide, fluxes > 0 ? amount / fluxes : 0]));
}

/** Moles of each fired oxide in recipe lines, each a material with its amount as saved. */
const molesOf = (lines) => oxideMoles(lines.map((line) => ({ material: line, amount: amountOf(line.amount) })));

/** A recipe's calculated expansion, or null where it cannot be worked out. */
function expansionOf(lines) {
  try {
    return calculateUMF(lines.map((line) => ({ material: line, amount: amountOf(line.amount) }))).expansion;
  } catch {
    return null;
  }
}

module.exports = {
  LIKE_FOR_LIKE_GRAMS,
  oxidePercent,
  gramsApart,
  likeForLike,
  roleOf,
  fluxesOf,
  unityOf,
  molesOf,
  expansionOf
};
