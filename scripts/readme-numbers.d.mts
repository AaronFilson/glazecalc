/** What one CI run measured, by part, as the numbers/<part>.json files hold it. */
export interface Numbers {
  server: { tests: number; statements: number; branches: number };
  client: { tests: number; statements: number; branches: number };
  e2e: { tests: number };
  lighthouse: { pages: number; performance: number; accessibility: number; bestPractices: number; seo: number };
}
/** How a number the README states compares with what a run measured. */
export type Verdict = 'true' | 'out of date' | 'not true';
/**
 * A number the README gives, where, and how it compares; 'missing' when the README no longer gives it,
 * 'unread' when it gives one for the claim in words the claim's pattern cannot read.
 */
export interface Finding {
  what: string;
  line: number;
  stated: number | null;
  measured: number | null;
  verdict: Verdict | 'missing' | 'unread';
}
/** The largest multiple of 50 below a count: what "over N" may say of it. */
export function roundCount(count: number): number;
/** A coverage summary's totals, as c8 and Vitest write coverage-summary.json: the parts read here. */
export interface CoverageSummary {
  total: { statements: { pct: number }; branches: { pct: number } };
}
/** The server tests that passed, from Mocha's summary, and the statements and branches c8 saw run. */
export function measureServer(mochaOutput: string, coverageSummary: CoverageSummary): Numbers['server'];
/** The Angular unit tests that passed, from Vitest's JSON report, and the statements and branches they ran. */
export function measureClient(report: { numPassedTests?: number }, coverageSummary: CoverageSummary): Numbers['client'];
/** The browser tests that passed, from Playwright's JSON report. */
export function measureE2e(report: { stats?: { expected?: number; flaky?: number } }): Numbers['e2e'];
/** Each Lighthouse category's score out of 100: the lowest over the pages, of each page's median run. */
export function measureLighthouse(
  manifest: Array<{ isRepresentativeRun: boolean; summary: Record<string, number> }>
): Numbers['lighthouse'];
/** Each place the README gives numbers, and how they are read and written. */
export const CLAIMS: ReadonlyArray<{ what: string; pattern: RegExp; mention?: RegExp }>;
/** Whether a stated number is true of a measured one, out of date, or not true. */
export function judge(kind: 'count' | 'percent' | 'score', stated: number, measured: number): Verdict;
/** Every number the README gives, against what was measured. */
export function findings(text: string, numbers: Numbers): Finding[];
/** The README with every number it gives replaced by the measured one, rounded down; nothing else changes. */
export function writeNumbers(text: string, numbers: Numbers): string;
/** What the runs measured, from every numbers/<part>.json in a folder. */
export function readNumbers(dir: string): Numbers;
/** The findings as a Markdown table. */
export function table(results: Finding[]): string;
