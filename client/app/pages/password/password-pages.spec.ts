import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { AccountPage } from './account-page';
import { ForgotPage } from './forgot-page';
import { ResetPage } from './reset-page';

type Page = Record<string, any>;

describe('ForgotPage', () => {
  const create = async () => {
    TestBed.configureTestingModule({ providers: testProviders() });
    const fixture = TestBed.createComponent(ForgotPage);
    await fixture.whenStable();
    return { fixture, page: fixture.componentInstance as unknown as Page };
  };
  afterEach(() => httpMock().verify());

  it('asks for the email and shows the server answer in place of the form', async () => {
    const { fixture, page } = await create();
    page['email'].set('a@b.com');
    const submitting = page['submit']();
    const req = httpMock().expectOne(API + '/password/forgot');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com' });
    req.flush({ msg: 'If an account uses that email, we have sent it a link.' });
    await submitting;
    await fixture.whenStable();
    expect(text(fixture, '.sent-text')).toBe('If an account uses that email, we have sent it a link.');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('shows why a request failed and keeps the form', async () => {
    const { fixture, page } = await create();
    page['email'].set('a@b.com');
    const submitting = page['submit']();
    httpMock().expectOne(API + '/password/forgot')
      .flush({ msg: 'Password reset by email is not available yet.' }, { status: 503, statusText: 'Unavailable' });
    await submitting;
    await fixture.whenStable();
    expect(text(fixture, '.errors-section')).toContain('Password reset by email is not available yet.');
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    expect(page['busy']()).toBe(false);
  });
});

describe('ResetPage', () => {
  const create = async (token: string | null) => {
    const replaceState = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } },
        { provide: Location, useValue: { replaceState } }
      ]
    });
    const fixture = TestBed.createComponent(ResetPage);
    await fixture.whenStable();
    return { fixture, page: fixture.componentInstance as unknown as Page, replaceState };
  };
  afterEach(() => httpMock().verify());

  it('takes the token out of the address bar and spends it only on submit', async () => {
    const { fixture, page, replaceState } = await create('tok123');
    expect(replaceState).toHaveBeenCalledWith('/reset');
    httpMock().expectNone(API + '/password/reset');

    page['password'].set('new-password');
    page['confirmation'].set('new-password');
    const submitting = page['submit']();
    const req = httpMock().expectOne(API + '/password/reset');
    expect(req.request.body).toEqual({ token: 'tok123', password: 'new-password' });
    req.flush({ msg: 'Your password has been changed. Please sign in with your new password.' });
    await submitting;
    await fixture.whenStable();
    expect(text(fixture, '.done-text')).toContain('Your password has been changed.');
    expect(fixture.nativeElement.querySelector('a[href="/signin"], a[href="#/signin"]')).not.toBeNull();
  });

  it('will not submit passwords that differ', async () => {
    const { fixture, page } = await create('tok123');
    page['password'].set('new-password');
    page['confirmation'].set('new-passwor');
    await fixture.whenStable();
    expect(text(fixture)).toContain('The two passwords do not match.');
    expect((fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    await page['submit']();
    httpMock().expectNone(API + '/password/reset');
  });

  it('shows an expired link and lets the user try again', async () => {
    const { fixture, page } = await create('old');
    page['password'].set('new-password');
    page['confirmation'].set('new-password');
    const submitting = page['submit']();
    httpMock().expectOne(API + '/password/reset')
      .flush({ msg: 'This reset link is not valid or has expired. Please ask for a new one.' }, { status: 400, statusText: 'Bad Request' });
    await submitting;
    await fixture.whenStable();
    expect(text(fixture, '.errors-section')).toContain('not valid or has expired');
    expect(page['done']()).toBeNull();
  });

  it('explains a link without a token', async () => {
    const { fixture, replaceState } = await create(null);
    expect(replaceState).not.toHaveBeenCalled();
    expect(text(fixture, '.help-text')).toContain('this one is incomplete');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});

describe('AccountPage', () => {
  const create = async (token: string | null) => {
    localStorage.clear();
    if (token) localStorage.setItem('token', token);
    TestBed.configureTestingModule({ providers: testProviders() });
    const fixture = TestBed.createComponent(AccountPage);
    await fixture.whenStable();
    return { fixture, page: fixture.componentInstance as unknown as Page };
  };
  afterEach(() => httpMock().verify());

  it('changes the password and keeps this device signed in with the new token', async () => {
    const { fixture, page } = await create('old-token');
    page['current'].set('old-password');
    page['password'].set('new-password');
    page['confirmation'].set('new-password');
    const submitting = page['submit']();
    const req = httpMock().expectOne(API + '/password');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('token')).toBe('old-token');
    expect(req.request.body).toEqual({ current: 'old-password', password: 'new-password' });
    req.flush({ msg: 'Your password has been changed.', token: 'new-token', email: 'a@b.com' });
    await submitting;
    await fixture.whenStable();

    const auth = TestBed.inject(AuthService);
    expect(auth.token()).toBe('new-token');
    expect(auth.email()).toBe('a@b.com');
    expect(text(fixture, '.server-msg')).toContain('Your password has been changed.');
    expect(page['current']()).toBe('');
  });

  it('shows a wrong current password without signing out', async () => {
    const { fixture, page } = await create('tok');
    page['current'].set('nope');
    page['password'].set('new-password');
    page['confirmation'].set('new-password');
    const submitting = page['submit']();
    httpMock().expectOne(API + '/password')
      .flush({ msg: 'Your current password is not correct.' }, { status: 400, statusText: 'Bad Request' });
    await submitting;
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('Your current password is not correct.');
    expect(TestBed.inject(AuthService).token()).toBe('tok');
  });

  it('asks signed-out visitors to sign in', async () => {
    const { fixture } = await create(null);
    expect(text(fixture, '.help-text')).toContain('sign in to change your password');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
