// Types for lib/recipe/swaps.js (see index.d.ts).

import type { LibraryStatus, MaterialRecord } from './library';

export interface Swap {
  from: string;
  /** Why: the old material's status, and the year since. */
  status: LibraryStatus;
  statusSince?: string;
  to: string;
  /** Whether the two give the glaze much the same oxides, gram for gram (likeForLike). */
  like: boolean;
  /** Whether what takes its place still has lead in it. */
  lead: boolean;
}

/** An old colorant among the materials whose substitute is an additive. */
export interface ColorantSwap {
  from: string;
  status: LibraryStatus;
  statusSince?: string;
  to: string;
}

export function modernMaterials<M extends MaterialRecord>(
  materials: M[],
  find: (name: string) => M | undefined,
  region?: string,
  options?: {
    allowLead?: boolean;
    findAdditive?: (name: string) => { name: string; status?: LibraryStatus; statusSince?: string } | undefined;
  }
): { materials: M[]; swaps: Swap[]; colorants: ColorantSwap[] };
