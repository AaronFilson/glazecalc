/** A nested messages file as flat keys. */
export function flatten(messages: object, prefix?: string, into?: Record<string, string>): Record<string, string>;
/** A message's arguments, tags, and plural forms by argument. */
export function shapeOf(message: string): {
  args: string[];
  tags: string[];
  plurals: Array<{ arg: string; ordinal: boolean; forms: string[] }>;
};
/** Problems with one translated message, against its English. */
export function compareMessage(
  language: string,
  key: string,
  english: string,
  translated: string,
  options?: { rich?: boolean; figures?: boolean }
): string[];
/** The numbers in a text, as English writes them, each with its unit. */
export function numbersIn(text: string, language: string): string[];
/** The web addresses and Markdown link targets in a text. */
export function linksIn(text: string): string[];
/** The messages files by scope and language. */
export function messageFiles(dir?: string): Record<string, Record<string, string>>;
/** Problems with the translations, each language against the English. */
export function checkTranslations(files?: Record<string, Record<string, string>>): string[];
/** The keys the app uses, by scope. */
export function keysInUse(): Promise<Record<string, Set<string>>>;
/** Problems between the keys the app uses and its English. */
export function compareKeys(
  used: Record<string, Set<string>>,
  files?: Record<string, Record<string, string>>
): string[];
/** What a guide's Markdown must keep in every language. */
export function guideMarks(markdown: string): { ids: string[]; values: string[]; marks: string[] };
/** A guide section's structure: headings, tables, lists, callouts and captions, in order. */
export function structureOf(markdown: string): string[];
/** Problems with one section of a translated guide: its structure, numbers and links. */
export function compareSegment(label: string, language: string, english: string, translated: string): string[];
/** Problems with the translations' fingerprints, and what each language still shows in English. */
export function checkFingerprints(options?: { dir?: string; fingerprints?: string }): {
  problems: string[];
  inEnglish: Record<string, { messages: number; sections: number }>;
};
/** Problems with the translated guides, each against its English. */
export function checkGuides(dir?: string): string[];
/** Problems with the English written from code. */
export function checkSources(dir?: string): Promise<string[]>;
