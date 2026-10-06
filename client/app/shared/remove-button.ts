import { HttpErrorResponse } from '@angular/common/http';
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
 * Removes the user's saved records from a list on a page and says how it went:
 * a removal on the page's messages, a failure beside the record.
 */
export class Removal<T extends Owned> {
  /** The _ids of the records being removed; several can be on their way at once. */
  private readonly pending = signal<ReadonlySet<string>>(new Set());
  /** Why a record could not be removed, by _id. */
  private readonly problems = signal<ReadonlyMap<string, string>>(new Map());

  constructor(
    private readonly api: ApiResource<T>,
    private readonly list: WritableSignal<T[]>,
    private readonly notices: Notices,
    readonly nameOf: (item: T) => string
  ) {}

  isPending(item: T): boolean {
    return this.pending().has(item._id ?? '');
  }

  problemFor(item: T): string {
    return this.problems().get(item._id ?? '') ?? '';
  }

  /** Removes it from the server, then from the list. True when it is gone. */
  async remove(item: T): Promise<boolean> {
    const id = item._id ?? '';
    if (this.pending().has(id)) return false;
    const name = this.nameOf(item);
    this.pending.update((ids) => new Set(ids).add(id));
    this.setProblem(id, '');
    try {
      await this.api.remove(item);
      this.notices.success(`Removed "${name}".`, 'remove');
    } catch (err) {
      // The server has no such record: it was removed already, in another tab
      // or by an earlier try whose answer was lost.
      if (!(err instanceof HttpErrorResponse && err.status === 404)) {
        this.setProblem(id, errorMessage(err, 'It could not be removed. Please try again.'));
        return false;
      }
      this.notices.success(`"${name}" was already removed.`, 'remove');
    } finally {
      this.pending.update((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }
    this.list.update((items) => items.filter((other) => other._id !== id));
    return true;
  }

  private setProblem(id: string, problem: string): void {
    this.problems.update((problems) => {
      const next = new Map(problems);
      if (problem) next.set(id, problem);
      else next.delete(id);
      return next;
    });
  }
}

let nextQuestionId = 0;

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
      <span class="remove-confirm" role="group" [attr.aria-labelledby]="questionId" (keydown.escape)="cancel()">
        <span class="remove-question" [id]="questionId">
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
            class="btn btn-light border btn-sm remove-cancel"
            [attr.aria-disabled]="busy() || null"
            (click)="cancel()"
          >
            Cancel
          </button>
        </span>
        <span class="remove-problem" role="alert">{{ problem() }}</span>
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
    .remove-answers {
      display: inline-flex;
      gap: 0.4rem;
    }
    .remove-problem {
      flex-basis: 100%;
      font-weight: 600;
    }
    /* Out of the flex layout while empty, but still there as a live region. */
    .remove-problem:empty {
      position: absolute;
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
  /** Why the last try failed, shown in the question. */
  readonly problem = input('');
  /** The person said yes. */
  readonly confirmed = output<void>();

  protected readonly asking = signal(false);
  protected readonly questionId = 'remove-question-' + nextQuestionId++;
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
    // A neighbour's Remove button, or its Cancel if its question is open: never
    // its "Yes, remove", one keypress from removing it too.
    const buttons = [item?.nextElementSibling, item?.previousElementSibling]
      .map((other) =>
        other?.querySelector<HTMLElement>('gc-remove-button .remove-start, gc-remove-button .remove-cancel')
      )
      .filter((button): button is HTMLElement => !!button);
    const headings = [
      this.host.closest('section')?.querySelector<HTMLElement>('h2, h3, h4'),
      document.querySelector<HTMLElement>('h1')
    ].filter((heading): heading is HTMLElement => !!heading);
    return [...buttons, ...headings];
  }
}
