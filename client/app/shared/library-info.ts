import { signal } from '@angular/core';
import { LibraryInfo } from '../core/models';

/** Regions the standard library can be narrowed to; records with no region are general. */
export const REGIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'All regions' },
  { value: 'US', label: 'US' },
  { value: 'UK', label: 'UK' },
  { value: 'EU', label: 'EU' },
  { value: 'AU', label: 'AU and NZ' }
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
  if (record.status === 'discontinued') return 'Discontinued' + (since ? ' ' + since : '');
  if (record.status === 'scarce') return 'Hard to get' + (since ? ' since ' + since : '');
  if (record.status === 'historical') return 'Historical';
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

/** The categories, as headings people read. */
export const CATEGORY_LABELS: Record<string, string> = {
  feldspar: 'Feldspars and stones',
  clay: 'Clays',
  frit: 'Frits',
  boron: 'Boron sources',
  flux: 'Fluxes',
  silica: 'Silica',
  alumina: 'Alumina',
  opacifier: 'Opacifiers',
  colorant: 'Colorants',
  suspender: 'Suspenders',
  other: 'Other'
};
