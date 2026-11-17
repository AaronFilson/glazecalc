import { readFileSync } from 'node:fs';
import path from 'node:path';
import { advisoriesOf, judge, type Allowance } from '../../scripts/audit.mjs';
import { expect } from './support/app.ts';

// CI's npm audit (scripts/audit.mjs): high and critical advisories fail it, but those allowed for a while.
const advisory = (id: string, name: string, severity: string) => ({
  source: 1,
  name,
  title: `${name} is slow`,
  url: `https://github.com/advisories/${id}`,
  severity
});
const REPORT = {
  vulnerabilities: {
    picomatch: { via: [advisory('GHSA-aaaa', 'picomatch', 'high')] },
    // Reached through picomatch: no advisory of its own.
    vite: { via: ['picomatch'] },
    tool: { via: [advisory('GHSA-bbbb', 'tool', 'moderate'), advisory('GHSA-aaaa', 'picomatch', 'high')] }
  }
};
const allow = (advisory: string, until: string): Allowance => ({ advisory, package: 'x', until, why: 'because' });

describe('the audit (scripts/audit.mjs)', () => {
  it('reads each advisory once, with the packages it is in, and none for a package only reached through another', () => {
    expect(advisoriesOf(REPORT).map((a) => [a.id, a.severity, a.packages])).to.eql([
      ['GHSA-aaaa', 'high', ['picomatch']],
      ['GHSA-bbbb', 'moderate', ['tool']]
    ]);
  });

  it('fails on a high advisory, and passes over a moderate one', () => {
    const { failing, waiting, unused } = judge(REPORT, [], '2026-11-17');
    expect(failing.map((a) => a.id)).to.eql(['GHSA-aaaa']);
    expect(waiting).to.eql([]);
    expect(unused).to.eql([]);
  });

  it('allows one to its last day, and fails it after, saying when its allowance ended', () => {
    const allowed = [allow('GHSA-aaaa', '2026-12-31')];
    expect(judge(REPORT, allowed, '2026-12-31').failing).to.eql([]);
    expect(judge(REPORT, allowed, '2026-12-31').waiting.map((a) => a.id)).to.eql(['GHSA-aaaa']);
    const after = judge(REPORT, allowed, '2027-01-01');
    expect(after.failing.map((a) => [a.id, a.ended])).to.eql([['GHSA-aaaa', '2026-12-31']]);
  });

  it('names an allowance whose advisory is no longer reported', () => {
    const { unused } = judge(
      REPORT,
      [allow('GHSA-aaaa', '2026-12-31'), allow('GHSA-gone', '2026-12-31')],
      '2026-11-17'
    );
    expect(unused.map((a) => a.advisory)).to.eql(['GHSA-gone']);
  });

  it('keeps each allowance with its reason and an end within a year', () => {
    const file = path.join(import.meta.dirname, '..', '..', 'scripts', 'audit-allowed.json');
    const allowed = JSON.parse(readFileSync(file, 'utf8')) as Allowance[];
    for (const allowance of allowed) {
      expect(allowance.advisory, 'advisory').to.match(/^GHSA(-[0-9a-z]{4}){3}$/);
      expect(allowance.why.length, allowance.advisory).to.be.greaterThan(40);
      expect(allowance.until, allowance.advisory).to.match(/^\d{4}-\d{2}-\d{2}$/);
      expect(Date.parse(allowance.until) - Date.now(), allowance.advisory).to.be.lessThan(366 * 86_400_000);
    }
  });
});
