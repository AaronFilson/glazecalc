import { HttpErrorResponse } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { errorMessage } from '../../core/error-message';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON
} from '../../../../lib/mfa';

/**
 * This browser's passkeys (WebAuthn), through @simplewebauthn/browser. The
 * library is loaded with import() the first time a passkey is used, so it
 * lands in a chunk of its own, outside the first download. Tests give a fake
 * in its place.
 */
export interface Passkeys {
  /** Whether this browser can use passkeys at all. Without them, the page offers no passkey buttons. */
  supported(): boolean;
  /** Whether it can offer passkeys among the email field's suggestions (conditional mediation). */
  autofillSupported(): Promise<boolean>;
  /** Asks for a passkey; `autofill` waits for one picked from the email field's suggestions. */
  authenticate(options: PublicKeyCredentialRequestOptionsJSON, autofill?: boolean): Promise<AuthenticationResponseJSON>;
  /** Makes a new passkey. */
  register(options: PublicKeyCredentialCreationOptionsJSON): Promise<RegistrationResponseJSON>;
  /** Stops a request still waiting, such as the autofill one when the page is left. */
  cancel(): void;
}

type Library = typeof import('@simplewebauthn/browser');
let loaded: Library | null = null;

/**
 * Runs `load` once and keeps what it gives. A failed load (a dropped
 * connection, a deploy that replaced the chunk) is not kept: the next call
 * tries again.
 */
export function loadOnce<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () =>
    (pending ??= load().catch((err: unknown) => {
      pending = null;
      throw err;
    }));
}

const load = loadOnce(() => import('@simplewebauthn/browser').then((lib) => (loaded = lib)));

const supported = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential === 'function' &&
  typeof navigator.credentials?.get === 'function';

const browserPasskeys: Passkeys = {
  supported,
  async autofillSupported() {
    return supported() && (await load()).browserSupportsWebAuthnAutofill();
  },
  async authenticate(optionsJSON, autofill = false) {
    return (await load()).startAuthentication({ optionsJSON, useBrowserAutofill: autofill });
  },
  async register(optionsJSON) {
    return (await load()).startRegistration({ optionsJSON });
  },
  cancel() {
    loaded?.WebAuthnAbortService.cancelCeremony();
  }
};

export const PASSKEYS = new InjectionToken<Passkeys>('PASSKEYS', {
  providedIn: 'root',
  factory: () => browserPasskeys
});

/**
 * Why the browser's part of using a passkey failed: the passkey was not used
 * ('cancelled'). Browsers give the same NotAllowedError when the person closed
 * the prompt, when it timed out, and when this device has no passkey for the
 * site, so the message names all three; another request taking its place is
 * the same to the person.
 * the passkey being added is already on the account ('registered'); or
 * something else. null for a failure that is not the browser's (the server's).
 */
export function passkeyFailure(err: unknown): 'cancelled' | 'registered' | 'other' | null {
  if (err instanceof HttpErrorResponse || !(err instanceof Error)) return null;
  const code = (err as { code?: unknown }).code;
  if (code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' || err.name === 'InvalidStateError') return 'registered';
  if (code === 'ERROR_CEREMONY_ABORTED' || err.name === 'NotAllowedError' || err.name === 'AbortError') {
    return 'cancelled';
  }
  return 'other';
}

/** What to say about a passkey that could not be used: the browser's reason, or the server's message. */
export function passkeyMessage(err: unknown, fallback: string): string {
  switch (passkeyFailure(err)) {
    case 'cancelled':
      return translate('account.passkey.cancelled');
    case 'registered':
      return translate('account.passkey.registered');
    case 'other':
      return translate('account.passkey.browserFailed');
    default:
      return errorMessage(err, fallback);
  }
}
