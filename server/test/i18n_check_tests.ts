import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  checkDigits,
  checkGuides,
  checkTranslations,
  compareKeys,
  compareMessage,
  compareSegment,
  messageFiles,
  numbersIn
} from '../../scripts/i18n-check.mjs';
import { updateTranslations } from '../../scripts/i18n-fingerprints.mjs';
import { uncommittedTranslations } from '../../scripts/i18n-sources.mjs';
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

  describe('in the languages of East and Southeast Asia, and Turkish', () => {
    const english = 'Fire to 1222 °C, add 10 g of frit, keep the stain at 5% or less, and open the kiln after 8pm.';
    const figures = ['10 g', '1222 °C', '20', '5 %'];
    const sentences: [string, string][] = [
      ['ja', '1222 °Cで焼成し、フリットを10 g加え、顔料は5%以下にして、20時以降に窯を開けます。'],
      // As a Japanese keyboard types it: full-width digits, ℃, ｇ and ％.
      ['ja', '１２２２℃で焼成し、フリットを１０ｇ加え、顔料は５％以下にして、２０時以降に窯を開けます。'],
      ['zh-Hans', '烧成到1222 °C，加入10 g熔块，色剂保持在5%以下，20点以后开窑。'],
      ['zh-Hant', '燒成至1222 °C，加入10 g熔塊，色劑保持在5%以下，20點以後開窯。'],
      ['ko', '1222 °C로 소성하고, 프릿 10 g을 넣고, 안료는 5% 이하로 하고, 20시 이후에 가마를 여세요.'],
      ['th', 'เผาที่ 1222 °C เติมฟริต 10 g ให้สีไม่เกิน 5% และเปิดเตาหลัง 20.00 น.'],
      [
        'id',
        'Bakar hingga 1222 °C, tambahkan 10 g frit, jaga pewarna 5% atau kurang, dan buka tungku setelah pukul 20.00.'
      ],
      ['vi', 'Nung đến 1222 °C, thêm 10 g frit, giữ chất màu ở mức 5% trở xuống, và mở lò sau 20 giờ.'],
      [
        'tr',
        '1222 °C’ye kadar pişirin, 10 g frit ekleyin, boyayı %5’in altında tutun ve fırını saat 20.00’den sonra açın.'
      ]
    ];

    it('reads their numbers and units, written into the next word, full-width or with the percent sign first', () => {
      expect(numbersIn(english, 'en')).to.eql(figures);
      for (const [language, sentence] of sentences) {
        expect(numbersIn(sentence, language), language).to.eql(figures);
        expect(compareMessage(language, 'k', english, sentence), language).to.eql([]);
      }
      // A Turkish range takes the percent sign once, before it, as English takes it once after.
      expect(numbersIn('%10–60 ve %0,5-2', 'tr')).to.eql(numbersIn('10–60% and 0.5-2%', 'en'));
      // A unit followed by a Latin letter is still part of a word: 5 grams, not 5 g.
      expect(numbersIn('5 gram', 'id')).to.eql(['5']);
      // A time with minutes keeps them, as 8:30pm does.
      expect(numbersIn('pukul 20.30 WIB', 'id')).to.eql(numbersIn('8:30pm', 'en'));
      // A time on the hour is its hour, however written: 08:00 to 20:00 is saat 08.00–20.00 and 8 Uhr bis 20 Uhr.
      expect(numbersIn('saat 08.00 ile saat 20.00 arası', 'tr')).to.eql(numbersIn('08:00 to 20:00', 'en'));
      expect(numbersIn('8 bis 20 Uhr', 'de')).to.eql(numbersIn('8:00 to 20:00', 'en'));
      expect(numbersIn('de 8 h 00 à 20 h 00', 'fr')).to.eql(['20', '8']);
      // Lithuanian writes degrees per hour as °C/val., as its style sheet asks: English's °C/h.
      expect(numbersIn('Kaitinkite 60 °C/val. greičiu iki 1222 °C.', 'lt')).to.eql(
        numbersIn('Heat at 60 °C/h to 1222 °C.', 'en')
      );
      expect(numbersIn('{{108 °F/val.; 60 °C/val.}}', 'lt')).to.eql(['108 °F/h', '60 °C/h']);
    });

    it('reads a month as its number where the language writes it so, as Japanese 2026年10月 does', () => {
      expect(compareMessage('ja', 'k', 'In stock in October 2026.', '2026年10月に在庫あり。')).to.eql([]);
      expect(
        compareMessage('ja', 'k', 'From 1 December 2026, or Sept. 2021.', '2026年12月1日から、2021年9月。')
      ).to.eql([]);
      expect(compareMessage('ko', 'k', 'Checked Apr 2013.', '2013년 4월에 확인.')).to.eql([]);
      expect(compareMessage('zh-Hant', 'k', 'Checked 29 May 2026.', '2026年5月29日確認。')).to.eql([]);
      // The wrong month is a wrong figure.
      expect(compareMessage('ja', 'k', 'In stock in October 2026.', '2026年11月に在庫あり。')).to.eql([
        'k: its numbers differ from the English; missing 10; not in the English 11'
      ]);
      // A name that is not beside a day or year is not a month; languages that name months read none.
      expect(compareMessage('ja', 'k', 'May contain 2 g.', '2 g含まれることがあります。')).to.eql([]);
      expect(compareMessage('de', 'k', 'In October 2026.', 'Im Oktober 2026.')).to.eql([]);
    });

    it('reports a time on the 12-hour clock, and a number written in words, rather than misreading them', () => {
      expect(compareMessage('ja', 'k', english, sentences[0]![1].replace('20時', '午後8時'))).to.eql([
        'k: its numbers differ from the English; missing 20; not in the English 午後8時'
      ]);
      expect(numbersIn('晚上8点开窑', 'zh-Hans')).to.eql(['晚上8点']);
      expect(numbersIn('下午8時開窯', 'zh-Hant')).to.eql(['下午8時']);
      expect(numbersIn('오후 8시에 여세요', 'ko')).to.eql(['오후 8시']);
      expect(numbersIn('mở lò sau 8 giờ tối', 'vi')).to.eql(['8 giờ tối']);
      expect(numbersIn('buka setelah pukul 8 malam', 'id')).to.eql(['pukul 8 malam']);
      expect(compareMessage('zh-Hans', 'k', 'Add 10 g.', '加入十克。')).to.eql([
        'k: its numbers differ from the English; missing 10 g'
      ]);
    });

    it('finds Simplified characters in Traditional Chinese, the reverse, and simplified hanzi in Japanese', () => {
      expect(compareMessage('zh-Hans', 'k', 'Silicon settings', '硅设置')).to.eql([]);
      expect(compareMessage('zh-Hant', 'k', 'Silicon settings', '矽設定')).to.eql([]);
      expect(compareMessage('zh-Hans', 'k', 'Silicon settings', '矽設置')).to.eql([
        'k: Simplified Chinese takes 硅 设, not 矽 設'
      ]);
      expect(compareMessage('zh-Hant', 'k', 'Potassium and aluminium', '钾和铝')).to.eql([
        'k: Traditional Chinese takes 鉀 鋁, not 钾 铝'
      ]);
      // Japanese writes 温度 and 数 as Simplified Chinese does, but not 设 or 铁.
      expect(compareMessage('ja', 'k', 'Temperature', '温度と数')).to.eql([]);
      expect(compareMessage('ja', 'k', 'Iron settings', '铁の设定')).to.eql([
        'k: Japanese is not written with simplified hanzi such as 铁 设'
      ]);
      // The same in a guide's sections.
      expect(compareSegment('glaze', 'zh-Hans', 'Silicon.', '矽。')).to.eql([
        'glaze: Simplified Chinese takes 硅, not 矽'
      ]);
    });

    it('takes only the plural form other where the language has no other', () => {
      const english = '{count, plural, one {# material} other {# materials}}';
      for (const language of ['ja', 'zh-Hans', 'zh-Hant', 'ko', 'th', 'vi', 'id']) {
        expect(compareMessage(language, 'k', english, '{count, plural, other {#}}'), language).to.eql([]);
        expect(compareMessage(language, 'k', english, '{count, plural, one {#} other {#}}'), language).to.eql([
          `k: ${language} has no plural form one for {count}`
        ]);
      }
      // Turkish has one and other, as English does.
      expect(compareMessage('tr', 'k', english, '{count, plural, other {# malzeme}}')).to.eql([
        'k: tr needs the plural forms one for {count}'
      ]);
    });
  });

  describe('in Hindi, Arabic and Urdu', () => {
    const english =
      'Fire to 1222 °C, add 100,000 g of frit (1,234,567.5 g in all), keep the stain at 1.5% or less, and open the kiln after 8pm.';
    const figures = ['1.5 %', '100000 g', '1222 °C', '1234567.5 g', '20'];
    const sentences: [string, string][] = [
      // Indian digit groups: a lakh, and 12,34,567.5.
      [
        'hi',
        '1222 °C तक पकाएँ, 1,00,000 g फ्रिट डालें (कुल 12,34,567.5 g), रंग 1.5% या उससे कम रखें, और 20 बजे के बाद भट्ठी खोलें।'
      ],
      [
        'ar',
        'اِحرق حتى 1222 °C، وأضف 100,000 g من الفريت (1,234,567.5 g في المجموع)، وأبقِ الصبغة عند 1.5% أو أقل، وافتح الفرن بعد الساعة 20.'
      ],
      [
        'ur',
        '1222 °C تک پکائیں، 1,00,000 g فرٹ ڈالیں (کل 12,34,567.5 g)، رنگ 1.5% یا کم رکھیں، اور 20 بجے کے بعد بھٹی کھولیں۔'
      ]
    ];

    it('reads their numbers, Indian digit groups too, as the English’s', () => {
      expect(numbersIn(english, 'en')).to.eql(figures);
      for (const [language, sentence] of sentences) {
        expect(numbersIn(sentence, language), language).to.eql(figures);
        expect(compareMessage(language, 'k', english, sentence), language).to.eql([]);
      }
      // A lakh changed by a digit is a different number.
      expect(compareMessage('hi', 'k', english, sentences[0]![1].replace('1,00,000', '1,00,001'))).to.eql([
        'k: its numbers differ from the English; missing 100000 g; not in the English 100001 g'
      ]);
    });

    it('reads native digits, the Arabic marks and the marks that keep a direction, as Intl writes them', () => {
      const ALM = String.fromCodePoint(0x61c);
      const LRM = String.fromCodePoint(0x200e);
      // Arabic-Indic digits with the Arabic decimal, thousands and percent signs (ar-EG).
      const native =
        'اِحرق حتى ١٢٢٢ °C، وأضف ١٠٠٬٠٠٠ g من الفريت (١٬٢٣٤٬٥٦٧٫٥ g في المجموع)، وأبقِ الصبغة عند ١٫٥٪ أو أقل، وافتح الفرن بعد الساعة ٢٠.';
      expect(numbersIn(native, 'ar')).to.eql(figures);
      expect(numbersIn('৫,০০,০০০ g', 'bn')).to.eql(['500000 g']);
      expect(numbersIn('१२२२ °C', 'mr')).to.eql(['1222 °C']);
      // As Intl writes 5% and -3 in Arabic, in the UAE and in Egypt.
      expect(numbersIn('5' + LRM + '%' + LRM, 'ar')).to.eql(['5 %']);
      expect(numbersIn('٥٪' + ALM + ' ' + ALM + '-٣', 'ar')).to.eql(['3', '5 %']);
      // A decimal-comma language reads the Arabic decimal mark as its comma.
      expect(numbersIn('١٫٥ g', 'fr')).to.eql(['1.5 g']);
    });
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
    // A Turkish name the English gives with the cedilla stays as it is; the Romanian around it may not.
    const uzem = 'National Poison Information Centre (Ulusal Zehir Danışma Merkezi, UZEM)';
    expect(
      compareMessage('ro', 'k', uzem, 'Centrul Național de Informare Toxicologică (Ulusal Zehir Danışma Merkezi, UZEM)')
    ).to.eql([]);
    expect(compareMessage('ro', 'k', uzem, 'Centrul Naţional (Ulusal Zehir Danışma Merkezi, UZEM)')).to.have.length(1);
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

    it('finds a translation that writes digits other than 0–9, in a message or a guide', () => {
      const digits = mkdtempSync(path.join(tmpdir(), 'i18n-digits-'));
      try {
        mkdirSync(path.join(digits, 'guides', 'firing'), { recursive: true });
        writeFileSync(path.join(digits, 'en.json'), JSON.stringify({ fire: 'Fire to 1222 °C.', kiln: 'Kiln' }));
        writeFileSync(path.join(digits, 'ar.json'), JSON.stringify({ fire: 'اِحرق حتى ١٢٢٢ °C.', kiln: 'الفرن' }));
        writeFileSync(path.join(digits, 'hi.json'), JSON.stringify({ fire: '1222 °C तक पकाएँ।', kiln: 'भट्ठी' }));
        writeFileSync(path.join(digits, 'guides', 'firing', 'en.md'), 'Fire to cone 6.\n');
        writeFileSync(path.join(digits, 'guides', 'firing', 'bn.md'), 'কোন ৬ পর্যন্ত পোড়ান।\n');
        writeFileSync(path.join(digits, 'guides', 'firing', 'ur.md'), 'کون 6 تک پکائیں۔\n');
        expect(checkDigits(digits)).to.eql([
          "app ar fire: writes digits as 0–9, not ١ ٢; the reader's settings show a language's own digits",
          "guides/firing/bn.md: writes digits as 0–9, not ৬; the reader's settings show a language's own digits"
        ]);
      } finally {
        rmSync(digits, { recursive: true, force: true });
      }
      // The app's own translations write 0–9.
      expect(checkDigits()).to.eql([]);
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

// npm run i18n:sources takes out translations made from older English, so it
// will not run over translations not yet committed (scripts/i18n-sources.mjs).
describe('i18n:sources and uncommitted translations', () => {
  let repo: string;
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
  const put = (file: string, text: string) => {
    mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    writeFileSync(path.join(repo, file), text);
  };
  beforeEach(() => {
    repo = mkdtempSync(path.join(tmpdir(), 'glazecalc-sources-'));
    git('init', '-q');
    put('client/public/i18n/site/en.json', '{}\n');
    put('client/public/i18n/site/de.json', '{}\n');
    put('client/public/i18n/guides/firing/de.md', '# Brennen\n');
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'start');
  });
  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  it('names changed and new translations, and not changed English', () => {
    const paths = ['client/public/i18n', 'client/i18n-fingerprints'];
    expect(uncommittedTranslations(paths, repo)).to.eql([]);
    put('client/public/i18n/site/en.json', '{"a": "A"}\n');
    put('client/public/i18n/guides/firing/en.md', '# Firing\n');
    expect(uncommittedTranslations(paths, repo)).to.eql([]);
    put('client/public/i18n/site/de.json', '{"a": "Ä"}\n');
    put('client/public/i18n/site/fr.json', '{}\n');
    put('client/i18n-fingerprints/de.json', '{}\n');
    expect(uncommittedTranslations(paths, repo)?.sort()).to.eql([
      'client/i18n-fingerprints/de.json',
      'client/public/i18n/site/de.json',
      'client/public/i18n/site/fr.json'
    ]);
  });

  it('cannot say outside a repository', () => {
    const outside = mkdtempSync(path.join(tmpdir(), 'glazecalc-no-git-'));
    try {
      expect(uncommittedTranslations(['.'], path.join(outside, 'missing'))).to.equal(null);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
