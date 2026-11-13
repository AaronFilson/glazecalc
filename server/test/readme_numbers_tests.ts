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
  server: { tests: 1669, statements: 98.44, branches: 88.73 },
  client: { tests: 1127, statements: 92.31, branches: 91.92 },
  e2e: { tests: 412 },
  lighthouse: { pages: 4, performance: 98, accessibility: 100, bestPractices: 100, seo: 100 }
};

/** A coverage summary as c8 and Vitest write it, with only the totals read. */
const coverage = (statements: number, branches: number) => ({
  total: { statements: { pct: statements }, branches: { pct: branches } }
});

/** The text with each run of spaces and line breaks as one space, as a reader sees it. */
const flat = (text: string) => text.replace(/\s+/g, ' ');

describe("the README's numbers (scripts/readme-numbers.mjs)", () => {
  it('rounds a count down to a multiple of 50 below it, so that "over" stays true', () => {
    expect([1669, 1650, 1651, 49, 1].map(roundCount)).to.deep.equal([1650, 1600, 1650, 0, 0]);
  });

  it('reads the counts and the statement and branch coverage each suite reports', () => {
    const mocha = '\n\u001b[32m  1669 passing\u001b[39m\u001b[90m (9m)\u001b[39m\n\u001b[36m  30 pending\u001b[39m\n';
    expect(measureServer(mocha, coverage(98.44, 88.73))).to.deep.equal({
      tests: 1669,
      statements: 98.44,
      branches: 88.73
    });
    expect(measureClient({ numPassedTests: 1127 }, coverage(92.31, 91.92))).to.deep.equal({
      tests: 1127,
      statements: 92.31,
      branches: 91.92
    });
    expect(measureE2e({ stats: { expected: 410, flaky: 2 } })).to.deep.equal({ tests: 412 });
    expect(() => measureServer('no summary here', coverage(98, 88))).to.throw('passing');
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
    const unread = findings(README, NUMBERS).filter((result) => ['missing', 'unread'].includes(result.verdict));
    expect(unread).to.deep.equal([]);
  });

  it('reads a number whose words are split across lines, and keeps the line breaks when writing', () => {
    const text = 'over 1,600 server\n  tests (97% of\n  statements, 87% of\n  branches)';
    const read = findings(text, NUMBERS).filter((result) => result.what.startsWith('server'));
    expect(read.map((result) => [result.what, result.stated, result.verdict])).to.deep.equal([
      ['server tests', 1600, 'true'],
      ['server statement coverage', 97, 'true'],
      ['server branch coverage', 87, 'true']
    ]);
    expect(writeNumbers(text, NUMBERS)).to.equal(
      'over 1,650 server\n  tests (98% of\n  statements, 88% of\n  branches)'
    );
  });

  it('judges branch coverage as it judges statements: no more than the whole percent measured', () => {
    const text = 'over 1,050 Angular unit tests (92% of statements, 92% of branches)';
    const branches = findings(text, NUMBERS).find((result) => result.what === 'Angular branch coverage');
    expect(branches).to.include({ stated: 92, measured: 91.92, verdict: 'not true' });
  });

  it('calls a number it cannot read an error, never a number nobody checks', () => {
    const text = 'about 1,800 server tests, and over 1,650 server tests (98% of statements, 88% of branches)';
    const server = findings(text, NUMBERS).filter((result) => result.what === 'server tests');
    expect(server.map((result) => [result.verdict, result.line])).to.deep.equal([
      ['true', 1],
      ['unread', 1]
    ]);
  });

  it('calls coverage an error when its branches are left out or worded otherwise', () => {
    for (const text of [
      'over 1,650 server tests (98% of statements)',
      'over 1,650 server tests (98% of statements and 88% of branches)'
    ]) {
      const server = findings(text, NUMBERS).filter((result) => result.what === 'server tests');
      expect(
        server.map((result) => result.verdict),
        text
      ).to.deep.equal(['missing', 'unread']);
    }
  });

  it('writes the measured numbers in, every one of them then true, and writing again changes nothing', () => {
    const written = writeNumbers(README, NUMBERS);
    expect(findings(written, NUMBERS).filter((result) => result.verdict !== 'true')).to.deep.equal([]);
    expect(flat(written)).to.include('over 1,650 server tests (98% of statements, 88% of branches)');
    expect(flat(written)).to.include('over 1,100 Angular unit tests (92% of statements, 91% of branches)');
    expect(flat(written)).to.include('over 400 Playwright browser tests');
    expect(written).to.include('img.shields.io/badge/tests-3%2C200%2B-');
    expect(writeNumbers(written, NUMBERS)).to.equal(written);
  });
});
