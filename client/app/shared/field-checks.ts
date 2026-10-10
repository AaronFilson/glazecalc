import { HttpErrorResponse } from '@angular/common/http';
import {
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  Renderer2,
  computed,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import { translate } from '@jsverse/transloco';
import { errorMessage } from '../core/error-message';
import { plainNumber } from './format';

/** What is wrong with a field's value, or null when it is fine. */
export type Check = () => string | null;

/**
 * The problems with a form's fields, shown on the fields themselves (WCAG 3.3.1
 * and 3.3.3): a field with a problem is outlined and marked aria-invalid, with
 * what is wrong under it, tied to it by aria-describedby (see FieldCheck).
 *
 * A field is checked when it loses the focus with something in it, and every
 * field when the form is sent; an empty field is not marked just for being
 * passed by. A field marked wrong is checked again as it changes, so the mark
 * goes as soon as it is fixed.
 *
 * The checks are read each time, so a form whose fields come and go (an oxide
 * list) can give them as they are: `new FieldChecks(() => ({ name: ..., ... }))`.
 * The order they are given in is the order the focus looks for the first problem.
 * A check about something other than the field's own value (at least one oxide
 * in the list, marked on the oxide picker) runs only when the form is sent: name
 * it in `sendOnly`.
 */
export class FieldChecks {
  private readonly problems = signal<Readonly<Record<string, string>>>({});
  private readonly elements = new Map<string, HTMLElement>();

  private readonly sendOnly: ReadonlySet<string>;

  constructor(
    private readonly checks: () => Record<string, Check>,
    { sendOnly = [] }: { sendOnly?: string[] } = {}
  ) {
    this.sendOnly = new Set(sendOnly);
  }

  /** What is wrong with the field, or ''. */
  problem(field: string): string {
    return this.problems()[field] ?? '';
  }

  /** Whether any field is marked. */
  readonly any = computed(() => Object.keys(this.problems()).length > 0);

  /** Checks one field (one checked only when the form is sent, only if it is marked). */
  check(field: string): void {
    if (this.sendOnly.has(field) && !this.problem(field)) return;
    this.mark(field, this.checks()[field]?.() ?? '');
  }

  /** Checks a field again if it is marked, as it changes. */
  recheck(field: string): void {
    if (this.problem(field)) this.check(field);
  }

  /** Checks again every field that is marked: fixing the password fixes "do not match" on its confirmation. */
  recheckMarked(): void {
    for (const field of Object.keys(this.problems())) this.check(field);
  }

  /**
   * Checks every field, marks each one with a problem and moves the focus to
   * the first. True when there are none.
   */
  validate(): boolean {
    const found: Record<string, string> = {};
    for (const [field, check] of Object.entries(this.checks())) {
      const problem = check();
      if (problem) found[field] = problem;
    }
    this.problems.set(found);
    const fields = Object.keys(found);
    if (!fields.length) return true;
    this.focus(fields[0]);
    // The focus may already be on the field (Enter in it), so screen readers are told too.
    announce(
      fields.length === 1
        ? found[fields[0]]
        : translate('fieldChecks.several', { count: fields.length, first: found[fields[0]] })
    );
    return false;
  }

  /** Marks a field with a problem found elsewhere, such as by the server, and moves the focus to it. */
  report(field: string, problem: string): void {
    this.mark(field, problem);
    this.focus(field);
    announce(problem);
  }

  /**
   * Marks the field a failed request was about, if the server named one this
   * form has (`fields` maps the server's names to the form's), with the
   * server's message in the reader's language. True if it did.
   */
  reportServer(err: unknown, fields: Record<string, string> = {}): boolean {
    if (!(err instanceof HttpErrorResponse)) return false;
    const { msg, field } = (err.error ?? {}) as { msg?: unknown; field?: unknown };
    if (typeof msg !== 'string' || typeof field !== 'string') return false;
    const ours = fields[field] ?? field;
    if (!this.elements.has(ours)) return false;
    this.report(ours, errorMessage(err, msg));
    return true;
  }

  /** Clears a field's mark, or every mark, as when the form is sent or emptied. */
  clear(field?: string): void {
    if (field === undefined) this.problems.set({});
    else this.mark(field, '');
  }

  /** @internal Fields register their elements, for the focus to go to. */
  register(field: string, element: HTMLElement): () => void {
    this.elements.set(field, element);
    return () => {
      if (this.elements.get(field) === element) this.elements.delete(field);
    };
  }

  private mark(field: string, problem: string): void {
    this.problems.update((shown) => {
      if ((shown[field] ?? '') === problem) return shown;
      const next = { ...shown };
      if (problem) next[field] = problem;
      else delete next[field];
      return next;
    });
  }

  private focus(field: string): void {
    this.elements.get(field)?.focus();
  }
}

/**
 * Says a message to screen readers, through one polite live region for the
 * page, made the first time it is needed. The text goes in a moment after the
 * region is cleared, so the same message twice is still read.
 */
function announce(message: string): void {
  let region = document.getElementById('field-announcer');
  if (!region) {
    region = document.createElement('div');
    region.id = 'field-announcer';
    region.className = 'visually-hidden';
    region.setAttribute('role', 'status');
    document.body.appendChild(region);
  }
  region.textContent = '';
  const target = region;
  setTimeout(() => (target.textContent = message), 100);
}

let unnamed = 0;

/**
 * Ties an input to a field of a FieldChecks:
 * `<input id="email" [gcField]="checks" gcFieldName="email" />`. When the field
 * has a problem the input is outlined (.is-invalid) and aria-invalid, and the
 * problem shows under it in an element its aria-describedby points to (after
 * any description it already had).
 */
@Directive({
  selector: '[gcField]',
  host: {
    '[class.is-invalid]': '!!problem()',
    '[attr.aria-invalid]': 'problem() ? "true" : null',
    '[attr.aria-describedby]': 'describedBy()',
    '(blur)': 'left()',
    '(input)': 'changed()',
    '(change)': 'changed()'
  }
})
export class FieldCheck {
  /** The form's checks. */
  readonly gcField = input.required<FieldChecks>();
  /** This input's field in them. */
  readonly gcFieldName = input.required<string>();

  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly description = inject(new HostAttributeToken('aria-describedby'), { optional: true });
  private readonly fallbackId = 'field-' + ++unnamed;

  protected readonly problem = computed(() => this.gcField().problem(this.gcFieldName()));
  protected readonly describedBy = computed(
    () => [this.description, this.problem() ? this.messageId() : null].filter(Boolean).join(' ') || null
  );

  constructor() {
    // The problem's text goes just after the input, and leaves with it.
    const message = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(message, 'field-problem');
    let unregister = () => {};
    effect(() => {
      unregister();
      unregister = this.gcField().register(this.gcFieldName(), this.element);
    });
    effect(() => {
      const problem = this.problem();
      message.textContent = problem;
      message.id = this.messageId();
      if (problem && !message.isConnected) this.element.after(message);
      if (!problem && message.isConnected) message.remove();
    });
    inject(DestroyRef).onDestroy(() => {
      unregister();
      message.remove();
    });
  }

  /**
   * The message's id: the input's id and "-problem". Read when the message
   * shows, by which time an id bound in the template ([id]) is in place.
   */
  private messageId(): string {
    return (this.element.id || this.fallbackId) + '-problem';
  }

  protected left(): void {
    // Passing an empty field by is not a mistake; sending the form checks it.
    if (this.element.value.trim() !== '' || this.problem()) this.gcField().check(this.gcFieldName());
  }

  protected changed(): void {
    // After ngModel has the new value, which it takes from the same event.
    queueMicrotask(() => this.gcField().recheckMarked());
  }
}

// Checks most forms use. Each takes the field's value as a signal or getter.

type Value = () => string | number | null | undefined;
const text = (value: Value): string => String(value() ?? '').trim();

/** A password, or another field where spaces count: anything typed at all. */
export const filled =
  (value: Value, message: string): Check =>
  () =>
    String(value() ?? '') ? null : message;

/** A field that must not be blank. */
export const required =
  (value: Value, message: string): Check =>
  () =>
    text(value) ? null : message;

/** An email address: something@something.something, as the server asks. */
export const emailAddress =
  (value: Value): Check =>
  () => {
    const address = text(value);
    if (!address) return translate('fieldChecks.emailMissing');
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? null : translate('fieldChecks.emailFormat');
  };

/** A new password: 8 characters or more, as the server asks. */
export const newPassword =
  (value: Value): Check =>
  () => {
    const password = String(value() ?? '');
    if (!password) return translate('fieldChecks.passwordMissing');
    return password.length < 8 ? translate('fieldChecks.passwordShort') : null;
  };

/** The new password typed again. */
export const samePassword =
  (value: Value, password: Value): Check =>
  () => {
    if (!String(value() ?? '')) return translate('fieldChecks.passwordAgain');
    return value() === password() ? null : translate('fieldChecks.passwordsDiffer');
  };

/**
 * A number, if anything is entered: a plain one, as a number box saves what it
 * reads (shared/number-input.ts), from `min` (0 by default), and below `below`
 * if given. Blank is fine; use `required` too for a field that is not.
 */
export const numberCheck =
  (value: Value, message: string, { min = 0, below }: { min?: number; below?: number } = {}): Check =>
  () => {
    const entered = text(value);
    if (!entered) return null;
    const n = plainNumber(entered);
    return n !== null && n >= min && (below === undefined || n < below) ? null : message;
  };
