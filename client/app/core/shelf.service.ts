import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';
import { errorMessage } from './error-message';

/**
 * The materials the potter has on hand, for Match with what I have: library
 * keys (see recipe-library.ts libraryKey), kept with the account (or trial)
 * so the list follows it to every device.
 */
@Injectable({ providedIn: 'root' })
export class ShelfService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);
  private readonly auth = inject(AuthService);
  /** The keys, once fetched for this sign-in; null before. */
  readonly keys = signal<string[] | null>(null);
  /** Why the last fetch or save did not work, or ''. */
  readonly problem = signal('');
  /** The sign-in the list was fetched for, and the request. */
  private fetched: { session: number; request: Promise<void> } | null = null;
  private saves = 0;

  /** Fetches the list, once for each sign-in. */
  load(): Promise<void> {
    const session = this.auth.sessionVersion();
    if (this.fetched?.session === session) return this.fetched.request;
    this.keys.set(null);
    const request = (async () => {
      try {
        const { shelf } = await firstValueFrom(this.http.get<{ shelf: string[] }>(this.apiBase + '/shelf'));
        if (this.auth.sessionVersion() === session) this.keys.set(shelf);
        this.problem.set('');
      } catch (err) {
        // Asked again next time.
        this.fetched = null;
        this.keys.set([]);
        this.problem.set(errorMessage(err, 'Your materials on hand could not be fetched. Please try again.'));
      }
    })();
    this.fetched = { session, request };
    return request;
  }

  /** Saves the list in place of the old one; true once the server has it. */
  async save(keys: string[]): Promise<boolean> {
    const save = ++this.saves;
    this.keys.set(keys);
    try {
      await firstValueFrom(this.http.put(this.apiBase + '/shelf', { shelf: keys }));
      if (save === this.saves) this.problem.set('');
      return true;
    } catch (err) {
      if (save === this.saves) {
        this.problem.set(errorMessage(err, 'Your materials on hand could not be saved. Please try again.'));
      }
      return false;
    }
  }
}
