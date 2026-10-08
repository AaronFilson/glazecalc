import { Component, Injector, OnInit, afterNextRender, inject, signal } from '@angular/core';
import { errorMessage } from '../../core/error-message';
import { Preferences, PreferencesService } from '../../core/preferences.service';
import { PALETTES } from '../../core/theme';

interface Choice {
  value: string;
  label: string;
  example?: string;
  /** A palette's color, light and dark. */
  swatch?: readonly [string, string];
  /** Said once it is saved. */
  saved: string;
}

interface Setting {
  name: keyof Preferences;
  /** The start of each radio button's id: weight-unit-g. */
  id: string;
  legend: string;
  choices: Choice[];
  help: string;
}

const SETTINGS: Setting[] = [
  {
    name: 'theme',
    id: 'theme',
    legend: 'Light or dark',
    choices: [
      { value: 'system', label: 'As this device is set', saved: 'Saved: light or dark as each device is set.' },
      { value: 'light', label: 'Light', saved: 'Saved: always light.' },
      { value: 'dark', label: 'Dark', saved: 'Saved: always dark.' }
    ],
    help: 'Printed recipes are always black on white.'
  },
  {
    name: 'palette',
    id: 'palette',
    legend: 'Colors',
    choices: PALETTES.map((palette) => ({
      value: palette.value,
      label: palette.label,
      swatch: palette.swatch,
      saved: `Saved: ${palette.label} buttons and links.`
    })),
    help: 'For buttons, links and tabs, named for glazes. Each is easy to read in light and in dark.'
  },
  {
    name: 'weightUnit',
    id: 'weight-unit',
    legend: 'Batch weights',
    choices: [
      { value: 'g', label: 'Grams', example: '1250 g', saved: 'Saved: batch weights are in grams.' },
      {
        value: 'lb',
        label: 'Pounds and ounces',
        example: '2 lb 12.1 oz',
        saved: 'Saved: batch weights are in pounds and ounces.'
      }
    ],
    help: 'For printed batches.'
  },
  {
    name: 'gramPrecision',
    id: 'gram-precision',
    legend: 'Grams on printed batches',
    choices: [
      {
        value: 'single',
        label: 'To a tenth of a gram',
        example: '4938.2 g',
        saved: 'Saved: grams show to a tenth.'
      },
      {
        value: 'full',
        label: 'Full precision',
        example: '4938.23517 g',
        saved: 'Saved: grams show in full, to 5 decimal places.'
      }
    ],
    help: 'To a tenth, amounts under 10 g still show hundredths (2.35 g), for colorants in small test batches.'
  },
  {
    name: 'lead',
    id: 'lead',
    legend: 'Lead',
    choices: [
      {
        value: 'off',
        label: 'Off: never add lead to a recipe or suggest it',
        saved: 'Saved: lead is never added to a recipe or suggested.'
      },
      {
        value: 'on',
        label: 'On: materials with lead can be added and suggested',
        saved: 'Saved: materials with lead can be added and suggested.'
      }
    ],
    help:
      'Lead is poisonous to breathe or swallow and builds up in the body, and a lead glaze can release it into' +
      ' food and drink; no calculation can tell whether a fired piece does. Off, recipes that already have lead' +
      ' still open as they were.'
  }
];

/** The account's settings, on the account page. A trial has them too. */
@Component({
  selector: 'gc-settings',
  template: `
    <section class="auth-text settings" aria-labelledby="settings-heading">
      <h2 id="settings-heading">Settings</h2>
      <p class="muted">Saved with your account, so they hold on every device.</p>
      @for (setting of settings; track setting.name) {
        <fieldset class="settings-group">
          <legend class="form-label">{{ setting.legend }}</legend>
          @for (choice of setting.choices; track choice.value) {
            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                [name]="setting.id"
                [id]="setting.id + '-' + choice.value"
                [value]="choice.value"
                [checked]="current(setting) === choice.value"
                (change)="choose(setting, choice)"
              />
              <label class="form-check-label" [for]="setting.id + '-' + choice.value">
                @if (choice.swatch; as swatch) {
                  <span
                    class="swatch"
                    aria-hidden="true"
                    [style.background]="'linear-gradient(90deg, ' + swatch[0] + ' 50%, ' + swatch[1] + ' 50%)'"
                  ></span>
                }
                {{ choice.label }}
                @if (choice.example) {
                  <span class="muted">({{ choice.example }})</span>
                }
              </label>
            </div>
          }
          <div class="form-text">{{ setting.help }}</div>
          @if (setting.name === 'lead' && confirmingLead()) {
            <div class="settings-confirm">
              <p id="lead-confirm" tabindex="-1">
                Use lead only as a frit, never as raw red, white or yellow lead or litharge. Mix it wet, never spray it,
                wear a respirator and clean up wet. Keep lead-glazed ware away from food and drink unless a laboratory
                leach test of the fired piece has passed.
              </p>
              <button type="button" class="btn btn-primary btn-sm" (click)="confirmLead()">Turn lead on</button>
              <button type="button" class="btn btn-light border btn-sm" (click)="keepLeadOff()">Keep it off</button>
            </div>
          }
        </fieldset>
      }
      <p class="settings-status" [class.is-problem]="problem()" role="status">{{ message() }}</p>
    </section>
  `,
  styles: `
    .settings-group + .settings-group {
      margin-top: 1rem;
    }
    .settings-confirm {
      border-left: 3px solid var(--gc-danger-text);
      margin-top: 0.5rem;
      padding: 0.25rem 0 0.25rem 0.75rem;
      p {
        margin-bottom: 0.5rem;
      }
      .btn + .btn {
        margin-left: 0.5rem;
      }
    }
    .swatch {
      display: inline-block;
      width: 1.1em;
      height: 1.1em;
      border-radius: 50%;
      border: 1px solid var(--gc-border);
      vertical-align: -0.15em;
      margin-right: 0.25rem;
    }
    .settings-status.is-problem {
      color: var(--gc-danger-text);
      font-weight: 600;
    }
  `
})
export class SettingsSection implements OnInit {
  protected readonly preferences = inject(PreferencesService);
  private readonly injector = inject(Injector);
  protected readonly settings = SETTINGS;
  protected readonly message = signal('');
  protected readonly problem = signal(false);
  /** Lead's "On" was chosen: it waits for the warning to be confirmed. */
  protected readonly confirmingLead = signal(false);

  ngOnInit(): void {
    void this.preferences.load();
  }

  protected current(setting: Setting): string {
    return this.preferences[setting.name]();
  }

  protected async choose(setting: Setting, choice: Choice): Promise<void> {
    this.message.set('');
    this.problem.set(false);
    if (setting.name === 'lead') {
      // Lead is turned on only once its warning is confirmed.
      if (choice.value === 'on' && this.current(setting) !== 'on') {
        this.confirmingLead.set(true);
        afterNextRender(() => document.getElementById('lead-confirm')?.focus(), { injector: this.injector });
        return;
      }
      this.confirmingLead.set(false);
    }
    await this.save(setting, choice);
  }

  protected confirmLead(): Promise<void> {
    this.confirmingLead.set(false);
    const setting = SETTINGS.find((s) => s.name === 'lead')!;
    return this.save(
      setting,
      setting.choices.find((c) => c.value === 'on')!
    );
  }

  /** Leaves lead off: "Off" is chosen again, with the focus on it. */
  protected keepLeadOff(): void {
    this.confirmingLead.set(false);
    const off = document.getElementById('lead-off') as HTMLInputElement | null;
    if (off) {
      off.checked = true;
      off.focus();
    }
  }

  private async save(setting: Setting, choice: Choice): Promise<void> {
    try {
      await this.preferences.set(setting.name, choice.value as Preferences[typeof setting.name]);
      if (this.current(setting) !== choice.value) return;
      this.message.set(choice.saved);
    } catch (err) {
      this.problem.set(true);
      this.message.set(errorMessage(err, 'The setting could not be saved. Please try again.'));
    }
  }
}
