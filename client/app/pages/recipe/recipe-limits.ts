import { Component, computed, inject, input, model, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { formatFormula } from '../../../../lib/chemistry';
import { stullPoint } from '../../../../lib/recipe/analysis';
import { FIRING_BANDS, FiringBand, LIMIT_SETS, LimitRow, limitRows, unityFor } from '../../../../lib/recipe/limits';
import { LimitSetChoice, PreferencesService } from '../../core/preferences.service';
import { fixed, listOf } from '../../shared/format';
import { StullChart } from './stull-chart';

// The glaze against a limit set, as it is typed (docs/adr/0019-shared-recipe-tools.md):
// a row per range the chosen set has for the recipe's firing, and the Stull chart
// with the set's silica and alumina drawn on it. Hesselberth & Roy's set is the
// default and the choice is kept with the account's settings. The ranges are
// guidance, worded so: outside them is a reason to look, not a fault.

const SET_NAMES: Record<string, string> = {
  'hesselberth-roy': marker('recipe.limits.sets.hesselberth-roy'),
  glazecalc: marker('recipe.limits.sets.glazecalc')
};
const SET_NOTES: Record<string, string> = {
  'hesselberth-roy': marker('recipe.limits.notes.hesselberth-roy'),
  glazecalc: marker('recipe.limits.notes.glazecalc')
};
const BAND_NAMES: Record<FiringBand, string> = {
  low: marker('recipe.limits.bands.low'),
  mid: marker('recipe.limits.bands.mid'),
  high: marker('recipe.limits.bands.high')
};
const STATUS: Record<string, string> = {
  within: marker('recipe.limits.within'),
  below: marker('recipe.limits.below'),
  above: marker('recipe.limits.above'),
  wellBelow: marker('recipe.limits.wellBelow'),
  wellAbove: marker('recipe.limits.wellAbove')
};

/** Moles of an oxide from which leaving it out of a set is worth saying. */
const MEANINGFUL = 0.02;

/** 'K2O+Na2O' as K₂O + Na₂O. */
export const limitLabel = (key: string): string => key.split('+').map(formatFormula).join(' + ');

/** A range as the reader writes numbers: 0,25–0,40, at least 0,25, up to 0,33. */
export function rangeText(row: Pick<LimitRow, 'min' | 'max'>): string {
  const { min, max } = row;
  if (min !== undefined && max !== undefined) return fixed(min, 2) + '–' + fixed(max, 2);
  if (min !== undefined) return translate('recipe.limits.atLeast', { min: fixed(min, 2) });
  return translate('recipe.limits.upTo', { max: fixed(max ?? 0, 2) });
}

/** A row's status, in words. */
export function statusText(row: LimitRow): string {
  if (!row.past) return translate(STATUS['within']);
  if (row.past === 'below') return translate(row.likely ? STATUS['wellBelow'] : STATUS['below']);
  return translate(row.likely ? STATUS['wellAbove'] : STATUS['above']);
}

@Component({
  selector: 'gc-recipe-limits',
  imports: [StullChart, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="limits" aria-labelledby="limits-heading">
      <h3 id="limits-heading">{{ t('recipe.limits.heading') }}</h3>
      <div class="limits-choices">
        <div>
          <label for="limit-set" class="form-label">{{ t('recipe.limits.set') }}</label>
          <select id="limit-set" class="form-select form-select-sm" (change)="chooseSet($any($event.target))">
            @for (id of setIds; track id) {
              <option [value]="id" [selected]="id === set().id">{{ t(setNames[id]) }}</option>
            }
          </select>
        </div>
        <div>
          <label for="limit-firing" class="form-label">{{ t('recipe.limits.firing') }}</label>
          <select id="limit-firing" class="form-select form-select-sm" (change)="firing.set($any($event.target).value)">
            <option value="" [selected]="!firing()">{{ t('recipe.limits.firingUnknown') }}</option>
            @for (band of bands; track band) {
              <option [value]="band" [selected]="band === firing()">{{ t(bandNames[band]) }}</option>
            }
          </select>
        </div>
      </div>
      @if (saveFailed()) {
        <p class="limits-problem" role="alert">{{ t('recipe.limits.saveFailed') }}</p>
      }
      <p class="limits-note">{{ t(setNotes[set().id]) }}</p>
      @if (rows(); as rows) {
        @if (!firing()) {
          <p class="limits-note">{{ t('recipe.limits.shownFor', { band: t(bandNames[band()]) }) }}</p>
        }
        @if (cone(); as cone) {
          <p class="limits-note">{{ t('recipe.limits.cone', { cone }) }}</p>
        }
        <div class="table-responsive">
          <table class="table table-sm limits-table">
            <caption>
              {{
                t('recipe.limits.caption', { name: t(setNames[set().id]) })
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('recipe.limits.oxide') }}</th>
                <th scope="col" class="num">{{ t('recipe.limits.glaze') }}</th>
                <th scope="col" class="num">{{ t('recipe.limits.range') }}</th>
                <th scope="col">{{ t('recipe.limits.status') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track row.oxide) {
                <tr [class.limits-past]="row.past">
                  <th scope="row" class="formula" translate="no">{{ label(row.oxide) }}</th>
                  <td class="num">{{ value(row.value) }}</td>
                  <td class="num">{{ range(row) }}</td>
                  <td>{{ status(row) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p>{{ t('recipe.limits.outside', { count: outside() }) }}</p>
        @if (notInSet(); as note) {
          <p class="limits-note">{{ t(note.key, { oxides: note.oxides }) }}</p>
        }
      } @else {
        <p>{{ t('recipe.limits.notApply', { name: t(setNames[set().id]), band: t(bandNames[band()]) }) }}</p>
      }
      <p class="limits-note">{{ t('recipe.limits.guidance') }}</p>
      <p class="limits-note">
        {{ t('recipe.limits.source') }}
        @if (set().source.url; as url) {
          <a [href]="url" target="_blank" rel="noopener" translate="no">{{ set().source.title }}</a>
        } @else {
          <span translate="no">{{ set().source.title }}</span>
        }
      </p>
      <h3>{{ t('recipe.stull.heading') }}</h3>
      <gc-stull-chart [point]="point()" [ranges]="ranges()" [limitName]="t(setNames[set().id])" />
    </section>
  </ng-container>`,
  styles: `
    .limits-choices {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      margin-bottom: 0.5rem;
    }
    .limits-choices > div {
      flex: 1 1 12rem;
      min-width: 0;
    }
    .limits-note {
      font-size: 0.9rem;
      color: var(--gc-muted);
    }
    .limits-problem {
      color: var(--gc-danger-text);
    }
    .limits-table {
      font-variant-numeric: tabular-nums;
      margin-bottom: 0.5rem;
    }
    .limits-table caption {
      caption-side: top;
      color: var(--gc-muted);
      font-size: 0.9rem;
    }
    .num {
      text-align: end;
      white-space: nowrap;
    }
    .limits-past td:last-child {
      font-weight: 600;
    }
    h3 {
      font-size: 1.1rem;
      margin: 1rem 0 0.5rem;
    }
    h3:first-child {
      margin-top: 0.25rem;
    }
  `
})
export class RecipeLimits {
  /** The recipe's unity formula. */
  readonly unity = input.required<Record<string, number>>();
  /** The firing the recipe is for, saved with it; '' until chosen. */
  readonly firing = model<FiringBand | ''>('');

  private readonly preferences = inject(PreferencesService);
  protected readonly setIds = Object.keys(LIMIT_SETS) as LimitSetChoice[];
  protected readonly setNames = SET_NAMES;
  protected readonly setNotes = SET_NOTES;
  protected readonly bands = FIRING_BANDS;
  protected readonly bandNames = BAND_NAMES;
  protected readonly saveFailed = signal(false);

  /** The account's choice, which the note under the suggestions reads too (own-limits-note.ts). */
  protected readonly set = computed(() => LIMIT_SETS[this.preferences.limitSet()] ?? LIMIT_SETS['hesselberth-roy']);
  /** The band the figures are for: the recipe's firing, or the set's own choice when it has none. */
  protected readonly band = computed<FiringBand>(() => this.firing() || this.set().whenUnknown);
  protected readonly ranges = computed(() => unityFor(this.set(), this.band()));
  protected readonly rows = computed(() => limitRows(this.unity(), this.set(), this.band()));
  protected readonly cone = computed(() => this.set().cones?.[this.band()] ?? '');
  protected readonly outside = computed(() => (this.rows() ?? []).filter((row) => row.past).length);
  protected readonly point = computed(() => stullPoint(this.unity()));
  /**
   * What the set leaves unchecked, said briefly. A set that ranges over silica and the fluxes (Hesselberth
   * & Roy's) names the glaze's oxides it has no range for, when there is a meaningful amount of them; a
   * narrow set (Glazecalc's own) says in one sentence what it checks, since it leaves most oxides out.
   */
  protected readonly notInSet = computed<{ key: string; oxides: string } | null>(() => {
    const rows = this.rows() ?? [];
    const covered = new Set(rows.flatMap((row) => row.oxide.split('+')));
    if (!covered.has('SiO2')) {
      return rows.length
        ? { key: marker('recipe.limits.checksOnly'), oxides: listOf(rows.map((row) => limitLabel(row.oxide))) }
        : null;
    }
    const missing = Object.entries(this.unity())
      .filter(([oxide, moles]) => moles >= MEANINGFUL && !covered.has(oxide))
      .map(([oxide]) => formatFormula(oxide));
    return missing.length ? { key: marker('recipe.limits.notInSet'), oxides: listOf(missing) } : null;
  });

  protected readonly label = limitLabel;
  protected readonly range = rangeText;
  protected readonly status = statusText;
  protected value(value: number): string {
    return fixed(value, 2);
  }

  /** Kept with the account's settings; if saving fails, the choice before comes back (the service puts it back) and this says so. */
  protected chooseSet(select: HTMLSelectElement): void {
    this.saveFailed.set(false);
    this.preferences.set('limitSet', select.value as LimitSetChoice).catch(() => {
      // The choice before is back in the service; the box shows it again.
      select.value = this.set().id;
      this.saveFailed.set(true);
    });
  }
}
