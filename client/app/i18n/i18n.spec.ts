import { APP_BASE_HREF } from '@angular/common';
import { Component, Injectable, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterLink, provideRouter } from '@angular/router';
import {
  Translation,
  TranslocoDirective,
  TranslocoLoader,
  TranslocoService,
  provideTransloco,
  provideTranslocoMissingHandler,
  provideTranslocoScope,
  provideTranslocoTranspiler,
  translate
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { formatLocale } from '../shared/format';
import { IcuTranspiler } from './icu-transpiler';
import { baseHrefFor, languageOfPath, pathIn } from './language';
import { MissingKey } from './missing';
import { scopeTranslations } from './provide-i18n';
import { pseudoMessage, pseudoTranslation } from './pseudo';
import { RichText, richNodes } from './rich-text';

// The trial behind docs/adr/0013-translations.md: Transloco with FormatJS's
// ICU messages in a zoneless, signal-based app, the language from the URL,
// and right-to-left pages.

const FILES: Record<string, Translation> = {
  en: {
    materials: '{count, plural, one {# material} other {# materials}}',
    leadOff: 'Lead is off in <settings>Settings</settings>.',
    named: 'Your material {name} is saved.',
    onlyEnglish: 'Only in English so far'
  },
  de: {
    materials: '{count, plural, one {# Rohstoff} other {# Rohstoffe}}',
    leadOff: 'Blei ist in den <settings>Einstellungen</settings> ausgeschaltet.'
  },
  'example/en': { title: 'A page of its own', open: 'Open the recipe' },
  'example/de': { title: 'Eine eigene Seite', open: 'Rezept öffnen' }
};

@Injectable()
class MemoryLoader implements TranslocoLoader {
  getTranslation(path: string) {
    return of(FILES[path] ?? {});
  }
}

function setUp(language: string, extra: unknown[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({
        config: {
          availableLangs: ['en', 'de', 'cs', 'ar'],
          defaultLang: language,
          fallbackLang: 'en',
          missingHandler: { useFallbackTranslation: true },
          reRenderOnLangChange: false
        },
        loader: MemoryLoader
      }),
      provideTranslocoTranspiler(IcuTranspiler),
      provideTranslocoMissingHandler(MissingKey),
      ...(extra as [])
    ]
  });
  const transloco = TestBed.inject(TranslocoService);
  transloco.setActiveLang(language);
  // As the app does before its first page (i18n/provide-i18n.ts).
  transloco.load(language).subscribe();
  return transloco;
}

describe('translations', () => {
  afterEach(() => formatLocale.set('en'));

  describe('ICU messages through intl-messageformat', () => {
    const write = (language: string, message: string, values: Record<string, unknown>) => {
      const transpiler = new IcuTranspiler();
      transpiler.onLangChanged(language);
      return transpiler.transpile({ value: message, params: values, translation: {}, key: 'test' });
    };

    it('chooses the plural form by the language, and writes the number as Settings say', () => {
      // Czech: 1,5 takes "many", the form for decimals, not "few" or "other".
      formatLocale.set('cs-CZ');
      const litres = '{n, plural, one {# litr} few {# litry} many {# litru} other {# litrů}}';
      expect(write('cs', litres, { n: 1 })).toBe('1 litr');
      expect(write('cs', litres, { n: 3 })).toBe('3 litry');
      expect(write('cs', litres, { n: 1.5 })).toBe('1,5 litru');
      expect(write('cs', litres, { n: 5 })).toBe('5 litrů');
      // A Czech page for a potter who chose a decimal point: the form is still Czech's.
      formatLocale.set('en-US');
      expect(write('cs', litres, { n: 1.5 })).toBe('1.5 litru');
    });

    it('gives Arabic its six forms, with Arabic digits where the format uses them', () => {
      formatLocale.set('ar-EG');
      const message =
        '{n, plural, zero {لا مواد} one {مادة واحدة} two {مادتان} few {# مواد} many {# مادة} other {# مادة}}';
      const forms = [0, 1, 2, 3, 11, 100].map((n) => write('ar', message, { n }));
      expect(forms.slice(0, 3)).toEqual(['لا مواد', 'مادة واحدة', 'مادتان']);
      expect(forms[3]).toBe('٣ مواد');
      expect(forms[4]).toBe('١١ مادة');
      expect(forms[5]).toBe('١٠٠ مادة');
      expect(new Intl.PluralRules('ar').resolvedOptions().pluralCategories).toHaveLength(6);
    });

    it('stops on a message missing its values while developing, rather than show it broken', () => {
      expect(() => write('en', 'Saved {name}.', {})).toThrow(/The message test could not be written/);
    });
  });

  describe('tags', () => {
    it('keeps them out of reach of what a potter types', () => {
      setUp('en');
      const written = translate('named', { name: '<b>Custer</b> {x}' });
      expect(written).toBe('Your material <b>Custer</b> {x} is saved.');
      expect(richNodes(written)).toEqual([{ kind: 'text', text: written }]);
      expect(richNodes(translate('leadOff'))).toEqual([
        { kind: 'text', text: 'Lead is off in ' },
        { kind: 'tag', name: 'settings', children: [{ kind: 'text', text: 'Settings' }] },
        { kind: 'text', text: '.' }
      ]);
    });

    it('turns them into links, in the sentence as the language orders it', async () => {
      setUp('de', [provideRouter([]), { provide: APP_BASE_HREF, useValue: '/de/' }]);
      @Component({
        imports: [RichText],
        template: `<p><gc-rich [text]="message" [links]="{ settings: '/settings' }" /></p>`
      })
      class Host {
        readonly message = translate('leadOff');
      }
      const fixture = TestBed.createComponent(Host);
      await fixture.whenStable();
      const p = (fixture.nativeElement as HTMLElement).querySelector('p')!;
      expect(p.textContent).toBe('Blei ist in den Einstellungen ausgeschaltet.');
      expect(p.querySelector('a')?.getAttribute('href')).toBe('/de/settings');
      expect(p.querySelector('a')?.textContent).toBe('Einstellungen');
    });
  });

  describe('a zoneless page with signals', () => {
    @Component({
      imports: [TranslocoDirective],
      template: `<ng-container *transloco="let t"
        ><p>{{ t('materials', { count: count() }) }}</p>
        <p>{{ t('onlyEnglish') }}</p></ng-container
      >`
    })
    class Count {
      readonly count = signal(1);
    }

    it('writes messages as signals change, in the language, with English where none is translated yet', async () => {
      setUp('de');
      const fixture = TestBed.createComponent(Count);
      await fixture.whenStable();
      const text = () => [...(fixture.nativeElement as HTMLElement).querySelectorAll('p')].map((p) => p.textContent);
      expect(text()).toEqual(['1 Rohstoff', 'Only in English so far']);
      fixture.componentInstance.count.set(12);
      await fixture.whenStable();
      expect(text()).toEqual(['12 Rohstoffe', 'Only in English so far']);
    });

    it('is also there to code, as a signal', () => {
      const transloco = setUp('de');
      const count = signal(2);
      const label = TestBed.runInInjectionContext(() =>
        computed(() => transloco.translate('materials', { count: count() }))
      );
      expect(label()).toBe('2 Rohstoffe');
      count.set(1);
      expect(label()).toBe('1 Rohstoff');
    });
  });

  describe('the language from the URL', () => {
    it('reads it from the first part of the path, with English at the plain paths', () => {
      expect(languageOfPath('/de/recipe')).toBe('de');
      expect(languageOfPath('/pt-PT/guides/firing')).toBe('pt-PT');
      expect(languageOfPath('/recipe')).toBe('en');
      expect(languageOfPath('/')).toBe('en');
      expect(languageOfPath('/en/recipe')).toBe('en');
      expect(languageOfPath('/xx/recipe')).toBe('en');
      expect(baseHrefFor('de')).toBe('/de/');
      expect(baseHrefFor('en')).toBe('/');
    });

    it('opens the same page in another language', () => {
      expect(pathIn('fr', '/de/recipe', '?id=1')).toBe('/fr/recipe?id=1');
      expect(pathIn('en', '/de/guides/firing')).toBe('/guides/firing');
      expect(pathIn('de', '/guides/firing')).toBe('/de/guides/firing');
      expect(pathIn('de', '/de')).toBe('/de/');
    });

    it("loads a page's own messages before it opens, and its links stay in the language", async () => {
      @Component({
        imports: [TranslocoDirective, RouterLink],
        template: `<ng-container *transloco="let t; prefix: 'example'"
          ><h1>{{ t('title') }}</h1>
          <a routerLink="/recipe">{{ t('open') }}</a></ng-container
        >`
      })
      class TrialPage {}
      setUp('de', [
        provideRouter([
          {
            path: 'example',
            providers: [provideTranslocoScope('example')],
            resolve: { translations: scopeTranslations },
            component: TrialPage
          }
        ]),
        { provide: APP_BASE_HREF, useValue: '/de/' }
      ]);
      const { RouterTestingHarness } = await import('@angular/router/testing');
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/example');
      const page = harness.routeNativeElement!;
      expect(page.querySelector('h1')?.textContent).toBe('Eine eigene Seite');
      expect(page.querySelector('a')?.getAttribute('href')).toBe('/de/recipe');
      expect(TestBed.inject(Router).url).toBe('/example');
      // Code on the page reads the same messages.
      expect(translate('example.open')).toBe('Rezept öffnen');
    });
  });

  describe('pseudo-locales', () => {
    it('accents and lengthens every message, keeping placeholders, plurals and tags', () => {
      expect(pseudoMessage('Save recipe', 'en-XA')).toBe('[Šåṽé ŕéçîþé ····]');
      const plural = pseudoMessage('{count, plural, one {# material} other {# materials}} in <b>{name}</b>', 'en-XA');
      expect(plural).toMatch(/^\[\{count,plural,one\{# ɱåţéŕîåļ\} other\{# ɱåţéŕîåļš\}\} îñ <b>\{name\}<\/b> ·+\]$/);
      const transpiler = new IcuTranspiler();
      transpiler.onLangChanged('en-XA');
      expect(
        transpiler.transpile({ value: plural, params: { count: 2, name: 'Custer' }, translation: {}, key: 'x' })
      ).toMatch(/^\[2 ɱåţéŕîåļš îñ bCusterb ·+\]$/);
    });

    it('sets text right to left for a mirrored page', () => {
      expect(pseudoMessage('Save {name}', 'ar-XB')).toBe('‮Save ‬{name}');
      expect(pseudoTranslation({ a: { b: 'Hi' } }, 'ar-XB')).toEqual({ a: { b: '‮Hi‬' } });
    });
  });
});
