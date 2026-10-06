import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  WritableSignal,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { ApiResource } from '../core/api-resource.service';
import { errorMessage } from '../core/error-message';
import { Owned } from '../core/models';
import { Notices } from './notices';

/**
 * Removes the user's saved records from a list on a page, one at a time, and
 * says how it went.
 */
export class Removal<T extends Owned> {
  /** The _id of the record being removed. */
  readonly pending = signal<string | null>(null);

  constructor(
    private readonly api: ApiResource<T>,
    private readonly list: WritableSignal<T[]>,
    private readonly notices: Notices,
    readonly nameOf: (item: T) => string
  ) {}

  isPending(item: T): boolean {
    return this.pending() === item._id;
  }

  /** Removes it from the server, then from the list. True when it is gone. */
  async remove(item: T): Promise<boolean> {
    if (this.pending() !== null) return false;
    const name = this.nameOf(item);
    this.pending.set(item._id ?? '');
    this.notices.clear();
    try {
      await this.api.remove(item);
      this.list.update((items) => items.filter((other) => other._id !== item._id));
      this.notices.success(`Removed "${name}".`);
      return true;
    } catch (err) {
      this.notices.error(errorMessage(err, `"${name}" could not be removed. Please try again.`));
      return false;
    } finally {
      this.pending.set(null);
    }
  }
}

/**
 * A Remove button for one saved record that asks first, in place:
 * Remove "Celadon"? This can't be undone. [Yes, remove] [Cancel]
 *
 * The question starts on Cancel, and Escape cancels. When the record is
 * removed, the focus moves to the next record's Remove button (or the one
 * before, or the list's heading), so a keyboard user is not sent back to the
 * top of the page.
 */
@Component({
  selector: 'gc-remove-button',
  // Lets a page lay the question out on a line of its own.
  host: { '[class.asking]': 'asking()' },
  template: `
    @if (asking()) {
      <span class="remove-confirm" role="group" [attr.aria-label]="'Remove ' + name()" (keydown.escape)="cancel()">
        <span class="remove-question">
          Remove "{{ name() }}"?
          @if (note()) {
            {{ note() }}
          }
          This can't be undone.
        </span>
        <span class="remove-answers">
          <button
            type="button"
            class="btn btn-outline-danger btn-sm"
            [attr.aria-disabled]="busy() || null"
            (click)="confirm()"
          >
            {{ busy() ? 'Removing...' : 'Yes, remove' }}
          </button>
          <button
            #cancelButton
            type="button"
            class="btn btn-light border btn-sm"
            [attr.aria-disabled]="busy() || null"
            (click)="cancel()"
          >
            Cancel
          </button>
        </span>
      </span>
    } @else {
      <button
        #removeButton
        type="button"
        class="btn btn-light border btn-sm remove-start"
        [attr.aria-label]="'Remove ' + name()"
        (click)="ask()"
      >
        Remove
      </button>
    }
  `,
  styles: `
    .remove-confirm {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0.5rem;
      padding: 0.35rem 0.6rem;
      background: var(--gc-danger-bg);
      border-radius: var(--gc-radius);
      color: var(--gc-danger-text);
    }
    /* Not disabled, which would drop the focus: clicks are ignored while it is removed. */
    .btn[aria-disabled='true'] {
      opacity: 0.65;
      cursor: progress;
    }
    .remove-answers {
      display: inline-flex;
      gap: 0.4rem;
    }
  `
})
export class RemoveButton {
  /** What the record is called, for the question and for screen readers. */
  readonly name = input.required<string>();
  /** Anything more to know before removing it, as a sentence. */
  readonly note = input('');
  /** The page is removing it now. */
  readonly busy = input(false);
  /** The person said yes. */
  readonly confirmed = output<void>();

  protected readonly asking = signal(false);
  private readonly removeButton = viewChild<ElementRef<HTMLElement>>('removeButton');
  private readonly cancelButton = viewChild<ElementRef<HTMLElement>>('cancelButton');
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  /** Where the focus goes if the record is removed, in order of preference. */
  private focusAfter: HTMLElement[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (!this.focusAfter.length) return;
      const candidates = this.focusAfter;
      // After the list has re-rendered without the record.
      setTimeout(() => {
        // Only if the focus went with the record, not somewhere the person put it since.
        const active = document.activeElement;
        if (active && active !== document.body && active.isConnected) return;
        const target = candidates.find((element) => element.isConnected);
        if (!target) return;
        if (!target.matches('button')) target.setAttribute('tabindex', '-1');
        target.focus();
      });
    });
  }

  protected ask(): void {
    this.asking.set(true);
    afterNextRender(() => this.cancelButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected cancel(): void {
    if (this.busy()) return;
    this.focusAfter = [];
    this.asking.set(false);
    afterNextRender(() => this.removeButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected confirm(): void {
    if (this.busy()) return;
    this.focusAfter = this.findFocusAfter();
    this.confirmed.emit();
  }

  private findFocusAfter(): HTMLElement[] {
    const item = this.host.closest('li, tr');
    const buttons = [item?.nextElementSibling, item?.previousElementSibling]
      .map((other) => other?.querySelector<HTMLElement>('gc-remove-button button'))
      .filter((button): button is HTMLElement => !!button);
    const headings = [
      this.host.closest('section')?.querySelector<HTMLElement>('h2, h3, h4'),
      document.querySelector<HTMLElement>('h1')
    ].filter((heading): heading is HTMLElement => !!heading);
    return [...buttons, ...headings];
  }
}
