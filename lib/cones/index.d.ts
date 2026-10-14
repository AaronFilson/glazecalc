/** One SK large cone: its number as printed ('022', '015a', '7') and its nominal melt-down temperature. */
export interface SkCone {
  cone: string;
  /** The standard's reference temperature in °C: nominal (JIS), not a measured bend. */
  celsius: number;
}

/** The SK (JIS R 8101) chart and where it was read (lib/cones/index.js). */
export interface SkChart {
  /** What the figures are: 'nominal (JIS)'. */
  basis: string;
  standard: string;
  size: 'large';
  /** The seller whose table the figures are read from, in Japanese. */
  seller: string;
  source: string;
  standardUrl: string;
  standardStatus: string;
  /** YYYY-MM-DD */
  standardReconfirmed: string;
  status: 'verified' | 'secondary' | 'extract' | 'unverified';
  /** YYYY-MM-DD */
  checked: string;
  note: string;
  cones: ReadonlyArray<SkCone>;
}

export const SK: SkChart;
