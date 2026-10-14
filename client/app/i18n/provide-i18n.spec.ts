import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { TRANSLOCO_LOADER, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { PAGE_LANGUAGE } from './language';
import { provideI18n } from './provide-i18n';

// The page's language comes from the document's address, so the same code reads
// the browser's address in the browser and the page being rendered at build time.

describe('provideI18n', () => {
  const FILES: Record<string, Record<string, string>> = {
    en: { 'meta.description': 'A description', 'meta.imageAlt': 'A picture' },
    de: { 'meta.description': 'Eine Beschreibung', 'meta.imageAlt': 'Ein Bild' }
  };

  // A document of its own with the address given: the one the render has, not the test page's.
  const withAddress = (doc: Document, pathname: string): Document =>
    new Proxy(doc, {
      get: (target, key) => {
        if (key === 'location') return { pathname };
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });

  async function start(pathname: string, language?: string) {
    const doc = document.implementation.createHTMLDocument('');
    for (const [attr, name] of [
      ['name', 'description'],
      ['property', 'og:description'],
      ['property', 'og:image:alt']
    ]) {
      const tag = doc.createElement('meta');
      tag.setAttribute(attr, name);
      tag.setAttribute('content', 'English');
      doc.head.append(tag);
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: withAddress(doc, pathname) },
        ...provideI18n(language),
        { provide: TRANSLOCO_LOADER, useValue: { getTranslation: (path: string) => of(FILES[path] ?? {}) } }
      ]
    });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    return doc;
  }

  it('takes the language from the address of the document', async () => {
    const doc = await start('/de/guides');
    expect(TestBed.inject(PAGE_LANGUAGE)).toBe('de');
    expect(TestBed.inject(APP_BASE_HREF)).toBe('/de/');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('de');
    expect(doc.documentElement.lang).toBe('de');
    expect(doc.documentElement.dir).toBe('ltr');
  });

  it('is English for an address with no language', async () => {
    await start('/guides');
    expect(TestBed.inject(PAGE_LANGUAGE)).toBe('en');
    expect(TestBed.inject(APP_BASE_HREF)).toBe('/');
  });

  it('uses a language it is given over the address', async () => {
    await start('/guides', 'de');
    expect(TestBed.inject(PAGE_LANGUAGE)).toBe('de');
  });

  it('writes the description and the preview text through the document', async () => {
    const doc = await start('/de/guides');
    const meta = TestBed.inject(Meta);
    expect(meta.getTag('name="description"')?.content).toBe('Eine Beschreibung');
    expect(doc.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Eine Beschreibung');
    expect(doc.querySelector('meta[property="og:image:alt"]')?.getAttribute('content')).toBe('Ein Bild');
  });
});
