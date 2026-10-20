import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { IdentityProof } from '../../../lib/mfa';
import { codedMessage } from '../i18n/coded';
import { API_BASE } from './api-base';

/** A personal access token as the account page shows it (server/routes/token_routes.ts TokenRow). */
export interface TokenRow {
  id: string;
  name: string;
  scopes: string[];
  /** Its last four characters. */
  hint: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  revokedWhy?: string;
  working: boolean;
  /** Its changes never wait for approval (docs/adr/0025). */
  noConfirm?: boolean;
}

/** GET /api/tokens: the account's tokens and the choices for a new one. */
export interface TokenList {
  tokens: TokenRow[];
  expiryDays: number[];
  /** The lifetimes a token that can change records may have (the server's WRITE_PAT_MOST_DAYS at most). */
  writeExpiryDays?: number[];
  defaultDays: number;
  most: number;
  scopes: string[];
}

export interface Said {
  code?: string;
  msg: string;
  params?: Record<string, string | number>;
}

export const said = (res: Said): string => (res.code && codedMessage('server', res.code, res.params)) || res.msg;

/**
 * The account's personal access tokens (docs/integrations-plan.md, items 26
 * and 27), shared by the tokens section and the password change, which offers
 * to revoke them. A new token itself is handed back once and never kept here.
 */
@Injectable({ providedIn: 'root' })
export class TokensService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);

  /** The list, once loaded; null before. */
  readonly list = signal<TokenList | null>(null);
  /** The tokens that work now. */
  readonly working = computed(() => this.list()?.tokens.filter((token) => token.working) ?? []);

  async load(): Promise<TokenList> {
    const list = await firstValueFrom(this.http.get<TokenList>(this.apiBase + '/tokens'));
    this.list.set(list);
    return list;
  }

  /** Makes a token that reads, or reads and changes; resolves with the token itself, to show once, and the server's message. */
  async create(
    name: string,
    days: number,
    proof: IdentityProof,
    scope: 'data:read' | 'data:write' = 'data:read',
    noConfirm = false
  ): Promise<{ token: string; message: string }> {
    const res = await firstValueFrom(
      this.http.post<Said & { token: string; row: TokenRow }>(this.apiBase + '/tokens', {
        name,
        days,
        scope,
        ...(noConfirm && { noConfirm: true }),
        ...proof
      })
    );
    this.list.update((list) => (list ? { ...list, tokens: [res.row, ...list.tokens] } : list));
    return { token: res.token, message: said(res) };
  }

  /** Revokes every token (and connected app) still working. */
  async revokeAll(): Promise<string> {
    const res = await firstValueFrom(this.http.delete<Said>(this.apiBase + '/tokens'));
    await this.load().catch(() => undefined);
    return said(res);
  }

  /** Forgets the list (signing out). */
  clear(): void {
    this.list.set(null);
  }
}
