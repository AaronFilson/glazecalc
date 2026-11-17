import { idOf, labelOf, IDS } from '../identity.ts';

import { hasLead, inRegion } from './library.ts';
import { likeForLike } from './materials.ts';
import type { LibraryStatus, MaterialRecord } from './library.ts';

export interface Swap {
  /** labelOf the old material and the new; their ids (idOf) are under IDS, not enumerable. */
  from: unknown;
  /** Why: the old material's status, and the year since. */
  status: LibraryStatus;
  statusSince?: string;
  to: unknown;
  /** Whether the two give the glaze much the same oxides, gram for gram (likeForLike). */
  like: boolean;
  /** Whether what takes its place still has lead in it. */
  lead: boolean;
  /** The two records' ids (idOf), not enumerable. */
  readonly [IDS]: { from: unknown; to: unknown };
}

/** An old colorant among the materials whose substitute is an additive. */
export interface ColorantSwap {
  from: unknown;
  status: LibraryStatus;
  statusSince?: string;
  to: unknown;
}

/** What the library says of an additive: whether it is current. */
type AdditiveStatus = { status?: LibraryStatus; statusSince?: string; [more: string]: unknown };

// Trying an old recipe with the materials that replace its discontinued ones
// (issue #6). A swap names the old material's status ('discontinued',
// 'scarce', 'historical') and the year since, for the app to put in words.

const current = <T extends { status?: LibraryStatus }>(record: T | null | undefined): record is T =>
  !!record && (!record.status || record.status === 'current');

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
 * `find` gives a record's library record, or a substitute's by its reference.
 */
function modernMaterials<M extends MaterialRecord>(
  materials: M[],
  find: (wanted: M | string) => M | undefined,
  region: string = '',
  {
    allowLead = true,
    findAdditive
  }: { allowLead?: boolean; findAdditive?: (reference: string) => AdditiveStatus | undefined } = {}
): { materials: M[]; swaps: Swap[]; colorants: ColorantSwap[] } {
  const swaps: Swap[] = [];
  const colorants: ColorantSwap[] = [];
  const status = (record: { status?: LibraryStatus; statusSince?: string }) => ({
    status: record.status as LibraryStatus,
    ...(record.statusSince ? { statusSince: record.statusSince } : {})
  });
  const modern = materials.map((material): M => {
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
      lead: hasLead(substitute)
    } as Swap);
    // The two records' ids, for matching them again: not enumerable, out of sight of the result.
    Object.defineProperty(swaps[swaps.length - 1], IDS, { value: { from: idOf(material), to: idOf(substitute) } });
    return { ...structuredClone(substitute), amount: material.amount };
  });
  return { materials: mergeSameMaterials(modern), swaps, colorants };
}

/**
 * One line for each material: two old ones replaced by the same new one
 * (Custer and Oxford spar by G-200 EU), or one already in the recipe, become
 * one line with their amounts added, where both are numbers.
 */
function mergeSameMaterials<M extends MaterialRecord>(materials: M[]): M[] {
  const merged: M[] = [];
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

export { modernMaterials };
