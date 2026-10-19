import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MfaSummary } from '../../../../lib/mfa';
import { AuthService } from '../../core/auth.service';
import { PASSKEYS } from '../auth/passkeys';
import { answer, API, httpMock, NO_TOKENS, settle, testProviders, text } from '../../testing/test-providers';
import { AccountPage } from './account-page';

const ON: MfaSummary = {
  on: true,
  emailConfirmed: true,
  totp: { addedAt: '2026-10-01T10:00:00Z' },
  passkeys: [],
  codesLeft: 8
};
const OFF: MfaSummary = { on: false, emailConfirmed: true, totp: null, passkeys: [], codesLeft: 0 };

const row = (name: string, extra: object = {}) => ({
  id: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  scopes: ['data:read'],
  hint: 'Ab12',
  createdAt: '2026-10-01T10:00:00Z',
  expiresAt: '2026-10-31T10:00:00Z',
  working: true,
  ...extra
});

// The account page's "Access tokens" (docs/integrations-plan.md, item 27).
describe('AccountPage access tokens', () => {
  const create = async (summary: MfaSummary = OFF, tokens: object = NO_TOKENS) => {
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
    const fixture = TestBed.createComponent(AccountPage);
    await fixture.whenStable();
    answer('/preferences', { weightUnit: 'g' });
    answer('/mfa', summary);
    answer('/share/recipes', []);
    answer('/tokens', tokens);
    await settle(fixture);
    return { fixture };
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
  const press = async (fixture: ComponentFixture<unknown>, label: string, within = 'body') => {
    const scope = within === 'body' ? (fixture.nativeElement as HTMLElement) : el(fixture, within)!;
    const found = [...scope.querySelectorAll('button')].find(
      (one) => one.textContent?.replace(/\s+/g, ' ').trim() === label
    );
    if (!found) throw new Error('no button ' + label);
    found.click();
    await settle(fixture);
  };

  it('makes a token with the password, 30 days unless chosen, and shows it once', async () => {
    const { fixture } = await create();
    expect(text(fixture, '.tokens-section')).toContain('are on the Connected apps page');
    expect((el(fixture, '#token-days') as HTMLSelectElement).selectedOptions[0]!.textContent?.trim()).toBe('30 days');
    // The name first.
    await press(fixture, 'Continue', '.tokens-section');
    expect(el(fixture, '#token-name')!.getAttribute('aria-invalid')).toBe('true');
    expect(el(fixture, '#token-confirm-password')).toBeNull();

    await type(fixture, 'token-name', 'My laptop');
    await press(fixture, 'Continue', '.tokens-section');
    await type(fixture, 'token-confirm-password', 'password123');
    await press(fixture, 'Make the token');
    const req = httpMock().expectOne(API + '/tokens');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'My laptop', days: 30, scope: 'data:read', password: 'password123' });
    const token = 'glazecalc_pat_' + 'x'.repeat(49);
    req.flush(
      { code: 'token-made', msg: 'Your access token is ready.', token, row: row('My laptop') },
      { status: 201, statusText: 'Created' }
    );
    await settle(fixture);
    expect((el(fixture, '#new-token') as HTMLInputElement).value).toBe(token);
    // The new token counts toward the limit; the list itself is on Connected apps.
    expect(el(fixture, '.token-list')).toBeNull();

    await press(fixture, 'I have copied it');
    expect(el(fixture, '#new-token')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(token);
  });

  it('makes a token that can read and change, with only the shorter lifetimes, and says what each row can do', async () => {
    const { fixture } = await create(OFF, { ...NO_TOKENS, tokens: [row('Reader')] });
    const days = () => [...(el(fixture, '#token-days') as HTMLSelectElement).options].map((o) => o.textContent?.trim());
    expect(days()).toEqual(['7 days', '30 days', '90 days', '365 days']);
    // A year chosen first becomes the longest a writing token may have.
    const select = el(fixture, '#token-days') as HTMLSelectElement;
    select.value = select.options[3]!.value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    (el(fixture, '#token-scope-write') as HTMLInputElement).click();
    await settle(fixture);
    expect(days()).toEqual(['7 days', '30 days', '90 days']);
    expect(text(fixture, '.tokens-section')).toContain(
      'A token that can change your records stops working after at most 90 days.'
    );
    expect(el(fixture, '#token-scope-write')!.getAttribute('aria-describedby')).toBe('token-scope-write-hint');

    await type(fixture, 'token-name', 'Claude');
    await press(fixture, 'Continue', '.tokens-section');
    await type(fixture, 'token-confirm-password', 'password123');
    await press(fixture, 'Make the token');
    const req = httpMock().expectOne(API + '/tokens');
    expect(req.request.body).toEqual({ name: 'Claude', days: 90, scope: 'data:write', password: 'password123' });
    req.flush(
      {
        code: 'token-made',
        msg: 'Your access token is ready.',
        token: 'glazecalc_pat_' + 'y'.repeat(49),
        row: row('Claude', { scopes: ['data:write'] })
      },
      { status: 201, statusText: 'Created' }
    );
    await settle(fixture);
    expect(text(fixture, '.new-token-panel')).toContain('can read and change your records');
    // The form goes back to reading only.
    expect((el(fixture, '#token-scope-read') as HTMLInputElement).checked).toBe(true);
  });

  it('asks an account whose email is not confirmed to confirm it first, and sends the link again', async () => {
    const { fixture } = await create();
    const auth = TestBed.inject(AuthService);
    auth.email.set('potter@example.com');
    auth.unverified.set(true);
    await settle(fixture);
    expect(text(fixture, '.tokens-section .needs-email')).toContain(
      'Before you can make a token, confirm your email: open the link we sent to potter@example.com.'
    );
    expect(el(fixture, '#token-name')).toBeNull();
    await press(fixture, 'Send the confirmation link again', '.tokens-section');
    const req = httpMock().expectOne(API + '/email/resend');
    expect(req.request.method).toBe('POST');
    req.flush({ msg: 'We have sent a new link to your email.' });
    await settle(fixture);
    expect(text(fixture, '.tokens-section')).toContain('We have sent a new link');

    // Once confirmed, the form is there.
    auth.unverified.set(false);
    await settle(fixture);
    expect(el(fixture, '#token-name')).not.toBeNull();
  });

  it('closes the step when the server says the email is not confirmed yet', async () => {
    const { fixture } = await create();
    await type(fixture, 'token-name', 'My laptop');
    await press(fixture, 'Continue', '.tokens-section');
    await type(fixture, 'token-confirm-password', 'password123');
    await press(fixture, 'Make the token');
    httpMock()
      .expectOne(API + '/tokens')
      .flush(
        { code: 'token-needs-confirmed-email', msg: 'Please confirm your email before making an access token.' },
        { status: 403, statusText: 'Forbidden' }
      );
    await settle(fixture);
    expect(el(fixture, '#token-confirm-password')).toBeNull();
    expect(text(fixture, '.tokens-section')).toContain('Please confirm your email before making an access token.');
    expect(el(fixture, '.tokens-section .needs-email')).not.toBeNull();
  });

  it('asks for a second step too while two-step sign-in is on', async () => {
    const { fixture } = await create(ON);
    await type(fixture, 'token-name', 'Cursor');
    await press(fixture, 'Continue', '.tokens-section');
    await type(fixture, 'token-confirm-password', 'password123');
    await type(fixture, 'token-confirm-code', '123456');
    await press(fixture, 'Make the token');
    const req = httpMock().expectOne(API + '/tokens');
    expect(req.request.body).toEqual({
      name: 'Cursor',
      days: 30,
      scope: 'data:read',
      password: 'password123',
      code: '123456'
    });
    req.flush(
      { code: 'factor-needed', msg: 'Please also confirm it is you.' },
      { status: 400, statusText: 'Bad Request' }
    );
    await settle(fixture);
    // Still open, to try again.
    expect(el(fixture, '#token-confirm-password')).not.toBeNull();
  });

  it('confirms an account with no password by a fresh provider sign-in, with a second step when it is on', async () => {
    const { fixture } = await create(ON);
    const auth = TestBed.inject(AuthService);
    auth.methods.set({
      enabled: ['google'],
      passwordless: true,
      linked: [{ provider: 'google', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    await type(fixture, 'token-name', 'Cursor');
    await press(fixture, 'Continue', '.tokens-section');
    expect(el(fixture, '#token-confirm-password')).toBeNull();
    expect(el(fixture, '.tokens-section [data-reauth="google"]')).not.toBeNull();

    auth.holdReauth({ grant: 'fresh-grant', provider: 'google', expiresAt: Date.now() + 60000 });
    await settle(fixture);
    await type(fixture, 'token-confirm-code', '123456');
    await press(fixture, 'Make the token');
    const req = httpMock().expectOne(API + '/tokens');
    expect(req.request.body).toEqual({
      name: 'Cursor',
      days: 30,
      scope: 'data:read',
      reauth: 'fresh-grant',
      code: '123456'
    });
    req.flush(
      {
        code: 'token-made',
        msg: 'Your access token is ready.',
        token: 'glazecalc_pat_' + 'y'.repeat(49),
        row: row('Cursor')
      },
      { status: 201, statusText: 'Created' }
    );
    await settle(fixture);
    // The grant confirmed this one change.
    expect(auth.reauth()).toBeNull();
  });

  it('links to Connected apps for the list and Revoke, and says when the most are working', async () => {
    const list = {
      ...NO_TOKENS,
      most: 2,
      tokens: [row('Laptop'), row('Desk'), row('Old', { working: false, revokedAt: '2026-10-05T10:00:00Z' })]
    };
    const { fixture } = await create(OFF, list);
    expect(text(fixture, '.tokens-section')).toContain('You have 2 access tokens working');
    // Signing out everywhere stops them too, and says so.
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'It also stops your 2 access tokens, for good.'
    );
    expect(el(fixture, '#token-name')).toBeNull();
    // The list, with Revoke, moved to Connected apps: a link is left.
    expect(el(fixture, '.token-list')).toBeNull();
    expect(el(fixture, '.revoke-token')).toBeNull();
    expect(el(fixture, '.tokens-section .see-apps a')!.getAttribute('href')).toBe('/account/apps');
  });

  it('offers to revoke the tokens still working after a password change', async () => {
    const { fixture } = await create(OFF, { ...NO_TOKENS, tokens: [row('Laptop'), row('Desk')] });
    await type(fixture, 'current', 'old-password');
    await type(fixture, 'password', 'new-password');
    await type(fixture, 'confirmation', 'new-password');
    await press(fixture, 'Change password');
    httpMock()
      .expectOne(API + '/password')
      .flush({ msg: 'Your password has been changed.', email: 'a@b.com', tokens: 2 });
    await settle(fixture);
    answer('/tokens', { ...NO_TOKENS, tokens: [row('Laptop'), row('Desk')] });
    await settle(fixture);
    const offer = el(fixture, '.tokens-after-change')!;
    expect(offer.textContent).toContain('did not stop your 2 access tokens');
    expect(offer.textContent).toContain('Laptop');
    expect(document.activeElement?.id).toBe('tokens-kept-heading');

    await press(fixture, 'Revoke all access tokens', '.tokens-after-change');
    const req = httpMock().expectOne(API + '/tokens');
    expect(req.request.method).toBe('DELETE');
    req.flush({ code: 'tokens-revoked', msg: '2 access tokens were revoked.', params: { count: 2 } });
    await settle(fixture);
    answer('/tokens', { ...NO_TOKENS, tokens: [row('Laptop', { working: false }), row('Desk', { working: false })] });
    await settle(fixture);
    expect(el(fixture, '.tokens-after-change')).toBeNull();
    expect(text(fixture, '.server-msg')).toContain('2 access tokens were revoked.');
  });
});
