import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling, withNavigationErrorHandler } from '@angular/router';
import { routes } from './app.routes';
import { sessionExpiredInterceptor } from './core/session-expired.interceptor';
import { redirectLegacyHashUrl } from './core/legacy-hash-url';
import { reloadIfCodeIsMissing } from './core/stale-build';
import { watchTheme } from './core/theme';
import { provideI18n } from './i18n/provide-i18n';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Plain paths (/recipe); the server sends index.html for them. Old /#/ links still work.
    // Only in the browser: the render has no history to change.
    provideAppInitializer(() => {
      if (isPlatformBrowser(inject(PLATFORM_ID))) redirectLegacyHashUrl();
    }),
    // A tab opened before a deploy loads a page afresh when its old code file is gone.
    // An address with a section (/guides/firing#cones) opens at that section. Back and forward
    // leave the scroll position to the browser; app.ts takes a new page to its top.
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled' }),
      withNavigationErrorHandler((error) => reloadIfCodeIsMissing(error))
    ),
    provideHttpClient(withFetch(), withInterceptors([sessionExpiredInterceptor])),
    // The prerendered pages are adopted, not drawn again. Only the translation and guide files go in the
    // page for the browser to reuse, so it makes no request for them before it hydrates. No event
    // replay: it needs an inline script, which the build cannot hash into the page's policy.
    provideClientHydration(
      withHttpTransferCacheOptions({ includeHeaders: [], filter: (req) => req.url.startsWith('/i18n/') })
    ),
    // The page's language from its URL (/de/recipe), and its messages.
    ...provideI18n(),
    // The colors chosen in Settings, light, dark or as the device is set.
    provideAppInitializer(() => watchTheme())
  ]
};
