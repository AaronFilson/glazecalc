import { Component, input, signal } from '@angular/core';

/** Error and success messages for one page. */
export class Notices {
  readonly errors = signal<string[]>([]);
  readonly messages = signal<string[]>([]);

  error(text: string): void {
    this.errors.update((list) => [...list, text]);
  }

  /** Shows a calculation's warnings in place of the previous calculation's. */
  warnings(list: readonly string[]): void {
    this.errors.update((errors) => [
      ...errors.filter((text) => !text.startsWith('Warning: ')),
      ...list.map((warning) => 'Warning: ' + warning)
    ]);
  }

  success(text: string): void {
    this.messages.update((list) => [...list, text]);
  }

  /** Removes every message, before showing the outcome of a new action. */
  clear(): void {
    this.errors.set([]);
    this.messages.set([]);
  }

  dismissError(index: number): void {
    this.errors.update((list) => list.filter((_, i) => i !== index));
  }

  dismissMessage(index: number): void {
    this.messages.update((list) => list.filter((_, i) => i !== index));
  }
}

@Component({
  selector: 'gc-notices',
  template: `
    @if (notices().errors().length) {
      <ol class="errors-section" role="alert">
        @for (error of notices().errors(); track $index) {
          <li>
            {{ error }}
            <button type="button" class="btn btn-light border" (click)="notices().dismissError($index)">Dismiss</button>
          </li>
        }
      </ol>
    }
    @if (notices().messages().length) {
      <ol class="server-msg" role="status">
        @for (message of notices().messages(); track $index) {
          <li>
            {{ message }}
            <button type="button" class="btn btn-light border" (click)="notices().dismissMessage($index)">
              Dismiss
            </button>
          </li>
        }
      </ol>
    }
  `
})
export class NoticesList {
  readonly notices = input.required<Notices>();
}
