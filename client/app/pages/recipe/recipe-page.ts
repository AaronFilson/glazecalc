import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  Injector,
  OnInit,
  WritableSignal,
  afterEveryRender,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { map } from 'rxjs';
import { MaterialInput } from '../../../../lib/chemistry';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { AsksBeforeLeaving } from '../../core/leave.guard';
import { Additive, Firing, FiringLink, Material, Recipe, RecipeMaterial } from '../../core/models';
import { PreferencesService } from '../../core/preferences.service';
import { LocaleService } from '../../core/locale.service';
import { PendingRecipeService } from '../../core/pending-recipe.service';
import { UpdateService } from '../../core/update.service';
import { RichText } from '../../i18n/rich-text';
import { Busy } from '../../shared/busy';
import { fixed, formatTime, notANumber } from '../../shared/format';
import { FixedPipe } from '../../shared/format-pipes';
import { Check, FieldCheck, FieldChecks, required } from '../../shared/field-checks';
import {
  GUIDED_STEPS,
  LAYOUT_OPTIONS,
  RecipeLayout,
  layoutFromParam,
  storeLayout,
  storedLayout
} from './recipe-layout';
import { localDate } from '../../shared/dates';
import { Notices, NoticesList } from '../../shared/notices';
import { folded } from '../../shared/library-info';
import { firstOf } from '../../shared/options';
import { PageHeader } from '../../shared/page-header';
import { Removal } from '../../shared/remove-button';
import { amountOf, isAmount, unitOf } from './rebase';
import { additiveAmount, evaluate } from './recipe-analysis';
import { RecipeCompare } from './recipe-compare';
import { RecipeCost } from './recipe-cost';
import { RecipeHazards, hazardSources } from './recipe-hazards';
import { RecipeHelp } from './recipe-help';
import { RecipeLibrary, libraryKey } from './recipe-library';
import { RecipePrint } from './recipe-print';
// A type apart from the report, which recipe-page.html defers (@defer), so its file can be left out until needed.
import type { SwapResult } from './swap-report';
import { SwapReport } from './swap-report';
import { UnityFormula, silicaAluminaRatio, unityColumns } from './unity-formula';
import { RecipeNumbers } from './recipe-numbers';
import { SlurryCalculator } from './slurry-calculator';
import { FiringBand } from '../../../../lib/recipe/limits';
import { ConeScale, FiringBlock } from '../../../../lib/cones/firing';
import type { ConeResult } from '../../../../lib/cones/results';
import { RecipeFiring } from './recipe-firing';
import { RecipeFirings } from './recipe-firings';
import { RecipeConeCards, type ConePlace } from './recipe-cone-cards';
import { recipeText } from './recipe-messages';
import { coneFit } from '../../../../lib/recipe/cone-fit';
import { recipeDrySg } from '../../../../lib/recipe/density';
import { Reader, firingSummary } from './firing-text';
import { focusShown } from './focus';
import { RecipeSwaps, SwapKind, SwapUndo } from './recipe-swaps';
import { RecipeLines } from './recipe-lines';
import { RecipeSwapsPanel } from './recipe-swaps-panel';
import { RecipeAdditivesTable } from './recipe-additives-table';
import { RecipeMaterialsTable } from './recipe-materials-table';
import { RecipeViews } from './recipe-views';
import { SavedRecipes } from './saved-recipes';

const INCLUDE_KEY = 'includeAdditives';

/** Whether new recipes count their additives: the choice made last on this browser. */
const includeByDefault = (): boolean => {
  try {
    return localStorage.getItem(INCLUDE_KEY) === 'yes';
  } catch {
    return false;
  }
};

const copy = <T>(value: T): T => structuredClone(value);
type SaveMode = 'save' | 'next' | 'copy';

/** An amount to save: blank is not one, though 0 is. */
const amountCheck =
  (amount: string | undefined): Check =>
  () => {
    if ((amount ?? '').trim() === '') return translate('recipe.page.amountMissing');
    return isAmount(amount) ? null : notANumber();
  };

interface Saved {
  title: string;
  /** The page still shows this recipe: nothing cleared it or opened another meanwhile. */
  stillOpen: boolean;
  /** It was changed while it saved, so the page has changes that are not saved. */
  changedSince: boolean;
  /** The saved recipe it changed, whose earlier version Undo puts back; none for a new one. */
  changedId: string | null;
}

/** Waiting on a decision about unsaved changes, before starting a new recipe, opening another or leaving the page. */
interface PendingLeave {
  next: () => void;
  /** What Keep editing does besides: the page stays, when it was to be left. */
  stay?: () => void;
  /** Leaving the page for another: asked at the top of the page, which shows whatever view is open. */
  page?: boolean;
  /** The saved recipe it would open. */
  recipeId?: string;
  /** What had the focus, to go back to on Keep editing. */
  from: HTMLElement | null;
}

/** A phone-width screen (Bootstrap's md breakpoint), where the firing part folds once it is set. */
const narrowScreen = (): boolean => typeof matchMedia === 'function' && matchMedia('(max-width: 767.98px)').matches;

@Component({
  selector: 'gc-recipe-page',
  imports: [
    FieldCheck,
    FixedPipe,
    FormsModule,
    NgTemplateOutlet,
    NoticesList,
    PageHeader,
    RecipeHelp,
    RecipeCompare,
    RecipeCost,
    RecipeHazards,
    RecipeAdditivesTable,
    RecipeLibrary,
    RecipeMaterialsTable,
    RecipeSwapsPanel,
    RecipePrint,
    RichText,
    RouterLink,
    SavedRecipes,
    SwapReport,
    TranslocoDirective,
    UnityFormula,
    RecipeNumbers,
    SlurryCalculator,
    RecipeFiring,
    RecipeFirings,
    RecipeConeCards
  ],
  templateUrl: './recipe-page.html',
  // The firing part's fold, the tools and the form's layouts (styles.scss has the rest of the page's).
  styles: `
    /* The firing part folds on a phone: its summary is the one line shown. */
    .firing-fold > summary {
      cursor: pointer;
      font-weight: 600;
      padding: 0.5rem 0;
      border-top: 1px solid var(--gc-border);
    }
    .firing-fold[open] > summary {
      border-top: 0;
      padding-bottom: 0;
    }
    /* Paste in recipes and Blends, which have pages of their own. */
    .recipe-tools {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1.25rem;
      margin: 0 0 1rem;
    }

    /* The form's layout (recipe-layout.ts): a small switch above the editor. */
    .layout-choice {
      display: flex;
      align-items: center;
      margin-block-end: 0.75rem;
    }
    .layout-choice legend {
      float: none;
      width: auto;
      margin: 0;
      margin-inline-end: 0.4rem;
      font-size: 0.95rem;
    }

    /* A, the workbench: the recipe at the start, its formula and limits beside it, in view as it scrolls. */
    .layout-workbench .workbench-side {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 0;
    }
    .workbench-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.4rem;
    }
    .workbench-more {
      position: relative;
    }
    .workbench-more > summary {
      list-style: none;
    }
    .workbench-more > summary::-webkit-details-marker {
      display: none;
    }
    .workbench-more-list {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.3rem;
      margin-block-start: 0.3rem;
    }
    .workbench-status {
      margin-block: 0.25rem 0.5rem;
    }
    .workbench-fold {
      margin-block: 1rem;
      border-block-start: 1px solid var(--gc-border);
      padding-block-start: 0.75rem;
    }
    .workbench-fold > summary {
      font-weight: 600;
      margin-block-end: 0.5rem;
    }
    /* On a phone: the formula on one line, kept at the top, with a way to the whole of it. */
    .workbench-peek {
      position: sticky;
      inset-block-start: 0;
      z-index: 2;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.5rem;
      margin-block-end: 0.5rem;
      padding: 0.4rem 0.6rem;
      background: var(--gc-surface-2);
      color: var(--gc-text);
      border: 1px solid var(--gc-border);
      border-radius: 0.5rem;
      font-size: 0.85rem;
    }
    .workbench-peek-text {
      flex: 1 1 12rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    /* What gets the focus scrolls clear of the peek bar (WCAG 2.4.11). */
    .layout-workbench :is(input, select, textarea, button, a, summary, [tabindex]) {
      scroll-margin-block-start: 6rem;
    }
    @media (min-width: 992px) {
      .layout-workbench {
        grid-template-columns: minmax(0, 1fr) minmax(19rem, 26rem);
      }
      .workbench-peek {
        display: none;
      }
      .layout-workbench :is(input, select, textarea, button, a, summary, [tabindex]) {
        scroll-margin-block-start: 1rem;
      }
      .layout-workbench .workbench-side {
        position: sticky;
        inset-block-start: 1rem;
        align-self: start;
        max-block-size: calc(100vh - 2rem);
        overflow-y: auto;
      }
      .layout-workbench .workbench-side .unity-panel {
        position: static;
      }
    }

    /* B, guided steps: one part of the recipe at a time. */
    .guided-steps {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;
    }
    .guided-steps .btn {
      border-radius: 999px;
    }
    /* The step's number in the reader's own digits (gcFixed), set apart by weight rather than a full stop. */
    .guided-step-number {
      font-weight: 700;
      margin-inline-end: 0.2rem;
    }
    .guided-steps .btn[aria-current='step'] {
      background: var(--gc-primary);
      border-color: var(--gc-primary);
      color: var(--gc-on-primary);
    }
    .guided-heading {
      font-size: 1.2rem;
    }
    .guided-additives {
      margin-block-start: 1.5rem;
    }
    .guided-nav {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      margin-block-start: 1rem;
    }
    .guided-nav #guided-next {
      margin-inline-start: auto;
    }
  `,
  host: { '(window:beforeunload)': 'beforeUnload($event)', '(gc-reveal)': 'revealStep($event)' }
})
export class RecipePage implements OnInit, AsksBeforeLeaving {
  private readonly resources = inject(ApiResourceFactory);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preferences = inject(PreferencesService);
  private readonly locale = inject(LocaleService);
  private readonly pendingRecipe = inject(PendingRecipeService);
  /** Lead is off in Settings: materials with lead are not listed to add, or suggested. */
  protected readonly leadOff = computed(() => this.preferences.lead() === 'off');
  private readonly recipes = this.resources.for<Recipe>('recipe');
  private readonly materials = this.resources.for<Material>('materials');
  private readonly additives = this.resources.for<Additive>('additives');

  protected readonly notices = new Notices();
  protected readonly saving = new Busy();
  protected readonly firstOf = firstOf;
  protected readonly additiveAmount = additiveAmount;

  // The recipe being edited.
  protected readonly title = signal('');
  protected readonly date = signal('');
  protected readonly notes = signal('');
  protected readonly lines = signal<RecipeMaterial[]>([]);
  protected readonly additiveLines = signal<Additive[]>([]);
  /** The materials' names, for the limits' cone check (ash, Gerstley borate). */
  protected readonly materialNames = computed(() => this.lines().map((line) => line.name));

  // The lists to add from, and the saved recipes.
  protected readonly myMaterials = signal<Material[]>([]);
  protected readonly standardMaterials = signal<Material[]>([]);
  protected readonly myAdditives = signal<Additive[]>([]);
  protected readonly standardAdditives = signal<Additive[]>([]);
  /** The standard lists could not be fetched: the lists say so, and offer to try again. */
  protected readonly standardMaterialsFailed = signal(false);
  protected readonly standardAdditivesFailed = signal(false);
  /** The account's own lists that could not be fetched: the page offers to try again. */
  protected readonly myMaterialsFailed = signal(false);
  protected readonly myAdditivesFailed = signal(false);
  protected readonly myRecipesFailed = signal(false);
  protected readonly ownFailed = computed(
    () => this.myMaterialsFailed() || this.myAdditivesFailed() || this.myRecipesFailed()
  );
  protected readonly myRecipes = signal<Recipe[]>([]);
  /** The saved recipes, listed above the editor: each says what to do with it, and the focus goes back to its More. */
  private readonly savedList = viewChild(SavedRecipes);
  /** How the reader fires, for the firing in words. */
  protected readonly reader = computed<Reader>(() => ({
    cones: this.locale.cones(),
    temperature: this.locale.temperature()
  }));
  protected readonly removal = new Removal(this.recipes, this.myRecipes, this.notices, (recipe) => recipe.title);

  /** Whether the unity formula counts the colorants and additives too; saved with the recipe. */
  protected readonly includeAdditives = signal(includeByDefault());
  /** The firing the recipe is for, as a band, for its limits; saved with the recipe. */
  protected readonly firing = signal<FiringBand | ''>('');
  /** The SG the glaze is mixed to, set in the SG calculator; saved with the recipe as sgTarget. */
  protected readonly sgTarget = signal<number | null>(null);
  /** The firing as stated (the cone, range, tested cones, atmosphere); saved with the recipe as firedAt. */
  protected readonly firedAt = signal<FiringBlock | null>(null);
  /** For a food surface; saved with the recipe as foodSurface. */
  protected readonly foodSurface = signal(false);
  /** The firing logs it went through, with a result each; saved with the recipe as firings. */
  protected readonly firings = signal<FiringLink[]>([]);
  /** The firing part's summary line, said again when the language changes. */
  protected readonly firingSummary = computed(() => {
    this.language();
    return firingSummary(this.firedAt(), this.reader());
  });
  /** Whether the firing part is open: when nothing is stated yet, and on wide screens; closed on a phone once set. */
  protected readonly firingFoldOpen = signal(true);

  // The form's layout: standard, workbench (A) or guided steps (B). One recipe, one set of actions; only the
  // arrangement in the template differs. ?layout=a|b|today chooses for a visit; the choice made here is kept.
  protected readonly layoutOptions = LAYOUT_OPTIONS;
  protected readonly guidedSteps = GUIDED_STEPS;
  private readonly layoutParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => layoutFromParam(params.get('layout')))),
    { initialValue: layoutFromParam(this.route.snapshot?.queryParamMap?.get('layout')) }
  );
  private readonly chosenLayout = signal<RecipeLayout>(storedLayout());
  /** Chosen on the page this visit, over ?layout=. */
  private readonly layoutPicked = signal(false);
  protected readonly layout = computed<RecipeLayout>(() =>
    this.layoutPicked() ? this.chosenLayout() : (this.layoutParam() ?? this.chosenLayout())
  );
  /** The guided form's step shown (0 recipe, 1 amounts, 2 check, 3 save). */
  protected readonly guidedStep = signal(0);
  /** The workbench's folds. */
  protected readonly fixFoldOpen = signal(false);
  protected readonly detailsFoldOpen = signal(false);
  /** The firing logs part is open: asked for, or the recipe has links. */
  protected readonly firingsAsked = signal(false);
  protected readonly firingsShown = computed(() => this.firingsAsked() || this.firings().length > 0);
  /** The account's firing logs that are there, once the firing logs part has fetched them, for the result cards. */
  protected readonly firingLogs = signal<Firing[]>([]);
  /** What it came out like at each cone and atmosphere; saved with the recipe as coneResults. */
  protected readonly coneResults = signal<ConeResult[]>([]);
  /** The result cards show once there is a cone, a result or a link to place. */
  protected readonly coneCardsShown = computed(
    () => !!this.firedAt()?.low || this.coneResults().length > 0 || this.firings().length > 0
  );
  /** The recipe's unity formula, for the limit cautions on each result card. */
  protected readonly unityForCards = computed(() => this.evaluation().analysis?.uList ?? null);
  private readonly language = toSignal(inject(TranslocoService).langChanges$);
  /**
   * The cone check (lib/recipe/cone-fit.js, docs/adr/0022) for one result card's
   * cone: only a note (the chemistry looks cooler or hotter than that cone), and
   * only its first sentence; the limits panel gives the rest and the sources.
   */
  protected readonly coneFitForCard = computed(() => {
    this.language();
    const unity = this.unityForCards();
    if (!unity) return null;
    const processes = this.firedAt()?.processes ?? [];
    const materials = this.materialNames();
    return (place: ConePlace & { scale: ConeScale }): string | null => {
      if (!place.cone) return null;
      const fit = coneFit(unity, { scale: place.scale, low: place.cone, processes }, { materials });
      const note = fit && (fit.verdict === 'cooler' || fit.verdict === 'hotter');
      return note ? recipeText(fit.sentences[0]!) : null;
    };
  });

  // Saving: the saved recipe this is (if any), and whether it has changed since.
  protected readonly savedId = signal<string | null>(null);
  protected readonly savedAt = signal<Date | null>(null);
  private readonly snapshot = computed(() =>
    JSON.stringify({
      title: this.title(),
      date: this.date(),
      notes: this.notes(),
      materials: this.lines().map((l) => [libraryKey(l), l.amount ?? '']),
      additives: this.additiveLines().map((a) => [libraryKey(a), a.amount ?? '', unitOf(a)]),
      includeAdditives: this.includeAdditives(),
      firing: this.firing(),
      sgTarget: this.sgTarget(),
      firedAt: this.firedAt(),
      foodSurface: this.foodSurface(),
      firings: this.firings(),
      coneResults: this.coneResults()
    })
  );
  private readonly savedSnapshot = signal(this.snapshot());
  protected readonly dirty = computed(() => this.snapshot() !== this.savedSnapshot());
  protected readonly hasContent = computed(
    () => !!(this.title() || this.notes() || this.lines().length || this.additiveLines().length)
  );
  /** Changes that leaving would lose: a recipe with something in it, changed since it was opened or saved. */
  private readonly unsaved = computed(() => this.dirty() && this.hasContent());
  protected readonly pendingLeave = signal<PendingLeave | null>(null);
  /** The title and each amount: material-amount-0, additive-amount-0 and so on, by their inputs' ids. */
  protected readonly checks = new FieldChecks(() => ({
    title: required(this.title, translate('recipe.page.titleMissing')),
    ...Object.fromEntries(this.lines().map((line, i) => ['material-amount-' + i, amountCheck(line.amount)])),
    ...Object.fromEntries(this.additiveLines().map((line, i) => ['additive-amount-' + i, amountCheck(line.amount)]))
  }));
  /** Why the last save (or print) did not happen, when it is not about one field; shown beside the save buttons. */
  protected readonly saveProblem = signal('');
  /**
   * Which recipe the page shows: a new number each time it is cleared or
   * another is opened. A save that comes back after that is not this page's.
   */
  private showing = 0;

  /** Adding to the materials and the colorants, their amounts and units, and the scale (recipe-lines.ts). */
  protected readonly edit = new RecipeLines({
    lines: this.lines,
    additiveLines: this.additiveLines,
    checks: this.checks,
    unreadable: () => {
      const unreadable = this.unreadableLine();
      return unreadable ? this.notANumber(unreadable) : '';
    },
    closeQuestions: () => this.swaps.closeQuestions(),
    announce: (text) => this.announcement.set(text)
  });
  /** Told to screen readers: what an action did that the focus does not show. */
  protected readonly announcement = signal('');

  protected readonly evaluation = computed(() =>
    evaluate(this.lines(), this.additiveLines(), {
      includeAdditives: this.includeAdditives(),
      chemistryOf: (name) => this.findByName(name)
    })
  );
  /** The dry materials' SG estimated from the recipe (lib/recipe/density.js), for the SG calculator. */
  protected readonly drySgEstimate = computed(() => {
    const base = this.edit.total();
    const additives = this.additiveLines().map((line) => ({
      ...line,
      amount: String(unitOf(line) === 'percent' ? (amountOf(line.amount) / 100) * base : amountOf(line.amount))
    }));
    return recipeDrySg([...this.lines(), ...additives]);
  });
  /** The unity formula on one line: K₂O 0.264 · CaO 0.736 · Al₂O₃ 0.407 · SiO₂ 3.710 · Si:Al 9.11. */
  protected readonly inlineSummary = computed(() => {
    const analysis = this.evaluation().analysis;
    if (!analysis) return this.evaluation().problem;
    const oxides = unityColumns(analysis.uList).flatMap((column) =>
      column.oxides.map((oxide) => oxide.label + ' ' + fixed(oxide.value, 3))
    );
    const ratio = silicaAluminaRatio(analysis);
    return [...oxides, ...(ratio === null ? [] : ['Si:Al ' + fixed(ratio, 2)])].join(' · ');
  });
  protected readonly materialKeys = computed(() => new Set(this.lines().map(libraryKey)));
  protected readonly additiveKeys = computed(() => new Set(this.additiveLines().map(libraryKey)));
  protected readonly status = computed(() => {
    if (this.saving.active()) return translate('recipe.page.saving');
    if (this.savedId()) {
      if (this.dirty()) return translate('recipe.page.changesNotSaved');
      const at = this.savedAt();
      return at ? translate('recipe.page.savedAt', { time: formatTime(at) }) : translate('recipe.page.saved');
    }
    return this.hasContent() ? translate('recipe.page.notSavedYet') : '';
  });

  private readonly recipesLoaded = signal(false);
  /** The recipe being edited, as it would be saved. */
  private readonly draft = computed<Recipe>(() => ({
    title: this.title(),
    date: this.date(),
    notes: this.notes(),
    materials: this.lines(),
    additives: this.additiveLines(),
    includeAdditives: this.includeAdditives(),
    ...(this.firing() ? { firing: this.firing() as FiringBand } : {}),
    ...(this.sgTarget() !== null ? { sgTarget: this.sgTarget() } : {}),
    ...(this.firedAt() ? { firedAt: this.firedAt() } : {}),
    ...(this.foodSurface() ? { foodSurface: true } : {}),
    ...(this.firings().length ? { firings: this.firings() } : {}),
    ...(this.coneResults().length ? { coneResults: this.coneResults() } : {})
  }));
  protected readonly chemistryOf = (name: string) => this.findByName(name);
  /** What the recipe's hazards are read from: the library's current records for its standard materials. */
  protected readonly hazardSources = computed(() =>
    hazardSources(
      [...this.lines(), ...this.additiveLines()],
      [...this.standardMaterials(), ...this.standardAdditives()],
      [...this.myMaterials(), ...this.myAdditives()]
    )
  );
  /** The recipe being edited as it was before Try modern materials, to compare with. */
  private readonly beforeSwap = signal<Recipe | null>(null);
  /** What Undo the swap puts back: the recipe as it was, and whether (and as what) it was saved. */
  protected readonly swapUndo = signal<SwapUndo | null>(null);

  /** The print and compare views, which the address opens (recipe-views.ts). */
  protected readonly views = new RecipeViews({
    lines: this.lines,
    title: this.title,
    draft: this.draft,
    savedId: this.savedId,
    recipes: this.myRecipes,
    recipesLoaded: this.recipesLoaded,
    beforeSwap: this.beforeSwap,
    myMaterials: this.myMaterials,
    standardMaterials: this.standardMaterials,
    myAdditives: this.myAdditives,
    standardAdditives: this.standardAdditives,
    saveProblem: this.saveProblem,
    unreadableField: () => this.unreadableField(),
    report: (field, problem) => this.checks.report(field, problem),
    showMore: (id) => this.savedList()?.showMore(id)
  });
  /** Try modern materials, Suggest amounts, Replace lead and Match with what I have (recipe-swaps.ts). */
  protected readonly swaps = new RecipeSwaps({
    lines: this.lines,
    additiveLines: this.additiveLines,
    firing: this.firing,
    firedAt: this.firedAt,
    myMaterials: this.myMaterials,
    standardMaterials: this.standardMaterials,
    standardAdditives: this.standardAdditives,
    leadOff: this.leadOff,
    undo: this.swapUndo,
    unreadable: () => {
      const unreadable = this.unreadableLine();
      return unreadable ? this.notANumber(unreadable) : '';
    },
    swapIn: (...swap) => this.swapIn(...swap),
    restore: (undo) => this.restore(undo),
    announce: (text) => this.announcement.set(text),
    focusTitle: () => this.focusTitle()
  });

  constructor() {
    // A new version waits for the changes not saved (core/update.service.ts), which a reload would lose.
    const updates = inject(UpdateService);
    effect(() => updates.holdWhile(this.unsaved()));
    inject(DestroyRef).onDestroy(() => updates.holdWhile(false));
  }

  ngOnInit(): void {
    this.loadMyMaterials();
    this.loadStandardMaterials();
    this.loadMyAdditives();
    this.loadStandardAdditives();
    this.loadMyRecipes();
    const handed = this.pendingRecipe.take();
    if (handed) this.openHanded(handed);
  }

  /**
   * A recipe made on another page (Solve for a target's "Open as a new recipe"),
   * opened here as a new recipe, not saved yet: leaving asks first, as for any change.
   */
  private openHanded(recipe: Recipe): void {
    this.reset();
    this.title.set(recipe.title);
    this.notes.set(firstOf(recipe.notes));
    this.lines.set(copy(recipe.materials ?? []));
    this.additiveLines.set(copy(recipe.additives ?? []));
    this.firing.set(recipe.firing ?? '');
    this.announcement.set(translate('recipe.page.handedOpened', { title: recipe.title }));
    this.focusTitle();
  }

  /** Asks again for each of the account's own lists that could not be fetched. */
  protected readonly retryOwn = (): void => {
    if (this.myMaterialsFailed()) this.loadMyMaterials();
    if (this.myAdditivesFailed()) this.loadMyAdditives();
    if (this.myRecipesFailed()) this.loadMyRecipes();
  };

  private loadMyMaterials(): void {
    void this.load(
      this.materials.getAll(),
      this.myMaterials,
      marker('recipe.page.fetchMaterials'),
      this.myMaterialsFailed
    );
  }

  private loadMyAdditives(): void {
    void this.load(
      this.additives.getAll(),
      this.myAdditives,
      marker('recipe.page.fetchAdditives'),
      this.myAdditivesFailed
    );
  }

  /**
   * The saved recipes. Only once they have arrived is the account known to have none, so a failed
   * fetch does not open the first-run help or say the list is empty; it offers to try again.
   */
  private loadMyRecipes(): void {
    void this.load(
      this.recipes.getAll(),
      this.myRecipes,
      marker('recipe.page.fetchRecipes'),
      this.myRecipesFailed
    ).then((ok) => {
      if (!ok) return;
      this.recipesLoaded.set(true);
      // ?open=<id> (the account page's shared recipes): that saved recipe, ready to change.
      const wanted = this.route.snapshot.queryParamMap.get('open');
      const found = wanted ? this.myRecipes().find((recipe) => recipe._id === wanted) : undefined;
      if (found) this.open(found);
      // Opened at the saved recipes (Home's Recipes card): they arrive after the page, so the app could not go there.
      // The page's words can arrive later still (the template waits for them), so it goes once the heading is drawn.
      if (this.route.snapshot.fragment === 'saved-recipes' && this.myRecipes().length) {
        const goThere = afterEveryRender(
          () => {
            const heading = document.getElementById('saved-heading');
            if (!heading) return;
            goThere.destroy();
            heading.scrollIntoView({ block: 'start' });
            heading.focus({ preventScroll: true });
          },
          { injector: this.injector }
        );
      }
    });
  }

  // Saving.

  protected save(): Promise<void> {
    return this.saving.run(async () => {
      const saved = await this.saveAs('save');
      if (!saved) return;
      const id = saved.changedId;
      this.notices.success(
        translate('recipe.page.savedNotice', { title: saved.title }),
        'save',
        id ? { label: translate('recipe.page.undoSave'), run: () => this.undoSave(id) } : undefined
      );
    });
  }

  /**
   * Puts back the saved recipe as it was before the last save (the server
   * keeps it). The page shows it, unless the recipe has changed on the page
   * since or another is open: then only the list changes, and the page's
   * recipe counts as not saved.
   */
  private async undoSave(id: string): Promise<void> {
    try {
      const earlier = await this.recipes.undo(id);
      this.myRecipes.update((list) => list.map((r) => (r._id === id ? earlier : r)));
      if (this.savedId() === id) {
        if (this.dirty()) this.savedSnapshot.set('');
        else this.open(earlier);
      }
      this.notices.success(translate('recipe.page.undone', { title: earlier.title }), 'save');
    } catch (err) {
      this.notices.error(errorMessage(err, translate('recipe.page.undoFailed')));
    }
  }

  /** Saves, then clears the page for the next recipe. */
  protected saveAndNext(): Promise<void> {
    return this.saving.run(async () => {
      const saved = await this.saveAs('next');
      if (!saved) return;
      // Nothing is cleared that is not saved: changes made while it saved, or another recipe opened meanwhile.
      if (!saved.stillOpen || saved.changedSince) {
        this.notices.success(translate('recipe.page.savedNotice', { title: saved.title }), 'save');
        return;
      }
      this.reset();
      this.notices.success(translate('recipe.page.savedNext', { title: saved.title }), 'save');
      this.focusTitle();
    });
  }

  /** Saves the changes as a new recipe, leaving the one opened as it was. */
  protected saveAsCopy(): Promise<void> {
    return this.saving.run(async () => {
      const saved = await this.saveAs('copy');
      if (saved) this.notices.success(translate('recipe.page.savedCopy', { title: saved.title }), 'save');
    });
  }

  private async saveAs(mode: SaveMode): Promise<Saved | null> {
    this.saveProblem.set('');
    const problem = this.problemBeforeSave();
    if (problem !== null) {
      this.saveProblem.set(problem);
      return null;
    }
    const analysis = this.evaluation().analysis!;
    if (!this.date()) this.date.set(localDate());
    const recipe: Recipe = {
      title: this.title(),
      date: this.date(),
      notes: this.notes() || 'None.',
      materials: this.lines(),
      additives: this.additiveLines(),
      computed: analysis,
      includeAdditives: this.includeAdditives(),
      // null takes a firing (like a target) off a recipe saved with one; a new recipe just has none.
      ...(this.firing()
        ? { firing: this.firing() as FiringBand }
        : this.savedId() && mode !== 'copy'
          ? { firing: null }
          : {}),
      // null takes a target off a recipe saved with one; a new recipe just has none.
      ...(this.sgTarget() !== null
        ? { sgTarget: this.sgTarget() }
        : this.savedId() && mode !== 'copy'
          ? { sgTarget: null }
          : {}),
      // The same for the firing block, the food-surface flag and the links to firing logs.
      ...(this.firedAt() ? { firedAt: this.firedAt() } : this.savedId() && mode !== 'copy' ? { firedAt: null } : {}),
      ...(this.foodSurface() ? { foodSurface: true } : this.savedId() && mode !== 'copy' ? { foodSurface: false } : {}),
      // The links to firing logs go with a new recipe only. A saved recipe's links change one at a time as they
      // are made (recipe-firings.ts), so a save never sends a list that could undo another page's; a copy starts
      // with none.
      ...(!this.savedId() && mode !== 'copy' && this.firings().length ? { firings: this.firings() } : {}),
      // The results go with the recipe, like the notes; a copy starts with none, as it has no logs.
      ...(mode !== 'copy' && this.coneResults().length
        ? { coneResults: this.coneResults() }
        : this.savedId() && mode !== 'copy'
          ? { coneResults: null }
          : {})
    };
    // What is sent, and which recipe the page shows: both can change before the server answers.
    const sent = this.snapshot();
    const showing = this.showing;
    const id = mode === 'copy' ? null : this.savedId();
    try {
      let savedId = id;
      if (id) {
        await this.recipes.change(id, { recipe });
        this.myRecipes.update((list) => list.map((r) => (r._id === id ? { ...r, ...recipe } : r)));
      } else {
        const saved = await this.recipes.create(recipe);
        this.myRecipes.update((list) => [...list, saved]);
        savedId = saved._id ?? null;
      }
      const stillOpen = showing === this.showing;
      if (stillOpen) {
        this.swapUndo.set(null);
        this.savedId.set(savedId);
        // Changes made while it saved are not in it, so they still count as not saved.
        this.savedSnapshot.set(sent);
        this.savedAt.set(new Date());
        // The copy shown now has no links to firing logs, and no results.
        if (mode === 'copy') {
          this.linksSaved([]);
          this.coneResults.set([]);
          const saved = this.savedSnapshot();
          if (saved) this.savedSnapshot.set(JSON.stringify({ ...JSON.parse(saved), coneResults: [] }));
        }
      }
      return { title: recipe.title, stillOpen, changedSince: this.snapshot() !== sent, changedId: id };
    } catch (err) {
      const message = errorMessage(err, translate('recipe.page.saveFailed'));
      if (showing === this.showing) this.saveProblem.set(message);
      else this.notices.error(translate('recipe.page.notSavedNamed', { title: recipe.title, problem: message }));
      return null;
    }
  }

  /**
   * What stops this recipe being saved, if anything: a problem with the title
   * or an amount is marked on the field, and the focus goes to the first one
   * ('' here); others are said beside the save buttons.
   */
  private problemBeforeSave(): string | null {
    const fieldsOk = this.checks.validate();
    if (!this.lines().length) return translate('recipe.page.addMaterial');
    if (!fieldsOk) return '';
    const { analysis, problem } = this.evaluation();
    if (!analysis) {
      return problem !== null
        ? translate('recipe.page.notSaved', { problem })
        : translate('recipe.page.notSavedNoUnity');
    }
    return null;
  }

  /** Why a line's amount stops a change: it is not a number. */
  private notANumber(line: Additive | RecipeMaterial): string {
    return translate('recipe.page.notANumber', { name: line.name, amount: line.amount ?? '' });
  }

  /** The first material or colorant whose amount is not blank and not a number of 0 or more. */
  private unreadableLine(): Additive | RecipeMaterial | undefined {
    return [...this.lines(), ...this.additiveLines()].find((line) => !isAmount(line.amount));
  }

  /** The field of that amount, such as material-amount-2. */
  private unreadableField(): string | null {
    const material = this.lines().findIndex((line) => !isAmount(line.amount));
    if (material >= 0) return 'material-amount-' + material;
    const additive = this.additiveLines().findIndex((line) => !isAmount(line.amount));
    return additive >= 0 ? 'additive-amount-' + additive : null;
  }

  // Swaps (recipe-swaps.ts): a new recipe in place of the one on the page, and the one before put back.

  /**
   * Puts a swap's materials in as a new recipe (the one opened stays as it
   * was), with a note on what changed, and compares the two.
   */
  private swapIn(
    materials: RecipeMaterial[],
    note: string,
    announcement: string,
    opener: string,
    kind: SwapKind = 'modern',
    result?: SwapResult,
    compare = true
  ): void {
    const title = this.title().trim() || translate('recipe.page.untitled');
    // The saved recipe, if this is one as saved; otherwise a copy of the page as it is.
    const before = this.savedId() && !this.dirty() ? this.savedId()! : 'before';
    this.beforeSwap.set(structuredClone({ ...this.draft(), title }));
    // Nothing is lost: Undo the swap puts the page back, saved or not, changes and all.
    this.swapUndo.set({
      recipe: structuredClone(this.draft()),
      savedId: this.savedId(),
      savedSnapshot: this.savedSnapshot(),
      savedAt: this.savedAt(),
      result
    });
    this.showing++;
    this.lines.set(materials);
    this.title.set(translate('recipe.page.swappedTitle', { kind, title }));
    this.date.set('');
    this.notes.set([note, this.notes()].filter(Boolean).join('\n'));
    this.savedId.set(null);
    this.savedAt.set(null);
    this.savedSnapshot.set('');
    this.checks.clear();
    this.edit.scaleMessage.set(null);
    this.saveProblem.set('');
    this.announcement.set(announcement);
    if (compare) this.views.openCompare(before, 'draft', opener);
  }

  /** The page as it was before a swap: the recipe, and whether (and as what) it was saved. */
  private restore(undo: SwapUndo): void {
    this.showing++;
    this.title.set(undo.recipe.title);
    this.date.set(undo.recipe.date ?? '');
    this.notes.set(firstOf(undo.recipe.notes));
    this.lines.set(undo.recipe.materials);
    this.additiveLines.set(undo.recipe.additives ?? []);
    this.includeAdditives.set(!!undo.recipe.includeAdditives);
    this.firing.set(undo.recipe.firing ?? '');
    this.sgTarget.set(undo.recipe.sgTarget ?? null);
    this.setFiringFrom(undo.recipe);
    this.savedId.set(undo.savedId);
    this.savedSnapshot.set(undo.savedSnapshot);
    this.savedAt.set(undo.savedAt);
    this.swapUndo.set(null);
    this.beforeSwap.set(null);
    this.checks.clear();
  }

  // Starting over, and opening saved recipes.

  protected startNew(): void {
    this.leave(() => {
      this.reset();
      this.focusTitle();
    });
  }

  /**
   * The links of the saved recipe as the server has them now, after one was changed (recipe-firings.ts):
   * they are saved already, so they do not make the recipe count as changed.
   */
  protected linksSaved(links: FiringLink[]): void {
    const id = this.savedId();
    this.firings.set(links);
    const saved = this.savedSnapshot();
    if (saved) this.savedSnapshot.set(JSON.stringify({ ...JSON.parse(saved), firings: links }));
    if (id) this.myRecipes.update((list) => list.map((r) => (r._id === id ? { ...r, firings: links } : r)));
  }

  /** The firing block, food-surface flag and firing log links of a recipe (none for null). */
  private setFiringFrom(recipe: Recipe | null): void {
    this.firedAt.set(recipe?.firedAt ? copy(recipe.firedAt) : null);
    this.foodSurface.set(recipe?.foodSurface === true);
    this.firings.set(copy(recipe?.firings ?? []));
    this.coneResults.set(copy(recipe?.coneResults ?? []));
    this.firingsAsked.set(false);
    this.firingFoldOpen.set(!recipe?.firedAt?.low || !narrowScreen());
  }

  /**
   * Duplicate for another cone: a copy of a saved recipe, not saved yet, with
   * its firing to be set again. It says why moving a glaze to another cone
   * usually means reformulating it, and the focus goes to the cone.
   */
  protected duplicateForCone(recipe: Recipe): void {
    this.leave(() => {
      this.showing++;
      const notes = firstOf(recipe.notes);
      this.title.set(translate('recipe.firing.duplicateTitle', { title: recipe.title }));
      this.date.set('');
      this.notes.set(notes === 'None.' ? '' : notes);
      this.lines.set(copy(recipe.materials ?? []));
      this.additiveLines.set(copy(recipe.additives ?? []));
      this.includeAdditives.set(!!recipe.includeAdditives);
      // A new firing: the band by hand, the block and the links go; the food-surface flag stays with the glaze.
      this.firing.set('');
      this.sgTarget.set(recipe.sgTarget ?? null);
      this.setFiringFrom({ ...recipe, firedAt: null, firings: [], coneResults: [] });
      this.savedId.set(null);
      this.savedSnapshot.set('');
      this.savedAt.set(null);
      this.edit.clear();
      this.saveProblem.set('');
      this.checks.clear();
      this.swapUndo.set(null);
      this.beforeSwap.set(null);
      this.swaps.clear();
      this.notices.success(translate('recipe.firing.duplicateNote', { title: recipe.title }), 'duplicate');
      afterNextRender(() => focusShown('firing-low'), { injector: this.injector });
    });
  }

  /** Loads a saved recipe here to change it. */
  protected open(recipe: Recipe): void {
    this.leave(
      () => {
        this.showing++;
        const notes = firstOf(recipe.notes);
        this.title.set(recipe.title);
        this.date.set(recipe.date ?? '');
        this.notes.set(notes === 'None.' ? '' : notes);
        this.lines.set(copy(recipe.materials ?? []));
        this.additiveLines.set(copy(recipe.additives ?? []));
        this.includeAdditives.set(!!recipe.includeAdditives);
        this.firing.set(recipe.firing ?? '');
        this.sgTarget.set(recipe.sgTarget ?? null);
        this.setFiringFrom(recipe);
        this.savedId.set(recipe._id ?? null);
        this.savedSnapshot.set(this.snapshot());
        this.savedAt.set(null);
        this.edit.clear();
        this.saveProblem.set('');
        this.checks.clear();
        this.swapUndo.set(null);
        this.beforeSwap.set(null);
        this.swaps.clear();
        this.focusTitle();
      },
      { recipeId: recipe._id }
    );
  }

  /**
   * Does `next` now, or asks first when there are unsaved changes: the
   * question shows at the top of the editor (of the page, for leaving it),
   * starting on Keep editing.
   */
  private leave(next: () => void, more: Pick<PendingLeave, 'recipeId' | 'stay' | 'page'> = {}): void {
    if (!this.unsaved()) {
      next();
      return;
    }
    // A question already asked gives way: if it was about leaving the page, the page stays.
    this.pendingLeave()?.stay?.();
    const from = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.pendingLeave.set({ next, ...more, from });
    afterNextRender(() => document.getElementById('unsaved-keep')?.focus(), { injector: this.injector });
  }

  protected discardAndLeave(): void {
    const pending = this.pendingLeave();
    this.pendingLeave.set(null);
    pending?.next();
  }

  protected keepEditing(): void {
    const pending = this.pendingLeave();
    this.pendingLeave.set(null);
    pending?.stay?.();
    const from = pending?.from;
    afterNextRender(() => (from?.isConnected ? from : document.getElementById('recipe-name'))?.focus(), {
      injector: this.injector
    });
  }

  /**
   * Whether a link in the app may take the page away (core/leave.guard.ts):
   * at once when nothing would be lost, or once the potter answers. When the
   * session has ended nothing can be saved here, so the page goes, and the
   * page it goes to says what was lost.
   */
  canLeave(): boolean | Promise<boolean> {
    if (!this.unsaved()) return true;
    if (!this.auth.hasSession()) {
      if (this.router.currentNavigation()?.extras.state?.['sessionEnded']) {
        this.auth.lostRecipe.set(this.title().trim() || translate('recipe.page.untitled'));
      }
      return true;
    }
    return new Promise((resolve) => this.leave(() => resolve(true), { stay: () => resolve(false), page: true }));
  }

  /** A reload, a closed tab or a link out of the app (such as another language): the browser asks, in its own words. */
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.unsaved()) event.preventDefault();
  }

  private reset(): void {
    this.showing++;
    this.title.set('');
    this.date.set('');
    this.notes.set('');
    this.lines.set([]);
    this.additiveLines.set([]);
    this.includeAdditives.set(includeByDefault());
    this.firing.set('');
    this.sgTarget.set(null);
    this.setFiringFrom(null);
    this.savedId.set(null);
    this.savedAt.set(null);
    this.savedSnapshot.set(this.snapshot());
    this.edit.clear();
    this.saveProblem.set('');
    this.checks.clear();
    this.swapUndo.set(null);
    this.beforeSwap.set(null);
    this.swaps.clear();
    this.edit.batchOpen.set(false);
  }

  /** The layout chosen here: kept on this browser, and over ?layout= for the rest of the visit. */
  protected chooseLayout(layout: RecipeLayout): void {
    this.chosenLayout.set(layout);
    this.layoutPicked.set(true);
    storeLayout(layout);
  }

  /** Shows a guided step, its heading taking the focus. */
  protected goToStep(step: number): void {
    const to = Math.max(0, Math.min(this.guidedSteps.length - 1, step));
    this.guidedStep.set(to);
    afterNextRender(() => document.getElementById('guided-step-' + to)?.focus(), { injector: this.injector });
  }

  /** gc-reveal (shared/field-checks.ts): the focus is going to something in a hidden guided step, so it shows. */
  protected revealStep(event: Event): void {
    const pane = (event.target as HTMLElement | null)?.closest<HTMLElement>('.guided-pane');
    const step = Number(pane?.dataset['step']);
    if (!pane || Number.isNaN(step)) return;
    this.guidedStep.set(step);
    // Shown now, not at the next drawing: the focus goes there as soon as this returns.
    pane.hidden = false;
  }

  /** The workbench's peek bar on a phone: to the formula and limits beside (below) the recipe. */
  protected toFormula(): void {
    const heading = document.getElementById('unity-heading');
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }

  /** Counts the additives in the unity formula, or not; new recipes start with the choice made last. */
  protected setIncludeAdditives(include: boolean): void {
    this.includeAdditives.set(include);
    try {
      localStorage.setItem(INCLUDE_KEY, include ? 'yes' : 'no');
    } catch {
      // Without storage the choice still holds for this recipe.
    }
  }

  /** A material or additive by its name or one of its aliases, for one that borrows another's chemistry. */
  private findByName(name: string): MaterialInput | undefined {
    const wanted = folded(name.trim());
    const records = [
      ...this.standardAdditives(),
      ...this.myAdditives(),
      ...this.standardMaterials(),
      ...this.myMaterials()
    ];
    return records.find(
      (record) => folded(record.name) === wanted || (record.aliases ?? []).some((alias) => folded(alias) === wanted)
    );
  }

  // The saved list.

  protected async remove(recipe: Recipe): Promise<void> {
    if (!(await this.removal.remove(recipe))) return;
    // A question about opening it has nothing left to open.
    if (this.pendingLeave()?.recipeId === recipe._id) this.pendingLeave.set(null);
    // The recipe on the page stays, but as one not saved yet.
    if (recipe._id === this.savedId()) {
      this.savedId.set(null);
      this.savedSnapshot.set('');
    }
    // Undo the swap puts it back the same way.
    const undo = this.swapUndo();
    if (undo && undo.savedId === recipe._id) {
      this.swapUndo.set({ ...undo, savedId: null, savedSnapshot: '', savedAt: null });
    }
  }

  protected loadStandardMaterials(): void {
    void this.load(
      this.materials.getStandard(),
      this.standardMaterials,
      marker('recipe.page.fetchStandardMaterials'),
      this.standardMaterialsFailed
    );
  }

  protected loadStandardAdditives(): void {
    void this.load(
      this.additives.getStandard(),
      this.standardAdditives,
      marker('recipe.page.fetchStandardAdditives'),
      this.standardAdditivesFailed
    );
  }

  /**
   * Fills the list, or says it could not: failure is the key of the message.
   * A list that can be asked for again keeps whether it failed, and says so once;
   * fetched on a later try, its message goes. Whether the list arrived.
   */
  private async load<T>(
    request: Promise<T[]>,
    target: { set(value: T[]): void },
    failure: string,
    failed?: WritableSignal<boolean>
  ): Promise<boolean> {
    try {
      target.set(await request);
      if (failed?.()) {
        const message = translate(failure);
        this.notices.errors.update((list) => list.filter((text) => text !== message));
      }
      failed?.set(false);
      return true;
    } catch {
      if (!failed?.()) this.notices.error(translate(failure));
      failed?.set(true);
      return false;
    }
  }

  private focusTitle(): void {
    afterNextRender(() => focusShown('recipe-name'), { injector: this.injector });
  }
}
