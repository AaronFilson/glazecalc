import { signal } from '@angular/core';

// Text that runs the other way inside a sentence (docs/i18n-plan.md, "Right to left"). On a right-to-left
// page (Arabic, Urdu, the pseudo-locales ar-XB and ar-XD) the browser orders each run of letters by its
// own direction, so a value written left to right comes apart inside an Arabic sentence: "1240 °C" reads
// "C° 1240", and a name's closing bracket jumps to its start. Kept apart as an isolate, each reads as it is
// written. On a left-to-right page these change nothing.

/** The page's direction, from its language (core/locale.service.ts sets it). */
export const pageDirection = signal<'ltr' | 'rtl'>('ltr');

/** Left-to-right isolate, first-strong isolate (the direction of its first letter, as <bdi>) and their end. */
export const LRI = '\u2066';
export const FSI = '\u2068';
export const PDI = '\u2069';

const rtl = (): boolean => pageDirection() === 'rtl';

/**
 * A value with Latin units or letters, "1240 °C", "12.5 g", "SK 8", kept left to right as a whole on a
 * right-to-left page: Arabic keeps units in Latin, read as they are in English (the owner's decision, 2026-10-20).
 */
export const ltr = (text: string): string => (rtl() && text ? LRI + text + PDI : text);

/** Text of its own direction, a name or a cone, kept apart from the sentence around it, as <bdi> keeps it. */
export const isolated = (text: string): string => (rtl() && text ? FSI + text + PDI : text);

/** Whether text starts with an isolate already. */
const isIsolated = (text: string): boolean => /^[\u2066-\u2068]/.test(text);

/**
 * A number, a range of them, and a Latin unit after them; SK or SG before one; or a scale on its own: "1240 °C",
 * "5–10 g", "SK 6a", "per °C".
 */
const NUMBER = String.raw`[-\u2212]?\p{Nd}+(?:[.,\u066b\u066c\u00a0\u202f]\p{Nd}+)*`;
const CONE = String.raw`\p{Nd}+(?:[.,\u066b]\p{Nd}+)*[a-z]?`;
const WITH_UNIT = new RegExp(
  String.raw`(?<![\p{L}\p{Nd}\u2066])${NUMBER}(?:\s?[–-]\s?${NUMBER})?[\u00a0 ]?(?:°[CF]|°Bé|kg|g|lb|oz|ml|mm|cm|L)(?!\p{L})` +
    String.raw`|(?<![\p{L}\u2066])(?:SK|SG)[\u00a0 ]?${CONE}(?:[–-]${CONE})?` +
    String.raw`|(?<![\p{L}\p{Nd}\u2066])(?<!\p{Nd}[\u00a0 ])°(?:[CF]|Bé)(?!\p{L})`,
  'gu'
);

/** A web address, without the punctuation after it, and a formula: "SiO₂", "Al2O3", "K₂O·Al₂O₃·6SiO₂", "CaO". */
const LATIN_TERMS =
  /(?:https?:\/\/|www\.)[^\s<>()]*[^\s<>().,;:!?'"]|(?<![\p{L}\p{N}])\d*(?:(?:[A-Z][a-z]?[\d₀-₉]*){2,}|[A-Z][a-z]?[\d₀-₉]+)(?:[·•]\d*(?:[A-Z][a-z]?[\d₀-₉]*)+)*(?![\p{L}\p{N}])/gu;

/** Text, such as a guide's, with its web addresses and formulas kept left to right on a right-to-left page. */
export const withLatinIsolated = (text: string): string =>
  rtl() ? text.replace(LATIN_TERMS, (term) => LRI + term + PDI) : text;

// A message on a right-to-left page (i18n/icu-transpiler.ts, which knows the page's language and calls these
// only then): its arrows, its values and what it writes.

/** A written message with each value that has a Latin unit kept left to right, whoever wrote it: "1240 °C". */
export const isolateUnits = (text: string): string => text.replace(WITH_UNIT, (value) => LRI + value + PDI);

/**
 * A message's values with each one with letters in it (a name, a cone, a material) kept apart from the
 * sentence, as <bdi> keeps it; numbers, which take the sentence's direction, as they are.
 */
export function isolateValues<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      typeof value === 'string' && /\p{L}/u.test(value) && !isIsolated(value) ? FSI + value + PDI : value
    ])
  ) as T;
}

/**
 * A message's own arrows pointing the way the text reads: "{name} {from} → {to}" with ←. Translations keep →
 * as the English has it (docs/translating.md); a value (a name with an arrow in it) is left as it is.
 */
export const mirrorArrows = (message: string): string => message.replace(/→/g, '←');

/** An arrow from one value to the next, pointing the way the page reads: → or, right to left, ←. */
export const forwardArrow = (): string => (rtl() ? '←' : '→');

/**
 * The message key for a side as the reader sees it: on a mirrored page what is at the start of a line is on
 * the right, so "top left" names the corner that is drawn at the top right (the blends page's grid).
 */
export const sideAsSeen = (key: string): string =>
  rtl() ? key.replace(/Left|Right/g, (side) => (side === 'Left' ? 'Right' : 'Left')) : key;
