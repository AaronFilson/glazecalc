export const OUT: string;
/** The standard advice, as data/advice.ndjson has it. */
export function standardAdvice(): Array<{ title: string; content: string; tags?: string[] }>;
/** The keys of the advice's words in records/. */
export function adviceKeys(): Set<string>;
/** Each language's advice file, by its name ('de.json'), from records/. */
export function adviceFiles(): Record<string, string>;
