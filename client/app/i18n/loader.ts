import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { catchError, from, map, of, switchMap, throwError } from 'rxjs';
import { languageFor } from '../../../lib/regions/languages';

/**
 * Translations are JSON files, one per language and part of the app
 * (client/public/i18n/en.json, client/public/i18n/recipe/de.json), so a page
 * loads only its own. Pseudo-locales are made from the English, by code
 * loaded only for them.
 *
 * The messages that come with a code or with the app's data (i18n/coded.ts)
 * have their English there: their English files are for translators and
 * pseudo-locales, and the app never reads them, so they are not fetched. On an
 * English page, or as the English fallback of another language's, they are
 * empty, and the code's or the data's own English shows, the same words.
 * Exactly 'en': a pseudo-locale is made from the English file.
 *
 * A file a language does not have yet (a part not translated, the server's
 * messages before they are) is read as empty, so each message shows its
 * English. Failing instead would make Transloco take the whole page to the
 * next language, English.
 */
/** The parts whose English comes with the code or the data (i18n/coded.ts). */
export const CODED_SCOPES = ['server', 'chemistry', 'records', 'safety', 'regions', 'advice', 'materials', 'cones'];

@Injectable({ providedIn: 'root' })
export class FileLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  /** path is a language ('de') or a part of the app and a language ('recipe/de'). */
  getTranslation(path: string) {
    const slash = path.lastIndexOf('/');
    const folder = path.slice(0, slash + 1);
    const code = path.slice(slash + 1);
    if (code === 'en' && CODED_SCOPES.includes(folder.slice(0, -1))) return of({} as Translation);
    const pseudo = languageFor(code)?.pseudo;
    const file = this.http
      .get<Translation>(`/i18n/${folder}${pseudo ? 'en' : code}.json`)
      .pipe(
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse && error.status === 404 ? of({} as Translation) : throwError(() => error)
        )
      );
    if (!pseudo) return file;
    return from(import('./pseudo')).pipe(
      switchMap(({ pseudoTranslation }) => file.pipe(map((translation) => pseudoTranslation(translation, code))))
    );
  }
}
