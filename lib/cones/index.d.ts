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

/** One cone of the chart Glazecalc uses: its figure for large cones at 150 °C an hour, Orton's older chart. */
export interface OrtonCone {
  cone: string;
  celsius: number;
}

/** One cone of Orton's current chart: °C by heating rate (°C an hour over the last 100 °C), where Orton prints one. */
export interface OrtonPublishedCone {
  /** As printed; half cones as '05.5' and '5.5'. */
  cone: string;
  /** Self-supporting regular cones (SSB), at 15, 60 and 150 °C an hour. */
  selfSupporting: Readonly<Partial<Record<15 | 60 | 150, number>>>;
  /** Large regular cones (LRB), at 60 and 150 °C an hour. */
  large?: Readonly<Partial<Record<60 | 150, number>>>;
  /** Large cones Orton makes with another composition and other equivalents (13 and 14). */
  largeDiffers?: true;
}

/** The Orton charts and where they were read (lib/cones/index.js). */
export interface OrtonCharts {
  /** What Glazecalc shows and checks by: Orton's older chart, large cones at 150 °C an hour, 022 to 15. */
  chart: {
    basis: string;
    size: 'large';
    rate: number;
    title: string;
    source: string;
    reprintedBy: string;
    alsoIn: string;
    status: 'verified' | 'secondary' | 'extract' | 'unverified';
    /** YYYY-MM-DD */
    checked: string;
    note: string;
    cones: ReadonlyArray<OrtonCone>;
  };
  /** Orton's own current figures, 022 to 14. */
  published: {
    title: string;
    publisher: string;
    year: number;
    source: string;
    current: string;
    products: string;
    status: 'verified' | 'secondary' | 'extract' | 'unverified';
    /** YYYY-MM-DD */
    checked: string;
    note: string;
    cones: ReadonlyArray<OrtonPublishedCone>;
  };
}

export const ORTON: OrtonCharts;

/** The charts' notes, which the cone chart shows in the page's language where there is a translation (lib/cones/index.js). */
export function texts(): string[];
