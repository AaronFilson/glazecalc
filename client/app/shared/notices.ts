import { Component, input, signal } from '@angular/core';

/** Error and success messages for one page. */
export class Notices {
  readonly errors = signal<string[]>([]);
  readonly messages = signal<string[]>([]);

  error(text: string): void {
    this.errors.update((list) => [...list, text]);
  }

  success(text: string): void {
    this.messages.update((list) => [...list, text]);
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
          <li>{{ error }}
            <button type="button" class="btn btn-default" (click)="notices().dismissError($index)">Dismiss</button>
          </li>
        }
      </ol>
    }
    @if (notices().messages().length) {
      <ol class="server-msg" role="status">
        @for (message of notices().messages(); track $index) {
          <li>{{ message }}
            <button type="button" class="btn btn-default" (click)="notices().dismissMessage($index)">Dismiss</button>
          </li>
        }
      </ol>
    }
  `
})
export class NoticesList {
  readonly notices = input.required<Notices>();
}
