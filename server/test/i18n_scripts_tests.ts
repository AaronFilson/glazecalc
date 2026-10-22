import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { INDIC_SCRIPTS, checkJoiners, checkNormalization, checkScripts } from '../../scripts/i18n-check.mjs';
import languages from '../../lib/regions/languages.js';
import { expect } from './support/app.ts';

const ZWJ = '\u200d';
const ZWNJ = '\u200c';

// The checks on the Indian languages' script, normalisation and joiners (scripts/i18n-check.mjs): Hindi's files
// pass them today, and Tamil, Marathi and Kannada are checked from their first file (wave I1).
describe('the Indian languages’ script checks', () => {
  let dir: string;
  let glossaries: string;
  const write = (file: string, messages: object) => writeFileSync(path.join(dir, file), JSON.stringify(messages));
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'scripts-'));
    glossaries = path.join(dir, 'glossaries');
    mkdirSync(glossaries);
    mkdirSync(path.join(dir, 'recipe'));
    mkdirSync(path.join(dir, 'guides', 'firing'), { recursive: true });
    write('en.json', { material: 'Feldspar', fire: 'Fire to 1222 °C.' });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('knows every language of the waves, each in one Unicode script', () => {
    expect(INDIC_SCRIPTS).to.include({ hi: 'Deva', mr: 'Deva', ne: 'Deva', ta: 'Taml', kn: 'Knda', si: 'Sinh' });
    for (const code of ['ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'ne', 'si']) {
      expect(INDIC_SCRIPTS[code], code).to.match(/^[A-Z][a-z]{3}$/);
    }
    // The script names are ones the regular expressions know, and each language's letters are in its own.
    const samples: Record<string, string> = {
      ta: 'தமிழ்',
      kn: 'ಕನ್ನಡ',
      mr: 'मराठी',
      te: 'తెలుగు',
      gu: 'ગુજરાતી',
      ml: 'മലയാളം',
      pa: 'ਪੰਜਾਬੀ',
      or: 'ଓଡ଼ିଆ',
      ne: 'नेपाली',
      si: 'සිංහල'
    };
    for (const [code, name] of Object.entries(samples)) {
      expect(new RegExp(`^[\\p{scx=${INDIC_SCRIPTS[code]}}]+$`, 'u').test(name.normalize('NFC')), code).to.equal(true);
      // And it is the name the language menu shows, once one is known.
      const known = languages.languageFor(code);
      if (known) expect(known.name.normalize('NFC'), code).to.equal(name.normalize('NFC'));
    }
  });

  describe('checkScripts', () => {
    it('passes letters of the language’s script and Latin units, formulas and names', () => {
      write('ta.json', { material: 'ஃபெல்ட்ஸ்பார்', fire: '1222 °C வரை சுடவும். SiO₂ (K2O), Orton, µm.' });
      write('kn.json', { material: 'ಫೆಲ್ಡ್ಸ್ಪಾರ್', fire: '1222 °C ವರೆಗೆ ಸುಡಿ. Ferro 3134.' });
      write('hi.json', { fire: '1222 °C तक पकाएँ। सिलिका' });
      expect(checkScripts({ dir, glossaries })).to.eql([]);
    });

    it('finds the letters of another script: Bengali in Odia, Devanagari in Gurmukhi, Hindi pasted into Tamil', () => {
      write('or.json', { material: 'ফেল্ডস্পার', fire: '1222 °C ପର୍ଯ୍ୟନ୍ତ' });
      write('pa.json', { material: 'फ़ेल्डस्पार' });
      write('recipe/ta.json', { save: { name: 'ஃபெல்ட்ஸ்பார் सहेजें' } });
      writeFileSync(path.join(dir, 'guides', 'firing', 'en.md'), '# Firing\n');
      writeFileSync(path.join(dir, 'guides', 'firing', 'kn.md'), '# ಸುಡುವುದು\n\nಕೋನ್ कोन ಬಾಗುತ್ತದೆ.\n');
      expect(checkScripts({ dir, glossaries })).to.eql([
        'app or material: or is written in Orya and Latin, not letters such as ফেল্ডস্পার (or give them in its glossary)',
        'app pa material: pa is written in Guru and Latin, not letters such as फ़ेल्डस्पार (or give them in its glossary)',
        'recipe ta save.name: ta is written in Taml and Latin, not letters such as सहेजें (or give them in its glossary)',
        'guides/firing/kn.md: kn is written in Knda and Latin, not letters such as कोन (or give them in its glossary)'
      ]);
    });

    it('lets through a name the English gives in another script, and a run its glossary gives', () => {
      write('en.json', { poison: 'Call 응급의료상담 (119).', material: 'Feldspar' });
      write('ta.json', { poison: '119 அழைக்கவும்: 응급의료상담', material: 'ஃபெல்ட்ஸ்பார் (ਪੰਜਾਬੀ)' });
      writeFileSync(path.join(glossaries, 'ta.md'), '| Punjabi | ਪੰਜਾਬੀ |\n');
      expect(checkScripts({ dir, glossaries })).to.eql([]);
      writeFileSync(path.join(glossaries, 'ta.md'), 'nothing\n');
      expect(checkScripts({ dir, glossaries })).to.eql([
        'app ta material: ta is written in Taml and Latin, not letters such as ਪੰਜਾਬੀ (or give them in its glossary)'
      ]);
    });

    it('takes the danda, the nukta and the joiners as the script’s own, and leaves other languages alone', () => {
      write('hi.json', { fire: 'ज़्यादा पकाएँ। ।' });
      write('mr.json', { fire: 'क्\u200dष' });
      write('ko.json', { material: '장석(長石)' });
      write('ja.json', { material: '長石' });
      write('ar.json', { material: 'فلدسبار' });
      expect(checkScripts({ dir, glossaries })).to.eql([]);
    });

    it('is clean for the languages as they are offered', () => {
      expect(checkScripts()).to.eql([]);
    });
  });

  describe('checkNormalization', () => {
    it('passes text in NFC, nukta letters written as letter and nukta', () => {
      write('pa.json', { material: 'ਸ਼ਾਮ'.normalize('NFC'), fire: 'ਖ਼ਾਕ'.normalize('NFC') });
      write('hi.json', { material: 'ज़रूरी'.normalize('NFC') });
      write('fr.json', { material: 'Matière' });
      expect(checkNormalization(dir)).to.eql([]);
    });

    it('finds a precomposed nukta letter or a decomposed accent, in a message or a guide', () => {
      write('pa.json', { material: 'ਸ਼ਾਮ'.normalize('NFC'), fire: '\u0a36ਾਮ ਰਾਤ' });
      write('hi.json', { material: '\u095c' });
      write('vi.json', { material: 'Tie\u0302\u0301ng' });
      writeFileSync(path.join(dir, 'guides', 'firing', 'en.md'), '# Firing\n');
      writeFileSync(path.join(dir, 'guides', 'firing', 'or.md'), '# \u0b5c\n');
      const problems = checkNormalization(dir);
      expect(problems.sort()).to.eql([
        'app hi material: not in Unicode normalisation form NFC, as \u095c (U+095C)',
        'app pa fire: not in Unicode normalisation form NFC, as \u0a36ਾਮ (U+0A36 U+0A3E U+0A2E)',
        'app vi material: not in Unicode normalisation form NFC, as Tie\u0302\u0301ng (U+0054 U+0069 U+0065 U+0302 U+0301 U+006E U+0067)',
        'guides/firing/or.md: not in Unicode normalisation form NFC, as \u0b5c (U+0B5C)'
      ]);
    });

    it('is clean for the languages as they are offered', () => {
      expect(checkNormalization()).to.eql([]);
    });
  });

  describe('checkJoiners', () => {
    it('passes Malayalam’s ZWNJ after a virama, Sinhala’s ZWJ after a virama, Bengali’s ra-ZWJ-virama, and text with none', () => {
      write('ml.json', { material: 'ഒക്\u200cടോബർ ൻ ൽ' });
      write('si.json', { material: 'ශ්\u200dරී' });
      write('hi.json', { material: 'सिलिका' });
      // Bengali writes ra with ya-phala as ra, ZWJ, virama, ya (the word for ramp); Urdu is not Indian: left alone.
      write('bn.json', { material: 'র' + ZWJ + '্যাম্প', fire: 'র' + ZWJ + '্যাব' });
      write('ur.json', { material: 'می\u200cخانہ' });
      expect(checkJoiners(dir)).to.eql([]);
    });

    it('finds a stray joiner, and the ones Malayalam, Sinhala and Bengali do not take', () => {
      write('ml.json', { material: 'ന\u200d്\u200dന', fire: 'ക' + ZWNJ + 'ക' });
      write('si.json', { material: 'ශ' + ZWNJ + 'රී', fire: 'ස' + ZWJ + 'ස' });
      write('hi.json', { material: 'क्' + ZWJ + 'ष' });
      write('ta.json', { material: 'க' + ZWNJ + 'க' });
      // Bengali's ZWJ after the virama, after another letter, or with no virama after it, and any ZWNJ.
      write('bn.json', {
        material: 'র্' + ZWJ + 'য',
        fire: 'ক' + ZWJ + '্য',
        note: 'র' + ZWJ + 'য',
        list: 'ক' + ZWNJ + 'ক'
      });
      writeFileSync(path.join(dir, 'guides', 'firing', 'en.md'), '# Firing\n');
      writeFileSync(path.join(dir, 'guides', 'firing', 'kn.md'), '# ಸು' + ZWJ + 'ಡು\n');
      expect(checkJoiners(dir)).to.eql([
        'app bn material: a stray ZWJ (U+200D) (1); bn takes a ZWJ only between র and the virama (র + ZWJ + ্ + য) and no ZWNJ',
        'app bn fire: a stray ZWJ (U+200D) (1); bn takes a ZWJ only between র and the virama (র + ZWJ + ্ + য) and no ZWNJ',
        'app bn note: a stray ZWJ (U+200D) (1); bn takes a ZWJ only between র and the virama (র + ZWJ + ্ + য) and no ZWNJ',
        'app bn list: a stray ZWNJ (U+200C) (1); bn takes a ZWJ only between র and the virama (র + ZWJ + ্ + য) and no ZWNJ',
        'app hi material: a stray ZWJ (U+200D) (1); hi takes none',
        'app ml material: a stray ZWJ (U+200D) (2); ml takes a ZWNJ only after a virama and no ZWJ, for its chillu letters are single characters',
        'app ml fire: a stray ZWNJ (U+200C) (1); ml takes a ZWNJ only after a virama and no ZWJ, for its chillu letters are single characters',
        'app si material: a stray ZWNJ (U+200C) (1); si takes a ZWJ only after a virama and no ZWNJ',
        'app si fire: a stray ZWJ (U+200D) (1); si takes a ZWJ only after a virama and no ZWNJ',
        'app ta material: a stray ZWNJ (U+200C) (1); ta takes none',
        'guides/firing/kn.md: a stray ZWJ (U+200D) (1); kn takes none'
      ]);
    });

    it('is clean for the languages as they are offered', () => {
      expect(checkJoiners()).to.eql([]);
    });
  });
});
