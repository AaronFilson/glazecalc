/** The parts of the app a page loads messages for (lib/offline-files.js). */
export const SCOPES: ReadonlyArray<string>;
/** The guides, as /guides/<slug> (lib/offline-files.js). */
export const GUIDES: ReadonlyArray<string>;
/** The addresses of the files the app reads for a language: its messages and its guides' Markdown. */
export function filesFor(code: string): string[];
/** The language a file under /i18n/ is in, or null for an address that is not one. */
export function languageOfFile(address: string): string | null;
