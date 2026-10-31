import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling, withNavigationErrorHandler } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { offlineFilesInterceptor } from './core/offline-files.interceptor';
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
    // The translations and guides come from the copy the phone keeps when the network is gone.
    provideHttpClient(withFetch(), withInterceptors([sessionExpiredInterceptor, offlineFilesInterceptor])),
    // The prerendered pages are adopted, not drawn again. Only the translation and guide files go in the
    // page for the browser to reuse, so it makes no request for them before it hydrates. No event
    // replay: it needs an inline script, which the build cannot hash into the page's policy.
    provideClientHydration(
      withHttpTransferCacheOptions({ includeHeaders: [], filter: (req) => req.url.startsWith('/i18n/') })
    ),
    // The page's language from its URL (/de/recipe), and its messages.
    ...provideI18n(),
    // The colors chosen in Settings, light, dark or as the device is set.
    provideAppInitializer(() => watchTheme()),
    // The service worker (docs/adr/0028-service-worker.md; scripts/service-worker.mjs, ngsw-config.json) keeps the
    // app and the public pages on the device, so they open without a network. Only in the browser, in a build
    // that has it (not ng serve or ng build --configuration development), and 30 s after the page is up at
    // the latest, so its downloads never compete with the page's own.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
