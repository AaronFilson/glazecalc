import { Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { KEEP_CHOICES, OfflineRecords } from '../../core/offline-records';
import { Outbox } from '../../core/outbox';

/** The labels of the keep choices, by their days. */
const KEEP_LABELS: Record<string, string> = {
  null: marker('offline.keepNever'),
  '7': marker('offline.keepWeek'),
  '30': marker('offline.keepMonth'),
  '90': marker('offline.keepQuarter'),
  '365': marker('offline.keepYear')
};

/**
 * The switch on the account page that keeps the user's records on this device, so they open without a network
 * (core/offline-records.ts). Off by default, per device; not offered during a trial or where the browser has no
 * IndexedDB. Beside it: "Clear offline data" (asks first, naming the changes not sent yet), a notice for iPhone and
 * iPad browsers, where Safari may remove data after 7 days without use. Nothing is said about other accounts'
 * offline data on this browser: one account never learns whether another has any.
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
        <div role="alert">
          @if (records.notKept()) {
            <p class="text-danger offline-records-not-kept">{{ t('offline.recordsNotKept') }}</p>
          }
        </div>
        @if (records.iosNotice() && records.enabled()) {
          <div class="form-text offline-ios-notice" role="status">
            <p>{{ t('offline.iosEviction') }}</p>
            <button type="button" class="btn btn-light btn-sm border" (click)="records.iosNotice.set(false)">
              {{ t('outbox.dismiss') }}
            </button>
          </div>
        }
        @if (records.enabled()) {
          <div class="offline-keep">
            <label class="form-label" for="offline-keep">{{ t('offline.keepLabel') }}</label>
            <select
              id="offline-keep"
              class="form-select"
              aria-describedby="offline-keep-hint"
              [disabled]="busy()"
              (change)="keep($event)"
            >
              @for (choice of choices; track $index) {
                <option [value]="choice ?? ''" [selected]="choice === records.keepDays()">
                  {{ t(labelOf(choice)) }}
                </option>
              }
            </select>
            <p id="offline-keep-hint" class="form-text">{{ t('offline.keepHint') }}</p>
          </div>
        }
        @if (records.enabled() || outbox.count() > 0) {
          <p>
            <button
              type="button"
              class="btn btn-light btn-sm border offline-clear"
              [disabled]="busy()"
              (click)="clear()"
            >
              {{ t('offline.clearButton') }}
            </button>
          </p>
        }
      </section>
    }
  </ng-container>`
})
export class OfflineRecordsSection {
  protected readonly records = inject(OfflineRecords);
  protected readonly outbox = inject(Outbox);
  protected readonly busy = signal(false);
  protected readonly choices = KEEP_CHOICES;

  /** The label of a keep choice (days; null: forever). */
  protected labelOf(days: number | null): string {
    return KEEP_LABELS[String(days)] ?? KEEP_LABELS['null'];
  }

  /** How long the copy is kept without Glazecalc being opened here; removed only as the site next opens. */
  protected async keep(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    this.busy.set(true);
    try {
      await this.records.setKeepDays(select.value ? Number(select.value) : null);
      // The list shows what is so: the time chosen before, when this one could not be saved.
      select.value = String(this.records.keepDays() ?? '');
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggle(event: Event): Promise<void> {
    this.busy.set(true);
    const box = event.target as HTMLInputElement;
    try {
      // The box shows what is so: unchecked again when this browser would not keep the copy, or the person said no.
      box.checked = await this.records.setEnabled(box.checked);
    } finally {
      this.busy.set(false);
    }
  }

  protected async clear(): Promise<void> {
    this.busy.set(true);
    try {
      await this.records.clearWithConfirm();
    } finally {
      this.busy.set(false);
    }
  }
}
