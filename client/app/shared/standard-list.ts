import { Component, computed, input, signal } from '@angular/core';
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
  statusText
} from './library-info';
import { fieldsText, firstOf } from './options';

let nextId = 0;

/**
 * The standard materials or additives: a table to filter by name or alias,
 * category and region, with each record's status, substitutes, source and
 * hazards. Old records stay in the list, marked, for comparing with old recipes.
 */
@Component({
  selector: 'gc-standard-list',
  template: `
    <div class="standard-tools">
      <div>
        <label class="form-label" [for]="id + '-filter'">Filter</label>
        <input
          [id]="id + '-filter'"
          type="search"
          class="form-control form-control-sm"
          placeholder="Name or other name"
          autocomplete="off"
          [value]="filter()"
          (input)="filter.set($any($event.target).value)"
        />
      </div>
      <div>
        <label class="form-label" [for]="id + '-category'">Kind</label>
        <select
          [id]="id + '-category'"
          class="form-select form-select-sm"
          [value]="category()"
          (change)="category.set($any($event.target).value)"
        >
          <option value="">All kinds</option>
          @for (option of categories(); track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>
      <div>
        <label class="form-label" [for]="id + '-region'">Sold in</label>
        <select
          [id]="id + '-region'"
          class="form-select form-select-sm"
          [value]="region()"
          (change)="setRegion($any($event.target).value)"
        >
          @for (option of regions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>
      <p class="standard-count" role="status">Showing {{ shown().length }} of {{ records().length }} {{ noun() }}</p>
    </div>
    <table class="table table-bordered standard-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Equivalent Weight</th>
          <th>Fired Weight</th>
          <th>Notes</th>
          <th>Analysis</th>
          <th>Formula</th>
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
            <td>{{ record.equivalent }}</td>
            <td>{{ record.formulaweight }}</td>
            <td class="standard-notes">
              {{ firstOf(record.notes) }}
              @if (record.substitutes?.length && record.status && record.status !== 'current') {
                <p class="standard-detail"><b>Use instead:</b> {{ record.substitutes!.join(', ') }}</p>
              }
              @if (record.aliases?.length) {
                <p class="standard-detail">Also called: {{ record.aliases!.join(', ') }}</p>
              }
              @if (record.manufacturer) {
                <p class="standard-detail">Made by: {{ record.manufacturer }}</p>
              }
              @if (record.source; as source) {
                <p class="standard-detail">
                  Source:
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
                  <summary>Hazards</summary>
                  {{ record.hazards }}
                </details>
              }
            </td>
            <td>
              @if (record.noChemistry) {
                <span class="muted">No chemistry: left out of the unity formula</span>
              } @else if (record.chemistryOf) {
                <span class="muted">Counted as {{ record.chemistryOf }}</span>
              } @else {
                {{ fieldsText(record) }}
              }
            </td>
            <td>{{ formatFormula(record.rawformula) }}</td>
          </tr>
        } @empty {
          <tr>
            <td colspan="6" class="muted">
              @if (records().length) {
                Nothing matches. Try another name, kind or region.
              } @else {
                Loading...
              }
            </td>
          </tr>
        }
      </tbody>
    </table>
  `
})
export class StandardList {
  readonly records = input.required<Array<Material | Additive>>();
  /** Plural, lower case: 'materials', 'additives'. */
  readonly noun = input.required<string>();

  protected readonly id = 'standard-' + nextId++;
  protected readonly regions = REGIONS;
  protected readonly filter = signal('');
  protected readonly category = signal('');
  protected readonly region = signal(readRegion());
  protected readonly statusText = statusText;
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
}
