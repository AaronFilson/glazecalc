// Types for lib/recipe/cone-fit.js (see index.d.ts).

import type { ApproxBasis, ConeScale, FiringBlock, FiringProcess } from '../cones/firing';
import type { FiringBand } from './limits';
import type { RecipeMessage } from './messages';

/** The figures the check compares with (cone-fit.js; docs/adr/0022). */
export const CONE_FIT: Readonly<{
  boronOver: number;
  boronUnder: number;
  floor: Readonly<{ mid: { SiO2: number; Al2O3: number }; high: { SiO2: number; Al2O3: number } }>;
  ceiling: Readonly<{ low: number; mid: number }>;
  lead: number;
  lithium: number;
  alkali: number;
  zinc: number;
  silica: Readonly<{ min: number; max: number }>;
  colorants: number;
}>;

/** Where a figure is from: Katz's boron rule, Hesselberth & Roy's limits, or the UK traditional limits. */
export type ConeFitSource = 'katz' | 'hesselberth-roy' | 'uk';

export const CONE_FIT_SOURCES: Readonly<Record<ConeFitSource, { title: string; url?: string }>>;

/** Why a glaze is not judged. */
export type ConeFitSkip =
  | 'lead'
  | 'lithium'
  | 'alkali'
  | 'zinc'
  | 'notGlaze'
  | 'process'
  | 'ash'
  | 'noTemperature'
  | 'between'
  | 'belowChart'
  | 'aboveChart';

/** One of the two signals: an oxide's value against a figure, for a band, and where the figure is from. */
export interface ConeFitSignal {
  key: 'B2O3' | 'SiO2' | 'Al2O3';
  value: number;
  figure: number;
  /** The side of the figure the value is on. */
  side: 'above' | 'below';
  band: FiringBand;
  source: ConeFitSource;
}

export interface ConeFit {
  /** What was judged against: the firing's bands and its ends (a band chosen by hand is read at its cone). */
  stated: {
    bands: FiringBand[];
    ends: Array<{
      scale: ConeScale | 'band';
      /** The cone; none for the 'top' band chosen by hand, which has no cone its figures are for. */
      cone?: string;
      band?: FiringBand;
      celsius?: number;
      basis?: ApproxBasis;
    }>;
    chosen?: FiringBand;
  };
  /**
   * 'cooler' or 'hotter': a note, the chemistry pointing to a band outside every band stated;
   * 'closer': a range across bands whose chemistry looks closer to one end; 'fits': nothing points
   * away (not a pass); 'skipped': the figures do not cover this glaze or firing.
   */
  verdict: 'cooler' | 'hotter' | 'closer' | 'fits' | 'skipped';
  /** The band the chemistry looks like, for a note or 'closer'. */
  looksLike: FiringBand | null;
  /** For 'closer': the end of the range it looks closer to. */
  closerTo?: { scale: ConeScale; cone: string };
  signals: ConeFitSignal[];
  /** 'soft' for cone 6 against cone 10, which chemistry tells apart only roughly; null with no note. */
  strength: 'firm' | 'soft' | null;
  skipped?: ConeFitSkip;
  /** The recipe has Gerstley borate, whose boron varies from lot to lot. */
  gerstley?: true;
  /** What to say, as message codes; a note's last sentence says it is a guide, not a test. */
  sentences: RecipeMessage[];
  /** The sources of the figures a note rests on. */
  sources: Array<{ id: ConeFitSource; title: string; url?: string }>;
}

/**
 * Whether a glaze's unity formula fits its stated firing (a firing block, or a
 * band chosen by hand), by Katz's boron rule and Hesselberth & Roy's silica and
 * alumina; null with no firing to judge against.
 */
export function coneFit(
  unity: Record<string, number>,
  firing: FiringBlock | FiringBand | null | undefined | '',
  options?: { processes?: FiringProcess[]; materials?: string[] }
): ConeFit | null;
