// The numbers README.md gives about the tests, their coverage and Lighthouse,
// checked against CI's own run of them so that they stay true. Each CI job that
// measures one writes it to numbers/<part>.json, and the Numbers job checks the
// README against them all:
//
//   node scripts/readme-numbers.mjs server <Mocha's output> <c8's coverage-summary.json>
//   node scripts/readme-numbers.mjs client <Vitest's JSON report> <coverage-summary.json>
//   node scripts/readme-numbers.mjs e2e <Playwright's JSON report>
//   node scripts/readme-numbers.mjs lighthouse <lighthouse-results/manifest.json>
//                 each writes what it measured to numbers/<part>.json
//   node scripts/readme-numbers.mjs check [dir]
//                 fails when the README says more than the run measured (no longer
//                 true), and warns when it says much less (out of date)
//   node scripts/readme-numbers.mjs write [dir]
//                 puts the measured numbers into the README, rounded down
//
// The README gives counts rounded down to a multiple of 50 below them ("over
// 1,650"), and coverage and scores as whole numbers, so that they stay true as
// tests are added. A number the README no longer gives is an error here, and so is
// one worded so that CLAIMS below cannot read it: a change to the wording comes
// with a change to CLAIMS. Writing changes only the numbers, so the README's line
// breaks stay where they were.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const README = path.join(ROOT, 'README.md');

/** The largest multiple of 50 below a count: what "over N" may say of it. */
export const roundCount = (count) => Math.max(0, Math.ceil(count / 50) * 50 - 50);

/** A count as the README writes it: 1,650. */
const formatCount = (count) => count.toLocaleString('en-US');

const parseCount = (text) => Number(text.replace(/,/g, ''));

// eslint-disable-next-line no-control-regex
const stripColors = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

/** The server tests that passed, from Mocha's summary ("1669 passing"), and the statements c8 saw run. */
export function measureServer(mochaOutput, coverageSummary) {
  const passing = [...stripColors(mochaOutput).matchAll(/^\s*(\d+) passing\b/gm)].at(-1);
  if (!passing) throw new Error('Mocha\'s output has no "N passing" line');
  return { tests: Number(passing[1]), statements: coverageSummary.total.statements.pct };
}

/** The Angular unit tests that passed, from Vitest's JSON report, and the statements they ran. */
export function measureClient(report, coverageSummary) {
  if (!Number.isInteger(report.numPassedTests)) throw new Error("Vitest's report has no numPassedTests");
  return { tests: report.numPassedTests, statements: coverageSummary.total.statements.pct };
}

/** The browser tests that passed, from Playwright's JSON report (a flaky one passed on a retry). */
export function measureE2e(report) {
  const stats = report.stats ?? {};
  if (!Number.isInteger(stats.expected)) throw new Error("Playwright's report has no stats");
  return { tests: stats.expected + (stats.flaky ?? 0) };
}

/**
 * Each Lighthouse category's score out of 100, as the report shows it: of each page's median run
 * (Lighthouse CI's representative run), the lowest over the pages.
 */
export function measureLighthouse(manifest) {
  const runs = manifest.filter((run) => run.isRepresentativeRun);
  if (!runs.length) throw new Error("Lighthouse CI's manifest has no representative runs");
  const lowest = (category) => Math.min(...runs.map((run) => Math.round(run.summary[category] * 100)));
  return {
    pages: runs.length,
    performance: lowest('performance'),
    accessibility: lowest('accessibility'),
    bestPractices: lowest('best-practices'),
    seo: lowest('seo')
  };
}

const totalTests = (numbers) => numbers.server.tests + numbers.client.tests + numbers.e2e.tests;
const otherScores = (numbers) =>
  Math.min(numbers.lighthouse.accessibility, numbers.lighthouse.bestPractices, numbers.lighthouse.seo);
/** A count as the README gives it: rounded down, below the count. */
const countText = (count) => formatCount(roundCount(count));
/** A percent as the README gives it: the whole percent, rounded down. */
const percentText = (pct) => String(Math.floor(pct));

/** Reads a badge's message, or says the badge no longer looks as CLAIMS expects. */
const badgeParts = (label, encoded, pattern) => {
  const parts = pattern.exec(decodeURIComponent(encoded));
  if (!parts) throw new Error(`The ${label} badge says "${decodeURIComponent(encoded)}", which this does not read`);
  return parts;
};

/**
 * Each place the README gives numbers. pattern finds them, and every match is checked; its words may be
 * split across lines, as Prettier leaves them. mention finds the same number however it is worded, so
 * that one the pattern cannot read is an error, never a number nobody checks. numbers says what each
 * number in a match is and what measures it (judged by its kind, below), and values gives each one's
 * text from what was measured, rounded down, for write.
 */
export const CLAIMS = [
  {
    what: 'server tests',
    pattern: /over\s+([\d,]+)\s+server\s+tests\s+\((\d+)%\s+of\s+statements\)/g,
    mention: /[\d,]+\+?\s+server\s+tests/g,
    numbers: (match) => [
      { what: 'server tests', kind: 'count', stated: parseCount(match[1]), measured: (n) => n.server.tests },
      { what: 'server coverage', kind: 'percent', stated: Number(match[2]), measured: (n) => n.server.statements }
    ],
    values: (n) => [countText(n.server.tests), percentText(n.server.statements)]
  },
  {
    what: 'Angular unit tests',
    pattern: /over\s+([\d,]+)\s+Angular\s+unit\s+tests\s+\((\d+)%\s+of\s+statements\)/g,
    mention: /[\d,]+\+?\s+Angular\s+unit\s+tests/g,
    numbers: (match) => [
      { what: 'Angular unit tests', kind: 'count', stated: parseCount(match[1]), measured: (n) => n.client.tests },
      { what: 'Angular coverage', kind: 'percent', stated: Number(match[2]), measured: (n) => n.client.statements }
    ],
    values: (n) => [countText(n.client.tests), percentText(n.client.statements)]
  },
  {
    what: 'browser tests',
    pattern: /over\s+([\d,]+)\s+Playwright\s+browser\s+tests/g,
    mention: /[\d,]+\+?\s+Playwright\s+browser\s+tests/g,
    numbers: (match) => [
      { what: 'browser tests', kind: 'count', stated: parseCount(match[1]), measured: (n) => n.e2e.tests }
    ],
    values: (n) => [countText(n.e2e.tests)]
  },
  {
    what: 'Lighthouse',
    pattern: /performance\s+(\d+);\s+accessibility,\s+best\s+practices\s+and\s+SEO\s+(\d+)/g,
    mention: /performance\s+\d+/g,
    numbers: (match) => [
      {
        what: 'Lighthouse performance',
        kind: 'score',
        stated: Number(match[1]),
        measured: (n) => n.lighthouse.performance
      },
      {
        what: 'Lighthouse accessibility, best practices and SEO',
        kind: 'score',
        stated: Number(match[2]),
        measured: otherScores
      }
    ],
    values: (n) => [String(n.lighthouse.performance), String(otherScores(n))]
  },
  {
    what: 'tests badge',
    pattern: /img\.shields\.io\/badge\/tests-([^-)\s]+)-/g,
    numbers: (match) => [
      {
        what: 'tests badge',
        kind: 'count',
        stated: parseCount(badgeParts('tests', match[1], /^([\d,]+)\+$/)[1]),
        measured: totalTests
      }
    ],
    values: (n) => [encodeURIComponent(countText(totalTests(n)) + '+')]
  },
  {
    what: 'coverage badge',
    pattern: /img\.shields\.io\/badge\/coverage-([^-)\s]+)-/g,
    numbers: (match) => {
      const parts = badgeParts('coverage', match[1], /^(\d+)% server · (\d+)% client$/);
      return [
        {
          what: 'coverage badge, server',
          kind: 'percent',
          stated: Number(parts[1]),
          measured: (n) => n.server.statements
        },
        {
          what: 'coverage badge, client',
          kind: 'percent',
          stated: Number(parts[2]),
          measured: (n) => n.client.statements
        }
      ];
    },
    values: (n) => [
      encodeURIComponent(`${percentText(n.server.statements)}% server · ${percentText(n.client.statements)}% client`)
    ]
  },
  {
    what: 'Lighthouse badge',
    pattern: /img\.shields\.io\/badge\/Lighthouse-([^-)\s]+)-/g,
    numbers: (match) => {
      const parts = badgeParts('Lighthouse', match[1], /^(\d+) · (\d+) · (\d+) · (\d+)$/);
      return [
        {
          what: 'Lighthouse badge, performance',
          kind: 'score',
          stated: Number(parts[1]),
          measured: (n) => n.lighthouse.performance
        },
        {
          what: 'Lighthouse badge, accessibility',
          kind: 'score',
          stated: Number(parts[2]),
          measured: (n) => n.lighthouse.accessibility
        },
        {
          what: 'Lighthouse badge, best practices',
          kind: 'score',
          stated: Number(parts[3]),
          measured: (n) => n.lighthouse.bestPractices
        },
        { what: 'Lighthouse badge, SEO', kind: 'score', stated: Number(parts[4]), measured: (n) => n.lighthouse.seo }
      ];
    },
    values: (n) => {
      const l = n.lighthouse;
      return [encodeURIComponent(`${l.performance} · ${l.accessibility} · ${l.bestPractices} · ${l.seo}`)];
    }
  }
];

/**
 * Whether a number the README states is 'true' of what a run measured, 'out of date' (true, but well
 * below it), or 'not true'. A count must be below the count ("over"); a percent at most the whole
 * percent measured; a score at most the score.
 */
export function judge(kind, stated, measured) {
  if (kind === 'count') return stated >= measured ? 'not true' : measured - stated >= 100 ? 'out of date' : 'true';
  if (kind === 'percent') {
    const whole = Math.floor(measured);
    return stated > whole ? 'not true' : whole - stated >= 2 ? 'out of date' : 'true';
  }
  return stated > measured ? 'not true' : measured - stated >= 3 ? 'out of date' : 'true';
}

/**
 * Every number the README gives, where, against what was measured; a claim it no longer makes
 * ('missing'); and a number for a claim worded so that its pattern cannot read it ('unread').
 */
export function findings(text, numbers) {
  const results = [];
  const lineOf = (index) => text.slice(0, index).split('\n').length;
  for (const claim of CLAIMS) {
    const matches = [...text.matchAll(claim.pattern)];
    if (!matches.length) results.push({ what: claim.what, line: 0, stated: null, measured: null, verdict: 'missing' });
    for (const match of matches) {
      for (const number of claim.numbers(match)) {
        const measured = number.measured(numbers);
        results.push({
          what: number.what,
          line: lineOf(match.index),
          stated: number.stated,
          measured,
          verdict: judge(number.kind, number.stated, measured)
        });
      }
    }
    for (const mention of claim.mention ? text.matchAll(claim.mention) : []) {
      const read = matches.some((m) => mention.index >= m.index && mention.index < m.index + m[0].length);
      if (!read) {
        results.push({
          what: claim.what,
          line: lineOf(mention.index),
          stated: null,
          measured: null,
          verdict: 'unread'
        });
      }
    }
  }
  return results;
}

/** A match with each captured number's text replaced, and everything around them, line breaks too, as it was. */
const replaceGroups = (match, groups, values) => {
  let out = '';
  let rest = match;
  groups.forEach((group, i) => {
    const at = rest.indexOf(group);
    out += rest.slice(0, at) + values[i];
    rest = rest.slice(at + group.length);
  });
  return out + rest;
};

/** The README with every number it gives replaced by the measured one, rounded as above. */
export function writeNumbers(text, numbers) {
  return CLAIMS.reduce((result, claim) => {
    const values = claim.values(numbers);
    return result.replace(claim.pattern, (match, ...rest) =>
      replaceGroups(match, rest.slice(0, values.length), values)
    );
  }, text);
}

/** What the runs measured, from every numbers/<part>.json in a folder, as one object. */
export function readNumbers(dir) {
  const numbers = {};
  for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.json'))) {
    Object.assign(numbers, JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
  }
  for (const part of ['server', 'client', 'e2e', 'lighthouse']) {
    if (!numbers[part]) throw new Error(`No numbers for ${part} in ${dir}`);
  }
  return numbers;
}

/** The findings as a Markdown table, for the job's summary. */
export function table(results) {
  const show = (value) => (value === null ? '' : typeof value === 'number' ? formatCount(value) : String(value));
  const rows = results.map(
    (r) => `| ${r.what} | ${r.line || ''} | ${show(r.stated)} | ${show(r.measured)} | ${r.verdict} |`
  );
  return ['| Number | README line | README says | This run | |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}

const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function save(part, values) {
  fs.mkdirSync('numbers', { recursive: true });
  fs.writeFileSync(path.join('numbers', part + '.json'), JSON.stringify({ [part]: values }, null, 2) + '\n');
  console.log(`${part}: ${JSON.stringify(values)}`);
}

function main([command, ...args]) {
  if (command === 'server') return save('server', measureServer(fs.readFileSync(args[0], 'utf8'), json(args[1])));
  if (command === 'client') return save('client', measureClient(json(args[0]), json(args[1])));
  if (command === 'e2e') return save('e2e', measureE2e(json(args[0])));
  if (command === 'lighthouse') return save('lighthouse', measureLighthouse(json(args[0])));
  const numbers = readNumbers(args[0] ?? 'numbers');
  const text = fs.readFileSync(README, 'utf8');
  if (command === 'write') {
    fs.writeFileSync(README, writeNumbers(text, numbers));
    console.log('README.md now gives the numbers measured.');
    return;
  }
  if (command !== 'check')
    throw new Error('Usage: server, client, e2e, lighthouse, check or write (see the top of this file)');
  const results = findings(text, numbers);
  const summary = "### The README's numbers\n\n" + table(results) + '\n';
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  for (const r of results) {
    if (r.verdict === 'true') continue;
    const level = r.verdict === 'out of date' ? 'warning' : 'error';
    const message =
      r.verdict === 'missing'
        ? `README.md no longer gives the ${r.what}; change CLAIMS in scripts/readme-numbers.mjs with its wording`
        : r.verdict === 'unread'
          ? `README.md gives a number for the ${r.what} in words CLAIMS in scripts/readme-numbers.mjs does not read`
          : `README.md says ${r.stated} for the ${r.what}, and this run measured ${r.measured} (${r.verdict}); ` +
            'node scripts/readme-numbers.mjs write <numbers> puts the measured numbers in';
    console.log(`::${level} file=README.md,line=${r.line || 1}::${message}`);
  }
  if (results.some((r) => ['not true', 'missing', 'unread'].includes(r.verdict))) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
