import { InjectionToken, WritableSignal, signal } from '@angular/core';
import { REGIONS, type Region } from '../../../lib/regions';
import { baseLanguage } from '../../../lib/regions/languages';

/**
 * True until the app has drawn once (App turns it off in afterNextRender).
 * The public pages are prerendered, and the browser's first render has to
 * match that HTML to adopt it: while this is true, what is read from this
 * browser (a session, saved settings, its languages) is left out and the
 * defaults for the page's language stand in. Then each service switches to the
 * real values and only the text that differs is redrawn.
 */
export const FIRST_RENDER = new InjectionToken<WritableSignal<boolean>>('FIRST_RENDER', {
  providedIn: 'root',
  factory: () => signal(true)
});

/**
 * Languages whose pages are written for a country that is not the first to
 * list them, nor named for them: Greek is spoken in Cyprus too. Arabic's
 * pages are for Egypt, the largest Arabic-speaking country Glazecalc plans
 * (its digits Arabic-Indic, as usual there); Hindi's for India; Urdu's for
 * Pakistan; Bengali's for Bangladesh, not Brunei (BN); and Tamil's for
 * India, not Singapore, the first region now listing it. The other languages of India are for
 * India, Nepali for Nepal and Sinhala for Sri Lanka.
 */
const COUNTRY_OF = new Map([
  ['el', 'GR'],
  ['ar', 'EG'],
  ['hi', 'IN'],
  ['ur', 'PK'],
  ['bn', 'BD'],
  ['ta', 'IN'],
  ['te', 'IN'],
  ['mr', 'IN'],
  ['gu', 'IN'],
  ['kn', 'IN'],
  ['ml', 'IN'],
  ['pa', 'IN'],
  ['or', 'IN'],
  ['ne', 'NP'],
  ['si', 'LK']
]);

/**
 * The region the prerender writes a page in a language for (units, cones,
 * the guides' country blocks, the digits): Germany for German, France for
 * French. None for English, which shows °C and Orton cones with °F beside
 * them, and for a language no region lists. Regions list some languages with
 * their script (zh-Hant, zh-Hans), so the language as given is looked for
 * first, then the language alone (pt for pt-PT). A language written for one
 * country (COUNTRY_OF) waits for that country: none until it is a region,
 * rather than another country's. The regions are Glazecalc's; a test may
 * give others.
 */
export function prerenderRegion(
  language: string,
  regions: ReadonlyArray<Pick<Region, 'code' | 'languages'>> = REGIONS
): string {
  const base = baseLanguage(language);
  if (base === 'en') return '';
  const country = COUNTRY_OF.get(base);
  if (country) return regions.some((region) => region.code === country) ? country : '';
  for (const tag of new Set([language, base])) {
    const mainly = regions.filter((region) => region.languages[0] === tag);
    const pool = mainly.length ? mainly : regions.filter((region) => region.languages.includes(tag));
    if (!pool.length) continue;
    return (pool.find((region) => region.code === base.toUpperCase()) ?? pool[0]).code;
  }
  return '';
}
