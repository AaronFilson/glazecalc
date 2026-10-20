import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { InjectionToken, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  AuthenticationResponseJSON,
  FactorProof,
  IdentityProof,
  MfaSummary,
  PasskeyAddRequest,
  PasskeyCreationOptionsResponse,
  PasskeyGrantResponse,
  PasskeyOptionsRequest,
  PasskeyRequestOptionsResponse,
  PasskeySignInRequest,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RecoveryCodesResponse,
  RegistrationResponseJSON,
  SecondStepRequest,
  SecondStepResponse,
  SignedInResponse,
  TotpConfirmRequest,
  TotpStartResponse
} from '../../../lib/mfa';
import { codedMessage } from '../i18n/coded';
import { API_BASE } from './api-base';
import { FIRST_RENDER } from './first-render';

const SESSION_KEY = 'session';
const TRIAL_KEY = 'trial';
// Versions before 0.3 kept the sign-in token itself here.
const OLD_TOKEN_KEY = 'token';

type SessionKind = 'account' | 'trial';

interface EmailResponse {
  email: string;
}

/**
 * What the password step of a sign-in came to: signed in (`kept`: how many
 * records a trial on this browser brought into the account), or a second step
 * still to take (lib/mfa.d.ts). The second step's `pending` token is for the
 * page to hold in memory only; nothing here writes it anywhere.
 */
export type SignInResult = { done: true; kept: number } | { done: false; secondStep: SecondStepResponse };

/** A sign-in provider (server/lib/oauth.ts). */
export type ProviderId = 'google' | 'github' | 'microsoft';

/** A provider's name as the page shows it: a brand, the same in every language. */
export const PROVIDER_NAMES: Record<ProviderId, string> = {
  google: 'Google',
  github: 'GitHub',
  microsoft: 'Microsoft'
};

/**
 * What finishing a provider sign-in came to (POST /api/auth/finish): signed in
 * (go to `next`), a second step still to take, a provider linked, a fresh
 * sign-in that confirms a change (AuthService.reauth holds it), or an account
 * with the email to sign in to first, to link the provider.
 */
export type ProviderResult =
  | { kind: 'signed-in'; next: string; kept: number }
  | { kind: 'second-step'; next: string; email: string; secondStep: SecondStepResponse }
  | { kind: 'linked'; message: string }
  | { kind: 'reauthed'; message: string }
  | { kind: 'sign-in-to-link'; message: string; provider: ProviderId };

/**
 * A fresh sign-in with a provider, for an account with no password: `grant`
 * confirms one change in place of the password until `expiresAt`
 * (docs/adr/0015-provider-sign-in.md). Kept in memory only.
 */
export interface Reauth {
  grant: string;
  provider: ProviderId;
  expiresAt: number;
}

/**
 * Asks which sign-in providers are on here (AuthService.providers), for the
 * sign-in page and the account page; the tests give an answer of their own.
 */
export const SIGN_IN_PROVIDERS = new InjectionToken<() => Promise<ProviderId[]>>('SIGN_IN_PROVIDERS', {
  providedIn: 'root',
  factory: () => {
    const auth = inject(AuthService);
    return () => auth.providers();
  }
});

/** The account's providers (GET /api/auth/methods). */
export interface ProviderMethods {
  /** Those that are on here. */
  enabled: ProviderId[];
  /** Made with a provider, with no password of its own yet. */
  passwordless: boolean;
  linked: Array<{ provider: ProviderId; linkedAt: string; lastUsedAt?: string }>;
}

/** A change to two-step sign-in: the server's message, and new recovery codes when it made some (shown once). */
export interface MfaChange {
  message: string;
  recoveryCodes?: string[];
}

interface VerifyResponse {
  msg: string;
  email?: string;
  id?: string;
  name?: string;
  guest?: boolean;
  expiresAt?: string;
  /** The account's email is not confirmed yet. */
  unverified?: boolean;
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
  private readonly firstRender = inject(FIRST_RENDER);

  // The note is read at once, so guards and the API calls know; only what the page shows waits (shown*).
  private readonly session = signal<SessionKind | null>(readStoredSession());
  private checked: Promise<void> | null = null;
  private readonly onEnd: Array<() => void> = [];
  private readonly onDeleted: Array<() => void> = [];

  /** Whether this browser has a session (an account's or a trial's), as far as the app knows. */
  readonly hasSession = computed(() => this.session() !== null);
  /** Goes up whenever the session starts or ends, so answers that arrive late can tell. */
  readonly sessionVersion = signal(0);
  /** The signed-in user's email, once verified with the server. */
  readonly email = signal<string | null>(null);
  readonly signedIn = computed(() => this.email() !== null);
  /** Whether the signed-in account's email still waits to be confirmed by its emailed link. */
  readonly unverified = signal(false);
  /** The trial in use, if this is one. */
  readonly trial = signal<Trial | null>(readStoredTrial());
  /** Whether the sign-in page waits for a second step, so the menu does not offer to sign in again. */
  readonly secondStepPending = signal(false);
  /** Set by signing up, so the first page can welcome the new account (pages/home). */
  readonly welcome = signal(false);
  /** A provider linked while signing in, for the account page to say. */
  readonly providerNotice = signal<string | null>(null);
  /** The account's providers, once the account page has asked (providerMethods). */
  readonly methods = signal<ProviderMethods | null>(null);
  /** A fresh provider sign-in that confirms one change, while it lasts. */
  readonly reauth = signal<Reauth | null>(null);
  private reauthTimer: ReturnType<typeof setTimeout> | undefined;
  /** Set when a trial runs out, so the start page can say so. */
  readonly trialEnded = signal(false);
  /** How many of a trial's prices the last sign-in left out for being in another currency than the account's. */
  readonly pricesSkipped = signal(0);
  /** The title of a recipe whose changes were not saved when the session ended, so the next page can say so. */
  readonly lostRecipe = signal<string | null>(null);
  /** What to call the user: their email, or their trial's name. */
  readonly displayName = computed(() => this.email() ?? this.trial()?.name ?? null);

  // What a page draws. The first render is the prerendered one, for a visitor with no session
  // (core/first-render.ts); guards and requests use hasSession, trial and displayName as they are.
  /** Whether to draw the page for a signed-in user. */
  readonly shownSession = computed(() => !this.firstRender() && this.hasSession());
  /** The trial to draw a bar for. */
  readonly shownTrial = computed(() => (this.firstRender() ? null : this.trial()));
  /** Whether to say the trial ran out; one that ended while the site was closed is found at construction. */
  readonly shownTrialEnded = computed(() => !this.firstRender() && this.trialEnded());
  /** The name to draw in the menu. */
  readonly shownName = computed(() => (this.firstRender() ? null : this.displayName()));

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

  /**
   * Creates an account. During a trial, the trial becomes the account and keeps its work.
   * `keep`: stay signed in for 7 days rather than until the browser closes.
   * `next`: the page the sign-up was for (a page of this site), which the
   * emailed confirmation link goes on to once the address is confirmed.
   */
  async signUp(email: string, password: string, keep = false, next?: string): Promise<void> {
    const claiming = !!this.trial();
    const path = claiming ? '/guest/claim' : '/signup';
    const body = { email, password, ...(next && { next }) };
    const res = await firstValueFrom(
      this.http.post<EmailResponse>(this.apiBase + path, body, { headers: keepHeader(keep) })
    );
    this.signedInAs(res.email);
    this.unverified.set(true);
    // A trial kept as an account has its work already; a new one starts empty.
    this.welcome.set(!claiming);
  }

  /**
   * Signs in with the password; a trial on this browser moves into the
   * account. An account with two-step sign-in is not signed in yet: the
   * result carries the second step, to finish with finishSignIn.
   */
  async signIn(email: string, password: string, keep = false): Promise<SignInResult> {
    const headers = keepHeader(keep).set('Authorization', 'Basic ' + base64Utf8(email + ':' + password));
    const res = await firstValueFrom(
      this.http.get<SignedInResponse | SecondStepResponse>(this.apiBase + '/signin', { headers })
    );
    if (isSecondStep(res)) return { done: false, secondStep: res };
    return { done: true, kept: this.finished(res) };
  }

  /**
   * The second step of a sign-in: the pending token from signIn and one
   * factor. "Keep me signed in" was chosen with the password, so it is not
   * sent again. Resolves with how many records a trial brought.
   */
  async finishSignIn(pending: string, proof: FactorProof): Promise<number> {
    const body: SecondStepRequest = { pending, ...proof };
    const res = await firstValueFrom(this.http.post<SignedInResponse>(this.apiBase + '/signin/second-step', body));
    return this.finished(res);
  }

  /** A challenge for signing in with a passkey alone (passkey-first), for the button or the email field's autofill. */
  async passkeySignInOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const res = await firstValueFrom(
      this.http.post<PasskeyRequestOptionsResponse>(this.apiBase + '/signin/passkey/options', {})
    );
    return res.options;
  }

  /** Signs in with a passkey alone, which counts as both steps. Resolves with how many records a trial brought. */
  async signInWithPasskey(response: AuthenticationResponseJSON, keep = false): Promise<number> {
    const body: PasskeySignInRequest = { response };
    const res = await firstValueFrom(
      this.http.post<SignedInResponse>(this.apiBase + '/signin/passkey', body, { headers: keepHeader(keep) })
    );
    return this.finished(res);
  }

  // Signing in with Google, GitHub or Microsoft (server/routes/oauth_routes.ts).

  /** The providers that are on here; none when the server says nothing. */
  async providers(): Promise<ProviderId[]> {
    const res = await firstValueFrom(this.http.get<{ providers?: ProviderId[] }>(this.apiBase + '/auth/providers'));
    return Array.isArray(res.providers) ? res.providers : [];
  }

  /**
   * Where a provider button goes: the server sends the browser on to the
   * provider. `from`: this page's address, for the language to come back in.
   */
  providerStart(provider: ProviderId, from: string, keep: boolean): string {
    const query = new URLSearchParams({ next: from, ...(keep ? { keep: '1' } : {}) });
    return this.apiBase + '/auth/' + provider + '/start?' + query.toString();
  }

  /**
   * Finishes a provider sign-in once the provider has sent the browser back.
   * A 409 is an account with the provider's email, to sign in to first.
   */
  async finishProvider(): Promise<ProviderResult> {
    type Finished = MessageResponse & {
      email?: string;
      kept?: number;
      pricesSkipped?: number;
      next?: string;
      provider?: ProviderId;
      reauth?: string;
      expiresAt?: string;
      /** A new account whose email the provider does not vouch for (Microsoft's): the confirmation email is on its way. */
      unverified?: boolean;
    };
    let res: Finished;
    try {
      res = await firstValueFrom(this.http.post<Finished>(this.apiBase + '/auth/finish', {}));
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409 && err.error?.code === 'provider-sign-in-to-link') {
        return { kind: 'sign-in-to-link', message: said(err.error as Finished), provider: err.error.provider };
      }
      throw err;
    }
    const next = typeof res.next === 'string' && res.next.startsWith('/') ? res.next : '/home';
    if (isSecondStep(res as SecondStepResponse)) {
      return { kind: 'second-step', next, email: res.email ?? '', secondStep: res as unknown as SecondStepResponse };
    }
    if (res.code === 'signed-in' && res.email) {
      const kept = this.finished(res as { email: string });
      this.unverified.set(res.unverified === true);
      return { kind: 'signed-in', next, kept };
    }
    if (res.code === 'provider-reauthed' && res.reauth && res.provider && res.expiresAt) {
      this.holdReauth({ grant: res.reauth, provider: res.provider, expiresAt: Date.parse(res.expiresAt) });
      return { kind: 'reauthed', message: said(res) };
    }
    return { kind: 'linked', message: said(res) };
  }

  /** The account's providers; kept in `methods` too. */
  async providerMethods(): Promise<ProviderMethods> {
    const methods = await firstValueFrom(this.http.get<ProviderMethods>(this.apiBase + '/auth/methods'));
    this.methods.set(methods);
    return methods;
  }

  /**
   * Starts a fresh sign-in with a linked provider, for an account with no
   * password, to confirm a change: resolves with the provider's address. The
   * provider sends the browser back to the account page, which finishes it.
   */
  async startReauth(provider: ProviderId, from: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ location: string }>(this.apiBase + '/auth/' + provider + '/reauth', { next: from })
    );
    return res.location;
  }

  /** Holds a fresh provider sign-in until it runs out, or null to drop it (used, or refused). */
  holdReauth(reauth: Reauth | null): void {
    clearTimeout(this.reauthTimer);
    this.reauth.set(reauth);
    if (reauth) this.reauthTimer = setTimeout(() => this.reauth.set(null), Math.max(0, reauth.expiresAt - Date.now()));
  }

  /**
   * Starts linking a provider from the account page, confirmed with the
   * password (and a second step when it is on): resolves with the provider's
   * address, for the browser to go to.
   */
  async linkProvider(provider: ProviderId, proof: IdentityProof, from: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ location: string }>(this.apiBase + '/auth/' + provider + '/link', { ...proof, next: from })
    );
    return res.location;
  }

  /** Unlinks a provider, confirmed as linking is. Resolves with the server's message. */
  async unlinkProvider(provider: ProviderId, proof: IdentityProof): Promise<string> {
    const res = await firstValueFrom(
      this.http.delete<MessageResponse>(this.apiBase + '/auth/' + provider, { body: proof })
    );
    return said(res);
  }

  // Two-step sign-in on the account page (server/routes/mfa_routes.ts). Every
  // change takes an IdentityProof: the password, and once it is on, a factor.

  /** Whether two-step sign-in is on, and with what. */
  mfaSummary(): Promise<MfaSummary> {
    return firstValueFrom(this.http.get<MfaSummary>(this.apiBase + '/mfa'));
  }

  /** A challenge for confirming a change with a passkey. */
  async mfaConfirmOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const res = await firstValueFrom(
      this.http.post<PasskeyRequestOptionsResponse>(this.apiBase + '/mfa/confirm/options', {})
    );
    return res.options;
  }

  /** Starts adding an authenticator app: its key, as text and as a QR code. */
  startTotp(proof: IdentityProof): Promise<TotpStartResponse> {
    return firstValueFrom(this.http.post<TotpStartResponse>(this.apiBase + '/mfa/totp/start', proof));
  }

  /** Finishes adding an authenticator app with a code it shows, for the setup startTotp began. */
  async confirmTotp(setupId: string, code: string): Promise<MfaChange> {
    const body: TotpConfirmRequest = { setupId, code };
    return change(await firstValueFrom(this.http.post<RecoveryCodesResponse>(this.apiBase + '/mfa/totp', body)));
  }

  async removeTotp(proof: IdentityProof): Promise<MfaChange> {
    return change(
      await firstValueFrom(this.http.delete<RecoveryCodesResponse>(this.apiBase + '/mfa/totp', { body: proof }))
    );
  }

  /**
   * Starts adding a passkey: confirms it is the owner, once. The grant, kept
   * only in memory, then asks for options and saves the passkey, as often as
   * the browser's step needs, for a few minutes.
   */
  passkeyGrant(proof: IdentityProof): Promise<PasskeyGrantResponse> {
    return firstValueFrom(this.http.post<PasskeyGrantResponse>(this.apiBase + '/mfa/passkeys/grant', proof));
  }

  /** The options for the browser to make a passkey with. */
  async passkeyCreationOptions(grant: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const body: PasskeyOptionsRequest = { grant };
    const res = await firstValueFrom(
      this.http.post<PasskeyCreationOptionsResponse>(this.apiBase + '/mfa/passkeys/options', body)
    );
    return res.options;
  }

  async addPasskey(grant: string, response: RegistrationResponseJSON, name: string): Promise<MfaChange> {
    const body: PasskeyAddRequest = { grant, response, name };
    return change(await firstValueFrom(this.http.post<RecoveryCodesResponse>(this.apiBase + '/mfa/passkeys', body)));
  }

  /** Renames a passkey; a name changes nothing about signing in, so no password. */
  async renamePasskey(id: string, name: string): Promise<MfaChange> {
    const url = this.apiBase + '/mfa/passkeys/' + encodeURIComponent(id);
    return change(await firstValueFrom(this.http.patch<RecoveryCodesResponse>(url, { name })));
  }

  async removePasskey(id: string, proof: IdentityProof): Promise<MfaChange> {
    const url = this.apiBase + '/mfa/passkeys/' + encodeURIComponent(id);
    return change(await firstValueFrom(this.http.delete<RecoveryCodesResponse>(url, { body: proof })));
  }

  /** New recovery codes in place of the old ones. */
  async newRecoveryCodes(proof: IdentityProof): Promise<MfaChange> {
    return change(
      await firstValueFrom(this.http.post<RecoveryCodesResponse>(this.apiBase + '/mfa/recovery-codes', proof))
    );
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
      this.unverified.set(res.unverified === true);
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

  /**
   * Changes the password; this browser stays signed in (the server renews the cookie), others are signed out.
   * With two-step sign-in on, `factor` is a current second step (decision 6).
   */
  async changePassword(current: string, password: string, factor?: FactorProof): Promise<string> {
    const res = await firstValueFrom(
      this.http.put<MessageResponse & EmailResponse>(this.apiBase + '/password', { current, password, ...factor })
    );
    this.email.set(res.email);
    return said(res);
  }

  /**
   * Emails a link to a new address; the email changes when the link is opened. Resolves with the server's message.
   * With two-step sign-in on, `factor` is a current second step (decision 6).
   */
  async changeEmail(email: string, password: string | undefined, factor?: FactorProof): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<MessageResponse>(this.apiBase + '/email/change', { email, password, ...factor })
    );
    return said(res);
  }

  /** Emails the account's address the link that confirms it again. Resolves with the server's message. */
  async resendVerification(): Promise<string> {
    const res = await firstValueFrom(this.http.post<MessageResponse>(this.apiBase + '/email/resend', {}));
    return said(res);
  }

  /**
   * Opens the link from a confirmation email (its token). A changed email signs
   * out every device, so this browser's session ends too.
   */
  async confirmEmail(token: string): Promise<{ message: string; changed: boolean }> {
    const res = await firstValueFrom(this.http.post<MessageResponse>(this.apiBase + '/email/confirm', { token }));
    const changed = res.code === 'email-changed';
    if (changed && this.hasSession()) this.forget();
    else if (this.hasSession()) await this.refresh();
    return { message: said(res), changed };
  }

  /** Signs out on every device, this one included. */
  async signOutEverywhere(): Promise<void> {
    await firstValueFrom(this.http.post<MessageResponse>(this.apiBase + '/signout-everywhere', {}));
    this.forget();
  }

  /**
   * Deletes the account and everything saved in it (the password confirms it, and with two-step sign-in on a
   * current second step, `factor`); the server signs the browser out.
   */
  async deleteAccount(password: string | undefined, factor?: FactorProof): Promise<void> {
    const me = await firstValueFrom(this.http.get<VerifyResponse>(this.apiBase + '/verify'));
    if (!me.id) throw new Error('Not signed in');
    await firstValueFrom(this.http.delete(this.apiBase + '/deleteuser/' + me.id, { body: { password, ...factor } }));
    this.deleted();
  }

  /** Discards the trial and everything made in it; the server signs the browser out. */
  async discardTrial(): Promise<void> {
    const me = await firstValueFrom(this.http.get<VerifyResponse>(this.apiBase + '/verify'));
    if (!me.id || !me.guest) throw new Error('Not a trial');
    await firstValueFrom(this.http.delete(this.apiBase + '/deleteuser/' + me.id));
    this.deleted();
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

  /** Calls `then` when the account or trial on this browser is deleted, after the session has ended. */
  onAccountDeleted(then: () => void): void {
    this.onDeleted.push(then);
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

  private deleted(): void {
    this.forget();
    for (const then of this.onDeleted) then();
  }

  /** A finished sign-in: notes the session, and says how many records a trial brought. */
  private finished(res: { email: string; kept?: number; pricesSkipped?: number }): number {
    this.pricesSkipped.set(res.pricesSkipped ?? 0);
    this.signedInAs(res.email);
    return res.kept ?? 0;
  }

  private signedInAs(email: string): void {
    this.setSession('account');
    this.email.set(email);
    this.setTrial(null);
  }

  private forget(): void {
    this.setSession(null);
    this.email.set(null);
    this.unverified.set(false);
    this.welcome.set(false);
    this.methods.set(null);
    this.holdReauth(null);
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

function isSecondStep(res: SignedInResponse | SecondStepResponse): res is SecondStepResponse {
  return res.code === 'second-step' && typeof (res as Partial<SecondStepResponse>).pending === 'string';
}

function change(res: RecoveryCodesResponse): MfaChange {
  return { message: said(res), ...(res.recoveryCodes ? { recoveryCodes: res.recoveryCodes } : {}) };
}

/**
 * "Keep me signed in on this device" as a header, not in the address, so it
 * stays out of the logs (server/lib/session.ts).
 */
function keepHeader(keep: boolean): HttpHeaders {
  return keep ? new HttpHeaders({ 'X-Keep-Signed-In': '1' }) : new HttpHeaders();
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
