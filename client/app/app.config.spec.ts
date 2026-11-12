import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_BASE_HREF } from '@angular/common';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import en from '../public/i18n/en.json';
import { appConfig } from './app.config';
import { PAGE_LANGUAGE } from './i18n/language';

// The app as main.ts starts it (app.config.ts), with the network faked: what it does before the first page.

describe('the app’s start', () => {
  const root = document.documentElement;
  afterEach(() => {
    history.replaceState(null, '', '/');
    localStorage.clear();
    sessionStorage.clear();
    for (const name of ['data-theme', 'data-bs-theme', 'data-palette', 'lang', 'dir']) root.removeAttribute(name);
  });

  /** Starts the app's services at an address, its English messages answered from the app's own file. */
  const start = async (address: string) => {
    history.replaceState(null, '', address);
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/i18n/en.json').flush(en);
    await TestBed.inject(ApplicationInitStatus).donePromise;
    return http;
  };

  it('opens an old /#/ link at its plain address', async () => {
    await start('/#/reset?token=abc');
    expect(location.pathname + location.search + location.hash).toBe('/reset?token=abc');
  });

  it('reads the page’s language from its address, and its messages are there before the first page', async () => {
    await start('/guides');
    expect(TestBed.inject(PAGE_LANGUAGE)).toBe('en');
    expect(TestBed.inject(APP_BASE_HREF)).toBe('/');
    expect(root.lang).toBe('en');
    expect(root.dir).toBe('ltr');
    expect(TestBed.inject(TranslocoService).translate('nav.signIn')).toBe('Sign in');
  });

  it('puts the page in the colors chosen in Settings', async () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('palette', 'celadon');
    await start('/about');
    TestBed.tick();
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.getAttribute('data-bs-theme')).toBe('dark');
    expect(root.getAttribute('data-palette')).toBe('celadon');
  });

  it('loads a page afresh when its code file is gone after a deploy, and not again within a minute', async () => {
    await start('/advice');
    const router = TestBed.inject(Router);
    const gone = vi.fn(() =>
      Promise.reject(new TypeError('Failed to fetch dynamically imported module: /chunk-OLD.js'))
    );
    router.resetConfig([{ path: 'advice', loadComponent: gone }]);
    expect(await router.navigateByUrl('/advice').catch(() => false)).toBe(false);
    const noted = JSON.parse(sessionStorage.getItem('reloadedFor')!);
    expect(noted.url).toBe('/advice');
    expect(Date.now() - noted.at).toBeLessThan(60_000);

    // Failing again at once is an outage, not an old tab: no loop of reloads.
    const before = JSON.stringify({ url: '/advice', at: Date.now() });
    sessionStorage.setItem('reloadedFor', before);
    expect(await router.navigateByUrl('/advice').catch(() => false)).toBe(false);
    expect(sessionStorage.getItem('reloadedFor')).toBe(before);
    expect(gone).toHaveBeenCalledTimes(2);
  });
});
