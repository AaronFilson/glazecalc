import { Component, Injector, OnInit, afterNextRender, inject, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { CURRENCIES, FORMAT_LOCALES, REGIONS, formatLocaleFor } from '../../../../lib/regions';
import { baseLanguage, languageFor, textLanguage } from '../../../../lib/regions/languages';
import { dateTimeFormat, numberFormat } from '../../../../lib/regions/locale-fallback';
import { errorMessage } from '../../core/error-message';
import { LocaleService } from '../../core/locale.service';
import { Preferences, PreferencesService } from '../../core/preferences.service';
import { PricesService } from '../../core/prices.service';
import { PALETTES } from '../../core/theme';
import { OFFERED_LANGUAGES, OPEN_PAGE, PAGE_LANGUAGE, languageName, pathIn } from '../../i18n/language';
import { languageItems } from '../../i18n/language-groups';
import { Picker, PickerItem } from '../../shared/picker';
import { regionItems } from '../../shared/region-items';
import { textDigitsFor, withTextDigits } from '../../shared/text-digits';

// The words of a setting and its choices are read each time they are shown,
// so they are in the page's language and none is translated as the app loads.

interface Choice {
  value: string;
  readonly label: string;
  readonly example?: string;
  /** A palette's color, light and dark. */
  swatch?: readonly [string, string];
  /** Said once it is saved. */
  readonly saved: string;
}

/** What a searchable list needs besides its choices (shared/picker.ts). */
interface PickerOptions {
  readonly items: readonly PickerItem[];
  readonly placeholder: string;
  readonly showAll: string;
  readonly noMatch: string;
}

interface Setting {
  name: keyof Preferences;
  /** A list to choose from, for long lists, or a searchable list for the longest; radio buttons otherwise. */
  kind?: 'select' | 'picker';
  /** The searchable list's words and groups, for 'picker'. */
  picker?: PickerOptions;
  /** The start of each radio button's id: weight-unit-g. */
  id: string;
  readonly legend: string;
  choices: Choice[];
  readonly help: string;
}

/**
 * A choice whose label and "Saved" message are messages, by their keys. Its
 * example is shown as it is (12.5, 1240 °C), or read when shown if it has words.
 */
const choice = (value: string, label: string, saved: string, example?: string | (() => string)): Choice => ({
  value,
  get label() {
    return translate(label);
  },
  get example() {
    return typeof example === 'function' ? example() : example;
  },
  get saved() {
    return translate(saved);
  }
});

/** A setting whose legend and help are messages, by their keys. */
const setting = (
  legend: string,
  help: string,
  fields: Pick<Setting, 'name' | 'kind' | 'id' | 'choices' | 'picker'>
): Setting => ({
  ...fields,
  get legend() {
    return translate(legend);
  },
  get help() {
    return translate(help);
  }
});

// A sample for each number and date format: 12345.6 and 8 October 2026.
const SAMPLE_DATE = new Date(2026, 9, 8);
const sampleNumber = (locale: string): string =>
  numberFormat(locale, {
    maximumFractionDigits: 1,
    useGrouping: 'min2'
  } as unknown as Intl.NumberFormatOptions).format(12345.6);
const sampleOf = (locale: string): string =>
  sampleNumber(locale) + ' · ' + dateTimeFormat(locale, { dateStyle: 'short' }).format(SAMPLE_DATE);

/**
 * The settings, with the names of regions and of languages in the page's
 * language (en, de, en-XA). The language is offered when there is more than
 * one; English terms and the translation notice only on a translated page.
 */
function settingsIn(pageLanguage: string, offered: readonly string[]): Setting[] {
  const translated = baseLanguage(pageLanguage) !== 'en' || pageLanguage !== 'en';
  const language = textLanguage(pageLanguage);
  const regionNames = new Intl.DisplayNames([language], { type: 'region' });
  const languageNames = new Intl.DisplayNames([language], { type: 'language' });
  const currencyNames = new Intl.DisplayNames([language], { type: 'currency' });
  const regions = REGIONS.map((region) => ({ code: region.code, name: regionNames.of(region.code) ?? region.name }));
  const languageSetting = setting(
    marker('account.settings.language.legend'),
    marker('account.settings.language.help'),
    {
      name: 'language',
      id: 'language',
      kind: 'picker',
      picker: {
        items: languageItems(offered),
        placeholder: translate('picker.languages.search'),
        showAll: translate('picker.languages.showAll'),
        noMatch: translate('picker.languages.noMatch')
      },
      choices: offered.map((code) => ({
        value: code,
        label: languageName(code),
        get saved() {
          return translate('account.settings.language.saved', { language: languageName(code) });
        }
      }))
    }
  );
  const density = setting(marker('account.settings.density.legend'), marker('account.settings.density.help'), {
    name: 'density',
    id: 'density',
    choices: [
      choice('sg', marker('account.settings.density.sg.label'), marker('account.settings.density.sg.saved'), () =>
        translate('account.settings.density.sg.example')
      ),
      choice(
        'baume',
        marker('account.settings.density.baume.label'),
        marker('account.settings.density.baume.saved'),
        '45 °Bé'
      ),
      choice(
        'pint',
        marker('account.settings.density.pint.label'),
        marker('account.settings.density.pint.saved'),
        '29 oz'
      )
    ]
  });
  const forTranslatedPages = [
    setting(marker('account.settings.englishTerms.legend'), marker('account.settings.englishTerms.help'), {
      name: 'englishTerms',
      id: 'english-terms',
      choices: [
        choice(
          'off',
          marker('account.settings.englishTerms.off.label'),
          marker('account.settings.englishTerms.off.saved')
        ),
        choice('on', marker('account.settings.englishTerms.on.label'), marker('account.settings.englishTerms.on.saved'))
      ]
    }),
    setting(marker('account.settings.notice.legend'), marker('account.settings.notice.help'), {
      name: 'notice',
      id: 'notice',
      choices: [
        choice('shown', marker('account.settings.notice.shown.label'), marker('account.settings.notice.shown.saved')),
        choice(
          'hidden',
          marker('account.settings.notice.hidden.label'),
          // Where a line of it stays: on every page in the languages AI translates less well.
          languageFor(pageLanguage)?.plainNotice
            ? marker('account.settings.notice.hidden.savedPlain')
            : marker('account.settings.notice.hidden.saved')
        )
      ]
    })
  ];
  const settings = [
    ...(offered.length > 1 ? [languageSetting] : []),
    setting(marker('account.settings.region.legend'), marker('account.settings.region.help'), {
      name: 'region',
      id: 'region',
      kind: 'picker',
      picker: {
        items: [
          { value: '', label: translate('account.settings.region.none.label'), group: '' },
          ...regionItems(regions, pageLanguage)
        ],
        placeholder: translate('picker.regions.search'),
        showAll: translate('picker.regions.showAll'),
        noMatch: translate('picker.regions.noMatch')
      },
      choices: [
        choice('', marker('account.settings.region.none.label'), marker('account.settings.region.none.saved')),
        ...regions
          .sort((a, b) => a.name.localeCompare(b.name, language))
          .map((region) => ({
            value: region.code,
            label: region.name,
            get saved() {
              return translate('account.settings.region.saved', { region: region.name });
            }
          }))
      ]
    }),
    setting(marker('account.settings.format.legend'), marker('account.settings.format.help'), {
      name: 'format',
      id: 'format',
      kind: 'select',
      choices: [
        choice('auto', marker('account.settings.format.auto.label'), marker('account.settings.format.auto.saved')),
        ...FORMAT_LOCALES.map((locale) => {
          const name = languageNames.of(locale) ?? locale;
          return {
            value: locale,
            label: name,
            example: sampleOf(locale),
            get saved() {
              return translate('account.settings.format.saved', { language: name });
            }
          };
        })
      ]
    }),
    // The calendar dates are shown in; each choice's example is a date as it would be shown now
    // (settings-section exampleOf).
    setting(marker('account.settings.calendar.legend'), marker('account.settings.calendar.help'), {
      name: 'calendar',
      id: 'calendar',
      choices: [
        choice(
          'gregory',
          marker('account.settings.calendar.gregory.label'),
          marker('account.settings.calendar.gregory.saved')
        ),
        choice(
          'buddhist',
          marker('account.settings.calendar.buddhist.label'),
          marker('account.settings.calendar.buddhist.saved')
        ),
        choice(
          'japanese',
          marker('account.settings.calendar.japanese.label'),
          marker('account.settings.calendar.japanese.saved')
        )
      ]
    }),
    // The digits numbers are shown in; each choice's example is a number as it would be shown now
    // (settings-section exampleOf): ١٢٬٣٤٥٫٦ for Arabic in Egypt as usual, 12,345.6 in 0–9.
    setting(marker('account.settings.digits.legend'), marker('account.settings.digits.help'), {
      name: 'digits',
      id: 'digits',
      choices: [
        choice('auto', marker('account.settings.digits.auto.label'), marker('account.settings.digits.auto.saved')),
        choice(
          'western',
          marker('account.settings.digits.western.label'),
          marker('account.settings.digits.western.saved')
        ),
        choice('native', marker('account.settings.digits.native.label'), marker('account.settings.digits.native.saved'))
      ]
    }),
    setting(marker('account.settings.decimalMark.legend'), marker('account.settings.decimalMark.help'), {
      name: 'decimalMark',
      id: 'decimal-mark',
      choices: [
        choice(
          'either',
          marker('account.settings.decimalMark.either.label'),
          marker('account.settings.decimalMark.either.saved'),
          () => translate('account.settings.decimalMark.either.example')
        ),
        choice(
          'comma',
          marker('account.settings.decimalMark.comma.label'),
          marker('account.settings.decimalMark.comma.saved'),
          '12,5'
        ),
        choice(
          'point',
          marker('account.settings.decimalMark.point.label'),
          marker('account.settings.decimalMark.point.saved'),
          '12.5'
        )
      ]
    }),
    setting(marker('account.settings.temperature.legend'), marker('account.settings.temperature.help'), {
      name: 'temperature',
      id: 'temperature',
      choices: [
        choice(
          'C',
          marker('account.settings.temperature.celsius.label'),
          marker('account.settings.temperature.celsius.saved'),
          '1240 °C'
        ),
        choice(
          'F',
          marker('account.settings.temperature.fahrenheit.label'),
          marker('account.settings.temperature.fahrenheit.saved'),
          '2264 °F'
        )
      ]
    }),
    setting(marker('account.settings.cones.legend'), marker('account.settings.cones.help'), {
      name: 'cones',
      id: 'cones',
      choices: [
        choice(
          'orton',
          marker('account.settings.cones.orton.label'),
          marker('account.settings.cones.orton.saved'),
          () => translate('account.settings.cones.orton.example')
        ),
        choice('sk', marker('account.settings.cones.sk.label'), marker('account.settings.cones.sk.saved'), () =>
          translate('account.settings.cones.sk.example')
        ),
        choice(
          'temperature',
          marker('account.settings.cones.temperature.label'),
          marker('account.settings.cones.temperature.saved'),
          '1060 °C'
        )
      ]
    }),
    density,
    // The one currency prices are in (cost per batch); its names in the page's language.
    setting(marker('account.settings.currency.legend'), marker('account.settings.currency.help'), {
      name: 'currency',
      id: 'currency',
      kind: 'select',
      choices: CURRENCIES.map((code) => {
        const name = currencyNames.of(code) ?? code;
        return {
          value: code,
          label: name,
          example: code,
          get saved() {
            return translate('account.settings.currency.saved', { currency: name });
          }
        };
      }).sort((a, b) => a.label.localeCompare(b.label, language))
    }),
    setting(marker('account.settings.theme.legend'), marker('account.settings.theme.help'), {
      name: 'theme',
      id: 'theme',
      choices: [
        choice('system', marker('account.settings.theme.system.label'), marker('account.settings.theme.system.saved')),
        choice('light', marker('account.settings.theme.light.label'), marker('account.settings.theme.light.saved')),
        choice('dark', marker('account.settings.theme.dark.label'), marker('account.settings.theme.dark.saved'))
      ]
    }),
    setting(marker('account.settings.palette.legend'), marker('account.settings.palette.help'), {
      name: 'palette',
      id: 'palette',
      choices: PALETTES.map((palette) => ({
        value: palette.value,
        get label() {
          return palette.label;
        },
        swatch: palette.swatch,
        get saved() {
          return translate('account.settings.palette.saved', { palette: palette.label });
        }
      }))
    }),
    setting(marker('account.settings.weightUnit.legend'), marker('account.settings.weightUnit.help'), {
      name: 'weightUnit',
      id: 'weight-unit',
      choices: [
        choice(
          'g',
          marker('account.settings.weightUnit.grams.label'),
          marker('account.settings.weightUnit.grams.saved'),
          '1250 g'
        ),
        choice(
          'lb',
          marker('account.settings.weightUnit.pounds.label'),
          marker('account.settings.weightUnit.pounds.saved'),
          '2 lb 12.1 oz'
        )
      ]
    }),
    setting(marker('account.settings.gramPrecision.legend'), marker('account.settings.gramPrecision.help'), {
      name: 'gramPrecision',
      id: 'gram-precision',
      choices: [
        choice(
          'single',
          marker('account.settings.gramPrecision.single.label'),
          marker('account.settings.gramPrecision.single.saved'),
          '4938.2 g'
        ),
        choice(
          'full',
          marker('account.settings.gramPrecision.full.label'),
          marker('account.settings.gramPrecision.full.saved'),
          '4938.23517 g'
        )
      ]
    }),
    setting(marker('account.settings.lead.legend'), marker('account.settings.lead.help'), {
      name: 'lead',
      id: 'lead',
      choices: [
        choice('off', marker('account.settings.lead.off.label'), marker('account.settings.lead.off.saved')),
        choice('on', marker('account.settings.lead.on.label'), marker('account.settings.lead.on.saved'))
      ]
    }),
    ...(translated ? forTranslatedPages : [])
  ];
  return settings;
}

/** The account's settings, on the account page. A trial has them too. */
@Component({
  selector: 'gc-settings',
  imports: [Picker, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="auth-text settings" aria-labelledby="settings-heading">
      <h2 id="settings-heading" tabindex="-1">{{ t('account.settings.heading') }}</h2>
      <p class="muted">{{ t('account.settings.intro') }}</p>
      @for (setting of settings; track setting.name) {
        @if (setting.kind === 'picker') {
          <div class="settings-group">
            <label class="form-label" [for]="setting.id">{{ setting.legend }}</label>
            <gc-picker
              [inputId]="setting.id"
              [label]="setting.legend"
              [items]="setting.picker!.items"
              [value]="current(setting)"
              [placeholder]="setting.picker!.placeholder"
              [showAll]="setting.picker!.showAll"
              [noMatch]="setting.picker!.noMatch"
              (chosen)="chooseValue(setting, $event)"
            />
            <div class="form-text">{{ setting.help }}</div>
          </div>
        } @else if (setting.kind === 'select') {
          <div class="settings-group">
            <label class="form-label" [for]="setting.id">{{ setting.legend }}</label>
            <select class="form-select" [id]="setting.id" (change)="chooseValue(setting, $any($event.target).value)">
              @for (choice of setting.choices; track choice.value) {
                <option [value]="choice.value" [selected]="current(setting) === choice.value">
                  {{ choice.label }}{{ exampleOf(setting, choice) ? ' (' + exampleOf(setting, choice) + ')' : '' }}
                </option>
              }
            </select>
            <div class="form-text">{{ setting.help }}</div>
          </div>
        } @else {
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
                  @if (exampleOf(setting, choice); as example) {
                    <span class="muted">({{ example }})</span>
                  }
                </label>
              </div>
            }
            <div class="form-text">{{ setting.help }}</div>
            @if (setting.name === 'lead' && confirmingLead()) {
              <div class="settings-confirm">
                <p id="lead-confirm" tabindex="-1">{{ t('account.settings.lead.warning') }}</p>
                <button type="button" class="btn btn-primary btn-sm" (click)="confirmLead()">
                  {{ t('account.settings.lead.turnOn') }}
                </button>
                <button type="button" class="btn btn-light border btn-sm" (click)="keepLeadOff()">
                  {{ t('account.settings.lead.keepOff') }}
                </button>
              </div>
            }
          </fieldset>
        }
      }
      <p class="settings-status" [class.is-problem]="problem()" role="status">{{ message() }}</p>
    </section>
  </ng-container>`,
  styles: `
    .settings-group + .settings-group {
      margin-top: 1rem;
    }
    /* The lists to search are not stretched across a wide window. */
    gc-picker {
      max-width: 30rem;
    }
    .settings-confirm {
      border-inline-start: 3px solid var(--gc-danger-text);
      margin-top: 0.5rem;
      padding-block: 0.25rem;
      padding-inline: 0.75rem 0;
      p {
        margin-bottom: 0.5rem;
      }
      .btn + .btn {
        margin-inline-start: 0.5rem;
      }
    }
    .swatch {
      display: inline-block;
      width: 1.1em;
      height: 1.1em;
      border-radius: 50%;
      border: 1px solid var(--gc-border);
      vertical-align: -0.15em;
      margin-inline-end: 0.25rem;
    }
    .settings-status.is-problem {
      color: var(--gc-danger-text);
      font-weight: 600;
    }
  `
})
export class SettingsSection implements OnInit {
  protected readonly preferences = inject(PreferencesService);
  private readonly locale = inject(LocaleService);
  private readonly prices = inject(PricesService);
  private readonly injector = inject(Injector);
  private readonly pageLanguage = inject(PAGE_LANGUAGE);
  private readonly openPage = inject(OPEN_PAGE);
  protected readonly settings = settingsIn(this.pageLanguage, inject(OFFERED_LANGUAGES));
  protected readonly message = signal('');
  protected readonly problem = signal(false);
  /** Lead's "On" was chosen: it waits for the warning to be confirmed. */
  protected readonly confirmingLead = signal(false);

  ngOnInit(): void {
    void this.preferences.load();
  }

  /** What is in effect: for temperature, cones, density and currency, the region's until one is chosen. */
  protected current(setting: Setting): string {
    if (setting.name === 'temperature') return this.locale.temperature();
    if (setting.name === 'cones') return this.locale.cones();
    if (setting.name === 'density') return this.locale.density();
    if (setting.name === 'currency') return this.locale.currency();
    // The language of this page, whatever is saved.
    if (setting.name === 'language') return this.pageLanguage;
    return this.preferences[setting.name]();
  }

  /**
   * A choice's example; for "as my language and region", how numbers and dates are written now; for a
   * calendar, the sample date as it would be shown in it; for digits, the sample number in them.
   */
  protected exampleOf(setting: Setting, choice: Choice): string {
    const { language, region } = this.locale;
    if (setting.name === 'calendar') {
      const locale = formatLocaleFor(
        language(),
        region(),
        this.preferences.format(),
        choice.value,
        this.preferences.digits()
      );
      try {
        return dateTimeFormat(locale, { dateStyle: 'long' }).format(SAMPLE_DATE);
      } catch {
        return '';
      }
    }
    if (setting.name === 'digits') {
      const locale = formatLocaleFor(
        language(),
        region(),
        this.preferences.format(),
        this.preferences.calendar(),
        choice.value
      );
      try {
        return sampleNumber(locale);
      } catch {
        return '';
      }
    }
    if (setting.name === 'format') {
      // The date in the calendar and the digits chosen now, so Thai shows Gregorian by default and Buddhist when
      // chosen, and Arabic in Egypt shows its own digits unless 0–9 are chosen.
      const locale =
        choice.value === 'auto'
          ? this.locale.locale()
          : formatLocaleFor(language(), region(), choice.value, this.preferences.calendar(), this.preferences.digits());
      try {
        return sampleOf(locale);
      } catch {
        return '';
      }
    }
    // Amounts are typed in 0–9 (or any digits), so the typing examples show 0–9; the others (1240 °C) are in the
    // digits the page's figures are in (shared/text-digits.ts).
    if (setting.name === 'decimalMark') return choice.example ?? '';
    return withTextDigits(choice.example ?? '', textDigitsFor(language()));
  }

  protected chooseValue(setting: Setting, value: string): Promise<void> {
    const choice = setting.choices.find((c) => c.value === value);
    return choice ? this.choose(setting, choice) : Promise.resolve();
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
    const setting = this.settings.find((s) => s.name === 'lead')!;
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
      // A page's language is its address: the same page opens in the one chosen.
      if (setting.name === 'language') {
        if (choice.value !== this.pageLanguage) {
          this.openPage(pathIn(choice.value, location.pathname, location.search + location.hash));
        }
        return;
      }
      if (this.current(setting) !== choice.value) return;
      this.message.set(choice.saved);
      // Prices already given stay as they are: the numbers are not converted to the new currency.
      if (setting.name === 'currency') {
        await this.prices.load();
        if (this.prices.prices()?.length && this.message() === choice.saved) {
          this.message.set(choice.saved + ' ' + translate('account.settings.currency.notConverted'));
        }
      }
    } catch (err) {
      this.problem.set(true);
      this.message.set(errorMessage(err, translate('account.settings.saveFailed')));
    }
  }
}
