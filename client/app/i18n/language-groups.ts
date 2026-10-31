import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { LANGUAGE_GROUPS, languageGroup } from '../../../lib/regions/groups';
import { languageFor } from '../../../lib/regions/languages';
import { PickerItem } from '../shared/picker-search';
import { languageName } from './language';

/**
 * The messages that name the groups, by the ids in lib/regions/groups.js. The regions' continents share
 * Europe's and Africa's with the languages'.
 */
export const GROUP_NAMES: Readonly<Record<string, string>> = {
  africa: marker('picker.groups.africa'),
  americas: marker('picker.groups.americas'),
  asia: marker('picker.groups.asia'),
  'east-asia': marker('picker.groups.eastAsia'),
  europe: marker('picker.groups.europe'),
  'latin-america': marker('picker.groups.latinAmerica'),
  'middle-east-north-africa': marker('picker.groups.middleEastNorthAfrica'),
  oceania: marker('picker.groups.oceania'),
  'south-asia': marker('picker.groups.southAsia'),
  'southeast-asia': marker('picker.groups.southeastAsia'),
  other: marker('picker.groups.other')
};

/** A group of languages: the message that names it (none for the group listed first, with no heading), and its codes. */
export interface LanguageSection {
  readonly name: string;
  readonly codes: readonly string[];
}

/**
 * The languages by the part of the world they are mostly spoken in (lib/regions/groups.js), the groups in
 * their order and each group's languages by their English names, so the order does not depend on a script.
 * English comes first, apart, as the language the app is written in. A group with no language offered is left out.
 */
export function languageSections(codes: readonly string[]): LanguageSection[] {
  const english = (code: string) => languageFor(code)?.english ?? code;
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const id = languageGroup(code);
    groups.set(id, [...(groups.get(id) ?? []), code]);
  }
  return ['', ...LANGUAGE_GROUPS]
    .filter((id) => groups.has(id))
    .map((id) => ({
      name: id ? GROUP_NAMES[id]! : '',
      codes: groups.get(id)!.sort((a, b) => english(a).localeCompare(english(b), 'en'))
    }));
}

/**
 * The languages as a picker lists them: each named in itself, with its English name beside it (and found by
 * it), under the name of its group, in the page's language.
 */
export function languageItems(codes: readonly string[]): PickerItem[] {
  return languageSections(codes).flatMap(({ name, codes: group }) =>
    group.map((code) => {
      const own = languageName(code);
      const english = languageFor(code)?.english ?? code;
      return {
        value: code,
        label: own,
        lang: code,
        note: english === own ? undefined : english,
        words: [code, english],
        group: name ? translate(name) : ''
      };
    })
  );
}
