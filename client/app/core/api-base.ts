import { InjectionToken } from '@angular/core';

/**
 * The API server listens on port 4000 of whichever host served the page, so
 * the same build works on localhost and in production.
 */
export const API_BASE = new InjectionToken<string>('API_BASE', {
  providedIn: 'root',
  factory: () => window.location.protocol + '//' + window.location.hostname + ':4000'
});
