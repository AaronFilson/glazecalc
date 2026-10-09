import { signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { textKey } from '../../../lib/regions/languages';
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

/** Whether a material or additive has lead in it: PbO among its oxides. */
export function hasLead(record: { fields?: Array<{ name: string; amount: string | number }> }): boolean {
  return (record.fields ?? []).some((field) => field.name === 'PbO' && Number(field.amount) > 0);
}

/** Whether a record is sold in the region. General records, with no region, count everywhere. */
export function inRegion(record: LibraryInfo, region: string): boolean {
  return !region || !record.region?.length || record.region.includes(region);
}

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

/** Whether every word typed is in the record's name or one of its aliases. */
export function matchesWords(record: { name: string; aliases?: string[] }, filter: string): boolean {
  const words = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = [record.name, ...(record.aliases ?? [])].join(' ').toLowerCase();
  return words.every((word) => text.includes(word));
}

export const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

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
