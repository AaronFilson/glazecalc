import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api-base';
import { said, type Said } from './tokens.service';

/** How many records a connection created, changed and so on in the last 90 days. */
export interface ChangeCounts {
  create: number;
  change: number;
  trash: number;
  restore: number;
  undo: number;
}

/** A personal token or an OAuth connection (server/routes/connection_routes.ts Connection). */
export interface ConnectionRow {
  id: string;
  kind: 'pat' | 'oauth';
  name: string;
  clientHost?: string;
  redirectHost?: string;
  access: 'read' | 'write';
  /** A personal token's last four characters. */
  hint?: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt: string;
  revokedAt?: string;
  working: boolean;
  changes: ChangeCounts;
}

/** One line of what a connection did. */
export interface ActivityLine {
  id: string;
  at: string;
  action: keyof ChangeCounts;
  /** The kind of record: 'recipes', 'notes'. */
  fromCollection: string;
  title?: string;
}

/** A Trash entry a connection moved. */
export interface MovedEntry {
  _id: string;
  fromCollection: string;
  title?: string;
  trashedAt: string;
  expiresAt: string;
}

/** The account's Connected apps: personal tokens and OAuth connections, what each did and the Trash it filled. */
@Injectable({ providedIn: 'root' })
export class ConnectionsService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);
  private readonly url = this.apiBase + '/connections';

  /** The list, once loaded; null before. */
  readonly list = signal<ConnectionRow[] | null>(null);

  async load(): Promise<ConnectionRow[]> {
    const { connections } = await firstValueFrom(this.http.get<{ connections: ConnectionRow[] }>(this.url));
    this.list.set(connections);
    return connections;
  }

  /** A page of activity, newest first; `before` is the previous page's `next`. */
  activity(id: string, before?: string): Promise<{ activity: ActivityLine[]; next: string | null }> {
    const query = before ? '?before=' + encodeURIComponent(before) : '';
    return firstValueFrom(
      this.http.get<{ activity: ActivityLine[]; next: string | null }>(
        this.url + '/' + encodeURIComponent(id) + '/activity' + query
      )
    );
  }

  async moved(id: string): Promise<MovedEntry[]> {
    const { entries } = await firstValueFrom(
      this.http.get<{ entries: MovedEntry[] }>(this.url + '/' + encodeURIComponent(id) + '/trash')
    );
    return entries;
  }

  /** Puts one Trash entry back (the Trash's own route). */
  async putBack(entryId: string): Promise<void> {
    await firstValueFrom(this.http.post(this.apiBase + '/trash/restore/' + encodeURIComponent(entryId), {}));
  }

  /** Puts back everything a connection moved to the Trash; resolves with the server's message. */
  async putAllBack(id: string): Promise<string> {
    return said(
      await firstValueFrom(this.http.post<Said>(this.url + '/' + encodeURIComponent(id) + '/restore-all', {}))
    );
  }

  async revoke(id: string): Promise<string> {
    const res = await firstValueFrom(this.http.delete<Said>(this.url + '/' + encodeURIComponent(id)));
    await this.load().catch(() => undefined);
    return said(res);
  }

  async revokeAll(): Promise<string> {
    const res = await firstValueFrom(this.http.delete<Said>(this.url));
    await this.load().catch(() => undefined);
    return said(res);
  }

  /** Forgets the list (signing out). */
  clear(): void {
    this.list.set(null);
  }
}
