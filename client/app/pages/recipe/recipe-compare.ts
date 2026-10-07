import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MaterialInput } from '../../../../lib/chemistry';
import { Recipe } from '../../core/models';
import { firstOf } from '../../shared/options';
import { compareUnity, formatChange } from './compare';
import { amountOf, formatAmount, totalOf } from './rebase';
import { additiveAmount, evaluate } from './recipe-analysis';

export interface CompareChoice {
  /** 'draft' (the recipe being edited), 'before' (it before a swap), or a saved recipe's id. */
  key: string;
  label: string;
}

/** How colorants count in both unity formulas: as each recipe says, or the same in both. */
type Counting = 'each' | 'both' | 'neither';

const COUNTING: ReadonlyArray<{ value: Counting; label: string }> = [
  { value: 'each', label: 'As each recipe says' },
  { value: 'both', label: 'Count them in both' },
  { value: 'neither', label: 'Leave them out of both' }
];

/**
 * Two recipes side by side (issue #6): their unity formulas lined up oxide by
 * oxide with the change from the first to the second, then each recipe's
 * materials, colorants and notes. The options are not printed.
 */
@Component({
  selector: 'gc-recipe-compare',
  imports: [DecimalPipe],
  template: `
    <section class="compare-controls no-print" aria-labelledby="compare-heading">
      <h1 id="compare-heading" tabindex="-1">Compare two recipes</h1>
      <div class="compare-options">
        @for (side of sides; track side.name) {
          <div>
            <label class="form-label" [for]="'compare-' + side.name">{{ side.label }}</label>
            <select
              class="form-select"
              [id]="'compare-' + side.name"
              (change)="choose.emit({ side: side.name, key: $any($event.target).value })"
            >
              @if (!chosen(side.name)) {
                <option value="" selected>Choose a recipe</option>
              }
              @for (choice of choices(); track choice.key) {
                <option [value]="choice.key" [selected]="choice.key === keyOf(side.name)">{{ choice.label }}</option>
              }
            </select>
          </div>
        }
        <fieldset>
          <legend class="form-label">Colorants and additives in the unity formulas</legend>
          @for (option of countings; track option.value) {
            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                name="compare-counting"
                [id]="'compare-counting-' + option.value"
                [value]="option.value"
                [checked]="counting() === option.value"
                (change)="counting.set(option.value)"
              />
              <label class="form-check-label" [for]="'compare-counting-' + option.value">{{ option.label }}</label>
            </div>
          }
        </fieldset>
      </div>
      @if (countingDiffers()) {
        <p class="compare-note">
          One of these counts its colorants in the unity formula and the other does not. To compare like with like,
          count them in both or leave them out of both.
        </p>
      }
      <div class="compare-actions">
        <button type="button" class="btn btn-primary" (click)="print()">Print</button>
        <button type="button" class="btn btn-light border" (click)="back.emit()">Back to the recipe</button>
      </div>
    </section>

    <article class="compare-sheet" aria-labelledby="compare-title">
      <h2 id="compare-title">{{ titleOf(left()) }} and {{ titleOf(right()) }}</h2>

      <div class="compare-table-scroll" tabindex="0" role="region" aria-label="Unity formulas compared">
        <table class="compare-table">
          <caption>
            Unity formulas{{
              counting() === 'both' ? ', counting colorants' : counting() === 'neither' ? ', without colorants' : ''
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">Oxide</th>
              <th scope="col" class="num">{{ headingOf('left') }}</th>
              <th scope="col" class="num">{{ headingOf('right') }}</th>
              <th scope="col" class="num">Change</th>
            </tr>
          </thead>
          @for (group of groups(); track group.title) {
            <tbody>
              <tr class="compare-group">
                <th scope="rowgroup" colspan="4">{{ group.title }}</th>
              </tr>
              @for (row of group.rows; track row.label) {
                <tr>
                  <th scope="row">{{ row.label }}</th>
                  <td class="num">{{ row.left === null ? '-' : (row.left | number: digits(row.places)) }}</td>
                  <td class="num">{{ row.right === null ? '-' : (row.right | number: digits(row.places)) }}</td>
                  <td class="num compare-change">{{ change(row.change, row.places) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="muted">None in either.</td>
                </tr>
              }
            </tbody>
          }
        </table>
      </div>
      @for (problem of problems(); track problem) {
        <p class="compare-problem">{{ problem }}</p>
      }
      @for (warning of warnings(); track warning) {
        <p class="compare-warning">{{ warning }}</p>
      }

      <div class="compare-recipes">
        @for (side of recipesShown(); track side.name) {
          <section class="compare-recipe" [attr.aria-labelledby]="'compare-recipe-' + side.name">
            <h3 [id]="'compare-recipe-' + side.name">{{ titleOf(side.recipe) }}</h3>
            <table class="compare-materials">
              <caption class="visually-hidden">
                Materials of
                {{
                  titleOf(side.recipe)
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Material</th>
                  <th scope="col" class="num">Amount</th>
                  <th scope="col" class="num">% of base</th>
                </tr>
              </thead>
              <tbody>
                @for (material of side.recipe.materials; track $index) {
                  <tr>
                    <th scope="row">{{ material.name }}</th>
                    <td class="num">{{ material.amount }}</td>
                    <td class="num">{{ share(side.recipe, material.amount) }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (side.recipe.additives?.length) {
              <p class="compare-additives">
                <b>Colorants and additives:</b>
                @for (additive of side.recipe.additives; track $index; let last = $last) {
                  {{ additive.name }} {{ additiveAmount(additive) }}{{ last ? '' : ', ' }}
                }
              </p>
            }
            @if (notesOf(side.recipe); as notes) {
              <p class="compare-notes">{{ notes }}</p>
            }
          </section>
        }
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .compare-controls,
    .compare-sheet {
      background: var(--gc-surface);
      border: 1px solid var(--gc-border);
      border-radius: var(--gc-radius);
      box-shadow: var(--gc-shadow);
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
    }
    .compare-controls h1 {
      font-size: 1.6rem;
      margin: 0 0 1rem;
    }
    .compare-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: 1rem 2rem;
    }
    .compare-warning {
      color: var(--gc-muted);
      margin: 0.5rem 0 0;
    }
    .compare-note,
    .compare-problem {
      color: var(--gc-danger-text);
      font-weight: 600;
      margin: 0.75rem 0 0;
    }
    .compare-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }
    .compare-sheet h2 {
      font-size: 1.5rem;
      margin: 0 0 0.75rem;
    }
    .compare-table-scroll {
      overflow-x: auto;
    }
    .compare-table-scroll:focus-visible {
      outline: 3px solid rgba(var(--gc-primary-rgb), 0.5);
      outline-offset: 2px;
    }
    .compare-table,
    .compare-materials {
      width: 100%;
      border-collapse: collapse;
      font-variant-numeric: tabular-nums;
      margin: 0;
    }
    .compare-table caption {
      caption-side: top;
      color: var(--gc-text);
      font-weight: 600;
      padding: 0 0 0.25rem;
    }
    .compare-table th,
    .compare-table td,
    .compare-materials th,
    .compare-materials td {
      background: none;
      border-bottom: 1px solid var(--gc-border);
      padding: 0.3rem 0.5rem;
      text-align: left;
      vertical-align: top;
    }
    .compare-table tbody th,
    .compare-materials tbody th {
      font-weight: normal;
    }
    .compare-table .compare-group th {
      font-weight: 600;
      color: var(--gc-muted);
      padding-top: 0.75rem;
    }
    .num {
      text-align: right !important;
    }
    /* Numbers stay whole; a column's heading (a recipe's title) wraps instead. */
    td.num {
      white-space: nowrap;
    }
    .compare-table tbody th {
      min-width: 7rem;
    }
    .compare-change {
      font-weight: 600;
    }
    .compare-recipes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: 1rem 2rem;
      margin-top: 1.5rem;
    }
    .compare-recipe h3 {
      font-size: 1.15rem;
      margin: 0 0 0.5rem;
    }
    .compare-additives,
    .compare-notes {
      margin: 0.5rem 0 0;
    }
    .compare-notes {
      white-space: pre-line;
      color: var(--gc-muted);
    }
    @media (max-width: 575.98px) {
      .compare-controls,
      .compare-sheet {
        padding: 1rem 0.75rem;
      }
      .compare-table,
      .compare-materials {
        font-size: 0.875rem;
      }
      .compare-table th,
      .compare-table td,
      .compare-materials th,
      .compare-materials td {
        padding: 0.25rem 0.3rem;
      }
    }
    @media print {
      /* Tighter than on screen, so two recipes fit one page. */
      .compare-sheet {
        border: 0;
        box-shadow: none;
        padding: 0;
        font-size: 9.5pt;
        line-height: 1.35;
      }
      .compare-sheet h2 {
        font-size: 14pt;
      }
      .compare-table th,
      .compare-table td,
      .compare-materials th,
      .compare-materials td {
        padding: 0.1rem 0.4rem;
      }
      .compare-table .compare-group th {
        padding-top: 0.35rem;
      }
      .compare-recipes {
        margin-top: 0.75rem;
      }
      .compare-table-scroll {
        overflow: visible;
      }
      .compare-table tr,
      .compare-recipe {
        break-inside: avoid;
      }
    }
  `
})
export class RecipeCompare implements OnDestroy {
  private readonly titleService = inject(Title);
  private titleBefore: string | null = null;

  readonly left = input<Recipe | null>(null);
  readonly right = input<Recipe | null>(null);
  readonly leftKey = input('');
  readonly rightKey = input('');
  readonly choices = input<CompareChoice[]>([]);
  /** The chemistry an additive borrows by name, as Veegum borrows bentonite's. */
  readonly chemistryOf = input<(name: string) => MaterialInput | undefined>();
  readonly choose = output<{ side: 'left' | 'right'; key: string }>();
  readonly back = output<void>();

  protected readonly sides = [
    { name: 'left' as const, label: 'First recipe' },
    { name: 'right' as const, label: 'Second recipe' }
  ];
  protected readonly countings = COUNTING;
  protected readonly counting = signal<Counting>('each');
  protected readonly additiveAmount = additiveAmount;

  private readonly analyses = computed(() =>
    [this.left(), this.right()].map((recipe) => {
      if (!recipe) return null;
      const count = this.counting();
      return evaluate(recipe.materials ?? [], recipe.additives ?? [], {
        includeAdditives: count === 'each' ? !!recipe.includeAdditives : count === 'both',
        chemistryOf: this.chemistryOf()
      });
    })
  );
  protected readonly groups = computed(() => {
    const [left, right] = this.analyses();
    return compareUnity(left?.analysis ?? null, right?.analysis ?? null);
  });
  protected readonly problems = computed(() =>
    [this.left(), this.right()].flatMap((recipe, i) => {
      const problem = this.analyses()[i]?.problem;
      return recipe && problem ? [this.titleOf(recipe) + ' has no unity formula: ' + problem] : [];
    })
  );
  /** What the unity formulas left out, such as a colorant with no analysis to count, by recipe. */
  protected readonly warnings = computed(() =>
    [this.left(), this.right()].flatMap((recipe, i) =>
      recipe ? (this.analyses()[i]?.warnings ?? []).map((warning) => this.titleOf(recipe) + ': ' + warning) : []
    )
  );
  protected readonly countingDiffers = computed(
    () =>
      this.counting() === 'each' &&
      !!this.left() &&
      !!this.right() &&
      !!this.left()?.includeAdditives !== !!this.right()?.includeAdditives
  );
  protected readonly recipesShown = computed(() =>
    [
      { name: 'left', recipe: this.left() },
      { name: 'right', recipe: this.right() }
    ].filter((side): side is { name: string; recipe: Recipe } => !!side.recipe)
  );

  /** The page's title names both recipes; a PDF of the comparison takes it as its file name. */
  private readonly pageTitle = computed(
    () => 'Compare ' + this.titleOf(this.left()) + ' and ' + this.titleOf(this.right()) + ' - Glazecalc'
  );

  constructor() {
    effect(() => {
      // A new choice is a navigation, after which the router sets the route's own title; set it again.
      this.leftKey();
      this.rightKey();
      const title = this.pageTitle();
      untracked(() => {
        this.titleBefore ??= this.titleService.getTitle();
        this.titleService.setTitle(title);
      });
    });
  }

  ngOnDestroy(): void {
    if (this.titleBefore !== null && this.titleService.getTitle() === this.pageTitle()) {
      this.titleService.setTitle(this.titleBefore);
    }
  }

  protected keyOf(side: 'left' | 'right'): string {
    return side === 'left' ? this.leftKey() : this.rightKey();
  }

  /** Whether the side's recipe is one of the choices (not, say, one removed, or the page's after a reload). */
  protected chosen(side: 'left' | 'right'): boolean {
    const key = this.keyOf(side);
    return !!key && this.choices().some((choice) => choice.key === key);
  }

  /**
   * A column's heading: the recipe as the choices name it ("Being edited:
   * Celadon"), so two of the same title are told apart.
   */
  protected headingOf(side: 'left' | 'right'): string {
    const key = this.keyOf(side);
    return (
      this.choices().find((choice) => choice.key === key)?.label ??
      this.titleOf(side === 'left' ? this.left() : this.right())
    );
  }

  protected titleOf(recipe: Recipe | null): string {
    if (!recipe) return 'a recipe to choose';
    return recipe.title.trim() || 'Untitled recipe';
  }

  protected notesOf(recipe: Recipe): string {
    const notes = firstOf(recipe.notes).trim();
    return notes === 'None.' ? '' : notes;
  }

  protected share(recipe: Recipe, amount: string | undefined): string {
    const total = totalOf((recipe.materials ?? []).map((m) => m.amount));
    return total && amountOf(amount) ? formatAmount((amountOf(amount) / total) * 100, 1) + '%' : '';
  }

  protected digits(places: number): string {
    return `1.${places}-${places}`;
  }

  protected change(change: number | null, places: number): string {
    return formatChange(change, places);
  }

  protected print(): void {
    window.print();
  }
}
