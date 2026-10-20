import { Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { MaterialInput, formatFormula } from '../../../../lib/chemistry';
import type { ChemistryError } from '../../../../lib/chemistry';
import { WorkedCalculation as Working, workedCalculation } from '../../../../lib/recipe/worked';
import { Additive, RecipeAnalysis, RecipeMaterial } from '../../core/models';
import { chemistryText } from '../../i18n/coded';
import { fixed, upTo } from '../../shared/format';
import { hasAmounts, unityLines } from './recipe-analysis';
import { UnityFormula } from './unity-formula';

/** What the worked calculation shows: the working, or why there is none. */
export interface WorkedResult {
  working: Working | null;
  /** Why there is no unity formula, such as a recipe with no flux. */
  problem: string | null;
  /** Additives left out of it, with why. */
  leftOut: string[];
}

/**
 * The working of a recipe's unity formula, from the same lines as the recipe
 * page's (unityLines), by lib/recipe's workedCalculation, which does
 * calculateUMF's arithmetic step by step: so its answer is the page's.
 */
export function workedResult(
  materials: RecipeMaterial[],
  additives: Additive[],
  includeAdditives: boolean,
  chemistryOf?: (name: string) => MaterialInput | undefined
): WorkedResult {
  if (!hasAmounts(materials)) return { working: null, problem: null, leftOut: [] };
  const { lines, leftOut } = unityLines(materials, additives, { includeAdditives, chemistryOf });
  try {
    return { working: workedCalculation(lines), problem: null, leftOut };
  } catch (e) {
    return { working: null, problem: chemistryText(e as ChemistryError), leftOut };
  }
}

/**
 * "Show the working", for teaching: how the unity (Seger) formula comes from
 * a recipe, step by step, from grams to moles of each oxide in each material,
 * their totals, the fluxes added up, and each oxide divided by them. Laid out
 * to print as a worksheet, on the print view and the shared page.
 */
@Component({
  selector: 'gc-worked-calculation',
  imports: [TranslocoDirective, UnityFormula],
  template: `<ng-container *transloco="let t">
    <section class="worked" aria-labelledby="worked-heading">
      <p id="worked-heading" class="worked-heading" role="heading" [attr.aria-level]="level()">
        {{ t('recipe.worked.heading') }}
      </p>
      <p>{{ t('recipe.worked.intro') }}</p>
      @if (result().working; as working) {
        <ol class="worked-steps">
          <li class="worked-step">
            <p class="worked-subheading" role="heading" [attr.aria-level]="level() + 1">
              {{ t('recipe.worked.gramsHeading') }}
            </p>
            <p>{{ t('recipe.worked.gramsText') }}</p>
            <div class="worked-scroll" tabindex="0" role="region" [attr.aria-label]="t('recipe.worked.gramsHeading')">
              <table class="worked-table">
                <caption class="visually-hidden">
                  {{
                    t('recipe.worked.gramsHeading')
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ t('recipe.worked.material') }}</th>
                    <th scope="col" class="num">{{ t('recipe.worked.grams') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (material of working.materials; track $index) {
                    <tr>
                      <th scope="row">
                        <bdi>{{ material.name }}</bdi>
                      </th>
                      <td class="num">{{ upTo(material.grams, 3) }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">{{ t('recipe.worked.total') }}</th>
                    <td class="num">{{ upTo(working.batchGrams, 3) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </li>

          <li class="worked-step">
            <p class="worked-subheading" role="heading" [attr.aria-level]="level() + 1">
              {{ t('recipe.worked.molesHeading') }}
            </p>
            <p>{{ t('recipe.worked.molesText') }}</p>
            @for (material of working.materials; track $index) {
              <div
                class="worked-scroll worked-material"
                tabindex="0"
                role="region"
                [attr.aria-label]="
                  t('recipe.worked.materialCaption', { name: material.name, grams: upTo(material.grams, 3) })
                "
              >
                <table class="worked-table">
                  <caption>
                    {{
                      t('recipe.worked.materialCaption', { name: material.name, grams: upTo(material.grams, 3) })
                    }}
                    @if (material.loi > 0) {
                      <span class="worked-caption-note">{{
                        t('recipe.worked.loi', { loi: fixed(material.loi, 2) })
                      }}</span>
                    }
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{{ t('recipe.worked.oxide') }}</th>
                      <th scope="col" class="num">{{ t('recipe.worked.percent') }}</th>
                      <th scope="col" class="num">{{ t('recipe.worked.oxideGrams') }}</th>
                      <th scope="col" class="num">{{ t('recipe.worked.molarMass') }}</th>
                      <th scope="col" class="num">{{ t('recipe.worked.moles') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (oxide of material.oxides; track oxide.oxide) {
                      <tr>
                        <th scope="row" translate="no">{{ formula(oxide.oxide) }}</th>
                        <td class="num">{{ fixed(oxide.percent, 2) }}</td>
                        <td class="num">{{ fixed(oxide.grams, 3) }}</td>
                        <td class="num">{{ fixed(oxide.molarMass, 2) }}</td>
                        <td class="num">{{ fixed(oxide.moles, 4) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </li>

          <li class="worked-step">
            <p class="worked-subheading" role="heading" [attr.aria-level]="level() + 1">
              {{ t('recipe.worked.totalsHeading') }}
            </p>
            <p>{{ t('recipe.worked.totalsText') }}</p>
            <div class="worked-scroll" tabindex="0" role="region" [attr.aria-label]="t('recipe.worked.totalsHeading')">
              <table class="worked-table">
                <caption class="visually-hidden">
                  {{
                    t('recipe.worked.totalsHeading')
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ t('recipe.worked.oxide') }}</th>
                    <th scope="col">{{ t('recipe.worked.role') }}</th>
                    <th scope="col" class="num">{{ t('recipe.worked.batchMoles') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (total of working.oxides; track total.oxide) {
                    <tr [class.worked-flux]="total.flux">
                      <th scope="row" translate="no">{{ formula(total.oxide) }}</th>
                      <td>{{ total.flux ? t('recipe.worked.flux') : '' }}</td>
                      <td class="num">{{ fixed(total.moles, 4) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="worked-sum">
              {{ t('recipe.worked.fluxSum') }}
              <span class="worked-math" translate="no">{{ fluxSum() }}</span>
            </p>
          </li>

          <li class="worked-step">
            <p class="worked-subheading" role="heading" [attr.aria-level]="level() + 1">
              {{ t('recipe.worked.divideHeading') }}
            </p>
            <p>{{ t('recipe.worked.divideText', { total: fixed(working.fluxMoles, 4) }) }}</p>
            <div class="worked-scroll" tabindex="0" role="region" [attr.aria-label]="t('recipe.worked.divideHeading')">
              <table class="worked-table">
                <caption class="visually-hidden">
                  {{
                    t('recipe.worked.divideHeading')
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ t('recipe.worked.oxide') }}</th>
                    <th scope="col" class="num">{{ t('recipe.worked.batchMoles') }}</th>
                    <th scope="col" class="num">{{ t('recipe.worked.dividedBy') }}</th>
                    <th scope="col" class="num">{{ t('recipe.worked.unity') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (total of working.oxides; track total.oxide) {
                    <tr [class.worked-flux]="total.flux">
                      <th scope="row" translate="no">{{ formula(total.oxide) }}</th>
                      <td class="num">{{ fixed(total.moles, 4) }}</td>
                      <td class="num">{{ fixed(working.fluxMoles, 4) }}</td>
                      <td class="num">{{ fixed(total.unity, 3) }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colspan="3">{{ t('recipe.worked.fluxesTogether') }}</th>
                    <td class="num">{{ fixed(fluxUnity(), 3) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </li>
        </ol>

        <section class="worked-answer" aria-labelledby="worked-answer-heading">
          <p id="worked-answer-heading" class="worked-subheading" role="heading" [attr.aria-level]="level() + 1">
            {{ t('recipe.worked.answerHeading') }}
          </p>
          <p>{{ t('recipe.worked.answerText') }}</p>
          <gc-unity-formula [analysis]="answer()!" />
        </section>
        <p class="worked-note">{{ t('recipe.worked.rounding') }}</p>
      } @else {
        <p>{{ result().problem ?? t('recipe.worked.noAmounts') }}</p>
      }
      @if (result().leftOut.length) {
        <ul class="worked-note">
          @for (line of result().leftOut; track line) {
            <li>{{ line }}</li>
          }
        </ul>
      }
    </section>
  </ng-container>`,
  styles: `
    :host {
      display: block;
    }
    .worked-heading {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 1rem 0 0.5rem;
    }
    .worked-subheading {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0 0 0.35rem;
    }
    .worked-steps {
      padding-inline-start: 1.5rem;
      margin: 0;
    }
    .worked-step {
      margin: 1.25rem 0 0;
    }
    .worked-step::marker {
      font-weight: 600;
    }
    .worked-step > p:not(.worked-subheading) {
      margin: 0 0 0.5rem;
    }
    /* A table wider than a phone scrolls on its own; it can take the focus, to scroll by keyboard. */
    .worked-scroll {
      overflow-x: auto;
    }
    .worked-scroll:focus-visible {
      outline: 3px solid var(--gc-primary);
      outline-offset: 2px;
    }
    .worked-material {
      margin-top: 0.75rem;
    }
    .worked-table {
      width: 100%;
      border-collapse: collapse;
      color: var(--gc-text);
    }
    .worked-table caption {
      caption-side: top;
      color: var(--gc-text);
      font-weight: 600;
      padding: 0 0 0.25rem;
    }
    .worked-caption-note {
      display: block;
      font-weight: normal;
      color: var(--gc-muted);
    }
    .worked-table th,
    .worked-table td {
      background: none;
      border-bottom: 1px solid var(--gc-border);
      padding: 0.3rem 0.5rem;
      text-align: start;
      vertical-align: top;
    }
    .worked-table tbody th {
      font-weight: normal;
    }
    .worked-table .num {
      text-align: end;
    }
    .worked-table td.num {
      font-variant-numeric: tabular-nums;
    }
    .worked-table tfoot th,
    .worked-table tfoot td {
      border-top: 2px solid var(--gc-text);
      border-bottom: 0;
      font-weight: 600;
    }
    .worked-flux th[scope='row'],
    .worked-flux td {
      font-weight: 600;
    }
    .worked-sum {
      margin: 0.5rem 0 0;
    }
    .worked-math {
      display: block;
      overflow-wrap: anywhere;
      font-variant-numeric: tabular-nums;
    }
    .worked-answer {
      margin-top: 1.25rem;
    }
    .worked-note {
      color: var(--gc-muted);
      margin: 0.75rem 0 0;
    }
    @media (max-width: 575.98px) {
      .worked-steps {
        padding-inline-start: 1.1rem;
      }
      .worked-table {
        font-size: 0.8125rem;
      }
      .worked-table th,
      .worked-table td {
        padding: 0.25rem 0.25rem;
      }
    }
    @media print {
      .worked-scroll {
        overflow: visible;
      }
      .worked-table tr,
      .worked-material,
      .worked-answer {
        break-inside: avoid;
      }
      .worked-subheading {
        break-after: avoid;
      }
    }
  `
})
export class WorkedCalculation {
  readonly materials = input.required<RecipeMaterial[]>();
  readonly additives = input<Additive[]>([]);
  /** Whether the unity formula counts the colorants and additives too. */
  readonly includeAdditives = input(false);
  /** The chemistry an additive borrows by name (chemistryOf), for one with no analysis of its own. */
  readonly chemistryOf = input<(name: string) => MaterialInput | undefined>();
  /** Its heading's level, under the page's: 3 in the print view, 2 on the shared page; each step one below. */
  readonly level = input(3);

  protected readonly fixed = fixed;
  protected readonly upTo = upTo;
  protected readonly formula = formatFormula;

  protected readonly result = computed(() =>
    workedResult(this.materials(), this.additives(), this.includeAdditives(), this.chemistryOf())
  );
  /** The fluxes' moles, added up: 0.0345 + 0.1998 = 0.2343. */
  protected readonly fluxSum = computed(() => {
    const working = this.result().working;
    if (!working) return '';
    const parts = working.fluxes.map((flux) => fixed(flux.moles, 4));
    return (parts.length > 1 ? parts.join(' + ') + ' = ' : '') + fixed(working.fluxMoles, 4);
  });
  /** The fluxes in the unity formula, added up: 1. */
  protected readonly fluxUnity = computed(() =>
    (this.result().working?.oxides ?? []).filter((o) => o.flux).reduce((sum, o) => sum + o.unity, 0)
  );
  /** The unity formula worked out, in the columns potters read it in. */
  protected readonly answer = computed<RecipeAnalysis | null>(() => {
    const working = this.result().working;
    return working ? { uList: Object.fromEntries(working.oxides.map((o) => [o.oxide, o.unity])) } : null;
  });
}
