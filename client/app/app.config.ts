import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
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
    provideAppInitializer(() => redirectLegacyHashUrl()),
    // A tab opened before a deploy loads a page afresh when its old code file is gone.
    // An address with a section (/guides/firing#cones) opens at that section. Back and forward
    // leave the scroll position to the browser; app.ts takes a new page to its top.
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled' }),
      withNavigationErrorHandler((error) => reloadIfCodeIsMissing(error))
    ),
    provideHttpClient(withFetch(), withInterceptors([sessionExpiredInterceptor])),
    // The page's language from its URL (/de/recipe), and its messages.
    ...provideI18n(),
    // The colors chosen in Settings, light, dark or as the device is set.
    provideAppInitializer(() => watchTheme())
  ]
};
