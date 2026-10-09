import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, map } from 'rxjs';
import { languageFor } from '../../../../lib/regions/languages';
import { PAGE_LANGUAGE } from '../../i18n/language';

/** A guide's Markdown, and the language it is in where that is not the page's. */
export interface GuideText {
  text: string;
  /** 'en' when the guide is not translated into the page's language yet. */
  language: string | null;
}

/**
 * Loads a guide's Markdown before its page opens (the route's data names it):
 * the page's language's, or the English where there is none yet. A pseudo-locale
 * reads the English, and the page shows it pseudo-translated.
 */
export const guideText: ResolveFn<GuideText> = (route) => {
  const http = inject(HttpClient);
  const language = inject(PAGE_LANGUAGE);
  const file = (code: string) => http.get(`/i18n/guides/${route.data['guide']}/${code}.md`, { responseType: 'text' });
  const english = file('en').pipe(map((text) => ({ text, language: null })));
  if (language === 'en' || languageFor(language)?.pseudo) return english;
  return file(language).pipe(
    map((text) => ({ text, language: null })),
    catchError(() => file('en').pipe(map((text) => ({ text, language: 'en' }))))
  );
};
