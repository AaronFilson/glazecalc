/** An allowance in scripts/audit-allowed.json. */
export interface Allowance {
  advisory: string;
  package: string;
  /** The last day it is allowed, YYYY-MM-DD. */
  until: string;
  why: string;
}

/** An advisory in an npm audit report, once, with the packages it is in. */
export interface Advisory {
  id: string;
  title?: string;
  url?: string;
  severity: string;
  packages: string[];
}

/** The advisories in an `npm audit --json` report, once each. */
export function advisoriesOf(report: { vulnerabilities?: Record<string, { via?: unknown[] }> }): Advisory[];
/** What the audit comes to on a day: what fails it, what is allowed, and allowances no longer needed. */
export function judge(
  report: { vulnerabilities?: Record<string, { via?: unknown[] }> },
  allowed: Allowance[],
  today: string
): {
  failing: Array<Advisory & { ended?: string }>;
  waiting: Array<Advisory & { allowance: Allowance }>;
  unused: Allowance[];
};
