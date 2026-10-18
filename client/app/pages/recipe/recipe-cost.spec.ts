import { TestBed } from '@angular/core/testing';
import { Additive, RecipeMaterial } from '../../core/models';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { AuthService } from '../../core/auth.service';
import { PreferencesService } from '../../core/preferences.service';
import { PricesService } from '../../core/prices.service';
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

  it('with no prices at all, asks for them rather than giving a cost of nothing', async () => {
    const { fixture } = await create([]);
    expect(text(fixture, '.recipe-cost-summary')).toBe(
      "Give each material's price per kilogram to see what a batch costs."
    );
  });

  it('asks for prices per pound when weights are in pounds', async () => {
    const { fixture } = await create([], 'lb');
    expect(text(fixture, '.recipe-cost-summary')).toBe("Give each material's price per pound to see what a batch costs.");
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

    // A price given is sent alone, per kilogram, to be merged by key with the account's list.
    await typePrice(fixture, root, 1, '0.5');
    const put = httpMock().expectOne(API + '/prices');
    expect(put.request.method).toBe('PATCH');
    expect(put.request.body).toEqual({ set: [{ key: 'whiting', perKg: 0.5 }] });
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
    const removal = httpMock().expectOne(API + '/prices');
    expect(removal.request.method).toBe('PATCH');
    expect(removal.request.body).toEqual({ remove: ['potash'] });
    removal.flush({});
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
    const whiting = (put.request.body as { set: Array<{ key: string; perKg: number }> }).set[0]!;
    expect(whiting.key).toBe('whiting');
    expect(whiting.perKg).toBeCloseTo(1 / 0.45359237, 9);
    put.flush({});
    await settle(fixture);
  });

  it('sends the currency shown with the first price when the account has none chosen, and keeps what the server says', async () => {
    localStorage.removeItem('currency');
    const { fixture, root } = await create([]);
    await typePrice(fixture, root, 0, '2');
    const first = httpMock().expectOne(API + '/prices');
    expect(typeof first.request.body.currency).toBe('string');
    expect(first.request.body.currency).toMatch(/^[A-Z]{3}$/);
    first.flush({ prices: [{ key: 'potash', perKg: 2 }], currency: 'SEK' });
    await settle(fixture);
    expect(TestBed.inject(PreferencesService).currency()).toBe('SEK');
    // Once it is the account's, it is not sent again.
    await typePrice(fixture, root, 1, '1');
    const second = httpMock().expectOne(API + '/prices');
    expect(second.request.body.currency).toBeUndefined();
    second.flush({});
    await settle(fixture);
  });

  it('fetches the prices again when the session changes, and does not save into a list fetched for another', async () => {
    const { fixture, root } = await create([{ key: 'potash', perKg: 2 }]);
    TestBed.inject(AuthService).sessionVersion.update((v) => v + 1);
    await settle(fixture);
    httpMock()
      .expectOne(API + '/prices')
      .flush({ prices: [{ key: 'whiting', perKg: 7 }] });
    await settle(fixture);
    expect(rows(root)[0]).toEqual(['Potash Feldspar', '', 'No price']);
    expect(rows(root)[1]![1]).toBe('7');
    // A save for a list loaded in another session is refused before it is sent.
    const service = TestBed.inject(PricesService);
    TestBed.inject(AuthService).sessionVersion.update((v) => v + 1);
    expect(await service.set('potash', 3, 'USD')).toBe(false);
    httpMock().expectNone((req) => req.method !== 'GET');
    await settle(fixture);
    httpMock()
      .expectOne(API + '/prices')
      .flush({ prices: [] });
    await settle(fixture);
  });

  it('says how many of a trial’s prices were not copied for being in another currency', async () => {
    const { fixture } = await create([]);
    expect(fixture.nativeElement.querySelector('.recipe-cost-skipped')).toBeNull();
    TestBed.inject(AuthService).pricesSkipped.set(3);
    await settle(fixture);
    expect(text(fixture, '.recipe-cost-skipped')).toBe(
      "3 prices from your trial were in another currency than this account's, so not copied."
    );
  });

  it('tells a screen reader the cost once it settles, not on each keystroke', async () => {
    const { fixture, root } = await create([
      { key: 'potash', perKg: 2 },
      { key: 'whiting', perKg: 0.5 },
      { key: 'cobalt', perKg: 80 }
    ]);
    const live = () => (root.querySelector('[role="status"]') as HTMLElement).textContent?.trim();
    expect(root.querySelector('.recipe-cost-summary')?.getAttribute('role')).toBeNull();
    await new Promise((done) => setTimeout(done, 1200));
    await settle(fixture);
    expect(live()).toContain('This batch costs $3.00');
    const batch = root.querySelector('#cost-batch-size') as HTMLInputElement;
    batch.value = '2000';
    batch.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(root.querySelector('.recipe-cost-summary')?.textContent).toContain('$6.00');
    expect(live()).toContain('$3.00');
    await new Promise((done) => setTimeout(done, 1200));
    await settle(fixture);
    expect(live()).toContain('$6.00');
  });

  it('says so when the shown line costs do not add up to the shown total', async () => {
    const { fixture, root } = await create([
      { key: 'potash', perKg: 0.0075 },
      { key: 'whiting', perKg: 0.0075 },
      { key: 'cobalt', perKg: 0.0075 }
    ]);
    // 600 g, 400 g and 20 g at 0.0075 a kilogram: each line rounds to $0.00, but the total is $0.01.
    expect(root.querySelector('.recipe-cost-rounding')).not.toBeNull();
    expect(text(fixture, '.recipe-cost-rounding')).toContain('unrounded');
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
