/** The pages to check: each live language's home, and every English public page. */
export function pagesToCheck(): string[];
/** What is wrong with the home page's headers, for production or staging (by its host name). */
export function headerProblems(headers: Headers | Record<string, string>, url: string): string[];
