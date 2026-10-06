import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { routes } from '../app.routes';
import { signedInGuard, visitorsOnlyGuard } from './signed-in.guard';

describe('signedInGuard and visitorsOnlyGuard', () => {
  let configured = false;
  const setup = (session: 'account' | 'trial' | null) => {
    configured = true;
    localStorage.clear();
    if (session) localStorage.setItem('session', session);
    TestBed.configureTestingModule({ providers: testProviders() });
  };
  const run = (guard: typeof signedInGuard) =>
    TestBed.runInInjectionContext(() => guard({} as never, {} as never)) as Promise<boolean | UrlTree>;
  const url = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);
  /** Answers the guards' first check with the server. */
  const verify = (body: object, status = 200) =>
    httpMock()
      .expectOne(API + '/verify')
      .flush(body, { status, statusText: status === 200 ? 'OK' : 'Unauthorized' });

  // The route-list tests below need no HTTP, so they set nothing up.
  afterEach(() => {
    if (configured) httpMock().verify();
    configured = false;
  });

  it('lets signed-in users into the app, once the server confirms it, and sends them from the intro page home', async () => {
    setup('account');
    const result = run(signedInGuard);
    verify({ msg: 'User verified', id: 'u1', email: 'a@b.com' });
    expect(await result).toBe(true);
    // The server is asked once; later navigations use the answer.
    expect(url(await run(visitorsOnlyGuard))).toBe('/home');
  });

  it('sends signed-out visitors to sign in without asking the server, and shows them the intro page', async () => {
    setup(null);
    const result = await run(signedInGuard);
    expect(result).toBeInstanceOf(UrlTree);
    expect(url(result)).toBe('/signin');
    expect(await run(visitorsOnlyGuard)).toBe(true);
  });

  it('sends someone whose cookie expired while the site was closed to sign in, not into the app', async () => {
    setup('account');
    const result = run(signedInGuard);
    verify({ msg: 'No token yet, so there is no email to find. Goodbye.' });
    expect(url(await result)).toBe('/signin');

    TestBed.resetTestingModule();
    setup('account');
    const rejected = run(signedInGuard);
    verify({ msg: 'could not authenticate user' }, 401);
    expect(url(await rejected)).toBe('/signin');
  });

  it('sends a visitor whose trial just ran out to the start page, which says so', async () => {
    setup('trial');
    localStorage.setItem('trial', JSON.stringify({ name: 'rusty humble jugs', expiresAt: '2020-01-01T00:00:00Z' }));
    expect(url(await run(signedInGuard))).toBe('/');
    expect(await run(visitorsOnlyGuard)).toBe(true);
  });

  it('guards every page that loads the user’s data, and only those', () => {
    const guarded = routes
      .filter((r) => r.canActivate?.includes(signedInGuard))
      .map((r) => r.path)
      .sort();
    expect(guarded).toEqual(['account', 'additive', 'firing', 'home', 'material', 'notes', 'recipe', 'trash']);
  });

  it('keeps the public pages public', () => {
    const open = routes.filter((r) => !r.canActivate?.length && r.path !== '**').map((r) => r.path);
    expect(open).toEqual(['advice', 'about', 'privacy', 'signin', 'signup', 'forgot', 'reset']);
  });
});
