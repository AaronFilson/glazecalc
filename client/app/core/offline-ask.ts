import { Component, ElementRef, Injectable, effect, inject, signal, viewChild } from '@angular/core';

/** One answer a question offers. */
export interface AskChoice {
  id: string;
  label: string;
  /** Styled as the main answer. */
  primary?: boolean;
  /** Styled as destructive. */
  danger?: boolean;
  /** Takes the focus when the question opens; the first choice does when none says so. */
  focus?: boolean;
}

/** A question about the data kept on this device. */
export interface AskQuestion {
  title: string;
  /** Paragraphs, in order. */
  body: string[];
  choices: AskChoice[];
  /** The answer Escape gives (and the one given when another question replaces this one). */
  cancel: string;
}

/**
 * Asks the person a question in a modal dialog (`gc-offline-ask`, in the app shell) and resolves with the id of the
 * choice. Used for what happens to the offline copy and the changes waiting on this device: signing out, clearing
 * it, turning it off, deleting another account's (core/offline-records.ts).
 */
@Injectable({ providedIn: 'root' })
export class OfflineAsk {
  /** The question on screen, with the way to answer it; null when none is. */
  readonly open = signal<{ question: AskQuestion; answer: (id: string) => void } | null>(null);

  ask(question: AskQuestion): Promise<string> {
    // One question at a time: an older one still open counts as cancelled.
    this.open()?.answer(this.open()!.question.cancel);
    return new Promise<string>((resolve) => {
      const answer = (id: string) => {
        if (this.open()?.answer === answer) this.open.set(null);
        resolve(id);
      };
      this.open.set({ question, answer });
    });
  }
}

/**
 * The dialog for OfflineAsk: a modal alert dialog that keeps the focus inside, focuses the default answer, and
 * answers with the cancel choice on Escape.
 */
@Component({
  selector: 'gc-offline-ask',
  template: `
    @if (asking.open(); as current) {
      <div class="ask-backdrop">
        <div
          #dialog
          class="ask-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="ask-title"
          aria-describedby="ask-body"
          (keydown)="keydown($event, current)"
        >
          <h2 id="ask-title" class="h5">{{ current.question.title }}</h2>
          <div id="ask-body">
            @for (paragraph of current.question.body; track $index) {
              <p>{{ paragraph }}</p>
            }
          </div>
          <div class="ask-actions">
            @for (choice of current.question.choices; track choice.id) {
              <button
                type="button"
                class="btn"
                [class.btn-primary]="choice.primary"
                [class.btn-danger]="choice.danger"
                [class.btn-light]="!choice.primary && !choice.danger"
                [class.border]="!choice.primary && !choice.danger"
                [attr.data-focus]="isFocus(current.question, choice) ? '' : null"
                [attr.data-choice]="choice.id"
                (click)="current.answer(choice.id)"
              >
                {{ choice.label }}
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .ask-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgb(0 0 0 / 0.5);
    }
    .ask-dialog {
      max-width: 32rem;
      padding: 1.25rem;
      background: var(--bs-body-bg, #fff);
      color: var(--bs-body-color, #212529);
      border: 1px solid var(--gc-border, #ccc);
      border-radius: var(--gc-radius, 0.5rem);
    }
    .ask-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `
})
export class OfflineAskDialog {
  protected readonly asking = inject(OfflineAsk);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // The default answer takes the focus when a question appears.
    effect(() => {
      const root = this.dialog()?.nativeElement;
      if (root) queueMicrotask(() => root.querySelector<HTMLElement>('[data-focus]')?.focus());
    });
  }

  protected isFocus(question: AskQuestion, choice: AskChoice): boolean {
    const chosen = question.choices.find((one) => one.focus) ?? question.choices[0];
    return chosen === choice;
  }

  protected keydown(event: KeyboardEvent, current: { question: AskQuestion; answer: (id: string) => void }): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      current.answer(current.question.cancel);
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
