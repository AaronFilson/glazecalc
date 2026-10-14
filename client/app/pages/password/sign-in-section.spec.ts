import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MfaSummary } from '../../../../lib/mfa';
import { PASSKEYS, Passkeys } from '../auth/passkeys';
import { API, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { SignInSection, groupedKey } from './sign-in-section';

type FakePasskeys = { [K in keyof Passkeys]: ReturnType<typeof vi.fn> };

const ASSERTION = { id: 'cred', type: 'public-key' } as never;
const ATTESTATION = { id: 'new-cred', type: 'public-key' } as never;

const OFF: MfaSummary = { on: false, emailConfirmed: true, totp: null, passkeys: [], codesLeft: 0 };
const ON: MfaSummary = {
  on: true,
  emailConfirmed: true,
  totp: { addedAt: '2026-10-01T10:00:00Z', lastUsedAt: '2026-10-10T10:00:00Z' },
  passkeys: [{ id: 'pk1', name: 'Laptop', addedAt: '2026-10-02T10:00:00Z' }],
  codesLeft: 8
};
const CODES = ['abcde-12345', 'fghjk-67890'];

describe('SignInSection', () => {
  let passkeys: FakePasskeys;

  const create = async (summary: MfaSummary, supported = true) => {
    passkeys = {
      supported: vi.fn(() => supported),
      autofillSupported: vi.fn(async () => false),
      authenticate: vi.fn(async () => ASSERTION),
      register: vi.fn(async () => ATTESTATION),
      cancel: vi.fn()
    };
    TestBed.configureTestingModule({ providers: [...testProviders(), { provide: PASSKEYS, useValue: passkeys }] });
    const fixture = TestBed.createComponent(SignInSection);
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/mfa')
      .flush(summary);
    await settle(fixture);
    return fixture;
  };

  const button = (fixture: ComponentFixture<unknown>, label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (one) => one.textContent?.replace(/\s+/g, ' ').trim() === label
    ) as HTMLButtonElement | undefined;
  const press = async (fixture: ComponentFixture<unknown>, label: string) => {
    const found = button(fixture, label);
    if (!found) throw new Error('no button ' + label);
    found.click();
    await settle(fixture);
  };
  const type = async (fixture: ComponentFixture<unknown>, id: string, value: string) => {
    const field = (fixture.nativeElement as HTMLElement).querySelector('#' + id) as HTMLInputElement | null;
    if (!field) throw new Error('no field #' + id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  /** Answers the reload of the section after a change. */
  const reload = async (fixture: ComponentFixture<unknown>, summary: MfaSummary) => {
    httpMock()
      .expectOne(API + '/mfa')
      .flush(summary);
    await settle(fixture);
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => httpMock().verify());

  it('says it is off, and why it matters, with a way to turn it on', async () => {
    const fixture = await create(OFF);
    expect(text(fixture, 'h2')).toBe('Two-step sign-in');
    expect(text(fixture, '.mfa-status')).toContain('Two-step sign-in is off.');
    expect(button(fixture, 'Set up an authenticator app')).toBeDefined();
    expect(button(fixture, 'Add a passkey')).toBeDefined();
    // No codes or turning off while it is off.
    expect(text(fixture)).not.toContain('Recovery codes');
  });

  it('asks for a confirmed email before it can be turned on', async () => {
    const fixture = await create({ ...OFF, emailConfirmed: false });
    expect(text(fixture, '.needs-email')).toContain('Confirm your email first');
    expect(button(fixture, 'Set up an authenticator app')).toBeUndefined();
    expect(button(fixture, 'Add a passkey')).toBeUndefined();
  });

  it('sets up an authenticator app: the password, then the QR code and key, then a code; codes shown once', async () => {
    const fixture = await create(OFF);
    const opener = button(fixture, 'Set up an authenticator app')!;
    opener.focus();
    await press(fixture, 'Set up an authenticator app');
    // With two-step sign-in off, the password alone.
    expect(fixture.nativeElement.querySelector('#confirm-code')).toBeNull();
    expect(fixture.nativeElement.querySelector('fieldset')).toBeNull();
    expect(document.activeElement?.id).toBe('confirm-password');
    await type(fixture, 'confirm-password', 'my-password');
    await press(fixture, 'Continue');
    const start = httpMock().expectOne(API + '/mfa/totp/start');
    expect(start.request.method).toBe('POST');
    expect(start.request.body).toEqual({ password: 'my-password' });
    start.flush({
      secret: 'JBSWY3DPEHPK3PXPJBSWY3DP',
      uri: 'otpauth://totp/Glazecalc:a@b.com',
      qr: 'data:image/svg+xml;base64,PHN2Zz4='
    });
    await settle(fixture);

    const img = fixture.nativeElement.querySelector('img.totp-qr') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('data:image/svg+xml;base64,PHN2Zz4=');
    expect(img.getAttribute('alt')).toBe('QR code for adding Glazecalc to an authenticator app');
    expect(text(fixture, '.totp-key')).toBe('JBSW Y3DP EHPK 3PXP JBSW Y3DP');
    const code = fixture.nativeElement.querySelector('#totp-code') as HTMLInputElement;
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(code.getAttribute('inputmode')).toBe('numeric');
    expect(document.activeElement?.textContent?.trim()).toBe('Set up your authenticator app');

    await type(fixture, 'totp-code', '123456');
    await press(fixture, 'Finish setting up');
    const confirm = httpMock().expectOne(API + '/mfa/totp');
    expect(confirm.request.body).toEqual({ code: '123456' });
    confirm.flush({ code: 'totp-added', msg: 'Your authenticator app is set up.', recoveryCodes: CODES });
    await settle(fixture);
    await reload(fixture, { ...ON, passkeys: [], codesLeft: 10 });

    expect(text(fixture, '.server-msg')).toContain('Your authenticator app is set up.');
    const shown = [...fixture.nativeElement.querySelectorAll('ol.recovery-codes li')].map((li: Element) =>
      li.textContent?.trim()
    );
    expect(shown).toEqual(CODES);
    expect(document.activeElement?.textContent?.trim()).toBe('Your recovery codes');
    await press(fixture, 'I have saved them');
    expect(fixture.nativeElement.querySelector('ol.recovery-codes')).toBeNull();
    expect(text(fixture, '.mfa-status')).toContain('Two-step sign-in is on.');
  });

  it('marks a wrong password on its field, and keeps the change open', async () => {
    const fixture = await create(OFF);
    await press(fixture, 'Set up an authenticator app');
    await type(fixture, 'confirm-password', 'wrong');
    await press(fixture, 'Continue');
    httpMock()
      .expectOne(API + '/mfa/totp/start')
      .flush(
        { code: 'current-password-wrong', msg: 'Your current password is not correct.', field: 'password' },
        { status: 400, statusText: 'Bad Request' }
      );
    await settle(fixture);
    expect(fieldProblem(fixture, 'confirm-password')).toBe('Your current password is not correct.');
    expect(document.activeElement?.id).toBe('confirm-password');
  });

  it('says so when the email is not confirmed, as the server answers', async () => {
    const fixture = await create(OFF);
    await press(fixture, 'Add a passkey');
    await type(fixture, 'confirm-name', 'Laptop');
    await type(fixture, 'confirm-password', 'my-password');
    await press(fixture, 'Add a passkey');
    httpMock()
      .expectOne(API + '/mfa/passkeys/options')
      .flush(
        { code: 'mfa-needs-confirmed-email', msg: 'Please confirm your email before turning on two-step sign-in.' },
        { status: 400, statusText: 'Bad Request' }
      );
    await settle(fixture);
    expect(text(fixture, '.identity-confirm [role="alert"]')).toBe(
      'Please confirm your email before turning on two-step sign-in.'
    );
    expect(passkeys.register).not.toHaveBeenCalled();
  });

  it('adds a passkey with a name: the password, then the browser makes it', async () => {
    const fixture = await create(OFF);
    await press(fixture, 'Add a passkey');
    expect(document.activeElement?.id).toBe('confirm-name');
    await type(fixture, 'confirm-name', '  Laptop ');
    await type(fixture, 'confirm-password', 'my-password');
    await press(fixture, 'Add a passkey');
    const options = httpMock().expectOne(API + '/mfa/passkeys/options');
    expect(options.request.body).toEqual({ password: 'my-password' });
    options.flush({ options: { challenge: 'new' } });
    await settle(fixture);
    expect(passkeys.register).toHaveBeenCalledWith({ challenge: 'new' });
    const add = httpMock().expectOne(API + '/mfa/passkeys');
    expect(add.request.body).toEqual({ response: ATTESTATION, name: 'Laptop' });
    add.flush({ code: 'passkey-added', msg: 'The passkey was added.', recoveryCodes: CODES });
    await settle(fixture);
    await reload(fixture, { ...OFF, on: true, passkeys: [{ id: 'pk1', name: 'Laptop', addedAt: '2026-10-14' }] });
    expect(fixture.nativeElement.querySelectorAll('ol.recovery-codes li').length).toBe(2);
  });

  it('asks for a second step as well as the password once it is on, and removes a passkey with them', async () => {
    const fixture = await create(ON);
    await press(fixture, 'Remove Laptop');
    expect(text(fixture, '.change-panel')).toContain('To remove the passkey "Laptop", confirm it is you.');
    // The authenticator app is offered first.
    const code = fixture.nativeElement.querySelector('#confirm-code') as HTMLInputElement;
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(text(fixture, 'legend')).toBe('And your second step');
    await type(fixture, 'confirm-password', 'my-password');
    await type(fixture, 'confirm-code', '654 321');
    await press(fixture, 'Remove the passkey');
    const remove = httpMock().expectOne(API + '/mfa/passkeys/pk1');
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.body).toEqual({ password: 'my-password', code: '654321' });
    remove.flush({ code: 'passkey-removed', msg: 'The passkey was removed.' });
    await settle(fixture);
    await reload(fixture, { ...ON, passkeys: [] });
    expect(text(fixture, '.server-msg')).toContain('The passkey was removed.');
    expect(fixture.nativeElement.querySelector('.change-panel')).toBeNull();
    expect(document.activeElement?.id).toBe('mfa-heading');
  });

  it('will not send a change with the password alone once it is on', async () => {
    const fixture = await create(ON);
    await press(fixture, 'Make new recovery codes');
    await type(fixture, 'confirm-password', 'my-password');
    await press(fixture, 'Make new recovery codes');
    httpMock().expectNone(API + '/mfa/recovery-codes');
    expect(fieldProblem(fixture, 'confirm-code')).toBe('Enter the 6-digit code from your authenticator app.');
  });

  it('marks a wrong code on the code field', async () => {
    const fixture = await create(ON);
    await press(fixture, 'Remove the authenticator app');
    await type(fixture, 'confirm-password', 'my-password');
    await type(fixture, 'confirm-code', '000000');
    await press(fixture, 'Remove the authenticator app');
    httpMock()
      .expectOne(API + '/mfa/totp')
      .flush(
        { code: 'code-wrong', msg: 'That code is not correct.', field: 'code' },
        { status: 400, statusText: 'Bad' }
      );
    await settle(fixture);
    expect(fieldProblem(fixture, 'confirm-code')).toBe('That code is not correct.');
  });

  it('confirms with a passkey, from a challenge of its own, or with a recovery code', async () => {
    const fixture = await create(ON);
    await press(fixture, 'Make new recovery codes');
    await press(fixture, 'Use a passkey instead');
    expect(fixture.nativeElement.querySelector('#confirm-code')).toBeNull();
    await type(fixture, 'confirm-password', 'my-password');
    await press(fixture, 'Make new recovery codes');
    httpMock()
      .expectOne(API + '/mfa/confirm/options')
      .flush({ options: { challenge: 'confirm' } });
    await settle(fixture);
    expect(passkeys.authenticate).toHaveBeenCalledWith({ challenge: 'confirm' });
    const make = httpMock().expectOne(API + '/mfa/recovery-codes');
    expect(make.request.body).toEqual({ password: 'my-password', passkey: ASSERTION });
    make.flush({ code: 'recovery-codes-made', msg: 'New recovery codes are ready.', recoveryCodes: CODES });
    await settle(fixture);
    await reload(fixture, { ...ON, codesLeft: 10 });
    await press(fixture, 'I have saved them');

    await press(fixture, 'Remove the authenticator app');
    await press(fixture, 'Use a recovery code instead');
    expect(document.activeElement?.id).toBe('confirm-recovery');
    await type(fixture, 'confirm-password', 'my-password');
    await type(fixture, 'confirm-recovery', 'abcde-12345');
    await press(fixture, 'Remove the authenticator app');
    const remove = httpMock().expectOne(API + '/mfa/totp');
    expect(remove.request.body).toEqual({ password: 'my-password', recoveryCode: 'abcde-12345' });
    remove.flush({ code: 'totp-removed', msg: 'The authenticator app was removed.' });
    await settle(fixture);
    await reload(fixture, { ...ON, totp: null });
  });

  it('says when removing the last second step turns it off', async () => {
    const fixture = await create({ ...ON, passkeys: [] });
    await press(fixture, 'Remove the authenticator app');
    expect(text(fixture, '.last-factor')).toContain('two-step sign-in turns off');
  });

  it('gives the focus back to the button when a change is cancelled', async () => {
    const fixture = await create(ON);
    const opener = button(fixture, 'Make new recovery codes')!;
    opener.focus();
    await press(fixture, 'Make new recovery codes');
    await press(fixture, 'Cancel');
    expect(fixture.nativeElement.querySelector('.change-panel')).toBeNull();
    expect(document.activeElement?.textContent?.trim()).toBe('Make new recovery codes');
  });

  it('renames a passkey without the password', async () => {
    const fixture = await create(ON);
    await press(fixture, 'Rename Laptop');
    expect(document.activeElement?.id).toBe('rename-passkey');
    await type(fixture, 'rename-passkey', 'Work laptop');
    await press(fixture, 'Save the name');
    const rename = httpMock().expectOne(API + '/mfa/passkeys/pk1');
    expect(rename.request.method).toBe('PATCH');
    expect(rename.request.body).toEqual({ name: 'Work laptop' });
    rename.flush({ code: 'passkey-renamed', msg: 'The passkey was renamed.' });
    await settle(fixture);
    await reload(fixture, { ...ON, passkeys: [{ ...ON.passkeys[0]!, name: 'Work laptop' }] });
    expect(text(fixture, '.passkey-name')).toBe('Work laptop');
  });

  it('lists passkeys with their dates, and stops adding at the limit', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: 'pk' + i, name: 'Key ' + i, addedAt: '2026-10-02' }));
    const fixture = await create({ ...ON, passkeys: many });
    expect(fixture.nativeElement.querySelectorAll('.passkey-list > li').length).toBe(10);
    expect(text(fixture, '.passkey-list > li')).toContain('Not used yet.');
    expect(button(fixture, 'Add a passkey')).toBeUndefined();
    expect(text(fixture, '.passkey-limit')).toContain('You have 10 passkeys');
  });

  it('warns when few recovery codes are left', async () => {
    const fixture = await create({ ...ON, codesLeft: 2 });
    expect(text(fixture)).toContain('2 recovery codes of 10 left.');
    expect(text(fixture, '.codes-low')).toContain('Make new codes soon.');
  });

  it('says where the browser cannot use passkeys, and offers none', async () => {
    const fixture = await create(OFF, false);
    expect(text(fixture, '.no-passkeys')).toContain('This browser cannot make or use passkeys.');
    expect(button(fixture, 'Add a passkey')).toBeUndefined();
  });

  it('says so when it cannot load', async () => {
    TestBed.configureTestingModule({ providers: testProviders() });
    const fixture = TestBed.createComponent(SignInSection);
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/mfa')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.help-text')).toBe('Could not load your two-step sign-in. Please reload the page.');
  });
});

describe('groupedKey', () => {
  it('groups a key in fours, as people read and type it', () => {
    expect(groupedKey('ABCDEFGHIJ')).toBe('ABCD EFGH IJ');
  });
});
