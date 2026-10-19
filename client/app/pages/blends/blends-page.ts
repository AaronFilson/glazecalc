import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { formatFormula } from '../../../../lib/chemistry';
import { firingBands, isStated } from '../../../../lib/cones/firing';
import type { FiringBlock } from '../../../../lib/cones/firing';
import { formatScaled, totalOf } from '../../../../lib/recipe/amounts';
import { BLEND_STEPS, blendTiles, mixRecipes } from '../../../../lib/recipe/blends';
import type { BlendKind, BlendTile } from '../../../../lib/recipe/blends';
import { coneFit } from '../../../../lib/recipe/cone-fit';
import { LIMIT_SETS, limitRows } from '../../../../lib/recipe/limits';
import { silicaAluminaRatio } from '../../../../lib/recipe/compare';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Additive, Recipe, RecipeMaterial } from '../../core/models';
import { PreferencesService } from '../../core/preferences.service';
import { Busy } from '../../shared/busy';
import { localDate } from '../../shared/dates';
import { fixed, percent } from '../../shared/format';
import { Notices, NoticesList } from '../../shared/notices';
import { NumberInput } from '../../shared/number-input';
import { PageHeader } from '../../shared/page-header';
import { formatWeight, toGrams, unitLabel } from '../../shared/weights';
import { evaluate } from '../recipe/recipe-analysis';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Each kind's name and its corners' places, as the keys of their messages. */
const KINDS: ReadonlyArray<{ kind: BlendKind; label: string; corners: string[]; steps: string; start: number }> = [
  {
    kind: 'line',
    label: marker('recipe.blends.kinds.line'),
    corners: [marker('recipe.blends.corners.lineStart'), marker('recipe.blends.corners.lineEnd')],
    steps: marker('recipe.blends.steps.line'),
    start: 6
  },
  {
    kind: 'biaxial',
    label: marker('recipe.blends.kinds.biaxial'),
    corners: [
      marker('recipe.blends.corners.topLeft'),
      marker('recipe.blends.corners.topRight'),
      marker('recipe.blends.corners.bottomLeft'),
      marker('recipe.blends.corners.bottomRight')
    ],
    steps: marker('recipe.blends.steps.biaxial'),
    start: 4
  },
  {
    kind: 'triaxial',
    label: marker('recipe.blends.kinds.triaxial'),
    corners: [
      marker('recipe.blends.corners.top'),
      marker('recipe.blends.corners.bottomLeft'),
      marker('recipe.blends.corners.bottomRight')
    ],
    steps: marker('recipe.blends.steps.triaxial'),
    start: 5
  }
];

/** A test batch to start from, in each unit. */
const DEFAULT_BATCH = { g: '100', lb: '0.25' };

/** What a tile's row of the chemistry table shows; null where there is no figure. */
interface TileChemistry {
  number: number;
  siAl: string;
  boron: string;
  expansion: string;
  /** How many of the limit set's ranges the tile is past, for the firing's band. */
  cautions: number | null;
  /** The cone fit's verdict, when a firing is set. */
  fit: string | null;
}

/** The cone fit's verdicts, as the keys of their words in the table. */
const FIT_WORDS: Record<string, string> = {
  fits: marker('recipe.blends.chemistry.fits'),
  cooler: marker('recipe.blends.chemistry.cooler'),
  hotter: marker('recipe.blends.chemistry.hotter'),
  skipped: marker('recipe.blends.chemistry.skipped')
};

interface TileRecipe {
  tile: BlendTile;
  materials: Array<{ line: RecipeMaterial; amount: number }>;
  additives: Array<{ line: Additive; amount: number }>;
}

/**
 * Blends for test tiles: a line blend between two saved recipes, a biaxial
 * blend between four (the corners of a square) or a triaxial blend between
 * three (the corners of a triangle), in a chosen number of steps
 * (lib/recipe/blends.js). The tiles are drawn as they would be laid out,
 * numbered; the list gives each tile's batch weights for a test batch, to
 * print; chosen tiles can be saved as recipes of their own.
 */
@Component({
  selector: 'gc-blends-page',
  imports: [FormsModule, NoticesList, NumberInput, PageHeader, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('recipe.blends.title')" [lead]="t('recipe.blends.lead')" />
    <p class="no-print">
      <a routerLink="/recipe">{{ t('recipe.import.backToRecipes') }}</a>
    </p>
    <gc-notices [notices]="notices" />

    @if (loaded() && myRecipes().length < 2) {
      <!-- Nothing to blend yet: the ways to make recipes, in place of a form that cannot be used. -->
      <section class="panel no-print blend-need-two">
        <p>{{ t('recipe.blends.needTwo') }}</p>
        <p class="blend-need-two-links">
          <a routerLink="/recipe" class="btn btn-primary">{{ t('recipe.blends.startRecipe') }}</a>
          <a routerLink="/import" class="btn btn-light border">{{ t('recipe.blends.pasteIn') }}</a>
        </p>
      </section>
    } @else {
      <section class="panel no-print" aria-labelledby="blend-setup-heading">
        <h2 class="h4" id="blend-setup-heading">{{ t('recipe.blends.setupHeading') }}</h2>
        <fieldset class="blend-kinds">
          <legend class="form-label">{{ t('recipe.blends.kindLegend') }}</legend>
          @for (option of kinds; track option.kind) {
            <div class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="radio"
                name="blend-kind"
                [id]="'blend-kind-' + option.kind"
                [value]="option.kind"
                [checked]="kind() === option.kind"
                (change)="setKind(option.kind)"
              />
              <label class="form-check-label" [for]="'blend-kind-' + option.kind">{{ t(option.label) }}</label>
            </div>
          }
        </fieldset>

        <div class="blend-fields">
          <div class="blend-steps">
            <label class="form-label" for="blend-steps">{{ t(kindInfo().steps) }}</label>
            <select id="blend-steps" class="form-select" [ngModel]="steps()" (ngModelChange)="setSteps(+$event)">
              @for (n of stepChoices(); track n) {
                <option [ngValue]="n">{{ n }}</option>
              }
            </select>
            <p class="small muted blend-count">
              {{ t('recipe.blends.tileCount', { count: blend()?.tiles?.length ?? 0 }) }}
            </p>
          </div>
          @for (place of kindInfo().corners; track place; let c = $index) {
            <div class="blend-corner">
              <label class="form-label" [for]="'blend-corner-' + c">{{
                t('recipe.blends.cornerLabel', { letter: letters[c], place: t(place) })
              }}</label>
              <select
                class="form-select"
                [id]="'blend-corner-' + c"
                [ngModel]="cornerIds()[c] ?? ''"
                (ngModelChange)="setCorner(c, $event)"
              >
                <option value="">{{ t('recipe.blends.chooseRecipe') }}</option>
                @for (rec of myRecipes(); track rec._id) {
                  <option [value]="rec._id">{{ rec.title }}</option>
                }
              </select>
            </div>
          }
        </div>
        @if (shownProblem()) {
          <p class="blend-problem" role="status">{{ shownProblem() }}</p>
        }
      </section>
    }

    @if (blend(); as b) {
      @if (tileRecipes()) {
        <section class="panel blend-diagram-panel" aria-labelledby="blend-diagram-heading">
          <h2 class="h4" id="blend-diagram-heading">{{ t('recipe.blends.diagramHeading') }}</h2>
          <p class="small muted">{{ cornerKey() }}</p>
          @if (includeDiffers()) {
            <p class="small blend-problem no-print" role="status">
              {{
                t('recipe.blends.includeDiffers', {
                  title: corners()[0]?.title,
                  counts: includeAdditives() ? 'yes' : 'no'
                })
              }}
            </p>
          }
          <div
            role="list"
            class="blend-diagram"
            [class.is-triaxial]="b.kind === 'triaxial'"
            [class.is-compact]="b.steps > 5"
            [style.--blend-columns]="columns()"
            [attr.aria-label]="t('recipe.blends.diagramLabel')"
          >
            @for (tile of b.tiles; track tile.number) {
              <div
                role="listitem"
                class="blend-tile"
                [attr.data-row]="tile.row"
                [style.grid-column]="placeOf(tile)"
                [class.is-chosen]="chosen().has(tile.number)"
                [class.is-saved]="savedTiles().has(tile.number)"
              >
                <span class="blend-tile-number" aria-hidden="true">{{ tile.number }}</span>
                <span class="blend-tile-shares" aria-hidden="true">{{ sharesShort(tile) }}</span>
                @if (savedTiles().has(tile.number)) {
                  <span class="blend-tile-saved no-print">{{ t('recipe.blends.tileSavedMark') }}</span>
                }
                <label class="blend-tile-choose no-print">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    [checked]="chosen().has(tile.number)"
                    [disabled]="savedTiles().has(tile.number)"
                    (change)="toggleTile(tile.number)"
                  />
                  <span class="visually-hidden">{{
                    t('recipe.blends.chooseTile', { number: tile.number, shares: sharesLong(tile) })
                  }}</span>
                </label>
              </div>
            }
          </div>
        </section>

        <section class="panel blend-list-panel" aria-labelledby="blend-list-heading">
          <h2 class="h4" id="blend-list-heading">{{ t('recipe.blends.listHeading') }}</h2>
          <div class="blend-batch no-print">
            <div>
              <label class="form-label" for="blend-batch">{{
                t('recipe.blends.batchLabel', { unit: unitName() })
              }}</label>
              <input
                id="blend-batch"
                type="text"
                inputmode="decimal"
                class="form-control"
                [attr.aria-invalid]="batchGrams() > 0 ? null : true"
                [gcNumber]="batch()"
                (gcNumberChange)="batch.set($event)"
              />
            </div>
            <button type="button" class="btn btn-primary" (click)="print()">{{ t('recipe.blends.print') }}</button>
          </div>
          <p class="blend-print-title">{{ t('recipe.blends.printTitle', { batch: batchText() }) }}</p>
          <ol class="blend-list">
            @for (entry of tileRecipes(); track entry.tile.number) {
              <li class="blend-list-tile">
                <h3 class="h6">
                  {{ t('recipe.blends.tileHeading', { number: entry.tile.number, shares: sharesLong(entry.tile) }) }}
                </h3>
                <table class="table table-sm blend-weights">
                  <thead class="visually-hidden">
                    <tr>
                      <th scope="col">{{ t('recipe.blends.materialColumn') }}</th>
                      <th scope="col">{{ t('recipe.blends.weightColumn') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (part of entry.materials; track $index) {
                      <tr>
                        <th scope="row">
                          <bdi>{{ part.line.name }}</bdi>
                        </th>
                        <td>{{ weight(part.amount) }}</td>
                      </tr>
                    }
                    @for (part of entry.additives; track $index) {
                      <tr class="blend-additive">
                        <th scope="row">
                          + <bdi>{{ part.line.name }}</bdi>
                        </th>
                        <td>{{ weight(part.amount) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </li>
            }
          </ol>
        </section>

        <section class="panel no-print" aria-labelledby="blend-chemistry-heading">
          <details class="blend-chemistry" (toggle)="chemistryOpen.set($any($event.target).open)">
            <summary id="blend-chemistry-heading">{{ t('recipe.blends.chemistry.heading') }}</summary>
            @if (chemistryOpen()) {
              <p class="small muted">{{ t('recipe.blends.chemistry.help') }}</p>
              @if (firingFrom(); as from) {
                <p class="small muted">{{ t('recipe.blends.chemistry.firing', { letter: from }) }}</p>
              }
              <div
                class="blend-chemistry-scroll"
                tabindex="0"
                role="region"
                [attr.aria-label]="t('recipe.blends.chemistry.heading')"
              >
                <table class="table table-sm blend-chemistry-table">
                  <thead>
                    <tr>
                      <th scope="col">{{ t('recipe.blends.chemistry.tile') }}</th>
                      <th scope="col">{{ t('recipe.compare.silicaToAlumina') }}</th>
                      <th scope="col" translate="no">{{ boronLabel }}</th>
                      <th scope="col">{{ t('recipe.compare.expansion') }}</th>
                      <th scope="col">{{ t('recipe.blends.chemistry.cautions') }}</th>
                      @if (firingFrom()) {
                        <th scope="col">{{ t('recipe.blends.chemistry.coneFit') }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of chemistry(); track row.number) {
                      <tr>
                        <th scope="row">{{ row.number }}</th>
                        <td>{{ row.siAl }}</td>
                        <td>{{ row.boron }}</td>
                        <td>{{ row.expansion }}</td>
                        <td>{{ row.cautions ?? '–' }}</td>
                        @if (firingFrom()) {
                          <td>{{ row.fit ? t(row.fit) : '–' }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </details>
        </section>

        <section class="panel no-print" aria-labelledby="blend-save-heading">
          <h2 class="h4" id="blend-save-heading">{{ t('recipe.blends.saveHeading') }}</h2>
          <p class="small muted">{{ t('recipe.blends.saveHelp') }}</p>
          <div class="blend-save-fields">
            <div class="blend-name">
              <label class="form-label" for="blend-name">{{ t('recipe.blends.nameLabel') }}</label>
              <input
                id="blend-name"
                type="text"
                class="form-control"
                [ngModel]="name()"
                (ngModelChange)="typedName($event)"
              />
            </div>
            <button type="button" class="btn btn-light border" (click)="chooseAll()">
              {{ t('recipe.blends.chooseAll') }}
            </button>
            <button type="button" class="btn btn-light border" (click)="chosen.set(empty)">
              {{ t('recipe.blends.chooseNone') }}
            </button>
          </div>
          <div class="blend-save">
            <button
              type="button"
              class="btn btn-success"
              [attr.aria-disabled]="saving.active() || null"
              (click)="save()"
            >
              {{ saving.active() ? t('recipe.blends.saving') : t('recipe.blends.save', { count: chosen().size }) }}
            </button>
            @if (saveProblem()) {
              <p class="blend-problem" role="alert">{{ saveProblem() }}</p>
            }
          </div>
        </section>
      }
    }
  </ng-container>`,
  styles: `
    .blend-need-two-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0;
    }
    .blend-kinds {
      margin-bottom: 1rem;
    }
    .blend-fields,
    .blend-batch,
    .blend-save-fields,
    .blend-save {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem 1.25rem;
    }
    .blend-steps {
      flex: 0 0 9rem;
    }
    .blend-corner {
      flex: 1 1 14rem;
      min-width: 0;
    }
    .blend-count {
      margin: 0.25rem 0 0;
    }
    .blend-problem {
      color: var(--gc-danger-text);
      margin: 0.75rem 0 0;
    }
    .blend-save-fields {
      margin-bottom: 1rem;
    }
    .blend-name {
      flex: 1 1 16rem;
    }
    /* One grid of tiles: a row for a line, a square for a biaxial blend, and for a
       triaxial blend half-width columns, each tile two wide, so the rows step in. */
    .blend-diagram {
      display: grid;
      grid-template-columns: repeat(var(--blend-columns), minmax(0, 1fr));
      gap: 0.35rem;
      max-width: 40rem;
    }
    .blend-tile {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 4.25rem;
      padding: 0.3rem 0.2rem 1.6rem;
      border: 1px solid var(--gc-border);
      border-radius: 0.4rem;
      background: var(--gc-surface-2);
      text-align: center;
      overflow-wrap: anywhere;
    }
    .blend-tile.is-chosen {
      border-color: var(--gc-primary);
      box-shadow: inset 0 0 0 1px var(--gc-primary);
    }
    .blend-tile-saved {
      font-size: 0.7rem;
      color: var(--gc-success-text, var(--gc-muted));
    }
    .blend-tile-number {
      font-weight: 700;
      font-size: 1.1rem;
    }
    .blend-tile-shares {
      font-size: 0.7rem;
      line-height: 1.2;
      color: var(--gc-muted);
    }
    .blend-diagram.is-compact .blend-tile-shares {
      display: none;
    }
    .blend-tile-choose {
      position: absolute;
      bottom: 0.25rem;
      margin: 0;
    }
    .blend-chemistry summary {
      font-size: 1.25rem;
      cursor: pointer;
    }
    /* The table scrolls inside its own box, so a narrow screen's page does not. */
    .blend-chemistry-scroll {
      max-width: 100%;
      overflow-x: auto;
    }
    .blend-chemistry-table {
      margin: 0;
      min-width: 28rem;
    }
    .blend-chemistry-table td,
    .blend-chemistry-table th[scope='row'] {
      font-variant-numeric: tabular-nums;
    }
    .blend-print-title {
      display: none;
    }
    .blend-list {
      list-style: none;
      padding: 0;
      margin: 1rem 0 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 0.5rem 1.25rem;
    }
    .blend-list-tile {
      break-inside: avoid;
    }
    .blend-list-tile h3 {
      margin: 0 0 0.25rem;
    }
    .blend-weights {
      margin: 0;
    }
    .blend-weights th {
      font-weight: normal;
    }
    .blend-weights td {
      text-align: end;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    @media print {
      .blend-diagram-panel,
      .blend-list-panel {
        border: 0;
        box-shadow: none;
        padding: 0;
      }
      .blend-print-title {
        display: block;
        font-weight: 600;
      }
      .blend-tile {
        padding-bottom: 0.3rem;
        min-height: 0;
      }
      .blend-list {
        grid-template-columns: repeat(3, 1fr);
        font-size: 9.5pt;
      }
    }
  `
})
export class BlendsPage implements OnInit {
  private readonly resources = inject(ApiResourceFactory);
  private readonly route = inject(ActivatedRoute);
  private readonly preferences = inject(PreferencesService);
  private readonly recipes = this.resources.for<Recipe>('recipe');

  protected readonly notices = new Notices();
  protected readonly saving = new Busy();
  protected readonly kinds = KINDS;
  protected readonly letters = LETTERS;
  protected readonly empty: ReadonlySet<number> = new Set();

  protected readonly myRecipes = signal<Recipe[]>([]);
  protected readonly loaded = signal(false);
  protected readonly kind = signal<BlendKind>('line');
  protected readonly steps = signal(KINDS[0].start);
  /** The saved recipe at each corner, by id: A, B, C, D. */
  protected readonly cornerIds = signal<string[]>([]);
  protected readonly batch = signal(DEFAULT_BATCH[this.preferences.weightUnit()]);
  protected readonly chosen = signal<ReadonlySet<number>>(new Set());
  protected readonly name = signal('');
  /** Whether the person has typed a name, so choosing corners no longer writes one. */
  private nameTyped = false;
  protected readonly saveProblem = signal('');
  /** The tiles of this blend already saved as recipes, so a second Save does not make them twice. */
  protected readonly savedTiles = signal<ReadonlySet<number>>(new Set());

  protected readonly kindInfo = computed(() => KINDS.find((k) => k.kind === this.kind())!);
  protected readonly stepChoices = computed(() => {
    const { min, max } = BLEND_STEPS[this.kind()];
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  });
  protected readonly blend = computed(() => blendTiles(this.kind(), this.steps()));

  /** The diagram's grid columns: a triaxial blend's are half a tile wide. */
  protected readonly columns = computed(() => {
    const blend = this.blend();
    if (!blend) return 1;
    return blend.kind === 'line' ? blend.steps : blend.kind === 'biaxial' ? blend.steps : 2 * blend.steps;
  });

  /** Where a tile sits in the grid: a triaxial row starts half a tile in for each row it is above the last. */
  protected placeOf(tile: BlendTile): string | null {
    const blend = this.blend();
    if (blend?.kind !== 'triaxial') return null;
    return blend.steps - 1 - tile.row + 2 * tile.col + 1 + ' / span 2';
  }

  /** The corner recipes chosen, in order, as many as the kind takes. */
  protected readonly corners = computed(() =>
    Array.from({ length: this.kindInfo().corners.length }, (_, c) =>
      this.myRecipes().find((r) => r._id === this.cornerIds()[c])
    )
  );

  /** Whether the tiles' unity formulas count additives: as the first corner's recipe does. */
  protected readonly includeAdditives = computed(() => !!this.corners()[0]?.includeAdditives);
  /** Whether the corner recipes disagree about that, so the first one's choice is followed and said so. */
  protected readonly includeDiffers = computed(() => {
    const chosen = this.corners().filter((corner): corner is Recipe => !!corner);
    return chosen.some((corner) => !!corner.includeAdditives !== !!chosen[0].includeAdditives);
  });

  /** Why there are no tiles to show, if there are none. */
  protected readonly problem = computed(() => {
    const corners = this.corners();
    if (!this.loaded()) return '';
    if (corners.some((corner) => !corner)) return translate('recipe.blends.chooseEach');
    const empty = corners.find((corner) => !totalOf(corner!.materials.map((m) => m.amount)));
    return empty ? translate('recipe.blends.noAmounts', { title: empty.title }) : '';
  });

  /** Whether a recipe has been chosen for a letter on the page, so asking for the rest is not an error before then. */
  private readonly choseCorner = signal(false);
  /**
   * The problem as shown: "Choose a recipe for each letter" waits until a letter has a recipe
   * (chosen here, or the recipe the page was opened from), rather than greeting the page in red.
   */
  protected readonly shownProblem = computed(() => {
    const problem = this.problem();
    if (problem && !this.choseCorner() && this.corners().every((corner) => !corner)) return '';
    return problem;
  });

  /** Each tile's recipe, as a percent of its base; null until every corner has a recipe with amounts. */
  protected readonly tileRecipes = computed<TileRecipe[] | null>(() => {
    const blend = this.blend();
    if (!blend || this.problem() || !this.loaded()) return null;
    const corners = this.corners().map((recipe) => ({
      materials: recipe!.materials,
      additives: recipe!.additives ?? []
    }));
    return blend.tiles.map((tile) => ({ tile, ...mixRecipes<RecipeMaterial, Additive>(corners, tile.shares)! }));
  });

  /** Whether the "Chemistry per tile" table is open: its figures are worked out only then. */
  protected readonly chemistryOpen = signal(false);
  protected readonly boronLabel = formatFormula('B2O3');

  /** The first corner with a stated firing, which the table's limits and cone fit follow. */
  private readonly firingCorner = computed<{ letter: string; block: FiringBlock } | null>(() => {
    const corners = this.corners();
    for (let c = 0; c < corners.length; c++) {
      const block = corners[c]?.firedAt;
      if (block && isStated(block)) return { letter: LETTERS[c], block };
    }
    return null;
  });
  /** The letter of the recipe whose firing is used, or null when none has one. */
  protected readonly firingFrom = computed(() => this.firingCorner()?.letter ?? null);

  /** Each tile's chemistry: Si:Al, boron, expansion, the cautions against the limit set, the cone fit. */
  protected readonly chemistry = computed<TileChemistry[]>(() => {
    const tiles = this.chemistryOpen() ? this.tileRecipes() : null;
    if (!tiles) return [];
    const set = LIMIT_SETS[this.preferences.limitSet()] ?? LIMIT_SETS['hesselberth-roy'];
    const firing = this.firingCorner()?.block ?? null;
    const band = firing ? (firingBands(firing)[0] ?? set.whenUnknown) : set.whenUnknown;
    const includeAdditives = this.includeAdditives();
    return tiles.map((entry) => {
      const materials = entry.materials.map(({ line, amount }) => ({ ...line, amount: String(amount) }));
      const additives = entry.additives.map(({ line, amount }) => ({
        ...line,
        amount: String(amount),
        unit: 'percent' as const
      }));
      const { analysis } = evaluate(materials, additives, { includeAdditives });
      if (!analysis)
        return { number: entry.tile.number, siAl: '–', boron: '–', expansion: '–', cautions: null, fit: null };
      const ratio = silicaAluminaRatio(analysis);
      const rows = limitRows(analysis.uList, set, band);
      const fit = firing
        ? coneFit(analysis.uList, firing, {
            processes: firing.processes ?? [],
            materials: materials.map((m) => m.name)
          })
        : null;
      return {
        number: entry.tile.number,
        siAl: ratio === null ? '–' : fixed(ratio, 2),
        boron: fixed(analysis.uList['B2O3'] ?? 0, 2),
        expansion: analysis.expansion === null || analysis.expansion === undefined ? '–' : fixed(analysis.expansion, 2),
        cautions: rows ? rows.filter((row) => row.past).length : null,
        fit: fit ? (FIT_WORDS[fit.verdict] ?? null) : null
      };
    });
  });

  protected readonly unitName = computed(() => unitLabel(this.preferences.weightUnit()));
  protected readonly batchGrams = computed(() => toGrams(this.batch(), this.preferences.weightUnit()));
  protected readonly batchText = computed(() => formatWeight(this.batchGrams(), this.preferences.weightUnit()));

  /** Which letter is which recipe: "A Celadon · B Matte". */
  protected readonly cornerKey = computed(() =>
    this.corners()
      .map((corner, c) => LETTERS[c] + ' ' + (corner?.title ?? ''))
      .join(' · ')
  );

  ngOnInit(): void {
    const first = this.route.snapshot.queryParamMap.get('recipe');
    if (first) this.cornerIds.set([first]);
    void this.recipes.getAll().then(
      (recipes) => {
        this.myRecipes.set(recipes);
        this.loaded.set(true);
        this.nameFromCorners();
      },
      () => {
        this.loaded.set(true);
        this.notices.error(translate('recipe.page.fetchRecipes'));
      }
    );
  }

  protected setSteps(steps: number): void {
    this.steps.set(steps);
    this.savedTiles.set(new Set());
  }

  protected setKind(kind: BlendKind): void {
    this.kind.set(kind);
    this.savedTiles.set(new Set());
    this.steps.set(KINDS.find((k) => k.kind === kind)!.start);
    this.chosen.set(new Set());
    this.nameFromCorners();
  }

  protected setCorner(index: number, id: string): void {
    this.choseCorner.set(true);
    this.savedTiles.set(new Set());
    this.cornerIds.update((ids) => {
      const next = [...ids];
      next[index] = id;
      return next;
    });
    this.nameFromCorners();
  }

  /** A name for the saved tiles from the corners, until the person writes their own. */
  private nameFromCorners(): void {
    if (this.nameTyped && this.name()) return;
    const titles = this.corners()
      .filter((corner): corner is Recipe => !!corner)
      .map((corner) => corner.title);
    this.name.set(titles.length ? translate('recipe.blends.defaultName', { titles: titles.join(' / ') }) : '');
  }

  protected readonly typedName = (name: string): void => {
    this.nameTyped = true;
    this.name.set(name);
  };

  protected toggleTile(number: number): void {
    this.chosen.update((set) => {
      const next = new Set(set);
      if (!next.delete(number)) next.add(number);
      return next;
    });
  }

  protected chooseAll(): void {
    this.chosen.set(new Set((this.blend()?.tiles ?? []).map((tile) => tile.number)));
  }

  /** A tile's mix in the diagram: "A 75 B 25", the corners it has. */
  protected sharesShort(tile: BlendTile): string {
    return tile.shares
      .map((share, c) => (share > 0 ? LETTERS[c] + ' ' + percent(share * 100) : ''))
      .filter(Boolean)
      .join(' ');
  }

  /** A tile's mix in words: "75% A, 25% B". */
  protected sharesLong(tile: BlendTile): string {
    return tile.shares
      .map((share, c) =>
        share > 0 ? translate('recipe.blends.share', { share: percent(share * 100), letter: LETTERS[c] }) : ''
      )
      .filter(Boolean)
      .join(', ');
  }

  /** The weight to weigh of a line that is this percent of the base, for the test batch. */
  protected weight(percentOfBase: number): string {
    return formatWeight(
      (percentOfBase * this.batchGrams()) / 100,
      this.preferences.weightUnit(),
      this.preferences.gramPrecision()
    );
  }

  protected print(): void {
    window.print();
  }

  /** Saves each chosen tile as a recipe in percent, one at a time, stopping at the first the server refuses. */
  protected save(): Promise<void> {
    return this.saving.run(async () => {
      this.saveProblem.set('');
      const wanted = (this.tileRecipes() ?? []).filter((entry) => this.chosen().has(entry.tile.number));
      if (!wanted.length) {
        this.saveProblem.set(translate('recipe.blends.noneChosen'));
        return;
      }
      // Tiles saved by an earlier Save, or before a failure, are not saved again.
      const tiles = wanted.filter((entry) => !this.savedTiles().has(entry.tile.number));
      if (!tiles.length) {
        this.saveProblem.set(translate('recipe.blends.alreadySaved'));
        return;
      }
      const numbers = (list: TileRecipe[]) => list.map((entry) => entry.tile.number).join(', ');
      const stoppedAt = (index: number, problem: string) => {
        const done = tiles.slice(0, index);
        this.saveProblem.set(
          done.length
            ? translate('recipe.blends.stoppedTiles', {
                saved: numbers(done),
                rest: numbers(tiles.slice(index)),
                problem
              })
            : translate('recipe.import.notSaved', { problem })
        );
      };
      const name = this.name().trim();
      if (!name) {
        this.saveProblem.set(translate('recipe.blends.nameMissing'));
        document.getElementById('blend-name')?.focus();
        return;
      }
      const key = this.cornerKey();
      let saved = 0;
      for (const entry of tiles) {
        const recipe: Recipe = {
          title: translate('recipe.blends.tileTitle', { name, number: entry.tile.number }),
          date: localDate(),
          notes: translate('recipe.blends.tileNotes', { shares: this.sharesLong(entry.tile), corners: key }),
          materials: entry.materials.map(({ line, amount }) => ({
            ...structuredClone(line),
            amount: formatScaled(amount)
          })),
          additives: entry.additives.map(({ line, amount }) => ({
            ...structuredClone(line),
            amount: formatScaled(amount),
            unit: 'percent' as const
          })),
          includeAdditives: this.includeAdditives()
        };
        const { analysis, problem } = evaluate(recipe.materials, recipe.additives ?? [], {
          includeAdditives: this.includeAdditives()
        });
        if (!analysis) {
          stoppedAt(
            saved,
            translate('recipe.blends.notSavedTile', {
              number: entry.tile.number,
              problem: problem ?? translate('recipe.page.notSavedNoUnity')
            })
          );
          return;
        }
        recipe.computed = analysis;
        try {
          const created = await this.recipes.create(recipe);
          this.myRecipes.update((list) => [...list, created]);
        } catch (err) {
          stoppedAt(saved, errorMessage(err, translate('recipe.import.saveFailed')));
          return;
        }
        saved++;
        this.savedTiles.update((set) => new Set(set).add(entry.tile.number));
      }
      this.chosen.set(new Set());
      this.notices.success(translate('recipe.blends.saved', { count: saved }), 'save');
    });
  }
}
