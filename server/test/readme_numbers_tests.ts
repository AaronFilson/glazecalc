import fs from 'node:fs';
import { expect } from 'chai';
import {
  CLAIMS,
  findings,
  judge,
  measureClient,
  measureE2e,
  measureLighthouse,
  measureServer,
  roundCount,
  writeNumbers,
  type Numbers
} from '../../scripts/readme-numbers.mjs';

// The numbers README.md gives about the tests, coverage and Lighthouse, checked against each CI run
// (scripts/readme-numbers.mjs).
const README = fs.readFileSync(new URL('../../README.md', import.meta.url), 'utf8');

/** One run's numbers, as the CI jobs write them. */
const NUMBERS: Numbers = {
  server: { tests: 1669, statements: 98.44 },
  client: { tests: 1127, statements: 92.31 },
  e2e: { tests: 412 },
  lighthouse: { pages: 4, performance: 98, accessibility: 100, bestPractices: 100, seo: 100 }
};

const coverage = (pct: number) => ({ total: { statements: { pct } } });

describe("the README's numbers (scripts/readme-numbers.mjs)", () => {
  it('rounds a count down to a multiple of 50 below it, so that "over" stays true', () => {
    expect([1669, 1650, 1651, 49, 1].map(roundCount)).to.deep.equal([1650, 1600, 1650, 0, 0]);
  });

  it('reads the counts and the coverage each suite reports', () => {
    const mocha = '\n\u001b[32m  1669 passing\u001b[39m\u001b[90m (9m)\u001b[39m\n\u001b[36m  30 pending\u001b[39m\n';
    expect(measureServer(mocha, coverage(98.44))).to.deep.equal({ tests: 1669, statements: 98.44 });
    expect(measureClient({ numPassedTests: 1127 }, coverage(92.31))).to.deep.equal({ tests: 1127, statements: 92.31 });
    expect(measureE2e({ stats: { expected: 410, flaky: 2 } })).to.deep.equal({ tests: 412 });
    expect(() => measureServer('no summary here', coverage(98))).to.throw('passing');
    expect(() => measureE2e({})).to.throw('stats');
  });

  it("keeps each page's median run, and the lowest score over the pages", () => {
    const run = (url: string, isRepresentativeRun: boolean, performance: number) => ({
      url,
      isRepresentativeRun,
      summary: { performance, accessibility: 1, 'best-practices': 1, seo: 1 }
    });
    const manifest = [
      run('/', true, 0.99),
      run('/', false, 0.9),
      run('/materials', true, 0.975),
      run('/materials', false, 1)
    ];
    expect(measureLighthouse(manifest)).to.deep.equal({
      pages: 2,
      performance: 98,
      accessibility: 100,
      bestPractices: 100,
      seo: 100
    });
  });

  it('calls a number true, out of date, or not true', () => {
    expect(judge('count', 1650, 1669)).to.equal('true');
    expect(judge('count', 1669, 1669)).to.equal('not true');
    expect(judge('count', 1550, 1669)).to.equal('out of date');
    expect(judge('percent', 98, 98.44)).to.equal('true');
    expect(judge('percent', 99, 98.44)).to.equal('not true');
    expect(judge('percent', 96, 98.44)).to.equal('out of date');
    expect(judge('score', 98, 98)).to.equal('true');
    expect(judge('score', 100, 99)).to.equal('not true');
    expect(judge('score', 95, 99)).to.equal('out of date');
  });

  it('finds every number the README gives, and can read each one', () => {
    for (const claim of CLAIMS) expect([...README.matchAll(claim.pattern)].length, claim.what).to.be.above(0);
    expect(findings(README, NUMBERS).filter((result) => result.verdict === 'missing')).to.deep.equal([]);
  });

  it('writes the measured numbers in, every one of them then true, and writing again changes nothing', () => {
    const written = writeNumbers(README, NUMBERS);
    expect(findings(written, NUMBERS).filter((result) => result.verdict !== 'true')).to.deep.equal([]);
    expect(written).to.include('over 1,650 server tests (98% of statements)');
    expect(written).to.include('over 1,100 Angular unit tests (92% of statements)');
    expect(written).to.include('over 400 Playwright browser tests');
    expect(written).to.include('img.shields.io/badge/tests-3%2C200%2B-');
    expect(writeNumbers(written, NUMBERS)).to.equal(written);
  });
});
