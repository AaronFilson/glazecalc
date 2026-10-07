import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fieldProblem } from '../testing/test-providers';
import {
  FieldCheck,
  FieldChecks,
  emailAddress,
  filled,
  newPassword,
  numberCheck,
  required,
  samePassword
} from './field-checks';

@Component({
  imports: [FieldCheck],
  template: `
    <input id="email" aria-describedby="email-help" [gcField]="checks" gcFieldName="email" (input)="typed($event)" />
    <p id="email-help">We never share it.</p>
    @if (showCode()) {
      <input id="code" [gcField]="checks" gcFieldName="code" />
    }
    <select id="kind" [gcField]="checks" gcFieldName="kinds">
      <option value="a">A</option>
    </select>
  `
})
class TestForm {
  readonly email = signal('');
  readonly showCode = signal(true);
  readonly kinds = signal<string[]>([]);
  readonly checks = new FieldChecks(
    () => ({
      email: emailAddress(this.email),
      code: required(() => (document.getElementById('code') as HTMLInputElement | null)?.value, 'Enter the code.'),
      kinds: () => (this.kinds().length ? null : 'Add a kind.')
    }),
    { sendOnly: ['kinds'] }
  );
  typed(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }
}

@Component({
  imports: [FieldCheck],
  template: `
    <input id="password" [gcField]="checks" gcFieldName="password" (input)="password.set($any($event.target).value)" />
    <input
      id="confirmation"
      [gcField]="checks"
      gcFieldName="confirmation"
      (input)="confirmation.set($any($event.target).value)"
    />
  `
})
class PasswordForm {
  readonly password = signal('');
  readonly confirmation = signal('');
  readonly checks = new FieldChecks(() => ({
    password: newPassword(this.password),
    confirmation: samePassword(this.confirmation, this.password)
  }));
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('FieldChecks', () => {
  const create = async () => {
    const fixture = TestBed.createComponent(TestForm);
    await fixture.whenStable();
    const form = fixture.componentInstance;
    const input = (id: string) => fixture.nativeElement.querySelector('#' + id) as HTMLInputElement;
    const type = async (id: string, value: string) => {
      input(id).value = value;
      input(id).dispatchEvent(new Event('input'));
      await Promise.resolve();
      await fixture.whenStable();
    };
    const leave = async (id: string) => {
      input(id).dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    };
    return { fixture, form, input, type, leave };
  };

  it('marks a field left with a wrong value, keeping its own description, and clears it once fixed', async () => {
    const { fixture, input, type, leave } = await create();
    // Passing an empty field by is not a mistake.
    await leave('email');
    expect(fieldProblem(fixture, 'email')).toBe('');

    await type('email', 'potter');
    expect(fieldProblem(fixture, 'email')).toBe('');
    await leave('email');
    expect(fieldProblem(fixture, 'email')).toBe('Enter an email address like name@example.com.');
    expect(input('email').classList).toContain('is-invalid');
    expect(input('email').getAttribute('aria-describedby')).toBe('email-help email-problem');
    expect(input('email').nextElementSibling?.id).toBe('email-problem');

    await type('email', 'potter@clay.org');
    expect(fieldProblem(fixture, 'email')).toBe('');
    expect(input('email').getAttribute('aria-describedby')).toBe('email-help');
    expect(document.getElementById('email-problem')).toBeNull();
  });

  it('checks every field when the form is sent, and the focus goes to the first problem', async () => {
    const { fixture, form } = await create();
    expect(form.checks.validate()).toBe(false);
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'email')).toBe('Enter your email address.');
    expect(fieldProblem(fixture, 'code')).toBe('Enter the code.');
    expect(fieldProblem(fixture, 'kind')).toBe('Add a kind.');
    expect(document.activeElement?.id).toBe('email');
    expect(form.checks.any()).toBe(true);
  });

  it('tells screen readers what is wrong, even when the focus does not move', async () => {
    const { form } = await create();
    form.checks.validate();
    await wait(150);
    const region = document.getElementById('field-announcer');
    expect(region?.getAttribute('role')).toBe('status');
    expect(region?.textContent).toBe('3 fields need attention. The first: Enter your email address.');
    form.checks.report('email', 'That email is already in use');
    await wait(150);
    expect(region?.textContent).toBe('That email is already in use');
  });

  it('clears "do not match" on the confirmation when the password is the one fixed', async () => {
    const fixture = TestBed.createComponent(PasswordForm);
    await fixture.whenStable();
    const form = fixture.componentInstance;
    form.password.set('password12');
    form.confirmation.set('password123');
    form.checks.validate();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'confirmation')).toBe('The two passwords do not match.');
    const password = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    password.value = 'password123';
    password.dispatchEvent(new Event('input'));
    await Promise.resolve();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'confirmation')).toBe('');
  });

  it('checks a send-only field only when the form is sent, or once it is marked', async () => {
    const { fixture, form, leave } = await create();
    await leave('kind');
    expect(fieldProblem(fixture, 'kind')).toBe('');
    form.checks.validate();
    form.kinds.set(['a']);
    form.checks.recheck('kinds');
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'kind')).toBe('');
  });

  it("puts the server's answer on the field it names, under the form's name for it", async () => {
    const { fixture, form } = await create();
    const answer = (field: string) =>
      new HttpErrorResponse({ status: 400, error: { msg: 'That email is already in use', field } });
    expect(form.checks.reportServer(answer('address'), { address: 'email' })).toBe(true);
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'email')).toBe('That email is already in use');
    expect(document.activeElement?.id).toBe('email');
    // A field this form does not have, or no field: the page says it some other way.
    expect(form.checks.reportServer(answer('password'))).toBe(false);
    expect(form.checks.reportServer(new HttpErrorResponse({ status: 500, error: { msg: 'Down' } }))).toBe(false);
    expect(form.checks.reportServer(new Error('offline'))).toBe(false);
  });

  it('takes the message away with a field that leaves the page', async () => {
    const { fixture, form } = await create();
    form.checks.validate();
    await fixture.whenStable();
    expect(document.getElementById('code-problem')).not.toBeNull();
    form.showCode.set(false);
    await fixture.whenStable();
    expect(document.getElementById('code-problem')).toBeNull();
  });
});

describe('field checks', () => {
  const value = (v: string) => () => v;

  it('need a value, a likely email, and a new password of 8 characters typed twice', () => {
    expect(required(value('  '), 'Enter it.')()).toBe('Enter it.');
    expect(required(value('x'), 'Enter it.')()).toBeNull();
    // A password of spaces is still a password, as the server sees it.
    expect(filled(value('        '), 'Enter your password.')()).toBeNull();
    expect(filled(value(''), 'Enter your password.')()).toBe('Enter your password.');
    expect(emailAddress(value('a@b'))()).toBe('Enter an email address like name@example.com.');
    expect(emailAddress(value(' a@b.co '))()).toBeNull();
    expect(newPassword(value(''))()).toBe('Choose a password of at least 8 characters.');
    expect(newPassword(value('1234567'))()).toBe('Use at least 8 characters.');
    expect(newPassword(value('12345678'))()).toBeNull();
    expect(samePassword(value(''), value('12345678'))()).toBe('Enter the password again.');
    expect(samePassword(value('1234567x'), value('12345678'))()).toBe('The two passwords do not match.');
    expect(samePassword(value('12345678'), value('12345678'))()).toBeNull();
  });

  it('take a number in its range, or nothing', () => {
    const loi = (v: string) => numberCheck(value(v), 'Bad LOI.', { below: 100 })();
    expect(['', '0', '12.5', '99.99'].map(loi)).toEqual([null, null, null, null]);
    expect(['100', '-1', '12,5', 'abc'].map(loi)).toEqual(['Bad LOI.', 'Bad LOI.', 'Bad LOI.', 'Bad LOI.']);
  });
});
