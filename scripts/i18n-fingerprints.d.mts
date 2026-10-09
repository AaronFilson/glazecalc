/** A short fingerprint of a text (FNV-1a, as textKey's). */
export function fingerprint(text: string): string;
/** A guide's Markdown in segments: the part before the first section (id ''), then each section. */
export function guideSegments(markdown: string): Array<{ id: string; english: boolean; text: string }>;
/** The languages with translations. */
export function translatedLanguages(dir?: string): string[];
/** Brings each language's translations into step with the English, or says what would change. */
export function updateTranslations(options?: {
  dir?: string;
  fingerprints?: string;
  write?: boolean;
  keep?: string[];
}): { changes: string[]; inEnglish: Record<string, { messages: number; sections: number }> };
