import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { LIVE_LANGUAGES } from '../../../lib/regions/languages';
import { searcher } from '../shared/picker-search';
import { regionItems } from '../shared/region-items';
import { testProviders } from '../testing/test-providers';
import { languageItems, languageSections } from './language-groups';

describe('the languages in groups', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    // Starts the messages, which translate() reads.
    TestBed.inject(TranslocoService);
  });

  it('puts English first, with no heading, then the parts of the world alphabetically, each by English name', () => {
    const sections = languageSections(LIVE_LANGUAGES);
    expect(sections.map((s) => s.name)).toEqual([
      '',
      'picker.groups.eastAsia',
      'picker.groups.europe',
      'picker.groups.middleEastNorthAfrica',
      'picker.groups.southAsia',
      'picker.groups.southeastAsia'
    ]);
    expect(sections[0]!.codes).toEqual(['en']);
    // Korean, Japanese and the Chinese: by their English names, not by script or code.
    expect(sections[1]!.codes).toEqual(['ja', 'ko', 'zh-Hans', 'zh-Hant']);
    expect(sections[2]!.codes.slice(0, 4)).toEqual(['bg', 'hr', 'cs', 'da']);
    expect(sections[3]!.codes).toEqual(['ar', 'tr']);
    expect(sections[4]!.codes).toEqual(['bn', 'hi', 'kn', 'mr', 'ta', 'ur']);
    expect(sections[5]!.codes).toEqual(['id', 'th', 'vi']);
  });

  it('lists every language offered once, and a group only where there is a language in it', () => {
    const codes = languageSections(LIVE_LANGUAGES).flatMap((s) => s.codes);
    expect([...codes].sort()).toEqual([...LIVE_LANGUAGES].sort());
    expect(languageSections(['en']).map((s) => s.name)).toEqual(['']);
    expect(languageSections(['de', 'hi', 'ur']).map((s) => s.name)).toEqual([
      'picker.groups.europe',
      'picker.groups.southAsia'
    ]);
    // A pseudo-locale, made for tests, is in no part of the world.
    expect(languageSections(['en', 'en-XA']).map((s) => s.name)).toEqual(['', 'picker.groups.other']);
  });

  it('shows each in its own name with its English name beside it, under the group’s name', () => {
    const items = languageItems(LIVE_LANGUAGES);
    const german = items.find((i) => i.value === 'de')!;
    expect(german).toMatchObject({ label: 'Deutsch', note: 'German', lang: 'de', group: 'Europe' });
    // English needs no second name; it is the page's own words and has no heading.
    expect(items[0]).toMatchObject({ value: 'en', label: 'English', note: undefined, group: '' });
    expect(items.find((i) => i.value === 'zh-Hant')).toMatchObject({
      label: '繁體中文',
      note: 'Traditional Chinese',
      group: 'East Asia'
    });
  });

  it('can be found by typing its own name, its English name, or the start of either', () => {
    const find = searcher(languageItems(LIVE_LANGUAGES));
    const found = (query: string) => find(query).map((i) => i.value);
    expect(found('german')).toEqual(['de']);
    expect(found('deu')).toEqual(['de']);
    expect(found('Deutsch')).toEqual(['de']);
    expect(found('espanol')).toEqual(['es']);
    expect(found('spanish')).toEqual(['es']);
    expect(found('turkce')).toEqual(['tr']);
    expect(found('bahasa')).toEqual(['id']);
    expect(found('indonesian')).toEqual(['id']);
    expect(found('日本')).toEqual(['ja']);
    expect(found('chinese')).toEqual(['zh-Hans', 'zh-Hant']);
    expect(found('portugal')).toEqual(['pt-PT']);
    expect(found('gaeilge')).toEqual(['ga']);
    expect(found('irish')).toEqual(['ga']);
    expect(found('marathi')).toEqual(['mr']);
    expect(found('தமிழ்')).toEqual(['ta']);
    expect(found('kannada')).toEqual(['kn']);
  });
});

describe('the regions in groups', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    // Starts the messages, which translate() reads.
    TestBed.inject(TranslocoService);
  });

  const regions = [
    { code: 'DE', name: 'Germany' },
    { code: 'US', name: 'United States' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    { code: 'FR', name: 'France' }
  ];

  it('are listed by continent, then alphabetically, with no second name on an English page', () => {
    const items = regionItems(regions, 'en');
    expect(items.map((i) => [i.group, i.label])).toEqual([
      ['Americas', 'United States'],
      ['Asia', 'Japan'],
      ['Europe', 'France'],
      ['Europe', 'Germany'],
      ['Oceania', 'Australia']
    ]);
    expect(items.every((i) => i.note === undefined)).toBe(true);
  });

  it('are found by their English names on a page in another language', () => {
    const items = regionItems(
      [
        { code: 'DE', name: 'Deutschland' },
        { code: 'ES', name: 'Spanien' },
        { code: 'AT', name: 'Österreich' }
      ],
      'de'
    );
    // Sorted in German; the English beside each.
    expect(items.map((i) => [i.label, i.note])).toEqual([
      ['Deutschland', 'Germany'],
      ['Österreich', 'Austria'],
      ['Spanien', 'Spain']
    ]);
    const find = searcher(items);
    expect(find('germany').map((i) => i.value)).toEqual(['DE']);
    expect(find('austria').map((i) => i.value)).toEqual(['AT']);
    expect(find('osterreich').map((i) => i.value)).toEqual(['AT']);
    expect(find('de').map((i) => i.value)).toEqual(['DE']);
  });
});
