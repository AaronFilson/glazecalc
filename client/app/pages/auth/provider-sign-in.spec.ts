import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, SIGN_IN_PROVIDERS } from '../../core/auth.service';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { ProvidersSection } from '../password/providers-section';
import { AuthPage } from './auth-page';
import { PASSKEYS } from './passkeys';

const noPasskeys = {
  supported: vi.fn(() => false),
  autofillSupported: vi.fn(async () => false),
  authenticate: vi.fn(),
  register: vi.fn(),
  cancel: vi.fn()
};

const route = (mode: 'signin' | 'signup', query: Record<string, string> = {}) => ({
  data: of({ mode }),
  snapshot: { queryParamMap: convertToParamMap(query) }
});

// Signing in with Google or GitHub (docs/adr/0015-provider-sign-in.md): the
// buttons, finishing what the provider sent back, and the account page's section.
describe('signing in with a provider', () => {
  const create = async (mode: 'signin' | 'signup', query: Record<string, string> = {}) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: route(mode, query) },
        { provide: PASSKEYS, useValue: noPasskeys },
        { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve(['google', 'github']) }
      ]
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AuthPage);
    await settle(fixture);
    return { fixture, navigate, page: fixture.componentInstance as unknown as Record<string, any> };
  };

  afterEach(() => httpMock().verify());

  it('offers each provider that is on, as a link that keeps the language and the keep-me-signed-in box', async () => {
    const { fixture, page } = await create('signin');
    const links = [...fixture.nativeElement.querySelectorAll('.provider-buttons a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Continue with Google', 'Continue with GitHub']);
    expect(links[0]!.getAttribute('href')).toBe(API + '/auth/google/start?next=%2F');
    page['keep'].set(true);
    await settle(fixture);
    expect(links[1]!.getAttribute('href')).toBe(API + '/auth/github/start?next=%2F&keep=1');
  });

  it('finishes a sign-in the provider sent back, and goes on to the page it was for', async () => {
    const { navigate } = await create('signin', { provider: 'google' });
    const req = httpMock().expectOne(API + '/auth/finish');
    expect(req.request.method).toBe('POST');
    req.flush({ code: 'signed-in', msg: 'Success in signin', email: 'potter@example.com', kept: 0, next: '/recipe' });
    await settle();
    expect(TestBed.inject(AuthService).email()).toBe('potter@example.com');
    expect(navigate).toHaveBeenCalledWith('/recipe');
  });

  it('asks for the second step after the provider when the account has two-step sign-in', async () => {
    const { fixture, page } = await create('signin', { provider: 'github' });
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({
        code: 'second-step',
        msg: 'This account uses two-step sign-in.',
        methods: { totp: true, passkey: false, recovery: true },
        pending: 'pending-token',
        expiresAt: '2999-01-01T00:00:00Z',
        email: 'potter@example.com',
        next: '/home'
      });
    await settle(fixture);
    expect(page['secondStep']()?.pending).toBe('pending-token');
    expect(text(fixture, 'p.muted')).toContain('potter@example.com');
    expect(TestBed.inject(AuthService).email()).toBe(null);
  });

  it('asks to sign in to the account with the email, then links the provider to it', async () => {
    const { fixture, page, navigate } = await create('signin', { provider: 'google' });
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush(
        {
          code: 'provider-sign-in-to-link',
          msg: 'A Glazecalc account already uses the email from Google.',
          params: { provider: 'google' },
          provider: 'google'
        },
        { status: 409, statusText: 'Conflict' }
      );
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('already uses the email from Google');

    page['email'].set('potter@example.com');
    page['password'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'potter@example.com' });
    await settle();
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({ code: 'provider-linked', msg: 'Google is linked.', params: { provider: 'google' }, provider: 'google' });
    await submitting;
    expect(navigate).toHaveBeenCalledWith('/account');
    expect(TestBed.inject(AuthService).providerNotice()).toBe('Google is linked.');
  });

  it('says what went wrong when the provider sign-in did not work', async () => {
    const { fixture } = await create('signin', { provider: 'google' });
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush(
        { code: 'provider-email-unverified', msg: 'No verified email.', params: { provider: 'google' } },
        { status: 400, statusText: 'Bad Request' }
      );
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('No verified email.');
  });
});

describe('the account page section for Google and GitHub', () => {
  const create = async () => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: route('signin') },
        { provide: PASSKEYS, useValue: noPasskeys },
        { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve(['google', 'github']) }
      ]
    });
    const fixture = TestBed.createComponent(ProvidersSection);
    await settle(fixture);
    return fixture;
  };

  afterEach(() => httpMock().verify());

  it('lists the providers, and unlinks one after the password', async () => {
    const fixture = await create();
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: false,
      linked: [{ provider: 'github', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    const rows = [...fixture.nativeElement.querySelectorAll('.provider-list li')] as HTMLElement[];
    expect(rows.map((row) => row.querySelector('.provider-name')?.textContent?.trim())).toEqual(['Google', 'GitHub']);
    expect(rows[0]!.textContent).toContain('Not linked');
    expect(rows[1]!.textContent).toContain('Linked on');

    (fixture.nativeElement.querySelector('[data-unlink="github"]') as HTMLButtonElement).click();
    await settle(fixture);
    const password = fixture.nativeElement.querySelector('#provider-confirm-password') as HTMLInputElement;
    password.value = 'password123';
    password.dispatchEvent(new Event('input'));
    await settle(fixture);
    (fixture.nativeElement.querySelector('.identity-confirm button[type="submit"]') as HTMLButtonElement).click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/auth/github');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ password: 'password123' });
    req.flush({ code: 'provider-unlinked', msg: 'GitHub is unlinked.', params: { provider: 'github' } });
    await settle(fixture);
    answer('/auth/methods', { enabled: ['google', 'github'], passwordless: false, linked: [] });
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('GitHub is unlinked.');
  });

  it('offers a passwordless account the email to set a password, and never unlinks its only provider', async () => {
    const fixture = await create();
    TestBed.inject(AuthService).email.set('potter@example.com');
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: true,
      linked: [{ provider: 'google', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[data-unlink]')).toBe(null);
    expect(fixture.nativeElement.querySelector('[data-link="github"]')).not.toBe(null);
    (fixture.nativeElement.querySelector('.passwordless button') as HTMLButtonElement).click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/password/forgot');
    expect(req.request.body).toEqual({ email: 'potter@example.com' });
    req.flush({ code: 'reset-sent', msg: 'Sent.', params: { minutes: 30 } });
    await settle(fixture);
  });

  it('confirms with a fresh provider sign-in in place of the password, once', async () => {
    const fixture = await create();
    const auth = TestBed.inject(AuthService);
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: true,
      linked: [
        { provider: 'google', linkedAt: '2026-10-01T10:00:00Z' },
        { provider: 'github', linkedAt: '2026-10-02T10:00:00Z' }
      ]
    });
    await settle(fixture);
    (fixture.nativeElement.querySelector('[data-unlink="github"]') as HTMLButtonElement).click();
    await settle(fixture);
    const confirm = fixture.nativeElement.querySelector('.identity-confirm') as HTMLElement;
    expect(confirm.querySelector('input[type="password"]')).toBe(null);
    const again = [...confirm.querySelectorAll('[data-reauth]')].map((b) => b.getAttribute('data-reauth'));
    expect(again).toEqual(['google', 'github']);
    // Not yet signed in again: nothing is sent.
    (confirm.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle(fixture);
    expect(confirm.textContent).toContain('Please sign in again first');

    auth.holdReauth({ grant: 'fresh-grant', provider: 'google', expiresAt: Date.now() + 60000 });
    await settle(fixture);
    expect(confirm.textContent).toContain('You signed in again with Google.');
    (confirm.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/auth/github');
    expect(req.request.body).toEqual({ reauth: 'fresh-grant' });
    req.flush({ code: 'provider-unlinked', msg: 'GitHub is unlinked.', params: { provider: 'github' } });
    await settle(fixture);
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: true,
      linked: [{ provider: 'google', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    expect(auth.reauth()).toBe(null);
  });

  it('holds the grant a fresh sign-in brings back, and says so', async () => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: route('signin', { provider: 'google' }) },
        { provide: PASSKEYS, useValue: noPasskeys },
        { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve(['google', 'github']) }
      ]
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ProvidersSection);
    await settle(fixture);
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({
        code: 'provider-reauthed',
        msg: 'You signed in again with Google.',
        params: { provider: 'google' },
        provider: 'google',
        reauth: 'fresh-grant',
        expiresAt: new Date(Date.now() + 300000).toISOString()
      });
    await settle(fixture);
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: true,
      linked: [{ provider: 'google', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    expect(TestBed.inject(AuthService).reauth()?.grant).toBe('fresh-grant');
    expect(fixture.nativeElement.textContent).toContain('You signed in again with Google.');
  });
});
