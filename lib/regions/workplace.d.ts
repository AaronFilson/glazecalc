/** A source a fact was read on, and when (lib/regions/workplace.js). */
export type Status = 'verified' | 'secondary' | 'extract' | 'unverified';

/** The workplace limit for respirable crystalline silica, an 8-hour average, in mg/m³. */
export interface SilicaLimit {
  quartz: number;
  /** Where cristobalite's limit differs from quartz's. */
  cristobalite?: number;
  /**
   * binding: a legal limit; indicative: a guide value; assessment: Germany's Beurteilungsmaßstab;
   * control: Japan's 管理濃度, a yardstick for the air of a work area, not a limit on one person's exposure.
   */
  kind: 'binding' | 'indicative' | 'assessment' | 'control';
  /** The instrument that sets it, as it is named there. */
  law: string;
  /** Where it was read. */
  source: string;
  status: Status;
  /** YYYY-MM-DD */
  checked: string;
  /** The level at which an employer must start acting (the US). */
  actionLevel?: number;
  /**
   * Where the value depends on the dust's free silica content Q (in %): E = numerator / (factor × Q + offset)
   * mg/m³ (Japan: 3.0 / (1.19Q + 1); Türkiye: 10 / (Q + 2)). quartz, and cristobalite where given, are
   * then the values at Q = 100.
   */
  formula?: Formula;
  /** A recommended value from a scientific body beside the law's, not binding (Japan's JSOH). */
  recommended?: Recommended;
  /**
   * YYYY-MM-DD: the day the limit applies from, where it is a new limit not yet in force (Taiwan's,
   * from 2027-01-01). What applies until then is said in the note, never guessed.
   */
  from?: string;
  /**
   * Where the law sets a value for each band of the dust's free silica content (China's GBZ 2.1, by
   * free SiO₂ in %), its bands, from the lowest. Shown in place of the quartz row; quartz then holds
   * the value for the highest band.
   */
  bands?: Band[];
  note?: string;
}

/** One band of free silica content (in %) and the limit for dust in it, in mg/m³. */
export interface Band {
  /** The lowest content in the band, in %. */
  from: number;
  /** Whether from itself is in the band (≥), or only contents above it (>). */
  fromIncluded: boolean;
  /** The highest content in the band, in % and included (≤); none for the top band. */
  to?: number;
  value: number;
}

/** A limit as a formula of the dust's silica content Q (in %): E = numerator / (factor × Q + offset) mg/m³. */
export interface Formula {
  numerator: number;
  /** 1 writes Q alone. */
  factor: number;
  /** 1 where not given. */
  offset?: number;
  /** The decimals the law writes the numerator with: 1 where not given (Japan's 3.0). */
  places?: number;
}

/** A value a scientific body recommends, in mg/m³. */
export interface Recommended {
  value: number;
  /** The body, as it names itself in English. */
  by: string;
  abbr: string;
  /** The list it is in, as it is named. */
  title: string;
  source: string;
  status: Status;
  checked: string;
}

/** The particle respirator classes sold in a region, where its data names them (Japan, Türkiye). */
export interface Respirators {
  /** The classes for everyday glaze dust, as written on the mask: any one of them. */
  everyday: string[];
  /** The higher classes. */
  higher: string[];
  source: string;
  status: Status;
  checked: string;
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
  respirators?: Respirators;
}

export const WORKPLACE: Readonly<Record<string, Workplace>>;
/** The EU's binding limit (Directive (EU) 2017/2398), which member states may undercut. */
export const EU_SILICA: SilicaLimit;
/** A region's facts that may be shown (verified, or from a named secondary source); null for a region with none. */
export function workplaceFor(
  code: string
): { silica: SilicaLimit | null; agency: Agency | null; respirators: Respirators | null; eu: boolean } | null;
/** Every piece of text shown, once, for translators. */
export function texts(): string[];
