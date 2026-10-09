import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { formatLocale, typedDecimalMark } from './format';
import { NumberInput } from './number-input';

@Component({
  imports: [NumberInput],
  template: `<input type="text" [gcNumber]="amount()" (gcNumberChange)="amount.set($event)" />`
})
class Host {
  readonly amount = signal<string>('12.5');
}

describe('NumberInput', () => {
  afterEach(() => {
    formatLocale.set('en');
    typedDecimalMark.set('either');
  });

  const create = async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const type = async (text: string) => {
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { fixture, input, type };
  };

  it("shows a saved amount the reader's way, and saves what is typed plainly", async () => {
    formatLocale.set('de-DE');
    const { fixture, input, type } = await create();
    expect(input.value).toBe('12,5');
    await type('1.234,5');
    expect(fixture.componentInstance.amount()).toBe('1234.5');
    // What is being typed stays as typed until the box is left.
    expect(input.value).toBe('1.234,5');
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('1234,5');
    // Text that is not a number goes through as typed, for the field's check.
    await type('12,5,3');
    expect(fixture.componentInstance.amount()).toBe('12,5,3');
  });

  it('follows the decimal mark chosen, and a change made elsewhere', async () => {
    typedDecimalMark.set('point');
    formatLocale.set('de-DE');
    const { fixture, input, type } = await create();
    expect(input.value).toBe('12.5');
    await type('12,5');
    expect(fixture.componentInstance.amount()).toBe('12,5');
    input.blur();
    fixture.componentInstance.amount.set('20.25');
    await fixture.whenStable();
    expect(input.value).toBe('20.25');
  });
});
