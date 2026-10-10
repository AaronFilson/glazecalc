/** A source a fact was read on, and when (lib/regions/workplace.js). */
export type Status = 'verified' | 'secondary' | 'extract' | 'unverified';

/** The workplace limit for respirable crystalline silica, an 8-hour average, in mg/m³. */
export interface SilicaLimit {
  quartz: number;
  /** Where cristobalite's limit differs from quartz's. */
  cristobalite?: number;
  /** binding: a legal limit; indicative: a guide value; assessment: Germany's Beurteilungsmaßstab. */
  kind: 'binding' | 'indicative' | 'assessment';
  /** The instrument that sets it, as it is named there. */
  law: string;
  /** Where it was read. */
  source: string;
  status: Status;
  /** YYYY-MM-DD */
  checked: string;
  /** The level at which an employer must start acting (the US). */
  actionLevel?: number;
  note?: string;
}

/** The national body for safety at work. */
export interface Agency {
  /** In its own language. */
  name: string;
  abbr?: string;
  url: string;
  /** Its own page on crystalline silica. */
  silicaUrl?: string;
  status: Status;
  checked: string;
}

export interface Workplace {
  silica?: SilicaLimit;
  agency?: Agency;
}

export const WORKPLACE: Readonly<Record<string, Workplace>>;
/** The EU's binding limit (Directive (EU) 2017/2398), which member states may undercut. */
export const EU_SILICA: SilicaLimit;
/** A region's facts that may be shown (verified, or from a named secondary source); null for a region with none. */
export function workplaceFor(code: string): { silica: SilicaLimit | null; agency: Agency | null; eu: boolean } | null;
/** Every piece of text shown, once, for translators. */
export function texts(): string[];
