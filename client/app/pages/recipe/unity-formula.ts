import { FixedPipe } from '../../shared/format-pipes';
import { Component, computed, input } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { OXIDE_GROUPS, formatFormula } from '../../../../lib/chemistry';
import { RecipeAnalysis } from '../../core/models';

export interface UnityColumn {
  title: string;
  oxides: Array<{ label: string; value: number }>;
}

const STABILIZERS = ['Al2O3', 'B2O3'];
const GLASS_FORMERS = ['SiO2'];

const UNITY_TITLE_KEYS = [
  marker('unity.fluxes'),
  marker('unity.stabilizers'),
  marker('unity.glassFormers'),
  marker('unity.wildcards')
];

/** The columns potters read a unity formula in, in order, in the page's language. */
export const UNITY_TITLES: readonly string[] = Object.defineProperties(
  [] as string[],
  Object.fromEntries(
    UNITY_TITLE_KEYS.map((key, index) => [index, { enumerable: true, get: () => translate(key) }])
  ) as PropertyDescriptorMap
);

/** Which of the UNITY_TITLES an oxide goes under. */
export function unityColumnOf(oxide: string): number {
  const group = OXIDE_GROUPS[oxide];
  if (group === 'R2O' || group === 'RO') return 0;
  return STABILIZERS.includes(oxide) ? 1 : GLASS_FORMERS.includes(oxide) ? 2 : 3;
}

/**
 * Splits a unity formula into the columns potters read: fluxes (which sum to
 * 1), stabilizers, glass formers, and everything else.
 */
export function unityColumns(uList: Record<string, number>): UnityColumn[] {
  const columns: UnityColumn[] = UNITY_TITLES.map((title) => ({ title, oxides: [] }));
  for (const [oxide, value] of Object.entries(uList)) {
    if (!(value > 0)) continue;
    columns[unityColumnOf(oxide)].oxides.push({ label: formatFormula(oxide), value });
  }
  return columns.filter((column, index) => index < 3 || column.oxides.length);
}

/** The silica to alumina ratio, from the saved value or from the unity formula. */
export function silicaAluminaRatio(analysis: RecipeAnalysis): number | null {
  if (typeof analysis.siAlRatio === 'number') return analysis.siAlRatio;
  const { SiO2, Al2O3 } = analysis.uList;
  return Al2O3 > 0 ? (SiO2 ?? 0) / Al2O3 : null;
}

@Component({
  selector: 'gc-unity-formula',
  imports: [FixedPipe, TranslocoDirective],
  // Its messages are the recipe page's; the landing page shows it too, so it loads them itself.
  template: `<ng-container *transloco="let t">
    <div class="umf-columns">
      @for (column of columns(); track column.title) {
        <section class="umf-column">
          <h3 class="umf-column-title">{{ column.title }}</h3>
          <ul>
            @for (oxide of column.oxides; track oxide.label) {
              <li>
                <span class="formula" translate="no">{{ oxide.label }}</span> : {{ oxide.value | gcFixed: 3 }}
              </li>
            }
          </ul>
        </section>
      }
    </div>
    @if (ratio() !== null) {
      <p class="umf-ratio">{{ t('unity.ratio', { ratio: (ratio() | gcFixed: 2) }) }}</p>
    }
  </ng-container>`,
  styles: `
    .umf-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
      gap: 0.75rem 1.5rem;
    }
    .umf-column-title {
      font-family: var(--gc-sans);
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--gc-muted);
      margin: 0 0 0.25rem;
    }
    .umf-column ul {
      list-style: none;
      padding: 0;
      margin: 0;
      font-variant-numeric: tabular-nums;
    }
    .umf-ratio {
      margin: 0.75rem 0 0;
      font-weight: 600;
    }
  `
})
export class UnityFormula {
  readonly analysis = input.required<RecipeAnalysis>();

  protected readonly columns = computed(() => unityColumns(this.analysis().uList));
  protected readonly ratio = computed(() => silicaAluminaRatio(this.analysis()));
}
