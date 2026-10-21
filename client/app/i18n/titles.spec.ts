import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { TranslatedTitles } from './titles';

// A page's title and description go into the head's tags, in the page's language.

describe('TranslatedTitles', () => {
  const FILES: Record<string, Record<string, string>> = {
    en: {
      'titles.guides': 'Guides',
      'titles.material': '{name}: analysis',
      'meta.description': 'The site',
      'meta.guides': 'About guides',
      'meta.material': 'All about {name}.'
    },
    de: { 'titles.guides': 'Anleitungen', 'meta.description': 'Die Seite', 'meta.guides': 'Über Anleitungen' },
    fr: { 'titles.guides': 'Guides', 'meta.description': 'Le site' }
  };

  function setup(language: string) {
    const doc = document.implementation.createHTMLDocument('');
    for (const [attr, name] of [
      ['name', 'description'],
      ['property', 'og:title'],
      ['property', 'og:description']
    ]) {
      const tag = doc.createElement('meta');
      tag.setAttribute(attr, name);
      tag.setAttribute('content', 'English');
      doc.head.append(tag);
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: doc },
        {
          provide: TranslocoService,
          useValue: {
            getActiveLang: () => language,
            getTranslation: (lang: string) => FILES[lang] ?? {},
            // A language without the message shows the English, as the app does.
            translate: (key: string, params?: Record<string, string>) =>
              (FILES[language]?.[key] ?? FILES['en']![key])?.replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? '')
          }
        }
      ]
    });
    const strategy = TestBed.inject(TranslatedTitles);
    const read = (selector: string) => TestBed.inject(Meta).getTag(selector)?.content;
    const update = (description?: string) => {
      vi.spyOn(strategy, 'buildTitle').mockReturnValue('titles.guides');
      const child = { data: description ? { description } : {}, firstChild: null };
      strategy.updateTitle({ root: { data: {}, firstChild: child } } as unknown as RouterStateSnapshot);
    };
    return { doc, read, update, title: () => TestBed.inject(Title).getTitle() };
  }

  it('sets the title, the description, and the preview title and text', () => {
    const { read, update, title } = setup('de');
    update('meta.guides');
    expect(title()).toBe('Anleitungen');
    expect(read('name="description"')).toBe('Über Anleitungen');
    expect(read('property="og:title"')).toBe('Anleitungen');
    expect(read('property="og:description"')).toBe('Über Anleitungen');
  });

  it('uses the whole site description when the route has none', () => {
    const { read, update } = setup('en');
    update();
    expect(read('name="description"')).toBe('The site');
  });

  it("uses the language's site description, not the English, where the page's is not translated yet", () => {
    const { read, update } = setup('fr');
    update('meta.guides');
    expect(read('name="description"')).toBe('Le site');
    expect(read('property="og:description"')).toBe('Le site');
  });

  it("puts a page's own values in its title and description (a material's name)", () => {
    const { read, title } = setup('en');
    const strategy = TestBed.inject(TranslatedTitles);
    vi.spyOn(strategy, 'buildTitle').mockReturnValue('titles.material');
    // The values and the description's key come from resolvers: they are in the route's data.
    const data = { description: 'meta.material', titleParams: { name: 'Silica' } };
    strategy.updateTitle({
      root: { data: {}, firstChild: { data, firstChild: null } }
    } as unknown as RouterStateSnapshot);
    expect(title()).toBe('Silica: analysis');
    expect(read('name="description"')).toBe('All about Silica.');
    expect(read('property="og:title"')).toBe('Silica: analysis');
  });

  it('adds no tags the page does not have', () => {
    const { doc, update } = setup('en');
    doc.head.querySelector('[name="description"]')!.remove();
    update('meta.guides');
    expect(doc.head.querySelector('[name="description"]')).toBeNull();
  });
});
