import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inlineScripts, problemsWith, startDocument, textOf, urlFor } from '../../scripts/prerender.mjs';
import { loadPrerendered } from '../lib/prerendered.ts';
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

describe('prerendered files', () => {
  it('are read by their path from the folder, with slashes, and ignore other files', async () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'prerendered-'));
    try {
      fs.mkdirSync(path.join(folder, 'de', 'guides'), { recursive: true });
      fs.writeFileSync(path.join(folder, 'de', 'index.html'), 'home');
      fs.writeFileSync(path.join(folder, 'de', 'guides', 'firing.html'), 'firing');
      fs.writeFileSync(path.join(folder, 'de', 'notes.txt'), 'no');
      const pages = await loadPrerendered(folder);
      expect([...pages.keys()].sort()).to.eql(['de/guides/firing.html', 'de/index.html']);
      expect(pages.get('de/guides/firing.html')).to.equal('firing');
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  it('are none where the folder is missing', async () => {
    expect((await loadPrerendered(path.join(os.tmpdir(), 'no-such-prerendered-folder'))).size).to.equal(0);
  });
});
