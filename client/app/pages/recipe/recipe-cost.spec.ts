import { TestBed } from '@angular/core/testing';
import { Additive, RecipeMaterial } from '../../core/models';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { RecipeCost } from './recipe-cost';

const line = (_id: string, name: string, amount: string): RecipeMaterial => ({
  _id,
  ownedBy: 'Standard',
  name,
  amount,
  percentmole: 'molecular',
  loi: 0,
  fields: []
});
const MATERIALS = [line('potash', 'Potash Feldspar', '60'), line('whiting', 'Whiting', '40')];
const COBALT: Additive = { _id: 'cobalt', ownedBy: 'Standard', name: 'Cobalt Carbonate', fields: [], amount: '2' };

/** The cells of each row of the price table, as text. */
const rows = (root: HTMLElement) =>
  [...root.querySelectorAll('.recipe-cost-table tbody tr')].map((row) => [
    (row.querySelector('th')?.textContent ?? '').trim(),
    (row.querySelector('input') as HTMLInputElement).value,
    (row.querySelector('.recipe-cost-line')?.textContent ?? '').trim()
  ]);

describe('RecipeCost', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('currency', 'USD');
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => {
    httpMock().verify();
    localStorage.clear();
  });

  const create = async (prices: Array<{ key: string; perKg: number }>, weightUnit?: string) => {
    if (weightUnit) localStorage.setItem('weightUnit', weightUnit);
    const fixture = TestBed.createComponent(RecipeCost);
    fixture.componentRef.setInput('materials', MATERIALS);
    fixture.componentRef.setInput('additives', [COBALT]);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    // Nothing is fetched until the costs are asked for.
    httpMock().expectNone(API + '/prices');
    expect(root.querySelector('.recipe-cost')).toBeNull();
    (root.querySelector('#cost-toggle') as HTMLButtonElement).click();
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/prices')
      .flush({ prices });
    await settle(fixture);
    return { fixture, root };
  };

  const typePrice = async (
    fixture: { whenStable(): Promise<unknown> },
    root: HTMLElement,
    i: number,
    value: string
  ) => {
    const input = root.querySelector('#price-' + i) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  it('costs the batch and each line from the prices, per kilogram of dry glaze', async () => {
    const { fixture, root } = await create([
      { key: 'potash', perKg: 2 },
      { key: 'whiting', perKg: 0.5 },
      { key: 'cobalt', perKg: 80 }
    ]);
    // 1000 g of base: 600 g at 2, 400 g at 0.5, and 20 g of cobalt at 80.
    expect(rows(root)).toEqual([
      ['Potash Feldspar', '2', '$1.20'],
      ['Whiting', '0.5', '$0.20'],
      ['Cobalt Carbonate', '80', '$1.60']
    ]);
    expect(text(fixture, '.recipe-cost-summary')).toBe(
      'This batch costs $3.00: $2.94 per kilogram of dry glaze, colorants and additives included.'
    );
    expect(text(fixture, 'thead')).toContain('Price per kg');
    expect(text(fixture, '.recipe-cost')).toContain('per kilogram, in USD');
  });

  it('names the materials with no price, and costs the rest, guessing nothing', async () => {
    const { fixture, root } = await create([{ key: 'potash', perKg: 2 }]);
    expect(rows(root)).toEqual([
      ['Potash Feldspar', '2', '$1.20'],
      ['Whiting', '', 'No price'],
      ['Cobalt Carbonate', '', 'No price']
    ]);
    expect(text(fixture, '.recipe-cost-summary')).toBe(
      'The materials with prices cost $1.20 in this batch. Give a price for Whiting and Cobalt Carbonate for the whole cost.'
    );

    // A price given is saved with the others, per kilogram.
    await typePrice(fixture, root, 1, '0.5');
    const put = httpMock().expectOne(API + '/prices');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      prices: [
        { key: 'potash', perKg: 2 },
        { key: 'whiting', perKg: 0.5 }
      ]
    });
    put.flush({});
    await settle(fixture);
    expect(rows(root)[1]).toEqual(['Whiting', '0.5', '$0.20']);
    expect(text(fixture, '.recipe-cost-summary')).toContain('Give a price for Cobalt Carbonate');

    // Not a number, or below 0: not saved, and said why.
    await typePrice(fixture, root, 2, '-3');
    httpMock().expectNone(API + '/prices');
    expect(text(fixture, '#price-problem-2')).toBe('Enter the price as a number of 0 or more, such as 2.5.');
    // Blank takes a price away.
    await typePrice(fixture, root, 0, '');
    httpMock()
      .expectOne(API + '/prices')
      .flush({});
    await settle(fixture);
    expect(rows(root)[0]).toEqual(['Potash Feldspar', '', 'No price']);
  });

  it('takes and shows prices per pound when weights are in pounds, and keeps them per kilogram', async () => {
    const { fixture, root } = await create([{ key: 'potash', perKg: 2 }], 'lb');
    // 2 a kilogram is 0.9072 a pound.
    expect(rows(root)[0]![1]).toBe('0.9072');
    expect(text(fixture, 'thead')).toContain('Price per lb');
    await typePrice(fixture, root, 1, '1');
    const put = httpMock().expectOne(API + '/prices');
    const whiting = (put.request.body as { prices: Array<{ key: string; perKg: number }> }).prices[1]!;
    expect(whiting.key).toBe('whiting');
    expect(whiting.perKg).toBeCloseTo(1 / 0.45359237, 9);
    put.flush({});
    await settle(fixture);
  });

  it('says when the prices cannot be fetched, and asks again', async () => {
    const fixture = TestBed.createComponent(RecipeCost);
    fixture.componentRef.setInput('materials', MATERIALS);
    fixture.componentRef.setInput('additives', []);
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('#cost-toggle') as HTMLButtonElement).click();
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/prices')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.recipe-cost-table')).toBeNull();
    expect(text(fixture, '.recipe-swap-problem')).toBe('Your prices could not be fetched. Please try again.');
    (root.querySelector('.recipe-cost button') as HTMLButtonElement).click();
    httpMock()
      .expectOne(API + '/prices')
      .flush({ prices: [] });
    await settle(fixture);
    expect(rows(root).length).toBe(2);
  });
});
