import { Component, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { OXIDE_GROUPS, formatFormula } from '../../../../lib/chemistry';
import type { OxideCloseness } from '../../../../lib/chemistry';
import type { FiringBand } from '../../../../lib/recipe/limits';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { Material, Recipe } from '../../core/models';
import { PendingRecipeService } from '../../core/pending-recipe.service';
import { PreferencesService } from '../../core/preferences.service';
import { ShelfService } from '../../core/shelf.service';
import { RichText } from '../../i18n/rich-text';
import { FieldCheck, FieldChecks, numberCheck } from '../../shared/field-checks';
import { fixed, formatPlain, listOf, notANumber, plainNumber } from '../../shared/format';
import { hasLead } from '../../shared/library-info';
import { NumberInput } from '../../shared/number-input';
import { PageHeader } from '../../shared/page-header';
import { OwnLimitsNote } from '../recipe/own-limits-note';
import { TryMaterial, oxideLabel, oxideName } from '../recipe/pool';
import { RecipeHazards, hazardSources } from '../recipe/recipe-hazards';
import { RecipeLibrary, libraryKey } from '../recipe/recipe-library';
import { RecipeLimits } from '../recipe/recipe-limits';
import { recipeText } from '../recipe/recipe-messages';
import { SolveProblem, SolveRun, Solved, TargetKind, cautionsOf, parseTarget, solve } from './solve';

/** The oxides offered as fields, in a unity formula's order: fluxes, then alumina and boron, then silica. */
const FIELDS = [
  'Li2O',
  'Na2O',
  'K2O',
  'MgO',
  'CaO',
  'SrO',
  'BaO',
  'ZnO',
  'B2O3',
  'Al2O3',
  'Fe2O3',
  'SiO2',
  'TiO2',
  'ZrO2',
  'P2O5'
];

/** The three columns of a unity formula, as the keys of their names. */
const GROUPS: ReadonlyArray<{ id: string; label: string; of: (group: string) => boolean }> = [
  { id: 'fluxes', label: marker('recipe.solve.groups.fluxes'), of: (group) => group === 'R2O' || group === 'RO' },
  { id: 'middle', label: marker('recipe.solve.groups.middle'), of: (group) => group === 'R2O3' },
  { id: 'glass', label: marker('recipe.solve.groups.glass'), of: (group) => group === 'RO2' }
];

const VERDICTS: Record<OxideCloseness['verdict'], string> = {
  close: marker('recipe.solve.verdicts.close'),
  off: marker('recipe.solve.verdicts.off'),
  far: marker('recipe.solve.verdicts.far')
};

/** The whole recipe's verdict, for its notes. */
const OVERALL: Record<Solved['closeness']['verdict'], string> = {
  close: marker('recipe.solve.overall.close'),
  fair: marker('recipe.solve.overall.fair'),
  poor: marker('recipe.solve.overall.poor')
};

/** The kinds of target, as the keys of their names. */
const KIND_LABELS: Record<TargetKind, string> = {
  unity: marker('recipe.solve.kinds.unity'),
  analysis: marker('recipe.solve.kinds.analysis')
};

/** More than this above the best the materials could do, and the recipe could come nearer (as the swap report says). */
const COULD_BE_NEARER = 0.5;

const isFlux = (oxide: string): boolean => OXIDE_GROUPS[oxide] === 'R2O' || OXIDE_GROUPS[oxide] === 'RO';
const fieldId = (oxide: string): string => 'solve-oxide-' + oxide;

/** A solved recipe, with what it was asked and the target's words for the notes. */
interface Result {
  solved: Solved;
  run: SolveRun;
  /** The page's target and materials when it was solved, to tell when it is out of date. */
  asked: string;
}

/**
 * Solve for a target (docs/adr/0026-target-and-solve.md): the potter types a
 * unity formula or an oxide analysis (or pastes one from another app), picks
 * the materials (those on hand to start with), and gets a recipe in percent
 * with how near it comes, oxide by oxide, the cautions the recipe page gives
 * and its hazards. "Open as a new recipe" takes it to the recipe page, not
 * saved yet.
 */
@Component({
  selector: 'gc-solve-page',
  imports: [
    FieldCheck,
    FormsModule,
    NumberInput,
    OwnLimitsNote,
    PageHeader,
    RecipeHazards,
    RecipeLibrary,
    RecipeLimits,
    RichText,
    RouterLink,
    TranslocoDirective
  ],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('recipe.solve.title')" [lead]="t('recipe.solve.lead')" />
    <p>
      <a routerLink="/recipe">{{ t('recipe.import.backToRecipes') }}</a>
    </p>

    <section class="panel" aria-labelledby="solve-target-heading">
      <h2 class="h4" id="solve-target-heading">{{ t('recipe.solve.targetHeading') }}</h2>
      <fieldset class="solve-kinds">
        <legend class="form-label">{{ t('recipe.solve.kindLegend') }}</legend>
        @for (option of kinds; track option) {
          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="solve-kind"
              [id]="'solve-kind-' + option"
              [value]="option"
              [checked]="kind() === option"
              (change)="kind.set(option)"
            />
            <label class="form-check-label" [for]="'solve-kind-' + option">{{ t(kindLabels[option]) }}</label>
          </div>
        }
      </fieldset>

      <div class="solve-groups">
        @for (group of groups(); track group.id) {
          <fieldset class="solve-group" [attr.aria-describedby]="group.id === 'fluxes' ? 'solve-sum' : null">
            <legend class="solve-group-legend">{{ t(group.label) }}</legend>
            <div class="solve-fields">
              @for (oxide of group.oxides; track oxide) {
                <div class="solve-field">
                  <label class="form-label" [for]="fieldId(oxide)">{{ label(oxide) }}</label>
                  <input
                    [id]="fieldId(oxide)"
                    type="text"
                    inputmode="decimal"
                    class="form-control form-control-sm"
                    autocomplete="off"
                    [gcNumber]="values()[oxide] ?? ''"
                    (gcNumberChange)="setValue(oxide, $event)"
                    [gcField]="checks"
                    [gcFieldName]="fieldId(oxide)"
                    (keydown.enter)="run()"
                  />
                </div>
              }
            </div>
          </fieldset>
        }
      </div>
      <p id="solve-sum" class="small muted solve-sum" aria-live="polite">
        @if (kind() === 'unity') {
          {{ t('recipe.solve.fluxSum', { sum: fixed(fluxSum(), 2) }) }}
          @if (fluxSum() > 0 && offUnity()) {
            {{ t('recipe.solve.fluxScaled') }}
          }
        } @else {
          {{ t('recipe.solve.analysisSum', { sum: fixed(total(), 1) }) }}
        }
      </p>

      <div class="solve-paste">
        <label class="form-label" for="solve-paste">{{ t('recipe.solve.pasteLabel') }}</label>
        <textarea
          id="solve-paste"
          class="form-control"
          rows="3"
          aria-describedby="solve-paste-hint"
          [ngModel]="paste()"
          (ngModelChange)="paste.set($event)"
        ></textarea>
        <p id="solve-paste-hint" class="small muted">{{ t('recipe.solve.pasteHint') }}</p>
        <div class="solve-buttons">
          <button type="button" class="btn btn-light border btn-sm" (click)="readPaste()">
            {{ t('recipe.solve.pasteRead') }}
          </button>
          <button type="button" class="btn btn-light border btn-sm" (click)="clearTarget()">
            {{ t('recipe.solve.clear') }}
          </button>
        </div>
        <p class="small solve-paste-status" role="status">{{ pasteStatus() }}</p>
      </div>
    </section>

    <section class="panel" aria-labelledby="solve-materials-heading">
      <h2 class="h4" id="solve-materials-heading" tabindex="-1">{{ t('recipe.solve.materialsHeading') }}</h2>
      <p>{{ t('recipe.solve.materialsIntro') }}</p>
      @if (shelfEmpty() && !tries().length) {
        <p class="muted">{{ t('recipe.solve.shelfEmpty') }}</p>
      }
      @if (shelfProblem()) {
        <p class="solve-problem" role="alert">{{ shelfProblem() }}</p>
      }
      @if (!ready()) {
        <p class="muted">{{ t('recipe.page.gettingShelf') }}</p>
      }
      @if (tries().length) {
        <ul
          class="solve-tries"
          [attr.aria-label]="t('recipe.tryMaterials.list', { list: 'tries', count: tries().length })"
        >
          @for (tried of tries(); track tried.material.name; let i = $index) {
            <li>
              <bdi class="solve-try-name">{{ tried.material.name }}</bdi>
              <span class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="checkbox"
                  [id]="'solve-must-' + i"
                  [checked]="tried.must"
                  (change)="setMust(i, $any($event.target).checked)"
                />
                <label class="form-check-label" [for]="'solve-must-' + i">{{ t('recipe.tryMaterials.mustUse') }}</label>
              </span>
              <button
                type="button"
                class="btn btn-link btn-sm"
                [attr.aria-label]="t('recipe.tryMaterials.removeFrom', { list: 'tries', name: tried.material.name })"
                (click)="removeTry(i)"
              >
                {{ t('recipe.tryMaterials.remove') }}
              </button>
            </li>
          }
        </ul>
      }
      <div class="solve-buttons">
        <button type="button" class="btn btn-light border btn-sm" (click)="fromShelf()">
          {{ t('recipe.solve.fromShelf') }}
        </button>
      </div>
      <gc-recipe-library
        [heading]="t('recipe.tryMaterials.heading')"
        noun="materials"
        [markLabel]="t('recipe.tryMaterials.added')"
        [mine]="myMaterials()"
        [standard]="standardMaterials()"
        [standardFailed]="standardFailed()"
        [inRecipe]="triedKeys()"
        [hideLead]="leadOff()"
        (pick)="addTry($event)"
        (retry)="loadStandard()"
      />
    </section>

    <div class="solve-go">
      <button id="solve-run" type="button" class="btn btn-primary" (click)="run()">
        {{ t('recipe.solve.solve') }}
      </button>
      <p id="solve-problem" class="solve-problem" role="alert">{{ problem() }}</p>
    </div>

    @if (result(); as r) {
      <section class="panel" aria-labelledby="solve-result-heading">
        <h2 class="h4" id="solve-result-heading" tabindex="-1">{{ t('recipe.solve.resultHeading') }}</h2>
        @if (stale()) {
          <p class="solve-stale" role="status">{{ t('recipe.solve.stale') }}</p>
        }
        <table class="table table-sm solve-recipe">
          <thead>
            <tr>
              <th scope="col">{{ t('recipe.page.materialColumn') }}</th>
              <th scope="col" class="num">{{ t('recipe.solve.percentColumn') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (line of r.solved.materials; track line.name) {
              <tr>
                <th scope="row">
                  <bdi>{{ line.name }}</bdi>
                </th>
                <td class="num">{{ formatPlain(line.amount) }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (r.solved.fluxes !== 1 && offUnityBy(r.solved.fluxes)) {
          <p class="small muted">{{ t('recipe.solve.scaledNote', { sum: fixed(r.solved.fluxes, 3) }) }}</p>
        }
        <div class="solve-buttons">
          <button id="solve-open" type="button" class="btn btn-success" (click)="openAsRecipe()">
            {{ t('recipe.solve.open') }}
          </button>
        </div>
        <p class="small muted">{{ t('recipe.solve.openNote') }}</p>

        <h3 class="h5">{{ t('recipe.solve.nearHeading') }}</h3>
        <p class="solve-verdict" [attr.data-verdict]="r.solved.closeness.verdict">{{ summary() }}</p>
        @if (r.solved.report.unreachable.length) {
          <p>{{ t('recipe.solve.unreachable', { list: unreachable() }) }}</p>
        }
        <div class="table-responsive" tabindex="0" role="region" [attr.aria-label]="t('recipe.solve.nearCaption')">
          <table class="table table-sm solve-near">
            <caption>
              {{
                t('recipe.solve.nearCaption')
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('recipe.solve.oxideColumn') }}</th>
                <th scope="col" class="num">{{ t('recipe.solve.targetColumn') }}</th>
                <th scope="col" class="num">{{ t('recipe.solve.recipeColumn') }}</th>
                <th scope="col" class="num">{{ t('recipe.solve.differenceColumn') }}</th>
                <th scope="col">{{ t('recipe.solve.verdictColumn') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of r.solved.closeness.oxides; track row.oxide) {
                <tr [attr.data-verdict]="row.verdict">
                  <th scope="row" translate="no">{{ rowLabel(row.oxide) }}</th>
                  <td class="num">{{ fixed(row.was, 3) }}</td>
                  <td class="num">{{ fixed(row.now, 3) }}</td>
                  <td class="num">{{ signed(row.difference) }}</td>
                  <td>{{ t(verdicts[row.verdict]) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <h3 class="h5">{{ t('recipe.solve.usesHeading') }}</h3>
        <ul class="solve-uses">
          @for (use of r.solved.report.uses; track use.name) {
            <li>
              <gc-rich
                [text]="t('recipe.swapReport.use', { name: use.name, amount: use.amount, supplies: use.supplies })"
              />{{ ' ' }}
              @if (!use.needed) {
                <span class="muted">{{ t('recipe.swapReport.nearlyAsGood') }}</span>
              }
              <button
                type="button"
                class="btn btn-link btn-sm"
                [attr.aria-label]="t('recipe.swapReport.leaveOutName', { name: use.name })"
                (click)="leaveOut(use.name)"
              >
                {{ t('recipe.swapReport.leaveOut') }}
              </button>
            </li>
          }
        </ul>
        @for (cap of r.solved.report.capped; track cap.name) {
          <p>
            {{
              cap.why
                ? t('recipe.swapReport.cappedWhy', {
                    wouldBe: fixed(cap.wouldBe, 0),
                    list: listOf(cap.members),
                    most: fixed(cap.most, 0),
                    why: cap.why
                  })
                : t('recipe.swapReport.capped', {
                    wouldBe: fixed(cap.wouldBe, 0),
                    list: listOf(cap.members),
                    most: fixed(cap.most, 0)
                  })
            }}
            <button
              type="button"
              class="btn btn-link btn-sm"
              [attr.aria-label]="t('recipe.swapReport.allowMoreOf', { list: listOf(cap.members) })"
              (click)="allowMore(cap.members)"
            >
              {{ t('recipe.swapReport.allowMore') }}
            </button>
          </p>
        }
        @if (r.solved.report.couldHelp.length) {
          <p>{{ t('recipe.swapReport.couldHelp') }}</p>
          <ul class="solve-uses">
            @for (help of r.solved.report.couldHelp; track help.name) {
              <li>
                <bdi>{{ help.name }}</bdi
                >&ngsp;
                <button
                  type="button"
                  class="btn btn-link btn-sm"
                  [attr.aria-label]="t('recipe.swapReport.addName', { name: help.name })"
                  (click)="mustUse(help.name)"
                >
                  {{ t('recipe.swapReport.add') }}
                </button>
              </li>
            }
          </ul>
        }
        @if (avoid().length) {
          <p>
            {{ t('recipe.swapReport.leftOut', { list: listOf(avoid()) }) }}
            <button type="button" class="btn btn-link btn-sm" (click)="allowAgain()">
              {{ t('recipe.swapReport.allowAgain') }}
            </button>
          </p>
        }
        @if (cautions().length) {
          <h3 class="h5">{{ t('recipe.swapReport.watchFor') }}</h3>
          <gc-own-limits-note />
          <ul class="solve-cautions">
            @for (caution of cautions(); track caution) {
              <li>{{ caution }}</li>
            }
          </ul>
        }
        <gc-recipe-limits [unity]="r.solved.unity" [(firing)]="firing" [materials]="names()" />
        <gc-recipe-hazards [sources]="hazards()" />
      </section>
    }
  </ng-container>`,
  styles: `
    .solve-kinds {
      margin-bottom: 1rem;
    }
    .solve-groups {
      display: grid;
      gap: 0.75rem;
    }
    .solve-group-legend {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    /* Fields as wide as a figure, as many to a row as fit: two on a 320 px phone. */
    .solve-fields {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
      gap: 0.5rem 0.75rem;
    }
    .solve-field {
      min-width: 0;
    }
    .solve-field .form-label {
      font-size: 0.9rem;
      margin-bottom: 0.15rem;
    }
    .solve-sum {
      margin: 0.75rem 0;
    }
    .solve-paste textarea {
      font-family: var(--bs-font-monospace);
    }
    .solve-paste-status:empty {
      display: none;
    }
    .solve-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.5rem 0;
    }
    .solve-tries {
      list-style: none;
      padding: 0;
      margin: 0 0 0.5rem;
    }
    .solve-tries li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.75rem;
      border-top: 1px solid var(--gc-border);
      padding: 0.2rem 0;
    }
    .solve-try-name {
      flex: 1 1 10rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .solve-go {
      margin: 0 0 1.5rem;
    }
    .solve-problem {
      color: var(--gc-danger-text);
      margin: 0.5rem 0 0;
    }
    .solve-problem:empty {
      display: none;
    }
    .solve-stale {
      border-inline-start: 3px solid var(--gc-accent);
      padding-inline-start: 0.5rem;
    }
    .solve-recipe {
      max-width: 28rem;
    }
    .solve-recipe th[scope='row'] {
      font-weight: normal;
    }
    .num {
      text-align: end;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .solve-near caption {
      caption-side: top;
      color: var(--gc-muted);
      font-size: 0.9rem;
    }
    .solve-near tr[data-verdict='far'] td:last-child,
    .solve-near tr[data-verdict='off'] td:last-child {
      font-weight: 600;
    }
    .solve-uses,
    .solve-cautions {
      padding-inline-start: 1.25rem;
    }
  `
})
export class SolvePage implements OnInit {
  private readonly resources = inject(ApiResourceFactory);
  private readonly materials = this.resources.for<Material>('materials');
  private readonly shelf = inject(ShelfService);
  private readonly preferences = inject(PreferencesService);
  private readonly pending = inject(PendingRecipeService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly kinds: TargetKind[] = ['unity', 'analysis'];
  protected readonly verdicts = VERDICTS;
  protected readonly kindLabels = KIND_LABELS;
  protected readonly fixed = fixed;
  protected readonly formatPlain = formatPlain;
  protected readonly listOf = listOf;
  protected readonly fieldId = fieldId;

  protected readonly kind = signal<TargetKind>('unity');
  /** What is typed in each oxide's field, as saved (a plain number, or text that is not one). */
  protected readonly values = signal<Record<string, string>>({});
  /** Oxides pasted in that have no field of their own: they get one. */
  private readonly extra = signal<string[]>([]);
  protected readonly paste = signal('');
  protected readonly pasteStatus = signal('');

  protected readonly myMaterials = signal<Material[]>([]);
  protected readonly standardMaterials = signal<Material[]>([]);
  protected readonly standardFailed = signal(false);
  protected readonly tries = signal<TryMaterial[]>([]);
  /** Whether the lists and the materials on hand have come (or failed). */
  protected readonly ready = signal(false);
  protected readonly shelfEmpty = computed(() => this.ready() && (this.shelf.keys() ?? []).length === 0);
  protected readonly shelfProblem = this.shelf.problem;
  protected readonly leadOff = computed(() => this.preferences.lead() === 'off');
  protected readonly triedKeys = computed(() => new Set(this.tries().map((tried) => libraryKey(tried.material))));

  /** Names left out, and raw clays allowed past the hold, from the report's buttons. */
  protected readonly avoid = signal<string[]>([]);
  private readonly uncapped = signal<string[]>([]);
  protected readonly problem = signal('');
  protected readonly result = signal<Result | null>(null);
  /** The firing chosen in the limits panel, which the cautions follow. */
  protected readonly firing = signal<FiringBand | ''>('');

  protected readonly checks = new FieldChecks(() =>
    Object.fromEntries(
      this.fields().map((oxide) => [fieldId(oxide), numberCheck(() => this.values()[oxide], notANumber())])
    )
  );

  protected readonly fields = computed(() => [...FIELDS, ...this.extra().filter((oxide) => !FIELDS.includes(oxide))]);
  /** The fields in a unity formula's three columns. */
  protected readonly groups = computed(() =>
    GROUPS.map((group) => ({ ...group, oxides: this.fields().filter((oxide) => group.of(OXIDE_GROUPS[oxide] ?? '')) }))
  );
  /** The amounts typed that are numbers above nothing. */
  private readonly amounts = computed(() =>
    Object.fromEntries(
      Object.entries(this.values())
        .map(([oxide, text]) => [oxide, plainNumber(text) ?? 0] as const)
        .filter(([, amount]) => amount > 0)
    )
  );
  protected readonly fluxSum = computed(() =>
    Object.entries(this.amounts()).reduce((sum, [oxide, amount]) => (isFlux(oxide) ? sum + amount : sum), 0)
  );
  protected readonly total = computed(() => Object.values(this.amounts()).reduce((sum, amount) => sum + amount, 0));
  protected readonly offUnity = computed(() => this.offUnityBy(this.fluxSum()));
  /** The target and materials as they are now, to compare with what was solved. */
  private readonly asked = computed(() =>
    JSON.stringify({
      kind: this.kind(),
      amounts: this.amounts(),
      tries: this.tries().map((tried) => [tried.material.name, tried.must])
    })
  );
  protected readonly stale = computed(() => {
    const result = this.result();
    return !!result && result.asked !== this.asked();
  });

  protected readonly cautions = computed(() => {
    const result = this.result();
    return result ? cautionsOf(result.solved, this.firing()) : [];
  });
  protected readonly names = computed(() => (this.result()?.solved.materials ?? []).map((material) => material.name));
  protected readonly hazards = computed(() =>
    hazardSources(this.result()?.solved.materials ?? [], this.standardMaterials(), this.myMaterials())
  );
  protected readonly unreachable = computed(() =>
    listOf((this.result()?.solved.report.unreachable ?? []).map(oxideName))
  );

  /** How near it comes, in a sentence: the verdict, the oxides off or far, and whether these materials could do better. */
  protected readonly summary = computed(() => {
    const solved = this.result()?.solved;
    if (!solved) return '';
    const { closeness, report } = solved;
    const named = (verdict: string) =>
      listOf(closeness.oxides.filter((row) => row.verdict === verdict).map((row) => this.rowLabel(row.oxide)));
    const first =
      closeness.verdict === 'close'
        ? translate('recipe.solve.close')
        : closeness.verdict === 'fair'
          ? translate('recipe.solve.fair', { list: named('off') })
          : translate('recipe.solve.poor', { list: named('far') });
    const nearer =
      report.miss - report.best < COULD_BE_NEARER
        ? translate('recipe.solve.cannotBeNearer')
        : translate('recipe.solve.couldBeNearer');
    return first + ' ' + nearer;
  });

  ngOnInit(): void {
    void Promise.all([this.loadStandard(), this.loadMine(), this.shelf.load()]).then(() => {
      this.ready.set(true);
      this.fromShelf();
    });
  }

  protected loadStandard(): Promise<void> {
    return this.materials.getStandard().then(
      (list) => {
        this.standardMaterials.set(list);
        this.standardFailed.set(false);
      },
      () => this.standardFailed.set(true)
    );
  }

  private loadMine(): Promise<void> {
    return this.materials.getAll().then(
      (list) => this.myMaterials.set(list),
      () => this.myMaterials.set([])
    );
  }

  /** The materials on hand, as the list to make the recipe from (those with lead left out while lead is off). */
  protected fromShelf(): void {
    const all = [...this.standardMaterials(), ...this.myMaterials()];
    const materials = (this.shelf.keys() ?? [])
      .map((key) => all.find((material) => libraryKey(material) === key))
      .filter((material): material is Material => !!material && !(this.leadOff() && hasLead(material)));
    this.tries.set(materials.map((material) => ({ material, must: false })));
    this.avoid.set([]);
  }

  /** A field's label: "potash (K₂O)", or the formula for an oxide without a common name. */
  protected label(oxide: string): string {
    return oxideLabel(oxide);
  }

  /** An oxide in the closeness table: its formula, or KNaO said in words. */
  protected rowLabel(oxide: string): string {
    return oxide === 'KNaO' ? translate('recipe.solve.knao') : formatFormula(oxide);
  }

  protected signed(value: number): string {
    const text = fixed(value, 3);
    return value > 0 && text !== fixed(0, 3) ? '+' + text : text;
  }

  protected offUnityBy(sum: number): boolean {
    return Math.abs(sum - 1) > 0.005;
  }

  protected setValue(oxide: string, value: string): void {
    this.values.update((values) => ({ ...values, [oxide]: value }));
  }

  /** Fills the fields from the pasted text: what it read, in place of what was there. */
  protected readPaste(): void {
    const read = parseTarget(this.paste());
    const found = Object.keys(read.oxides);
    const said: string[] = [];
    if (read.together) said.push(recipeText({ code: 'solve.together' }));
    if (found.length) {
      this.values.set(Object.fromEntries(found.map((oxide) => [oxide, String(read.oxides[oxide])])));
      this.extra.set(found.filter((oxide) => !FIELDS.includes(oxide)));
      this.checks.clear();
      said.unshift(translate('recipe.solve.pasteFilled', { count: found.length }));
    } else if (!read.together) {
      said.push(translate('recipe.solve.pasteNothing'));
    }
    if (read.unknown.length) said.push(translate('recipe.solve.pasteUnknown', { list: listOf(read.unknown) }));
    this.pasteStatus.set(said.join(' '));
  }

  protected clearTarget(): void {
    this.values.set({});
    this.extra.set([]);
    this.checks.clear();
    this.pasteStatus.set('');
    this.problem.set('');
    afterNextRender(() => document.getElementById(fieldId(FIELDS[0]!))?.focus(), { injector: this.injector });
  }

  protected addTry(material: Material): void {
    if (this.tries().some((tried) => tried.material.name === material.name)) return;
    this.tries.update((tries) => [...tries, { material, must: false }]);
  }

  protected setMust(index: number, must: boolean): void {
    this.tries.update((tries) => tries.map((tried, i) => (i === index ? { ...tried, must } : tried)));
  }

  protected removeTry(index: number): void {
    this.tries.update((tries) => tries.filter((_, i) => i !== index));
  }

  /** Solves for the target as typed, with the materials listed; a problem shows by the button, or on its field. */
  protected run(): void {
    this.problem.set('');
    if (!this.checks.validate()) return;
    this.solveWith(this.avoid(), this.uncapped(), true);
  }

  /** Works it out again with a change from the report: a material left out, added, or a cap lifted. */
  private solveWith(avoid: string[], uncapped: string[], focusResult: boolean): void {
    const run: SolveRun = { kind: this.kind(), oxides: this.amounts(), tries: this.tries(), avoid, uncapped };
    let solved: Solved;
    try {
      solved = solve(run);
    } catch (error) {
      if (!(error instanceof SolveProblem)) throw error;
      this.problem.set(error.message);
      const field =
        error.code === 'solve.noFlux'
          ? fieldId('CaO')
          : error.code === 'solve.noMaterials'
            ? 'solve-materials-heading'
            : 'solve-run';
      afterNextRender(() => document.getElementById(field)?.focus(), { injector: this.injector });
      return;
    }
    this.avoid.set(avoid);
    this.uncapped.set(uncapped);
    this.result.set({ solved, run, asked: this.asked() });
    if (focusResult)
      afterNextRender(() => document.getElementById('solve-result-heading')?.focus(), { injector: this.injector });
  }

  protected leaveOut(name: string): void {
    this.solveWith([...new Set([...this.avoid(), name])], this.uncapped(), false);
  }

  protected allowAgain(): void {
    this.solveWith([], this.uncapped(), false);
  }

  protected allowMore(names: string[]): void {
    this.solveWith(this.avoid(), [...new Set([...this.uncapped(), ...names])], false);
  }

  /** A material the report says would help: kept in as a must. */
  protected mustUse(name: string): void {
    this.tries.update((tries) =>
      tries.map((tried) => (tried.material.name === name ? { ...tried, must: true } : tried))
    );
    this.solveWith(
      this.avoid().filter((avoided) => avoided !== name),
      this.uncapped(),
      false
    );
  }

  /** The recipe on the recipe page, as a new recipe not saved yet, with the target in its notes. */
  protected openAsRecipe(): void {
    const result = this.result();
    if (!result) return;
    const { solved, run } = result;
    const places = run.kind === 'analysis' ? 2 : 3;
    const target = Object.entries(run.oxides)
      .map(([oxide, amount]) => formatFormula(oxide) + ' ' + fixed(amount, places))
      .join(' · ');
    const recipe: Recipe = {
      title: translate('recipe.solve.newTitle'),
      notes: translate('recipe.solve.newNotes', {
        kind: run.kind,
        target,
        verdict: translate(OVERALL[solved.closeness.verdict])
      }),
      materials: solved.materials,
      ...(this.firing() ? { firing: this.firing() as FiringBand } : {})
    };
    this.pending.put(recipe);
    void this.router.navigateByUrl('/recipe');
  }
}
