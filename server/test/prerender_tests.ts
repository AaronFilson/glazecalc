import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  fontFaces,
  fontPreloads,
  inlineScripts,
  MAX_GZIPPED,
  pageProblems,
  problemsWith,
  startDocument,
  textOf,
  urlFor,
  withFontPreloads
} from '../../scripts/prerender.mjs';
import pages from '../../lib/pages.js';
import { adviceFiles, adviceKeys } from '../../scripts/advice-i18n.mjs';
import { readPrerendered } from '../lib/prerendered.ts';
import { expect } from './support/app.ts';

// The build's prerender (scripts/prerender.mjs) fails on a page that is not
// right; these are its checks, and the server's reading of the files it writes.
const INDEX = `<!doctype html><html lang="en"><head>
<meta http-equiv="Content-Security-Policy" content="script-src 'sha256-abc'">
<script>window.theme = 1;</script></head><body><gc-root></gc-root></body></html>`;
const START = startDocument(INDEX);
const WORDS = 'Firing a glaze in a small electric kiln, step by step. '.repeat(10);
const page = (body: string, extra = '') =>
  START.replace('</gc-root>', body + '</gc-root>').replace(
    '</head>',
    `<style nonce="__GC_NONCE__">a{}</style>${extra}</head>`
  );

describe('prerender checks', () => {
  it('gives the render a root the server can rewrite, and addresses by language', () => {
    expect(START).to.include('<gc-root ngCspNonce="__GC_NONCE__">');
    expect(() => startDocument('<html></html>')).to.throw('<gc-root>');
    expect(urlFor('en', '/')).to.equal('/');
    expect(urlFor('de', '/')).to.equal('/de/');
    expect(urlFor('de', '/guides/firing')).to.equal('/de/guides/firing');
  });

  it('fails the advice page without all the standard advice, and any page too large', () => {
    const advice = (count: number) =>
      page(`<ul class="general-advice">${'<li><h3>Tip</h3><p>Words</p></li>'.repeat(count)}</ul>`);
    expect(pageProblems(advice(8), '/advice')).to.eql([]);
    expect(pageProblems(advice(0), '/advice')).to.eql(['it shows 0 of the 8 pieces of standard advice']);
    // Other pages have no such list.
    expect(pageProblems(advice(0), '/guides')).to.eql([]);
    // Random text, which compresses as little as any: a page that carries more than it shows.
    const large = page(`<p>${crypto.randomBytes(MAX_GZIPPED).toString('base64')}</p>`);
    expect(pageProblems(large, '/guides')).to.eql(['it is over 100 kB gzipped']);
  });

  it('fails a guide that does not link every other guide, so a search engine can follow them', () => {
    const guides = pages.PUBLIC_PAGES.filter((p) => p.startsWith('/guides/'));
    const links = (list: string[]) => page(list.map((p) => `<a href="${p}">x</a>`).join(''));
    const [first, ...others] = guides;
    expect(pageProblems(links(others), first!)).to.eql([]);
    // In another language the links carry its prefix.
    expect(pageProblems(links(others.map((p) => '/de' + p)), first!)).to.eql([]);
    expect(pageProblems(links(others.slice(1)), first!)).to.eql([`it does not link the guide ${others[0]}`]);
    // Text that only names the address is no link; the list of the guides is not a guide.
    expect(pageProblems(page(`<p>${others[0]}"</p>`), first!)).to.have.length(others.length);
    expect(pageProblems(links([]), '/guides')).to.eql([]);
  });

  it('accepts a page with its text, the policy <meta> and the placeholder', () => {
    const html = page(`<h1>Firing</h1><p>${WORDS}</p>`, '<script id="ng-state" type="application/json">{}</script>');
    expect(problemsWith(html, START)).to.eql([]);
  });

  it('fails the not-found page, a page with little text and a lost policy', () => {
    expect(problemsWith(page(`<gc-not-found-page><p>${WORDS}</p></gc-not-found-page>`), START)).to.eql([
      'it is the not-found page'
    ]);
    expect(problemsWith(page('<p>Short</p>'), START).join()).to.include('it has only 5 characters of text');
    expect(problemsWith(page(`<p>${WORDS}</p>`).replace('http-equiv="Content-Security-Policy"', ''), START)).to.eql([
      "it has lost the build's policy <meta>"
    ]);
  });

  it('fails an inline script the policy does not know, and a page without the nonce placeholder', () => {
    expect(problemsWith(page(`<p>${WORDS}</p>`, '<script>alert(1)</script>'), START)).to.eql([
      'it has an inline script the policy does not know'
    ]);
    expect(problemsWith(page(`<p>${WORDS}</p>`).replaceAll('__GC_NONCE__', 'x'), START).join()).to.include('no nonce');
  });

  it('fails a page in the wrong language and a style without the nonce', () => {
    const html = page(`<p>${WORDS}</p>`);
    expect(problemsWith(html, START, 'en')).to.eql([]);
    expect(problemsWith(html, START, 'de')).to.eql(['it is not in de']);
    expect(problemsWith(html.replace('</head>', '<style>a{}</style></head>'), START)).to.eql([
      'it has a <style> without the nonce'
    ]);
  });

  it('counts only the text in the root, not its scripts and styles', () => {
    const html = page('<p>One</p><style>.x{}</style><script>var two;</script><p>three</p>');
    expect(textOf(html)).to.equal('One three');
    expect(inlineScripts(html)).to.eql(['window.theme = 1;', 'var two;']);
  });
});

describe('font preloads', () => {
  // As the build writes the stylesheet: Lora's files by script, Noto Serif's for what Lora lacks.
  const CSS = [
    '@font-face{font-family:Lora Variable;font-style:normal;src:url("./media/lora-cyrillic-1.woff2") format("woff2");unicode-range:U+0400-045F}',
    '@font-face{font-family:Lora Variable;font-style:normal;src:url("./media/lora-latin-ext-2.woff2") format("woff2");unicode-range:U+0100-02BA}',
    '@font-face{font-family:Lora Variable;font-style:normal;src:url("./media/lora-latin-3.woff2") format("woff2");unicode-range:U+0000-00FF,U+2000-206F}',
    '@font-face{font-family:Lora Variable;font-style:italic;src:url("./media/lora-latin-italic-4.woff2") format("woff2");unicode-range:U+0000-00FF}',
    "@font-face{font-family:'Noto Serif Sub';font-style:normal;src:url('./media/noto-math-5.woff2') format('woff2');unicode-range:U+2070-2071,U+2074-208E}",
    '@font-face{font-family:Bootstrap Icons;src:url("./media/icons-6.woff2")}'
  ].join('');
  const FACES = fontFaces(CSS);
  const files = (html: string) => [...fontPreloads(html, FACES).matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

  it('reads the upright faces of the text fonts, with their files and ranges', () => {
    expect(FACES.map((face) => face.url)).to.eql([
      'media/lora-cyrillic-1.woff2',
      'media/lora-latin-ext-2.woff2',
      'media/lora-latin-3.woff2',
      'media/noto-math-5.woff2'
    ]);
    expect(FACES[2]!.ranges).to.eql([
      [0, 255],
      [0x2000, 0x206f]
    ]);
  });

  it('preloads the files the opening of the page is set in, and not the footer', () => {
    expect(files(page('<h1>Brennen</h1><p>Kegel im Ofen</p>'))).to.eql(['media/lora-latin-3.woff2']);
    expect(files(page('<h1>Пещ</h1><p>Конуси: SiO₂</p>'))).to.eql([
      'media/lora-cyrillic-1.woff2',
      'media/lora-latin-3.woff2',
      'media/noto-math-5.woff2'
    ]);
    expect(files(page('<p>Kegel</p><footer><a lang="bg">Български</a><a lang="cs">Čeština</a></footer>'))).to.eql([
      'media/lora-latin-3.woff2'
    ]);
    // Japanese is set in the device's own font (client/styles.scss): only its Latin, spaces and signs need a file.
    expect(files(page('<h1>基本の窯焚き</h1><p>ゼーゲル式</p>'))).to.eql(['media/lora-latin-3.woff2']);
    expect(files(page('<h1>Glazecalc の釉薬</h1><p>SiO₂ と Al₂O₃</p>'))).to.eql([
      'media/lora-latin-3.woff2',
      'media/noto-math-5.woff2'
    ]);
    // A sign far down the page loads when it is drawn.
    expect(files(page(`<p>${'Kegel '.repeat(400)} SiO₂</p>`))).to.eql(['media/lora-latin-3.woff2']);
  });

  it('puts the preloads ahead of the stylesheet, as fonts fetched without credentials', () => {
    const html = page('<p>Kegel</p>').replace('</head>', '<link rel="stylesheet" href="styles.css"></head>');
    expect(withFontPreloads(html, FACES)).to.include(
      '<link rel="preload" href="media/lora-latin-3.woff2" as="font" type="font/woff2" crossorigin="anonymous"><link rel="stylesheet"'
    );
  });
});

describe('prerendered files', () => {
  it('are read by their path from the folder, with slashes, each time', async () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'prerendered-'));
    try {
      fs.mkdirSync(path.join(folder, 'de', 'guides'), { recursive: true });
      fs.writeFileSync(path.join(folder, 'de', 'index.html'), 'home');
      fs.writeFileSync(path.join(folder, 'de', 'guides', 'firing.html'), 'Brennen – ελληνικά');
      expect(await readPrerendered(folder, 'de/index.html')).to.equal('home');
      expect(await readPrerendered(folder, 'de/guides/firing.html')).to.equal('Brennen – ελληνικά');
      expect(await readPrerendered(folder, 'de/guides/glazes.html')).to.equal(undefined);
      // A new build's file is sent from the next reply on: nothing is kept.
      fs.writeFileSync(path.join(folder, 'de', 'index.html'), 'home, rebuilt');
      expect(await readPrerendered(folder, 'de/index.html')).to.equal('home, rebuilt');
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  it('are none where the folder is missing', async () => {
    expect(await readPrerendered(path.join(os.tmpdir(), 'no-such-prerendered-folder'), 'de/index.html')).to.equal(
      undefined
    );
  });
});

describe("the advice page's translations (scripts/advice-i18n.mjs)", () => {
  it("are the standard advice's words from each language's records, and no others", () => {
    const keys = adviceKeys();
    // A title, a text and a list of tags for each of the 8.
    expect(keys.size).to.equal(24);
    const files = adviceFiles();
    const records = path.join(import.meta.dirname, '..', '..', 'client', 'public', 'i18n', 'records');
    expect(Object.keys(files).sort()).to.eql(fs.readdirSync(records).sort());
    const english = JSON.parse(files['en.json']!) as Record<string, string>;
    expect(Object.keys(english).sort()).to.eql([...keys].sort());
    expect(Object.values(english)).to.include('Have a system');
    for (const [name, text] of Object.entries(files)) {
      const all = JSON.parse(fs.readFileSync(path.join(records, name), 'utf8')) as Record<string, string>;
      for (const [key, value] of Object.entries(JSON.parse(text) as Record<string, string>)) {
        expect(keys.has(key), `${name} ${key}`).to.equal(true);
        expect(value, `${name} ${key}`).to.equal(all[key]);
      }
    }
  });
});
