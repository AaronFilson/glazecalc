import { APP_BASE_HREF } from '@angular/common';
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
import { filter, of } from 'rxjs';
import fixtureFile from '../../../../data/famous-glazes/fixtures/fixture-celadon.json';
import iznikFile from '../../../../data/famous-glazes/iznik.json';
import oribeFile from '../../../../data/famous-glazes/oribe.json';
import { Additive, Material } from '../../core/models';
import { PendingRecipeService } from '../../core/pending-recipe.service';
import { signedInGuard } from '../../core/signed-in.guard';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { saveRegion } from '../../shared/library-info';
import { API, httpMock, settle, skippedHeadings, testProviders } from '../../testing/test-providers';
import { STANDARD_MATERIALS } from '../materials/standard-materials';
import { FamousGlazePage } from './famous-glaze-page';
import {
  FamousGlaze,
  FamousGlazes,
  celsiusText,
  famousGlazesUrl,
  localVersion,
  nativeRecipe,
  nativeUnity,
  offeredIn,
  proseIn,
  targetUnity
} from './famous-glaze';
import { FamousGlazesPage } from './famous-glazes-page';
import {
  anyFamousGlaze,
  famousGlazeList,
  famousGlazeOf,
  famousGlazeTitleParams,
  knownFamousGlaze
} from './famous-route';

// Famous glazes' pages, from the tests' fixture glaze (data/famous-glazes/fixtures) and İznik, each as
// scripts/famous-glazes.mjs writes it: every material its full record.

// Most of these run the solver (Target & Solve), a page's included. It is numeric work that coverage
// slows several times over: about 7 seconds a test in CI, and up to 30 on a 4-core machine running
// the whole suite, past the 15 the others have (vitest-base.config.mts).
vi.setConfig({ testTimeout: 60_000 });

const standard = (name: string) => STANDARD_MATERIALS.find((material) => material.name === name)!;
const additive = (name: string, oxide: string): Additive => ({ name, fields: [{ name: oxide, amount: '100' }] });

const fixture = {
  ...fixtureFile,
  lead: false,
  analysis: null,
  leadFree: null,
  recipe: {
    ...fixtureFile.recipe,
    lines: fixtureFile.recipe.lines.map((line) => ({ record: standard(line.material), amount: line.amount })),
    additives: [{ record: additive('Red iron oxide', 'Fe2O3'), amount: 1.5 }]
  }
} as unknown as FamousGlaze;

const iznik = {
  ...iznikFile,
  lead: true,
  recipe: null,
  leadFree: {
    ...iznikFile.leadFree,
    additives: [{ record: additive('Tin oxide', 'SnO2'), amount: 6 }],
    prefer: iznikFile.leadFree.prefer.map(standard)
  }
} as unknown as FamousGlaze;

const oribeWith = (lines: { material: string; amount: number }[]) =>
  ({
    ...oribeFile,
    lead: false,
    analysis: null,
    leadFree: null,
    recipe: {
      ...oribeFile.recipe,
      lines: lines.map((line) => ({ record: standard(line.material), amount: line.amount })),
      additives: [{ record: additive('Copper oxide', 'CuO'), amount: 5 }]
    }
  }) as unknown as FamousGlaze;

describe('a famous glaze worked out', () => {
  it("has Oribe's unity formula match the Mie report's stated one without the talc, and add magnesia with it", () => {
    const lines = oribeFile.recipe.lines;
    const near = (value: number | undefined, wanted: number, within: number) =>
      expect(Math.abs((value ?? 0) - wanted)).toBeLessThan(within);
    const without = nativeUnity(oribeWith(lines.filter((line) => line.material !== 'Talc')))!;
    near((without['K2O'] ?? 0) + (without['Na2O'] ?? 0), 0.3, 0.02);
    near(without['CaO'], 0.7, 0.02);
    near(without['Al2O3'], 0.5, 0.02);
    near(without['SiO2'], 3.5, 0.15);
    const withTalc = nativeUnity(oribeWith(lines))!;
    near(withTalc['MgO'], 0.13, 0.02);
    near(withTalc['CaO'], 0.62, 0.02);
    near(withTalc['SiO2'], 3.15, 0.05);
  });

  it('has its native unity formula, and a version from the materials sold in a region', () => {
    const unity = nativeUnity(fixture)!;
    expect(unity['CaO']! + unity['K2O']! + unity['Na2O']!).toBeGreaterThan(0.9);
    const offered = offeredIn(fixture, 'US', STANDARD_MATERIALS);
    expect(offered.length).toBeGreaterThan(10);
    expect(offered.every((material) => material.category !== 'colorant')).toBe(true);
    const version = localVersion(fixture, offered)!;
    expect(version.materials.length).toBeGreaterThan(0);
    expect(version.additives.map((a) => a.name)).toEqual(['Red iron oxide']);
    expect(['close', 'fair']).toContain(version.verdict);
  });

  it('opens the native recipe as a new recipe, but never a lead glaze', () => {
    const recipe = nativeRecipe(fixture, 'Fixture celadon')!;
    expect(recipe.materials.map((m) => [m.name, m.amount])).toEqual([
      ['Custer Spar', '25'],
      ['Silica', '30'],
      ['Whiting', '20'],
      ['EPK Kaolin', '25']
    ]);
    expect(recipe.additives?.[0]?.unit).toBe('percent');
    expect(nativeRecipe(iznik, 'İznik')).toBeNull();
  });

  it("aims a lead glaze's version at its analysis with no lead, and boron for its firing", () => {
    const target = targetUnity(iznik)!;
    expect(target['PbO']).toBeUndefined();
    expect(target['SnO2']).toBeUndefined();
    expect(target['B2O3']).toBeGreaterThan(0.3);
    const version = localVersion(iznik, offeredIn(iznik, '', STANDARD_MATERIALS))!;
    expect(version.materials.every((m) => iznikFile.leadFree.prefer.includes(m.name))).toBe(true);
    expect(version.additives.map((a) => [a.name, a.amount])).toEqual([['Tin oxide', '6']]);
  });

  it("gives a glaze's words in the page's language, or the English marked", () => {
    expect(proseIn(fixture.origin, 'de')).toEqual({ text: 'Die Tests (nie auf der Website)', english: false });
    expect(proseIn(fixture.origin, 'fr').english).toBe(true);
    expect(proseIn(fixture.origin, 'en').english).toBe(false);
  });

  it('has no version to work out without a recipe, an analysis and lead-free version for a lead glaze, or materials that help', () => {
    expect(nativeUnity(iznik)).toBeNull();
    expect(targetUnity({ ...iznik, leadFree: null })).toBeNull();
    expect(targetUnity({ ...iznik, analysis: null })).toBeNull();
    expect(localVersion(fixture, [])).toBeNull();
    // Tin oxide brings none of the celadon's oxides: the solver has nothing to make it from.
    const tin: Material = {
      name: 'Tin oxide',
      percentmole: 'molecular',
      loi: 0,
      fields: [{ name: 'SnO2', amount: 1 }]
    };
    expect(localVersion(fixture, [tin])).toBeNull();
  });

  it('writes the firing temperature as a range or one figure, and nothing where no source gives one', () => {
    expect(celsiusText([950, 1050])).toBe('950–1050 °C');
    expect(celsiusText(1280)).toBe('1280 °C');
    expect(celsiusText(undefined)).toBe('');
  });
});

describe("a famous glaze's route", () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  it('matches a published glaze only, from the built file', async () => {
    const matched = TestBed.runInInjectionContext(() =>
      knownFamousGlaze({} as never, [{ path: 'famous-glazes' }, { path: 'fixture-celadon' }] as never, {} as never)
    ) as Promise<boolean>;
    await settle();
    httpMock().expectOne(famousGlazesUrl('en')).flush([fixture]);
    expect(await matched).toBe(true);
    const service = TestBed.inject(FamousGlazes);
    expect(await service.bySlug('shino')).toBeUndefined();
    const route = { paramMap: convertToParamMap({ slug: 'fixture-celadon' }) } as unknown as ActivatedRouteSnapshot;
    const glaze = await TestBed.runInInjectionContext(() => famousGlazeOf(route, {} as never) as Promise<FamousGlaze>);
    expect(glaze.slug).toBe('fixture-celadon');
  });

  it("opens the index once a glaze is published, with the glazes listed, and titles a glaze's page with its names", async () => {
    const opens = TestBed.runInInjectionContext(() =>
      anyFamousGlaze({} as never, [] as never, {} as never)
    ) as Promise<boolean>;
    await settle();
    httpMock().expectOne(famousGlazesUrl('en')).flush([fixture, iznik]);
    expect(await opens).toBe(true);
    const listed = await TestBed.runInInjectionContext(
      () => famousGlazeList({} as never, {} as never) as Promise<FamousGlaze[]>
    );
    expect(listed.map((glaze) => glaze.slug)).toEqual(['fixture-celadon', 'iznik']);
    const titleOf = (slug: string) =>
      TestBed.runInInjectionContext(
        () =>
          famousGlazeTitleParams(
            { paramMap: convertToParamMap({ slug }) } as unknown as ActivatedRouteSnapshot,
            {} as never
          ) as Promise<{ name: string; native: string }>
      );
    expect(await titleOf('iznik')).toEqual({ name: 'İznik', native: 'İznik çinisi' });
    expect(await titleOf('shino')).toEqual({ name: '', native: '' });
  });

  it('keeps the index closed while the file cannot be read, and reads it again the next time', async () => {
    const opens = TestBed.runInInjectionContext(() =>
      anyFamousGlaze({} as never, [] as never, {} as never)
    ) as Promise<boolean>;
    await settle();
    httpMock().expectOne(famousGlazesUrl('en')).flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(await opens).toBe(false);
    const again = TestBed.inject(FamousGlazes).all();
    await settle();
    httpMock().expectOne(famousGlazesUrl('en')).flush([fixture]);
    expect((await again).map((glaze) => glaze.slug)).toEqual(['fixture-celadon']);
  });

  it("reads the file of the page's language only", async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [...testProviders(), { provide: PAGE_LANGUAGE, useValue: 'ta' }] });
    const all = TestBed.inject(FamousGlazes).all();
    await settle();
    httpMock().expectOne('/i18n/famous-glazes/ta.json').flush([fixture]);
    expect((await all).map((glaze) => glaze.slug)).toEqual(['fixture-celadon']);
  });
});

describe("a famous glaze's page", () => {
  const setUp = (glaze: FamousGlaze, language = 'en', routes: Routes = []) => {
    // A session another spec left in localStorage would hide the sign-up link.
    localStorage.clear();
    // And a region another spec chose (the signal outlives the spec file in this worker) would change which
    // materials the recipe is made from: these tests are for a reader who has chosen none.
    saveRegion('');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        provideRouter(routes),
        { provide: PAGE_LANGUAGE, useValue: language },
        { provide: ActivatedRoute, useValue: { data: of({ glaze }) } }
      ]
    });
  };
  const render = async (glaze: FamousGlaze, language = 'en', routes: Routes = []) => {
    setUp(glaze, language, routes);
    const fixture = TestBed.createComponent(FamousGlazePage);
    await settle(fixture);
    await settle(fixture);
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };

  it('shows the recipe, its unity formula and limits, the sources, and opens the recipe', async () => {
    const { fixture: rendered, page } = await render(fixture);
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Fixture celadon');
    expect(page.textContent).toContain('試験青磁');
    expect(page.querySelector('#famous-recipe')?.closest('section')?.textContent).toContain('Custer Spar');
    expect(page.querySelectorAll('#famous-unity tr').length).toBeGreaterThan(3);
    expect(page.querySelector('gc-recipe-limits')).not.toBeNull();
    expect(page.querySelectorAll('.famous-sources li')).toHaveLength(3);
    expect(page.querySelector('#famous-open')?.textContent?.trim()).toBe('Open this recipe');
    expect(page.querySelector<HTMLAnchorElement>('#famous-signup')?.getAttribute('href')).toBe(
      '/signup?next=%2Ffamous-glazes%2Ffixture-celadon'
    );
    expect(page.querySelector('#famous-history')).toBeNull();
    expect(page.querySelector('#famous-untested')).toBeNull();
    expect(skippedHeadings(rendered)).toEqual([]);
  });

  it('shows a lead glaze as history, with its lead-free version marked calculated, not yet test-fired', async () => {
    const { page } = await render(iznik);
    expect(page.querySelector('#famous-history')?.textContent).toContain('History only');
    expect(page.querySelector('#famous-recipe')).toBeNull();
    expect(page.querySelector('#famous-analysis')?.closest('section')?.textContent).toContain('PbO');
    expect(page.querySelector('#famous-untested')?.textContent).toContain('Calculated, not yet test-fired.');
    expect(page.querySelector('#famous-open')?.textContent?.trim()).toBe('Open the lead-free version');
    // A version once tested has no such label.
    const tested = { ...iznik, leadFree: { ...iznik.leadFree!, tested: true } };
    expect((await render(tested)).page.querySelector('#famous-untested')).toBeNull();
  });

  it('notes in another language what is still in English', async () => {
    expect((await render(fixture, 'de')).page.querySelector('.guide-note')).toBeNull();
    expect((await render(fixture, 'fr')).page.querySelector('.guide-note')).not.toBeNull();
  });

  it('marks a recipe not yet test-fired, gives its own note, and makes it from the materials sold where the reader buys', async () => {
    const { fixture: rendered, page } = await render(oribeWith(oribeFile.recipe.lines));
    const local = () => page.querySelector('#famous-local')!.closest('section')!;
    expect(page.querySelector('#famous-untested')?.textContent).toContain('Calculated, not yet test-fired.');
    expect(page.querySelector('#famous-recipe')?.closest('section')?.textContent).toContain(oribeFile.recipe.note.en);
    // Where the reader buys is asked first.
    expect(page.querySelector('#famous-local-recipe')).toBeNull();
    expect(local().textContent).toContain('Choose where you buy materials to see it made from those sold there.');
    const region = page.querySelector('#famous-region') as HTMLSelectElement;
    region.value = 'US';
    region.dispatchEvent(new Event('change'));
    await settle(rendered);
    const lines = [...page.querySelectorAll('#famous-local-recipe th')].map((th) => th.textContent?.trim());
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.at(-1)).toBe('+ Copper oxide');
    expect(local().textContent).toMatch(/to the target formula\./);
  });

  describe('its main button', () => {
    /** A click as a person makes it; whether the page left it to the browser (it follows the link) is noted. */
    const press = async (
      rendered: { whenStable(): Promise<unknown> },
      page: HTMLElement,
      init: MouseEventInit = {}
    ) => {
      let leftToBrowser = false;
      page.addEventListener(
        'click',
        (event) => {
          leftToBrowser = !event.defaultPrevented;
          // The test browser cannot open another page.
          event.preventDefault();
        },
        { once: true }
      );
      page
        .querySelector('#famous-open')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
      await settle(rendered as never);
      return leftToBrowser;
    };
    const TRIAL = { guest: true, name: 'quiet kilns', expiresAt: '2099-01-01T00:00:00.000Z' };

    it('leaves a click for a new tab to the link, and opens the recipe for a visitor in a new trial', async () => {
      const { fixture: rendered, page } = await render(fixture);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      expect(await press(rendered, page, { ctrlKey: true })).toBe(true);
      httpMock().expectNone(API + '/guest');
      expect(navigate).not.toHaveBeenCalled();

      expect(await press(rendered, page)).toBe(false);
      httpMock()
        .expectOne({ method: 'POST', url: API + '/guest' })
        .flush(TRIAL);
      await settle(rendered);
      expect(navigate).toHaveBeenCalledWith('/recipe');
      const recipe = TestBed.inject(PendingRecipeService).take()!;
      expect(recipe.title).toBe('Fixture celadon');
      expect(recipe.materials.map((line) => line.name)).toEqual(['Custer Spar', 'Silica', 'Whiting', 'EPK Kaolin']);
    });

    it('takes a visitor to the recipe page in their trial without passing the sign-in page', async () => {
      @Component({ selector: 'gc-test-recipe', template: '' })
      class Stand {}
      const { fixture: rendered, page } = await render(fixture, 'en', [
        { path: 'recipe', canActivate: [signedInGuard], component: Stand },
        { path: 'signin', component: Stand }
      ]);
      const shown: string[] = [];
      TestBed.inject(Router)
        .events.pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event) => shown.push(event.urlAfterRedirects));
      await press(rendered, page);
      // While the trial starts, the page stays as it is.
      expect(shown).toEqual([]);
      httpMock()
        .expectOne({ method: 'POST', url: API + '/guest' })
        .flush(TRIAL);
      await settle(rendered);
      await settle(rendered);
      expect(shown).toEqual(['/recipe']);
    });

    it("links the recipe page in the page's language, for a new tab", async () => {
      setUp(fixture, 'de');
      TestBed.overrideProvider(APP_BASE_HREF, { useValue: '/de/' });
      const rendered = TestBed.createComponent(FamousGlazePage);
      await settle(rendered);
      expect((rendered.nativeElement as HTMLElement).querySelector('#famous-open')?.getAttribute('href')).toBe(
        '/de/recipe'
      );
    });

    it('opens the lead-free version once, even when pressed twice before the materials have loaded', async () => {
      setUp(iznik);
      localStorage.setItem('session', 'account');
      const rendered = TestBed.createComponent(FamousGlazePage);
      // Drawn at once, as the browser adopts the page, before the standard materials have come.
      rendered.detectChanges();
      const page = rendered.nativeElement as HTMLElement;
      expect(page.querySelector('#famous-local-recipe')).toBeNull();
      expect(page.textContent).not.toContain('Choose where you buy');
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      const open = page.querySelector('#famous-open') as HTMLAnchorElement;
      open.click();
      open.click();
      await settle(rendered);
      // Signed in: no trial is started.
      httpMock()
        .expectOne(API + '/verify')
        .flush({ msg: 'User verified', id: 'u1', email: 'a@b.com' });
      await settle(rendered);
      await settle(rendered);
      expect(navigate.mock.calls.filter(([address]) => address === '/recipe')).toHaveLength(1);
      const recipe = TestBed.inject(PendingRecipeService).take()!;
      expect(recipe.title).toBe('İznik style, lead-free');
      expect(recipe.notes).toBe('Calculated, not yet test-fired: fire test tiles before use.');
      expect(recipe.materials.every((line) => iznikFile.leadFree.prefer.includes(line.name))).toBe(true);
      expect(recipe.additives?.map((line) => line.name)).toEqual(['Tin oxide']);
    });
  });
});

describe('the famous glazes index', () => {
  it('links each published glaze and says more are coming', async () => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: PAGE_LANGUAGE, useValue: 'en' },
        { provide: ActivatedRoute, useValue: { data: of({ glazes: [fixture, iznik] }) } }
      ]
    });
    const rendered = TestBed.createComponent(FamousGlazesPage);
    await settle(rendered);
    await settle(rendered);
    const page = rendered.nativeElement as HTMLElement;
    expect([...page.querySelectorAll('.famous-list a')].map((a) => a.getAttribute('href'))).toEqual([
      '/famous-glazes/fixture-celadon',
      '/famous-glazes/iznik'
    ]);
    expect(page.textContent).toContain('More glazes are coming');
  });
});
