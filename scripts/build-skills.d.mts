/** The skills packed, by their folders' names in skills/. */
export const SKILLS: string[];
/** Where the ZIPs go, relative to the checkout. */
export const DOWNLOADS: string;
/** A ZIP of these entries (a name ending in / is a folder). */
export function zipOf(entries: Array<{ name: string; data: Buffer }>): Buffer;
/** A skill's ZIP: its folder at the root, with the repository's LICENSE in it. */
export function skillZip(name: string, root?: string): Buffer;
/** Writes each skill's ZIP into the built client; their paths. */
export function buildSkills(root?: string): string[];
