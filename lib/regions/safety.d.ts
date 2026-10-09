/** A phone line, with where and when it was checked (lib/regions/safety.js). */
export interface SafetyLine {
  name: string;
  /** As people there write it; '' for advice that is not a number. */
  number: string;
  /** For the tel: link. */
  tel: string;
  who: 'public' | 'children';
  status: 'verified' | 'extract' | 'unverified';
  source: string;
  /** YYYY-MM-DD */
  checked: string;
  hours?: string;
  note?: string;
  fee?: string;
  /** For a poison line that also takes questions about animals. */
  animals?: string;
  /** The part of the country a regional centre covers. */
  area?: string;
  /** Another number for the same line. */
  also?: string;
  online?: { name: string; url: string };
}

export interface RegionSafety {
  emergency: SafetyLine[];
  poison: SafetyLine[];
  animals?: SafetyLine[];
  advice?: SafetyLine[];
}

export const SAFETY: Readonly<Record<string, RegionSafety>>;
export const CHECKED: string;
/** A region's verified entries, the only ones shown; null for a region with no entry. */
export function shownFor(code: string): Required<RegionSafety> | null;
/** The key a piece of this text is translated under: a few of its words and a hash of all of it. */
export function textKey(text: string): string;
/** Every piece of text shown, once, for translators. */
export function texts(): string[];
