import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { IdentityProof } from '../../../../lib/mfa';
import { AuthService } from '../../core/auth.service';
import { API, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { IdentityConfirm } from './identity-confirm';
import { PASSKEYS } from './passkeys';

/** The server refusing a change, as a run hands it on. */
const refused = (error: object) => new HttpErrorResponse({ status: 400, statusText: 'Bad Request', error });

interface Inputs {
  mfaOn?: boolean;
  hasTotp?: boolean;
  askName?: boolean;
  run?: (proof: IdentityProof, name: string) => Promise<void>;
}

describe('IdentityConfirm', () => {
  afterEach(() => {
    httpMock().verify();
    // Back from where a test sent the browser.
    history.replaceState(null, '', location.pathname);
  });

  const create = async (inputs: Inputs = {}, passwordless = false) => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    const passkeys = {
      supported: vi.fn(() => false),
      autofillSupported: vi.fn(async () => false),
      authenticate: vi.fn(),
      register: vi.fn(),
      cancel: vi.fn()
    };
    TestBed.configureTestingModule({ providers: [...testProviders(), { provide: PASSKEYS, useValue: passkeys }] });
    if (passwordless) {
      TestBed.inject(AuthService).methods.set({
        enabled: ['google', 'github'],
        passwordless: true,
        linked: [
          { provider: 'google', linkedAt: '2026-10-01T10:00:00Z' },
          // Linked, but not on here any more: not offered.
          { provider: 'microsoft', linkedAt: '2026-10-02T10:00:00Z' }
        ]
      });
    }
    const fixture = TestBed.createComponent(IdentityConfirm);
    const run = vi.fn(inputs.run ?? (() => Promise.resolve()));
    fixture.componentRef.setInput('mfaOn', inputs.mfaOn ?? false);
    fixture.componentRef.setInput('hasTotp', inputs.hasTotp ?? false);
    fixture.componentRef.setInput('askName', inputs.askName ?? false);
    fixture.componentRef.setInput('action', 'Make the change');
    fixture.componentRef.setInput('run', run);
    await settle(fixture);
    return { fixture, run, root: fixture.nativeElement as HTMLElement };
  };

  const type = async (fixture: ComponentFixture<unknown>, id: string, value: string) => {
    const field = (fixture.nativeElement as HTMLElement).querySelector('#' + id) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const press = async (fixture: ComponentFixture<unknown>, label: string) => {
    const found = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (one) => one.textContent?.replace(/\s+/g, ' ').trim() === label
    );
    if (!found) throw new Error('no button ' + label);
    found.click();
    await settle(fixture);
  };

  it('offers an account with no password a fresh sign-in with each of its providers that is on, and goes there', async () => {
    const { fixture, root } = await create({}, true);
    expect(root.querySelector('input[type="password"]')).toBeNull();
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-reauth]')];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Sign in again with Google']);
    buttons[0]!.click();
    // A second press while the first is on its way asks nothing more.
    buttons[0]!.click();
    await settle(fixture);
    expect(buttons[0]!.getAttribute('aria-disabled')).toBe('true');
    const req = httpMock().expectOne(API + '/auth/google/reauth');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ next: location.pathname });
    // The provider's address; one on this page stands in for it, as jsdom goes only to those.
    req.flush({ location: location.pathname + '#signing-in-again-with-google' });
    await settle(fixture);
    expect(location.hash).toBe('#signing-in-again-with-google');
  });

  it('says when signing in again could not start, and lets the person try again', async () => {
    const { fixture, root } = await create({}, true);
    root.querySelector<HTMLButtonElement>('[data-reauth="google"]')!.click();
    httpMock()
      .expectOne(API + '/auth/google/reauth')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '[role="alert"]')).toBe('Could not start signing in again. Please try again.');
    expect(root.querySelector('[data-reauth="google"]')!.hasAttribute('aria-disabled')).toBe(false);
  });

  it('asks for a fresh sign-in again when the one it held was refused', async () => {
    const run = vi.fn(() =>
      Promise.reject(refused({ code: 'provider-reauth-needed', msg: 'Please sign in again with Google.' }))
    );
    const { fixture, root } = await create({ run }, true);
    TestBed.inject(AuthService).holdReauth({ grant: 'used-grant', provider: 'google', expiresAt: Date.now() + 60000 });
    await settle(fixture);
    expect(root.querySelector('[data-reauth]')).toBeNull();
    await press(fixture, 'Make the change');
    expect(run).toHaveBeenCalledWith({ reauth: 'used-grant' }, '');
    expect(text(fixture, '[role="alert"]')).toBe('Please sign in again with Google.');
    expect(TestBed.inject(AuthService).reauth()).toBeNull();
    expect(root.querySelector('[data-reauth="google"]')).not.toBeNull();
  });

  it('marks a wrong recovery code on its field', async () => {
    const run = vi.fn(() =>
      Promise.reject(refused({ code: 'recovery-code-wrong', msg: 'That recovery code is not correct.' }))
    );
    const { fixture } = await create({ mfaOn: true, run });
    await type(fixture, 'confirm-password', 'my-password');
    await type(fixture, 'confirm-recovery', 'abcde-00000');
    await press(fixture, 'Make the change');
    expect(run).toHaveBeenCalledWith({ password: 'my-password', recoveryCode: 'abcde-00000' }, '');
    expect(fieldProblem(fixture, 'confirm-recovery')).toBe('That recovery code is not correct.');
  });

  it('says above the buttons that a code was wrong when no code field is shown', async () => {
    const run = vi.fn(() => Promise.reject(refused({ code: 'code-wrong', msg: 'That code is not correct.' })));
    const { fixture } = await create({ mfaOn: true, hasTotp: true, run });
    // The authenticator app is offered first; the person uses a recovery code instead.
    await press(fixture, 'Use a recovery code instead');
    await type(fixture, 'confirm-password', 'my-password');
    await type(fixture, 'confirm-recovery', 'abcde-12345');
    await press(fixture, 'Make the change');
    expect(text(fixture, '[role="alert"]')).toBe('That code is not correct.');
    expect(fieldProblem(fixture, 'confirm-recovery')).toBe('');
  });

  it("marks a passkey name the server refuses on the name field, and a refusal of the password on the password's", async () => {
    const run = vi
      .fn<(proof: IdentityProof, name: string) => Promise<void>>()
      .mockRejectedValueOnce(refused({ code: 'passkey-name', msg: 'That name is taken by another passkey.' }))
      .mockRejectedValueOnce(refused({ code: 'password-reused', msg: 'Not that password.', field: 'password' }));
    const { fixture } = await create({ askName: true, run });
    await type(fixture, 'confirm-name', 'Laptop');
    await type(fixture, 'confirm-password', 'my-password');
    await press(fixture, 'Make the change');
    expect(run).toHaveBeenCalledWith({ password: 'my-password' }, 'Laptop');
    expect(fieldProblem(fixture, 'confirm-name')).toBe('That name is taken by another passkey.');

    await press(fixture, 'Make the change');
    expect(fieldProblem(fixture, 'confirm-password')).toBe('Not that password.');
    expect(((fixture.nativeElement as HTMLElement).querySelector('#confirm-password') as HTMLInputElement).value).toBe(
      ''
    );
  });

  it('says a passkey name was refused above the buttons when it asked for none', async () => {
    const run = vi.fn(() => Promise.reject(refused({ code: 'passkey-name', msg: 'That name is taken.' })));
    const { fixture } = await create({ run });
    await type(fixture, 'confirm-password', 'my-password');
    await press(fixture, 'Make the change');
    expect(text(fixture, '[role="alert"]')).toBe('That name is taken.');
  });
});
