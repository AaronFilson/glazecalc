'use strict';

const { idOf, labelOf, IDS } = require('../identity');

const { hasLead, inRegion } = require('./library');
const { likeForLike } = require('./materials');

/**
 * @typedef {import('../../recipe/library').LibraryStatus} LibraryStatus
 * @typedef {import('../../recipe/library').MaterialRecord} MaterialRecord
 */

// Trying an old recipe with the materials that replace its discontinued ones
// (issue #6). A swap names the old material's status ('discontinued',
// 'scarce', 'historical') and the year since, for the app to put in words.

const current = (record) => !!record && (!record.status || record.status === 'current');

/**
 * The recipe's materials with each one that is no longer current (discontinued,
 * historical or hard to get) replaced, one for one at the same amount, by the
 * first substitute the library gives for it: one sold in `region` if there is
 * one, else one the region's library lists (a general one, or for Japan one of
 * the US set: inRegion). `find` looks a material up by name or other name.
 * Swaps are a starting point; amounts may need adjusting to bring the unity
 * formula back.
 *
 * An old colorant whose substitute is among the additives (`findAdditive`)
 * stays as it is, and is listed in `colorants` for the potter to move.
 *
 * @param {MaterialRecord[]} materials
 * @param {(wanted: MaterialRecord | string) => MaterialRecord | undefined} find  a record's library record, or a
 *   substitute's by its reference
 * @param {string} [region]
 * @param {{ allowLead?: boolean, findAdditive?: (name: string) =>
 *   { name: string, status?: LibraryStatus, statusSince?: string } | undefined }} [options]
 */
function modernMaterials(materials, find, region = '', { allowLead = true, findAdditive } = {}) {
  const swaps = [];
  const colorants = [];
  const status = (record) => ({
    status: record.status,
    ...(record.statusSince ? { statusSince: record.statusSince } : {})
  });
  const modern = materials.map((material) => {
    const record = find(material);
    if (!record?.status || record.status === 'current' || !record.substitutes?.length) return material;
    const substitutes = record.substitutes
      .map((name) => find(name))
      .filter(current)
      // With lead off, only a substitute without lead.
      .filter((sub) => allowLead || !hasLead(sub));
    const substitute =
      substitutes.find((sub) => region && sub.region?.includes(region)) ??
      substitutes.find((sub) => inRegion(sub, region)) ??
      substitutes[0];
    if (!substitute) {
      const additive =
        record.category === 'colorant'
          ? record.substitutes.map((name) => findAdditive?.(name)).find(current)
          : undefined;
      if (additive) colorants.push({ from: labelOf(material), ...status(record), to: labelOf(additive) });
      return material;
    }
    swaps.push({
      from: labelOf(material),
      ...status(record),
      to: labelOf(substitute),
      like: likeForLike(record, substitute),
      lead: hasLead(substitute),
      // The two records' ids, for matching them again, out of sight of the result's JSON.
      [IDS]: { from: idOf(material), to: idOf(substitute) }
    });
    return { ...structuredClone(substitute), amount: material.amount };
  });
  return { materials: mergeSameMaterials(modern), swaps, colorants };
}

/**
 * One line for each material: two old ones replaced by the same new one
 * (Custer and Oxford spar by G-200 EU), or one already in the recipe, become
 * one line with their amounts added, where both are numbers.
 */
function mergeSameMaterials(materials) {
  const merged = [];
  for (const material of materials) {
    const same = merged.find((m) => idOf(m) === idOf(material));
    const [a, b] = [Number(same?.amount), Number(material.amount)];
    if (same && same.amount?.trim() && material.amount?.trim() && Number.isFinite(a) && Number.isFinite(b)) {
      same.amount = String(Number((a + b).toFixed(5)));
    } else {
      merged.push({ ...material });
    }
  }
  return merged;
}

module.exports = { modernMaterials };
