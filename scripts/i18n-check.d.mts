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
export function checkGuides(dir?: string, englishOnly?: readonly string[]): string[];
/** Problems with the English written from code. */
export function checkSources(dir?: string): Promise<string[]>;
/** Problems with Korean's script: hanja in its messages or guides that its glossary does not give. */
export function checkHanja(options?: { dir?: string; glossary?: string }): string[];
/** Problems with the digits translations write: 0–9 only, in messages and guides. */
export function checkDigits(dir?: string): string[];
/** The Indian languages and the Unicode script each is written in. */
export const INDIC_SCRIPTS: Record<string, string>;
/** Problems with an Indian language's script: letters of another script, unless its glossary gives them. */
export function checkScripts(options?: { dir?: string; glossaries?: string }): string[];
/** Problems with Unicode normalisation: a translation not in NFC. */
export function checkNormalization(dir?: string): string[];
/** Problems with stray zero-width joiners and non-joiners in the Indian languages. */
export function checkJoiners(dir?: string): string[];
/** Problems with Urdu: a sentence ends with ۔, Urdu's letters (not ي ى ك ه), no tatweel or direction marks, NFC. */
export function checkUrdu(dir?: string): string[];
/** Problems with Bengali: a sentence ends with the danda । (never "." or U+09F7), NFC. */
export function checkBengali(dir?: string): string[];
