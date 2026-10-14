import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

// The providers only the render needs. The prerender stream adds the file
// interceptor for the translations and the CSP nonce placeholder here.
export const appServerConfig: ApplicationConfig = mergeApplicationConfig(appConfig, {
  providers: [provideServerRendering()]
});
