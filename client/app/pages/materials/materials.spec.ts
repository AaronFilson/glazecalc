import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  Routes,
  convertToParamMap,
  provideRouter
} from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { filter, of } from 'rxjs';
import { textKey } from '../../../../lib/regions/languages';
import { ORTON, SK } from '../../../../lib/cones';
import { AuthService } from '../../core/auth.service';
import { Material } from '../../core/models';
import { PendingRecipeService } from '../../core/pending-recipe.service';
import { signedInGuard } from '../../core/signed-in.guard';
import { useCodedMessages } from '../../i18n/coded';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { API, httpMock, settle, skippedHeadings, testProviders } from '../../testing/test-providers';
import { ConesPage } from './cones-page';
import { MaterialInfoPage, analysisOf, equivalentKind, hasFlux } from './material-info-page';
import {
  knownMaterial,
  materialDescriptionKey,
  materialOf,
  materialTitleParams,
  materialWords
} from './material-route';
import { MaterialsPage } from './materials-page';
import { REFERENCE_LANGUAGE_LIST } from './reference-text';
import { STANDARD_MATERIALS, materialBySlug, materialNamed, materialPath, materialSlug } from './standard-materials';

// The public pages for the standard materials and the cone chart: drawn from the data the app has,
// and nothing else.

const named = (name: string) => STANDARD_MATERIALS.find((material) => material.name === name)!;

describe('the standard materials', () => {
  it("are data/materials.ndjson's, each with a page address of its own", () => {
    expect(STANDARD_MATERIALS.length).toBeGreaterThan(100);
    const slugs = STANDARD_MATERIALS.map((material) => materialSlug(material.name));
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const material of STANDARD_MATERIALS) {
      expect(material.ownedBy).toBe('Standard');
      expect(material._id).toMatch(/^[0-9a-f]{24}$/);
      expect(materialBySlug(materialSlug(material.name))).toBe(material);
    }
  });

  it('are found by their address, or by another name that has a page', () => {
    expect(materialBySlug('silica')?.name).toBe('Silica');
    expect(materialBySlug('no-such-material')).toBeUndefined();
    expect(materialBySlug(undefined)).toBeUndefined();
    expect(materialPath(named('Ferro Frit 3134'))).toBe('/materials/ferro-frit-3134');
    expect(materialNamed('Fusion Frit F-12')?.name).toBe('Fusion Frit F-12');
    expect(materialNamed('Not a material')).toBeUndefined();
  });

  it('give each its analysis and unity as Glazecalc works them out', () => {
    const barium = analysisOf(named('Barium Carbonate'));
    expect(barium.rows).toEqual([{ oxide: 'BaO', amount: '1', unity: expect.closeTo(1, 6) }]);
    expect(barium.weights?.equivalent).toBeCloseTo(197.33, 1);
    expect(barium.weights?.loi).toBeCloseTo(22.3, 0);
    const frit = analysisOf(named('Ferro Frit 3134'));
    expect(frit.rows.map((row) => row.oxide)).toEqual(['SiO2', 'B2O3', 'Na2O', 'CaO', 'Al2O3']);
    // 1.0 mole of flux: Na2O and CaO.
    const unity = Object.fromEntries(frit.rows.map((row) => [row.oxide, row.unity!]));
    expect(unity['Na2O']! + unity['CaO']!).toBeCloseTo(1, 3);
    // Every material has an analysis, so no page has to say it could not be worked out.
    for (const material of STANDARD_MATERIALS) expect(analysisOf(material).weights, material.name).not.toBeNull();
  });

  it('know whether a material has a flux to base its unity on', () => {
    expect(hasFlux(named('Whiting'))).toBe(true);
    expect(hasFlux(named('Silica'))).toBe(false);
  });
});

describe("a standard material's route", () => {
  const route = (slug: string) => ({ paramMap: convertToParamMap({ slug }) }) as unknown as ActivatedRouteSnapshot;

  it('matches a standard material only, so any other address is the not-found page', async () => {
    const matches = (segments: Array<{ path: string }>) =>
      TestBed.runInInjectionContext(() => knownMaterial({} as never, segments as never, {} as never));
    expect(await matches([{ path: 'materials' }, { path: 'silica' }])).toBe(true);
    expect(await matches([{ path: 'materials' }, { path: 'nope' }])).toBe(false);
    expect(await matches([{ path: 'materials' }])).toBe(false);
  });

  it("loads only this material's words in a translated language, as materials.<key>, and none in English", async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [...testProviders(), { provide: REFERENCE_LANGUAGE_LIST, useValue: ['en', 'de'] }]
    });
    const transloco = TestBed.inject(TranslocoService);
    const run = () =>
      TestBed.runInInjectionContext(() =>
        (materialWords as (r: ActivatedRouteSnapshot, s: never) => Promise<boolean>)(route('silica'), {} as never)
      );
    expect(await run()).toBe(true);
    httpMock().expectNone(() => true);
    transloco.setActiveLang('de');
    const done = run();
    await Promise.resolve();
    httpMock().expectOne('/i18n/materials/de/silica.json').flush({ 'silica-abc': 'Quarzmehl' });
    expect(await done).toBe(true);
    expect(transloco.getTranslation('de')['materials.silica-abc']).toBe('Quarzmehl');
    transloco.setActiveLang('en');
  });

  it("gives the title and description the material's name, the longer description to a short name", async () => {
    const resolve = <T>(fn: unknown, slug: string) =>
      TestBed.runInInjectionContext(() =>
        (fn as (r: ActivatedRouteSnapshot, s: never) => Promise<T>)(route(slug), {} as never)
      );
    expect((await resolve<{ name: string }>(materialTitleParams, 'ferro-frit-3134')).name).toBe('Ferro Frit 3134');
    expect((await resolve<{ name: string }>(materialOf, 'silica')).name).toBe('Silica');
    expect(await resolve(materialDescriptionKey, 'silica')).toBe('meta.materialInfoLong');
    expect(await resolve(materialDescriptionKey, 'natronfeldspat-lf-90-la-75-sibelco-germany')).toBe(
      'meta.materialInfo'
    );
  });
});

describe('the page of a standard material', () => {
  beforeEach(() => localStorage.clear());

  /** A page of the material, as its route opens it; a test may open more than one. */
  const render = async (
    name: string | Material,
    language = 'en',
    translated: readonly string[] = ['en'],
    routes: Routes = []
  ) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        provideRouter(routes),
        { provide: PAGE_LANGUAGE, useValue: language },
        { provide: REFERENCE_LANGUAGE_LIST, useValue: translated },
        { provide: ActivatedRoute, useValue: { data: of({ material: typeof name === 'string' ? named(name) : name }) } }
      ]
    });
    const fixture = TestBed.createComponent(MaterialInfoPage);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };

  it('links the materials it is like or replaces that have a page of their own, and names the others', async () => {
    const { page } = await render({
      ...named('Minspar 200'),
      substitutes: ['Custer Spar', 'Chromium Oxide'],
      replaces: ['Kona F-4 Feldspar', 'Old Hill Spar']
    });
    const said = (term: string) => {
      const dt = [...page.querySelectorAll('.facts dt')].find((one) => one.textContent?.trim() === term)!;
      const dd = dt.nextElementSibling!;
      return {
        // As the line reads: each name followed straight by its comma.
        text: dd.textContent?.replace(/\s+/g, ' ').trim(),
        links: [...dd.querySelectorAll('a')].map((a) => a.getAttribute('href'))
      };
    };
    expect(said('Similar materials')).toEqual({
      text: 'Custer Spar, Chromium Oxide',
      links: ['/materials/custer-spar']
    });
    expect(said('Replaces')).toEqual({
      text: 'Kona F-4 Feldspar, Old Hill Spar',
      links: ['/materials/kona-f-4-feldspar']
    });
  });

  it('says so where a record has no hazard statement, or an analysis Glazecalc cannot work out', async () => {
    const { page } = await render({ ...named('Silica'), hazards: undefined, loi: 120 });
    const section = (id: string) => page.querySelector('#' + id)!.closest('section')!.textContent;
    expect(section('hazards')).toContain('The library has no hazard statement for this material.');
    expect(section('analysis')).toContain('Glazecalc could not work out an analysis for this material.');
    expect(analysisOf({ ...named('Silica'), loi: 120 }).weights).toBeNull();
  });

  it('says what the record says, shows the analysis and unity, and the hazards with links to the safety guides', async () => {
    const { fixture, page } = await render('Ferro Frit 3134');
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Ferro Frit 3134');
    expect(page.querySelector('#about')?.closest('section')?.textContent).toContain('Vibrantz Technologies');
    expect(page.querySelector('#about')?.closest('section')?.textContent).toContain('Frit 3134-2');
    // A similar material that has a page is a link to it.
    expect(page.querySelector<HTMLAnchorElement>('#about ~ dl a')?.getAttribute('href')).toBe(
      '/materials/fusion-frit-f-12'
    );
    const rows = [...page.querySelectorAll('#analysis ~ div table tbody tr')].map((tr) =>
      [...tr.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim())
    );
    expect(rows).toEqual([
      ['SiO₂', '45.56', '1.482'],
      ['B₂O₃', '22.79', '0.640'],
      ['Na₂O', '10.14', '0.320'],
      ['CaO', '19.51', '0.680'],
      ['Al₂O₃', '2', '0.038']
    ]);
    expect(
      [...page.querySelectorAll('#analysis ~ dl dt, #analysis ~ dl dd')].map((item) => item.textContent?.trim())
    ).toEqual(['Equivalent weight', '195.5', 'Fired weight', '195.5', 'Loss on ignition', '0%']);
    const hazards = page.querySelector('#hazards')!.closest('section')!;
    expect(hazards.textContent).toContain('Hazards: Non-hazardous glass powder per supplier SDS');
    expect([...hazards.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/guides/safe-mixing',
      '/guides/home-safety'
    ]);
    expect(page.querySelector<HTMLAnchorElement>('#use ~ p a.btn-primary')?.getAttribute('href')).toBe('/recipe');
    expect(skippedHeadings(fixture)).toEqual([]);
  });

  it('is a table that scrolls on its own and is named, so the page never scrolls sideways', async () => {
    const { page } = await render('Silica');
    const scroll = page.querySelector('.guide-table-scroll');
    expect(scroll?.getAttribute('role')).toBe('region');
    expect(scroll?.getAttribute('tabindex')).toBe('0');
    expect(scroll?.getAttribute('aria-label')).toBe('Oxides in Silica');
  });

  // "Per formula as written" was false for a material given by an analysis: its unity is per the 100 g it is for.
  it('says when a material has no flux, so its unity is per formula as written, or per 100 g for an analysis', async () => {
    const said = async (name: string) =>
      (await render(name)).page.querySelector('#analysis')?.closest('section')?.textContent;
    expect(await said('Silica')).toContain(
      'Silica has no flux oxide, so its unity contribution is per formula as written.'
    );
    const analysis = await said('Alumina Hydrate');
    expect(analysis).toContain(
      'Alumina Hydrate has no flux oxide, so its unity contribution is per 100 g, the amount its analysis is given for.'
    );
    expect(analysis).not.toContain('per formula as written');
    expect((await render('Whiting')).page.textContent).not.toContain('has no flux oxide');
  });

  // "The grams that hold 1.0 mole of flux" was false where there is no flux, and misleading where there is little.
  it('says what the equivalent weight is: per mole of flux, large for little flux, per formula or 100 g for none', async () => {
    const shown = async (name: string) => {
      const { page } = await render(name);
      return {
        note: page.querySelector('#analysis ~ p.muted')?.textContent?.trim(),
        equivalent: page.querySelector('#analysis ~ dl dd')?.textContent?.trim()
      };
    };
    const fired = 'The fired weight is what is left of that after firing.';
    expect(await shown('Whiting')).toEqual({
      note: `The equivalent weight is the grams of Whiting that hold 1.0 mole of flux. ${fired}`,
      equivalent: '100.08'
    });
    expect(await shown('EPK Kaolin')).toEqual({
      note:
        'The equivalent weight is the grams of EPK Kaolin that hold 1.0 mole of flux. EPK Kaolin has little flux, so ' +
        `its equivalent weight is large, and so are its unity contributions. ${fired}`,
      equivalent: '9840.14'
    });
    expect(await shown('Silica')).toEqual({
      note: `Silica has no flux, so its equivalent weight is the weight in grams of its formula as written. ${fired}`,
      equivalent: '60.08'
    });
    expect(await shown('Alumina Hydrate')).toEqual({
      note: `Alumina Hydrate has no flux, so its equivalent weight is 100 g, the amount its analysis is given for. ${fired}`,
      equivalent: '100'
    });
    // A frit or a flux never reads as one with little flux, or none.
    for (const material of STANDARD_MATERIALS.filter((m) => m.category === 'frit' || m.category === 'flux')) {
      expect(equivalentKind(material, analysisOf(material).weights!), material.name).toBe('flux');
    }
  });

  it('says a material has lead, and when it is no longer sold', async () => {
    const { page } = await render('Litharge');
    expect(page.querySelector('#hazards')?.closest('section')?.textContent).toContain(
      'This material contains lead oxide (PbO).'
    );
    const { page: old } = await render('Cornwall Stone');
    expect(old.querySelector('#about ~ dl')?.textContent).toContain('Discontinued 2006');
  });

  it('notes in another language that the page is in English, as the guide in English only does', async () => {
    expect((await render('Silica')).page.textContent).not.toContain('not translated yet');
    expect((await render('Silica', 'de')).page.textContent).toContain(
      'This page is not translated yet, so it is shown in English.'
    );
  });

  describe('in a language the reference pages are translated into', () => {
    /** The page in German, with the translations given (materials/de, as the app loads them). */
    const german = async (name: string, translations: Record<string, string>, translated = ['en', 'de']) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ...testProviders(),
          provideRouter([]),
          { provide: PAGE_LANGUAGE, useValue: 'de' },
          { provide: REFERENCE_LANGUAGE_LIST, useValue: translated },
          { provide: ActivatedRoute, useValue: { data: of({ material: named(name) }) } }
        ]
      });
      const transloco = TestBed.inject(TranslocoService);
      transloco.setTranslation(
        Object.fromEntries(Object.entries(translations).map(([text, de]) => ['materials.' + textKey(text), de])),
        'de'
      );
      transloco.setActiveLang('de');
      useCodedMessages(transloco);
      const fixture = TestBed.createComponent(MaterialInfoPage);
      await fixture.whenStable();
      return fixture.nativeElement as HTMLElement;
    };
    afterEach(() => {
      useCodedMessages(null);
      TestBed.inject(TranslocoService).setActiveLang('en');
    });

    it('shows the notes and the hazards translated, with no notice that it is in English', async () => {
      const frit = named('Ferro Frit 3134');
      const page = await german('Ferro Frit 3134', {
        [[frit.notes!].flat()[0]!]: 'Eine deutsche Anmerkung.',
        [frit.hazards!]: 'Ungefährliches Glaspulver laut Sicherheitsdatenblatt'
      });
      expect(page.querySelector('#about')?.closest('section')?.textContent).toContain('Eine deutsche Anmerkung.');
      expect(page.querySelector('#hazards')?.closest('section')?.textContent).toContain(
        'Ungefährliches Glaspulver laut Sicherheitsdatenblatt'
      );
      expect(page.textContent).not.toContain('not translated yet');
      // The record's trade names and formulas are exactly as written.
      expect(page.querySelector('h1')?.textContent?.trim()).toBe('Ferro Frit 3134');
      expect(page.querySelector('#about')?.closest('section')?.querySelector('dd[translate="no"]')).not.toBeNull();
    });

    it('shows a note with no translation in English, marked as such, beside the translated ones', async () => {
      const frit = named('Ferro Frit 3134');
      const page = await german('Ferro Frit 3134', { [frit.hazards!]: 'Ungefährlich' });
      const notes = [...page.querySelectorAll('#about ~ p')];
      const english = [frit.notes!].flat();
      expect(notes.length).toBe(english.length);
      for (const note of notes) expect(note.getAttribute('lang')).toBe('en');
      expect(notes[0]?.textContent?.trim()).toBe(english[0]);
      // The translated hazards are not marked.
      expect(page.querySelector('#hazards')?.closest('section')?.querySelector('[lang="en"]')).toBeNull();
    });

    it('says "Theoretical formula" in German for the materials whose source it is', async () => {
      const theoretical = STANDARD_MATERIALS.find((m) => m.source?.name === 'Theoretical formula')!;
      const page = await german(theoretical.name, { 'Theoretical formula': 'Theoretische Formel' });
      expect(page.querySelector('#about')?.closest('section')?.textContent).toContain('Theoretische Formel');
    });

    it('stays English with the notice in a language not among them, translations or not', async () => {
      const frit = named('Ferro Frit 3134');
      const page = await german('Ferro Frit 3134', { [frit.hazards!]: 'Ungefährlich' }, ['en']);
      expect(page.textContent).toContain('This page is not translated yet, so it is shown in English.');
      expect(page.querySelector('#hazards')?.closest('section')?.textContent).toContain(frit.hazards!);
      expect(page.querySelector('[lang="en"]')).toBeNull();
    });
  });

  describe('its buttons, for a visitor who comes from a search', () => {
    /** The page with the visitor signed in or not; the trial and the move to the recipe page are watched. */
    const opened = async (session: boolean, trialFails = false) => {
      const { fixture, page } = await render('Silica');
      const auth = TestBed.inject(AuthService);
      vi.spyOn(auth, 'whenChecked').mockResolvedValue(undefined as never);
      vi.spyOn(auth, 'hasSession').mockReturnValue(session);
      const startTrial = vi
        .spyOn(auth, 'startTrial')
        .mockImplementation(() => (trialFails ? Promise.reject(new Error('down')) : Promise.resolve()));
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      return { fixture, page, startTrial, navigate };
    };
    const click = async (page: HTMLElement, init: MouseEventInit = {}) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
      page.querySelector<HTMLAnchorElement>('#material-try')!.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve));
      return event;
    };

    it('opens a new recipe with the material in it, starting a trial without asking when not signed in', async () => {
      const { page, startTrial, navigate } = await opened(false);
      expect(page.querySelector('#material-try')?.getAttribute('href')).toBe('/recipe');
      const event = await click(page);
      expect(event.defaultPrevented).toBe(true);
      expect(startTrial).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith('/recipe');
      const recipe = TestBed.inject(PendingRecipeService).take()!;
      expect(recipe.title).toBe('Silica');
      expect(recipe.materials).toEqual([expect.objectContaining({ name: 'Silica', amount: '', ownedBy: 'Standard' })]);
    });

    it('starts no trial for someone signed in, and still opens the recipe when a trial cannot start', async () => {
      const signedIn = await opened(true);
      await click(signedIn.page);
      expect(signedIn.startTrial).not.toHaveBeenCalled();
      expect(signedIn.navigate).toHaveBeenCalledWith('/recipe');
      const failing = await opened(false, true);
      await click(failing.page);
      // The recipe page's guard asks for a sign-in, with the recipe waiting.
      expect(failing.navigate).toHaveBeenCalledWith('/recipe');
      expect(TestBed.inject(PendingRecipeService).take()?.materials?.[0]?.name).toBe('Silica');
    });

    it('takes a visitor to the recipe page in their trial without passing the sign-in page', async () => {
      @Component({ selector: 'gc-test-recipe', template: '' })
      class Stand {}
      const { page } = await render(
        'Silica',
        'en',
        ['en'],
        [
          { path: 'recipe', canActivate: [signedInGuard], component: Stand },
          { path: 'signin', component: Stand }
        ]
      );
      const shown: string[] = [];
      TestBed.inject(Router)
        .events.pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event) => shown.push(event.urlAfterRedirects));
      await click(page);
      // While the trial starts, the page stays as it is.
      expect(shown).toEqual([]);
      httpMock()
        .expectOne({ method: 'POST', url: API + '/guest' })
        .flush({ guest: true, name: 'quiet kilns', expiresAt: '2099-01-01T00:00:00.000Z' });
      await settle();
      await settle();
      expect(shown).toEqual(['/recipe']);
    });

    it('opens the recipe once when pressed twice', async () => {
      const { page, startTrial, navigate } = await opened(false);
      const button = page.querySelector<HTMLAnchorElement>('#material-try')!;
      button.click();
      button.click();
      await settle();
      expect(startTrial).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith('/recipe');
    });

    it('leaves a click for a new tab to the link', async () => {
      const { page, startTrial, navigate } = await opened(false);
      const event = await click(page, { ctrlKey: true });
      expect(event.defaultPrevented).toBe(false);
      expect(startTrial).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('offers to sign up below it, coming back to this page, and links the guides for a beginner', async () => {
      const { page } = await render('Silica');
      const signup = page.querySelector<HTMLAnchorElement>('#material-signup')!;
      expect(signup.textContent?.trim()).toBe('Create a free account');
      expect(signup.getAttribute('href')).toBe('/signup?next=%2Fmaterials%2Fsilica');
      const use = page.querySelector('#use')!.closest('section')!;
      expect(
        [...use.querySelectorAll('.guide-links a')].map((a) => [a.getAttribute('href'), a.textContent?.trim()])
      ).toEqual([
        ['/guides/glazing-basics', 'Glazing from first principles'],
        ['/guides/making-a-glaze', 'How to make a glaze']
      ]);
    });
  });

  it('writes its data for search engines in its own language where translated: a web page and its trail', async () => {
    await render('Silica', 'de', ['en', 'de']);
    const german = JSON.parse(document.head.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(german['@graph'][0]).toMatchObject({
      inLanguage: 'de',
      url: 'https://glazecalcapp.com/de/materials/silica'
    });
    expect(german['@graph'][1].itemListElement[0].item).toBe('https://glazecalcapp.com/de/');
    await render('Silica', 'de', ['en']);
    const english = JSON.parse(document.head.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(english['@graph'][0]).toMatchObject({ inLanguage: 'en', url: 'https://glazecalcapp.com/materials/silica' });
  });

  it('writes its data for search engines: a web page and its trail', async () => {
    await render('Ferro Frit 3134');
    const block = JSON.parse(document.head.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(block['@graph'][0]).toMatchObject({
      '@type': 'WebPage',
      name: 'Ferro Frit 3134: oxide analysis and hazards',
      url: 'https://glazecalcapp.com/materials/ferro-frit-3134',
      inLanguage: 'en'
    });
    expect(block['@graph'][1].itemListElement.map((item: { name: string }) => item.name)).toEqual([
      'Glazecalc',
      'Materials',
      'Ferro Frit 3134'
    ]);
  });
});

describe('the list of standard materials', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [...testProviders(), provideRouter([])] });
  });

  it('links every material, by kind, and says how many there are', async () => {
    const fixture = TestBed.createComponent(MaterialsPage);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const links = [...page.querySelectorAll<HTMLAnchorElement>('.material-list a')].map((a) => a.getAttribute('href'));
    expect(links).toHaveLength(STANDARD_MATERIALS.length);
    expect(new Set(links)).toEqual(new Set(STANDARD_MATERIALS.map((material) => materialPath(material))));
    expect(page.querySelector('.lead-text')?.textContent).toContain(`The ${STANDARD_MATERIALS.length} materials`);
    expect([...page.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toContain('Frits');
    expect(skippedHeadings(fixture)).toEqual([]);
    // The safety guides, the signed-in page of your own materials and the cone chart.
    const others = [...page.querySelectorAll<HTMLAnchorElement>(':scope > p a')].map((a) => a.getAttribute('href'));
    expect(others).toEqual(['/guides/safe-mixing', '/guides/home-safety', '/material', '/cones']);
  });

  it('has the notice that it is in English only in a language it is not translated into', async () => {
    const notice = async (translated: string[]) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ...testProviders(),
          provideRouter([]),
          { provide: PAGE_LANGUAGE, useValue: 'de' },
          { provide: REFERENCE_LANGUAGE_LIST, useValue: translated }
        ]
      });
      const fixture = TestBed.createComponent(MaterialsPage);
      await fixture.whenStable();
      return (fixture.nativeElement as HTMLElement).querySelector('.guide-note') !== null;
    };
    expect(await notice(['en'])).toBe(true);
    expect(await notice(['en', 'de'])).toBe(false);
  });
});

describe('the cone chart', () => {
  beforeEach(() => {
    localStorage.clear();
    // A reader who fires in °C to Orton cones, which Settings can change.
    localStorage.setItem('temperature', 'C');
    localStorage.setItem('cones', 'orton');
    TestBed.configureTestingModule({ providers: [...testProviders(), provideRouter([])] });
  });

  const render = async () => {
    const fixture = TestBed.createComponent(ConesPage);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };

  it("shows Orton's cones 022 to 15 with the temperatures in the app's data, in both scales", async () => {
    const { fixture, page } = await render();
    const orton = [...page.querySelectorAll('#orton ~ .guide-table-scroll')][0]!;
    const table = [...orton.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim())
    );
    expect(table[0]).toEqual(['022', '600', '1112']);
    expect(table).toContainEqual(['10', '1305', '2381']);
    expect(table.at(-1)).toEqual(['15', '1431', '2608']);
    expect(table).toHaveLength(37);
    expect(orton.querySelector('caption')?.textContent).toContain('150 °C an hour (270 °F an hour)');
    // The cones above 15 are listed with no temperature, since no chart gives one.
    expect(page.querySelector('#orton')?.closest('section')?.textContent).toContain('16, 17, 18');
    expect(page.querySelector('#orton')?.closest('section')?.textContent).toContain('41, 42');
    expect(skippedHeadings(fixture)).toEqual([]);
  });

  it("shows Orton's own current figures in the reader's scale, with a dash where Orton prints none", async () => {
    const { page } = await render();
    const published = [...page.querySelectorAll('#orton ~ .guide-table-scroll')][1]!;
    const heads = [...published.querySelectorAll('thead th')].map((th) => th.textContent?.trim());
    expect(heads).toEqual([
      'Cone',
      'Self-supporting, 15 °C an hour',
      'Self-supporting, 60 °C an hour',
      'Self-supporting, 150 °C an hour',
      'Large, 60 °C an hour',
      'Large, 150 °C an hour'
    ]);
    const cell = (cone: string) =>
      [
        ...[...published.querySelectorAll('tbody tr')]
          .find((tr) => tr.querySelector('th')?.textContent?.trim() === cone)!
          .querySelectorAll('th, td')
      ]
        .map((item) => item.textContent?.trim())
        .join(' ');
    expect(cell('022')).toBe('022 – 586 590 – –');
    expect(cell('10')).toBe('10 1251 1285 1305 1282 1303');
    expect(published.querySelector('caption')?.textContent).toContain('temperatures in °C');
  });

  it('shows the SK cones with their nominal temperatures and what they are', async () => {
    const { page } = await render();
    const sk = page.querySelector('#sk')!.closest('section')!;
    const table = [...sk.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim())
    );
    expect(table[0]).toEqual(['022', '600', '1112']);
    expect(table).toContainEqual(['7', '1230', '2246']);
    expect(table.at(-1)).toEqual(['20', '1530', '2786']);
    expect(sk.textContent).toContain('JIS R 8101:1999');
    expect(sk.querySelector('caption')?.textContent).toContain('nominal melt-down temperatures');
  });

  it('puts the reader’s cones first and Fahrenheit first for a reader who uses it', async () => {
    const order = async () => [...(await render()).page.querySelectorAll('section h2')].map((h) => h.id);
    expect(await order()).toEqual(['orton', 'sk']);
    TestBed.resetTestingModule();
    localStorage.setItem('cones', 'sk');
    localStorage.setItem('temperature', 'F');
    TestBed.configureTestingModule({ providers: [...testProviders(), provideRouter([])] });
    const { page } = await render();
    expect([...page.querySelectorAll('section h2')].map((h) => h.id)).toEqual(['sk', 'orton']);
    const head = [...page.querySelectorAll('#sk ~ .guide-table-scroll thead th')].map((th) => th.textContent?.trim());
    expect(head).toEqual(['Cone', '°F', '°C']);
    expect(page.querySelectorAll('#orton ~ .guide-table-scroll')[1]?.querySelector('caption')?.textContent).toContain(
      'temperatures in °F'
    );
  });

  describe('in German', () => {
    const notes = [SK.note, ORTON.chart.note, ORTON.published.note];
    afterEach(() => {
      useCodedMessages(null);
      TestBed.inject(TranslocoService).setActiveLang('en');
    });

    const german = async (translated: string[], translations: Record<string, string>) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ...testProviders(),
          provideRouter([]),
          { provide: PAGE_LANGUAGE, useValue: 'de' },
          { provide: REFERENCE_LANGUAGE_LIST, useValue: translated }
        ]
      });
      const transloco = TestBed.inject(TranslocoService);
      transloco.setTranslation(
        Object.fromEntries(Object.entries(translations).map(([text, de]) => ['cones.' + textKey(text), de])),
        'de'
      );
      transloco.setActiveLang('de');
      useCodedMessages(transloco);
      const fixture = TestBed.createComponent(ConesPage);
      await fixture.whenStable();
      return fixture.nativeElement as HTMLElement;
    };

    it('shows the charts’ notes translated, each only for exactly the English it was made from', async () => {
      const page = await german(['en', 'de'], {
        [notes[0]!]: 'Setzen Sie einen Kontrollkegel.',
        [notes[1]!]: 'Der ältere Orton-Chart; Kontrollkegel setzen.'
      });
      const text = page.textContent;
      expect(text).toContain('Setzen Sie einen Kontrollkegel.');
      expect(text).toContain('Der ältere Orton-Chart; Kontrollkegel setzen.');
      expect(text).not.toContain('not translated yet');
      // The third has no translation: its English stands, and is marked as English.
      const english = [...page.querySelectorAll('[lang="en"]')].map((el) => el.textContent?.trim());
      expect(english).toEqual([ORTON.published.note]);
      // Named at its own address, in German, for search engines.
      const block = JSON.parse(document.head.querySelector('script[type="application/ld+json"]')!.textContent!);
      expect(block['@graph'][0]).toMatchObject({ inLanguage: 'de', url: 'https://glazecalcapp.com/de/cones' });
      expect(block['@graph'][1].itemListElement[0].item).toBe('https://glazecalcapp.com/de/');
    });

    it('shows the English with the notice where the page is not among the translated languages', async () => {
      const page = await german(['en'], { [notes[0]!]: 'Setzen Sie einen Kontrollkegel.' });
      expect(page.textContent).toContain('This page is not translated yet, so it is shown in English.');
      expect(page.textContent).toContain(SK.note);
      expect(page.textContent).not.toContain('Setzen Sie');
      expect(page.querySelector('[lang="en"]')).toBeNull();
    });
  });

  it('links the firing guide, and writes its data for search engines', async () => {
    const { page } = await render();
    expect(page.querySelector<HTMLAnchorElement>('p a[href^="/guides/firing"]')).not.toBeNull();
    const block = JSON.parse(document.head.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(block['@graph'][0]).toMatchObject({
      name: 'Cone chart: Orton and SK cone temperatures',
      url: 'https://glazecalcapp.com/cones'
    });
  });
});
