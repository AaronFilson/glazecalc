import { InjectionToken } from '@angular/core';

/**
 * The API is served under /api by the same server as the app (and proxied
 * to the API server by `ng serve` during development), so it is same-origin.
 */
export const API_BASE = new InjectionToken<string>('API_BASE', {
  providedIn: 'root',
  factory: () => '/api'
});
