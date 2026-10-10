import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  checkGuides,
  checkTranslations,
  compareKeys,
  compareMessage,
  compareSegment,
  messageFiles,
  numbersIn
} from '../../scripts/i18n-check.mjs';
import { updateTranslations } from '../../scripts/i18n-fingerprints.mjs';
import { expect } from './support/app.ts';

// The checks CI runs on the app's messages (scripts/i18n-check.mjs): what a
// translation may not lose or change, whoever wrote it.
describe('message checks', () => {
  const english = '{count, plural, one {# material} other {# materials}} in <b>{name}</b>';

  it('passes a translation that keeps the placeholders and tags and has its language’s plural forms', () => {
    const polish =
      '{count, plural, one {# surowiec} few {# surowce} many {# surowców} other {# surowca}} w <b>{name}</b>';
    expect(compareMessage('pl', 'k', english, polish)).to.eql([]);
  });

  it('finds a placeholder or tag lost or renamed', () => {
    const problems = compareMessage(
      'de',
      'k',
      english,
      '{count, plural, one {# Rohstoff} other {# Rohstoffe}} in {nom}'
    );
    expect(problems).to.eql([
      'k: placeholders count, nom, but the English has count, name',
      'k: tags none, but the English has b'
    ]);
  });

  it('finds plural forms the language needs but lacks, and ones it does not have', () => {
    // Polish needs few and many; German has no few.
    expect(compareMessage('pl', 'k', english, '{count, plural, one {#} other {#}} w <b>{name}</b>')).to.eql([
      'k: pl needs the plural forms few, many for {count}'
    ]);
    expect(compareMessage('de', 'k', english, '{count, plural, one {#} few {#} other {#}} in <b>{name}</b>')).to.eql([
      'k: de has no plural form few for {count}'
    ]);
    // Exact numbers (=0) are always allowed.
    expect(compareMessage('de', 'k', english, '{count, plural, =0 {keine} one {#} other {#}} in <b>{name}</b>')).to.eql(
      []
    );
  });

  it('lets a translation give the English for a key term, where gc-rich draws the message', () => {
    expect(compareMessage('de', 'k', 'The <b>frit</b> melts.', 'Die <b>Fritte</b><en>frit</en> schmilzt.')).to.eql([]);
    // A message with no tags is drawn as plain text, as are the messages kept in code.
    expect(compareMessage('de', 'k', 'The frit melts.', 'Die Fritte<en>frit</en> schmilzt.')).to.eql([
      'k: tags en, but the English has none'
    ]);
    expect(
      compareMessage('de', 'k', 'The <b>frit</b> melts.', 'Die <b>Fritte</b><en>frit</en> schmilzt.', { rich: false })
    ).to.eql(['k: tags b, en, but the English has b']);
  });

  it('reads numbers as each language writes them, with their units', () => {
    expect(numbersIn('Fire to 1,222 °C at 1.5% for cone 06, then 6.', 'en')).to.eql(['06', '1.5 %', '1222 °C', '6']);
    expect(numbersIn('Bei 1.222 °C mit 1,5 % für Kegel 06, dann 6.', 'de')).to.eql(['06', '1.5 %', '1222 °C', '6']);
    expect(numbersIn('À 1\u202f222 °C avec 1,5 %.', 'fr')).to.eql(['1.5 %', '1222 °C']);
    // Irish and Maltese write 1,222 and 1.5 as English does; 1.000 is one, to three places.
    expect(numbersIn('Ag 1,222 °C le 1.5 % agus 1.000 RO.', 'ga')).to.eql(['1.000', '1.5 %', '1222 °C']);
    expect(numbersIn('0.025 mg/m³', 'mt')).to.eql(numbersIn('0.025 mg/m³', 'en'));
    // A temperature is the same with its degree sign or without it.
    expect(numbersIn('1742 F (950 C), 40° F', 'en')).to.eql(numbersIn('1742 °F (950 °C), 40 °F', 'de'));
    // A clock time's hour with or without its leading zero; cone 06 keeps its.
    expect(numbersIn('08:30 to midnight, cone 06', 'en')).to.eql(numbersIn('de 8 h 30 à minuit, cône 06', 'fr'));
    // Times on the 24-hour clock, as most languages write them.
    expect(numbersIn('8am to 8pm', 'en')).to.eql(numbersIn('von 8 bis 20 Uhr', 'de'));
    // A dot before one or two digits is a decimal point in any language, as in a product's code;
    // before three, German reads it as thousands, so 1.250 is not the English's 1.250.
    expect(numbersIn('Keramikos 10.05, 1.5 g', 'de')).to.eql(['1.5 g', '10.05']);
    expect(numbersIn('1.250', 'de')).to.eql(['1250']);
  });

  it('finds a changed number, unit or link in a translated message', () => {
    const english = 'Fire to cone 6 ({temp}), 2232 °F, as <link>Orton</link> says: https://www.ortonceramic.com/';
    const right = 'Auf Kegel 6 brennen ({temp}), 2232 °F, wie <link>Orton</link> sagt: https://www.ortonceramic.com/';
    expect(compareMessage('de', 'k', english, right)).to.eql([]);
    expect(compareMessage('de', 'k', english, right.replace('Kegel 6', 'Kegel 06').replace('°F', '°C'))).to.eql([
      'k: its numbers differ from the English; missing 2232 °F, 6; not in the English 06, 2232 °C'
    ]);
    expect(compareMessage('de', 'k', english, right.replace('ortonceramic.com/', 'orton.de/'))).to.eql([
      'k: its links differ from the English: https://www.orton.de/'
    ]);
    // The plural forms' own numbers, =0, are not text.
    expect(
      compareMessage(
        'pl',
        'k',
        '{n, plural, =0 {none} one {# cone} other {# cones}}',
        '{n, plural, =0 {brak} one {# stożek} few {# stożki} many {# stożków} other {# stożka}}'
      )
    ).to.eql([]);
  });

  it('finds a section of a translated guide whose structure or figures differ', () => {
    const english = [
      '## Cones {#cones}',
      '',
      'Table: Ranges at {{108 °F/h; 60 °C/h}}',
      '',
      '| Cone | Use |',
      '| ---- | --- |',
      '| 06   | Low |',
      '',
      '1. Set 3 cones, see [Orton](https://www.ortonceramic.com/).',
      '2. Fire.',
      '',
      '> [!WARNING]',
      '> Hot.'
    ].join('\n');
    const german = english
      .replace('Ranges at', 'Bereiche bei')
      .replace('| Cone | Use |', '| Kegel | Zweck |')
      .replace('Low |', 'Niedrig |')
      .replace('Set 3 cones, see', '3 Kegel aufstellen, siehe')
      .replace('Fire.', 'Brennen.')
      .replace('Hot.', 'Heiß.');
    expect(compareSegment('cones', 'de', english, german)).to.eql([]);
    expect(compareSegment('cones', 'de', english, german.replace('2. Brennen.', '   Brennen.'))).to.eql([
      'cones: its structure differs from the English: ol 1 where it has ol 2',
      // The list's own numbers are the English's too.
      'cones: its numbers differ from the English; missing 2'
    ]);
    expect(compareSegment('cones', 'de', english, german.replace('> [!WARNING]', '> [!NOTE]'))).to.eql([
      'cones: its structure differs from the English: quoteNOTE where it has quoteWARNING'
    ]);
    expect(compareSegment('cones', 'de', english, german.replace('3 Kegel', 'drei Kegel'))).to.eql([
      'cones: its numbers differ from the English; missing 3'
    ]);
  });

  it('finds a translated guide that lost a section id, a temperature, or a part for one way of firing', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'guides-'));
    try {
      mkdirSync(path.join(dir, 'firing'));
      const english = [
        '## Cones {#cones}',
        '',
        'At {{2232 °F; 1222 °C}}.',
        '',
        ':::orton',
        '',
        'Cones.',
        '',
        ':::',
        ''
      ].join('\n');
      writeFileSync(path.join(dir, 'firing', 'en.md'), english);
      writeFileSync(path.join(dir, 'firing', 'de.md'), english.replace('Cones.', 'Kegel.').replace('At', 'Bei'));
      expect(checkGuides(dir)).to.eql([]);
      writeFileSync(
        path.join(dir, 'firing', 'fr.md'),
        ['## Cônes {#cones-fr}', '', 'À {{2232 °F; 1220 °C}}.', '', 'Cônes{{en: cones}}.', ''].join('\n')
      );
      expect(checkGuides(dir)).to.eql([
        'guides/firing/fr.md: its section ids differ from the English; missing {#cones}; not in the English {#cones-fr}',
        'guides/firing/fr.md: its temperatures and densities ({{...}}) differ from the English; missing {{2232 °F; 1222 °C}}; not in the English {{2232 °F; 1220 °C}}',
        'guides/firing/fr.md: its cone, temperature and who-to-call marks differ from the English; missing :::, :::orton'
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('finds a broken message, and Romanian written with the cedilla', () => {
    expect(compareMessage('fr', 'k', 'Saved {name}.', 'Enregistré {name.')[0]).to.match(/^k: not a valid ICU message/);
    expect(compareMessage('ro', 'k', 'Saved.', 'Salvaţi.')).to.eql([
      'k: Romanian takes ș and ț (comma below), not ş and ţ (cedilla)'
    ]);
    expect(compareMessage('ro', 'k', 'Saved.', 'Salvați.')).to.eql([]);
  });

  describe('keeping translations in step with their English', () => {
    let dir: string;
    let prints: string;
    const read = (file: string) => readFileSync(path.join(dir, file), 'utf8');
    const guide = (cones: string, sitter: string) =>
      [
        '---',
        'title: Firing',
        '---',
        '',
        'Intro.',
        '',
        ':::orton',
        '',
        '## Cones {#cones}',
        '',
        cones,
        '',
        ':::',
        '',
        '## Sitter {#sitter}',
        '',
        sitter,
        ''
      ].join('\n');
    beforeEach(() => {
      dir = mkdtempSync(path.join(tmpdir(), 'i18n-'));
      prints = mkdtempSync(path.join(tmpdir(), 'prints-'));
      mkdirSync(path.join(dir, 'guides', 'firing'), { recursive: true });
      mkdirSync(path.join(dir, 'records'));
      writeFileSync(path.join(dir, 'en.json'), JSON.stringify({ nav: { menu: 'Menu', help: 'Help' } }));
      writeFileSync(path.join(dir, 'de.json'), JSON.stringify({ nav: { menu: 'Menü', help: 'Hilfe' } }));
      writeFileSync(path.join(dir, 'records', 'en.json'), JSON.stringify({ 'toxic-1a': 'Toxic.' }));
      writeFileSync(path.join(dir, 'records', 'de.json'), JSON.stringify({ 'toxic-1a': 'Giftig.', 'old-2b': 'Alt.' }));
      writeFileSync(path.join(dir, 'guides', 'firing', 'en.md'), guide('Cones bend.', 'It trips.'));
      writeFileSync(
        path.join(dir, 'guides', 'firing', 'de.md'),
        guide('Kegel biegen sich.', 'Er löst aus.').replace('Intro.', 'Einleitung.').replace('## Cones', '## Kegel')
      );
    });
    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
      rmSync(prints, { recursive: true, force: true });
    });
    const update = (options = {}) => updateTranslations({ dir, fingerprints: prints, ...options });

    it('fingerprints new translations with their English, and is then in step', () => {
      const first = update();
      expect(first.changes).to.include('app de nav.menu: fingerprinted with its English');
      expect(first.changes).to.include('guides/firing de cones: fingerprinted with its English');
      expect(first.changes).to.include('records de old-2b: no longer in the English, so taken out');
      expect(JSON.parse(read('records/de.json'))).to.eql({ 'toxic-1a': 'Giftig.' });
      const ledger = JSON.parse(readFileSync(path.join(prints, 'de.json'), 'utf8'));
      expect(Object.keys(ledger)).to.eql(['app', 'guides/firing']);
      expect(update()).to.eql({ changes: [], inEnglish: { de: { messages: 0, sections: 0 } } });
    });

    it('shows the English where it changed, until translated again, and keeps what a change left alone', () => {
      update();
      writeFileSync(path.join(dir, 'en.json'), JSON.stringify({ nav: { menu: 'The menu', help: 'Help!' } }));
      writeFileSync(path.join(dir, 'guides', 'firing', 'en.md'), guide('Cones bend over.', 'It trips.'));
      const { changes, inEnglish } = update({ keep: ['app:nav.help'] });
      expect(changes).to.eql([
        'app de nav.menu: translated from older English, so it shows the English again',
        "app de nav.help: kept, as its English's change was marked as keeping the meaning",
        'guides/firing de cones: translated from older English, so it shows the English again'
      ]);
      expect(inEnglish).to.eql({ de: { messages: 1, sections: 1 } });
      expect(JSON.parse(read('de.json'))).to.eql({ nav: { help: 'Hilfe' } });
      // The section is the English, marked, inside its part for one way of firing; the rest stays translated.
      expect(read('guides/firing/de.md')).to.equal(
        guide('Cones bend over.', 'Er löst aus.')
          .replace('Intro.', 'Einleitung.')
          .replace('{#cones}', '{#cones lang=en}')
      );
      expect(checkGuides(path.join(dir, 'guides'))).to.eql([]);
      // Translated again: fingerprinted with the new English.
      writeFileSync(
        path.join(dir, 'guides', 'firing', 'de.md'),
        guide('Kegel biegen sich um.', 'Er löst aus.').replace('Intro.', 'Einleitung.')
      );
      expect(update().changes).to.eql(['guides/firing de cones: fingerprinted with its English']);
    });

    it('counts the plainer notice as still in English only in the languages that show it', () => {
      const english = { nav: { menu: 'Menu', help: 'Help' }, notice: { plain: 'Translated by AI, less well.' } };
      writeFileSync(path.join(dir, 'en.json'), JSON.stringify(english));
      writeFileSync(path.join(dir, 'ga.json'), JSON.stringify({ nav: { menu: 'Roghchlár', help: 'Cabhair' } }));
      writeFileSync(path.join(dir, 'records', 'ga.json'), JSON.stringify({ 'toxic-1a': 'Tocsaineach.' }));
      const { inEnglish } = update();
      expect(inEnglish.de!.messages).to.equal(0);
      expect(inEnglish.ga!.messages).to.equal(1);
    });

    it('shows a section new in the English in English, and drops one it no longer has', () => {
      update();
      const english = guide('Cones bend.', 'It trips.').replace('## Sitter {#sitter}', '## Switch {#switch}');
      writeFileSync(path.join(dir, 'guides', 'firing', 'en.md'), english);
      expect(update().changes).to.eql([
        'guides/firing de switch: new in the English, so it shows the English',
        'guides/firing de sitter: no longer in the English, so taken out'
      ]);
      expect(read('guides/firing/de.md')).to.contain('## Switch {#switch lang=en}\n\nIt trips.');
    });
  });

  describe('across files', () => {
    let dir: string;
    before(() => {
      dir = mkdtempSync(path.join(tmpdir(), 'i18n-'));
      mkdirSync(path.join(dir, 'recipe'));
      writeFileSync(path.join(dir, 'en.json'), JSON.stringify({ nav: { menu: 'Menu', old: 'Old' } }));
      writeFileSync(path.join(dir, 'de.json'), JSON.stringify({ nav: { menu: 'Menü', gone: 'Weg' } }));
      writeFileSync(path.join(dir, 'recipe', 'en.json'), JSON.stringify({ save: 'Save {name}' }));
      writeFileSync(path.join(dir, 'recipe', 'fr.json'), JSON.stringify({ save: 'Enregistrer' }));
    });
    after(() => rmSync(dir, { recursive: true, force: true }));

    it('compares each language with the English, part by part', () => {
      const files = messageFiles(dir);
      expect(Object.keys(files).sort()).to.eql(['', 'recipe']);
      expect(checkTranslations(files)).to.eql([
        'app de nav.gone: no such message in English',
        'recipe fr save: placeholders none, but the English has name'
      ]);
    });

    it('compares the keys the app uses with the English', () => {
      const used = { '': new Set(['nav.menu', 'nav.new']), recipe: new Set(['save']) };
      expect(compareKeys(used, messageFiles(dir))).to.eql([
        'app: nav.new is used but has no English',
        'app: nav.old has English but is not used'
      ]);
    });
  });
});
