// A recipe's firing, as the potter states it (docs/adr/0021-recipe-firing.md):
// the cone scale, the low cone and an optional high one (the claimed range),
// the cones of that range actually tested, the atmosphere and the process, and
// for a firing given by temperature the peak in °C with an optional rate over
// the last hour and hold. The cone is kept exactly as entered with its scale;
// nothing here stores a converted cone. Conversions are for display only, and
// each says what it rests on, so the page can call it approximate.
//
// Cones are put in order by an ordinal, never by their text or number: Orton
// "06" is far below "6". Orton's run 022 … 01, then 1 … 42; half cones
// ("5.5", shown 5½) sit between whole ones. SK cones (JIS R 8101) are in the
// order of their chart (lib/cones/index.js), letter cones and all.

import type { Host } from '../host.ts';

export type ConeScale = 'orton' | 'sk' | 'temperature';
export type Atmosphere = 'oxidation' | 'reduction' | 'neutral';
export type FiringProcess = 'wood' | 'soda' | 'salt' | 'raku' | 'pit';
/** The band a cone's glaze is checked in, coolest first. */
export type Band = 'low' | 'mid' | 'high' | 'top';
/** What an approximate temperature or cone rests on (approxCelsius). */
export type ApproxBasis = 'orton-150' | 'orton-150-halfway' | 'orton-2016-150' | 'kyoto' | 'stated';

/**
 * A recipe's firing as stated: the cone exactly as entered with its scale
 * ('06', '6', '5.5' for 5½, '6a' for SK; °C as text for temperature), an
 * optional high end for a claimed range, the cones of the range the potter has
 * test-fired (none until ticked: a stated cone is not a tested one), and
 * the rest optional. Saved on a recipe as `firedAt`.
 */
export interface FiringBlock {
  scale: ConeScale;
  low?: string;
  high?: string;
  tested?: string[];
  atmospheres?: Atmosphere[];
  processes?: FiringProcess[];
  /** °C an hour over the last hour. */
  rate?: number;
  /** Minutes held at peak. */
  hold?: number;
  /** A schedule note: "C6DHSC slow cool". */
  schedule?: string;
  /** Confirmed by a witness cone. */
  witness?: boolean;
}

const SCALES: readonly ConeScale[] = Object.freeze(['orton', 'sk', 'temperature']);
/** The kiln atmosphere: any of these, or none stated. */
const ATMOSPHERES: readonly Atmosphere[] = Object.freeze(['oxidation', 'reduction', 'neutral']);
/** The firing process, besides the atmosphere: any of these, or none stated. */
const PROCESSES: readonly FiringProcess[] = Object.freeze(['wood', 'soda', 'salt', 'raku', 'pit']);

/** Bounds of what a firing block may hold. */
const FIRING_LIMITS = Object.freeze({
  /** A peak temperature in °C. */
  celsius: Object.freeze({ min: 500, max: 1600 }),
  /** The heating rate over the last hour, °C an hour. */
  rate: Object.freeze({ min: 1, max: 1000 }),
  /** The hold at peak, minutes. */
  hold: Object.freeze({ min: 0, max: 1440 }),
  /** The schedule note, characters. */
  schedule: 300
});

/**
 * An Orton cone's place in order: '022' is -22, '01' -1, '1' 1, '5.5' 5.5, and
 * '05.5' -5.5, between 06 and 05. NaN when it is not a cone.
 */
function ortonOrdinal(cone: unknown): number {
  const text = String(cone);
  if (/^0\d{1,2}(?:\.5)?$/.test(text)) return -Number(text.slice(1));
  if (/^[1-9]\d?(?:\.5)?$/.test(text)) return Number(text);
  return NaN;
}

/** A cone as a chart prints it ('022', '015a', '7'), and its figure in °C. */
export interface ConeRow {
  cone: string;
  celsius: number;
}

/** Orton's current figures for a cone: by heating rate (°C an hour), self-supporting and, where printed, large. */
export interface PublishedCone {
  cone: string;
  selfSupporting: Record<number, number>;
  large?: Record<number, number>;
  largeDiffers?: boolean;
}

/**
 * The cone charts and the figures the core reads cones by: the catalog's CONE_CHARTS (lib/catalog/cones.ts),
 * which says what each is and where it comes from (docs/adr/0021-recipe-firing.md, 0031-functional-core.md).
 */
export interface ConeCharts {
  /** SK's large cones (JIS R 8101), each with its nominal melt-down temperature, in order. */
  readonly skCones: readonly ConeRow[];
  /** Orton's older chart: large cones heated at 150 °C an hour, 022 to 15. */
  readonly ortonChart: readonly ConeRow[];
  /** Orton's current figures, by heating rate. */
  readonly ortonPublished: readonly PublishedCone[];
  /** Orton's cones above 15, which no chart gives a figure. */
  readonly ortonAbove15: readonly string[];
  /** Orton's half cones. */
  readonly ortonHalves: readonly string[];
  /** SK cones measured (Kyoto's bends at 100 °C an hour), the only SK figures shown. */
  readonly skMeasured: Readonly<Record<string, number>>;
  /** Kyoto's same-kiln columns, its own SK cones and Orton's, which SK and Orton are matched across. */
  readonly kyotoSk: Readonly<Record<string, number>>;
  readonly kyotoOrton: Readonly<Record<string, number>>;
  /** The institute's own stated match: SK 12 ≈ Orton 10. */
  readonly skOrtonStated: Readonly<Record<string, string>>;
  /** The SK cones mid, high and top fire start from. */
  readonly skMidFrom: string;
  readonly skHighFrom: string;
  readonly skTopFrom: string;
  /** The band edges in °C: low below the first, mid below the second, high below the third, top above. */
  readonly lowBelow: number;
  readonly midBelow: number;
  readonly highBelow: number;
}

/** The charts with the lookups worked out from them once (coneTable): what a host passes as host.cones. */
export interface ConeTable extends ConeCharts {
  /** Orton's figures by cone. Keyed by string | undefined: approxCelsius looks up a neighbour that may not be found. */
  readonly ortonCelsius: ReadonlyMap<string | undefined, number>;
  /** The half cones Orton's 2016 chart gives a figure for large cones at 150 °C an hour: 05½. */
  readonly ortonHalf150: ReadonlyMap<string, number>;
  /** Orton's usual cones, 022 to 13; those from 14 up; all of them; and the whole ones, in order. */
  readonly ortonMain: readonly string[];
  readonly ortonAbove: readonly string[];
  readonly ortonAll: ReadonlySet<string>;
  readonly ortonWhole: readonly string[];
  /** Each SK cone's place in its chart. */
  readonly skOrder: ReadonlyMap<string, number>;
  /** Kyoto's columns matched one to one, each way. */
  readonly kyotoMatch: { readonly toOrton: ReadonlyMap<string, string>; readonly toSk: ReadonlyMap<string, string> };
}

/** How near a temperature must be to an SK cone's measured bend for that cone to be named. */
const SK_NEAR = 15;

/**
 * The lookups the core reads cones by, worked out from the charts: done once by whoever holds the charts
 * (the catalog's CONES), never by the core between calls.
 *
 * Orton cones' figures (approxCelsius) are large cones heated at 150 °C an hour over the last 100 °C, from
 * Orton's older chart, 022 to 15. Orton's current figures stop at cone 14 and are not mixed in, but for cone
 * 05½: the older chart has no half cones, and Orton's 2016 chart gives 05½ alone a figure for large cones at
 * 150 °C an hour (ortonHalf150). Cones above 15 are offered, as Orton makes them, but no chart gives them a
 * figure.
 *
 * Kyoto's two columns are matched one to one (kyotoSk, kyotoOrton): SK 12 to the institute's stated Orton 10,
 * then the nearest pairs within SK_NEAR °C first, each cone in one pair at most, so a cone taken across and back
 * is the cone it was. Orton 5 (1207 °C) is nearer SK 9 (1211) than SK 8 (1198), but SK 9 is Orton 6's (1211),
 * so Orton 5 is SK 8, as SK 8 is Orton 5. Orton 9 (1271) is 18 °C from SK 11 and 19 from SK 12: none.
 */
function coneTable(charts: ConeCharts): ConeTable {
  const ortonCelsius = new Map<string | undefined, number>(charts.ortonChart.map((c) => [c.cone, c.celsius]));
  const ortonHalf150 = new Map<string, number>(
    charts.ortonPublished.filter((c) => c.cone.endsWith('.5') && c.large?.[150]).map((c) => [c.cone, c.large![150]!])
  );
  const ortonMain = charts.ortonChart.filter((c) => ortonOrdinal(c.cone) <= 13).map((c) => c.cone);
  const ortonAbove = [
    ...charts.ortonChart.filter((c) => ortonOrdinal(c.cone) > 13).map((c) => c.cone),
    ...charts.ortonAbove15
  ];
  const ortonAll = new Set([...ortonMain, ...ortonAbove, ...charts.ortonHalves]);
  const ortonWhole = [...ortonMain, ...ortonAbove.filter((c) => !c.includes('.'))];
  const skOrder = new Map(charts.skCones.map((c, i) => [c.cone, i]));
  const toOrton = new Map<string, string>(Object.entries(charts.skOrtonStated));
  const toSk = new Map<string, string>([...toOrton].map(([sk, orton]) => [orton, sk]));
  const skAt = (sk: string) => (skOrder.has(sk) ? skOrder.get(sk)! : NaN);
  const pairs = Object.entries(charts.kyotoSk)
    .flatMap(([sk, skC]) =>
      Object.entries(charts.kyotoOrton).map(([orton, at]) => ({ sk, orton, apart: Math.abs(skC - at) }))
    )
    .filter((pair) => pair.apart <= SK_NEAR)
    .sort((a, b) => a.apart - b.apart || skAt(a.sk) - skAt(b.sk));
  for (const { sk, orton } of pairs) {
    if (toOrton.has(sk) || toSk.has(orton)) continue;
    toOrton.set(sk, orton);
    toSk.set(orton, sk);
  }
  return Object.freeze({
    ...charts,
    ortonCelsius,
    ortonHalf150,
    ortonMain,
    ortonAbove,
    ortonAll,
    ortonWhole,
    skOrder,
    kyotoMatch: Object.freeze({ toOrton, toSk })
  });
}

/** Whether a cone is one of the scale's, as stored ('5.5', '6a', or °C as text for temperature). */
function isCone(host: Host, scale: ConeScale | string, cone: unknown): cone is string {
  if (typeof cone !== 'string' || !cone) return false;
  if (scale === 'orton') return host.cones.ortonAll.has(cone);
  if (scale === 'sk') return host.cones.skOrder.has(cone);
  if (scale === 'temperature') {
    if (!/^\d{3,4}$/.test(cone)) return false;
    const c = Number(cone);
    return c >= FIRING_LIMITS.celsius.min && c <= FIRING_LIMITS.celsius.max;
  }
  return false;
}

/** A cone's place in its scale's order, for sorting and ranges; NaN when it is not one. */
function ordinal(host: Host, scale: ConeScale, cone: string): number {
  if (!isCone(host, scale, cone)) return NaN;
  if (scale === 'orton') return ortonOrdinal(cone);
  if (scale === 'sk') return host.cones.skOrder.get(cone)!;
  return Number(cone);
}

/** Two cones of a scale in order: negative when a is lower. */
const compareCones = (host: Host, scale: ConeScale, a: string, b: string): number =>
  ordinal(host, scale, a) - ordinal(host, scale, b);

/**
 * The cones the picker offers for a scale, in groups: Orton's usual 022 … 13,
 * then its half cones, then 14 … 42; SK's chart. None for temperature.
 */
function coneChoices(host: Host, scale: ConeScale): Array<{ group: 'usual' | 'half' | 'above'; cones: string[] }> {
  if (scale === 'orton') {
    return [
      { group: 'usual', cones: [...host.cones.ortonMain] },
      { group: 'half', cones: [...host.cones.ortonHalves] },
      { group: 'above', cones: [...host.cones.ortonAbove] }
    ];
  }
  if (scale === 'sk') return [{ group: 'usual', cones: host.cones.skCones.map((c) => c.cone) }];
  return [];
}

/**
 * The cones of a range that can be ticked as tested: each whole cone from low
 * to high and the two ends themselves (so 5.5–6.5 offers 5.5, 6 and 6.5);
 * for a temperature, the two ends. Just the low cone with no high one.
 */
function conesBetween(host: Host, scale: ConeScale, low: string | undefined, high?: string): string[] {
  if (!isCone(host, scale, low)) return [];
  if (!high || high === low || !isCone(host, scale, high)) return [low];
  const [from, to] = [ordinal(host, scale, low), ordinal(host, scale, high)];
  if (to < from) return [];
  if (scale === 'temperature') return [low, high];
  const list = scale === 'sk' ? host.cones.skCones.map((c) => c.cone) : host.cones.ortonWhole;
  const whole = list.filter((cone) => {
    const at = ordinal(host, scale, cone);
    return at > from && at < to;
  });
  return [low, ...whole, high].sort((a, b) => compareCones(host, scale, a, b));
}

/**
 * The cones a block counts as tested: only those ticked, within its range. A cone that is just
 * stated (a recipe from a book) is not tested; the potter ticks it after firing it.
 */
function testedCones(host: Host, block: FiringBlock | null | undefined): string[] {
  if (!block || !block.low) return [];
  const range = conesBetween(host, block.scale, block.low, block.high);
  return (block.tested ?? []).filter((cone) => range.includes(cone));
}

const isWhole = (value: unknown, { min, max }: { min: number; max: number }): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const uniqueIn = (list: unknown, allowed: readonly string[]): boolean =>
  Array.isArray(list) && list.every((item) => allowed.includes(item)) && new Set(list).size === list.length;

/**
 * What is wrong with a firing block, as a code, or null when it can be saved:
 * 'block', 'scale', 'low', 'high', 'order', 'tested', 'atmospheres',
 * 'processes', 'rate', 'hold', 'schedule', 'witness'. Absent fields are
 * fine; a high cone needs a low one.
 */
function firingProblem(host: Host, block: unknown): string | null {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return 'block';
  const fields = block as Record<string, unknown>;
  const { low, high, tested, atmospheres, processes, rate, hold, schedule, witness } = fields;
  if (!(SCALES as readonly unknown[]).includes(fields['scale'])) return 'scale';
  const scale = fields['scale'] as ConeScale;
  if (low !== undefined && low !== null && low !== '' && !isCone(host, scale, low)) return 'low';
  if (high !== undefined && high !== null && high !== '') {
    if (!isCone(host, scale, high)) return 'high';
    if (!low) return 'low';
    if (compareCones(host, scale, low as string, high) > 0) return 'order';
  }
  if (tested !== undefined && tested !== null) {
    const range = conesBetween(host, scale, low as string | undefined, high as string | undefined);
    if (!Array.isArray(tested) || !tested.every((cone) => range.includes(cone))) return 'tested';
    if (new Set(tested).size !== tested.length) return 'tested';
  }
  if (atmospheres !== undefined && atmospheres !== null && !uniqueIn(atmospheres, ATMOSPHERES)) return 'atmospheres';
  if (processes !== undefined && processes !== null && !uniqueIn(processes, PROCESSES)) return 'processes';
  if (rate !== undefined && rate !== null && !isWhole(rate, FIRING_LIMITS.rate)) return 'rate';
  if (hold !== undefined && hold !== null && !isWhole(hold, FIRING_LIMITS.hold)) return 'hold';
  if (schedule !== undefined && schedule !== null) {
    if (typeof schedule !== 'string' || schedule.length > FIRING_LIMITS.schedule) return 'schedule';
  }
  if (witness !== undefined && witness !== null && typeof witness !== 'boolean') return 'witness';
  return null;
}

/**
 * A block with only its known fields, each only when set, or null when it
 * says nothing (no cone, atmosphere, process, schedule or rate): what is
 * shared, exported and given to an assistant.
 */
function cleanFiring(host: Host, block: FiringBlock | null | undefined): FiringBlock | null {
  if (!block || firingProblem(host, block)) return null;
  const out: FiringBlock = { scale: block.scale };
  if (block.low) out.low = block.low;
  if (block.high && block.high !== block.low) out.high = block.high;
  const tested = (block.tested ?? []).filter((cone) =>
    conesBetween(host, block.scale, block.low, block.high).includes(cone)
  );
  if (tested.length) out.tested = tested.sort((a, b) => compareCones(host, block.scale, a, b));
  if (block.atmospheres?.length) out.atmospheres = ATMOSPHERES.filter((a) => block.atmospheres!.includes(a));
  if (block.processes?.length) out.processes = PROCESSES.filter((p) => block.processes!.includes(p));
  if (typeof block.rate === 'number') out.rate = block.rate;
  if (typeof block.hold === 'number') out.hold = block.hold;
  if (block.schedule?.trim()) out.schedule = block.schedule.trim();
  if (block.witness === true) out.witness = true;
  return Object.keys(out).length > 1 ? out : null;
}

/** Whether a block states anything: a cone, an atmosphere, a process, a schedule. */
const isStated = (host: Host, block: FiringBlock | null | undefined): boolean => cleanFiring(host, block) !== null;

const nearest = <K>(map: ReadonlyMap<K, number>, celsius: number): [K, number] | null => {
  let best: [K, number] | null = null;
  for (const [cone, at] of map) if (!best || Math.abs(at - celsius) < Math.abs(best[1] - celsius)) best = [cone, at];
  return best;
};

/**
 * A cone's approximate temperature in °C and what it rests on:
 *   'orton-150'          Orton's older chart for large cones at 150 °C an hour
 *                        (ORTON.chart), whole cones only
 *   'orton-150-halfway'  a half cone halfway between its neighbours on that chart
 *   'orton-2016-150'     Orton's 2016 chart for large cones at 150 °C an hour
 *                        (ORTON.published): cone 05½, the one half cone it gives
 *                        large cones a figure for
 *   'kyoto'              measured bend at 100 °C an hour (SK_MEASURED: SK 8 and 10)
 *   'stated'             a temperature firing, as given
 * Null for a cone with no figure: Orton above 15 (and 15½), and every SK cone
 * but 8 and 10 (the JIS nominal figures are never shown as a conversion).
 */
function approxCelsius(host: Host, scale: ConeScale, cone: string): { celsius: number; basis: ApproxBasis } | null {
  if (!isCone(host, scale, cone)) return null;
  if (scale === 'temperature') return { celsius: Number(cone), basis: 'stated' };
  if (scale === 'sk') {
    const measured = host.cones.skMeasured[cone];
    return measured ? { celsius: measured, basis: 'kyoto' } : null;
  }
  if (host.cones.ortonHalf150.has(cone))
    return { celsius: host.cones.ortonHalf150.get(cone)!, basis: 'orton-2016-150' };
  if (cone.endsWith('.5')) {
    // The whole cones either side, in order: 5 and 6 for 5½.
    const at = ortonOrdinal(cone);
    const lower = host.cones.ortonCelsius.get(host.cones.ortonWhole.find((c) => ortonOrdinal(c) === at - 0.5));
    const upper = host.cones.ortonCelsius.get(host.cones.ortonWhole.find((c) => ortonOrdinal(c) === at + 0.5));
    return lower && upper ? { celsius: Math.round((lower + upper) / 2), basis: 'orton-150-halfway' } : null;
  }
  const celsius = host.cones.ortonCelsius.get(cone);
  return celsius ? { celsius, basis: 'orton-150' } : null;
}

/**
 * A cone in another scale, approximately, for display beside the original, or
 * null when there is no fair equivalent. Between SK and Orton by Kyoto's
 * same-kiln columns matched one to one (KYOTO_MATCH: SK 7 to 14 against Orton 4
 * to 12, SK 12 the institute's stated Orton 10); SK from a temperature only
 * near a measured SK bend; Orton from a temperature by the nearest in its chart
 * (ORTON_CELSIUS, 022 to 15). Never stored.
 */
function approxCone(
  host: Host,
  scale: ConeScale,
  cone: string,
  toScale: ConeScale
): { cone: string; basis: ApproxBasis } | null {
  if (!isCone(host, scale, cone) || toScale === scale || toScale === 'temperature') return null;
  if (scale === 'sk' || (scale === 'orton' && toScale === 'sk')) {
    const match =
      scale === 'sk'
        ? toScale === 'orton' && host.cones.kyotoMatch.toOrton.get(cone)
        : host.cones.kyotoMatch.toSk.get(cone);
    return match ? { cone: match, basis: 'kyoto' } : null;
  }
  const from = approxCelsius(host, scale, cone);
  if (!from) return null;
  if (toScale === 'sk') {
    const [sk, at] = nearest(new Map(Object.entries(host.cones.skMeasured)), from.celsius)!;
    return Math.abs(at - from.celsius) <= SK_NEAR ? { cone: sk, basis: 'kyoto' } : null;
  }
  // Orton from a temperature: only within the chart's span.
  const figures = [...host.cones.ortonCelsius.values()];
  if (from.celsius < figures[0]! - 20 || from.celsius > figures[figures.length - 1]! + 20) return null;
  return { cone: nearest(host.cones.ortonCelsius, from.celsius)![0]!, basis: 'orton-150' };
}

/**
 * The band a cone's glaze is checked in: 'low' (to about cone 02), 'mid' (cone
 * 1–7), 'high' (cone 8–11), 'top' (cone 12 up, past every limit set's figures).
 */
function coneBand(host: Host, scale: ConeScale, cone: string): Band | undefined {
  if (!isCone(host, scale, cone)) return undefined;
  if (scale === 'sk') {
    const at = host.cones.skOrder.get(cone)!;
    if (at >= host.cones.skOrder.get(host.cones.skTopFrom)!) return 'top';
    return at >= host.cones.skOrder.get(host.cones.skHighFrom)!
      ? 'high'
      : at >= host.cones.skOrder.get(host.cones.skMidFrom)!
        ? 'mid'
        : 'low';
  }
  const celsius = approxCelsius(host, scale, cone)?.celsius;
  // Orton above 15 has no figure here, and is far past any limits' figures.
  if (celsius === undefined) return 'top';
  return celsius < host.cones.lowBelow
    ? 'low'
    : celsius < host.cones.midBelow
      ? 'mid'
      : celsius < host.cones.highBelow
        ? 'high'
        : 'top';
}

/** The bands a block's range touches, coolest first: one for a single cone, more for a range across them. */
function firingBands(host: Host, block: FiringBlock | null | undefined): Band[] {
  if (!block || !isCone(host, block.scale, block.low)) return [];
  const order: Band[] = ['low', 'mid', 'high', 'top'];
  const from = coneBand(host, block.scale, block.low);
  const to = block.high && isCone(host, block.scale, block.high) ? coneBand(host, block.scale, block.high) : from;
  return order.slice(order.indexOf(from!), order.indexOf(to!) + 1);
}

/** Whether a cone of the same scale is within a block's range (both ends counted). */
function inRange(host: Host, block: FiringBlock | null | undefined, scale: ConeScale, cone: string): boolean {
  if (!block || block.scale !== scale || !isCone(host, scale, cone) || !isCone(host, scale, block.low)) return false;
  const at = ordinal(host, scale, cone);
  const high = block.high && isCone(host, scale, block.high) ? block.high : block.low;
  return at >= ordinal(host, scale, block.low) && at <= ordinal(host, scale, high);
}

/** How near, in °C, a cone's figure must be to a temperature firing for the two to match. */
const MATCH_NEAR = 15;

/**
 * Whether a block's firing includes a cone asked about in any scale (an
 * assistant's "which of my glazes fire at cone 6?"). The same scale: the cone
 * is within the range. Orton and SK: the recipe's cones are put into the
 * asked scale by Kyoto's same-kiln columns (approxCone: SK 7 to 14 against
 * Orton 4 to 12, SK 12 for Orton 10), and the cone must fall within them; a
 * cone with no equivalent there matches only recipes in its own scale. A temperature against a
 * cone: the cone's figure (Orton's older chart at 150 °C an hour, Kyoto's measured
 * SK bends) within MATCH_NEAR °C of the stated range. Display aside, nothing is
 * converted for storing.
 */
function matchesCone(host: Host, block: FiringBlock | null | undefined, scale: ConeScale, cone: string): boolean {
  if (!block || !isCone(host, scale, cone) || !isCone(host, block.scale, block.low)) return false;
  if (block.scale === scale) return inRange(host, block, scale, cone);
  const ends = [block.low, block.high && isCone(host, block.scale, block.high) ? block.high : block.low];
  if (block.scale === 'temperature' || scale === 'temperature') {
    const span =
      block.scale === 'temperature' ? ends.map(Number) : ends.map((c) => approxCelsius(host, block.scale, c)?.celsius);
    const at = scale === 'temperature' ? Number(cone) : approxCelsius(host, scale, cone)?.celsius;
    if (at === undefined || span.some((c) => c === undefined)) return false;
    return at >= span[0]! - MATCH_NEAR && at <= span[1]! + MATCH_NEAR;
  }
  const mapped = ends.map((c) => approxCone(host, block.scale, c, scale)?.cone);
  if (mapped.some((c) => c === undefined)) return false;
  const [from, to] = mapped.map((c) => ordinal(host, scale, c!)).sort((a, b) => a - b);
  const at = ordinal(host, scale, cone);
  return at >= from! && at <= to!;
}

export {
  coneTable,
  SCALES,
  ATMOSPHERES,
  PROCESSES,
  FIRING_LIMITS,
  isCone,
  ordinal,
  compareCones,
  coneChoices,
  conesBetween,
  testedCones,
  firingProblem,
  cleanFiring,
  isStated,
  approxCelsius,
  approxCone,
  coneBand,
  firingBands,
  inRange,
  matchesCone
};
