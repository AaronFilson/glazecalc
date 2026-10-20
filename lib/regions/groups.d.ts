/** The language groups, in the order the language picker lists them (lib/regions/groups.js). */
export const LANGUAGE_GROUPS: ReadonlyArray<string>;
/** Each language's group; '' lists it first, with no heading. */
export const LANGUAGE_GROUP_OF: Readonly<Record<string, string>>;
/** The region groups (continents), in the order the region picker lists them. */
export const REGION_GROUPS: ReadonlyArray<string>;
export const REGION_GROUP_OF: Readonly<Record<string, string>>;
/** A language's group: '' for none, one of LANGUAGE_GROUPS otherwise ('other' for a code with none). */
export function languageGroup(code: string): string;
/** A region's group, one of REGION_GROUPS. */
export function regionGroup(code: string): string;
