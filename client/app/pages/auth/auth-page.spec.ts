import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
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
  });
});
