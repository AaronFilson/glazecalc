import { Directive, ElementRef, effect, inject, input, output } from '@angular/core';
import { forTyping, formatLocale, toPlain, typedDecimalMark } from './format';

/**
 * A number typed the reader's way (docs/i18n-plan.md): the box shows "12,5"
 * or "12.5" as Settings say, and the value saved is plain ("12.5"). While the
 * box has the focus it shows what was typed; on leaving it, the number is
 * written back as it was read, so the reader sees how it was understood.
 * Text that is not a number passes through as typed, for the field's check.
 *
 *   <input type="text" inputmode="decimal" [gcNumber]="line.amount" (gcNumberChange)="setAmount(i, $event)" />
 */
@Directive({
  selector: 'input[gcNumber]',
  host: { '(input)': 'typed()', '(blur)': 'echo()' }
})
export class NumberInput {
  /** The saved value: a plain number as text, or text that is not one. */
  readonly gcNumber = input<string | number | null | undefined>('');
  readonly gcNumberChange = output<string>();
  private readonly element: HTMLInputElement = inject(ElementRef).nativeElement;

  constructor() {
    effect(() => {
      const plain = String(this.gcNumber() ?? '');
      const mark = typedDecimalMark();
      const locale = formatLocale();
      // What is being typed is the reader's until they leave the box.
      if (document.activeElement === this.element && toPlain(this.element.value, mark, locale) === plain) return;
      this.element.value = forTyping(plain, mark, locale);
    });
  }

  protected typed(): void {
    this.gcNumberChange.emit(toPlain(this.element.value));
  }

  protected echo(): void {
    this.element.value = forTyping(toPlain(this.element.value));
  }
}
