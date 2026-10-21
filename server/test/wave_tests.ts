import { createRequire } from 'node:module';
import path from 'node:path';
import { tmpdir } from 'node:os';
import languages from '../../lib/regions/languages.js';
import { expect } from './support/app.ts';

// The translation process's list of languages (docs/translations/process/wave.js): each language of India's
// first wave has what the prompt makers need, as Hindi's entry does.
process.env.GLAZECALC_SCRATCH ??= path.join(tmpdir(), 'wave-tests');
const require = createRequire(import.meta.url);
const wave = require('../../docs/translations/process/wave.js');

describe('the translation process’s languages', () => {
  const codes = ['hi', 'ta', 'mr', 'kn'];

  it('lists India’s first wave, each for India and with the research lines Hindi has', () => {
    for (const code of codes) {
      const entry = wave.LANGUAGES[code];
      expect(entry, code).to.be.an('object');
      expect(entry.region, code).to.equal('IN');
      for (const field of ['language', 'country', 'shops', 'termbank', 'kilns', 'law', 'terms']) {
        expect(entry[field], code + ' ' + field)
          .to.be.a('string')
          .with.length.above(0);
      }
      for (const kind of ['glossary', 'translate', 'review', 'backtranslate']) {
        expect(entry.notes[kind], code + ' ' + kind)
          .to.be.an('array')
          .with.length.above(0);
      }
      // A language of the app's, not offered yet but known.
      expect(languages.languageFor(code), code).to.be.an('object');
    }
  });

  it('gives each the owner’s rules: loanwords first, the full stop, 0 to 9, 24-hour times, and no lakh words', () => {
    for (const code of ['ta', 'mr', 'kn']) {
      const { notes } = wave.LANGUAGES[code];
      const all = (kind: string) => notes[kind].join('\n');
      expect(all('glossary'), code).to.match(/English loanwords first/);
      expect(all('glossary'), code).to.match(/digits 0 to 9/);
      expect(all('glossary'), code).to.match(/24-hour clock/);
      expect(all('translate'), code).to.match(/Latin full stop "\."/);
      expect(all('review'), code).to.match(/Latin full stop "\."/);
      expect(all('translate'), code).to.include(`docs/translations/${code}.md`);
    }
    // Kannada's `one` covers 0, as Hindi's does; Tamil's and Marathi's do not.
    expect(wave.LANGUAGES.kn.notes.glossary.join('\n')).to.match(/covers 0 as well as 1/);
    expect(wave.LANGUAGES.kn.notes.glossary.join('\n')).to.match(/an `=1` form/);
    expect(wave.LANGUAGES.ta.notes.glossary.join('\n')).to.match(/0 is `other`/);
    expect(wave.LANGUAGES.mr.notes.glossary.join('\n')).to.match(/0 is `other`/);
    // Marathi's terms are never copied from Hindi's sheet.
    expect(wave.LANGUAGES.mr.terms).to.match(/never copied from docs\/translations\/hi\.md/);
  });

  it('fills every prompt with no placeholder left, for each language', () => {
    for (const code of codes) {
      const l = wave.LANGUAGES[code];
      const text = wave.fill('glossary-prompt.md', {
        LANGUAGE: l.language,
        CODE: code,
        COUNTRY: l.country,
        REGION: l.region,
        SHOPS: l.shops,
        TERMBANK: l.termbank,
        ...wave.sources(code),
        NOTES: wave.notes(code, 'glossary')
      });
      expect(text, code).to.include(l.language);
      expect(text, code).not.to.match(/\{[A-Z_]{3,}\}/);
      expect(text, code).to.include('For ' + l.language + ' in particular');
    }
  });

  it('leaves Hindi’s own notes as they were', () => {
    expect(wave.LANGUAGES.hi.notes.translate[2]).to.match(/never the danda/);
    expect(wave.LANGUAGES.hi.notes.glossary).to.have.length(14);
  });
});
