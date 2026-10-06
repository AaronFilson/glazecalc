import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { testProviders } from '../testing/test-providers';
import { routes } from '../app.routes';
import { signedInGuard, startPage } from './signed-in.guard';

describe('signedInGuard and startPage', () => {
  const setup = (token: string | null) => {
    localStorage.clear();
    if (token) localStorage.setItem('token', token);
    TestBed.configureTestingModule({ providers: testProviders() });
  };
  const guard = () => TestBed.runInInjectionContext(() => signedInGuard({} as never, {} as never));

  it('lets signed-in users through and starts them at home', () => {
    setup('tok');
    expect(guard()).toBe(true);
    expect(TestBed.runInInjectionContext(startPage)).toBe('/home');
  });

  it('sends signed-out visitors to sign in', () => {
    setup(null);
    const result = guard();
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/signin');
    expect(TestBed.runInInjectionContext(startPage)).toBe('/signin');
  });

  it('guards every page that loads the user’s data, and only those', () => {
    const guarded = routes.filter((r) => r.canActivate?.includes(signedInGuard)).map((r) => r.path).sort();
    expect(guarded).toEqual(['account', 'additive', 'advice', 'firing', 'material', 'notes', 'recipe', 'trash']);
  });
});
