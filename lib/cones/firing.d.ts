// Types for lib/cones/firing.js: a recipe's firing block (docs/adr/0021-recipe-firing.md).

export type ConeScale = 'orton' | 'sk' | 'temperature';
export type Atmosphere = 'oxidation' | 'reduction' | 'neutral';
export type FiringProcess = 'wood' | 'soda' | 'salt' | 'raku' | 'pit';
export type Band = 'low' | 'mid' | 'high';

/**
 * A recipe's firing as stated: the cone exactly as entered with its scale
 * ('06', '6', '5.5' for 5½, '6a' for SK; °C as text for temperature), an
 * optional high end for a claimed range, the cones of the range tested, and
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

export const SCALES: ReadonlyArray<ConeScale>;
export const ATMOSPHERES: ReadonlyArray<Atmosphere>;
export const PROCESSES: ReadonlyArray<FiringProcess>;
export const FIRING_LIMITS: Readonly<{
  celsius: { min: number; max: number };
  rate: { min: number; max: number };
  hold: { min: number; max: number };
  schedule: number;
}>;
export const SK_MEASURED: Readonly<Record<string, number>>;

export function isCone(scale: ConeScale | string, cone: unknown): boolean;
export function ordinal(scale: ConeScale, cone: string): number;
export function compareCones(scale: ConeScale, a: string, b: string): number;
export function coneChoices(scale: ConeScale): Array<{ group: 'usual' | 'half' | 'above'; cones: string[] }>;
export function conesBetween(scale: ConeScale, low: string | undefined, high?: string): string[];
export function testedCones(block: FiringBlock | null | undefined): string[];
export function firingProblem(block: unknown): string | null;
export function cleanFiring(block: FiringBlock | null | undefined): FiringBlock | null;
export function isStated(block: FiringBlock | null | undefined): boolean;
export function coneLabel(cone: string | undefined): string;

export type ApproxBasis = 'orton-60' | 'kyoto' | 'stated';
export function approxCelsius(scale: ConeScale, cone: string): { celsius: number; basis: ApproxBasis } | null;
export function approxCone(
  scale: ConeScale,
  cone: string,
  toScale: ConeScale
): { cone: string; basis: ApproxBasis } | null;
export function coneBand(scale: ConeScale, cone: string): Band | undefined;
export function firingBands(block: FiringBlock | null | undefined): Band[];
export function inRange(block: FiringBlock | null | undefined, scale: ConeScale, cone: string): boolean;
export function glazyFiring(block: FiringBlock | null | undefined): { cone: string; atmospheres: string[] };

export interface ReadFiring {
  scale?: ConeScale;
  low?: string;
  high?: string;
  atmospheres?: Atmosphere[];
  processes?: FiringProcess[];
  /** The cones of a list ("cone 4,5"), each counted as tested. */
  tested?: string[];
  /** The line names an SK cone the chart does not have (SK 26): kept in the notes, not read. */
  unknown?: true;
  /** The line is nothing but a firing. */
  whole: boolean;
}
/** How text is read: "6,5" is a half cone only when the reader writes decimal commas and it is the one number. */
export interface ReadOptions {
  decimalComma?: boolean;
}
export function readsDecimalComma(mark?: 'either' | 'comma' | 'point', locale?: string): boolean;
/** An SK cone as the chart writes it ("6" is SK 6a), or null when the chart has none. */
export function skCone(token: string): string | null;
export function readFiring(line: string, options?: ReadOptions): ReadFiring | null;
/** Whether a line is nothing but a firing, and clearly one (not a bare number or a weak word alone). */
export function isFiringLine(line: string, options?: ReadOptions): boolean;
export function firingFromLines(
  lines: string[] | undefined,
  fallbackScale?: ConeScale,
  options?: ReadOptions
): FiringBlock | null;

/** The cones of a scale a firing log names in its cone columns, in order, each once. */
export function conesFromLog(
  log: { fieldsIncluded?: string[]; rows?: unknown[][] } | null | undefined,
  scale: ConeScale,
  options?: ReadOptions
): string[];
