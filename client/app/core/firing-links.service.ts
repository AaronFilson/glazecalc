import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api-base';
import type { Atmosphere } from '../../../lib/cones/firing';
import { FiringLink } from './models';

/**
 * A saved recipe's links to firing logs, changed one at a time on the server
 * (server/lib/firing_links.ts), so the recipe page and the firing log page,
 * open at once, never overwrite each other's links. Each call resolves with
 * the recipe's links as they are now.
 */
@Injectable({ providedIn: 'root' })
export class FiringLinksService {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_BASE) + '/recipe/firings/';

  async link(recipeId: string, firing: string): Promise<FiringLink[]> {
    return (await firstValueFrom(this.http.post<{ firings: FiringLink[] }>(this.url + recipeId, { firing }))).firings;
  }

  async unlink(recipeId: string, firing: string): Promise<FiringLink[]> {
    return (await firstValueFrom(this.http.delete<{ firings: FiringLink[] }>(this.url + recipeId + '/' + firing)))
      .firings;
  }

  async setResult(recipeId: string, firing: string, result: string): Promise<FiringLink[]> {
    return (
      await firstValueFrom(this.http.put<{ firings: FiringLink[] }>(this.url + recipeId + '/' + firing, { result }))
    ).firings;
  }

  /** Where the log was fired, for the result cards: its cone and atmosphere ('' clears one). */
  async setPlace(
    recipeId: string,
    firing: string,
    place: { cone: string; atmosphere: Atmosphere | '' }
  ): Promise<FiringLink[]> {
    return (await firstValueFrom(this.http.put<{ firings: FiringLink[] }>(this.url + recipeId + '/' + firing, place)))
      .firings;
  }
}
