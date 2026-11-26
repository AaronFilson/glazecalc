export const MOVED: Readonly<Record<string, string>>;
export const GIT_PATHS: readonly string[];
/** The newest commit date (YYYY-MM-DD) of each file, from git log's output (a line "@date" before each commit's files). */
export function newestDates(log: string): Map<string, string>;
/** The newest date among a page's sources: a file's own, or for a folder (ending /) any file in it. */
export function newestOf(sources: string[], dates: Map<string, string>): string | undefined;
/** Every page's date, keyed as lib/page-dates.js keeps them (de/guides/firing). */
export function allPageDates(dates: Map<string, string>): Record<string, string>;
/** The libraries, git submodules (.gitmodules). */
export const SUBMODULES: readonly string[];
/** A submodule's changes as git log lines, each library file dated by the Glazecalc commit that moved its pointer. */
export function submoduleLog(raw: string, changed: (dir: string, from: string, to: string) => string[]): string;
