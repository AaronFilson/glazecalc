import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { PreferencesService } from './preferences.service';

/**
 * Shown on a return to this browser after nearly a year away (core/settings-expiry.ts): using Glazecalc keeps
 * the settings kept here, and "Clear my settings" removes them. Nothing is removed unless asked.
 */
@Component({
  selector: 'gc-settings-expiry-notice',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (preferences.settingsExpiring()) {
      <aside class="settings-expiry-notice" role="status">
        <p>
          {{ t('settingsExpiry.text') }}
          <button
            id="settings-clear"
            type="button"
            class="btn btn-link link-inline"
            (click)="preferences.clearSettings()"
          >
            {{ t('settingsExpiry.clear') }}
          </button>
          <button
            id="settings-notice-close"
            type="button"
            class="btn btn-link link-inline"
            (click)="preferences.closeSettingsNotice()"
          >
            {{ t('notice.close') }}
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
