import { fixed, forTyping, formatDate, formatPlain, listOf, money, upTo } from '../../shared/format';
import { DatePipe } from '../../shared/format-pipes';
import { NumberInput } from '../../shared/number-input';
import { Component, Injector, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { MaterialInput, formatFormula } from '../../../../lib/chemistry';
import { recipeCost } from '../../../../lib/recipe/cost';
import { errorMessage } from '../../core/error-message';
import { Recipe } from '../../core/models';
import { LocaleService } from '../../core/locale.service';
import { PreferencesService } from '../../core/preferences.service';
import { PricesService } from '../../core/prices.service';
import { firstOf } from '../../shared/options';
import {
  GRAMS_PER_POUND,
  GramPrecision,
  WeightUnit,
  formatWeight,
  fromGrams,
  toGrams,
  unitLabel
} from '../../shared/weights';
import { BatchWeights, amountOf, batchWeights, formatAmount, isAmount, totalOf } from './rebase';
import { additiveAmount, evaluate } from './recipe-analysis';
import { HazardSource, RecipeHazards } from './recipe-hazards';
import { libraryKey } from './recipe-library';
import { UnityFormula, unityColumns } from './unity-formula';
import { WorkedCalculation } from './worked-calculation';
import { firingWords } from './firing-text';
import { ConeSummaries } from './recipe-cone-cards';

/** What to print: the whole recipe with its chemistry, just what to weigh, or the unity formula worked step by step. */
export type PrintMode = 'full' | 'batch' | 'worked';
const MODES: readonly PrintMode[] = ['full', 'batch', 'worked'];

export interface PrintLine {
  name: string;
  /** A material's chemical formula, with subscripts. */
  formula: string;
  /** The amount as the recipe gives it: 23.5, 2%, 3 parts. */
  amount: string;
  /** A material's share of the base: 23.5%. */
  share: string;
  /** What to weigh for the batch (blank without a batch size). */
  weigh: string;
  /** The scale's reading once this is in, weighing everything into one bucket in this order. */
  runningTotal: string;
}

export interface PrintLines {
  materials: PrintLine[];
  additives: PrintLine[];
  /** The materials' amounts added up, as written. */
  total: string;
  weights: BatchWeights | null;
  /** Amounts that are not numbers ("12,5"), which leave the recipe with no weights to print. */
  unreadable: string[];
}

// A number and its unit stay on one line: "2 lb" and "12.1 oz" in "2 lb 12.1 oz".
const keepTogether = (weight: string): string => weight.replace(/ (?=g|lb|oz)/g, ' ');

/**
 * The lines of a printed recipe, with what to weigh for a batch whose base
 * (the materials) weighs `baseGrams`; with no batch size, the amounts only.
 * An amount that is not a number (from an old recipe, say) would weigh as 0 g,
 * so then there are no weights, and it is listed in `unreadable`.
 */
export function printLines(
  recipe: Pick<Recipe, 'materials' | 'additives'>,
  baseGrams: number,
  unit: WeightUnit,
  precision: GramPrecision = 'single'
): PrintLines {
  const materials = recipe.materials ?? [];
  const additives = recipe.additives ?? [];
  const total = totalOf(materials.map((m) => m.amount));
  const unreadable = [...materials, ...additives]
    .filter((line) => !isAmount(line.amount))
    .map((line) => translate('recipe.print.notANumber', { name: line.name, amount: line.amount ?? '' }));
  const weights = unreadable.length
    ? null
    : batchWeights(
        materials.map((m) => m.amount),
        additives,
        baseGrams
      );
  let running = 0;
  const weighed = (grams: number | undefined) => {
    if (grams === undefined) return { weigh: '', runningTotal: '' };
    running += grams;
    return {
      weigh: keepTogether(formatWeight(grams, unit, precision)),
      runningTotal: keepTogether(formatWeight(running, unit, precision))
    };
  };
  return {
    materials: materials.map((material, i) => ({
      name: material.name,
      formula: material.rawformula ? formatFormula(material.rawformula) : '',
      amount: formatPlain((material.amount ?? '').trim()),
      share: total && amountOf(material.amount) ? upTo((amountOf(material.amount) / total) * 100, 1) + '%' : '',
      ...weighed(weights?.materials[i])
    })),
    additives: additives.map((additive, i) => ({
      name: additive.name,
      formula: '',
      amount: additiveAmount(additive),
      share: '',
      ...weighed(weights?.additives[i])
    })),
    total: upTo(total, 3),
    weights,
    unreadable
  };
}

/** A batch size as typed (a plain number, as a number box saves it), and the unit it was typed in. */
interface BatchSize {
  text: string;
  unit: WeightUnit;
}

const MODE_KEY = 'printMode';
const BATCH_KEY = 'printBatch';
const DEFAULT_BATCH: BatchSize = { text: '1000', unit: 'g' };

// The last choices, on this browser.
function readMode(): PrintMode {
  try {
    const saved = localStorage.getItem(MODE_KEY) as PrintMode | null;
    return saved && MODES.includes(saved) ? saved : 'full';
  } catch {
    return 'full';
  }
}

function readBatch(): BatchSize {
  try {
    const saved = JSON.parse(localStorage.getItem(BATCH_KEY) ?? 'null') as Partial<BatchSize> | null;
    if (typeof saved?.text === 'string' && (saved.unit === 'g' || saved.unit === 'lb')) {
      return { text: saved.text, unit: saved.unit };
    }
  } catch {
    // Unreadable: start from the default.
  }
  return DEFAULT_BATCH;
}

function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Without storage the choice holds until the page is left.
  }
}

/** The units to weigh in, each with its label's key. */
const UNITS: ReadonlyArray<{ value: WeightUnit; label: string }> = [
  { value: 'g', label: marker('recipe.print.grams') },
  { value: 'lb', label: marker('recipe.print.pounds') }
];

/**
 * A recipe laid out for paper, for the glaze room: the whole recipe with its
 * unity formula and analysis, or just a batch list to tick off while weighing.
 * The options above it are not printed (styles.scss hides .no-print).
 */
@Component({
  selector: 'gc-recipe-print',
  imports: [ConeSummaries, DatePipe, NumberInput, RecipeHazards, TranslocoDirective, UnityFormula, WorkedCalculation],
  template: `<ng-container *transloco="let t">
    <section class="print-controls no-print" aria-labelledby="print-heading">
      <h1 id="print-heading" tabindex="-1">{{ t('recipe.print.heading') }}</h1>
      <div class="print-options">
        <fieldset>
          <legend class="form-label">{{ t('recipe.print.what') }}</legend>
          <div class="form-check">
            <input
              id="print-full"
              class="form-check-input"
              type="radio"
              name="print-mode"
              value="full"
              [checked]="mode() === 'full'"
              (change)="setMode('full')"
            />
            <label for="print-full" class="form-check-label">{{ t('recipe.print.whole') }}</label>
          </div>
          <div class="form-check">
            <input
              id="print-batch-list"
              class="form-check-input"
              type="radio"
              name="print-mode"
              value="batch"
              [checked]="mode() === 'batch'"
              (change)="setMode('batch')"
            />
            <label for="print-batch-list" class="form-check-label">{{ t('recipe.print.batchList') }}</label>
          </div>
          <div class="form-check">
            <input
              id="print-worked"
              class="form-check-input"
              type="radio"
              name="print-mode"
              value="worked"
              [checked]="mode() === 'worked'"
              (change)="setMode('worked')"
            />
            <label for="print-worked" class="form-check-label">{{ t('recipe.print.worked') }}</label>
          </div>
        </fieldset>
        <!-- The worked calculation reads the amounts as grams; a batch size and its unit change nothing in it. -->
        <div [hidden]="mode() === 'worked'">
          <label for="print-batch-size" class="form-label">{{ t('recipe.print.batchSize') }}</label>
          <div class="input-group print-batch-size">
            <input
              id="print-batch-size"
              class="form-control"
              inputmode="decimal"
              autocomplete="off"
              [attr.aria-describedby]="batchProblem() ? 'print-batch-help print-batch-problem' : 'print-batch-help'"
              [attr.aria-invalid]="batchProblem() || null"
              [gcNumber]="batchText()"
              (gcNumberChange)="setBatch($event)"
            />
            <span class="input-group-text">{{ unitLabel(unit()) }}</span>
          </div>
          <div id="print-batch-help" class="form-text">
            {{ t('recipe.print.batchHelp', { unit: unit(), example: example() }) }}
          </div>
          @if (batchProblem()) {
            <p id="print-batch-problem" class="print-problem" role="alert">
              {{ t('recipe.print.batchProblem', { example: example() }) }}
            </p>
          }
        </div>
        <div class="form-check" [hidden]="mode() === 'worked'">
          <input
            id="print-show-cost"
            class="form-check-input"
            type="checkbox"
            [checked]="showCost()"
            (change)="setShowCost($any($event.target).checked)"
          />
          <label for="print-show-cost" class="form-check-label">{{ t('recipe.print.showCost') }}</label>
          <div class="form-text">{{ t('recipe.print.showCostHelp') }}</div>
          @if (showCost() && pricesProblem()) {
            <p class="print-problem" role="alert">{{ pricesProblem() }}</p>
          }
        </div>
        @if (mode() === 'batch') {
          <div>
            <label for="print-batch-number" class="form-label">{{ t('recipe.print.batchNumber') }}</label>
            <input
              id="print-batch-number"
              class="form-control print-batch-number"
              autocomplete="off"
              aria-describedby="print-batch-number-help"
              [value]="batchNumber()"
              (input)="batchNumber.set($any($event.target).value)"
            />
            <div id="print-batch-number-help" class="form-text">{{ t('recipe.print.batchNumberHelp') }}</div>
          </div>
        }
        <fieldset [hidden]="mode() === 'worked'">
          <legend class="form-label">{{ t('recipe.print.weighIn') }}</legend>
          @for (choice of units; track choice.value) {
            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                name="print-unit"
                [id]="'print-unit-' + choice.value"
                [value]="choice.value"
                [checked]="unit() === choice.value"
                (change)="setUnit(choice.value)"
              />
              <label class="form-check-label" [for]="'print-unit-' + choice.value">{{ t(choice.label) }}</label>
            </div>
          }
          <div class="form-text">{{ t('recipe.print.accountSetting') }}</div>
          @if (unitProblem()) {
            <p class="print-problem" role="alert">{{ unitProblem() }}</p>
          }
        </fieldset>
      </div>
      <div class="print-actions">
        <button type="button" class="btn btn-primary" (click)="print()">{{ t('recipe.print.print') }}</button>
        <button type="button" class="btn btn-light border" (click)="back.emit()">{{ t('recipe.print.back') }}</button>
      </div>
    </section>

    @let printed = lines();
    @let weights = printed.weights;
    <article class="print-sheet" aria-labelledby="print-title">
      <header class="print-sheet-header">
        <h2 id="print-title" translate="no">{{ title() }}</h2>
        @if (recipe().date) {
          <p class="print-meta">{{ recipe().date | gcDate }}</p>
        }
        @if (firing(); as fired) {
          <p class="print-firing">
            <span class="visually-hidden">{{ t('recipe.firing.heading') }}: </span>
            @if (fired.tested) {
              <strong>{{ fired.tested }}</strong>
            }
            @for (part of [fired.range, fired.atmospheres, fired.schedule]; track $index) {
              @if (part) {
                <span> · {{ part }}</span>
              }
            }
            @if (fired.conversion) {
              <br /><span class="print-firing-approx">{{ fired.conversion }}</span>
            }
          </p>
        }
        @if (recipe().foodSurface) {
          <p class="print-liner">{{ t('recipe.firing.liner.note') }} {{ t('recipe.firing.liner.test') }}</p>
        }
        @if (mode() !== 'worked' && batchSummary(); as summary) {
          <p class="print-batch-summary">{{ summary }}</p>
        }
        @if (mode() !== 'worked' && costSummary(); as cost) {
          <p class="print-cost">{{ cost }}</p>
        }
        @if (mode() === 'batch') {
          <dl class="print-ticket">
            <div>
              <dt>{{ t('recipe.print.batchNumberShort') }}</dt>
              <dd [class.print-blank]="!batchNumber().trim()">{{ batchNumber().trim() }}</dd>
            </div>
            <div>
              <dt>{{ t('recipe.print.mixedOn') }}</dt>
              <dd>{{ today() }}</dd>
            </div>
            @if (sgTarget(); as target) {
              <div>
                <dt>{{ t('recipe.print.sgTarget') }}</dt>
                <dd>{{ target }}</dd>
              </div>
              <div>
                <dt>{{ t('recipe.print.sgMeasured') }}</dt>
                <dd class="print-blank"></dd>
              </div>
            }
          </dl>
        }
      </header>

      @if (mode() === 'worked') {
        <gc-worked-calculation
          [materials]="recipe().materials"
          [additives]="recipe().additives ?? []"
          [includeAdditives]="!!recipe().includeAdditives"
          [chemistryOf]="chemistryOf()"
        />
      } @else if (printed.unreadable.length) {
        <div class="print-unreadable">
          @for (problem of printed.unreadable; track problem) {
            <p>{{ problem }}</p>
          }
          <p>{{ t('recipe.print.noWeights') }}</p>
        </div>
      }

      @if (mode() === 'full') {
        <div class="print-table-scroll" tabindex="0" role="region" [attr.aria-label]="t('recipe.print.materials')">
          <table class="print-table">
            <caption>
              {{
                t('recipe.print.materials')
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('recipe.print.material') }}</th>
                <th scope="col" class="num">{{ t('recipe.print.amount') }}</th>
                <th scope="col" class="num">{{ t('recipe.print.share') }}</th>
                @if (weights) {
                  <th scope="col" class="num">{{ t('recipe.print.weigh') }}</th>
                  <th scope="col" class="num">{{ t('recipe.print.runningTotal') }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (line of printed.materials; track $index) {
                <tr>
                  <th scope="row">
                    {{ line.name }}
                    @if (line.formula) {
                      <span class="print-formula" translate="no">{{ line.formula }}</span>
                    }
                  </th>
                  <td class="num">{{ line.amount }}</td>
                  <td class="num">{{ line.share }}</td>
                  @if (weights) {
                    <td class="num">{{ line.weigh }}</td>
                    <td class="num">{{ line.runningTotal }}</td>
                  }
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{{ t('recipe.print.total') }}</th>
                <td class="num">{{ printed.total }}</td>
                <td class="num">100%</td>
                @if (weights) {
                  <td class="num">{{ weight(weights.base) }}</td>
                  <td></td>
                }
              </tr>
            </tfoot>
          </table>
        </div>

        @if (printed.additives.length) {
          <div class="print-table-scroll" tabindex="0" role="region" [attr.aria-label]="t('recipe.print.additives')">
            <table class="print-table">
              <caption>
                {{
                  t('recipe.print.additives')
                }}
                <span class="print-caption-note">{{
                  recipe().includeAdditives ? t('recipe.print.counted') : t('recipe.print.onTop')
                }}</span>
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ t('recipe.print.additive') }}</th>
                  <th scope="col" class="num">{{ t('recipe.print.amount') }}</th>
                  @if (weights) {
                    <th scope="col" class="num">{{ t('recipe.print.weigh') }}</th>
                    <th scope="col" class="num">{{ t('recipe.print.runningTotal') }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (line of printed.additives; track $index) {
                  <tr>
                    <th scope="row">{{ line.name }}</th>
                    <td class="num">{{ line.amount }}</td>
                    @if (weights) {
                      <td class="num">{{ line.weigh }}</td>
                      <td class="num">{{ line.runningTotal }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <section class="print-chemistry" aria-labelledby="print-unity">
          <h3 id="print-unity">
            {{ recipe().includeAdditives ? t('recipe.print.unityCounted') : t('recipe.print.unity') }}
          </h3>
          @if (evaluation().analysis; as analysis) {
            <gc-unity-formula [analysis]="analysis" />
            <dl class="print-facts">
              @if (fluxBalance(); as balance) {
                <dt>{{ t('recipe.print.fluxBalance') }}</dt>
                <dd translate="no">{{ balance }}</dd>
              }
              @if (oxideAnalysis(); as oxides) {
                <dt>{{ t('recipe.print.oxideAnalysis') }}</dt>
                <dd translate="no">{{ oxides }}</dd>
              }
              @if (loi(); as loi) {
                <dt>{{ t('recipe.print.loi') }}</dt>
                <dd>{{ loi }}</dd>
              }
            </dl>
            @if (evaluation().warnings.length) {
              <ul class="print-warnings">
                @for (warning of evaluation().warnings; track warning) {
                  <li>{{ warning }}</li>
                }
              </ul>
            }
          } @else {
            <p>{{ evaluation().problem ?? t('recipe.print.noAmounts') }}</p>
          }
        </section>

        @if (notes()) {
          <section class="print-notes" aria-labelledby="print-notes-heading">
            <h3 id="print-notes-heading">{{ t('recipe.print.notes') }}</h3>
            <p>{{ notes() }}</p>
          </section>
        }
        @if (coneReader(); as reader) {
          <gc-cone-summaries
            class="print-cone-summaries"
            headingId="print-cone-summaries-heading"
            [block]="recipe().firedAt"
            [results]="recipe().coneResults"
            [reader]="reader"
          />
        }
      } @else if (mode() === 'batch') {
        <div class="print-table-scroll" tabindex="0" role="region" [attr.aria-label]="t('recipe.print.toWeigh')">
          <table class="print-table print-batch-list">
            <caption class="visually-hidden">
              {{
                t('recipe.print.toWeigh')
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col" class="tick">
                  <span class="visually-hidden">{{ t('recipe.print.weighed') }}</span>
                </th>
                <th scope="col">{{ t('recipe.print.material') }}</th>
                <th scope="col" class="num">{{ weights ? t('recipe.print.weigh') : t('recipe.print.amount') }}</th>
                @if (weights) {
                  <th scope="col" class="num">{{ t('recipe.print.runningTotal') }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (line of printed.materials; track $index) {
                <tr>
                  <td class="tick"><span class="tick-box"></span></td>
                  <th scope="row">{{ line.name }}</th>
                  <td class="num">{{ weights ? line.weigh : line.amount }}</td>
                  @if (weights) {
                    <td class="num">{{ line.runningTotal }}</td>
                  }
                </tr>
              }
            </tbody>
            @if (printed.additives.length) {
              <tbody>
                <tr class="print-group">
                  <th scope="rowgroup" [attr.colspan]="weights ? 4 : 3">{{ t('recipe.print.additives') }}</th>
                </tr>
                @for (line of printed.additives; track $index) {
                  <tr>
                    <td class="tick"><span class="tick-box"></span></td>
                    <th scope="row">{{ line.name }}</th>
                    <td class="num">{{ weights ? line.weigh : line.amount }}</td>
                    @if (weights) {
                      <td class="num">{{ line.runningTotal }}</td>
                    }
                  </tr>
                }
              </tbody>
            }
            @if (weights) {
              <tfoot>
                <tr>
                  <td></td>
                  <th scope="row">{{ t('recipe.print.allTogether') }}</th>
                  <td class="num">{{ weight(weights.total) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            }
          </table>
        </div>
        @if (!weights) {
          <p class="print-note">{{ t('recipe.print.asWritten') }}</p>
        }
        <dl class="print-ticket print-sign">
          <div>
            <dt>{{ t('recipe.print.mixedBy') }}</dt>
            <dd class="print-blank print-signature"></dd>
          </div>
          <div>
            <dt>{{ t('recipe.print.checkedBy') }}</dt>
            <dd class="print-blank print-signature"></dd>
          </div>
        </dl>
      }

      @if (hazards().length) {
        <gc-recipe-hazards class="print-hazards" headingId="print-hazards-heading" [sources]="hazards()" />
      }
    </article>
  </ng-container>`,
  styles: `
    :host {
      display: block;
    }
    .print-controls {
      background: var(--gc-surface);
      border: 1px solid var(--gc-border);
      border-radius: var(--gc-radius);
      box-shadow: var(--gc-shadow);
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
    }
    .print-controls h1 {
      font-size: 1.6rem;
      margin: 0 0 1rem;
    }
    .print-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
      gap: 1rem 2rem;
    }
    .print-batch-size {
      max-width: 14rem;
    }
    .print-problem {
      color: var(--gc-danger-text);
      margin: 0.25rem 0 0;
    }
    .print-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }
    .print-sheet {
      background: var(--gc-surface);
      color: var(--gc-text);
      border: 1px solid var(--gc-border);
      border-radius: 4px;
      box-shadow: var(--gc-shadow);
      padding: 1.5rem 2rem;
      max-width: 52rem;
    }
    .print-sheet-header {
      margin-bottom: 0.5rem;
    }
    .print-sheet h2 {
      font-size: 1.75rem;
      margin: 0;
    }
    .print-sheet h3 {
      font-size: 1.1rem;
      margin: 1rem 0 0.5rem;
    }
    .print-meta,
    .print-firing,
    .print-liner,
    .print-batch-summary,
    .print-cost {
      margin: 0.25rem 0 0;
    }
    .print-firing-approx {
      font-size: 0.9rem;
    }
    .print-liner {
      font-size: 0.9rem;
      border-inline-start: 3px solid currentColor;
      padding-inline-start: 0.5rem;
    }
    .print-batch-summary,
    .print-cost {
      font-weight: 600;
    }
    /* A table wider than a phone scrolls within the sheet; it can take the focus, to scroll by keyboard. */
    .print-table-scroll {
      overflow-x: auto;
    }
    .print-table-scroll:focus-visible {
      outline: 3px solid var(--gc-primary);
      outline-offset: 2px;
    }
    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0 0;
    }
    .print-table caption {
      caption-side: top;
      color: var(--gc-text);
      font-weight: 600;
      padding: 0 0 0.25rem;
    }
    .print-caption-note {
      font-weight: normal;
      color: var(--gc-muted);
    }
    .print-caption-note::before {
      content: '- ';
    }
    .print-table th,
    .print-table td {
      background: none;
      border-bottom: 1px solid var(--gc-border);
      padding: 0.3rem 0.5rem;
      text-align: start;
      vertical-align: top;
    }
    .print-table tbody th {
      font-weight: normal;
    }
    .print-table .num {
      text-align: end;
    }
    /* Only the numbers: Lora's tabular figures widen its spaces too, which would gap a heading's words. */
    .print-table td.num {
      font-variant-numeric: tabular-nums;
    }
    .print-table tfoot th,
    .print-table tfoot td {
      border-top: 2px solid var(--gc-text);
      border-bottom: 0;
      font-weight: 600;
    }
    .print-formula {
      display: block;
      /* Formulas have no spaces; on a phone they may break anywhere. */
      overflow-wrap: anywhere;
      font-size: 0.85em;
      color: var(--gc-muted);
    }
    .print-table .print-group th {
      font-weight: 600;
      padding-top: 0.75rem;
    }
    .tick {
      width: 2rem;
    }
    .tick-box {
      display: inline-block;
      width: 1.1em;
      height: 1.1em;
      border: 1.5px solid var(--gc-text);
      border-radius: 2px;
      vertical-align: middle;
    }
    .print-batch-list td,
    .print-batch-list th {
      padding-top: 0.55rem;
      padding-bottom: 0.55rem;
    }
    .print-facts {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.25rem 1rem;
      margin: 0.75rem 0 0;
    }
    .print-facts dt {
      font-weight: 600;
    }
    .print-facts dd {
      margin: 0;
    }
    .print-unreadable {
      border: 2px solid var(--gc-danger-text);
      border-radius: 4px;
      color: var(--gc-danger-text);
      font-weight: 600;
      margin: 0.75rem 0 0;
      padding: 0.5rem 0.75rem;
    }
    .print-unreadable p {
      margin: 0;
    }
    .print-warnings,
    .print-note {
      color: var(--gc-muted);
      margin: 0.5rem 0 0;
    }
    .print-notes p {
      white-space: pre-line;
      margin: 0;
    }
    /* The mix ticket's lines: written in or signed on paper, so each blank is a line to write on. */
    .print-ticket {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 2rem;
      margin: 0.75rem 0 0;
    }
    .print-ticket > div {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      flex: 1 1 12rem;
      min-width: 0;
    }
    .print-ticket dt {
      font-weight: 600;
      white-space: nowrap;
    }
    .print-ticket dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .print-blank {
      flex: 1 1 auto;
      min-width: 6rem;
      min-height: 1.4em;
      border-bottom: 1px solid var(--gc-text);
    }
    .print-sign {
      margin-top: 1.5rem;
    }
    .print-signature {
      min-height: 2.2em;
    }
    .print-batch-number {
      max-width: 14rem;
    }
    .print-hazards {
      display: block;
      margin-top: 1.25rem;
    }
    @media print {
      .print-cost {
        margin-top: 0.1rem;
        font-size: 9.5pt;
      }
      .print-hazards {
        margin-top: 0.5rem;
      }
    }
    @media (max-width: 575.98px) {
      .print-controls,
      .print-sheet {
        padding: 1rem 0.75rem;
      }
      .print-table {
        font-size: 0.8125rem;
      }
      .print-table th,
      .print-table td {
        padding: 0.25rem 0.3rem;
      }
      .print-facts {
        grid-template-columns: 1fr;
      }
    }
    /* Five columns on the narrowest phones (320px). */
    @media (max-width: 399.98px) {
      .print-sheet {
        padding: 1rem 0.5rem;
      }
      .print-table th,
      .print-table td {
        padding: 0.25rem 0.2rem;
      }
    }
    @media print {
      .print-sheet {
        border: 0;
        border-radius: 0;
        box-shadow: none;
        padding: 0;
        max-width: none;
        font-size: 10.5pt;
      }
      .print-table-scroll {
        overflow: visible;
      }
      .print-table tr,
      .print-chemistry,
      .print-notes,
      .print-cone-summaries,
      .print-ticket {
        break-inside: avoid;
      }
      /* Read at arm's length while weighing. */
      .print-batch-list {
        font-size: 13pt;
      }
    }
  `
})
export class RecipePrint implements OnInit, OnDestroy {
  private readonly preferences = inject(PreferencesService);
  private readonly prices = inject(PricesService);
  private readonly injector = inject(Injector);
  private readonly titleService = inject(Title);
  private titleBefore = '';

  readonly recipe = input.required<Recipe>();
  /** The chemistry an additive borrows by name (chemistryOf), for one with no analysis of its own. */
  readonly chemistryOf = input<(name: string) => MaterialInput | undefined>();
  /** What the recipe's hazards are read from (recipe-hazards.ts hazardSources); none, and no hazards are printed. */
  readonly hazards = input<HazardSource[]>([]);
  readonly back = output<void>();
  /** What to show first, instead of the last choice (not remembered): the recipe page's Show the working. */
  readonly startMode = input<PrintMode | null>(null);

  /** The mix ticket's batch number, as typed: for this print only; blank leaves a line to write it on. */
  protected readonly batchNumber = signal('');
  /** The day it is printed, for the mix ticket. */
  protected readonly today = computed(() => formatDate(new Date(), { dateStyle: 'long' }));
  /**
   * The recipe's target specific gravity, when it has one (saved as sgTarget, a plain number):
   * the mix ticket shows it, with a line for the reading.
   */
  protected readonly sgTarget = computed(() => {
    const target = this.recipe().sgTarget;
    return target === undefined || target === null ? '' : formatPlain(String(target));
  });

  /** The recipe's firing in words, with an approximate conversion into the reader's scale; null when not stated. */
  protected readonly firing = computed(() => {
    // The locale is looked up only for a recipe with a firing, as the cost's currency is.
    if (!this.recipe().firedAt) return null;
    const locale = this.injector.get(LocaleService);
    return firingWords(this.recipe().firedAt, { cones: locale.cones(), temperature: locale.temperature() });
  });

  /** How the reader fires, for the results by cone: looked up only for a recipe with results, as the firing's is. */
  protected readonly coneReader = computed(() => {
    if (!this.recipe().coneResults?.length) return null;
    const locale = this.injector.get(LocaleService);
    return { cones: locale.cones(), temperature: locale.temperature() };
  });

  protected readonly units = UNITS;
  protected readonly unitLabel = unitLabel;
  protected readonly unit = this.preferences.weightUnit;
  protected readonly unitProblem = signal('');
  protected readonly mode = signal<PrintMode>(readMode());
  private readonly batch = signal<BatchSize>(readBatch());

  protected readonly title = computed(() => this.recipe().title.trim() || translate('recipe.page.untitled'));
  /** What a PDF of it is named: the page's title. */
  private readonly pageTitle = computed(() => translate('recipe.print.pageTitle', { title: this.title() }));
  protected readonly notes = computed(() => {
    const notes = firstOf(this.recipe().notes).trim();
    return notes === 'None.' ? '' : notes;
  });

  /** The batch size in the account's unit, a plain number: as typed, or converted when the unit has changed since. */
  protected readonly batchText = computed(() => {
    const { text, unit } = this.batch();
    const now = this.unit();
    if (unit === now) return text;
    const grams = toGrams(text, unit);
    return grams ? formatAmount(fromGrams(grams, now), now === 'lb' ? 2 : 0) : text;
  });
  private readonly batchGrams = computed(() => toGrams(this.batchText(), this.unit()));
  /** A batch size to give as an example, in the unit: as the field reads it. */
  protected readonly example = computed(() => forTyping(this.unit() === 'lb' ? '2.5' : '5000'));
  protected readonly batchProblem = computed(() => this.batchText().trim() !== '' && !this.batchGrams());

  private readonly precision = this.preferences.gramPrecision;
  protected readonly lines = computed(() =>
    printLines(this.recipe(), this.batchGrams(), this.unit(), this.precision())
  );
  protected readonly batchSummary = computed(() => {
    const weights = this.lines().weights;
    if (!weights) return '';
    const extra = weights.total - weights.base;
    if (!(extra > 0)) return translate('recipe.print.batchBase', { base: this.weight(weights.base) });
    return translate('recipe.print.batch', {
      base: this.weight(weights.base),
      extra: this.weight(extra),
      total: this.weight(weights.total)
    });
  });

  /** Whether the sheet gives the batch's cost: off each time, so a ticket handed on shows no prices unless chosen. */
  protected readonly showCost = signal(false);
  protected readonly pricesProblem = this.prices.problem;
  /** The batch's cost for the size printed, from the account's prices; '' unless asked for, and until they are fetched. */
  protected readonly costSummary = computed(() => {
    const prices = this.prices.prices();
    if (!this.showCost() || prices === null) return '';
    const recipe = this.recipe();
    const materials = recipe.materials ?? [];
    const additives = recipe.additives ?? [];
    const cost = recipeCost(
      {
        materials: materials.map((m) => ({ key: libraryKey(m), amount: m.amount })),
        additives: additives.map((a) => ({ key: libraryKey(a), amount: a.amount, unit: a.unit }))
      },
      this.batchGrams(),
      new Map(prices.map((p) => [p.key, p.perKg]))
    );
    if (!cost) return '';
    const currency = this.injector.get(LocaleService).currency();
    if (cost.perKg !== null) {
      const perUnit = this.unit() === 'lb' ? GRAMS_PER_POUND / 1000 : 1;
      return translate('recipe.print.cost', {
        cost: money(cost.cost, currency),
        perUnit: money(cost.perKg * perUnit, currency),
        unit: this.unit()
      });
    }
    const names = [...materials, ...additives]
      .filter((line) => cost.missing.includes(libraryKey(line)))
      .map((line) => line.name);
    return translate('recipe.print.costPartial', {
      cost: money(cost.cost, currency),
      list: listOf([...new Set(names)])
    });
  });

  protected readonly evaluation = computed(() =>
    evaluate(this.recipe().materials ?? [], this.recipe().additives ?? [], {
      includeAdditives: !!this.recipe().includeAdditives,
      chemistryOf: this.chemistryOf()
    })
  );
  /** R₂O 0.28 : RO 0.72. */
  protected readonly fluxBalance = computed(() => {
    const groups = this.evaluation().analysis?.groups;
    return groups ? `R₂O ${fixed(groups.R2O, 2)} : RO ${fixed(groups.RO, 2)}` : '';
  });
  /** SiO₂ 61.2% · Al₂O₃ 14.1% ..., in the unity formula's order. */
  protected readonly oxideAnalysis = computed(() => {
    const analysis = this.evaluation().analysis?.analysis;
    if (!analysis) return '';
    return unityColumns(analysis)
      .flatMap((column) => column.oxides)
      .map((oxide) => oxide.label + ' ' + fixed(oxide.value, 1) + '%')
      .join(' · ');
  });
  protected readonly loi = computed(() => {
    const loi = this.evaluation().analysis?.loi;
    return typeof loi === 'number' ? translate('recipe.print.loiValue', { loi: fixed(loi, 1) }) : '';
  });

  ngOnInit(): void {
    const start = this.startMode();
    if (start) this.mode.set(start);
    void this.preferences.load();
    // Saved as a PDF, the file takes the page's title.
    this.titleBefore = this.titleService.getTitle();
    this.titleService.setTitle(this.pageTitle());
  }

  ngOnDestroy(): void {
    if (this.titleService.getTitle() === this.pageTitle()) this.titleService.setTitle(this.titleBefore);
  }

  protected weight(grams: number): string {
    return keepTogether(formatWeight(grams, this.unit(), this.precision()));
  }

  protected setMode(mode: PrintMode): void {
    this.mode.set(mode);
    remember(MODE_KEY, mode);
  }

  /** Ticking it fetches the prices, the first time; unticked, they are not asked for. */
  protected setShowCost(show: boolean): void {
    this.showCost.set(show);
    if (show) void this.prices.load();
  }

  protected setBatch(text: string): void {
    const size = { text, unit: this.unit() };
    this.batch.set(size);
    remember(BATCH_KEY, JSON.stringify(size));
  }

  protected async setUnit(unit: WeightUnit): Promise<void> {
    this.unitProblem.set('');
    try {
      await this.preferences.set('weightUnit', unit);
    } catch (err) {
      this.unitProblem.set(errorMessage(err, translate('recipe.print.unitFailed')));
    }
  }

  protected print(): void {
    window.print();
  }
}
