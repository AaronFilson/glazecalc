import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { SecondStepResponse } from '../../../../lib/mfa';
import { AuthService } from '../../core/auth.service';
import { API, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { PASSKEYS, Passkeys } from './passkeys';
import { SecondStep } from './second-step';

const PASSKEY_RESPONSE = { id: 'cred', rawId: 'cred', type: 'public-key' } as never;

type FakePasskeys = { [K in keyof Passkeys]: ReturnType<typeof vi.fn> };

function fakePasskeys(supported = true): FakePasskeys {
  return {
    supported: vi.fn(() => supported),
    autofillSupported: vi.fn(async () => false),
    authenticate: vi.fn(async () => PASSKEY_RESPONSE),
    register: vi.fn(async () => PASSKEY_RESPONSE),
    cancel: vi.fn()
  };
}

const step = (methods: Partial<SecondStepResponse['methods']> = {}, passkeyOptions = false): SecondStepResponse => ({
  code: 'second-step',
  msg: 'This account uses two-step sign-in.',
  methods: { totp: true, passkey: false, recovery: true, ...methods },
  pending: 'pending-token',
  expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  ...(passkeyOptions ? { passkeyOptions: { challenge: 'abc' } as never } : {})
});

describe('SecondStep', () => {
  let passkeys: FakePasskeys;

  const create = async (response = step(), supported = true) => {
    passkeys = fakePasskeys(supported);
    TestBed.configureTestingModule({ providers: [...testProviders(), { provide: PASSKEYS, useValue: passkeys }] });
    const fixture = TestBed.createComponent(SecondStep);
    fixture.componentRef.setInput('step', response);
    const signedIn = vi.fn();
    const startOver = vi.fn();
    fixture.componentInstance.signedIn.subscribe(signedIn);
    fixture.componentInstance.startOver.subscribe(startOver);
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    return { fixture, signedIn, startOver };
  };

  const type = async (fixture: ComponentFixture<SecondStep>, id: string, value: string) => {
    const field = fixture.nativeElement.querySelector('#' + id) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const button = (fixture: ComponentFixture<SecondStep>, label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (one) => one.textContent?.trim() === label
    ) as HTMLButtonElement;

  beforeEach(() => localStorage.clear());
  afterEach(() => httpMock().verify());

  it('asks for the code in a labelled field that phones fill in, and takes the focus there', async () => {
    const { fixture } = await create();
    const field = fixture.nativeElement.querySelector('#second-code') as HTMLInputElement;
    expect(text(fixture, 'label[for="second-code"]')).toBe('Code from your authenticator app');
    expect(field.getAttribute('autocomplete')).toBe('one-time-code');
    expect(field.getAttribute('inputmode')).toBe('numeric');
    expect(document.activeElement).toBe(field);
    expect(text(fixture)).toContain('If you leave or reload this page, you will need to enter your password again.');
    fixture.nativeElement.remove();
  });

  it('finishes signing in with the code, sending the pending token and no keep-signed-in header', async () => {
    const { fixture, signedIn } = await create();
    await type(fixture, 'second-code', '123 456');
    button(fixture, 'Finish signing in').click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/signin/second-step');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pending: 'pending-token', code: '123456' });
    expect(req.request.headers.has('X-Keep-Signed-In')).toBe(false);
    req.flush({ code: 'signed-in', msg: 'Signed in.', email: 'a@b.com', kept: 2 });
    await settle(fixture);
    expect(signedIn).toHaveBeenCalledWith(2);
    expect(TestBed.inject(AuthService).email()).toBe('a@b.com');
    fixture.nativeElement.remove();
  });

  it('says what a code needs before sending one', async () => {
    const { fixture } = await create();
    await type(fixture, 'second-code', '12');
    button(fixture, 'Finish signing in').click();
    await settle(fixture);
    httpMock().expectNone(API + '/signin/second-step');
    expect(fieldProblem(fixture, 'second-code')).toBe('Enter the 6-digit code from your authenticator app.');
    fixture.nativeElement.remove();
  });

  it('marks a wrong code on its field, and lets the person try again', async () => {
    const { fixture, startOver } = await create();
    await type(fixture, 'second-code', '000000');
    button(fixture, 'Finish signing in').click();
    await settle(fixture);
    httpMock()
      .expectOne(API + '/signin/second-step')
      .flush(
        { code: 'code-wrong', msg: 'That code is not correct.', field: 'code' },
        { status: 400, statusText: 'Bad Request' }
      );
    await settle(fixture);
    expect(fieldProblem(fixture, 'second-code')).toBe('That code is not correct.');
    expect(startOver).not.toHaveBeenCalled();
    fixture.nativeElement.remove();
  });

  for (const code of ['second-step-expired', 'second-step-tries']) {
    it(`goes back to the password, saying why, on ${code}`, async () => {
      const { fixture, startOver } = await create();
      await type(fixture, 'second-code', '000000');
      button(fixture, 'Finish signing in').click();
      await settle(fixture);
      httpMock()
        .expectOne(API + '/signin/second-step')
        .flush({ code, msg: 'Please enter your password again.' }, { status: 401, statusText: 'Unauthorized' });
      await settle(fixture);
      expect(startOver).toHaveBeenCalledWith('Please enter your password again.');
      fixture.nativeElement.remove();
    });
  }

  it('takes a recovery code instead', async () => {
    const { fixture, signedIn } = await create();
    button(fixture, 'Use a recovery code instead').click();
    await settle(fixture);
    const field = fixture.nativeElement.querySelector('#second-recovery') as HTMLInputElement;
    expect(document.activeElement).toBe(field);
    expect(fixture.nativeElement.querySelector('#second-code')).toBeNull();
    await type(fixture, 'second-recovery', ' ABCDE-12345 ');
    button(fixture, 'Finish signing in').click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/signin/second-step');
    expect(req.request.body).toEqual({ pending: 'pending-token', recoveryCode: 'ABCDE-12345' });
    req.flush({ code: 'signed-in', msg: 'Signed in.', email: 'a@b.com', kept: 0 });
    await settle(fixture);
    expect(signedIn).toHaveBeenCalledWith(0);
    fixture.nativeElement.remove();
  });

  it('signs in with a passkey when the account has one, with the challenge from the password step', async () => {
    const { fixture, signedIn } = await create(step({ totp: false, passkey: true }, true));
    // No app: the passkey is the way offered first, and has the focus.
    expect(fixture.nativeElement.querySelector('#second-code')).toBeNull();
    expect(document.activeElement).toBe(button(fixture, 'Use a passkey'));
    button(fixture, 'Use a passkey').click();
    await settle(fixture);
    expect(passkeys.authenticate).toHaveBeenCalledWith({ challenge: 'abc' });
    const req = httpMock().expectOne(API + '/signin/second-step');
    expect(req.request.body).toEqual({ pending: 'pending-token', passkey: PASSKEY_RESPONSE });
    req.flush({ code: 'signed-in', msg: 'Signed in.', email: 'a@b.com', kept: 0 });
    await settle(fixture);
    expect(signedIn).toHaveBeenCalled();
    fixture.nativeElement.remove();
  });

  it('says so when the passkey prompt is closed, and sends nothing', async () => {
    const { fixture } = await create(step({ passkey: true }, true));
    passkeys.authenticate.mockRejectedValueOnce(Object.assign(new Error('closed'), { name: 'NotAllowedError' }));
    button(fixture, 'Use a passkey').click();
    await settle(fixture);
    httpMock().expectNone(API + '/signin/second-step');
    expect(text(fixture, '[role="alert"]')).toBe('The passkey was not used. Please try again when you are ready.');
    fixture.nativeElement.remove();
  });

  it('offers no passkey button where the browser has none, and says so', async () => {
    const { fixture } = await create(step({ totp: false, passkey: true }, true), false);
    expect(button(fixture, 'Use a passkey')).toBeUndefined();
    expect(text(fixture, '.no-passkeys')).toContain('This browser cannot use passkeys.');
    // Recovery codes are still there.
    expect(fixture.nativeElement.querySelector('#second-recovery')).not.toBeNull();
    fixture.nativeElement.remove();
  });

  it('starts over when asked', async () => {
    const { fixture, startOver } = await create();
    button(fixture, 'Start over').click();
    expect(startOver).toHaveBeenCalledWith(null);
    fixture.nativeElement.remove();
  });
});
