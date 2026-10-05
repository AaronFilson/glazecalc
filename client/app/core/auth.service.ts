import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api-base';

const TOKEN_KEY = 'token';

interface TokenResponse {
  token: string;
  email: string;
}

interface VerifyResponse {
  msg: string;
  email?: string;
}

interface MessageResponse {
  msg: string;
}

interface ChangePasswordResponse extends MessageResponse, TokenResponse {}

/** Signs users up, in and out, and keeps the login token in localStorage. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);

  private readonly tokenValue = signal<string | null>(readStoredToken());

  /** The signed-in user's email, once verified with the server. */
  readonly email = signal<string | null>(null);
  readonly signedIn = computed(() => this.email() !== null);

  token(): string | null {
    return this.tokenValue();
  }

  async signUp(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<TokenResponse>(this.apiBase + '/signup', { email, password }));
    this.setToken(res.token);
    this.email.set(res.email);
  }

  async signIn(email: string, password: string): Promise<void> {
    const headers = new HttpHeaders({ Authorization: 'Basic ' + base64Utf8(email + ':' + password) });
    const res = await firstValueFrom(
      this.http.get<TokenResponse>(this.apiBase + '/signin', { headers }));
    this.setToken(res.token);
    this.email.set(res.email);
  }

  /**
   * Looks up the email for the stored token. A rejected token is cleared; other
   * failures (server down or restarting) keep it for the next try.
   */
  async refresh(): Promise<void> {
    const sent = this.tokenValue();
    if (!sent) {
      this.email.set(null);
      return;
    }
    try {
      const res = await firstValueFrom(this.http.get<VerifyResponse>(this.apiBase + '/verify'));
      // A sign-in while the request was out wins over its answer.
      if (this.tokenValue() === sent) this.email.set(res.email ?? null);
    } catch (err) {
      if (this.tokenValue() !== sent) return;
      if (err instanceof HttpErrorResponse && err.status === 401) this.signOut();
      else this.email.set(null);
    }
  }

  /** Asks for a password reset email; resolves with the server's message. */
  async requestReset(email: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<MessageResponse>(this.apiBase + '/password/forgot', { email }));
    return res.msg;
  }

  /** Sets a new password with the token from a reset email. */
  async resetPassword(token: string, password: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<MessageResponse>(this.apiBase + '/password/reset', { token, password }));
    return res.msg;
  }

  /** Changes the password; this device stays signed in with the new token, others are signed out. */
  async changePassword(current: string, password: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.put<ChangePasswordResponse>(this.apiBase + '/password', { current, password }));
    this.setToken(res.token);
    this.email.set(res.email);
    return res.msg;
  }

  signOut(): void {
    this.setToken(null);
    this.email.set(null);
  }

  private setToken(token: string | null): void {
    this.tokenValue.set(token);
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage can be unavailable (private mode); the session still works.
    }
  }
}

/** Base64 of the UTF-8 bytes; btoa alone fails outside Latin-1. */
function base64Utf8(value: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function readStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    // Older versions stored the string 'null' on sign out.
    return token && token !== 'null' ? token : null;
  } catch {
    return null;
  }
}
