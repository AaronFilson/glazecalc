import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect } from './support/app.ts';

// The app loads nothing from another site: no Google Fonts, reCAPTCHA,
// analytics or CDN, any of which can be slow or blocked, in China above all
// (the report on East and Southeast Asia, "Keep China reachable"), and each
// of which would learn who reads the page. Links a reader follows to another
// site, such as GitHub or a supplier's data sheet, are not loaded and stay.

const ROOT = path.resolve(import.meta.dirname, '..', '..');
/** The app's own code and what it serves; not these tests, which name the hosts. */
const SOURCES = ['client', 'server', 'lib', 'angular.json'];
// server/lib/oauth.ts names Google's token and key endpoints, which the server
// calls itself when someone signs in with Google; no page loads them.
const LEFT_OUT = [path.join('server', 'test'), path.join('server', 'lib', 'oauth.ts')];
const BINARY = /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf)$/i;

/** Hosts of fonts, scripts, captchas and trackers that a page would load from. */
const THIRD_PARTY = new RegExp(
  [
    String.raw`googleapis\.com`,
    String.raw`gstatic\.com`,
    'recaptcha',
    'hcaptcha',
    String.raw`googletagmanager\.com`,
    String.raw`google-analytics\.com`,
    String.raw`doubleclick\.net`,
    String.raw`cdnjs\.cloudflare\.com`,
    String.raw`jsdelivr\.net`,
    String.raw`unpkg\.com`,
    String.raw`bootstrapcdn\.com`,
    String.raw`code\.jquery\.com`,
    String.raw`aspnetcdn\.com`,
    String.raw`typekit\.net`,
    String.raw`fontawesome\.com`,
    String.raw`esm\.sh`,
    String.raw`skypack\.dev`
  ].join('|'),
  'i'
);

/** Every file under a path, as paths from the root. */
function filesIn(root: string, entry: string): string[] {
  const full = path.join(root, entry);
  if (LEFT_OUT.includes(entry)) return [];
  try {
    return readdirSync(full).flatMap((name) => filesIn(root, path.join(entry, name)));
  } catch {
    return [entry];
  }
}

/** Each line of the sources that names a third-party host, as "file:line: host". */
function thirdPartyHosts(root = ROOT, sources = SOURCES): string[] {
  const found: string[] = [];
  for (const file of sources.flatMap((source) => filesIn(root, source))) {
    if (BINARY.test(file)) continue;
    readFileSync(path.join(root, file), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const host = THIRD_PARTY.exec(line);
        if (host) found.push(`${file.replaceAll('\\', '/')}:${i + 1}: ${host[0]}`);
      });
  }
  return found;
}

describe('third-party hosts', () => {
  it('are not named anywhere in the client, the server or what they share', () => {
    expect(thirdPartyHosts()).to.eql([]);
  });

  it('are found in a page, a style sheet or code, while a link to GitHub is not', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'hosts-'));
    try {
      writeFileSync(
        path.join(dir, 'index.html'),
        [
          '<link href="https://fonts.googleapis.com/css2?family=Lora" rel="stylesheet" />',
          '<a href="https://github.com/AaronFilson/glazecalc">Source</a>',
          '<script src="https://www.google.com/recaptcha/api.js"></script>'
        ].join('\n')
      );
      writeFileSync(path.join(dir, 'styles.scss'), "@import url('https://cdn.jsdelivr.net/npm/bootstrap/dist/x.css');");
      writeFileSync(path.join(dir, 'main.ts'), "import('https://unpkg.com/lodash');\nfetch('/api/health');");
      writeFileSync(path.join(dir, 'logo.png'), 'googleapis.com');
      expect(thirdPartyHosts(dir, ['index.html', 'styles.scss', 'main.ts', 'logo.png'])).to.eql([
        'index.html:1: googleapis.com',
        'index.html:3: recaptcha',
        'styles.scss:1: jsdelivr.net',
        'main.ts:1: unpkg.com'
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
