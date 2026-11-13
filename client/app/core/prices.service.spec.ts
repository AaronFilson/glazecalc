import { TestBed } from '@angular/core/testing';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';
import { PreferencesService } from './preferences.service';
import { PricesService } from './prices.service';

describe('PricesService', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  /** The account's prices, loaded. */
  const loaded = async () => {
    const prices = TestBed.inject(PricesService);
    const loading = prices.load();
    httpMock()
      .expectOne(API + '/prices')
      .flush({ prices: [{ key: 'silica', perKg: 2 }] });
    await loading;
    return prices;
  };

  it('says when a price could not be saved, and that it was not', async () => {
    const prices = await loaded();
    const saving = prices.set('kaolin', 3, 'USD');
    httpMock()
      .expectOne(API + '/prices')
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(await saving).toBe(false);
    expect(prices.problem()).toBe('The price could not be saved. Please try again.');
  });

  it("leaves the next account's prices alone when an answer comes after the sign-in it was for ended", async () => {
    const prices = await loaded();
    const saving = prices.set('kaolin', 3, 'USD');
    const answer = httpMock().expectOne(API + '/prices');
    // Someone else signs in on this tab meanwhile.
    TestBed.inject(AuthService).sessionVersion.update((version) => version + 1);
    answer.flush({
      prices: [
        { key: 'silica', perKg: 2 },
        { key: 'kaolin', perKg: 3 }
      ],
      currency: 'USD'
    });
    expect(await saving).toBe(true);
    expect(prices.problem()).toBe('');
  });

  it('fetches the prices once for each sign-in, and saves one, taking the currency shown with the first', async () => {
    const prices = TestBed.inject(PricesService);
    const loading = prices.load();
    expect(prices.load()).toBe(loading);
    httpMock()
      .expectOne(API + '/prices')
      .flush({ prices: [] });
    await loading;
    await prices.load();
    httpMock().expectNone(API + '/prices');

    const saving = prices.set('silica', 2, 'EUR');
    const req = httpMock().expectOne(API + '/prices');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ set: [{ key: 'silica', perKg: 2 }], currency: 'EUR' });
    req.flush({ prices: [{ key: 'silica', perKg: 2 }], currency: 'EUR' });
    expect(await saving).toBe(true);
    expect(prices.prices()).toEqual([{ key: 'silica', perKg: 2 }]);
    expect(TestBed.inject(PreferencesService).currency()).toBe('EUR');
  });

  it('says when the prices could not be fetched, and saves nothing over a list it does not have', async () => {
    const prices = TestBed.inject(PricesService);
    const loading = prices.load();
    httpMock()
      .expectOne(API + '/prices')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await loading;
    expect(prices.prices()).toBeNull();
    expect(prices.problem()).not.toBe('');
    expect(await prices.set('silica', 2, 'EUR')).toBe(false);
    httpMock().expectNone(API + '/prices');
    // Asked again the next time it is needed.
    const again = prices.load();
    httpMock()
      .expectOne(API + '/prices')
      .flush({ prices: [] });
    await again;
    expect(prices.problem()).toBe('');
  });
});
