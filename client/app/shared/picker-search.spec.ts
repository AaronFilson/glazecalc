import { PickerItem, fold, searcher, sectionsOf } from './picker-search';

const item = (value: string, label: string, english: string, group = ''): PickerItem => ({
  value,
  label,
  note: english === label ? undefined : english,
  words: [value, english],
  group
});

const ITEMS = [
  item('en', 'English', 'English'),
  item('de', 'Deutsch', 'German', 'Europe'),
  item('fr', 'Français', 'French', 'Europe'),
  item('pt-PT', 'Português (Portugal)', 'Portuguese (Portugal)', 'Europe'),
  item('tr', 'Türkçe', 'Turkish', 'Middle East'),
  item('ja', '日本語', 'Japanese', 'East Asia'),
  item('ko', '한국어', 'Korean', 'East Asia'),
  item('zh-Hans', '简体中文', 'Simplified Chinese', 'East Asia')
];
const find = searcher(ITEMS);
const values = (query: string) => find(query).map((i) => i.value);

describe('searching a picker', () => {
  it('folds case and accents, so a plain keyboard finds a name written with them', () => {
    expect(fold('Français')).toBe('francais');
    expect(fold('Türkçe')).toBe('turkce');
    expect(fold('ŁÓDŹ')).toBe('łodz');
  });

  it('finds a language by its own name or its English name, from the start of a word', () => {
    expect(values('deu')).toEqual(['de']);
    expect(values('german')).toEqual(['de']);
    expect(values('GERMAN')).toEqual(['de']);
    expect(values('francais')).toEqual(['fr']);
    expect(values('french')).toEqual(['fr']);
    expect(values('turkce')).toEqual(['tr']);
    expect(values('日本')).toEqual(['ja']);
    expect(values('portuguese')).toEqual(['pt-PT']);
  });

  it('finds it by its code, and by any word of a name that has several', () => {
    expect(values('pt')).toEqual(['pt-PT']);
    expect(values('zh-hans')).toEqual(['zh-Hans']);
    expect(values('chinese')).toEqual(['zh-Hans']);
    expect(values('portugal')).toEqual(['pt-PT']);
    // Every word typed must match: "simplified" and "chinese", in any order.
    expect(values('chinese simplified')).toEqual(['zh-Hans']);
    expect(values('simplified german')).toEqual([]);
  });

  it('follows Korean as it is typed, a syllable at a time', () => {
    expect(values('한')).toEqual(['ko']);
    // ㅎ + ㅏ typed so far, before the final consonant: the start of 한.
    expect(values('하')).toEqual(['ko']);
  });

  it('falls back to the middle of a word only where no word starts with what was typed', () => {
    expect(values('rman')).toEqual(['de']);
    expect(values('j')).toEqual(['ja']);
    // Nothing begins a word with "an": it is in the middle of Français, German, Japanese, Korean and Hans.
    expect(values('an')).toEqual(['de', 'fr', 'ja', 'ko', 'zh-Hans']);
  });

  it('returns everything for nothing typed, and nothing where nothing matches', () => {
    expect(values('')).toHaveLength(ITEMS.length);
    expect(values('   ')).toHaveLength(ITEMS.length);
    expect(values('klingon')).toEqual([]);
  });

  it('ignores punctuation in what is typed, as in the names', () => {
    expect(values('pt-pt')).toEqual(['pt-PT']);
    expect(values('portuguese (portugal)')).toEqual(['pt-PT']);
    expect(values('()')).toHaveLength(ITEMS.length);
  });
});

describe('the sections of a picker', () => {
  it('make a run of one group of each, in order, and none for no group', () => {
    const sections = sectionsOf(ITEMS);
    expect(sections.map((s) => [s.heading, s.items.map((i) => i.value)])).toEqual([
      ['', ['en']],
      ['Europe', ['de', 'fr', 'pt-PT']],
      ['Middle East', ['tr']],
      ['East Asia', ['ja', 'ko', 'zh-Hans']]
    ]);
    // A search keeps only the groups with matches.
    expect(sectionsOf(find('japanese')).map((s) => s.heading)).toEqual(['East Asia']);
  });
});
