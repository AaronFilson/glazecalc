import { HttpBackend } from '@angular/common/http';
import { ApplicationConfig, CSP_NONCE, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import { ServerFilesBackend } from './i18n/server-files.interceptor';

/**
 * Stands for the nonce in the prerendered pages: Angular writes it on the
 * <style> elements it adds, and the server swaps it for each reply's own
 * (server/app.ts).
 */
export const NONCE_PLACEHOLDER = '__GC_NONCE__';

// The providers only the render needs.
export const appServerConfig: ApplicationConfig = mergeApplicationConfig(appConfig, {
  providers: [
    provideServerRendering(),
    // After the app's own HTTP setup, whose backend (fetch) this wraps.
    { provide: HttpBackend, useClass: ServerFilesBackend },
    { provide: CSP_NONCE, useValue: NONCE_PLACEHOLDER }
  ]
});
