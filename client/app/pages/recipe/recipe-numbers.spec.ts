import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { PreferencesService } from '../../core/preferences.service';
import { RecipeAnalysis } from '../../core/models';
import { ENGLISH } from '../../testing/i18n';
import { API, httpMock, testProviders, text } from '../../testing/test-providers';
import { RecipeNumbers } from './recipe-numbers';
import { OwnLimitsNote } from './own-limits-note';
import { SlurryCalculator } from './slurry-calculator';
import { StullChart } from './stull-chart';

// The recipe page's analysis, limits, Stull chart and slurry calculator.

const ANALYSIS: RecipeAnalysis = {
  uList: { K2O: 0.25, Na2O: 0.1, CaO: 0.65, Al2O3: 0.3, B2O3: 0.1, SiO2: 3.2 },
  analysis: { K2O: 7.5, Na2O: 2, CaO: 11.6, Al2O3: 9.8, B2O3: 2.2, SiO2: 61.4 },
  groups: { R2O: 0.35, RO: 0.65, R2O3: 0.4, RO2: 3.2 },
  loi: 12.34,
  expansion: 7.21
};

const rows = (root: HTMLElement, selector: string): string[][] =>
  [...root.querySelectorAll(selector + ' tbody tr')].map((tr) =>
    [...tr.children].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
  );

describe('RecipeNumbers', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async (firing: '' | 'low' | 'mid' | 'high' = '') => {
    const fixture = TestBed.createComponent(RecipeNumbers);
    fixture.componentRef.setInput('analysis', ANALYSIS);
    fixture.componentRef.setInput('firing', firing);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it('shows each oxide’s moles, mole percent and fired weight percent, the LOI and the expansion as an estimate', async () => {
    const { fixture, root } = await create();
    const analysis = rows(root, '.numbers-table');
    expect(analysis[0]).toEqual(['K₂O', '0.250', '5.4', '7.5']);
    expect(analysis.map((row) => row[0])).toEqual(['K₂O', 'Na₂O', 'CaO', 'Al₂O₃', 'B₂O₃', 'SiO₂']);
    const facts = [...root.querySelectorAll('.numbers-facts dt, .numbers-facts dd')].map((el) =>
      (el.textContent ?? '').trim()
    );
    expect(facts).toEqual([
      'Silica to alumina',
      '10.67',
      'Flux balance',
      'R₂O 0.35 : RO 0.65',
      'Loss on ignition',
      '12.3% of the raw batch',
      'Thermal expansion, calculated',
      '7.21 ×10⁻⁶ per °C'
    ]);
    expect(text(fixture)).toContain('The expansion is an estimate for comparing glazes, not a measured value');
    expect(text(fixture)).toContain("Digitalfire's coefficients");
  });

  it('checks against Hesselberth & Roy by default, at cone 6 until a firing is chosen, as guidelines with their source', async () => {
    const { fixture, root } = await create();
    expect((root.querySelector('#limit-set') as HTMLSelectElement).value).toBe('hesselberth-roy');
    expect(text(fixture)).toContain('With no firing chosen, the figures shown are for: Mid fire, cone 4–6.');
    expect(text(fixture)).toContain("These are the set's figures for cone 6.");
    const limits = rows(root, '.limits-table');
    expect(limits).toContainEqual(['K₂O + Na₂O', '0.35', '0.10–0.30', 'above']);
    expect(limits).toContainEqual(['B₂O₃', '0.10', '0.15–0.35', 'below']);
    expect(limits).toContainEqual(['Al₂O₃', '0.30', '0.25–0.40', 'within']);
    expect(limits).toContainEqual(['CaO', '0.65', '0.20–0.60', 'above']);
    expect(text(fixture)).toContain('Outside 3 ranges.');
    expect(text(fixture)).toContain('These are guidelines, not a pass or a fail');
    const source = root.querySelector('.limits a') as HTMLAnchorElement;
    expect(source.textContent).toContain('Hesselberth and Ron Roy');
    expect(source.getAttribute('rel')).toBe('noopener');
    // The link is the book on Google Books; the text names the table and where it ran.
    expect(source.getAttribute('href')).toMatch(/^https:\/\/books\.google\.com\/books\/about\/Mastering_Cone_6_Glazes/);
    expect(source.textContent).toContain(`"Recommended Stable Glaze 'Limits'"`);
    expect(source.textContent).toContain('Ceramics Monthly, September 2000');
    expect(source.textContent).toContain('Mastering Cone 6 Glazes');
  });

  it('reads cone 10 by the set’s cone 10 figures, and says it does not apply at low fire rather than stretching them', async () => {
    const high = await create('high');
    expect(rows(high.root, '.limits-table')).toContainEqual(['Al₂O₃', '0.30', '0.30–0.60', 'within']);
    expect(text(high.fixture)).toContain("These are the set's figures for cone 10.");
    const low = await create('low');
    expect(low.root.querySelector('.limits-table')).toBeNull();
    expect(text(low.fixture)).toContain(
      'Hesselberth & Roy, stable glazes has no figures for this firing (Low fire, cone 06–02), so it is not checked'
    );
    // The Stull chart is still drawn.
    expect(low.root.querySelector('gc-stull-chart svg')).not.toBeNull();
  });

  it('keeps the limit set chosen with the account, and the firing chosen with the recipe', async () => {
    const { fixture, root } = await create('mid');
    const select = root.querySelector('#limit-set') as HTMLSelectElement;
    select.value = 'glazecalc';
    select.dispatchEvent(new Event('change'));
    httpMock()
      .expectOne((req) => req.method === 'PUT' && req.url === API + '/preferences')
      .flush({ limitSet: 'glazecalc' });
    await fixture.whenStable();
    expect(TestBed.inject(PreferencesService).limitSet()).toBe('glazecalc');
    // The app's own set at mid fire: boron, alumina, soda and potash, with the rest named as not in it.
    expect(rows(root, '.limits-table').map((row) => row[0])).toEqual(['B₂O₃', 'Al₂O₃', 'K₂O + Na₂O']);
    expect(rows(root, '.limits-table')[1]).toEqual(['Al₂O₃', '0.30', 'at least 0.25', 'within']);
    expect(text(fixture)).toContain('No range in this set for CaO and SiO₂.');

    const firing = root.querySelector('#limit-firing') as HTMLSelectElement;
    firing.value = 'low';
    firing.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.firing()).toBe('low');
    expect(rows(root, '.limits-table').map((row) => row[0])).toContain('MgO');
  });

  it('keeps a limit set chosen on the page when saving it fails, and says so', async () => {
    const { fixture, root } = await create();
    const select = root.querySelector('#limit-set') as HTMLSelectElement;
    select.value = 'glazecalc';
    select.dispatchEvent(new Event('change'));
    httpMock()
      .expectOne((req) => req.method === 'PUT' && req.url === API + '/preferences')
      .flush({}, { status: 500, statusText: 'Server error' });
    await fixture.whenStable();
    await fixture.whenStable();
    expect(text(fixture, '.limits-problem')).toContain('could not be saved');
    expect((root.querySelector('#limit-set') as HTMLSelectElement).value).toBe('glazecalc');
  });
});

describe('StullChart', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  const create = async (point: object | null, ranges: object | null = null) => {
    const fixture = TestBed.createComponent(StullChart);
    fixture.componentRef.setInput('point', point);
    fixture.componentRef.setInput('ranges', ranges);
    fixture.componentRef.setInput('limitName', 'Hesselberth & Roy, stable glazes');
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it('plots the glaze and says where it is, in the chart’s text alternative and under it', async () => {
    const point = { silica: 3.2, alumina: 0.3, ratio: 10.67, region: 'bright', crazed: false };
    const { fixture, root } = await create(point, { SiO2: { min: 2.5, max: 4 }, Al2O3: { min: 0.25, max: 0.4 } });
    const svg = root.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    const [titleId, descId] = svg.getAttribute('aria-labelledby')!.split(' ');
    expect(svg.querySelector('#' + titleId)?.textContent).toContain('Stull chart');
    const said = 'This glaze, SiO₂ 3.20 and Al₂O₃ 0.30 (ratio 10.7), is in the bright region.';
    expect(svg.querySelector('#' + descId)?.textContent?.trim()).toBe(said);
    expect(text(fixture, 'figcaption')).toContain(said);
    expect(root.querySelectorAll('circle')).toHaveLength(1);
    // The set's ranges: a box with four dashed sides.
    expect(root.querySelectorAll('.stull-edge')).toHaveLength(4);
    expect(text(fixture, 'figcaption')).toContain('the silica and alumina ranges of Hesselberth & Roy, stable glazes');
  });

  it('draws only the sides a set has figures for, and says when a glaze is off the chart or cannot be plotted', async () => {
    const off = await create(
      { silica: 9, alumina: 0.3, ratio: 30, region: null, crazed: false },
      { Al2O3: { min: 0.25 } }
    );
    expect(off.root.querySelectorAll('.stull-edge')).toHaveLength(1);
    expect(off.root.querySelector('circle')).toBeNull();
    expect(text(off.fixture, 'figcaption')).toContain('is off the chart');
    const crazed = await create({ silica: 6, alumina: 0.3, ratio: 20, region: 'underfired', crazed: true });
    expect(text(crazed.fixture, 'figcaption')).toContain(
      "in the underfired region. It is in the area where Stull's glazes crazed."
    );
    const none = await create(null);
    expect(text(none.fixture, 'figcaption')).toContain('There is no point to plot');
  });
});

describe('SlurryCalculator', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });

  const create = async () => {
    const fixture = TestBed.createComponent(SlurryCalculator);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const type = async (id: string, value: string) => {
      const input = root.querySelector('#' + id) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { fixture, root, type };
  };

  it('words its results again when the language is switched', async () => {
    const { fixture, root, type } = await create();
    await type('slurry-volume', '10');
    await type('slurry-measured', '1.5');
    expect(text(fixture, '.slurry-results')).toContain('the bucket holds');
    const transloco = TestBed.inject(TranslocoService);
    for (const [path, messages] of Object.entries(ENGLISH)) {
      const copy = structuredClone(messages) as Record<string, any>;
      if (path === 'recipe/en') copy['slurry'].contents = 'Sieben: {glaze}';
      transloco.setTranslation(copy, path.replace(/en$/, 'de'));
    }
    transloco.setActiveLang('de');
    await fixture.whenStable();
    expect(root.querySelector('.slurry-results')?.textContent).toContain('Sieben:');
  });

  it('works out what a bucket holds, the water to reach the SG wanted, and a new batch, in litres and kilograms', async () => {
    const { fixture, root, type } = await create();
    expect((root.querySelector('#slurry-target') as HTMLInputElement).value).toBe('1.45');
    expect(text(fixture, 'label[for=slurry-measured]')).toBe('Its SG now');
    await type('slurry-volume', '10');
    await type('slurry-measured', '1.5');
    const results = text(fixture, '.slurry-results');
    expect(results).toContain('At SG 1.50, the bucket holds 8.33 kg of dry glaze and 6.67 kg of water.');
    expect(results).toContain('To reach SG 1.45, add 1.11 kg of water. It ends at about 11.11 L.');
    await type('slurry-measured', '1.4');
    expect(text(fixture, '.slurry-results')).toContain('let it settle and pour off 1.11 kg of clear water');
    await type('slurry-batch', '5');
    expect(text(fixture, '.slurry-results')).toContain('Mix 5 kg of dry glaze with');
    await type('slurry-measured', '2.7');
    expect(text(fixture, '.slurry-problem')).toBe(
      "An SG has to be more than 1 (water's) and less than the dry materials' 2.5."
    );
  });

  it('reads densities and weights as Settings say: Baumé, pint weight, gallons and pounds', async () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.remember('density', 'baume');
    const baume = await create();
    expect(text(baume.fixture, 'label[for=slurry-measured]')).toBe('Its density now, °Bé');
    expect((baume.root.querySelector('#slurry-target') as HTMLInputElement).value).toBe('45');
    await baume.type('slurry-volume', '10');
    await baume.type('slurry-measured', '45');
    expect(text(baume.fixture, '.slurry-results')).toContain('It is already at SG 1.45.');

    preferences.remember('density', 'pint');
    preferences.remember('weightUnit', 'lb');
    const pint = await create();
    expect((pint.root.querySelector('#slurry-target') as HTMLInputElement).value).toBe('29');
    expect((pint.root.querySelector('.slurry-pair select') as HTMLSelectElement).value).toBe('usGallon');
    await pint.type('slurry-volume', '2');
    await pint.type('slurry-measured', '30');
    expect(text(pint.fixture, '.slurry-results')).toMatch(/holds \d+ lb [\d.]+ oz of dry glaze/);
    expect(text(pint.fixture, '.slurry-results')).toContain('US gal');
  });

  it('saves the SG wanted as the recipe’s target, within 1 to 2.5, shows it as kept, and clears it', async () => {
    const { fixture, root, type } = await create();
    const save = () => root.querySelector('.slurry-target button') as HTMLButtonElement | null;
    expect(save()?.textContent).toContain('Save SG 1.45 as this recipe');
    save()!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance['sgTarget']()).toBe(1.45);
    expect(text(fixture, '.slurry-target')).toContain("SG 1.45 is this recipe's target.");
    await type('slurry-target', '1.6');
    expect(save()?.textContent).toContain('Save SG 1.6 as this recipe');
    expect(text(fixture, '.slurry-target')).toContain("The recipe's target is SG 1.45.");
    await type('slurry-target', '2.7');
    expect(save()).toBeNull();
    await type('slurry-target', '1.45');
    expect(save()?.textContent).toContain('Clear the target');
    save()!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance['sgTarget']()).toBeNull();
  });

  it('starts from the target a recipe keeps, as Settings read densities', async () => {
    TestBed.inject(PreferencesService).remember('density', 'baume');
    const fixture = TestBed.createComponent(SlurryCalculator);
    fixture.componentRef.setInput('sgTarget', 1.5);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#slurry-target') as HTMLInputElement).value).toBe('48.3');
    expect(text(fixture, '.slurry-target')).toContain("SG 1.5 is this recipe's target.");
  });
});

describe('OwnLimitsNote', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });

  it('says the suggestions use Glazecalc’s own limits when the limits shown are another set, and stays quiet otherwise', async () => {
    const preferences = TestBed.inject(PreferencesService);
    const fixture = TestBed.createComponent(OwnLimitsNote);
    await fixture.whenStable();
    expect(text(fixture)).toBe("These suggestions use Glazecalc's own limits, not Hesselberth & Roy, stable glazes.");
    preferences.remember('limitSet', 'glazecalc');
    await fixture.whenStable();
    expect(text(fixture)).toBe('');
  });
});
