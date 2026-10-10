import { Component, computed, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { RichText } from '../i18n/rich-text';
import { formatFormula } from '../../../lib/chemistry';
import { Additive, Material } from '../core/models';
import {
  CATEGORY_LABELS,
  REGIONS,
  byName,
  inRegion,
  matchesWords,
  readRegion,
  saveRegion,
  standardText,
  statusText
} from './library-info';
import { listOf } from './format';
import { PlainPipe } from './format-pipes';
import { fieldsText, firstOf } from './options';

let nextId = 0;

/**
 * The standard materials or additives: a table to filter by name or alias,
 * category and region, with each record's status, substitutes, source and
 * hazards. Old records stay in the list, marked, for comparing with old recipes.
 */
@Component({
  selector: 'gc-standard-list',
  imports: [PlainPipe, RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <div class="standard-tools">
      <div>
        <label class="form-label" [for]="id + '-filter'">{{ t('standard.filter') }}</label>
        <input
          [id]="id + '-filter'"
          type="search"
          class="form-control form-control-sm"
          [placeholder]="t('standard.filterPlaceholder')"
          autocomplete="off"
          [value]="filter()"
          (input)="filter.set($any($event.target).value)"
        />
      </div>
      <div>
        <label class="form-label" [for]="id + '-category'">{{ t('standard.kind') }}</label>
        <select
          [id]="id + '-category'"
          class="form-select form-select-sm"
          [value]="category()"
          (change)="category.set($any($event.target).value)"
        >
          <option value="">{{ t('standard.allKinds') }}</option>
          @for (option of categories(); track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>
      <div>
        <label class="form-label" [for]="id + '-region'">{{ t('standard.soldIn') }}</label>
        <select
          [id]="id + '-region'"
          class="form-select form-select-sm"
          (change)="setRegion($any($event.target).value)"
        >
          <!-- Each option says whether it is the one: a value on the select comes before its options. -->
          @for (option of regions; track option.value) {
            <option [value]="option.value" [selected]="option.value === region()">{{ option.label }}</option>
          }
        </select>
      </div>
      <p class="standard-count" role="status" [id]="id + '-count'">
        {{ t('standard.showing', { shown: shown().length, total: records().length, noun: noun() }) }}
      </p>
    </div>
    <!-- The table scrolls on its own on a narrow screen, so the page does not. -->
    <div class="standard-table-scroll" tabindex="0" role="region" [attr.aria-labelledby]="id + '-count'">
      <table class="table table-bordered standard-table">
        <thead>
          <tr>
            <th>{{ t('standard.name') }}</th>
            <th>{{ t('standard.equivalentWeight') }}</th>
            <th>{{ t('standard.firedWeight') }}</th>
            <th>{{ t('standard.notes') }}</th>
            <th>{{ t('standard.analysis') }}</th>
            <th>{{ t('standard.formula') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (record of shown(); track record._id ?? record.name) {
            <tr [class.not-current]="record.status && record.status !== 'current'">
              <td>
                {{ record.name }}
                @if (statusText(record); as status) {
                  <span class="status-badge">{{ status }}</span>
                }
              </td>
              <td>{{ record.equivalent | gcPlain }}</td>
              <td>{{ record.formulaweight | gcPlain }}</td>
              <td class="standard-notes">
                {{ standardText(record, firstOf(record.notes)) }}
                @if (record.substitutes?.length) {
                  @if (record.status && record.status !== 'current') {
                    <p class="standard-detail">
                      <gc-rich [text]="t('standard.useInstead', { list: listOf(record.substitutes!, 'unit') })" />
                    </p>
                  } @else {
                    <p class="standard-detail">
                      {{ t('standard.similar', { list: listOf(record.substitutes!, 'unit') }) }}
                    </p>
                  }
                }
                @if (record.replaces?.length) {
                  <p class="standard-detail">
                    {{ t('standard.replaces', { list: listOf(record.replaces!, 'unit') }) }}
                  </p>
                }
                @if (record.aliases?.length) {
                  <p class="standard-detail">{{ t('standard.aliases', { list: listOf(record.aliases!, 'unit') }) }}</p>
                }
                @if (record.manufacturer) {
                  <p class="standard-detail">{{ t('standard.madeBy', { name: record.manufacturer }) }}</p>
                }
                @if (record.source; as source) {
                  <p class="standard-detail">
                    {{ t('standard.source') }}
                    @if (source.url) {
                      <a [href]="source.url" target="_blank" rel="noopener">{{ source.name }}</a>
                    } @else {
                      {{ source.name }}
                    }
                    @if (source.date) {
                      ({{ source.date }})
                    }
                  </p>
                }
                @if (record.hazards) {
                  <details class="standard-detail">
                    <summary>{{ t('standard.hazards') }}</summary>
                    {{ standardText(record, record.hazards) }}
                  </details>
                }
              </td>
              <td>
                @if (record.noChemistry) {
                  <span class="muted">{{ t('standard.noChemistry') }}</span>
                } @else if (record.chemistryOf) {
                  <span class="muted">{{ t('standard.countedAs', { name: record.chemistryOf }) }}</span>
                } @else {
                  {{ fieldsText(record) }}
                }
              </td>
              <td translate="no">{{ formatFormula(record.rawformula) }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="muted">
                @if (records().length) {
                  {{ t('standard.nothingMatches') }}
                } @else if (failed()) {
                  <gc-rich [text]="t('standard.notFetched')" [links]="{ retry: tryAgain }" />
                } @else {
                  {{ t('standard.loading') }}
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </ng-container>`
})
export class StandardList {
  readonly records = input.required<Array<Material | Additive>>();
  /** What the list holds: 'materials' or 'additives'. */
  readonly noun = input.required<string>();
  /** The list could not be fetched: it says so, with a button to ask for it again (retry). */
  readonly failed = input(false);
  readonly retry = output<void>();

  protected readonly id = 'standard-' + nextId++;
  protected readonly regions = REGIONS;
  protected readonly filter = signal('');
  protected readonly category = signal('');
  protected readonly region = signal(readRegion());
  protected readonly statusText = statusText;
  protected readonly standardText = standardText;
  protected readonly listOf = listOf;
  protected readonly fieldsText = fieldsText;
  protected readonly firstOf = firstOf;
  protected readonly formatFormula = formatFormula;

  /** The kinds the list holds, in the order of CATEGORY_LABELS. */
  protected readonly categories = computed(() => {
    const present = new Set(this.records().map((record) => record.category));
    return Object.entries(CATEGORY_LABELS)
      .filter(([value]) => present.has(value))
      .map(([value, label]) => ({ value, label }));
  });

  protected readonly shown = computed(() =>
    this.records()
      .filter(
        (record) =>
          matchesWords(record, this.filter()) &&
          (!this.category() || record.category === this.category()) &&
          inRegion(record, this.region())
      )
      .sort(byName)
  );

  protected setRegion(region: string): void {
    this.region.set(region);
    saveRegion(region);
  }

  protected readonly tryAgain = (): void => this.retry.emit();
}
