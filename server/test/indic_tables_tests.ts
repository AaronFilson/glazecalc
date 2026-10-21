import { readFileSync } from 'node:fs';
import path from 'node:path';
import { INDIC_SCRIPTS } from '../../scripts/i18n-check.mjs';
import languages from '../../lib/regions/languages.js';
import groups from '../../lib/regions/groups.js';
import { expect } from './support/app.ts';

// The tables that make a new Indian language one line each (scratch/round8/in-langs/plan.md): fonts and line
// heights in client/styles.scss, the groups of the pickers, and the Linux test image's fonts. A language added to
// the checks (INDIC_SCRIPTS) with no font stack or line height, or a pseudo-locale with no font to draw it, fails here.
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const styles = readFileSync(path.join(ROOT, 'client', 'styles.scss'), 'utf8');
const dockerfile = readFileSync(path.join(ROOT, 'scripts', 'test-e2e-linux.Dockerfile'), 'utf8');

/** The text of a SCSS map: from its `$name: (` to the closing `);`. */
const map = (name: string): string => {
  const start = styles.indexOf(name + ': (');
  expect(start, name).to.be.above(-1);
  return styles.slice(start, styles.indexOf('\n);', start));
};

/** The Noto Sans font each Unicode script is drawn in on Linux (fonts-noto-core's file names). */
const NOTO: Record<string, string> = {
  Deva: 'SansDevanagari',
  Beng: 'SansBengali',
  Taml: 'SansTamil',
  Telu: 'SansTelugu',
  Knda: 'SansKannada',
  Mlym: 'SansMalayalam',
  Gujr: 'SansGujarati',
  Guru: 'SansGurmukhi',
  Orya: 'SansOriya',
  Sinh: 'SansSinhala'
};

describe('the Indian languages’ font and line-height tables', () => {
  it('give every language the checks know a font stack, system fonts first and none served', () => {
    const fonts = map('$gc-script-fonts');
    for (const code of Object.keys(INDIC_SCRIPTS)) {
      const line = fonts.split('\n').find((l) => l.trim().startsWith(`'${code}':`));
      expect(line, code).to.be.a('string');
      // Windows' Nirmala UI covers all of them, then the Apple font, then Noto (Android and Linux), then the old Windows one.
      expect(line, code).to.match(/^\s*'[a-z]+': "'Nirmala UI', /);
      expect(line, code).to.include("'Noto Sans ");
    }
    // Only the app's serif subscripts and Urdu's Nastaliq are served: no Indian font file is named.
    const served = [...styles.matchAll(/url\('\.\/fonts\/([^']+)'\)/g)].map((match) => match[1]);
    expect(served).to.eql(['noto-serif-sub-wght-normal.woff2', 'noto-nastaliq-urdu-wght-normal.woff2']);
  });

  it('give every one a line height for its text and its headings, taller the more its marks reach', () => {
    const lines = map('$gc-tall-scripts');
    const heights: Record<string, [number, number]> = {};
    for (const code of Object.keys(INDIC_SCRIPTS)) {
      const found = new RegExp(`'${code}': ([\\d.]+) ([\\d.]+)`).exec(lines);
      expect(found, code).not.to.equal(null);
      heights[code] = [Number(found![1]), Number(found![2])];
      const [text, heading] = heights[code]!;
      expect(text, code).to.be.within(1.7, 1.9);
      expect(heading, code).to.be.within(1.4, 1.5);
      expect(heading, code).to.be.below(text);
    }
    // Hindi's are what they were; the scripts that stack letters below the line are the tallest.
    expect(heights.hi).to.eql([1.75, 1.45]);
    for (const tall of ['te', 'kn', 'or', 'si']) expect(heights[tall]![0], tall).to.be.at.least(heights.ta![0]);
    expect(heights.kn![0]).to.be.above(heights.hi![0]);
  });

  it('keep the groups of the pickers for every language, Odia too', () => {
    for (const code of Object.keys(INDIC_SCRIPTS)) expect(groups.languageGroup(code), code).to.equal('south-asia');
  });

  it('keep the fonts the pseudo-locales need in the Linux test image, and the others’ named for the waves to come', () => {
    for (const language of languages.LANGUAGES.filter((l: { pseudo?: boolean }) => l.pseudo)) {
      const script = INDIC_SCRIPTS[language.base ?? ''];
      if (!script) continue;
      const kept = new RegExp(`Noto\\(([^)]*)\\)`).exec(dockerfile)![1]!.split('|');
      expect(kept, language.code).to.include(NOTO[script]);
    }
    expect(dockerfile).to.include('Telugu');
  });
});
