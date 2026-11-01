import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { filesFor } from '../../../lib/offline-files';
import { httpMock } from '../testing/test-providers';
import { offlineFilesInterceptor } from './offline-files.interceptor';
import { OfflineLanguages } from './offline-languages';

/** Cache Storage in memory: the addresses kept, with their replies. */
class FakeCache {
  readonly entries = new Map<string, Response>();
  put(address: string, reply: Response): Promise<void> {
    this.entries.set(address, reply);
    return Promise.resolve();
  }
  match(address: string): Promise<Response | undefined> {
    return Promise.resolve(this.entries.get(address)?.clone());
  }
  keys(): Promise<Request[]> {
    return Promise.resolve(
      [...this.entries.keys()].map((address) => ({ url: 'http://localhost' + address }) as Request)
    );
  }
  delete(request: Request): Promise<boolean> {
    return Promise.resolve(this.entries.delete(new URL(request.url).pathname));
  }
}

describe('the files kept for offline use', () => {
  let cache: FakeCache;
  let fetched: string[];
  let missing: string[];

  beforeEach(() => {
    localStorage.clear();
    cache = new FakeCache();
    fetched = [];
    missing = [];
    vi.stubGlobal('caches', { open: () => Promise.resolve(cache) });
    vi.stubGlobal('fetch', (address: string) => {
      fetched.push(address);
      return Promise.resolve(
        missing.includes(address)
          ? new Response('', { status: 404 })
          : new Response(address.endsWith('.json') ? '{"a":1}' : '# text')
      );
    });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([offlineFilesInterceptor])), provideHttpClientTesting()]
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('keeping', () => {
    it("fetches the reader's language and English, and nothing else", async () => {
      await TestBed.inject(OfflineLanguages).keep('ur');
      expect(new Set(fetched)).toEqual(new Set([...filesFor('ur'), ...filesFor('en')]));
      expect([...cache.entries.keys()].some((address) => /\/de\.|\/hi\./.test(address))).toBe(false);
      expect(cache.entries.has('/i18n/ur.json')).toBe(true);
      expect(cache.entries.has('/i18n/guides/safe-mixing/ur.md')).toBe(true);
      expect(cache.entries.has('/i18n/en.json')).toBe(true);
    });

    it('skips the files a language does not have yet', async () => {
      missing = ['/i18n/guides/firing/ur.md'];
      await TestBed.inject(OfflineLanguages).keep('ur');
      expect(cache.entries.has('/i18n/guides/firing/ur.md')).toBe(false);
      expect(cache.entries.has('/i18n/guides/firing/en.md')).toBe(true);
    });

    it("drops the files of a language the reader left, and keeps English's", async () => {
      await cache.put('/i18n/de.json', new Response('{}'));
      await cache.put('/i18n/guides/firing/de.md', new Response('x'));
      await TestBed.inject(OfflineLanguages).keep('ur');
      expect([...cache.entries.keys()].filter((address) => address.includes('/de.'))).toEqual([]);
      expect(cache.entries.has('/i18n/en.json')).toBe(true);
    });

    it('fetches a language once a day, and again for another', async () => {
      const kept = TestBed.inject(OfflineLanguages);
      await kept.keep('ur');
      const first = fetched.length;
      await kept.keep('ur');
      expect(fetched.length).toBe(first);
      await kept.keep('de');
      expect(fetched.length).toBeGreaterThan(first);
      const later = fetched.length;
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);
      await kept.keep('de');
      expect(fetched.length).toBeGreaterThan(later);
    });

    it('does nothing with no network, or no room to keep files', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      await TestBed.inject(OfflineLanguages).keep('ur');
      expect(fetched).toEqual([]);
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      cache.put = () => Promise.reject(new Error('full'));
      await expect(TestBed.inject(OfflineLanguages).keep('ur')).resolves.toBeUndefined();
      expect(localStorage.getItem('offlineLanguage')).toBeNull();
    });
  });

  describe('saved languages', () => {
    it('are English and those with files kept; a language opens offline only if saved', async () => {
      const kept = TestBed.inject(OfflineLanguages);
      expect(await kept.saved()).toEqual(['en']);
      await kept.keep('ur');
      expect((await kept.saved()).sort()).toEqual(['en', 'ur']);
      expect(await kept.canOpen('de')).toBe(true);
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      expect(await kept.canOpen('de')).toBe(false);
      expect(await kept.canOpen('ur')).toBe(true);
      expect(await kept.canOpen('en')).toBe(true);
    });
  });

  describe('reading when the network fails', () => {
    const network = { status: 0, statusText: 'Unknown Error' };

    it('answers a translation or a guide from the copy kept', async () => {
      await cache.put('/i18n/de.json', new Response('{"nav":{"menu":"Menü"}}'));
      await cache.put('/i18n/guides/firing/de.md', new Response('# Brennen'));
      const json = firstValueFrom(TestBed.inject(HttpClient).get('/i18n/de.json'));
      httpMock().expectOne('/i18n/de.json').flush(null, network);
      expect(await json).toEqual({ nav: { menu: 'Menü' } });
      const md = firstValueFrom(TestBed.inject(HttpClient).get('/i18n/guides/firing/de.md', { responseType: 'text' }));
      httpMock().expectOne('/i18n/guides/firing/de.md').flush(null, network);
      expect(await md).toBe('# Brennen');
    });

    it('fails as before for a file not kept, another address, or a reply that came', async () => {
      await cache.put('/api/x', new Response('{}'));
      for (const [address, init] of [
        ['/i18n/fr.json', network],
        ['/api/x', network],
        ['/i18n/de.json', { status: 404, statusText: 'Not Found' }]
      ] as const) {
        await cache.put('/i18n/de.json', new Response('{}'));
        const reply = firstValueFrom(TestBed.inject(HttpClient).get(address));
        httpMock().expectOne(address).flush(null, init);
        const error = await reply.catch((e: unknown) => e);
        expect(error, address).toBeInstanceOf(HttpErrorResponse);
        expect((error as HttpErrorResponse).status, address).toBe(init.status);
      }
    });
  });
});
