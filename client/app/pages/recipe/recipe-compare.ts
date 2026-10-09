import { listOf, upTo } from '../../shared/format';
import { FixedPipe, PlainPipe } from '../../shared/format-pipes';
import { Component, OnDestroy, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { MaterialInput } from '../../../../lib/chemistry';
import { Additive, Recipe } from '../../core/models';
import { RichText } from '../../i18n/rich-text';
import { firstOf } from '../../shared/options';
import { compareUnity, formatChange } from './compare';
import { amountOf, totalOf } from './rebase';
import { additiveAmount, evaluate } from './recipe-analysis';

export interface CompareChoice {
  /** 'draft' (the recipe being edited), 'before' (it before a swap), or a saved recipe's id. */
  key: string;
  label: string;
}

/** How colorants count in both unity formulas: as each recipe says, or the same in both. */
type Counting = 'each' | 'both' | 'neither';

/** The choices, each with its label's key. */
const COUNTING: ReadonlyArray<{ value: Counting; label: string }> = [
  { value: 'each', label: marker('recipe.compare.countEach') },
  { value: 'both', label: marker('recipe.compare.countBoth') },
  { value: 'neither', label: marker('recipe.compare.countNeither') }
];

/**
 * Two recipes side by side (issue #6): their unity formulas lined up oxide by
 * oxide with the change from the first to the second, then each recipe's
 * materials, colorants and notes. The options are not printed.
 */
@Component({
  selector: 'gc-recipe-compare',
  imports: [FixedPipe, PlainPipe, RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="compare-controls no-print" aria-labelledby="compare-heading">
      <h1 id="compare-heading" tabindex="-1">{{ t('recipe.compare.heading') }}</h1>
      <div class="compare-options">
        @for (side of sides; track side.name) {
          <div>
            <label class="form-label" [for]="'compare-' + side.name">{{ t(side.label) }}</label>
            <select
              class="form-select"
              [id]="'compare-' + side.name"
              (change)="choose.emit({ side: side.name, key: $any($event.target).value })"
            >
              @if (!chosen(side.name)) {
                <option value="" selected>{{ t('recipe.compare.choose') }}</option>
              }
              @for (choice of choices(); track choice.key) {
                <option [value]="choice.key" [selected]="choice.key === keyOf(side.name)">{{ choice.label }}</option>
              }
            </select>
          </div>
        }
        <fieldset>
          <legend class="form-label">{{ t('recipe.compare.counting') }}</legend>
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
              <label class="form-check-label" [for]="'compare-counting-' + option.value">{{ t(option.label) }}</label>
            </div>
          }
        </fieldset>
      </div>
      @if (countingDiffers()) {
        <p class="compare-note">
          {{ t('recipe.compare.countingDiffers') }}
        </p>
      }
      <div class="compare-actions">
        <button type="button" class="btn btn-primary" (click)="print()">{{ t('recipe.compare.print') }}</button>
        <button type="button" class="btn btn-light border" (click)="back.emit()">{{ t('recipe.compare.back') }}</button>
      </div>
      <!-- How a new recipe was made, when the page has one to show. -->
      <ng-content />
    </section>

    <article class="compare-sheet" aria-labelledby="compare-title">
      <h2 id="compare-title">{{ t('recipe.compare.title', { left: titleOf(left()), right: titleOf(right()) }) }}</h2>

      <div class="compare-table-scroll" tabindex="0" role="region" [attr.aria-label]="t('recipe.compare.tableLabel')">
        <table class="compare-table">
          <caption>
            {{
              t('recipe.compare.caption', { counting: counting() })
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('recipe.compare.oxide') }}</th>
              <th scope="col" class="num" translate="no">{{ headingOf('left') }}</th>
              <th scope="col" class="num" translate="no">{{ headingOf('right') }}</th>
              <th scope="col" class="num">{{ t('recipe.compare.change') }}</th>
            </tr>
          </thead>
          @for (group of groups(); track group.title) {
            <tbody>
              <tr class="compare-group">
                <th scope="rowgroup" colspan="4">{{ group.title }}</th>
              </tr>
              @for (row of group.rows; track row.label) {
                <tr>
                  <th scope="row" [attr.translate]="row.formula ? 'no' : null">{{ row.label }}</th>
                  <td class="num">{{ row.left === null ? '-' : (row.left | gcFixed: row.places) }}</td>
                  <td class="num">{{ row.right === null ? '-' : (row.right | gcFixed: row.places) }}</td>
                  <td class="num compare-change">{{ change(row.change, row.places) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="muted">{{ t('recipe.compare.noneInEither') }}</td>
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
            <h3 [id]="'compare-recipe-' + side.name" translate="no">{{ titleOf(side.recipe) }}</h3>
            <table class="compare-materials">
              <caption class="visually-hidden">
                {{
                  t('recipe.compare.materialsOf', { title: titleOf(side.recipe) })
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ t('recipe.compare.material') }}</th>
                  <th scope="col" class="num">{{ t('recipe.compare.amount') }}</th>
                  <th scope="col" class="num">{{ t('recipe.compare.share') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (material of side.recipe.materials; track $index) {
                  <tr>
                    <th scope="row">{{ material.name }}</th>
                    <td class="num">{{ material.amount | gcPlain }}</td>
                    <td class="num">{{ share(side.recipe, material.amount) }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (side.recipe.additives?.length) {
              <p class="compare-additives">
                <gc-rich [text]="t('recipe.compare.additives', { list: additivesOf(side.recipe.additives) })" />
              </p>
            }
            @if (notesOf(side.recipe); as notes) {
              <p class="compare-notes">{{ notes }}</p>
            }
          </section>
        }
      </div>
    </article>
  </ng-container>`,
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
      text-align: start;
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
      text-align: end !important;
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
  /** The chemistry an additive borrows by name (chemistryOf), for one with no analysis of its own. */
  readonly chemistryOf = input<(name: string) => MaterialInput | undefined>();
  readonly choose = output<{ side: 'left' | 'right'; key: string }>();
  readonly back = output<void>();

  protected readonly sides = [
    { name: 'left' as const, label: marker('recipe.compare.first') },
    { name: 'right' as const, label: marker('recipe.compare.second') }
  ];
  protected readonly countings = COUNTING;
  protected readonly counting = signal<Counting>('each');

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
      return recipe && problem ? [translate('recipe.compare.noUnity', { title: this.titleOf(recipe), problem })] : [];
    })
  );
  /** What the unity formulas left out, such as a colorant with no analysis to count, by recipe. */
  protected readonly warnings = computed(() =>
    [this.left(), this.right()].flatMap((recipe, i) =>
      recipe
        ? (this.analyses()[i]?.warnings ?? []).map((warning) =>
            translate('recipe.compare.warning', { title: this.titleOf(recipe), warning })
          )
        : []
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
  private readonly pageTitle = computed(() =>
    translate('recipe.compare.pageTitle', { left: this.titleOf(this.left()), right: this.titleOf(this.right()) })
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
    if (!recipe) return translate('recipe.compare.toChoose');
    return recipe.title.trim() || translate('recipe.page.untitled');
  }

  /** A recipe's colorants and additives, each with its amount: "Rutile 4%, Red iron oxide 2%". */
  protected additivesOf(additives: Additive[]): string {
    return listOf(
      additives.map((additive) => additive.name + ' ' + additiveAmount(additive)),
      'unit'
    );
  }

  protected notesOf(recipe: Recipe): string {
    const notes = firstOf(recipe.notes).trim();
    return notes === 'None.' ? '' : notes;
  }

  protected share(recipe: Recipe, amount: string | undefined): string {
    const total = totalOf((recipe.materials ?? []).map((m) => m.amount));
    return total && amountOf(amount) ? upTo((amountOf(amount) / total) * 100, 1) + '%' : '';
  }

  protected change(change: number | null, places: number): string {
    return formatChange(change, places);
  }

  protected print(): void {
    window.print();
  }
}
