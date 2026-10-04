import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { authTokenInterceptor } from './core/auth-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash URLs (#/recipe) keep links and bookmarks from the AngularJS app working.
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withFetch(), withInterceptors([authTokenInterceptor]))
  ]
};
