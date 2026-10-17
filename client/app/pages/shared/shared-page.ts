import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { MaterialInput } from '../../../../lib/chemistry';
import { API_BASE } from '../../core/api-base';
import { errorMessage } from '../../core/error-message';
import { Additive, Recipe } from '../../core/models';
import { fixed } from '../../shared/format';
import { DatePipe } from '../../shared/format-pipes';
import { folded } from '../../shared/library-info';
import { RichText } from '../../i18n/rich-text';
import { leadIn, recipeHasLead } from '../recipe/lead';
import { printLines } from '../recipe/recipe-print';
import { evaluate } from '../recipe/recipe-analysis';
import { HazardSource, RecipeHazards } from '../recipe/recipe-hazards';
import { UnityFormula, unityColumns } from '../recipe/unity-formula';
import { WorkedCalculation } from '../recipe/worked-calculation';

/**
 * What GET /api/shared/recipe sends (server/lib/share_links.ts): the recipe,
 * and the chemistry its additives borrow. A line from the standard library has
 * ownedBy 'Standard' and the library's hazards; a potter's own has neither.
 */
export interface SharedRecipe extends Pick<Recipe, 'title' | 'date' | 'materials' | 'additives' | 'includeAdditives'> {
  notes?: string[];
  borrowed?: Array<Additive & { aliases?: string[] }>;
}

/** The secret in a share link's address, after the #: the browser never sends it anywhere by itself. */
export const secretIn = (hash: string): string => hash.replace(/^#/, '').trim();

type View = 'recipe' | 'worked';

/**
 * A recipe someone shared by link (docs/adr/0020-share-links.md), for anyone,
 * signed in or not: the recipe as its owner keeps it now, its unity formula,
 * and the working of it, step by step, to print as a worksheet. The page is
 * never indexed and names no Referer (server/lib/pages.ts). Its words are the
 * reader's language; the recipe is as its owner wrote it.
 */
@Component({
  selector: 'gc-shared-page',
  imports: [DatePipe, RecipeHazards, RichText, RouterLink, TranslocoDirective, UnityFormula, WorkedCalculation],
  template: `<ng-container *transloco="let t">
    @if (recipe(); as recipe) {
      <header class="page-header">
        <p class="shared-kicker">{{ t('recipe.shared.kicker') }}</p>
        <h1 id="shared-title" tabindex="-1">
          <bdi>{{ title() }}</bdi>
        </h1>
        @if (recipe.date) {
          <p class="shared-meta">{{ recipe.date | gcDate }}</p>
        }
        <p class="lead-text">{{ t('recipe.shared.lead') }}</p>
      </header>

      <div class="shared-controls no-print">
        <div class="btn-group" role="group" [attr.aria-label]="t('recipe.shared.viewLabel')">
          <button
            id="shared-view-recipe"
            type="button"
            class="btn btn-light border"
            [class.active]="view() === 'recipe'"
            [attr.aria-pressed]="view() === 'recipe'"
            (click)="view.set('recipe')"
          >
            {{ t('recipe.shared.recipeView') }}
          </button>
          <button
            id="shared-view-worked"
            type="button"
            class="btn btn-light border"
            [class.active]="view() === 'worked'"
            [attr.aria-pressed]="view() === 'worked'"
            (click)="view.set('worked')"
          >
            {{ t('recipe.shared.workedView') }}
          </button>
        </div>
        <button type="button" class="btn btn-primary" (click)="print()">{{ t('recipe.print.print') }}</button>
      </div>

      <article class="shared-sheet" aria-labelledby="shared-title">
        <!-- As on the recipe page, in both views and on paper: the lead caution, and the hazards below. -->
        @if (lead(); as lead) {
          <p class="shared-lead" role="note">
            <gc-rich
              [text]="t('recipe.page.containsLead', { unity: fixed(lead.unity, 3), percent: fixed(lead.percent, 0) })"
            />
          </p>
        }
        @if (view() === 'worked') {
          <gc-worked-calculation
            [materials]="recipe.materials"
            [additives]="recipe.additives ?? []"
            [includeAdditives]="!!recipe.includeAdditives"
            [chemistryOf]="chemistryOf"
            [level]="2"
          />
        } @else {
          @let printed = lines();
          <div class="shared-scroll" tabindex="0" role="region" [attr.aria-label]="t('recipe.print.materials')">
            <table class="shared-table">
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
                </tr>
              </thead>
              <tbody>
                @for (line of printed.materials; track $index) {
                  <tr>
                    <th scope="row">
                      {{ line.name }}
                      @if (line.formula) {
                        <span class="shared-formula" translate="no">{{ line.formula }}</span>
                      }
                    </th>
                    <td class="num">{{ line.amount }}</td>
                    <td class="num">{{ line.share }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{{ t('recipe.print.total') }}</th>
                  <td class="num">{{ printed.total }}</td>
                  <td class="num">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          @if (printed.additives.length) {
            <div class="shared-scroll" tabindex="0" role="region" [attr.aria-label]="t('recipe.print.additives')">
              <table class="shared-table">
                <caption>
                  {{
                    t('recipe.print.additives')
                  }}
                  <span class="shared-caption-note">{{
                    recipe.includeAdditives ? t('recipe.print.counted') : t('recipe.print.onTop')
                  }}</span>
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ t('recipe.print.additive') }}</th>
                    <th scope="col" class="num">{{ t('recipe.print.amount') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (line of printed.additives; track $index) {
                    <tr>
                      <th scope="row">{{ line.name }}</th>
                      <td class="num">{{ line.amount }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <section class="shared-chemistry" aria-labelledby="shared-unity">
            <h2 id="shared-unity">
              {{ recipe.includeAdditives ? t('recipe.print.unityCounted') : t('recipe.print.unity') }}
            </h2>
            @if (evaluation().analysis; as analysis) {
              <gc-unity-formula [analysis]="analysis" />
              <dl class="shared-facts">
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
                <ul class="shared-warnings">
                  @for (warning of evaluation().warnings; track warning) {
                    <li>{{ warning }}</li>
                  }
                </ul>
              }
              <p class="no-print">
                <button type="button" class="btn btn-light border btn-sm" (click)="view.set('worked')">
                  {{ t('recipe.page.showWorking') }}
                </button>
              </p>
            } @else {
              <p>{{ evaluation().problem ?? t('recipe.print.noAmounts') }}</p>
            }
          </section>

          @if (recipe.notes?.length) {
            <section class="shared-notes" aria-labelledby="shared-notes-heading">
              <h2 id="shared-notes-heading">{{ t('recipe.print.notes') }}</h2>
              @for (note of recipe.notes; track $index) {
                <p>{{ note }}</p>
              }
            </section>
          }
        }
        @if (hazardSources().length) {
          <gc-recipe-hazards
            class="shared-hazards"
            headingId="shared-hazards-heading"
            [level]="2"
            [sources]="hazardSources()"
          />
        }
      </article>
      <p class="shared-about no-print">
        {{ t('recipe.shared.about') }} <a routerLink="/">{{ t('recipe.shared.aboutLink') }}</a>
      </p>
    } @else if (state() === 'gone') {
      <header class="page-header">
        <h1 id="shared-title" tabindex="-1">{{ t('recipe.shared.goneTitle') }}</h1>
        <p class="lead-text">{{ t('recipe.shared.gone') }}</p>
      </header>
      <p>
        <a routerLink="/">{{ t('recipe.shared.aboutLink') }}</a>
      </p>
    } @else if (state() === 'failed') {
      <header class="page-header">
        <h1 id="shared-title" tabindex="-1">{{ t('recipe.shared.title') }}</h1>
      </header>
      <p class="shared-problem" role="alert">{{ problem() }}</p>
      <p>
        <button type="button" class="btn btn-light border" (click)="load()">{{ t('recipe.shared.retry') }}</button>
      </p>
    } @else {
      <header class="page-header">
        <h1>{{ t('recipe.shared.title') }}</h1>
      </header>
      <p class="muted" role="status">{{ t('recipe.shared.loading') }}</p>
    }
  </ng-container>`,
  styles: `
    :host {
      display: block;
    }
    .shared-kicker {
      color: var(--gc-muted);
      font-weight: 600;
      margin: 0 0 0.25rem;
    }
    .shared-meta {
      margin: 0.25rem 0 0;
    }
    .shared-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      align-items: center;
      margin: 0 0 1rem;
    }
    .shared-sheet {
      background: var(--gc-surface);
      color: var(--gc-text);
      border: 1px solid var(--gc-border);
      border-radius: var(--gc-radius);
      box-shadow: var(--gc-shadow);
      padding: 1.25rem 1.5rem;
      max-width: 52rem;
    }
    .shared-sheet h2 {
      font-size: 1.25rem;
      margin: 1rem 0 0.5rem;
    }
    .shared-scroll {
      overflow-x: auto;
    }
    .shared-scroll:focus-visible {
      outline: 3px solid rgba(var(--gc-primary-rgb), 0.5);
      outline-offset: 2px;
    }
    .shared-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.5rem 0 0;
    }
    .shared-table caption {
      caption-side: top;
      color: var(--gc-text);
      font-weight: 600;
      padding: 0 0 0.25rem;
    }
    .shared-caption-note {
      font-weight: normal;
      color: var(--gc-muted);
    }
    .shared-caption-note::before {
      content: '- ';
    }
    .shared-table th,
    .shared-table td {
      background: none;
      border-bottom: 1px solid var(--gc-border);
      padding: 0.3rem 0.5rem;
      text-align: start;
      vertical-align: top;
    }
    .shared-table tbody th {
      font-weight: normal;
    }
    .shared-table .num {
      text-align: end;
    }
    .shared-table td.num {
      font-variant-numeric: tabular-nums;
    }
    .shared-table tfoot th,
    .shared-table tfoot td {
      border-top: 2px solid var(--gc-text);
      border-bottom: 0;
      font-weight: 600;
    }
    .shared-formula {
      display: block;
      overflow-wrap: anywhere;
      font-size: 0.85em;
      color: var(--gc-muted);
    }
    .shared-facts {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.25rem 1rem;
      margin: 0.75rem 0 0;
    }
    .shared-facts dt {
      font-weight: 600;
    }
    .shared-facts dd {
      margin: 0;
    }
    .shared-warnings {
      color: var(--gc-muted);
      margin: 0.5rem 0 0;
    }
    .shared-lead {
      border-inline-start: 3px solid var(--gc-danger-text);
      padding-inline-start: 0.75rem;
      margin: 0 0 1rem;
    }
    .shared-hazards {
      display: block;
      margin: 1rem 0 0;
    }
    .shared-notes p {
      white-space: pre-line;
      margin: 0 0 0.5rem;
    }
    .shared-about {
      margin: 1.5rem 0 0;
      color: var(--gc-muted);
    }
    .shared-problem {
      color: var(--gc-danger-text);
    }
    @media (max-width: 575.98px) {
      .shared-sheet {
        padding: 1rem 0.75rem;
      }
      .shared-table {
        font-size: 0.8125rem;
      }
      .shared-table th,
      .shared-table td {
        padding: 0.25rem 0.3rem;
      }
      .shared-facts {
        grid-template-columns: 1fr;
      }
    }
    @media print {
      .shared-sheet {
        border: 0;
        border-radius: 0;
        box-shadow: none;
        padding: 0;
        max-width: none;
        font-size: 10.5pt;
      }
      .shared-scroll {
        overflow: visible;
      }
      .shared-table tr,
      .shared-chemistry,
      .shared-notes {
        break-inside: avoid;
      }
    }
  `
})
export class SharedPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly recipe = signal<SharedRecipe | null>(null);
  protected readonly state = signal<'loading' | 'gone' | 'failed'>('loading');
  protected readonly problem = signal('');
  protected readonly view = signal<View>('recipe');

  protected readonly title = computed(() => this.recipe()?.title.trim() || translate('recipe.page.untitled'));
  /** The chemistry an additive borrows by name, from the records the server sent with the recipe. */
  protected readonly chemistryOf = (name: string): MaterialInput | undefined => {
    const wanted = folded(name.trim());
    return this.recipe()?.borrowed?.find(
      (record) => folded(record.name) === wanted || (record.aliases ?? []).some((alias) => folded(alias) === wanted)
    );
  };
  protected readonly lines = computed(() => printLines(this.recipe() ?? { materials: [] }, 0, 'g'));
  protected readonly fixed = fixed;
  /** Lead in the materials, as the recipe page finds it: how much, for its caution. */
  protected readonly lead = computed(() => {
    const materials = this.recipe()?.materials ?? [];
    return recipeHasLead(materials) ? leadIn(materials) : null;
  });
  /**
   * What the hazards are read from: the lines as the server sent them, with the
   * library's current hazards for its own materials and additives, and none
   * for the owner's, which are then named as giving none.
   */
  protected readonly hazardSources = computed<HazardSource[]>(() => {
    const recipe = this.recipe();
    return recipe ? [...recipe.materials, ...(recipe.additives ?? [])] : [];
  });
  protected readonly evaluation = computed(() => {
    const recipe = this.recipe();
    return evaluate(recipe?.materials ?? [], recipe?.additives ?? [], {
      includeAdditives: !!recipe?.includeAdditives,
      chemistryOf: this.chemistryOf
    });
  });
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
    if (this.browser) void this.load();
  }

  protected async load(): Promise<void> {
    const secret = secretIn(globalThis.location?.hash ?? '');
    if (!secret) {
      this.state.set('gone');
      return;
    }
    this.state.set('loading');
    try {
      const recipe = await firstValueFrom(
        this.http.get<SharedRecipe>(this.apiBase + '/shared/recipe', { headers: { 'X-Share-Secret': secret } })
      );
      this.recipe.set({ ...recipe, materials: recipe.materials ?? [], additives: recipe.additives ?? [] });
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.state.set('gone');
      } else {
        this.problem.set(errorMessage(err, translate('recipe.shared.failed')));
        this.state.set('failed');
      }
    }
  }

  protected print(): void {
    window.print();
  }
}
