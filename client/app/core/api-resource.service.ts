import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api-base';
import { Owned } from './models';

/** Calls for one collection on the API, such as /materials. */
export class ApiResource<T extends Owned> {
  constructor(
    private readonly http: HttpClient,
    private readonly url: string
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

  remove(item: T): Promise<unknown> {
    return firstValueFrom(this.http.delete(this.url + '/delete/' + item._id));
  }
}

@Injectable({ providedIn: 'root' })
export class ApiResourceFactory {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);

  for<T extends Owned>(collection: string): ApiResource<T> {
    return new ApiResource<T>(this.http, this.apiBase + '/' + collection);
  }
}
