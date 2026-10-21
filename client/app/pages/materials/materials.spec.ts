import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ActivatedRouteSnapshot, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { skippedHeadings, testProviders } from '../../testing/test-providers';
import { ConesPage } from './cones-page';
import { MaterialInfoPage, analysisOf, hasFlux } from './material-info-page';
import { knownMaterial, materialDescriptionKey, materialOf, materialTitleParams } from './material-route';
import { MaterialsPage } from './materials-page';
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
  const render = async (name: string, language = 'en') => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        provideRouter([]),
        { provide: PAGE_LANGUAGE, useValue: language },
        { provide: ActivatedRoute, useValue: { data: of({ material: named(name) }) } }
      ]
    });
    const fixture = TestBed.createComponent(MaterialInfoPage);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };

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

  it('says when a material has no flux, so its unity is per formula as written', async () => {
    const { page } = await render('Silica');
    expect(page.querySelector('#analysis')?.closest('section')?.textContent).toContain(
      'Silica has no flux oxide, so its unity contribution is per formula as written.'
    );
    expect((await render('Whiting')).page.textContent).not.toContain('has no flux oxide');
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
