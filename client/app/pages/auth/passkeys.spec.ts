import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideEnglish } from '../../testing/i18n';
import { PASSKEYS, loadOnce, passkeyFailure, passkeyMessage } from './passkeys';

describe('passkeys', () => {
  it('keeps a loaded library, and tries again after a load that failed', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValue('library');
    const library = loadOnce(load);
    await expect(library()).rejects.toThrow('Failed to fetch');
    expect(await library()).toBe('library');
    expect(await library()).toBe('library');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('counts a prompt closed, timed out or with no passkey (NotAllowedError) as not used', () => {
    expect(passkeyFailure(Object.assign(new Error('x'), { name: 'NotAllowedError' }))).toBe('cancelled');
    expect(passkeyFailure(Object.assign(new Error('x'), { code: 'ERROR_CEREMONY_ABORTED' }))).toBe('cancelled');
    expect(passkeyFailure(Object.assign(new Error('x'), { name: 'InvalidStateError' }))).toBe('registered');
    expect(passkeyFailure(new Error('x'))).toBe('other');
    expect(passkeyFailure(new HttpErrorResponse({ status: 401 }))).toBeNull();
  });

  it('says why a passkey was not used: already on the account, the browser, or the server', () => {
    TestBed.configureTestingModule({ providers: provideEnglish() });
    TestBed.inject(TranslocoService);
    const fallback = 'Error: could not make the change. Please try again.';
    expect(passkeyMessage(Object.assign(new Error('x'), { name: 'InvalidStateError' }), fallback)).toBe(
      'This passkey is already on your account.'
    );
    expect(passkeyMessage(new Error('x'), fallback)).toBe(
      'This browser could not use the passkey. Please try again, or use another way.'
    );
    expect(
      passkeyMessage(
        new HttpErrorResponse({ status: 400, error: { msg: 'The passkey could not be checked.' } }),
        fallback
      )
    ).toBe('The passkey could not be checked.');
    expect(passkeyMessage(new HttpErrorResponse({ status: 500 }), fallback)).toBe(fallback);
  });

  it("in a browser without passkeys, offers none, and each request fails with the browser's reason", async () => {
    TestBed.configureTestingModule({ providers: provideEnglish() });
    const passkeys = TestBed.inject(PASSKEYS);
    expect(passkeys.supported()).toBe(false);
    expect(await passkeys.autofillSupported()).toBe(false);
    const asked = passkeys.authenticate({ challenge: 'c', rpId: 'glazecalc.test' } as never);
    await expect(asked).rejects.toThrow('WebAuthn is not supported in this browser');
    const made = passkeys.register({ challenge: 'c' } as never);
    await expect(made).rejects.toThrow('WebAuthn is not supported in this browser');
    expect(passkeyMessage(await made.catch((err: unknown) => err), 'Fallback')).toBe(
      'This browser could not use the passkey. Please try again, or use another way.'
    );
    // Nothing waits to be stopped.
    expect(() => passkeys.cancel()).not.toThrow();
  });
});
