import { InjectionToken } from '@angular/core';

/** What time it is now: a fixed time in tests. */
export const NOW = new InjectionToken<() => Date>('NOW', { providedIn: 'root', factory: () => () => new Date() });

/** The day a time falls on here, as YYYY-MM-DD, to compare with the days the data gives. */
export function dayOf(time: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return time.getFullYear() + '-' + pad(time.getMonth() + 1) + '-' + pad(time.getDate());
}
