/** One SK large cone: its number as printed ('022', '015a', '7') and its nominal melt-down temperature in °C. */
export interface SkCone {
  cone: string;
  celsius: number;
}

/** One cone of Orton's older chart: its figure for large cones at 150 °C an hour. */
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

export const SK_CONES: ReadonlyArray<SkCone>;
export const ORTON_CHART_CONES: ReadonlyArray<OrtonCone>;
export const ORTON_PUBLISHED_CONES: ReadonlyArray<OrtonPublishedCone>;
