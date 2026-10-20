import { translate } from '@jsverse/transloco';
import { REGION_GROUPS, regionGroup } from '../../../lib/regions/groups';
import { regionFor } from '../../../lib/regions';
import { textLanguage } from '../../../lib/regions/languages';
import { GROUP_NAMES } from '../i18n/language-groups';
import { PickerItem } from './picker-search';

/**
 * The regions as a picker lists them: by continent, each continent's regions in alphabetical order in the
 * page's language, which names them (their names are the browser's, Intl.DisplayNames). On a page not in
 * English each has its English name beside it, and the search finds it by that.
 */
export function regionItems(regions: ReadonlyArray<{ code: string; name: string }>, language: string): PickerItem[] {
  const inEnglish = textLanguage(language) === 'en';
  const sorted = [...regions].sort((a, b) => a.name.localeCompare(b.name, textLanguage(language)));
  return REGION_GROUPS.flatMap((id) =>
    sorted
      .filter((region) => regionGroup(region.code) === id)
      .map((region) => {
        const english = regionFor(region.code)?.name ?? region.name;
        return {
          value: region.code,
          label: region.name,
          note: inEnglish || english === region.name ? undefined : english,
          words: [english, region.code],
          group: translate(GROUP_NAMES[id]!)
        };
      })
  );
}
