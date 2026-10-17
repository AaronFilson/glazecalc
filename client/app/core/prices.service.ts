import { translate } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Price } from '../../../lib/recipe/cost';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';
import { errorMessage } from './error-message';
import { LocaleService } from './locale.service';
import { PreferencesService } from './preferences.service';

/**
 * What the potter pays for materials, for cost per batch: a price per
 * kilogram by library key (see recipe-library.ts libraryKey), in the
 * account's one currency (LocaleService.currency). Kept with the account (or
 * trial), private to it, so the list follows it to every device.
 */
@Injectable({ providedIn: 'root' })
export class PricesService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);
  private readonly auth = inject(AuthService);
  private readonly preferences = inject(PreferencesService);
  private readonly locale = inject(LocaleService);
  /** The prices, once fetched for this sign-in; null before, and after a fetch that failed. */
  readonly prices = signal<Price[] | null>(null);
  /** Why the last fetch or save did not work, or ''. */
  readonly problem = signal('');
  /** The sign-in the list was fetched for, and the request. */
  private fetched: { session: number; request: Promise<void> } | null = null;
  private saves = 0;

  /** Fetches the list, once for each sign-in. */
  load(): Promise<void> {
    const session = this.auth.sessionVersion();
    if (this.fetched?.session === session) return this.fetched.request;
    this.prices.set(null);
    const request = (async () => {
      try {
        const { prices } = await firstValueFrom(this.http.get<{ prices: Price[] }>(this.apiBase + '/prices'));
        if (this.auth.sessionVersion() === session) this.prices.set(prices);
        this.problem.set('');
      } catch (err) {
        // Asked again next time. Until then there is no list to change: saving one would replace the potter's.
        this.fetched = null;
        this.problem.set(errorMessage(err, translate('recipe.cost.fetchFailed')));
      }
    })();
    this.fetched = { session, request };
    return request;
  }

  /**
   * Sets one material's price per kilogram, or takes it away (null); true once
   * the server has it. Only that change is sent, to be merged by key into the
   * account's list, so a list loaded for another session never overwrites it.
   * With the first price the currency shown goes too, to become the account's.
   */
  async set(key: string, perKg: number | null): Promise<boolean> {
    const before = this.prices();
    const session = this.auth.sessionVersion();
    if (before === null || this.fetched?.session !== session) return false;
    const save = ++this.saves;
    const others = before.filter((price) => price.key !== key);
    this.prices.set(perKg === null ? others : [...others, { key, perKg }]);
    const currency = this.preferences.currency() === '' ? this.locale.currency() : undefined;
    try {
      const res = await firstValueFrom(
        this.http.patch<{ prices: Price[]; currency?: string }>(this.apiBase + '/prices', {
          ...(perKg === null ? { remove: [key] } : { set: [{ key, perKg }] }),
          ...(currency && { currency })
        })
      );
      if (this.auth.sessionVersion() !== session) return true;
      if (res.currency) this.preferences.noteSaved('currency', res.currency);
      // The account's list as the server now holds it, unless a later change is on its way.
      if (save === this.saves && Array.isArray(res.prices)) this.prices.set(res.prices);
      if (save === this.saves) this.problem.set('');
      return true;
    } catch (err) {
      if (save === this.saves) this.problem.set(errorMessage(err, translate('recipe.cost.saveFailed')));
      return false;
    }
  }
}
