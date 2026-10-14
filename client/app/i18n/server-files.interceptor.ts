import {
  FetchBackend,
  HttpBackend,
  HttpErrorResponse,
  HttpEvent,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, defer, from } from 'rxjs';

/**
 * Reads a file under /i18n/ ('de.json', 'guides/firing/de.md') for the render,
 * or null where there is none. The prerender script gives it the built files;
 * the client has no file access of its own.
 */
export type ReadI18nFile = (file: string) => Promise<string | null>;
export const READ_I18N_FILE = new InjectionToken<ReadI18nFile>('READ_I18N_FILE');

const PREFIX = '/i18n/';

/**
 * During the render, answers the GETs for the translations and the guides'
 * Markdown from the built files, as the server would; any other request goes
 * to fetch. It is the backend, not an interceptor, because the HTTP transfer
 * cache is an interceptor that runs after the app's own, and has to see the
 * reply to keep it in the page. The browser then needs no request for these
 * files before it hydrates.
 */
@Injectable()
export class ServerFilesBackend implements HttpBackend {
  private readonly read = inject(READ_I18N_FILE);
  private readonly fetch = inject(FetchBackend);

  handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    // The render has made the address absolute by now (http://localhost/i18n/de.json).
    const path = req.method === 'GET' ? new URL(req.url, 'http://localhost').pathname : '';
    if (!path.startsWith(PREFIX)) return this.fetch.handle(req);
    const file = path.slice(PREFIX.length);
    // Only files inside the folder.
    if (file.split('/').some((part) => part === '..' || part === '')) return this.fetch.handle(req);
    return defer(() =>
      from(
        this.read(file).then((text): HttpEvent<unknown> => {
          if (text === null) throw new HttpErrorResponse({ url: req.url, status: 404, statusText: 'Not Found' });
          return new HttpResponse({
            url: req.url,
            status: 200,
            body: req.responseType === 'json' ? JSON.parse(text) : text
          });
        })
      )
    );
  }
}
