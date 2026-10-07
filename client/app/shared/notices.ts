import { Component, input, signal } from '@angular/core';

/**
 * Error and success messages for one page. A message can name a topic, such as
 * 'save': a new message on a topic replaces the one before it, so repeated
 * saves show the latest outcome without clearing anything else.
 */
export class Notices {
  readonly errors = signal<string[]>([]);
  readonly messages = signal<string[]>([]);
  private readonly latest = new Map<string, string>();

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

  success(text: string, topic?: string): void {
    const previous = topic === undefined ? undefined : this.latest.get(topic);
    this.messages.update((list) => {
      const at = previous === undefined ? -1 : list.indexOf(previous);
      return [...list.filter((_, i) => i !== at), text];
    });
    if (topic !== undefined) this.latest.set(topic, text);
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
  // The live regions are always on the page, empty or not: screen readers
  // announce what is added to a region they already know, and can miss a
  // region that arrives with its message already in it.
  template: `
    <div role="alert">
      @if (notices().errors().length) {
        <ol class="errors-section">
          @for (error of notices().errors(); track $index) {
            <li>
              {{ error }}
              <button type="button" class="btn btn-light border" (click)="notices().dismissError($index)">
                Dismiss
              </button>
            </li>
          }
        </ol>
      }
    </div>
    <div role="status">
      @if (notices().messages().length) {
        <ol class="server-msg">
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
    </div>
  `
})
export class NoticesList {
  readonly notices = input.required<Notices>();
}
