import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { PreferencesService } from './preferences.service';

/**
 * Shown once, on the first page load at which the settings kept in this browser are within 30 days of a
 * year unused (core/settings-expiry.ts). Left alone, they are removed at the first load after the year.
 */
@Component({
  selector: 'gc-settings-expiry-notice',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (preferences.settingsExpiring()) {
      <aside class="settings-expiry-notice" role="status">
        <p>
          {{ t('settingsExpiry.text') }}
          <button type="button" class="btn btn-link link-inline" (click)="preferences.keepSettings()">
            {{ t('settingsExpiry.keep') }}
          </button>
        </p>
      </aside>
    }
  </ng-container>`,
  styles: `
    .settings-expiry-notice {
      border-inline-start: 3px solid var(--gc-primary);
      background: var(--gc-surface-2);
      padding: 0.5rem 0.75rem;
      margin: 0 0 1rem;
      font-size: 0.95rem;
      p {
        margin: 0;
      }
      button {
        margin-inline-start: 0.5rem;
      }
    }
  `
})
export class SettingsExpiryNotice {
  protected readonly preferences = inject(PreferencesService);
}
