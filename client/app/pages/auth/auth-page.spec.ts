import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';
import { PreferencesService } from '../../core/preferences.service';
import { API, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { AuthPage } from './auth-page';

describe('AuthPage', () => {
  const create = async (mode: 'signin' | 'signup') => {
    TestBed.configureTestingModule({
      providers: [...testProviders(), { provide: ActivatedRoute, useValue: { data: of({ mode }) } }]
    });
    localStorage.clear();
    const fixture = TestBed.createComponent(AuthPage);
    await fixture.whenStable();
    const page = fixture.componentInstance as unknown as Record<string, any>;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return { fixture, page, navigate };
  };

  afterEach(() => httpMock().verify());

  it('signs in and goes home', async () => {
    const { page, navigate } = await create('signin');
    page['email'].set('a@b.com');
    page['password'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'a@b.com' });
    await submitting;
    expect(TestBed.inject(AuthService).email()).toBe('a@b.com');
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('has the keep-me-signed-in box unticked, and sends its choice', async () => {
    const { fixture, page } = await create('signin');
    const box = fixture.nativeElement.querySelector('#keep') as HTMLInputElement;
    expect(box.checked).toBe(false);
    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['keep'].set(true);
    const submitting = page['submit']();
    const req = httpMock().expectOne(API + '/signin');
    expect(req.request.headers.get('X-Keep-Signed-In')).toBe('1');
    req.flush({ email: 'a@b.com' });
    await submitting;
  });

  it('says when the session ended before a recipe was saved, until the next sign-in', async () => {
    const { fixture, page } = await create('signin');
    const auth = TestBed.inject(AuthService);
    auth.lostRecipe.set('My celadon');
    await fixture.whenStable();
    expect(text(fixture, 'p.errors-section')).toBe(
      'You were signed out before your changes to "My celadon" were saved, so they were lost.'
    );
    page['email'].set('a@b.com');
    page['password'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'a@b.com' });
    await submitting;
    await fixture.whenStable();
    expect(auth.lostRecipe()).toBeNull();
    expect(fixture.nativeElement.querySelector('p.errors-section')).toBeNull();
  });

  it('shows why sign in failed and stays put', async () => {
    const { fixture, page, navigate } = await create('signin');
    page['email'].set('a@b.com');
    page['password'].set('nope');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin')
      .flush({ msg: 'incorrect password' }, { status: 401, statusText: 'Unauthorized' });
    await submitting;
    await fixture.whenStable();
    expect(text(fixture, '.errors-section')).toContain('incorrect password');
    expect(navigate).not.toHaveBeenCalled();
    expect(page['busy']()).toBe(false);
  });

  it('shows the confirmation box and creates accounts in sign up mode', async () => {
    const { fixture, page, navigate } = await create('signup');
    expect(fixture.nativeElement.querySelector('#confirmation')).not.toBeNull();
    expect(text(fixture, 'button[type=submit]')).toBe('Create account');

    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signup')
      .flush({ email: 'a@b.com' });
    await submitting;
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('says in a line on the sign up form what is kept and where, with a link to the privacy notice', async () => {
    const { fixture } = await create('signup');
    expect(text(fixture, '.privacy-note')).toContain('stored with Amazon Web Services in the US');
    expect(fixture.nativeElement.querySelector('.privacy-note a').getAttribute('href')).toBe('/privacy');
  });

  it('tells everyone outside the US, before the account is made, where accounts are kept and whose choice it is', async () => {
    const { fixture } = await create('signup');
    const preferences = TestBed.inject(PreferencesService);
    preferences.remember('region', 'TR');
    await fixture.whenStable();
    expect(text(fixture, 'form .data-notice')).toContain('accounts are kept on servers in the United States');
    expect(text(fixture, 'form .data-notice')).toContain('the project accepts no responsibility for it');
    expect(fixture.nativeElement.querySelector('.data-notice a').getAttribute('href')).toBe('/privacy#your-choice');
    preferences.remember('region', 'US');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.data-notice')).toBeNull();
  });

  it('shows the notice when no region is chosen and the browser names none', async () => {
    // The browser's region is read when the page first asks for one.
    const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en']);
    const { fixture } = await create('signup');
    expect(TestBed.inject(PreferencesService).region()).toBe('');
    expect(TestBed.inject(LocaleService).region()).toBe('');
    expect(fixture.nativeElement.querySelector('.data-notice')).not.toBeNull();
    languages.mockRestore();
  });

  it('will not submit a sign up whose passwords differ, and marks the field', async () => {
    const { fixture, page } = await create('signup');
    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password124');
    await fixture.whenStable();
    // The button stays usable; pressing it says what is wrong.
    expect((fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
    await page['submit']();
    await fixture.whenStable();
    httpMock().expectNone(API + '/signup');
    expect(fieldProblem(fixture, 'confirmation')).toBe('The two passwords do not match.');
    expect(fieldProblem(fixture, 'email')).toBe('');
    expect(document.activeElement?.id).toBe('confirmation');
  });

  it('marks every field with a problem, and the first takes the focus', async () => {
    const { fixture, page } = await create('signup');
    page['email'].set('not-an-email');
    page['password'].set('short');
    await page['submit']();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'email')).toBe('Enter an email address like name@example.com.');
    expect(fieldProblem(fixture, 'password')).toBe('Use at least 8 characters.');
    expect(fieldProblem(fixture, 'confirmation')).toBe('Enter the password again.');
    expect(document.activeElement?.id).toBe('email');
    // Fixed, the mark goes as it is typed.
    const email = fixture.nativeElement.querySelector('#email') as HTMLInputElement;
    email.value = 'a@b.com';
    email.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'email')).toBe('');
  });

  it("puts the server's answer about a field on that field", async () => {
    const { fixture, page } = await create('signup');
    page['email'].set('taken@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signup')
      .flush(
        { msg: 'An account with that email already exists.', field: 'email' },
        { status: 400, statusText: 'Bad Request' }
      );
    await submitting;
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'email')).toBe('An account with that email already exists.');
    expect(page['notices'].errors()).toEqual([]);
  });

  it('shows a fallback message when the server is unreachable', async () => {
    const { page } = await create('signup');
    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signup')
      .error(new ProgressEvent('error'));
    await submitting;
    expect(page['notices'].errors()).toEqual(['Error: could not create the account.']);
  });
});

describe('AuthPage hidden fields', () => {
  it('has no confirmation box in sign in mode', async () => {
    TestBed.configureTestingModule({
      providers: [...testProviders(), { provide: ActivatedRoute, useValue: { data: of({ mode: 'signin' }) } }]
    });
    const fixture = TestBed.createComponent(AuthPage);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('#confirmation')).toBeNull();
    expect(text(fixture, 'button[type=submit]')).toBe('Sign in');
    expect(fixture.nativeElement.querySelector('.privacy-note')).toBeNull();
    expect(fixture.nativeElement.querySelector('.data-notice')).toBeNull();
  });
});
