import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { MfaSummary } from '../../../../lib/mfa';
import { AuthService } from '../../core/auth.service';
import { PASSKEYS, Passkeys } from '../auth/passkeys';
import { answer, API, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { AccountPage } from './account-page';

type Page = Record<string, any>;
type FakePasskeys = { [K in keyof Passkeys]: ReturnType<typeof vi.fn> };

const ON: MfaSummary = {
  on: true,
  emailConfirmed: true,
  totp: { addedAt: '2026-10-01T10:00:00Z' },
  passkeys: [],
  codesLeft: 8
};
const OFF: MfaSummary = { on: false, emailConfirmed: true, totp: null, passkeys: [], codesLeft: 0 };

// Decision 6 on the account page itself: with two-step sign-in on, changing
// the email or the password and deleting the account ask for the password and
// a second step (IdentityConfirm) once the rest of the form is filled in.
describe('AccountPage with two-step sign-in on', () => {
  const create = async (summary: MfaSummary = ON) => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    const passkeys: FakePasskeys = {
      supported: vi.fn(() => false),
      autofillSupported: vi.fn(async () => false),
      authenticate: vi.fn(),
      register: vi.fn(),
      cancel: vi.fn()
    };
    TestBed.configureTestingModule({ providers: [...testProviders(), { provide: PASSKEYS, useValue: passkeys }] });
    const fixture = TestBed.createComponent(AccountPage);
    await fixture.whenStable();
    answer('/preferences', { weightUnit: 'g' });
    answer('/share/recipes', []);
    answer('/mfa', summary);
    await settle(fixture);
    return { fixture, page: fixture.componentInstance as unknown as Page };
  };
  afterEach(() => httpMock().verify());

  const el = (fixture: ComponentFixture<unknown>, selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement | null;
  const type = async (fixture: ComponentFixture<unknown>, id: string, value: string) => {
    const field = el(fixture, '#' + id) as HTMLInputElement | null;
    if (!field) throw new Error('no field #' + id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const click = async (fixture: ComponentFixture<unknown>, selector: string) => {
    const found = el(fixture, selector);
    if (!found) throw new Error('no ' + selector);
    found.click();
    await settle(fixture);
  };
  const press = async (fixture: ComponentFixture<unknown>, label: string) => {
    const found = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (one) => one.textContent?.replace(/\s+/g, ' ').trim() === label
    );
    if (!found) throw new Error('no button ' + label);
    found.click();
    await settle(fixture);
  };

  it('asks for no password in the forms themselves while it is off', async () => {
    const { fixture } = await create(OFF);
    expect(el(fixture, '#current')).not.toBeNull();
    expect(el(fixture, '#email-password')).not.toBeNull();
    expect(el(fixture, '#delete-password')).not.toBeNull();
    expect(text(fixture, '#email-submit')).toBe('Send the link');
  });

  it('sends the email link with the password and a code', async () => {
    const { fixture, page } = await create();
    expect(el(fixture, '#email-password')).toBeNull();
    expect(text(fixture, '#email-submit')).toBe('Continue');
    await type(fixture, 'new-email', 'new@b.com');
    await click(fixture, '#email-submit');
    httpMock().expectNone(API + '/email/change');
    expect(text(fixture, '.confirm-step')).toContain('Two-step sign-in is on, so confirm it is you');
    expect(document.activeElement?.id).toBe('email-confirm-password');

    await type(fixture, 'email-confirm-password', 'my-password');
    await type(fixture, 'email-confirm-code', '123 456');
    await press(fixture, 'Send the link');
    const req = httpMock().expectOne(API + '/email/change');
    expect(req.request.body).toEqual({ email: 'new@b.com', password: 'my-password', code: '123456' });
    req.flush({ msg: 'We have sent a link to the new address.' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('We have sent a link');
    expect(el(fixture, '.confirm-step')).toBeNull();
    expect(page['newEmail']()).toBe('');
  });

  it('shows a wrong code on the code field, and keeps the step open', async () => {
    const { fixture } = await create();
    await type(fixture, 'new-email', 'new@b.com');
    await click(fixture, '#email-submit');
    await type(fixture, 'email-confirm-password', 'my-password');
    await type(fixture, 'email-confirm-code', '000000');
    await press(fixture, 'Send the link');
    httpMock()
      .expectOne(API + '/email/change')
      .flush(
        { code: 'code-wrong', msg: 'That code is not correct.', field: 'code' },
        { status: 400, statusText: 'Bad' }
      );
    await settle(fixture);
    expect(fieldProblem(fixture, 'email-confirm-code')).toBe('That code is not correct.');
    expect(el(fixture, '.confirm-step')).not.toBeNull();
  });

  it('closes the step and marks the new address when it is taken', async () => {
    const { fixture } = await create();
    await type(fixture, 'new-email', 'taken@b.com');
    await click(fixture, '#email-submit');
    await type(fixture, 'email-confirm-password', 'my-password');
    await type(fixture, 'email-confirm-code', '123456');
    await press(fixture, 'Send the link');
    httpMock()
      .expectOne(API + '/email/change')
      .flush({ msg: 'That email is already in use', field: 'email' }, { status: 400, statusText: 'Bad Request' });
    await settle(fixture);
    expect(el(fixture, '.confirm-step')).toBeNull();
    expect(fieldProblem(fixture, 'new-email')).toBe('That email is already in use');
  });

  it('checks the new address before asking for the second step', async () => {
    const { fixture } = await create();
    await type(fixture, 'new-email', 'nope');
    await click(fixture, '#email-submit');
    expect(el(fixture, '.confirm-step')).toBeNull();
    expect(fieldProblem(fixture, 'new-email')).not.toBe('');
  });

  it('gives the focus back to the button when the step is cancelled', async () => {
    const { fixture } = await create();
    await type(fixture, 'new-email', 'new@b.com');
    await click(fixture, '#email-submit');
    await press(fixture, 'Cancel');
    expect(el(fixture, '.confirm-step')).toBeNull();
    expect(document.activeElement?.id).toBe('email-submit');
  });

  it('changes the password with the current one and a code', async () => {
    const { fixture } = await create();
    expect(el(fixture, '#current')).toBeNull();
    await type(fixture, 'password', 'new-password');
    await type(fixture, 'confirmation', 'new-password');
    await click(fixture, '#password-submit');
    await type(fixture, 'password-confirm-password', 'old-password');
    await type(fixture, 'password-confirm-code', '123456');
    await press(fixture, 'Change password');
    const req = httpMock().expectOne(API + '/password');
    expect(req.request.body).toEqual({ current: 'old-password', password: 'new-password', code: '123456' });
    req.flush({ msg: 'Your password has been changed.', email: 'a@b.com' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('Your password has been changed.');
    expect(el(fixture, '.confirm-step')).toBeNull();
  });

  it('shows a wrong current password on the step password field', async () => {
    const { fixture } = await create();
    await type(fixture, 'password', 'new-password');
    await type(fixture, 'confirmation', 'new-password');
    await click(fixture, '#password-submit');
    await type(fixture, 'password-confirm-password', 'nope');
    await type(fixture, 'password-confirm-code', '123456');
    await press(fixture, 'Change password');
    httpMock()
      .expectOne(API + '/password')
      .flush(
        { code: 'current-password-wrong', msg: 'Your current password is not correct.', field: 'current' },
        { status: 400, statusText: 'Bad Request' }
      );
    await settle(fixture);
    expect(fieldProblem(fixture, 'password-confirm-password')).toBe('Your current password is not correct.');
    expect(TestBed.inject(AuthService).hasSession()).toBe(true);
  });

  it('deletes the account with the password and a recovery code', async () => {
    const { fixture } = await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    expect(el(fixture, '#delete-password')).toBeNull();
    await click(fixture, '#delete-submit');
    await press(fixture, 'Use a recovery code instead');
    expect(el(fixture, '#delete-confirm-recovery')?.getAttribute('aria-describedby')).toBe(
      'delete-confirm-recovery-hint'
    );
    await type(fixture, 'delete-confirm-password', 'my-password');
    await type(fixture, 'delete-confirm-recovery', 'abcde-12345');
    await press(fixture, 'Delete my account');
    httpMock()
      .expectOne(API + '/verify')
      .flush({ msg: 'User verified', email: 'a@b.com', id: 'u1' });
    await settle(fixture);
    const req = httpMock().expectOne(API + '/deleteuser/u1');
    expect(req.request.body).toEqual({ password: 'my-password', recoveryCode: 'abcde-12345' });
    req.flush({ msg: 'User deleted' });
    await settle(fixture);
    expect(TestBed.inject(AuthService).hasSession()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
