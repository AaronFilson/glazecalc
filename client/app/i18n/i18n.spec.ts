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
import { languageOfTag } from '../../../lib/regions/languages';
import { formatLocale } from '../shared/format';
import { IcuTranspiler } from './icu-transpiler';
import { baseHrefFor, languageOfPath, pathIn } from './language';
import { MissingKey } from './missing';
import { scopeTranslations } from './provide-i18n';
import { pseudoMessage, pseudoText, pseudoTranslation } from './pseudo';
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

    it('shows an apostrophe written twice as one, in plain text too', () => {
      // As npm run i18n:sources writes the data's words for translators (safety/de.json).
      expect(write('de', "Provence-Alpes-Côte d''Azur, Corse", {})).toBe("Provence-Alpes-Côte d'Azur, Corse");
      expect(write('en', "Don't poison your family", {})).toBe("Don't poison your family");
      expect(write('en', "'{'braces'}' and d''Azur for {name}", { name: 'Ana' })).toBe("{braces} and d'Azur for Ana");
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

    it("finds the language offered that a browser's tag asks for, Chinese by its script", () => {
      const offered = ['en', 'de', 'pt-PT', 'zh-Hans', 'zh-Hant', 'en-XA'];
      for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN']) {
        expect(languageOfTag(tag, offered), tag).toBe('zh-Hant');
      }
      for (const tag of ['zh-CN', 'zh-SG', 'zh', 'zh-Hans-TW']) {
        expect(languageOfTag(tag, offered), tag).toBe('zh-Hans');
      }
      expect(['de-AT', 'pt-BR', 'en-GB'].map((tag) => languageOfTag(tag, offered))).toEqual(['de', 'pt-PT', 'en']);
      // Nothing that fits, and no pseudo-locale, ever.
      expect(['ja-JP', 'not a tag', ''].map((tag) => languageOfTag(tag, offered))).toEqual([null, null, null]);
      expect(languageOfTag('en-US', ['en-XA'])).toBeNull();
    });

    it('finds pt-BR and es-419 once they are offered, and the older fallbacks until then', () => {
      // es-US reads es-419 where it is offered (the owner's decision of 2026-11-01); Spain's es stays offered.
      const latam = ['es-MX', 'es-AR', 'es-CL', 'es-CO', 'es-PE', 'es-419', 'es-US'];
      const other = ['es', 'es-ES', 'es-GQ'];
      const brazil = ['pt-BR'];
      const portugal = ['pt', 'pt-PT', 'pt-AO', 'pt-MZ'];
      const all = [...latam, ...other, ...brazil, ...portugal];
      const ask = (offered: string[]) => all.map((tag) => languageOfTag(tag, offered));
      const live = (offered: string[], es: string, es419: string, pt: string, ptBR: string) =>
        expect(ask(offered)).toEqual([
          ...latam.map(() => es419),
          ...other.map(() => es),
          ...brazil.map(() => ptBR),
          ...portugal.map(() => pt)
        ]);
      // Neither offered: Latin American Spanish reads es and Brazil pt-PT.
      live(['en', 'es', 'pt-PT'], 'es', 'es', 'pt-PT', 'pt-PT');
      // Live, in either order.
      live(['en', 'es', 'pt-PT', 'es-419', 'pt-BR'], 'es', 'es-419', 'pt-PT', 'pt-BR');
      live(['en', 'pt-BR', 'es-419', 'pt-PT', 'es'], 'es', 'es-419', 'pt-PT', 'pt-BR');
      // Only one of each pair offered: it is the one chosen.
      live(['en', 'es-419', 'pt-BR'], 'es-419', 'es-419', 'pt-BR', 'pt-BR');
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

    it('writes every message in Japanese characters, shorter and with no spaces, by Japanese plural rules', () => {
      const save = pseudoMessage('Save recipe', 'ja-XC');
      expect(save).toMatch(/^「[\u3040-\u30ff\u4e00-\u9fff]{5}」$/);
      expect(pseudoMessage('Save recipe', 'ja-XC')).toBe(save);
      expect(pseudoMessage('Saved. Fire it, then look.', 'ja-XC')).toMatch(
        /^「[^\sA-Za-z.,]+。[^\sA-Za-z.,]+、[^\sA-Za-z]+。」$/
      );
      const plural = pseudoMessage('{count, plural, one {# material} other {# materials}} in <b>{name}</b>', 'ja-XC');
      expect(plural).toMatch(/^「\{count,plural,one\{#[^\s{}]+\} other\{#[^\s{}]+\}\}[^\s<]+<b>\{name\}<\/b>」$/);
      const transpiler = new IcuTranspiler();
      transpiler.onLangChanged('ja-XC');
      // Japanese has one plural form, so even 1 takes "other".
      const one = transpiler.transpile({
        value: plural,
        params: { count: 1, name: 'Custer' },
        translation: {},
        key: 'x'
      });
      const materials = /other\{#([^}]+)\}/.exec(plural)![1]!;
      // The tag's markers are not letters.
      expect(one).toMatch(/^「1[^\sA-Za-z]+b[^\sA-Za-z]*Custer[^\sA-Za-z]*b[^\sA-Za-z]*」$/);
      expect(one).toContain('1' + materials);
    });

    it('writes every message in Arabic letters, with all six of Arabic plural forms', () => {
      expect(pseudoMessage('Save recipe', 'ar-XD')).toBe('سافي ريكيبي');
      // Arabic's comma and question mark; what a translation keeps in Latin stays so.
      expect(pseudoMessage('Fire it, then look? SK 8, 1240 °C, {amount} g of K2O in Glazecalc.', 'ar-XD')).toBe(
        'فيري يت، تهين لووك؟ SK 8، 1240 °C، {amount} g وف K2O ين Glazecalc.'
      );
      expect(pseudoMessage('Fire to SK cones (JIS R 8101), cone 6.', 'ar-XD')).toBe(
        'فيري تو SK كونيس (JIS R 8101)، كوني 6.'
      );
      const plural = pseudoMessage('{count, plural, one {# material} other {# materials}} in <b>{name}</b>', 'ar-XD');
      for (const form of ['zero', 'one', 'two', 'few', 'many', 'other']) expect(plural).toContain(`${form}{# `);
      const transpiler = new IcuTranspiler();
      transpiler.onLangChanged('ar-XD');
      for (const count of [0, 1, 2, 3, 11, 100]) {
        const text = transpiler.transpile({
          value: plural,
          params: { count, name: 'Custer' },
          translation: {},
          key: 'x'
        });
        expect(text).toMatch(/^\S+ ماتيريال(س)? ين \S*Custer\S*$/);
      }
    });

    it('writes every message in Devanagari, stacked and marked above and below, with a danda for a full stop', () => {
      const save = pseudoMessage('Save recipe.', 'hi-XE');
      expect(save).toBe('र्सावेँ रेचिपेँ।');
      expect(pseudoMessage('Batch', 'hi-XE')).toBe('र्बाट्ठचहृँ');
      expect(pseudoMessage('LOI of SiO2 in {unit}', 'hi-XE')).toBe('LOI ओफ़ृँ SiO2 इनृँ {unit}');
      // Web addresses stay as they are, in a guide's text too.
      expect(pseudoText('See https://example.com/a-b or www.glazy.org.', 'hi-XE')).toBe(
        'र्सेएँ https://example.com/a-b ओरृँ www.glazy.org.'
      );
    });

    it('writes every message in Tamil or Kannada, from one table of letters per script, with the full stop kept', () => {
      // A capital takes the script's capital mark, a bare last consonant its mark below, every word a mark over its end.
      expect(pseudoMessage('Save recipe.', 'ta-XF')).toBe('ஸ்ரீஸாவெஃ ரெசிப்பெஃ.');
      expect(pseudoMessage('Batch', 'ta-XF')).toBe('ஸ்ரீபாத்தசஹூஃ');
      expect(pseudoMessage('Save recipe.', 'kn-XG')).toBe('ರ್ಸ್ಸಾವೆಂ ರೆಚಿಪ್ರೆಂ.');
      // Latin that a translation keeps, and web and email addresses, stay as they are.
      expect(pseudoMessage('Write to privacy@glazecalcapp.com or see the page', 'kn-XG')).toContain(
        ' privacy@glazecalcapp.com '
      );
      expect(pseudoMessage('Fire to 1240 °C, {amount} g of K2O.', 'kn-XG')).toBe(
        'ರ್ಫಿರೆಂ ತ್ತೊಂ 1240 °C, {amount} g ಒಫೃಂ K2O.'
      );
      expect(pseudoText('See https://example.com/a-b or www.glazy.org.', 'ta-XF')).toContain(
        ' https://example.com/a-b '
      );
      // No letter of the English is left, and the word's letters are the script's alone.
      const tamil = pseudoMessage('Glaze the whole batch with a brush', 'ta-XF');
      const kannada = pseudoMessage('Glaze the whole batch with a brush', 'kn-XG');
      expect(tamil).toMatch(/^[\u0b80-\u0bff ]+$/);
      expect(kannada).toMatch(/^[\u0c80-\u0cff ]+$/);
      // Devanagari's table still gives what it did.
      expect(pseudoMessage('Batch', 'hi-XE')).toBe('र्बाट्ठचहृँ');
    });

    it('writes every message in Malayalam, each word longer for its case ending with a chillu letter', () => {
      expect(pseudoMessage('Save recipe.', 'ml-XH')).toBe('ശ്രീശാവെങ്ങളിൽ രെച്ചിപ്പെങ്ങളിൽ.');
      expect(pseudoMessage('Batch', 'ml-XH')).toBe('ശ്രീബാട്ടച്ചഹൃങ്ങളിൽ');
      expect(pseudoMessage('Fire to 1240 °C, {amount} g of K2O.', 'ml-XH')).toBe(
        'ശ്രീഫിരെങ്ങളിൽ ട്ടൊങ്ങളിൽ 1240 °C, {amount} g ഒഫൃങ്ങളിൽ K2O.'
      );
      const malayalam = pseudoMessage('Glaze the whole batch with a brush', 'ml-XH');
      expect(malayalam).toMatch(/^[ഀ-ൿ ]+$/);
      // Its chillu is the single character (U+0D7D), with no joiner; and it has about 40% more letters than the English.
      expect(malayalam).toContain('ൽ');
      expect(malayalam).not.toMatch(/[‌‍]/);
      const letters = [...new Intl.Segmenter('ml', { granularity: 'grapheme' }).segment(malayalam)].length;
      expect(letters / 'Glaze the whole batch with a brush'.length).toBeGreaterThan(1.3);
      // Malayalam's `one` is for 1 alone.
      const transpiler = new IcuTranspiler();
      transpiler.onLangChanged('ml-XH');
      const message = pseudoMessage('{count, plural, one {# material} other {# materials}}', 'ml-XH');
      const shown = (count: number) =>
        transpiler.transpile({ value: message, params: { count }, translation: {}, key: 'x' }) as string;
      expect(shown(0).slice(1)).toBe(shown(2).slice(1));
      expect(shown(1).slice(1)).not.toBe(shown(2).slice(1));
    });

    it("gives the pseudo-Kannada Kannada's plural rules, where one is for 0 as well as 1, and the pseudo-Tamil Tamil's", () => {
      const message = pseudoMessage('{count, plural, one {# material} other {# materials}}', 'kn-XG');
      const kannada = new IcuTranspiler();
      kannada.onLangChanged('kn-XG');
      const shown = (count: number) =>
        kannada.transpile({ value: message, params: { count }, translation: {}, key: 'x' }) as string;
      expect(shown(0)).toBe(shown(1).replace(/^1/, '0'));
      expect(shown(2).slice(1)).not.toBe(shown(1).slice(1));
      // Tamil, like English, takes 0 as "other".
      const tamil = new IcuTranspiler();
      tamil.onLangChanged('ta-XF');
      const tamilMessage = pseudoMessage('{count, plural, one {# material} other {# materials}}', 'ta-XF');
      const tamilShown = (count: number) =>
        tamil.transpile({ value: tamilMessage, params: { count }, translation: {}, key: 'x' }) as string;
      expect(tamilShown(0).slice(1)).toBe(tamilShown(2).slice(1));
      expect(tamilShown(1).slice(1)).not.toBe(tamilShown(2).slice(1));
    });
  });
});
