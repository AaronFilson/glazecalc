import { TestBed } from '@angular/core/testing';
import { API, answer, httpMock, settle, testProviders } from '../testing/test-providers';
import { PreferencesService } from './preferences.service';
import { applyTheme, watchTheme } from './theme';

describe('theme', () => {
  const root = () => document.documentElement;
  const attributes = () => ['data-theme', 'data-palette', 'data-bs-theme'].map((name) => root().getAttribute(name));
  const media = (matches: boolean) => ({ matches }) as MediaQueryList;

  beforeEach(() => {
    localStorage.clear();
    for (const name of ['data-theme', 'data-palette', 'data-bs-theme']) root().removeAttribute(name);
  });

  it('follows the device unless a mode is chosen, and marks palettes other than the first', () => {
    applyTheme('system', 'tenmoku', root(), media(true));
    expect(attributes()).toEqual([null, null, 'dark']);
    applyTheme('system', 'cobalt', root(), media(false));
    expect(attributes()).toEqual([null, 'cobalt', 'light']);
    // A choice wins over the device.
    applyTheme('light', 'celadon', root(), media(true));
    expect(attributes()).toEqual(['light', 'celadon', 'light']);
    applyTheme('dark', 'tenmoku', root(), media(false));
    expect(attributes()).toEqual(['dark', null, 'dark']);
  });

  it("colors the browser's bar for a chosen mode, and as the device is set otherwise", () => {
    const bars = ['light', 'dark'].map((scheme) => {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.setAttribute('media', `(prefers-color-scheme: ${scheme})`);
      document.head.appendChild(meta);
      return meta;
    });
    const contents = () => bars.map((meta) => meta.content);
    applyTheme('dark', 'tenmoku', root(), media(false));
    expect(contents()).toEqual(['#1e1a17', '#1e1a17']);
    applyTheme('system', 'tenmoku', root(), media(false));
    expect(contents()).toEqual(['#f7f3ec', '#1e1a17']);
    bars.forEach((meta) => meta.remove());
  });

  describe('watchTheme', () => {
    beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
    afterEach(() => httpMock().verify());

    it("keeps the page in the account's colors, fetched once the session is confirmed", async () => {
      localStorage.setItem('session', 'account');
      localStorage.setItem('palette', 'shino');
      TestBed.runInInjectionContext(() => watchTheme());
      TestBed.tick();
      // This browser's copy, at once.
      expect(root().getAttribute('data-palette')).toBe('shino');
      // No preferences are asked for until the server confirms who is signed in.
      httpMock().expectNone(API + '/preferences');
      answer('/verify', { msg: 'User verified', id: 'u1', email: 'a@b.com' });
      await settle();
      answer('/preferences', { weightUnit: 'g', gramPrecision: 'single', theme: 'dark', palette: 'oxblood' });
      await settle();
      TestBed.tick();
      expect(root().getAttribute('data-theme')).toBe('dark');
      expect(root().getAttribute('data-palette')).toBe('oxblood');

      const preferences = TestBed.inject(PreferencesService);
      const saving = preferences.set('palette', 'tenmoku');
      TestBed.tick();
      expect(root().getAttribute('data-palette')).toBeNull();
      httpMock()
        .expectOne((req) => req.method === 'PUT')
        .flush({});
      await saving;
    });

    it('asks for nothing without a session', async () => {
      TestBed.runInInjectionContext(() => watchTheme());
      TestBed.tick();
      await settle();
      httpMock().expectNone(API + '/verify');
      httpMock().expectNone(API + '/preferences');
      expect(root().getAttribute('data-bs-theme')).toMatch(/^(light|dark)$/);
    });
  });
});
