import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { MfaSummary } from '../../../../lib/mfa';
import { AuthService, SIGN_IN_PROVIDERS } from '../../core/auth.service';
import { OfflineAsk } from '../../core/offline-ask';
import { RECORDS_FLAG } from '../../core/offline-records';
import { PASSKEYS } from '../auth/passkeys';
import {
  API,
  NO_TOKENS,
  answer,
  fieldProblem,
  httpMock,
  settle,
  testProviders,
  text,
  waitFor
} from '../../testing/test-providers';
import { AccountPage } from './account-page';

const OFF: MfaSummary = { on: false, emailConfirmed: true, totp: null, passkeys: [], codesLeft: 0 };
const ON: MfaSummary = {
  on: true,
  emailConfirmed: true,
  totp: { addedAt: '2026-10-01T10:00:00Z' },
  passkeys: [],
  codesLeft: 8
};

const token = (name: string) => ({
  id: name.toLowerCase(),
  name,
  scopes: ['data:read'],
  hint: 'Ab12',
  createdAt: '2026-10-01T10:00:00Z',
  expiresAt: '2026-10-31T10:00:00Z',
  working: true
});

interface Options {
  mfa?: MfaSummary;
  unverified?: boolean;
  tokens?: object;
  /** This browser keeps the account's records for offline use. */
  offlineCopy?: boolean;
  providers?: () => Promise<string[]>;
}

// The account page's own forms, used as a person does: typing in the fields and pressing the buttons.
describe('AccountPage, used from its forms', () => {
  const create = async (options: Options = {}) => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    if (options.offlineCopy) localStorage.setItem(RECORDS_FLAG, '1');
    const passkeys = {
      supported: vi.fn(() => false),
      autofillSupported: vi.fn(async () => false),
      authenticate: vi.fn(),
      register: vi.fn(),
      cancel: vi.fn()
    };
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: PASSKEYS, useValue: passkeys },
        ...(options.providers ? [{ provide: SIGN_IN_PROVIDERS, useValue: options.providers }] : [])
      ]
    });
    TestBed.inject(AuthService).unverified.set(options.unverified ?? false);
    const fixture = TestBed.createComponent(AccountPage);
    await fixture.whenStable();
    answer('/preferences', { weightUnit: 'g' });
    answer('/share/recipes', []);
    answer('/mfa', options.mfa ?? OFF);
    answer('/tokens', options.tokens ?? NO_TOKENS);
    await settle(fixture);
    return { fixture, navigate: vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true) };
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
  const button = (fixture: ComponentFixture<unknown>, label: string, within = ':root') => {
    const scope = within === ':root' ? (fixture.nativeElement as HTMLElement) : el(fixture, within)!;
    const found = [...scope.querySelectorAll('button')].find(
      (one) => one.textContent?.replace(/\s+/g, ' ').trim() === label
    );
    if (!found) throw new Error('no button ' + label);
    return found;
  };
  const press = async (fixture: ComponentFixture<unknown>, label: string, within = ':root') => {
    button(fixture, label, within).click();
    await settle(fixture);
  };
  const click = async (fixture: ComponentFixture<unknown>, selector: string) => {
    el(fixture, selector)!.click();
    await settle(fixture);
  };

  it('sends the confirmation link again from its button, once at a time, and says when it could not', async () => {
    const { fixture } = await create({ unverified: true });
    const resend = button(fixture, 'Send the link again', '.unverified-email');
    resend.click();
    // A second press while the first is on its way sends nothing more.
    resend.click();
    httpMock()
      .expectOne(API + '/email/resend')
      .flush({ msg: 'We have sent a new link to your email.' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('We have sent a new link');

    await press(fixture, 'Send the link again', '.unverified-email');
    httpMock()
      .expectOne(API + '/email/resend')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('Error: could not send the link. Please try again.');
  });

  it('asks for a link to a new address from the form, and asks for the password again when it could not be sent', async () => {
    const { fixture } = await create();
    await type(fixture, 'new-email', 'new@b.com');
    await type(fixture, 'email-password', 'my-password');
    await press(fixture, 'Send the link');
    const req = httpMock().expectOne(API + '/email/change');
    expect(req.request.body).toEqual({ email: 'new@b.com', password: 'my-password' });
    req.flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('Error: could not send the link. Please try again.');
    expect((el(fixture, '#email-password') as HTMLInputElement).value).toBe('');
    expect((el(fixture, '#new-email') as HTMLInputElement).value).toBe('new@b.com');
  });

  it('marks the password fields from the form: empty ones first, then the one the server names', async () => {
    const { fixture } = await create();
    await press(fixture, 'Change password');
    httpMock().expectNone(API + '/password');
    expect(fieldProblem(fixture, 'current')).toBe('Enter your current password.');

    await type(fixture, 'current', 'old-password');
    await type(fixture, 'password', 'password');
    await type(fixture, 'confirmation', 'password');
    await press(fixture, 'Change password');
    httpMock()
      .expectOne(API + '/password')
      .flush(
        { msg: 'That password is one of the most common. Please choose another.', field: 'password' },
        { status: 400, statusText: 'Bad Request' }
      );
    await settle(fixture);
    expect(fieldProblem(fixture, 'password')).toBe('That password is one of the most common. Please choose another.');
    expect(el(fixture, '.errors-section')).toBeNull();
  });

  it('offers to revoke the tokens still working after a password change: a failed revoke says so, and Keep them closes it', async () => {
    const { fixture } = await create({ tokens: { ...NO_TOKENS, tokens: [token('Laptop')] } });
    await type(fixture, 'current', 'old-password');
    await type(fixture, 'password', 'new-password');
    await type(fixture, 'confirmation', 'new-password');
    await press(fixture, 'Change password');
    httpMock()
      .expectOne(API + '/password')
      .flush({ msg: 'Your password has been changed.', email: 'a@b.com' });
    await settle(fixture);
    answer('/tokens', { ...NO_TOKENS, tokens: [token('Laptop')] });
    await settle(fixture);
    expect(text(fixture, '.tokens-after-change')).toContain('Laptop');

    const revoke = button(fixture, 'Revoke all access tokens', '.tokens-after-change');
    revoke.click();
    revoke.click();
    httpMock()
      .expectOne((req) => req.method === 'DELETE' && req.url === API + '/tokens')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('Error: could not revoke the token. Please try again.');
    expect(el(fixture, '.tokens-after-change')).not.toBeNull();

    await press(fixture, 'Keep them', '.tokens-after-change');
    expect(el(fixture, '.tokens-after-change')).toBeNull();
  });

  it('revokes the tokens all the same when their list cannot be read again after', async () => {
    const { fixture } = await create({ tokens: { ...NO_TOKENS, tokens: [token('Laptop')] } });
    await type(fixture, 'current', 'old-password');
    await type(fixture, 'password', 'new-password');
    await type(fixture, 'confirmation', 'new-password');
    await press(fixture, 'Change password');
    httpMock()
      .expectOne(API + '/password')
      .flush({ msg: 'Your password has been changed.', email: 'a@b.com' });
    await settle(fixture);
    answer('/tokens', { ...NO_TOKENS, tokens: [token('Laptop')] });
    await settle(fixture);
    await press(fixture, 'Revoke all access tokens', '.tokens-after-change');
    httpMock()
      .expectOne((req) => req.method === 'DELETE' && req.url === API + '/tokens')
      .flush({ code: 'tokens-revoked', msg: '1 access token was revoked.', params: { count: 1 } });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/tokens')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('1 access token was revoked.');
    expect(el(fixture, '.tokens-after-change')).toBeNull();
  });

  it("shows nothing of the tokens of the account signed in before while the next one's load", async () => {
    const { fixture } = await create({ tokens: { ...NO_TOKENS, tokens: [token('Laptop'), token('Desk')] } });
    expect(text(fixture)).toContain('It also stops your 2 access tokens, for good.');
    fixture.destroy();
    const auth = TestBed.inject(AuthService);
    const out = auth.signOut();
    httpMock()
      .expectOne(API + '/signout')
      .flush({});
    await out;
    // Someone else signs in on this tab, and opens the account page.
    const signIn = auth.signIn('b@b.com', 'password123');
    httpMock()
      .expectOne(API + '/signin')
      .flush({ msg: 'Success in signin', email: 'b@b.com', kept: 0 });
    await signIn;
    const next = TestBed.createComponent(AccountPage);
    await next.whenStable();
    expect(text(next)).not.toContain('access tokens, for good');
    answer('/preferences', { weightUnit: 'g' });
    answer('/share/recipes', []);
    answer('/mfa', OFF);
    answer('/tokens', NO_TOKENS);
    await settle(next);
    expect(text(next)).not.toContain('access tokens, for good');
  });

  it('offers nothing to revoke when the tokens cannot be looked up after a password change', async () => {
    const { fixture } = await create({ tokens: { ...NO_TOKENS, tokens: [token('Laptop')] } });
    await type(fixture, 'current', 'old-password');
    await type(fixture, 'password', 'new-password');
    await type(fixture, 'confirmation', 'new-password');
    await press(fixture, 'Change password');
    httpMock()
      .expectOne(API + '/password')
      .flush({ msg: 'Your password has been changed.', email: 'a@b.com' });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/tokens')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('Your password has been changed.');
    expect(el(fixture, '.tokens-after-change')).toBeNull();
  });

  it('asks for the password before deleting, and marks a wrong one on its field', async () => {
    const { fixture, navigate } = await create();
    await press(fixture, 'Delete my account');
    httpMock().expectNone(API + '/verify');
    expect(fieldProblem(fixture, 'delete-password')).toBe('Enter your password to confirm.');

    await type(fixture, 'delete-password', 'wrong');
    await press(fixture, 'Delete my account');
    httpMock()
      .expectOne(API + '/verify')
      .flush({ id: 'u1', email: 'a@b.com' });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/deleteuser/u1')
      .flush(
        { msg: 'Your current password is not correct.', field: 'password' },
        { status: 400, statusText: 'Bad Request' }
      );
    await settle(fixture);
    expect(fieldProblem(fixture, 'delete-password')).toBe('Your current password is not correct.');
    expect(TestBed.inject(AuthService).hasSession()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signs out everywhere from its button, asking first about the offline copy kept on this device', async () => {
    const { fixture, navigate } = await create({ offlineCopy: true });
    const ask = TestBed.inject(OfflineAsk);
    await press(fixture, 'Sign out everywhere');
    await waitFor(() => expect(ask.open()).not.toBeNull());
    expect(ask.open()!.question.choices.map((choice) => choice.id)).toEqual(['keep', 'delete', 'cancel']);
    // Cancel: still signed in, nothing sent.
    ask.open()!.answer('cancel');
    await settle(fixture);
    httpMock().expectNone(API + '/signout-everywhere');
    expect(TestBed.inject(AuthService).hasSession()).toBe(true);

    // Delete from this device, then sign out.
    const out = button(fixture, 'Sign out everywhere');
    out.click();
    out.click();
    await waitFor(() => expect(ask.open()).not.toBeNull());
    ask.open()!.answer('delete');
    const req = await waitFor(() => httpMock().expectOne(API + '/signout-everywhere'));
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    req.flush({ msg: 'You have been signed out on every device.' });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith('/signin');
  });

  it('leaves the sign-in providers out of its contents when it cannot tell whether any is on', async () => {
    const { fixture } = await create({ providers: () => Promise.reject(new Error('Unknown Error')) });
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav.account-contents a')];
    expect(links.map((a) => a.textContent?.trim())).not.toContain('Google, GitHub and Microsoft');
    expect(links).toHaveLength(11);
  });

  it('offers a trial to keep its work as an account, with its settings, a download and the Trash', async () => {
    localStorage.clear();
    localStorage.setItem('session', 'trial');
    localStorage.setItem('trial', JSON.stringify({ name: 'Blue Heron', expiresAt: '2099-01-01T00:00:00Z' }));
    TestBed.configureTestingModule({ providers: testProviders() });
    const fixture = TestBed.createComponent(AccountPage);
    await fixture.whenStable();
    answer('/preferences', { weightUnit: 'g' });
    await settle(fixture);
    expect(text(fixture, 'gc-page-header')).toContain('Your trial');
    expect(text(fixture, 'gc-page-header')).toContain('You are trying Glazecalc as Blue Heron.');
    expect(text(fixture, '.trial-account')).toContain('This trial and everything in it are removed on');
    expect(text(fixture, '.trial-account')).toContain('Blue Heron stays your display name.');
    expect(el(fixture, '.trial-account a')!.getAttribute('href')).toBe('/signup');
    expect(el(fixture, '#settings-heading')).not.toBeNull();
    expect(el(fixture, '#export-heading')).not.toBeNull();
    expect(el(fixture, 'a[href="/trash"]')).not.toBeNull();
    // Nothing that a trial has no use for: a password, two-step sign-in, tokens, deleting.
    expect(el(fixture, '#password')).toBeNull();
    expect(el(fixture, 'gc-sign-in-section')).toBeNull();
    expect(el(fixture, '#delete-submit')).toBeNull();
  });

  describe('with two-step sign-in on', () => {
    it('checks the new password again before the second step is sent, and closes the step when it changed', async () => {
      const { fixture } = await create({ mfa: ON });
      await type(fixture, 'password', 'new-password');
      await type(fixture, 'confirmation', 'new-password');
      await click(fixture, '#password-submit');
      // While the step is open, the confirmation is changed so the two no longer match.
      await type(fixture, 'confirmation', 'new-passwor');
      await type(fixture, 'password-confirm-password', 'old-password');
      await type(fixture, 'password-confirm-code', '123456');
      await press(fixture, 'Change password');
      httpMock().expectNone(API + '/password');
      expect(el(fixture, '.confirm-step')).toBeNull();
      expect(fieldProblem(fixture, 'confirmation')).toBe('The two passwords do not match.');
    });

    it('closes the step and marks the new password when the server refuses it', async () => {
      const { fixture } = await create({ mfa: ON });
      await type(fixture, 'password', 'password');
      await type(fixture, 'confirmation', 'password');
      await click(fixture, '#password-submit');
      await type(fixture, 'password-confirm-password', 'old-password');
      await type(fixture, 'password-confirm-code', '123456');
      await press(fixture, 'Change password');
      httpMock()
        .expectOne(API + '/password')
        .flush(
          { msg: 'That password is one of the most common. Please choose another.', field: 'password' },
          { status: 400, statusText: 'Bad Request' }
        );
      await settle(fixture);
      expect(el(fixture, '.confirm-step')).toBeNull();
      expect(fieldProblem(fixture, 'password')).toBe('That password is one of the most common. Please choose another.');
    });

    it('checks the new address again before the second step is sent', async () => {
      const { fixture } = await create({ mfa: ON });
      await type(fixture, 'new-email', 'new@b.com');
      await click(fixture, '#email-submit');
      await type(fixture, 'new-email', 'not an address');
      await type(fixture, 'email-confirm-password', 'my-password');
      await type(fixture, 'email-confirm-code', '123456');
      await press(fixture, 'Send the link');
      httpMock().expectNone(API + '/email/change');
      expect(el(fixture, '.confirm-step')).toBeNull();
      expect(fieldProblem(fixture, 'new-email')).not.toBe('');
    });
  });
});
