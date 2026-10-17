import { signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { textKey, textLanguage } from '../../../lib/regions/languages';
import { LibraryInfo } from '../core/models';
import { codedMessage } from '../i18n/coded';

/** Regions the standard library can be narrowed to; records with no region are general. */
const region = (value: string, name: string) => ({
  value,
  /** In the page's language. */
  get label() {
    return translate(name);
  }
});

export const REGIONS: ReadonlyArray<{ value: string; label: string }> = [
  region('', marker('libraryRegions.all')),
  region('US', marker('libraryRegions.US')),
  region('UK', marker('libraryRegions.UK')),
  region('EU', marker('libraryRegions.EU')),
  region('AU', marker('libraryRegions.AU'))
];

const REGION_KEY = 'region';

/** The region chosen last on this browser, for every list of standard records. */
export function readRegion(): string {
  try {
    return localStorage.getItem(REGION_KEY) ?? '';
  } catch {
    return '';
  }
}

/** The region chosen last, for any page to follow as it changes (saveRegion sets it). */
export const chosenRegion = signal(readRegion());

/** Follows the region chosen in Settings for this visit, without writing it to the browser. */
export function followRegion(region: string): void {
  chosenRegion.set(region);
}

/** The user's choice of region in a library list: the only write of the region key. */
export function saveRegion(region: string): void {
  chosenRegion.set(region);
  try {
    if (region) localStorage.setItem(REGION_KEY, region);
    else localStorage.removeItem(REGION_KEY);
  } catch {
    // Without storage the choice holds until the page is left.
  }
}

/**
 * A standard record's words (a material's notes or hazards, the standard
 * advice) in the page's language, where there is a translation of exactly
 * them (client/public/i18n/records/); a potter's own records as written.
 */
export function standardText(record: { ownedBy?: string }, text: string | undefined | null): string {
  if (!text) return '';
  return (record.ownedBy === 'Standard' && codedMessage('records', textKey(text))) || text;
}

// Whether a record has lead in it, and whether it is sold in a region (lib/recipe/library.js).
export { hasLead, inRegion } from '../../../lib/recipe/library';

/** A short word on a record that is not simply current: "Discontinued 2023", "Hard to get", "Historical". */
export function statusText(record: LibraryInfo): string {
  const since = record.statusSince;
  if (record.status === 'discontinued') {
    return since ? translate('status.discontinuedSince', { year: since }) : translate('status.discontinued');
  }
  if (record.status === 'scarce')
    return since ? translate('status.scarceSince', { year: since }) : translate('status.scarce');
  if (record.status === 'historical') return translate('status.historical');
  return '';
}

/**
 * The first record with this name, or else the first with it as another name,
 * whatever the case. List a potter's own records first, so their "Potash
 * Feldspar" is theirs, not a standard record that also goes by that name.
 */
export function findNamed<T extends { name: string; aliases?: string[] }>(
  records: readonly T[],
  name: string
): T | undefined {
  const wanted = folded(name.trim());
  return (
    records.find((record) => folded(record.name) === wanted) ??
    records.find((record) => (record.aliases ?? []).some((alias) => folded(alias) === wanted))
  );
}

/** Text as a search compares it: NFKC, so full-width letters (ＦＲＩＴ) are plain ones, and in lower case. */
export const folded = (text: string): string => text.normalize('NFKC').toLowerCase();

/** Whether every word typed is in the record's name or one of its aliases, whatever its case or width. */
export function matchesWords(record: { name: string; aliases?: string[] }, filter: string): boolean {
  const words = folded(filter).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = folded([record.name, ...(record.aliases ?? [])].join(' '));
  return words.every((word) => text.includes(word));
}

/** Records in order of their names, as the page's language sorts words, whatever their case. */
export const byNameIn = (language: string): ((a: { name: string }, b: { name: string }) => number) => {
  const collator = new Intl.Collator(textLanguage(language), { sensitivity: 'base' });
  return (a, b) => collator.compare(a.name, b.name);
};

const CATEGORY_KEYS: Record<string, string> = {
  feldspar: marker('categories.feldspar'),
  clay: marker('categories.clay'),
  frit: marker('categories.frit'),
  boron: marker('categories.boron'),
  flux: marker('categories.flux'),
  silica: marker('categories.silica'),
  alumina: marker('categories.alumina'),
  opacifier: marker('categories.opacifier'),
  colorant: marker('categories.colorant'),
  suspender: marker('categories.suspender'),
  other: marker('categories.other')
};

/** The categories, as headings people read, in the page's language, in this order. */
export const CATEGORY_LABELS: Readonly<Record<string, string>> = Object.defineProperties(
  {},
  Object.fromEntries(
    Object.entries(CATEGORY_KEYS).map(([category, key]) => [category, { enumerable: true, get: () => translate(key) }])
  )
);
