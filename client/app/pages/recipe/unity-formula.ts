import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { OXIDE_GROUPS, formatFormula } from '../../../../lib/chemistry';
import { RecipeAnalysis } from '../../core/models';

export interface UnityColumn {
  title: string;
  oxides: Array<{ label: string; value: number }>;
}

const STABILIZERS = ['Al2O3', 'B2O3'];
const GLASS_FORMERS = ['SiO2'];

/**
 * Splits a unity formula into the columns potters read: fluxes (which sum to
 * 1), stabilizers, glass formers, and everything else.
 */
export function unityColumns(uList: Record<string, number>): UnityColumn[] {
  const columns: UnityColumn[] = [
    { title: 'Fluxes - RO', oxides: [] },
    { title: 'Stabilizers - R₂O₃', oxides: [] },
    { title: 'Glass Formers - RO₂', oxides: [] },
    { title: 'Wildcards', oxides: [] }
  ];
  for (const [oxide, value] of Object.entries(uList)) {
    if (!(value > 0)) continue;
    const group = OXIDE_GROUPS[oxide];
    const column =
      group === 'R2O' || group === 'RO' ? 0 : STABILIZERS.includes(oxide) ? 1 : GLASS_FORMERS.includes(oxide) ? 2 : 3;
    columns[column].oxides.push({ label: formatFormula(oxide), value });
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
  imports: [DecimalPipe],
  template: `
    <div class="umf-columns">
      @for (column of columns(); track column.title) {
        <section class="umf-column">
          <h3 class="umf-column-title">{{ column.title }}</h3>
          <ul>
            @for (oxide of column.oxides; track oxide.label) {
              <li>{{ oxide.label }} : {{ oxide.value | number: '1.3-3' }}</li>
            }
          </ul>
        </section>
      }
    </div>
    @if (ratio() !== null) {
      <p class="umf-ratio">Ratio of Silica to Alumina : {{ ratio() | number: '1.2-2' }}</p>
    }
  `,
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
