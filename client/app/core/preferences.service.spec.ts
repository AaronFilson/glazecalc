import { TestBed } from '@angular/core/testing';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';
import { PreferencesService } from './preferences.service';

describe('PreferencesService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const serverError = { status: 500, statusText: 'Server Error' };

  it("fetches the account's choices once per sign-in, and keeps a copy on this browser", async () => {
    const preferences = TestBed.inject(PreferencesService);
    expect(preferences.weightUnit()).toBe('g');
    const loading = preferences.load();
    expect(preferences.load()).toBe(loading);
    httpMock()
      .expectOne(API + '/preferences')
      .flush({ weightUnit: 'lb', gramPrecision: 'full' });
    await loading;
    expect([preferences.weightUnit(), preferences.gramPrecision()]).toEqual(['lb', 'full']);
    expect([localStorage.getItem('weightUnit'), localStorage.getItem('gramPrecision')]).toEqual(['lb', 'full']);
    await preferences.load();
    httpMock().expectNone(API + '/preferences');

    // Someone else signs in on this browser.
    TestBed.inject(AuthService).sessionVersion.update((version) => version + 1);
    const again = preferences.load();
    // An answer the app does not know reads as the default.
    httpMock()
      .expectOne(API + '/preferences')
      .flush({ weightUnit: 'g', gramPrecision: 'double' });
    await again;
    expect([preferences.weightUnit(), preferences.gramPrecision()]).toEqual(['g', 'single']);
  });

  it('keeps the copy on this browser when the server cannot answer, and asks again next time', async () => {
    localStorage.setItem('weightUnit', 'lb');
    const preferences = TestBed.inject(PreferencesService);
    expect(preferences.weightUnit()).toBe('lb');
    const loading = preferences.load();
    httpMock()
      .expectOne(API + '/preferences')
      .flush(null, serverError);
    await loading;
    expect(preferences.weightUnit()).toBe('lb');
    void preferences.load();
    httpMock()
      .expectOne(API + '/preferences')
      .flush({ weightUnit: 'lb' });
  });

  it("keeps a choice made while the account's choices are on their way", async () => {
    const preferences = TestBed.inject(PreferencesService);
    const loading = preferences.load();
    const saving = preferences.set('weightUnit', 'lb');
    httpMock()
      .expectOne((req) => req.method === 'GET')
      .flush({ weightUnit: 'g', gramPrecision: 'full' });
    await loading;
    // The answer was sent before the change: the change stays; the other choice is taken.
    expect([preferences.weightUnit(), preferences.gramPrecision()]).toEqual(['lb', 'full']);
    httpMock()
      .expectOne((req) => req.method === 'PUT')
      .flush({ weightUnit: 'lb', gramPrecision: 'full' });
    await saving;
    expect(localStorage.getItem('weightUnit')).toBe('lb');
  });

  it('saves a choice to the account, and puts the old one back if that fails', async () => {
    const preferences = TestBed.inject(PreferencesService);
    const saving = preferences.set('weightUnit', 'lb');
    expect(preferences.weightUnit()).toBe('lb');
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ weightUnit: 'lb' });
    req.flush({ weightUnit: 'lb' });
    await saving;

    const failing = preferences.set('weightUnit', 'g');
    httpMock()
      .expectOne(API + '/preferences')
      .flush(null, serverError);
    await expect(failing).rejects.toBeTruthy();
    expect(preferences.weightUnit()).toBe('lb');
    expect(localStorage.getItem('weightUnit')).toBe('lb');
  });
});
