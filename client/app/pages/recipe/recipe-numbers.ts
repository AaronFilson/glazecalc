import { Component, computed, input, model } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { expansion, formatFormula } from '../../../../lib/chemistry';
import { molePercent } from '../../../../lib/recipe/analysis';
import { FiringBand } from '../../../../lib/recipe/limits';
import { FiringBlock } from '../../../../lib/cones/firing';
import { RecipeAnalysis } from '../../core/models';
import { FixedPipe } from '../../shared/format-pipes';
import { RecipeLimits } from './recipe-limits';
import { silicaAluminaRatio, unityColumnOf } from './unity-formula';

// What the unity formula implies, under the recipe: each oxide's moles, mole
// percent and fired weight percent, the loss on ignition and the calculated
// expansion (lib/chemistry works them out; Compare and Print show them too),
// then the glaze against a limit set and on Stull's chart (recipe-limits.ts).

@Component({
  selector: 'gc-recipe-numbers',
  imports: [FixedPipe, RecipeLimits, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="panel recipe-numbers" aria-labelledby="numbers-heading">
      <h2 id="numbers-heading">{{ t('recipe.numbers.heading') }}</h2>
      <div class="numbers-columns">
        <section aria-labelledby="analysis-heading">
          <h3 id="analysis-heading">{{ t('recipe.numbers.analysisHeading') }}</h3>
          <!-- It scrolls on its own where it is wider than a phone (longer words, taller letters): by keyboard too. -->
          <div
            class="table-responsive"
            tabindex="0"
            role="region"
            [attr.aria-label]="counted() ? t('recipe.numbers.captionCounted') : t('recipe.numbers.caption')"
          >
            <table class="table table-sm numbers-table">
              <caption>
                {{
                  counted() ? t('recipe.numbers.captionCounted') : t('recipe.numbers.caption')
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ t('recipe.numbers.oxide') }}</th>
                  <th scope="col" class="num">{{ t('recipe.numbers.unity') }}</th>
                  <th scope="col" class="num">{{ t('recipe.numbers.molePercent') }}</th>
                  <th scope="col" class="num">{{ t('recipe.numbers.weightPercent') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.oxide) {
                  <tr>
                    <th scope="row" class="formula" translate="no">{{ row.label }}</th>
                    <td class="num">{{ row.unity | gcFixed: 3 }}</td>
                    <td class="num">{{ row.mole | gcFixed: 1 }}</td>
                    <td class="num">{{ row.weight | gcFixed: 1 }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="numbers-note">{{ t('recipe.numbers.moleNote') }}</p>
          <dl class="numbers-facts">
            @if (ratio() !== null) {
              <dt>{{ t('recipe.numbers.ratio') }}</dt>
              <dd>{{ ratio() | gcFixed: 2 }}</dd>
            }
            @if (analysis().groups; as groups) {
              <dt>{{ t('recipe.numbers.fluxBalance') }}</dt>
              <dd translate="no">R₂O {{ groups.R2O | gcFixed: 2 }} : RO {{ groups.RO | gcFixed: 2 }}</dd>
            }
            @if (analysis().loi !== undefined) {
              <dt>{{ t('recipe.numbers.loi') }}</dt>
              <dd>{{ t('recipe.print.loiValue', { loi: (analysis().loi | gcFixed: 1) }) }}</dd>
            }
            @if (expands() !== null) {
              <dt>{{ t('recipe.numbers.expansion') }}</dt>
              <dd>{{ t('recipe.numbers.expansionValue', { value: (expands() | gcFixed: 2) }) }}</dd>
            }
          </dl>
          @if (expands() !== null) {
            <p class="numbers-note">{{ t('recipe.numbers.expansionNote') }}</p>
          }
        </section>
        <gc-recipe-limits
          [unity]="analysis().uList"
          [(firing)]="firing"
          [firedAt]="firedAt()"
          [materials]="materials()"
        />
      </div>
    </section>
  </ng-container>`,
  styles: `
    .numbers-columns {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0 2rem;
    }
    @media (min-width: 992px) {
      .numbers-columns {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
      }
    }
    h3 {
      font-size: 1.1rem;
      margin: 0.25rem 0 0.5rem;
    }
    .numbers-table {
      font-variant-numeric: tabular-nums;
      margin-bottom: 0.5rem;
    }
    .numbers-table caption {
      caption-side: top;
      color: var(--gc-muted);
      font-size: 0.9rem;
    }
    .num {
      text-align: end;
    }
    /* Figures stay whole; a column's heading wraps instead, so the table fits a phone. */
    td.num {
      white-space: nowrap;
    }
    .numbers-note {
      font-size: 0.9rem;
      color: var(--gc-muted);
    }
    // Each fact under its name on a phone, beside it from 576px.
    .numbers-facts {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0 1rem;
      margin-bottom: 0.5rem;
    }
    .numbers-facts dd {
      margin: 0 0 0.35rem;
      font-variant-numeric: tabular-nums;
    }
    @media (min-width: 576px) {
      .numbers-facts {
        grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
        gap: 0.2rem 1rem;
      }
      .numbers-facts dd {
        margin: 0;
      }
    }
  `
})
export class RecipeNumbers {
  readonly analysis = input.required<RecipeAnalysis>();
  /** Whether the unity formula counts the colorants and additives. */
  readonly counted = input(false);
  /** The firing the recipe is for; '' until chosen. */
  readonly firing = model<FiringBand | ''>('');
  /** The recipe's firing block, whose range gives the limits' bands when none is chosen. */
  readonly firedAt = input<FiringBlock | null>(null);
  /** The recipe's material names, for the limits' cone check. */
  readonly materials = input<string[]>([]);

  /** A row per oxide, in the order potters read the unity formula. */
  protected readonly rows = computed(() => {
    const { uList, analysis } = this.analysis();
    const moles = molePercent(uList);
    return Object.keys(moles)
      .sort((a, b) => unityColumnOf(a) - unityColumnOf(b))
      .map((oxide) => ({
        oxide,
        label: formatFormula(oxide),
        unity: uList[oxide],
        mole: moles[oxide],
        weight: analysis?.[oxide] ?? null
      }));
  });
  protected readonly ratio = computed(() => silicaAluminaRatio(this.analysis()));
  // Worked out from the fired analysis when a saved one has no figure of its own, as in Compare.
  protected readonly expands = computed(() => this.analysis().expansion ?? expansion(this.analysis().analysis));
}
