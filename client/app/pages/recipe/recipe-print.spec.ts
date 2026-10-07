import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { calculateUMF } from '../../../../lib/chemistry';
import { Additive, Material, Recipe } from '../../core/models';
import { GRAMS_PER_POUND } from '../../shared/weights';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { RecipePrint, printLines } from './recipe-print';

const WHITING: Material = {
  _id: 'w',
  name: 'Whiting',
  rawformula: 'CaCO3',
  percentmole: 'molecular',
  loi: 43.97,
  fields: [{ name: 'CaO', amount: 1 }]
};
const KAOLIN: Material = {
  _id: 'k',
  name: 'Kaolin',
  rawformula: 'Al2O3•2SiO2•2H2O',
  percentmole: 'molecular',
  loi: 13.96,
  fields: [
    { name: 'Al2O3', amount: 1 },
    { name: 'SiO2', amount: 2 }
  ]
};
const SILICA: Material = {
  _id: 's',
  name: 'Silica',
  rawformula: 'SiO2',
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: 'SiO2', amount: 1 }]
};
const IRON: Additive = {
  _id: 'rio',
  name: 'Red iron oxide',
  fields: [{ name: 'Fe2O3', amount: '1' }],
  amount: '2',
  unit: 'percent'
};

const RECIPE: Recipe = {
  title: 'Test celadon',
  date: '2026-10-06',
  notes: 'Sieve through 80 mesh.',
  materials: [
    { ...WHITING, amount: '20' },
    { ...KAOLIN, amount: '30' },
    { ...SILICA, amount: '50' }
  ],
  additives: [IRON],
  includeAdditives: false
};

type Page = Record<string, any>;

// Numbers and units are held together with no-break spaces; read as plain spaces.
const plain = (value: string) => value.replace(/ /g, ' ');

/** The cells of each row the selector finds, as text. */
const rows = (root: HTMLElement, selector: string) =>
  [...root.querySelectorAll(selector)].map((row) =>
    [...row.children].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
  );

describe('printLines', () => {
  it('gives each line its share, what to weigh and the running total', () => {
    const { materials, additives, total, weights } = printLines(RECIPE, 1000, 'g');
    expect(total).toBe('100');
    expect(materials.map((l) => [l.name, l.formula, l.amount, l.share, plain(l.weigh), plain(l.runningTotal)])).toEqual(
      [
        ['Whiting', 'CaCO₃', '20', '20%', '200 g', '200 g'],
        ['Kaolin', 'Al₂O₃•2SiO₂•2H₂O', '30', '30%', '300 g', '500 g'],
        ['Silica', 'SiO₂', '50', '50%', '500 g', '1000 g']
      ]
    );
    // 2% of the base, weighed in last.
    expect(additives.map((l) => [l.name, l.amount, plain(l.weigh), plain(l.runningTotal)])).toEqual([
      ['Red iron oxide', '2%', '20 g', '1020 g']
    ]);
    expect(weights?.total).toBe(1020);
  });

  it('shows grams to a tenth, or in full when the account asks for it', () => {
    const single = printLines(RECIPE, 1234.5678, 'g');
    const full = printLines(RECIPE, 1234.5678, 'g', 'full');
    expect(plain(single.materials[0].weigh)).toBe('246.9 g');
    expect(plain(full.materials[0].weigh)).toBe('246.91356 g');
    expect(plain(full.additives[0].runningTotal)).toBe('1259.25916 g');
  });

  it('keeps a number and its unit together on one line', () => {
    const { materials } = printLines(RECIPE, 10 * GRAMS_PER_POUND, 'lb');
    expect(materials[0].weigh).toBe('2 lb');
    expect(printLines(RECIPE, 1000, 'lb').materials[2].weigh).toBe('1 lb 1.6 oz');
  });

  it('weighs in pounds and ounces', () => {
    const { materials, additives } = printLines(RECIPE, 10 * GRAMS_PER_POUND, 'lb');
    expect(materials.map((l) => [plain(l.weigh), plain(l.runningTotal)])).toEqual([
      ['2 lb', '2 lb'],
      ['3 lb', '5 lb'],
      ['5 lb', '10 lb']
    ]);
    expect([plain(additives[0].weigh), plain(additives[0].runningTotal)]).toEqual(['3.2 oz', '10 lb 3.2 oz']);
  });

  it('gives no weights when an amount is not a number, and says which', () => {
    const recipe = {
      ...RECIPE,
      materials: [
        { ...WHITING, amount: '12,5' },
        { ...SILICA, amount: '50' }
      ]
    };
    const { materials, weights, unreadable } = printLines(recipe, 1000, 'g');
    expect(weights).toBeNull();
    expect(materials.map((l) => [l.amount, l.weigh])).toEqual([
      ['12,5', ''],
      ['50', '']
    ]);
    expect(unreadable).toEqual(['The amount for Whiting is not a number ("12,5").']);
  });

  it('gives only the amounts without a batch size', () => {
    const { materials, additives, weights } = printLines(RECIPE, 0, 'g');
    expect(weights).toBeNull();
    expect([materials[0].weigh, materials[0].runningTotal]).toEqual(['', '']);
    expect(additives[0].amount).toBe('2%');
  });
});

describe('RecipePrint', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async (recipe: Recipe = RECIPE, weightUnit = 'g', gramPrecision = 'single') => {
    const fixture = TestBed.createComponent(RecipePrint);
    fixture.componentRef.setInput('recipe', recipe);
    await fixture.whenStable();
    answer('/preferences', { weightUnit, gramPrecision });
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, page: fixture.componentInstance as unknown as Page };
  };

  const choose = async (fixture: { whenStable(): Promise<unknown> }, root: HTMLElement, id: string) => {
    (root.querySelector('#' + id) as HTMLInputElement).click();
    await fixture.whenStable();
  };

  const typeBatch = async (fixture: { whenStable(): Promise<unknown> }, root: HTMLElement, value: string) => {
    const input = root.querySelector('#print-batch-size') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('prints the whole recipe: amounts, weights for the batch, the unity formula, the analysis and notes', async () => {
    const { fixture, root } = await create();
    expect(text(fixture, '.print-sheet h2')).toBe('Test celadon');
    expect(text(fixture, '.print-meta')).toBe('Tuesday, October 6, 2026');
    expect(text(fixture, '.print-batch-summary')).toBe(
      'Batch: 1000 g of base materials and 20 g of colorants and additives, 1020 g in all.'
    );
    const [materials, additives] = [...root.querySelectorAll('.print-table')] as HTMLElement[];
    expect(rows(materials, 'thead tr')).toEqual([['Material', 'Amount', '% of base', 'Weigh', 'Running total']]);
    expect(rows(materials, 'tbody tr')).toEqual([
      ['Whiting CaCO₃', '20', '20%', '200 g', '200 g'],
      ['Kaolin Al₂O₃•2SiO₂•2H₂O', '30', '30%', '300 g', '500 g'],
      ['Silica SiO₂', '50', '50%', '500 g', '1000 g']
    ]);
    expect(rows(materials, 'tfoot tr')).toEqual([['Total', '100', '100%', '1000 g', '']]);
    expect(additives.querySelector('caption')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Colorants and additives on top of the base'
    );
    expect(rows(additives, 'tbody tr')).toEqual([['Red iron oxide', '2%', '20 g', '1020 g']]);

    const chemistry = text(fixture, '.print-chemistry');
    expect(chemistry).toMatch(/^Unity formula Fluxes/);
    expect(chemistry).toContain('CaO : 1.000');
    expect(chemistry).toContain('Ratio of Silica to Alumina');
    const umf = calculateUMF(RECIPE.materials.map((material) => ({ material, amount: material.amount ?? '' })));
    const percent = (oxide: string) => umf.analysis[oxide].toFixed(1) + '%';
    const facts = [...root.querySelectorAll('.print-facts dt, .print-facts dd')].map((el) => el.textContent?.trim());
    expect(facts).toEqual([
      'Flux balance',
      'R₂O 0.00 : RO 1.00',
      'Oxide analysis, fired, by weight',
      `CaO ${percent('CaO')} · Al₂O₃ ${percent('Al2O3')} · SiO₂ ${percent('SiO2')}`,
      'Loss on ignition',
      umf.loi.toFixed(1) + '% of the raw batch'
    ]);
    expect(text(fixture, '.print-notes h3')).toBe('Notes');
    expect(text(fixture, '.print-notes p')).toBe('Sieve through 80 mesh.');
    // Saved as a PDF, the file is named after the recipe.
    expect(TestBed.inject(Title).getTitle()).toBe('Test celadon - Glazecalc');
  });

  it('prints just a batch list, with boxes to tick, and remembers the choice', async () => {
    const { fixture, root } = await create();
    await choose(fixture, root, 'print-batch-list');
    expect(root.querySelector('.print-chemistry')).toBeNull();
    expect(root.querySelector('.print-notes')).toBeNull();
    expect(rows(root, '.print-batch-list tbody tr')).toEqual([
      ['', 'Whiting', '200 g', '200 g'],
      ['', 'Kaolin', '300 g', '500 g'],
      ['', 'Silica', '500 g', '1000 g'],
      ['Colorants and additives'],
      ['', 'Red iron oxide', '20 g', '1020 g']
    ]);
    expect(root.querySelectorAll('.tick-box').length).toBe(4);
    expect(rows(root, '.print-batch-list tfoot tr')).toEqual([['', 'All together', '1020 g', '']]);
    expect(localStorage.getItem('printMode')).toBe('batch');
  });

  it("takes the batch size in the account's unit, and prints the amounts as written without one", async () => {
    const { fixture, root } = await create(RECIPE, 'lb');
    const input = root.querySelector('#print-batch-size') as HTMLInputElement;
    // The default of 1000 g, in pounds.
    expect(input.value).toBe('2.2');
    expect(text(fixture, '.print-batch-size .input-group-text')).toBe('lb');
    await typeBatch(fixture, root, '10');
    expect(JSON.parse(localStorage.getItem('printBatch')!)).toEqual({ text: '10', unit: 'lb' });
    expect(rows(root, '.print-table tbody tr')[0]).toEqual(['Whiting CaCO₃', '20', '20%', '2 lb', '2 lb']);

    await typeBatch(fixture, root, '');
    expect(text(fixture, '.print-batch-summary')).toBe('');
    expect(rows(root, '.print-table thead tr')[0]).toEqual(['Material', 'Amount', '% of base']);
    await choose(fixture, root, 'print-batch-list');
    expect(rows(root, '.print-batch-list tbody tr')[0]).toEqual(['', 'Whiting', '20']);
    expect(text(fixture, '.print-note')).toContain('Enter a batch size');

    await typeBatch(fixture, root, 'ten');
    expect(text(fixture, '.print-problem')).toBe('Enter the batch size as a number, such as 2.5.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    // Said to screen readers, and part of the field's description.
    expect(input.getAttribute('aria-describedby')).toBe('print-batch-help print-batch-problem');
    expect(root.querySelector('#print-batch-problem')?.getAttribute('role')).toBe('alert');
  });

  it("changes the account's weight unit, and puts it back if that cannot be saved", async () => {
    const { fixture, root } = await create();
    await choose(fixture, root, 'print-unit-lb');
    const req = httpMock().expectOne((r) => r.method === 'PUT' && r.url === API + '/preferences');
    expect(req.request.body).toEqual({ weightUnit: 'lb' });
    req.flush({ weightUnit: 'lb' });
    await settle(fixture);
    expect((root.querySelector('#print-batch-size') as HTMLInputElement).value).toBe('2.2');
    expect(text(fixture, '.print-batch-summary')).toBe(
      'Batch: 2 lb 3.2 oz of base materials and 0.7 oz of colorants and additives, 2 lb 3.9 oz in all.'
    );

    await choose(fixture, root, 'print-unit-g');
    httpMock()
      .expectOne((r) => r.method === 'PUT')
      .flush({ msg: 'Please try again later.' }, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.print-problem')).toBe('Please try again later.');
    expect((root.querySelector('#print-unit-lb') as HTMLInputElement).checked).toBe(true);
  });

  it("shows grams in full when that is the account's setting", async () => {
    const { fixture, root } = await create(RECIPE, 'g', 'full');
    await typeBatch(fixture, root, '1234.5678');
    expect(text(fixture, '.print-batch-summary')).toBe(
      'Batch: 1234.5678 g of base materials and 24.69136 g of colorants and additives, 1259.25916 g in all.'
    );
    // Each table scrolls on its own if it is wider than a phone, and can take the focus to scroll by keyboard.
    const scrollers = [...root.querySelectorAll('.print-table-scroll')];
    expect(scrollers.map((el) => [el.getAttribute('aria-label'), el.getAttribute('tabindex')])).toEqual([
      ['Materials', '0'],
      ['Colorants and additives', '0']
    ]);
  });

  it('opens the print dialog, and goes back', async () => {
    const { fixture, root } = await create();
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const back = vi.fn();
    fixture.componentInstance.back.subscribe(back);
    const button = (label: string) =>
      [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
    button('Print').click();
    expect(print).toHaveBeenCalledOnce();
    button('Back to the recipe').click();
    expect(back).toHaveBeenCalledOnce();
    print.mockRestore();
  });

  it('says when the colorants are counted, and when there is no unity formula', async () => {
    const counted = await create({ ...RECIPE, includeAdditives: true });
    expect(text(counted.fixture, '.print-chemistry h3')).toBe('Unity formula, counting colorants and additives');
    expect(text(counted.fixture, '.print-caption-note')).toBe('counted in the unity formula');
    counted.fixture.destroy();

    const { fixture } = await create({ title: '', materials: [{ ...SILICA, amount: '10' }] });
    expect(text(fixture, '.print-sheet h2')).toBe('Untitled recipe');
    expect(text(fixture, '.print-chemistry p')).toContain('no flux');
  });
});
