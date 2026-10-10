import { Location } from '@angular/common';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from '../app';
import { firstValueFrom } from 'rxjs';
import { API, httpMock, settle, testProviders } from '../testing/test-providers';
import { FileLoader } from './loader';
import { OFFERED_LANGUAGES, OPEN_PAGE, PAGE_LANGUAGE } from './language';
import { chosenLanguage, ownLanguagePage } from './own-language';
import { RichText } from './rich-text';
import { READ_ENGLISH, TranslationNotice } from './translation-notice';

// Choosing a language, landing in it, and the notice on translated pages
// (docs/i18n-plan.md). Only English is offered so far, so these use the
// pseudo-locale en-XA as the other language.

describe('a reader’s own language', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

  it('takes a reader who chose a language from an English page to the same page in it', () => {
    // Only languages offered count; en-XA is not, so nothing happens yet.
    expect(ownLanguagePage('en-XA', at('/recipe'))).toBeNull();
    expect(ownLanguagePage('en', at('/recipe'))).toBeNull();
    expect(ownLanguagePage(null, at('/recipe'))).toBeNull();
    expect(ownLanguagePage('xx', at('/recipe'))).toBeNull();
  });

  it('reads the choice this browser keeps', () => {
    localStorage.setItem('language', 'de');
    expect(chosenLanguage()).toBe('de');
    localStorage.removeItem('language');
    expect(chosenLanguage()).toBeNull();
  });
});

describe('the translation notice', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        provideRouter([
          { path: 'safety', data: { safety: true }, children: [] },
          { path: 'other', children: [] }
        ])
      ]
    });
  });
  afterEach(() => history.replaceState(null, '', '/'));

  const create = async (language: string) => {
    TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: language });
    const fixture = TestBed.createComponent(TranslationNotice);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element };
  };

  it('is not on English pages', async () => {
    const { element } = await create('en');
    expect(element.querySelector('aside')).toBeNull();
  });

  it('says the page was translated by AI, with a correction form for the page and the English', async () => {
    const { element } = await create('en-XA');
    const notice = element.querySelector('aside')!;
    // The tests load the English for every language.
    expect(notice.getAttribute('aria-label')).toBe('About this translation');
    const [suggest, english] = [...notice.querySelectorAll('a')];
    const form = new URL(suggest!.getAttribute('href')!);
    expect(form.origin + form.pathname).toBe('https://github.com/AaronFilson/glazecalc/issues/new');
    expect(form.searchParams.get('template')).toBe('translation.yml');
    expect(form.searchParams.get('language')).toBe('en-XA');
    expect(form.searchParams.get('page')).toBe(location.pathname);
    english!.click();
    expect(sessionStorage.getItem(READ_ENGLISH)).toBe('1');
  });

  it('links the English of the page as it is, with its query and section', async () => {
    const { fixture, element } = await create('en-XA');
    // The address the browser shows once the router has opened it.
    history.replaceState(null, '', '/en-XA/other?compare=draft,abc#cones');
    await TestBed.inject(Router).navigateByUrl('/other?compare=draft,abc#cones');
    await fixture.whenStable();
    const english = element.querySelectorAll('aside a')[1]!;
    expect(english.getAttribute('href')).toBe('/other?compare=draft,abc#cones');
    // A guide's contents name a section without the router (guide-contents.ts).
    history.replaceState(null, '', '/en-XA/other?compare=draft,abc#glazes');
    TestBed.inject(Location).replaceState('/other?compare=draft,abc#glazes');
    await fixture.whenStable();
    expect(english.getAttribute('href')).toBe('/other?compare=draft,abc#glazes');
  });

  it('can be closed, and on a safety guide a line of it stays', async () => {
    const { fixture, element } = await create('en-XA');
    (element.querySelector('aside button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element.querySelector('aside')).toBeNull();
    expect(localStorage.getItem('notice')).toBe('hidden');
    await TestBed.inject(Router).navigateByUrl('/safety');
    await fixture.whenStable();
    expect(element.querySelector('aside p')?.textContent).toMatch(/^\s*Translated from English by AI\./);
    expect(element.querySelector('aside button')).toBeNull();
    await TestBed.inject(Router).navigateByUrl('/other');
    await fixture.whenStable();
    expect(element.querySelector('aside')).toBeNull();
  });
});

describe('the footer’s languages', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [...testProviders()] });
  });

  const footer = async (offered: string[], opened: string[] = []) => {
    TestBed.overrideProvider(OFFERED_LANGUAGES, { useValue: offered });
    TestBed.overrideProvider(OPEN_PAGE, { useValue: (address: string) => opened.push(address) });
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.footer-languages') as HTMLElement | null;
  };

  it('are not there while English is the only one', async () => {
    expect(await footer(['en'])).toBeNull();
  });

  it('link this page in each language, and remember the one chosen', async () => {
    const links = [...(await footer(['en', 'en-XA']))!.querySelectorAll('a')];
    expect(links.map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('lang')])).toEqual([
      ['English', '/', 'en'],
      ['Ëñĝļîšĥ (pseudo)', '/en-XA/', 'en-XA']
    ]);
    expect(links[0]!.getAttribute('aria-current')).toBe('true');
    links[1]!.addEventListener('click', (event) => event.preventDefault());
    links[1]!.click();
    expect(localStorage.getItem('language')).toBe('en-XA');
  });

  it('for an account, open the page once the account has the language, so the new page keeps it', async () => {
    localStorage.setItem('session', 'account');
    const opened: string[] = [];
    const links = [...(await footer(['en', 'de'], opened))!.querySelectorAll('a')];
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    links[1]!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    const save = httpMock().expectOne({ method: 'PUT', url: API + '/preferences' });
    expect(save.request.body).toEqual({ language: 'de' });
    // Not before: an English page opens in the account's language (own-language.ts), but not this early.
    await settle();
    expect(opened).toEqual([]);
    save.flush({});
    await settle();
    expect(opened).toEqual(['/de/']);
  });
});

describe('English terms', () => {
  @Component({ imports: [RichText], template: `<p><gc-rich [text]="text()" /></p>` })
  class Host {
    readonly text = input.required<string>();
  }

  const show = async (language: string, terms: 'on' | 'off') => {
    localStorage.setItem('englishTerms', terms);
    TestBed.configureTestingModule({ providers: testProviders() });
    TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: language });
    const fixture = TestBed.createComponent(Host);
    // A translated message with a term's English, as the transpiler writes its tags.
    fixture.componentRef.setInput('text', 'Die bFrittebenfriten schmilzt.');
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('p') as HTMLElement;
  };
  afterEach(() => localStorage.clear());

  it('shows the English after a key term in a translated page, for a reader who asks', async () => {
    const p = await show('de', 'on');
    expect(p.textContent).toBe('Die Fritte (frit) schmilzt.');
    expect(p.querySelector('.english-term')?.getAttribute('lang')).toBe('en');
  });

  it('leaves it out otherwise', async () => {
    expect((await show('de', 'off')).textContent).toBe('Die Fritte schmilzt.');
  });
});

describe('loading translation files', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  it('reads a file a language does not have yet as empty, so its messages show in English', async () => {
    const result = firstValueFrom(TestBed.inject(FileLoader).getTranslation('server/de'));
    httpMock().expectOne('/i18n/server/de.json').flush('', { status: 404, statusText: 'Not Found' });
    expect(await result).toEqual({});
  });

  it('still fails on other errors, which Transloco retries', async () => {
    const result = firstValueFrom(TestBed.inject(FileLoader).getTranslation('de'));
    httpMock().expectOne('/i18n/de.json').flush('', { status: 500, statusText: 'Server Error' });
    await expect(result).rejects.toBeTruthy();
  });
});
