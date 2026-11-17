// npm audit, as CI runs it: it fails on any high or critical advisory but one allowed for a while in
// scripts/audit-allowed.json, each with the reason it can wait and the last day it may. An allowance past
// its day fails like any other, so it is looked at again; one whose advisory is no longer reported is
// named, to be taken out.
//
//   node scripts/audit.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ALLOWED = path.join(ROOT, 'scripts', 'audit-allowed.json');
const SEVERE = ['high', 'critical'];

/**
 * The advisories in an `npm audit --json` report, once each, with the packages they are in. A package
 * that is only reached through another (its `via` a package name) brings no advisory of its own.
 */
export function advisoriesOf(report) {
  const byId = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via !== 'object' || via === null) continue;
      // Its GHSA id, the end of its URL.
      const id = via.url ? via.url.slice(via.url.lastIndexOf('/') + 1) : String(via.source);
      if (!byId.has(id)) byId.set(id, { id, title: via.title, url: via.url, severity: via.severity, packages: [] });
      const advisory = byId.get(id);
      if (!advisory.packages.includes(via.name)) advisory.packages.push(via.name);
    }
  }
  return [...byId.values()];
}

/**
 * What the audit comes to on a day (YYYY-MM-DD): the high and critical advisories that fail it, each
 * with its allowance if that has ended; those allowed, each with its allowance; and the allowances
 * whose advisory is no longer reported.
 */
export function judge(report, allowed, today) {
  const advisories = advisoriesOf(report);
  const allowanceOf = (advisory) => allowed.find((allowance) => allowance.advisory === advisory.id);
  const failing = [];
  const waiting = [];
  for (const advisory of advisories.filter((a) => SEVERE.includes(a.severity))) {
    const allowance = allowanceOf(advisory);
    if (allowance && today <= allowance.until) waiting.push({ ...advisory, allowance });
    else failing.push({ ...advisory, ...(allowance && { ended: allowance.until }) });
  }
  const unused = allowed.filter((allowance) => !advisories.some((advisory) => advisory.id === allowance.advisory));
  return { failing, waiting, unused };
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  const audit = spawnSync('npm', ['audit', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32'
  });
  let report;
  try {
    report = JSON.parse(audit.stdout);
  } catch {
    console.error('npm audit gave no report:\n' + (audit.stderr || audit.stdout || audit.error));
    process.exit(2);
  }
  if (report.error) {
    console.error('npm audit could not run: ' + (report.error.summary ?? JSON.stringify(report.error)));
    process.exit(2);
  }
  const allowed = JSON.parse(readFileSync(ALLOWED, 'utf8'));
  const { failing, waiting, unused } = judge(report, allowed, new Date().toISOString().slice(0, 10));
  for (const advisory of waiting)
    console.log(
      `Allowed until ${advisory.allowance.until}: ${advisory.id} in ${advisory.packages.join(', ')}, ${advisory.title}`
    );
  for (const allowance of unused)
    console.log(
      `No longer reported, so its allowance can come out of scripts/audit-allowed.json: ${allowance.advisory}`
    );
  if (failing.length) {
    for (const advisory of failing)
      console.error(
        `${advisory.severity}: ${advisory.id} in ${advisory.packages.join(', ')}, ${advisory.title} (${advisory.url})` +
          (advisory.ended
            ? `. Its allowance ended on ${advisory.ended}: see whether a fix is out, or allow it longer, saying why.`
            : '')
      );
    process.exit(1);
  }
  console.log(`No high or critical advisory${waiting.length ? ' but those allowed above' : ''}.`);
}
