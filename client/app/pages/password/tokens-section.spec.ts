import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MfaSummary } from '../../../../lib/mfa';
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
    expect(text(fixture, '.tokens-section')).toContain('You have no access tokens.');
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
    expect(req.request.body).toEqual({ name: 'My laptop', days: 30, password: 'password123' });
    const token = 'glazecalc_pat_' + 'x'.repeat(49);
    req.flush(
      { code: 'token-made', msg: 'Your access token is ready.', token, row: row('My laptop') },
      { status: 201, statusText: 'Created' }
    );
    await settle(fixture);
    expect((el(fixture, '#new-token') as HTMLInputElement).value).toBe(token);
    expect(text(fixture, '.token-list')).toContain('My laptop');
    expect(text(fixture, '.token-list')).toContain('ending Ab12');

    await press(fixture, 'I have copied it');
    expect(el(fixture, '#new-token')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(token);
  });

  it('asks for a second step too while two-step sign-in is on', async () => {
    const { fixture } = await create(ON);
    await type(fixture, 'token-name', 'Cursor');
    await press(fixture, 'Continue', '.tokens-section');
    await type(fixture, 'token-confirm-password', 'password123');
    await type(fixture, 'token-confirm-code', '123456');
    await press(fixture, 'Make the token');
    const req = httpMock().expectOne(API + '/tokens');
    expect(req.request.body).toEqual({ name: 'Cursor', days: 30, password: 'password123', code: '123456' });
    req.flush(
      { code: 'factor-needed', msg: 'Please also confirm it is you.' },
      { status: 400, statusText: 'Bad Request' }
    );
    await settle(fixture);
    // Still open, to try again.
    expect(el(fixture, '#token-confirm-password')).not.toBeNull();
  });

  it('lists tokens, revokes one, and says when the most are working', async () => {
    const list = {
      ...NO_TOKENS,
      most: 2,
      tokens: [row('Laptop'), row('Desk'), row('Old', { working: false, revokedAt: '2026-10-05T10:00:00Z' })]
    };
    const { fixture } = await create(OFF, list);
    expect(text(fixture, '.tokens-section')).toContain('You have 2 access tokens working');
    expect(el(fixture, '#token-name')).toBeNull();
    const old = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.token-row')].find((li) =>
      li.textContent?.includes('Old')
    )!;
    expect(old.textContent).toContain('revoked');
    expect(old.querySelector('button')).toBeNull();

    (el(fixture, 'button[aria-label="Revoke Laptop"]') as HTMLButtonElement).click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/tokens/laptop');
    expect(req.request.method).toBe('DELETE');
    req.flush({ code: 'token-revoked', msg: 'The access token was revoked. It no longer works.' });
    await settle(fixture);
    answer('/tokens', {
      ...list,
      tokens: [row('Laptop', { working: false, revokedAt: '2026-10-16T10:00:00Z' }), row('Desk')]
    });
    await settle(fixture);
    expect(text(fixture, '.tokens-section')).toContain('The access token was revoked.');
    expect(el(fixture, '#token-name')).not.toBeNull();
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
