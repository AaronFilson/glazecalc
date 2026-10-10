import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { codedMessage } from '../i18n/coded';
import { API_BASE } from './api-base';

const SESSION_KEY = 'session';
const TRIAL_KEY = 'trial';
// Versions before 0.3 kept the sign-in token itself here.
const OLD_TOKEN_KEY = 'token';

type SessionKind = 'account' | 'trial';

interface EmailResponse {
  email: string;
}

interface SignInResponse extends EmailResponse {
  /** How many records a trial on this browser brought into the account. */
  kept: number;
}

interface VerifyResponse {
  msg: string;
  email?: string;
  id?: string;
  name?: string;
  guest?: boolean;
  expiresAt?: string;
}

interface TrialResponse {
  name: string;
  expiresAt: string;
}

/** A trial ("Try it now"): an account with a generated name, removed when it expires. */
export interface Trial {
  name: string;
  expiresAt: Date;
}

/** A message from the server (server/lib/messages.ts): its English, and the code it is translated by. */
interface MessageResponse {
  msg: string;
  code?: string;
  params?: Record<string, string | number>;
}

/** The server's message in the reader's language where its code has a translation, or the server's own English. */
const said = (res: MessageResponse): string =>
  (typeof res.code === 'string' && codedMessage('server', res.code, res.params)) || res.msg;

/**
 * Signs users up, in and out. The sign-in itself is an httpOnly cookie that the
 * server sets and the browser sends with every API request; no script can read
 * it (docs/adr/0005-sign-in-tokens.md). This service keeps only a note that
 * there is a session, and for a trial its name and end date, in localStorage, so
 * pages and guards know at once, before the server answers. The note is not a
 * secret: the server checks the cookie on every request.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);

  private readonly session = signal<SessionKind | null>(readStoredSession());
  private checked: Promise<void> | null = null;
  private readonly onEnd: Array<() => void> = [];

  /** Whether this browser has a session (an account's or a trial's), as far as the app knows. */
  readonly hasSession = computed(() => this.session() !== null);
  /** Goes up whenever the session starts or ends, so answers that arrive late can tell. */
  readonly sessionVersion = signal(0);
  /** The signed-in user's email, once verified with the server. */
  readonly email = signal<string | null>(null);
  readonly signedIn = computed(() => this.email() !== null);
  /** The trial in use, if this is one. */
  readonly trial = signal<Trial | null>(readStoredTrial());
  /** Set when a trial runs out, so the start page can say so. */
  readonly trialEnded = signal(false);
  /** The title of a recipe whose changes were not saved when the session ended, so the next page can say so. */
  readonly lostRecipe = signal<string | null>(null);
  /** What to call the user: their email, or their trial's name. */
  readonly displayName = computed(() => this.email() ?? this.trial()?.name ?? null);

  constructor() {
    const trial = this.trial();
    if (!trial) return;
    // Left over without a session, or run out while the site was closed.
    if (this.session() !== 'trial') this.setTrial(null);
    else if (trial.expiresAt.getTime() <= Date.now()) this.endTrial();
  }

  /** Starts a trial, signed in with no email or password. */
  async startTrial(): Promise<void> {
    const res = await firstValueFrom(this.http.post<TrialResponse>(this.apiBase + '/guest', {}));
    this.setSession('trial');
    this.email.set(null);
    this.setTrial({ name: res.name, expiresAt: new Date(res.expiresAt) });
  }

  /** Creates an account. During a trial, the trial becomes the account and keeps its work. */
  async signUp(email: string, password: string): Promise<void> {
    const path = this.trial() ? '/guest/claim' : '/signup';
    const res = await firstValueFrom(this.http.post<EmailResponse>(this.apiBase + path, { email, password }));
    this.signedInAs(res.email);
  }

  /** Signs in; a trial on this browser moves into the account. Resolves with how many records it brought. */
  async signIn(email: string, password: string): Promise<number> {
    const headers = new HttpHeaders({ Authorization: 'Basic ' + base64Utf8(email + ':' + password) });
    const res = await firstValueFrom(this.http.get<SignInResponse>(this.apiBase + '/signin', { headers }));
    this.signedInAs(res.email);
    return res.kept ?? 0;
  }

  /**
   * Asks the server who is signed in. A session the server no longer accepts
   * ends here; other failures (server down or restarting) keep it for the next try.
   */
  async refresh(): Promise<void> {
    if (!this.hasSession()) {
      this.email.set(null);
      return;
    }
    const version = this.sessionVersion();
    try {
      const res = await firstValueFrom(this.http.get<VerifyResponse>(this.apiBase + '/verify'));
      // A sign-in or sign-out while the request was out wins over its answer.
      if (this.sessionVersion() !== version) return;
      // No id: the browser has no session cookie any more (it expired, or was cleared).
      if (!res.id) return this.sessionEnded();
      this.email.set(res.email ?? null);
      this.setTrial(
        res.guest && res.name && res.expiresAt ? { name: res.name, expiresAt: new Date(res.expiresAt) } : null
      );
    } catch (err) {
      if (this.sessionVersion() !== version) return;
      if (err instanceof HttpErrorResponse && err.status === 401) this.sessionEnded();
      else this.email.set(null);
    }
  }

  /**
   * The first check with the server, made once when the app starts. Guards wait
   * for it: the note in localStorage outlives the cookie (which expires after 7
   * days), so only the server knows whether a session is still good.
   */
  whenChecked(): Promise<void> {
    return (this.checked ??= this.refresh());
  }

  /** Asks for a password reset email; resolves with the server's message. */
  async requestReset(email: string): Promise<string> {
    const res = await firstValueFrom(this.http.post<MessageResponse>(this.apiBase + '/password/forgot', { email }));
    return said(res);
  }

  /** Sets a new password with the token from a reset email. */
  async resetPassword(token: string, password: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<MessageResponse>(this.apiBase + '/password/reset', { token, password })
    );
    return said(res);
  }

  /** Changes the password; this browser stays signed in (the server renews the cookie), others are signed out. */
  async changePassword(current: string, password: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.put<MessageResponse & EmailResponse>(this.apiBase + '/password', { current, password })
    );
    this.email.set(res.email);
    return said(res);
  }

  /** Deletes the account and everything saved in it (the password confirms it); the server signs the browser out. */
  async deleteAccount(password: string): Promise<void> {
    const me = await firstValueFrom(this.http.get<VerifyResponse>(this.apiBase + '/verify'));
    if (!me.id) throw new Error('Not signed in');
    await firstValueFrom(this.http.delete(this.apiBase + '/deleteuser/' + me.id, { body: { password } }));
    this.forget();
  }

  /** Discards the trial and everything made in it; the server signs the browser out. */
  async discardTrial(): Promise<void> {
    const me = await firstValueFrom(this.http.get<VerifyResponse>(this.apiBase + '/verify'));
    if (!me.id || !me.guest) throw new Error('Not a trial');
    await firstValueFrom(this.http.delete(this.apiBase + '/deleteuser/' + me.id));
    this.forget();
  }

  /** Signs out here at once, and asks the server to clear the cookie. */
  async signOut(): Promise<void> {
    this.forget();
    try {
      await firstValueFrom(this.http.post<MessageResponse>(this.apiBase + '/signout', {}));
    } catch {
      // The cookie then stays until it expires, but the app no longer uses it.
    }
  }

  /** Calls `then` each time the session on this browser ends: signed out, run out, discarded or deleted. */
  onSessionEnd(then: () => void): void {
    this.onEnd.push(then);
  }

  /**
   * The server no longer accepts this browser's session (it expired, the
   * password changed elsewhere, or the trial ran out): forget it, and for a
   * trial remember why, so the start page can say so.
   */
  sessionEnded(): void {
    if (this.session() === 'trial') this.endTrial();
    else this.forget();
  }

  private endTrial(): void {
    this.forget();
    this.trialEnded.set(true);
  }

  private signedInAs(email: string): void {
    this.setSession('account');
    this.email.set(email);
    this.setTrial(null);
  }

  private forget(): void {
    this.setSession(null);
    this.email.set(null);
    this.setTrial(null);
    for (const then of this.onEnd) then();
  }

  private setSession(kind: SessionKind | null): void {
    if (kind) {
      this.trialEnded.set(false);
      this.lostRecipe.set(null);
    }
    this.session.set(kind);
    this.sessionVersion.update((v) => v + 1);
    store(SESSION_KEY, kind);
  }

  private setTrial(trial: Trial | null): void {
    this.trial.set(trial);
    if (trial) this.trialEnded.set(false);
    store(TRIAL_KEY, trial && JSON.stringify(trial));
  }
}

/** Base64 of the UTF-8 bytes; btoa alone fails outside Latin-1. */
function base64Utf8(value: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function store(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (private mode); the session still works for this visit.
  }
}

function readStoredSession(): SessionKind | null {
  try {
    // A token from before version 0.3 no longer signs anyone in; sign in again once.
    localStorage.removeItem(OLD_TOKEN_KEY);
    const kind = localStorage.getItem(SESSION_KEY);
    return kind === 'account' || kind === 'trial' ? kind : null;
  } catch {
    return null;
  }
}

function readStoredTrial(): Trial | null {
  try {
    const stored = JSON.parse(localStorage.getItem(TRIAL_KEY) ?? 'null') as {
      name?: unknown;
      expiresAt?: unknown;
    } | null;
    if (!stored || typeof stored.name !== 'string' || typeof stored.expiresAt !== 'string') return null;
    const expiresAt = new Date(stored.expiresAt);
    return isNaN(expiresAt.getTime()) ? null : { name: stored.name, expiresAt };
  } catch {
    return null;
  }
}
