import { FetchBackend, HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { READ_I18N_FILE, ServerFilesBackend } from './server-files.interceptor';

// The render reads the built translation and guide files itself; any other
// request goes on to fetch.
describe('ServerFilesBackend', () => {
  const files: Record<string, string> = {
    'de.json': '{"hello":"Hallo"}',
    'guides/firing/de.md': '# Brennen'
  };
  let fetched: ReturnType<typeof vi.fn>;

  const backend = () => {
    TestBed.configureTestingModule({
      providers: [
        ServerFilesBackend,
        { provide: READ_I18N_FILE, useValue: async (file: string) => files[file] ?? null },
        { provide: FetchBackend, useValue: { handle: fetched } }
      ]
    });
    return TestBed.inject(ServerFilesBackend);
  };
  const get = (url: string, responseType: 'json' | 'text' = 'json') =>
    new HttpRequest('GET', url, null, { responseType });

  beforeEach(() => {
    fetched = vi.fn((req: HttpRequest<unknown>) => of(new HttpResponse({ url: req.url, body: 'from fetch' })));
  });

  it('answers a translation file with its parsed JSON, and a guide with its text', async () => {
    const target = backend();
    const json = (await firstValueFrom(target.handle(get('/i18n/de.json')))) as HttpResponse<unknown>;
    expect(json.status).toBe(200);
    expect(json.body).toEqual({ hello: 'Hallo' });
    const text = (await firstValueFrom(
      target.handle(get('/i18n/guides/firing/de.md', 'text'))
    )) as HttpResponse<unknown>;
    expect(text.body).toBe('# Brennen');
    expect(fetched).not.toHaveBeenCalled();
  });

  it('reads the address the render has made absolute', async () => {
    const target = backend();
    const reply = (await firstValueFrom(
      target.handle(get('http://localhost/i18n/de.json'))
    )) as HttpResponse<unknown>;
    expect(reply.body).toEqual({ hello: 'Hallo' });
    expect(fetched).not.toHaveBeenCalled();
  });

  it('answers a file that is not there with a 404, as the server does', async () => {
    const target = backend();
    const error = await firstValueFrom(target.handle(get('/i18n/fr.json'))).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(404);
  });

  it('leaves other requests, and paths that leave the folder, to fetch', async () => {
    const target = backend();
    for (const request of [
      get('/api/materials'),
      get('/i18n/../package.json'),
      get('/i18n/'),
      new HttpRequest('POST', '/i18n/de.json', {})
    ]) {
      expect(await firstValueFrom(target.handle(request))).toBeInstanceOf(HttpResponse);
    }
    expect(fetched).toHaveBeenCalledTimes(4);
  });
});
