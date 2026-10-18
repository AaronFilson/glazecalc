/** The English files written from code and data, by their path under client/public/i18n, as they should be. */
export function sources(): Promise<Record<string, string>>;
/** Translation files (not English) with changes git has not committed; null when git cannot say. */
export function uncommittedTranslations(paths?: string[], cwd?: string): string[] | null;
