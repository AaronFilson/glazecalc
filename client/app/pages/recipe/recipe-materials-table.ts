import { Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { FieldCheck } from '../../shared/field-checks';
import { NumberInput } from '../../shared/number-input';
import { CLEAR_OF_PEEK } from './focus';
import { RecipeLines } from './recipe-lines';

// The recipe's materials in the editor, with their shares, the total and changing the scale. What each
// does is in recipe-lines.ts.

@Component({
  selector: 'gc-recipe-materials',
  imports: [FieldCheck, NumberInput, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <h3 id="materials-heading" tabindex="-1">{{ t('recipe.page.materialsHeading') }}</h3>
    @if (edit().materials().length) {
      <table class="recipe-table recipe-materials">
        <thead>
          <tr>
            <th scope="col">{{ t('recipe.page.materialColumn') }}</th>
            <th scope="col">{{ t('recipe.page.amountColumn') }}</th>
            <th scope="col">{{ t('recipe.page.shareColumn') }}</th>
            <th scope="col">
              <span class="visually-hidden">{{ t('recipe.page.removeColumn') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          @for (line of edit().materials(); track $index) {
            <tr class="recipe-row">
              <th scope="row">
                <bdi>{{ line.name }}</bdi>
              </th>
              <td>
                <input
                  [id]="'material-amount-' + $index"
                  type="text"
                  inputmode="decimal"
                  class="form-control form-control-sm material-amount"
                  [attr.aria-label]="t('recipe.page.amountOf', { name: line.name })"
                  [gcNumber]="line.amount"
                  (gcNumberChange)="edit().setAmount($index, $event)"
                  (keydown.enter)="edit().amountEntered($event, 'material', $index)"
                  [gcField]="edit().checks"
                  [gcFieldName]="'material-amount-' + $index"
                />
                @if (edit().poundReadings()?.materials?.[$index]; as weight) {
                  <span class="recipe-weight">{{ weight }}</span>
                }
              </td>
              <td class="recipe-share">{{ edit().share(line.amount) }}</td>
              <td>
                <button
                  type="button"
                  class="btn btn-light border btn-sm recipe-remove"
                  [id]="'material-remove-' + $index"
                  [attr.aria-label]="t('recipe.page.removeLine', { name: line.name })"
                  (click)="edit().removeMaterial($index)"
                >
                  ✕
                </button>
              </td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{{ t('recipe.page.total') }}</th>
            <td class="recipe-total">
              {{ edit().formatTotal() }}
              @if (edit().poundReadings()?.total; as weight) {
                <span class="recipe-weight">{{ weight }}</span>
              }
            </td>
            <td class="recipe-share">{{ edit().totalShare() }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      @if (summary(); as summary) {
        <p class="unity-inline">
          <b>{{ t('recipe.page.unityInline') }}</b> {{ summary }}
        </p>
      }

      <div class="recipe-scale">
        <span class="recipe-scale-label">{{ t('recipe.page.changeScale') }}</span>
        <button type="button" class="btn btn-light border btn-sm" (click)="edit().scale({ to: 'percent' })">
          {{ t('recipe.page.toPercent') }}
        </button>
        <button type="button" class="btn btn-light border btn-sm" (click)="edit().scale({ to: 'parts' })">
          {{ t('recipe.page.toParts') }}
        </button>
        <button type="button" class="btn btn-light border btn-sm" (click)="edit().batchOpen.set(!edit().batchOpen())">
          {{ t('recipe.page.scaleToBatch') }}
        </button>
        @if (edit().batchOpen()) {
          <span class="recipe-batch">
            <label for="batch-weight">{{ t('recipe.page.batchWeight', { unit: edit().batchUnit() }) }}</label>
            <input
              id="batch-weight"
              type="text"
              inputmode="decimal"
              class="form-control form-control-sm"
              [gcNumber]="edit().batchText()"
              (gcNumberChange)="edit().setBatchText($event)"
              (keydown.enter)="edit().scaleToBatch()"
            />
            <button type="button" class="btn btn-primary btn-sm" (click)="edit().scaleToBatch()">
              {{ t('recipe.page.scale') }}
            </button>
          </span>
        }
      </div>
      <p class="recipe-scale-note" [class.is-problem]="edit().scaleMessage()?.problem" role="status">
        {{ edit().scaleMessage()?.text }}
      </p>
    } @else {
      <p class="muted">{{ t('recipe.page.noMaterials') }}</p>
    }
  </ng-container>`,
  styles: [
    `
      /* No box of its own: its heading and table are laid out as parts of the editor. */
      :host {
        display: contents;
      }
    `,
    CLEAR_OF_PEEK
  ]
})
export class RecipeMaterialsTable {
  readonly edit = input.required<RecipeLines>();
  /** The unity formula on one line, for a phone: what the panel beside the recipe shows in full. */
  readonly summary = input<string | null>(null);
}
