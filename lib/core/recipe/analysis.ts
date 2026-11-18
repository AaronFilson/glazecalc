import type { Host } from '../host.ts';
import type { Oxides } from '../types.ts';

/** A point on Stull's chart: [SiO2, Al2O3] in moles. */
export type StullXY = readonly [number, number];
export type StullRegion = 'unfused' | 'matte' | 'semi-matte' | 'bright' | 'underfired' | 'unclassified';

export interface StullPoint {
  silica: number;
  alumina: number;
  ratio: number;
  /** Null off the chart. */
  region: StullRegion | null;
  crazed: boolean;
}

/** Stull's chart: its extent, regions, crazed area and line of brightest glazes. */
export interface StullChart {
  readonly silica: Readonly<{ min: number; max: number }>;
  readonly alumina: Readonly<{ min: number; max: number }>;
  readonly regions: Readonly<Record<Exclude<StullRegion, 'bright' | 'unclassified'>, ReadonlyArray<StullXY>>>;
  readonly crazed: ReadonlyArray<StullXY>;
  readonly bright: ReadonlyArray<StullXY>;
}

// What a unity formula says beyond its oxides (docs/adr/0019-shared-recipe-tools.md):
// each oxide's share of the moles, and where the glaze sits on a Stull chart.
// Pure functions of the unity formula, with no words; the regions are codes.

/** Each oxide's percent of all the moles in a unity formula; empty when it has none. */
function molePercent(unity: Oxides | null | undefined): Oxides {
  const entries = Object.entries(unity ?? {}).filter(([, moles]) => moles > 0);
  const total = entries.reduce((sum, [, moles]) => sum + moles, 0);
  return total > 0 ? Object.fromEntries(entries.map(([oxide, moles]) => [oxide, (100 * moles) / total])) : {};
}

/** How far off an edge, as the cross product of the point with it, a point still counts as on it: rounding. */
const ON_EDGE = 1e-12;

/** The least alumina in any of a Stull chart's regions (0.08 on Stull's). */
const lowestAlumina = (chart: StullChart): number =>
  Math.min(...Object.values(chart.regions).flatMap((region) => region.map(([, alumina]) => alumina)));

/**
 * Whether a point is inside a polygon (even-odd rule) or on its outline. A point on an edge is in it: the chart's
 * own edges (alumina 1.0, silica 0.6 and 7.2) bound regions too, and an edge two regions share goes to the first.
 */
function inside([x, y]: StullXY, polygon: ReadonlyArray<StullXY>): boolean {
  let within = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const onLine = Math.abs((xj - xi) * (y - yi) - (yj - yi) * (x - xi)) <= ON_EDGE;
    const between =
      x >= Math.min(xi, xj) - ON_EDGE &&
      x <= Math.max(xi, xj) + ON_EDGE &&
      y >= Math.min(yi, yj) - ON_EDGE &&
      y <= Math.max(yi, yj) + ON_EDGE;
    if (onLine && between) return true;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) within = !within;
  }
  return within;
}

/**
 * Where a unity formula sits on Stull's chart: its silica and alumina, their
 * ratio, the region ('unfused', 'matte', 'semi-matte', 'bright' or
 * 'underfired', or 'unclassified' under the alumina of the lowest region; null off the chart) and whether it is in the crazed area.
 * Null without silica or alumina.
 */
function stullPoint(host: Host, unity: Oxides | null | undefined): StullPoint | null {
  const STULL = host.stull;
  const silica = unity?.['SiO2'] ?? 0;
  const alumina = unity?.['Al2O3'] ?? 0;
  if (!(silica > 0) || !(alumina > 0)) return null;
  const point: StullXY = [silica, alumina];
  const onChart =
    silica >= STULL.silica.min &&
    silica <= STULL.silica.max &&
    alumina >= STULL.alumina.min &&
    alumina <= STULL.alumina.max;
  // Stull's lowest region starts at 0.08 alumina; under it his chart says nothing.
  const region: StullRegion | null = !onChart
    ? null
    : alumina < lowestAlumina(STULL)
      ? 'unclassified'
      : ((Object.keys(STULL.regions) as Array<keyof StullChart['regions']>).find((name) =>
          inside(point, STULL.regions[name])
        ) ?? 'bright');
  return { silica, alumina, ratio: silica / alumina, region, crazed: onChart && inside(point, STULL.crazed) };
}

export { molePercent, stullPoint };
