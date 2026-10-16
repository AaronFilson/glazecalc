import { InjectionToken, WritableSignal, signal } from '@angular/core';
import { REGIONS } from '../../../lib/regions';
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

/** Languages whose first region is not the one named for them: Greek is spoken in Cyprus too. */
const COUNTRY_OF = new Map([['el', 'GR']]);

/**
 * The region the prerender writes a page in a language for (units, cones,
 * the guides' country blocks): Germany for German, France for French. None
 * for English, which shows °C and Orton cones with °F beside them, and for a
 * language no region lists. Regions list some languages with their script
 * (zh-Hant, zh-Hans), so the language as given is looked for first, then
 * the language alone (pt for pt-PT).
 */
export function prerenderRegion(language: string): string {
  const base = baseLanguage(language);
  if (base === 'en') return '';
  for (const tag of new Set([language, base])) {
    const mainly = REGIONS.filter((region) => region.languages[0] === tag);
    const pool = mainly.length ? mainly : REGIONS.filter((region) => region.languages.includes(tag));
    if (!pool.length) continue;
    const named = COUNTRY_OF.get(base) ?? base.toUpperCase();
    return (pool.find((region) => region.code === named) ?? pool[0]).code;
  }
  return '';
}
