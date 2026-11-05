import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ActivatedRouteSnapshot, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import fixtureFile from '../../../../data/famous-glazes/fixtures/fixture-celadon.json';
import iznikFile from '../../../../data/famous-glazes/iznik.json';
import { Additive } from '../../core/models';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { httpMock, settle, skippedHeadings, testProviders } from '../../testing/test-providers';
import { STANDARD_MATERIALS } from '../materials/standard-materials';
import { FamousGlazePage } from './famous-glaze-page';
import {
  FamousGlaze,
  FamousGlazes,
  famousGlazesUrl,
  localVersion,
  nativeRecipe,
  nativeUnity,
  offeredIn,
  proseIn,
  targetUnity
} from './famous-glaze';
import { FamousGlazesPage } from './famous-glazes-page';
import { famousGlazeOf, knownFamousGlaze } from './famous-route';

// Famous glazes' pages, from the tests' fixture glaze (data/famous-glazes/fixtures) and İznik, each as
// scripts/famous-glazes.mjs writes it: every material its full record.

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

describe('a famous glaze worked out', () => {
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
  const render = async (glaze: FamousGlaze, language = 'en') => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        provideRouter([]),
        { provide: PAGE_LANGUAGE, useValue: language },
        { provide: ActivatedRoute, useValue: { data: of({ glaze }) } }
      ]
    });
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
