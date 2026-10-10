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

  it("drops the account's choices when its session ends, and brings back the visitor's own", async () => {
    // A visitor chose German from the footer, then signed in to an account that has lead on.
    localStorage.setItem('session', 'account');
    const preferences = TestBed.inject(PreferencesService);
    const auth = TestBed.inject(AuthService);
    preferences.remember('language', 'de');
    const loading = preferences.load();
    httpMock()
      .expectOne(API + '/preferences')
      .flush({ lead: 'on', language: 'fr', weightUnit: 'lb' });
    await loading;
    expect([preferences.lead(), preferences.language(), localStorage.getItem('lead')]).toEqual(['on', 'fr', 'on']);

    const out = auth.signOut();
    httpMock()
      .expectOne(API + '/signout')
      .flush({});
    await out;
    expect([preferences.lead(), preferences.language(), preferences.weightUnit()]).toEqual(['off', 'de', 'g']);
    expect([localStorage.getItem('lead'), localStorage.getItem('language')]).toEqual(['off', 'de']);

    // The next person's trial starts from that, and keeps it if its own choices cannot be fetched.
    const starting = auth.startTrial();
    httpMock()
      .expectOne(API + '/guest')
      .flush({ name: 'quiet kilns', expiresAt: new Date(Date.now() + 86400000).toISOString() });
    await starting;
    const again = preferences.load();
    httpMock()
      .expectOne(API + '/preferences')
      .flush(null, serverError);
    await again;
    expect(preferences.lead()).toBe('off');
  });

  it('drops the choices of a trial that ran out while the site was closed', () => {
    localStorage.setItem('session', 'trial');
    localStorage.setItem('trial', JSON.stringify({ name: 'rusty humble jugs', expiresAt: '2020-01-01T00:00:00Z' }));
    localStorage.setItem('lead', 'on');
    expect(TestBed.inject(PreferencesService).lead()).toBe('off');
    expect(localStorage.getItem('lead')).toBe('off');
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
