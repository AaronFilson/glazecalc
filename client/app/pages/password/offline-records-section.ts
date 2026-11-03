import { Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { OfflineRecords } from '../../core/offline-records';

/**
 * The switch on the account page that keeps the user's records on this device, so they open without a network
 * (core/offline-records.ts). Off by default, per device; not offered during a trial or where the browser has no
 * IndexedDB.
 */
@Component({
  selector: 'gc-offline-records',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (records.available()) {
      <section class="auth-text offline-records">
        <div class="form-check">
          <input
            id="offline-records"
            class="form-check-input"
            type="checkbox"
            aria-describedby="offline-records-hint"
            [checked]="records.enabled()"
            [disabled]="busy()"
            (change)="toggle($event)"
          />
          <label class="form-check-label" for="offline-records">{{ t('offline.recordsSwitch') }}</label>
          <p id="offline-records-hint" class="form-text">{{ t('offline.recordsHint') }}</p>
        </div>
      </section>
    }
  </ng-container>`
})
export class OfflineRecordsSection {
  protected readonly records = inject(OfflineRecords);
  protected readonly busy = signal(false);

  protected async toggle(event: Event): Promise<void> {
    this.busy.set(true);
    try {
      await this.records.setEnabled((event.target as HTMLInputElement).checked);
    } finally {
      this.busy.set(false);
    }
  }
}
