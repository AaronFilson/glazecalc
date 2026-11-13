import { Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { FieldCheck } from '../../shared/field-checks';
import { NumberInput } from '../../shared/number-input';
import { CLEAR_OF_PEEK } from './focus';
import { RecipeLines } from './recipe-lines';

// The recipe's colorants and additives in the editor, on top of its materials, each with its unit. What each
// does is in recipe-lines.ts.

@Component({
  selector: 'gc-recipe-additives',
  imports: [FieldCheck, NumberInput, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <h3 id="additives-heading" class="recipe-additives-heading" tabindex="-1">
      {{ t('recipe.page.additivesHeading') }} <span class="muted">{{ t('recipe.page.onTopOfBase') }}</span>
    </h3>
    @if (edit().additives().length) {
      <table class="recipe-table recipe-additives">
        <thead>
          <tr>
            <th scope="col">{{ t('recipe.page.additiveColumn') }}</th>
            <th scope="col">{{ t('recipe.page.amountColumn') }}</th>
            <th scope="col">
              <span class="visually-hidden">{{ t('recipe.page.removeColumn') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          @for (line of edit().additives(); track $index; let i = $index) {
            <tr class="recipe-row">
              <th scope="row">
                <bdi>{{ line.name }}</bdi>
              </th>
              <td>
                <div class="additive-amount-cell">
                  <input
                    [id]="'additive-amount-' + $index"
                    type="text"
                    inputmode="decimal"
                    class="form-control form-control-sm additive-amount"
                    [attr.aria-label]="t('recipe.page.amountOf', { name: line.name })"
                    [gcNumber]="line.amount"
                    (gcNumberChange)="edit().setAdditiveAmount($index, $event)"
                    (keydown.enter)="edit().amountEntered($event, 'additive', $index)"
                    [gcField]="edit().checks"
                    [gcFieldName]="'additive-amount-' + $index"
                  />
                  <!-- Beside the amount, or under it on a phone. -->
                  <fieldset class="unit-choice">
                    <legend class="visually-hidden">{{ t('recipe.page.unitFor', { name: line.name }) }}</legend>
                    @for (unit of edit().additiveUnits; track unit.value) {
                      <input
                        type="radio"
                        class="btn-check"
                        [id]="'additive-unit-' + i + '-' + unit.value"
                        [name]="'additive-unit-' + i"
                        [checked]="edit().unitOf(line) === unit.value"
                        (change)="edit().setAdditiveUnit(i, unit.value)"
                      />
                      <label class="btn btn-sm" [for]="'additive-unit-' + i + '-' + unit.value">{{
                        t(unit.label)
                      }}</label>
                    }
                  </fieldset>
                  @if (edit().poundReadings()?.additives?.[i]; as weight) {
                    <span class="recipe-weight">{{ weight }}</span>
                  }
                </div>
              </td>
              <td>
                <button
                  type="button"
                  class="btn btn-light border btn-sm recipe-remove"
                  [id]="'additive-remove-' + $index"
                  [attr.aria-label]="t('recipe.page.removeLine', { name: line.name })"
                  (click)="edit().removeAdditive($index)"
                >
                  ✕
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
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
export class RecipeAdditivesTable {
  readonly edit = input.required<RecipeLines>();
}
