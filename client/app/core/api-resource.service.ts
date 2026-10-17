import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api-base';
import { Owned } from './models';

/** What moving a record to the Trash answers: the Trash entry, to put it back by. */
export interface Trashed {
  trashId?: string;
}

/** Calls for one collection on the API, such as /materials. */
export class ApiResource<T extends Owned> {
  constructor(
    private readonly http: HttpClient,
    private readonly url: string,
    /** The Trash's calls, /api/trash. */
    private readonly trashUrl = url.replace(/\/[^/]*$/, '/trash')
  ) {}

  /** The signed-in user's records. */
  getAll(): Promise<T[]> {
    return firstValueFrom(this.http.get<T[]>(this.url + '/getAll'));
  }

  /** The built-in records every user sees. */
  getStandard(): Promise<T[]> {
    return firstValueFrom(this.http.get<T[]>(this.url + '/getStandard'));
  }

  create(item: T): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.url + '/create', item));
  }

  /**
   * Changes a saved record. Some collections expect it wrapped: recipes as
   * { recipe: {...} } (see server/routes/records.ts).
   */
  change(id: string, body: object): Promise<unknown> {
    return firstValueFrom(this.http.put(this.url + '/change/' + id, body));
  }

  /** Moves a saved record to the Trash, where it can be put back for 30 days. */
  remove(item: T): Promise<Trashed> {
    return firstValueFrom(this.http.delete<Trashed>(this.url + '/delete/' + item._id));
  }

  /** Puts a record back from the Trash, by its Trash entry; resolves with the record. */
  async restore(trashId: string): Promise<T> {
    return (await firstValueFrom(this.http.post<{ record: T }>(this.trashUrl + '/restore/' + trashId, {}))).record;
  }

  /** Puts back the version of a record before its last change; resolves with the record. */
  async undo(id: string): Promise<T> {
    return (await firstValueFrom(this.http.post<{ record: T }>(this.url + '/undo/' + id, {}))).record;
  }
}

@Injectable({ providedIn: 'root' })
export class ApiResourceFactory {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);

  for<T extends Owned>(collection: string): ApiResource<T> {
    return new ApiResource<T>(this.http, this.apiBase + '/' + collection, this.apiBase + '/trash');
  }
}
