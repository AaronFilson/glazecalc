import { translate } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Price } from '../../../lib/recipe/cost';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';
import { errorMessage } from './error-message';

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

  /** Sets one material's price per kilogram, or takes it away (null); true once the server has the list. */
  async set(key: string, perKg: number | null): Promise<boolean> {
    const before = this.prices();
    if (before === null) return false;
    const others = before.filter((price) => price.key !== key);
    return this.save(perKg === null ? others : [...others, { key, perKg }]);
  }

  /** Saves the list in place of the old one; true once the server has it. */
  private async save(prices: Price[]): Promise<boolean> {
    const save = ++this.saves;
    this.prices.set(prices);
    try {
      await firstValueFrom(this.http.put(this.apiBase + '/prices', { prices }));
      if (save === this.saves) this.problem.set('');
      return true;
    } catch (err) {
      if (save === this.saves) this.problem.set(errorMessage(err, translate('recipe.cost.saveFailed')));
      return false;
    }
  }
}
