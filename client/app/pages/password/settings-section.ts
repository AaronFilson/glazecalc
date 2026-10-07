import { Component, OnInit, inject, signal } from '@angular/core';
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
        </fieldset>
      }
      <p class="settings-status" [class.is-problem]="problem()" role="status">{{ message() }}</p>
    </section>
  `,
  styles: `
    .settings-group + .settings-group {
      margin-top: 1rem;
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
  protected readonly settings = SETTINGS;
  protected readonly message = signal('');
  protected readonly problem = signal(false);

  ngOnInit(): void {
    void this.preferences.load();
  }

  protected current(setting: Setting): string {
    return this.preferences[setting.name]();
  }

  protected async choose(setting: Setting, choice: Choice): Promise<void> {
    this.message.set('');
    this.problem.set(false);
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
