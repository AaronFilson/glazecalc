import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
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

  it('will not submit a sign up whose passwords differ', async () => {
    const { fixture, page } = await create('signup');
    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password124');
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    await page['submit']();
    httpMock().expectNone(API + '/signup');
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
