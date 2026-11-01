// Renders each public page in each live language to plain HTML at build time,
// for the server to send in place of the empty index.html (docs/seo-plan.md).
// The app then hydrates the page in place.
//
//   npm run build        (ng build, then this)
//
// 1. Builds the render bundle (the "prerender" configuration in angular.json) to
//    dist/prerender. It is separate because the CLI will not build a server
//    bundle together with the policy <meta> of the browser build (autoCsp).
// 2. Renders every page with the browser build's index.html, a few workers at a
//    time. Each worker renders one page after another: Transloco's translate()
//    function keeps the last service made in a variable of the module, so two
//    renders in one thread would read each other's language.
// 3. Writes dist/glazecalc/prerendered/<language>/<page>.html, outside browser/
//    so that express.static never sends a file without the server's head and nonce.
//    Each page's head asks early for the font files its text is set in (fontPreloads).
//
// The build fails if a page logs an error, is the not-found page, has little text,
// has a script the browser build's policy does not know, is over MAX_GZIPPED, or
// (the advice page) lacks any of the standard advice, (the materials list) lacks
// a link to a material's page, or (the cone chart) lacks its figures.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { gzipSync } from 'node:zlib';
import pages from '../lib/pages.js';
import languages from '../lib/regions/languages.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist', 'glazecalc');
const BROWSER = path.join(OUT, 'browser');
const PRERENDERED = path.join(OUT, 'prerendered');
const BUNDLE = path.join(ROOT, 'dist', 'prerender', 'server', 'main.server.mjs');

/** Workers rendering at the same time, at most. */
const WORKERS = 4;
/** Failed pages named in the error; the rest are counted. */
const SHOWN = 12;
/** A page with less text than this did not render its content. */
export const MIN_TEXT = 300;

/**
 * A page larger than this, gzipped, carries more than it shows: the largest, a
 * Greek guide, is about 83 kB; the advice page was 121 kB while it carried
 * every standard record's words (scripts/advice-i18n.mjs).
 */
export const MAX_GZIPPED = 100 * 1024;

/** The standard advice's titles, which the advice page must show (data/advice.ndjson). */
const ADVICE_COUNT = readFileSync(path.join(ROOT, 'data', 'advice.ndjson'), 'utf8')
  .split('\n')
  .filter((line) => line.trim()).length;

/** The guides among the public pages (not the list of them). */
const GUIDE_PAGES = pages.PUBLIC_PAGES.filter((page) => page.startsWith('/guides/'));

/**
 * The text with every decimal digit of any script written as 0–9 (১৩০৫ and ١٣٠٥ read as 1305). Unicode keeps each
 * script's ten digits in a run from zero, so a digit's value is how many digits come before it in its run.
 */
export function asciiDigits(text) {
  return text.replace(/\p{Nd}/gu, (digit) => {
    let point = digit.codePointAt(0);
    let value = 0;
    while (value < 9 && /\p{Nd}/u.test(String.fromCodePoint(point - 1))) {
      point--;
      value++;
    }
    return String(value);
  });
}

/** What is wrong with one page in particular: the advice page has each piece of the standard advice. */
export function pageProblems(html, page, code = 'en') {
  const found = [];
  // A reference page in a language it is translated into has no notice that it is in English.
  if (pages.REFERENCE_PAGES.includes(page) && languages.REFERENCE_LANGUAGES.includes(code)) {
    if (/<p\b[^>]*class="guide-note"/.test(html)) found.push('it carries the notice that it is not translated');
  }
  if (gzipSync(html).length > MAX_GZIPPED) found.push(`it is over ${MAX_GZIPPED / 1024} kB gzipped`);
  if (page === '/advice') {
    const list = /<ul\b[^>]*class="general-advice"[^>]*>([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? '';
    const shown = (list.match(/<h3\b/g) ?? []).length;
    if (shown !== ADVICE_COUNT) found.push(`it shows ${shown} of the ${ADVICE_COUNT} pieces of standard advice`);
  }
  // The list of materials links each material's page, which is how a search engine finds them.
  if (page === '/materials') {
    const missing = pages.MATERIAL_PAGES.filter((material) => !new RegExp(`href="[^"]*${material}"`).test(html));
    if (missing.length) found.push(`it does not link ${missing.length} material page(s), such as ${missing[0]}`);
  }
  // The cone chart has both charts' figures, not an empty table. A language may write them in its own digits
  // (Bengali, Marathi, Arabic in some regions): those are read as 0–9 first, with any grouping mark.
  if (
    page === '/cones' &&
    !(/Orton/.test(html) && /\bSK\b/.test(html) && /1[,.\u066c\u202f\u00a0 ]?305/.test(asciiDigits(html)))
  ) {
    found.push('it lacks the Orton or SK chart');
  }
  // A guide ends with links to the others (the "More guides" block), so a search engine can follow them.
  if (GUIDE_PAGES.includes(page)) {
    for (const other of GUIDE_PAGES.filter((guide) => guide !== page)) {
      if (!html.includes(`${other}"`) || !new RegExp(`href="[^"]*${other}"`).test(html)) {
        found.push(`it does not link the guide ${other}`);
      }
    }
  }
  return found;
}

/** Stands for the nonce in a page (client/app/app.config.server.ts); the server swaps it. */
export const NONCE_PLACEHOLDER = '__GC_NONCE__';

/** The address a page is rendered at: /guides/firing in English, /de/guides/firing in German. */
export const urlFor = (code, page) => languages.languagePrefix(code) + page;

/** The document each render starts from: the browser build's index.html, with the root marked for the nonce. */
export const startDocument = (indexHtml) => {
  if (!indexHtml.includes('<gc-root>')) throw new Error('index.html has no <gc-root>');
  return indexHtml.replace('<gc-root>', `<gc-root ngCspNonce="${NONCE_PLACEHOLDER}">`);
};

/** The inline scripts that run (not JSON data), as written. */
export const inlineScripts = (html) =>
  [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attributes]) => !/\bsrc=/.test(attributes) && !/\btype="application\/(ld\+)?json"/.test(attributes))
    .map(([, , body]) => body);

/** The font families the text is set in (styles.scss, --gc-font), in the order a browser tries them. */
export const TEXT_FONTS = ['Noto Serif Sub', 'Lora Variable', 'Noto Serif Fill'];

/** A font file is preloaded when the opening of the page, its first this many characters, is set in it. */
export const PRELOAD_OPENING = 2000;

/** The upright faces of the text's fonts in a stylesheet: each file and the characters it has. */
export function fontFaces(css) {
  const faces = [];
  for (const [, rule] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const family = /font-family:\s*["']?([^;"']+)/.exec(rule)?.[1]?.trim();
    const url = /src:\s*url\(["']?([^)"']+\.woff2)["']?\)/.exec(rule)?.[1];
    if (!family || !url || !TEXT_FONTS.includes(family) || /font-style:\s*italic/.test(rule)) continue;
    const range = /unicode-range:\s*([^;]+)/.exec(rule)?.[1] ?? 'U+0-10FFFF';
    const ranges = range.split(',').map((part) => {
      const [from, to] = part.trim().replace(/^U\+/i, '').split('-');
      return [parseInt(from, 16), parseInt(to ?? from, 16)];
    });
    faces.push({ family, url: url.replace(/^\.\//, ''), ranges });
  }
  return faces;
}

/**
 * The preload links for the font files a page's text needs, for its head: the browser would otherwise find
 * them only once the stylesheet is in and the page laid out, and draw the text in a fallback font until they
 * came. The footer's list of languages is set in the device's own font, so it is left out.
 */
export function fontPreloads(html, faces) {
  const text = textOf(html.replace(/<footer\b[\s\S]*?<\/footer>/g, ' '));
  // A file for signs further down is left to load when they are drawn: a guide's sections are laid out
  // only as they come near the window.
  const files = new Set();
  for (const char of [...text].slice(0, PRELOAD_OPENING)) {
    const code = char.codePointAt(0);
    for (const family of TEXT_FONTS) {
      const face = faces.find(
        (face) => face.family === family && face.ranges.some(([from, to]) => code >= from && code <= to)
      );
      if (face) {
        files.add(face.url);
        break;
      }
    }
  }
  return [...files]
    .sort()
    .map((url) => `<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin="anonymous">`)
    .join('');
}

/** A rendered page with its font preloads ahead of the stylesheet. */
export const withFontPreloads = (html, faces) =>
  html.replace(/<link rel="stylesheet"/, (link) => fontPreloads(html, faces) + link);

/** The words on the page: the root's text without tags, scripts and styles. */
export const textOf = (html) => {
  const root = /<gc-root\b[\s\S]*<\/gc-root>/.exec(html)?.[0] ?? '';
  return root
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * What is wrong with a rendered page, as a list of short sentences (empty when
 * it is fine). `start` is the document it was rendered from, and `code` the
 * language it should be in.
 */
export function problemsWith(html, start, code, minText = MIN_TEXT) {
  const found = [];
  if (code && !html.includes(`<html lang="${code}"`)) found.push(`it is not in ${code}`);
  if (/<style(?![^>]*\bnonce=)/.test(html)) found.push('it has a <style> without the nonce');
  if (html.includes('<gc-not-found-page')) found.push('it is the not-found page');
  const text = textOf(html);
  if (text.length < minText) found.push(`it has only ${text.length} characters of text`);
  if (!/<meta http-equiv="Content-Security-Policy"/.test(html)) found.push("it has lost the build's policy <meta>");
  const known = new Set(inlineScripts(start));
  if (inlineScripts(html).some((body) => !known.has(body)))
    found.push('it has an inline script the policy does not know');
  if (!html.includes(NONCE_PLACEHOLDER)) found.push('it has no nonce placeholder, so its styles would be blocked');
  return found;
}

/**
 * In a worker: renders its pages one after another, writes the good ones, and
 * reports each page's size or its problems.
 */
async function renderAll({ jobs, start, faces }) {
  const { default: bootstrap, renderApplication, READ_I18N_FILE } = await import(pathToFileURL(BUNDLE).href);
  // The translations and guides, read from the built files the server also sends.
  const readFileUnder = async (file) => {
    try {
      return await readFile(path.join(BROWSER, 'i18n', ...file.split('/')), 'utf8');
    } catch {
      return null;
    }
  };
  // An error in a render is logged by Angular, not thrown.
  let logged = [];
  console.error = (...args) => void logged.push(args.map(String).join(' ').split('\n')[0]);

  const results = [];
  for (const { code, page, url } of jobs) {
    logged = [];
    try {
      const rendered = await renderApplication(bootstrap, {
        document: start,
        url,
        platformProviders: [{ provide: READ_I18N_FILE, useValue: readFileUnder }]
      });
      const html = withFontPreloads(rendered, faces);
      const problems = [
        ...problemsWith(html, start, code),
        ...pageProblems(html, page, code),
        ...logged.map((line) => 'logged: ' + line)
      ];
      if (problems.length) {
        results.push({ url, problems });
        continue;
      }
      const file = pages.prerenderedFile(code, page);
      await mkdir(path.dirname(path.join(PRERENDERED, file)), { recursive: true });
      await writeFile(path.join(PRERENDERED, ...file.split('/')), html);
      results.push({ url, file, size: Buffer.byteLength(html) });
    } catch (error) {
      results.push({ url, problems: [error instanceof Error ? error.message : String(error)] });
    }
  }
  return results;
}

function buildBundle() {
  const ng = path.join(ROOT, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
  const result = spawnSync(process.execPath, [ng, 'build', '--configuration', 'prerender'], {
    cwd: ROOT,
    stdio: 'inherit'
  });
  if (result.status !== 0) throw new Error('The render bundle did not build.');
}

const inWorker = (data) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: data });
    worker.once('message', resolve);
    worker.once('error', reject);
  });

/**
 * Renders every page (or those in the given languages and pages); returns the
 * sizes by file. Throws, naming each page, if any has a problem.
 */
export async function prerender({ build = true, codes = languages.LIVE_LANGUAGES, only = pages.PUBLIC_PAGES } = {}) {
  const started = Date.now();
  if (build) buildBundle();
  if (!existsSync(BUNDLE)) throw new Error(`${BUNDLE} is missing.`);
  const indexHtml = await readFile(path.join(BROWSER, 'index.html'), 'utf8');
  const start = startDocument(indexHtml);
  const stylesheet = /<link rel="stylesheet" href="([^"]+)"/.exec(indexHtml)?.[1];
  const faces = stylesheet ? fontFaces(await readFile(path.join(BROWSER, stylesheet), 'utf8')) : [];
  if (!faces.length) throw new Error("The stylesheet's text fonts were not found.");
  await rm(PRERENDERED, { recursive: true, force: true });

  // The cone chart and the list of materials are rendered in the languages they are translated into
  // (REFERENCE_LANGUAGES), a material's page in English alone (lib/pages.js).
  const jobs = codes.flatMap((code) =>
    only
      .filter((page) => pages.prerenderLanguages(page, [code]).length)
      .map((page) => ({ code, page, url: urlFor(code, page) }))
  );
  // Dealt out in turn, so each worker has a mix of the long guides and the short pages.
  const count = Math.max(1, Math.min(WORKERS, os.availableParallelism(), jobs.length));
  const shares = Array.from({ length: count }, (_, n) => jobs.filter((_job, i) => i % count === n));
  const results = (await Promise.all(shares.map((share) => inWorker({ jobs: share, start, faces })))).flat();

  const failures = results
    .filter((result) => result.problems)
    .map((result) => `${result.url}: ${result.problems.join('; ')}`);
  if (failures.length) {
    const more = failures.length > SHOWN ? `\n  and ${failures.length - SHOWN} more` : '';
    throw new Error(
      `${failures.length} page(s) did not render:\n  ${failures.sort().slice(0, SHOWN).join('\n  ')}${more}`
    );
  }
  const sizes = new Map(results.map((result) => [result.file, result.size]));
  const largest = [...sizes].sort((a, b) => b[1] - a[1])[0];
  console.log(
    `Prerendered ${sizes.size} pages in ${((Date.now() - started) / 1000).toFixed(1)} s; ` +
      `the largest is ${largest[0]} at ${(largest[1] / 1024).toFixed(1)} kB.`
  );
  return sizes;
}

if (!isMainThread) {
  renderAll(workerData).then(
    (results) => parentPort.postMessage(results),
    (error) => {
      throw error;
    }
  );
} else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prerender({ build: !process.argv.includes('--no-build') }).then(
    () => process.exit(0),
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  );
}
