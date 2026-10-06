import { signal } from '@angular/core';

/**
 * Runs one task at a time, such as a save: a second click while the first is
 * still waiting on the server is ignored, so nothing is saved twice.
 */
export class Busy {
  readonly active = signal(false);

  async run(task: () => Promise<void>): Promise<void> {
    if (this.active()) return;
    this.active.set(true);
    try {
      await task();
    } finally {
      this.active.set(false);
    }
  }
}
