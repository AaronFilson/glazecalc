import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { Outbox, fieldsOf, nameOfRecord, textOfEntry, type ConflictChoice, type OutboxEntry } from './outbox';

// The keys manager does not look inside the @for of the failed list's template, so it finds these by the marker.
marker(['outbox.failed', 'outbox.copyText', 'outbox.remove', 'outbox.dependsFailed']);

/** What a queued change is about, for a message: the record's name or title. */
export const entryName = (entry: OutboxEntry): string =>
  nameOfRecord(fieldsOf(entry), entry.base, entry.theirs) || entry.area;

/**
 * Asks what to do with a change made offline when the record moved on (or went) on the server meanwhile
 * (core/outbox.ts). One question at a time, as a modal dialog:
 * - the record changed: "Save mine as a copy" (the default, and focused), "Keep mine", "Keep theirs";
 * - the record is gone: "Save as new" (the default, focused), "Discard my changes".
 * Escape puts the question off until the next page; the change stays queued and nothing is lost.
 */
@Component({
  selector: 'gc-outbox-conflict',
  imports: [TranslocoDirective],
  template: `
    @if (current(); as entry) {
      <div class="conflict-backdrop" *transloco="let t">
        <div
          #dialog
          class="conflict-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="conflict-title"
          aria-describedby="conflict-body"
          (keydown)="keydown($event)"
        >
          <h2 id="conflict-title" class="h5">{{ t('conflict.title') }}</h2>
          <p id="conflict-body">
            {{
              entry.error === 'record-gone'
                ? t('conflict.gone', { name: name(entry) })
                : t('conflict.body', { name: name(entry) })
            }}
          </p>
          <div class="conflict-actions">
            @if (entry.error === 'record-gone') {
              <button #first type="button" class="btn btn-primary" (click)="choose(entry, 'saveNew')">
                {{ t('conflict.saveNew') }}
              </button>
              <button type="button" class="btn btn-light border" (click)="choose(entry, 'discard')">
                {{ t('conflict.discard') }}
              </button>
            } @else {
              <button #first type="button" class="btn btn-primary" (click)="choose(entry, 'copy')">
                {{ t('conflict.copy') }}
              </button>
              <button type="button" class="btn btn-light border" (click)="choose(entry, 'mine')">
                {{ t('conflict.mine') }}
              </button>
              <button type="button" class="btn btn-light border" (click)="choose(entry, 'theirs')">
                {{ t('conflict.theirs') }}
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .conflict-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgb(0 0 0 / 0.5);
    }
    .conflict-dialog {
      max-width: 32rem;
      padding: 1.25rem;
      background: var(--bs-body-bg, #fff);
      color: var(--bs-body-color, #212529);
      border: 1px solid var(--gc-border, #ccc);
      border-radius: var(--gc-radius, 0.5rem);
    }
    .conflict-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `
})
export class OutboxConflictDialog {
  private readonly outbox = inject(Outbox);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly first = viewChild<ElementRef<HTMLElement>>('first');
  /** The change whose question was put off with Escape. */
  private readonly postponed = signal<number | null>(null);

  /** The change to ask about now. */
  protected readonly current = computed(() => {
    const entry = this.outbox.conflicts().find((one) => one.seq !== this.postponed());
    return entry ?? null;
  });

  constructor() {
    // The default answer takes the focus when a question appears.
    effect(() => {
      const button = this.first();
      if (button) queueMicrotask(() => button.nativeElement.focus());
    });
  }

  protected name(entry: OutboxEntry): string {
    return entryName(entry);
  }

  protected choose(entry: OutboxEntry, choice: ConflictChoice): void {
    void this.outbox.resolve(entry.seq!, choice);
  }

  protected keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.postponed.set(this.current()?.seq ?? null);
      return;
    }
    if (event.key !== 'Tab') return;
    // Keeps the focus inside the dialog.
    const buttons = [...(this.dialog()?.nativeElement.querySelectorAll<HTMLElement>('button') ?? [])];
    if (!buttons.length) return;
    const at = buttons.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey ? (at <= 0 ? buttons.length - 1 : at - 1) : at === buttons.length - 1 ? 0 : at + 1;
    event.preventDefault();
    buttons[next].focus();
  }
}

/**
 * The changes the server refused (a 400, a full quota): kept, with the text the person wrote, until they copy it
 * out or remove it.
 */
@Component({
  selector: 'gc-outbox-failed',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <div role="status">
      @if (outbox.failures().length) {
        <div class="update-bar offline-records-bar outbox-failed">
          @for (entry of outbox.failures(); track entry.seq) {
            <div class="trial-bar-inner">
              <p>
                {{ t('outbox.failed', { name: name(entry) }) }}
                @if (entry.error === 'depends-on-failed') {
                  {{ t('outbox.dependsFailed') }}
                }
              </p>
              <div class="trial-actions">
                <button type="button" class="btn btn-light btn-sm" (click)="copyText(entry)">
                  {{ t('outbox.copyText') }}
                </button>
                <button type="button" class="btn btn-light btn-sm" (click)="remove(entry)">
                  {{ t('outbox.remove') }}
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  </ng-container>`
})
export class OutboxFailedList {
  protected readonly outbox = inject(Outbox);

  protected name(entry: OutboxEntry): string {
    return entryName(entry);
  }

  protected copyText(entry: OutboxEntry): void {
    const text = textOfEntry(entry);
    try {
      void navigator.clipboard.writeText(text);
    } catch {
      // No clipboard permission: the text is still kept until it is removed.
    }
  }

  protected remove(entry: OutboxEntry): void {
    void this.outbox.discardFailed(entry.seq!);
  }
}
