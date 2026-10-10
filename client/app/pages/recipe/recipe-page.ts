import { Location, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  Injector,
  OnInit,
  WritableSignal,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { map } from 'rxjs';
import { CONES, MaterialInput } from '../../../../lib/chemistry';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { AsksBeforeLeaving } from '../../core/leave.guard';
import { Additive, AdditiveUnit, Material, Recipe, RecipeMaterial } from '../../core/models';
import { PreferencesService } from '../../core/preferences.service';
import { LocaleService } from '../../core/locale.service';
import { ShelfService } from '../../core/shelf.service';
import { RichText } from '../../i18n/rich-text';
import { Busy } from '../../shared/busy';
import { fixed, formatTemperature, formatTime, listOf, notANumber, upTo } from '../../shared/format';
import { DatePipe, FixedPipe, PlainPipe } from '../../shared/format-pipes';
import { NumberInput } from '../../shared/number-input';
import { Check, FieldCheck, FieldChecks, required } from '../../shared/field-checks';
import { localDate } from '../../shared/dates';
import { Notices, NoticesList } from '../../shared/notices';
import { chosenRegion, findNamed, hasLead } from '../../shared/library-info';
import { firstOf } from '../../shared/options';
import { PageHeader } from '../../shared/page-header';
import { Removal, RemoveButton } from '../../shared/remove-button';
import { GRAMS_PER_POUND, WeightUnit, formatWeight } from '../../shared/weights';
import { LibraryMaterial, modernMaterials } from './compare';
import { Rebase, amountOf, isAmount, rebase, totalOf, unitOf } from './rebase';
import { additiveAmount, evaluate, savedAnalysis } from './recipe-analysis';
import { CompareChoice, RecipeCompare } from './recipe-compare';
import { RecipeHelp } from './recipe-help';
import { RecipeLibrary, libraryKey } from './recipe-library';
import { RecipePrint } from './recipe-print';
import { Plan, oxideLabel, planSuggestion, suggestAmounts } from './suggest';
import { BaseChoice, LeadMode, leadFreeBases, leadIn, recipeHasLead, replaceLead } from './lead';
import { TryMaterial } from './pool';
import { matchFromShelf } from './shelf';
import { Run, SwapReport, SwapResult } from './swap-report';
import { TryMaterials } from './try-materials';
import { UnityFormula, silicaAluminaRatio, unityColumns } from './unity-formula';

const INCLUDE_KEY = 'includeAdditives';

/** Whether new recipes count their additives: the choice made last on this browser. */
const includeByDefault = (): boolean => {
  try {
    return localStorage.getItem(INCLUDE_KEY) === 'yes';
  } catch {
    return false;
  }
};

/** Each label is the key of its message. */
const ADDITIVE_UNITS: ReadonlyArray<{ value: AdditiveUnit; label: string }> = [
  { value: 'percent', label: marker('recipe.page.units.percent') },
  { value: 'parts', label: marker('recipe.page.units.parts') },
  { value: 'grams', label: marker('recipe.page.units.grams') }
];

const copy = <T>(value: T): T => structuredClone(value);
/** What a change of scale did, as the key of its message. */
const SCALE_NOTES: Record<Exclude<Rebase['to'], 'batch'>, string> = {
  percent: marker('recipe.page.scaledPercent'),
  parts: marker('recipe.page.scaledParts')
};

/** A batch weight to start from, in each unit: about a pound either way. */
const DEFAULT_BATCH: Record<WeightUnit, string> = { g: '500', lb: '1' };

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
}

/** What Undo the swap puts back: the recipe as it was, and whether (and as what) it was saved. */
interface SwapUndo {
  recipe: Recipe;
  savedId: string | null;
  savedSnapshot: string;
  savedAt: Date | null;
  /** How Suggest amounts or Replace lead made it, to show and to work out again. */
  result?: SwapResult;
}

/** What a swap makes of the recipe, for its new title: "Celadon with modern materials". */
type SwapKind = 'modern' | 'lead' | 'shelf';

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

@Component({
  selector: 'gc-recipe-page',
  imports: [
    DatePipe,
    FieldCheck,
    FixedPipe,
    PlainPipe,
    FormsModule,
    NgTemplateOutlet,
    NoticesList,
    NumberInput,
    PageHeader,
    RecipeHelp,
    RecipeCompare,
    RecipeLibrary,
    RecipePrint,
    RemoveButton,
    RichText,
    SwapReport,
    TranslocoDirective,
    TryMaterials,
    UnityFormula
  ],
  templateUrl: './recipe-page.html',
  host: { '(window:beforeunload)': 'beforeUnload($event)' }
})
export class RecipePage implements OnInit, AsksBeforeLeaving {
  private readonly resources = inject(ApiResourceFactory);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly preferences = inject(PreferencesService);
  private readonly shelf = inject(ShelfService);
  private readonly weightUnit = this.preferences.weightUnit;
  /** Lead is off in Settings: materials with lead are not listed to add, or suggested. */
  protected readonly leadOff = computed(() => this.preferences.lead() === 'off');
  private readonly recipes = this.resources.for<Recipe>('recipe');
  private readonly materials = this.resources.for<Material>('materials');
  private readonly additives = this.resources.for<Additive>('additives');

  protected readonly notices = new Notices();
  protected readonly saving = new Busy();
  protected readonly savedAnalysis = savedAnalysis;
  protected readonly firstOf = firstOf;
  protected readonly additiveAmount = additiveAmount;
  protected readonly additiveUnits = ADDITIVE_UNITS;
  protected readonly unitOf = unitOf;

  // The recipe being edited.
  protected readonly title = signal('');
  protected readonly date = signal('');
  protected readonly notes = signal('');
  protected readonly lines = signal<RecipeMaterial[]>([]);
  protected readonly additiveLines = signal<Additive[]>([]);

  // The lists to add from, and the saved recipes.
  protected readonly myMaterials = signal<Material[]>([]);
  protected readonly standardMaterials = signal<Material[]>([]);
  protected readonly myAdditives = signal<Additive[]>([]);
  protected readonly standardAdditives = signal<Additive[]>([]);
  /** The standard lists could not be fetched: the lists say so, and offer to try again. */
  protected readonly standardMaterialsFailed = signal(false);
  protected readonly standardAdditivesFailed = signal(false);
  protected readonly myRecipes = signal<Recipe[]>([]);
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly removal = new Removal(this.recipes, this.myRecipes, this.notices, (recipe) => recipe.title);

  /** Whether the unity formula counts the colorants and additives too; saved with the recipe. */
  protected readonly includeAdditives = signal(includeByDefault());

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
      includeAdditives: this.includeAdditives()
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

  // Scale changes.
  protected readonly batchOpen = signal(false);
  /** The batch weight as typed, and the unit it was typed in. */
  private readonly batchTyped = signal<{ text: string; unit: WeightUnit } | null>(null);
  /** The batch weight in the account's unit (grams, or pounds). */
  protected readonly batchText = computed(() => {
    const typed = this.batchTyped();
    const unit = this.weightUnit();
    return typed?.unit === unit ? typed.text : DEFAULT_BATCH[unit];
  });
  protected readonly batchUnit = computed(() => (this.weightUnit() === 'lb' ? 'lb' : 'g'));
  protected readonly scaleMessage = signal<{ text: string; problem: boolean } | null>(null);
  /**
   * Scaled to a batch in pounds: the amounts are pounds, and each shows what it
   * weighs in pounds and ounces, until the scale changes or another recipe opens.
   */
  private readonly inPounds = signal(false);
  protected readonly poundReadings = computed(() => {
    if (!this.inPounds()) return null;
    const reading = (pounds: number): string => (pounds > 0 ? formatWeight(pounds * GRAMS_PER_POUND, 'lb') : '');
    const base = this.total();
    return {
      materials: this.lines().map((line) => reading(amountOf(line.amount))),
      // A percent of the base is that share of the batch.
      additives: this.additiveLines().map((line) =>
        reading(unitOf(line) === 'percent' ? (amountOf(line.amount) / 100) * base : amountOf(line.amount))
      ),
      total: reading(base)
    };
  });
  /** Told to screen readers: what an action did that the focus does not show. */
  protected readonly announcement = signal('');

  protected readonly evaluation = computed(() =>
    evaluate(this.lines(), this.additiveLines(), {
      includeAdditives: this.includeAdditives(),
      chemistryOf: (name) => this.findByName(name)
    })
  );
  protected readonly total = computed(() => totalOf(this.lines().map((l) => l.amount)));
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

  // Printing: ?print=draft prints the recipe being edited, ?print=<id> a saved one.
  private readonly printParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('print'))), {
    initialValue: null
  });
  private readonly recipesLoaded = signal(false);
  /** The recipe being edited, as it would be saved. */
  private readonly draft = computed<Recipe>(() => ({
    title: this.title(),
    date: this.date(),
    notes: this.notes(),
    materials: this.lines(),
    additives: this.additiveLines(),
    includeAdditives: this.includeAdditives()
  }));
  /** The recipe in the print view, while it is open. */
  protected readonly printRecipe = computed<Recipe | null>(() => {
    const wanted = this.printParam();
    if (!wanted) return null;
    if (wanted === 'draft') return this.lines().length ? this.draft() : null;
    return this.myRecipes().find((recipe) => recipe._id === wanted) ?? null;
  });
  /** Asked to print a saved recipe, before the saved recipes are in. */
  protected readonly printWaiting = computed(
    () => !!this.printParam() && this.printParam() !== 'draft' && !this.recipesLoaded()
  );
  /** Whether this page opened the print or compare view, so closing it can go back in the history. */
  private viewOpenedHere = false;
  protected readonly chemistryOf = (name: string) => this.findByName(name);

  // Comparing: ?compare=<first>,<second>, each 'draft' (the recipe being edited),
  // 'before' (it before Try modern materials) or a saved recipe's id.
  private readonly compareParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('compare'))), {
    initialValue: null
  });
  /** The recipe being edited as it was before Try modern materials, to compare with. */
  private readonly beforeSwap = signal<Recipe | null>(null);
  protected readonly compareKeys = computed(() => {
    const param = this.compareParam();
    if (param === null) return null;
    const [left = '', right = ''] = param.split(',');
    return { left, right };
  });
  protected readonly compareLeft = computed(() => this.recipeFor(this.compareKeys()?.left));
  protected readonly compareRight = computed(() => this.recipeFor(this.compareKeys()?.right));
  /** Whether the compare view is open: asked for, and at least one of the two is there. */
  protected readonly comparing = computed(() => !!this.compareKeys() && !!(this.compareLeft() || this.compareRight()));
  protected readonly compareWaiting = computed(() => !!this.compareKeys() && !this.recipesLoaded());
  protected readonly compareChoices = computed<CompareChoice[]>(() => {
    const before = this.beforeSwap();
    return [
      ...(this.lines().length
        ? [
            {
              key: 'draft',
              label: translate('recipe.page.beingEdited', {
                title: this.title().trim() || translate('recipe.page.untitled')
              })
            }
          ]
        : []),
      ...(before ? [{ key: 'before', label: translate('recipe.page.beforeSwap', { title: before.title }) }] : []),
      ...this.myRecipes().map((recipe) => ({ key: recipe._id ?? '', label: recipe.title }))
    ];
  });
  /** The button that opened the compare view, for the focus to go back to. */
  private compareOpener = '';
  /** What Undo the swap puts back: the recipe as it was, and whether (and as what) it was saved. */
  protected readonly swapUndo = signal<SwapUndo | null>(null);
  protected readonly swapResult = computed(() => this.swapUndo()?.result ?? null);
  /** The report goes with the compare view while it shows the new recipe, and under Materials otherwise. */
  protected readonly reportInCompare = computed(() => this.comparing() && this.compareKeys()?.right === 'draft');
  /** The materials of the recipe as it was and as it is, marked in the lists to try. */
  protected readonly swapKeys = computed(
    () => new Set([...(this.swapUndo()?.recipe.materials ?? []).map(libraryKey), ...this.materialKeys()])
  );

  /** Materials that are no longer current, with what the library says replaces them. */
  protected readonly modern = computed(() =>
    modernMaterials(this.lines(), (name) => this.findMaterial(name), chosenRegion(), {
      allowLead: !this.leadOff(),
      findAdditive: (name) => findNamed(this.standardAdditives(), name)
    })
  );
  /** Whether a swap needs its amounts worked out again, so Suggest amounts is offered. */
  protected readonly notLikeForLike = computed(() => this.modern().swaps.some((swap) => !swap.like));
  /** Suggest amounts' question: for each oxide a swap leaves short, what brings it back ('' leaves it out). */
  protected readonly suggestQuestion = signal<{ plan: Plan; chosen: Record<string, string> } | null>(null);
  protected readonly suggestProblem = signal('');
  protected readonly oxideLabel = oxideLabel;
  /** Materials to try, added in Suggest amounts' or Replace lead's question. */
  protected readonly suggestTries = signal<TryMaterial[]>([]);
  protected readonly leadTries = signal<TryMaterial[]>([]);
  protected readonly tryingMore = signal(false);

  // Match with what I have: the recipe made again from only the materials on hand.
  protected readonly shelfOpen = signal(false);
  protected readonly shelfTries = signal<TryMaterial[]>([]);
  protected readonly shelfLoaded = computed(() => this.shelf.keys() !== null);
  protected readonly shelfProblem = this.shelf.problem;
  /** How many on hand have lead, left out while lead is off. */
  protected readonly shelfLeadHidden = computed(() =>
    this.leadOff()
      ? (this.shelf.keys() ?? []).filter((key) => {
          const material = this.libraryMaterial(key);
          return !!material && hasLead(material);
        }).length
      : 0
  );
  protected readonly shelfStatus = signal('');
  protected readonly noKeys: ReadonlySet<string> = new Set();

  // Replace lead: the recipe without lead, rebuilt or with its colour carried onto a lead-free base.
  protected readonly cones = CONES;
  protected readonly listOf = listOf;
  private readonly locale = inject(LocaleService);
  /** Firing to Orton cones, or by temperature alone (Settings). */
  protected readonly byCones = computed(() => this.locale.cones() === 'orton');
  /** A firing as the potter names it: "04 (1060 °C)" to cones, or "1060 °C" by temperature. */
  protected firingLabel(firing: { cone: string; celsius: number }): string {
    const temperature = formatTemperature(firing.celsius, this.locale.temperature());
    return this.byCones() ? `${firing.cone} (${temperature})` : temperature;
  }
  protected readonly hasLead = computed(() => recipeHasLead(this.lines()));
  protected readonly leadAmount = computed(() => (this.hasLead() ? leadIn(this.lines()) : null));
  protected readonly leadQuestion = signal<{
    cone: string;
    mode: LeadMode;
    bases: BaseChoice[];
    base: string;
  } | null>(null);

  constructor() {
    // Asked to print what is not there (an empty page after a reload, a recipe removed elsewhere): show the editor.
    effect(() => {
      if (this.printParam() && !this.printRecipe() && !this.printWaiting()) untracked(() => this.leavePrint());
    });
    // Asked to compare two recipes neither of which is there: show the editor.
    effect(() => {
      if (this.compareKeys() && !this.comparing() && !this.compareWaiting()) untracked(() => this.leaveCompare());
    });
    // The focus goes to the compare options when they open, and back to the button that opened them.
    let compared = false;
    effect(() => {
      const comparing = this.comparing();
      if (comparing === compared) return;
      compared = comparing;
      const target = comparing ? 'compare-heading' : this.compareOpener;
      untracked(() =>
        afterNextRender(() => (document.getElementById(target) ?? document.getElementById('recipe-name'))?.focus(), {
          injector: this.injector
        })
      );
    });
    // The focus goes to the print options when they open, and back to the Print button that opened them.
    let printed: string | null = null;
    effect(() => {
      const printing = this.printRecipe() ? this.printParam() : null;
      if (printing === printed) return;
      const target = printing ? 'print-heading' : 'print-' + printed;
      printed = printing;
      untracked(() => afterNextRender(() => document.getElementById(target)?.focus(), { injector: this.injector }));
    });
  }

  ngOnInit(): void {
    void this.load(this.materials.getAll(), this.myMaterials, marker('recipe.page.fetchMaterials'));
    this.loadStandardMaterials();
    void this.load(this.additives.getAll(), this.myAdditives, marker('recipe.page.fetchAdditives'));
    this.loadStandardAdditives();
    void this.load(this.recipes.getAll(), this.myRecipes, marker('recipe.page.fetchRecipes')).then(() =>
      this.recipesLoaded.set(true)
    );
  }

  // Materials and additives.

  protected addMaterial(material: Material): void {
    this.lines.update((list) => [...list, { ...copy(material), amount: '' }]);
    this.scaleMessage.set(null);
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    this.focusAmount('material', this.lines().length - 1);
  }

  protected setAmount(index: number, amount: string): void {
    this.lines.update((list) => list.map((line, i) => (i === index ? { ...line, amount } : line)));
    this.scaleMessage.set(null);
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
  }

  protected removeMaterial(index: number): void {
    const name = this.lines()[index]?.name;
    this.lines.update((list) => list.filter((_, i) => i !== index));
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    // The amounts after it move up a place, so their marks would be on the wrong lines.
    this.checks.clear();
    this.afterTakingOut('material', name, index, this.lines().length);
  }

  protected addAdditive(additive: Additive): void {
    // Most recipes give colorants as a percent of the base.
    this.additiveLines.update((list) => [...list, { ...copy(additive), amount: '', unit: 'percent' }]);
    this.focusAmount('additive', this.additiveLines().length - 1);
  }

  protected setAdditiveAmount(index: number, amount: string): void {
    this.additiveLines.update((list) => list.map((line, i) => (i === index ? { ...line, amount } : line)));
  }

  protected setAdditiveUnit(index: number, unit: AdditiveUnit): void {
    this.additiveLines.update((list) => list.map((line, i) => (i === index ? { ...line, unit } : line)));
  }

  protected removeAdditive(index: number): void {
    const name = this.additiveLines()[index]?.name;
    this.additiveLines.update((list) => list.filter((_, i) => i !== index));
    this.checks.clear();
    this.afterTakingOut('additive', name, index, this.additiveLines().length);
  }

  /**
   * Says what was taken out, and keeps the focus in the list: on the ✕ now in
   * the same place, or the one before, or the list's heading once it is empty.
   */
  private afterTakingOut(kind: 'material' | 'additive', name: string | undefined, index: number, left: number): void {
    this.announcement.set(
      name === undefined ? translate('recipe.page.itTakenOut') : translate('recipe.page.takenOut', { name })
    );
    afterNextRender(
      () => {
        const target = left
          ? document.getElementById(kind + '-remove-' + Math.min(index, left - 1))
          : document.getElementById(kind + 's-heading');
        target?.focus();
      },
      { injector: this.injector }
    );
  }

  /** A material's share of the batch, as a percent. */
  protected share(amount: string | undefined): string {
    const total = this.total();
    return total && amountOf(amount) ? upTo((amountOf(amount) / total) * 100, 1) + '%' : '';
  }

  protected formatTotal(): string {
    return upTo(this.total(), 3);
  }

  protected scale(how: Exclude<Rebase, { to: 'batch' }>): void {
    if (this.rescale(how, translate('recipe.page.enterAmountsFirst'))) {
      this.inPounds.set(false);
      this.scaleMessage.set({ text: translate(SCALE_NOTES[how.to]), problem: false });
    }
  }

  protected setBatchText(text: string): void {
    this.batchTyped.set({ text, unit: this.weightUnit() });
  }

  /** Scales to a batch in the account's unit: grams, or pounds (shown in pounds and ounces too). */
  protected scaleToBatch(): void {
    const pounds = this.weightUnit() === 'lb';
    const missing = pounds ? translate('recipe.page.batchPounds') : translate('recipe.page.batchGrams');
    if (!this.rescale({ to: 'batch', weight: amountOf(this.batchText()) }, missing)) return;
    if (!pounds) {
      this.inPounds.set(false);
      this.scaleMessage.set({ text: translate('recipe.page.scaledGrams'), problem: false });
      return;
    }
    // Colorants in grams would now be pounds: in parts, they say they scale as the materials do.
    const inGrams = this.additiveLines().some((line) => unitOf(line) === 'grams');
    this.additiveLines.update((list) =>
      list.map((line) => (unitOf(line) === 'grams' ? { ...line, unit: 'parts' as const } : line))
    );
    this.inPounds.set(true);
    this.scaleMessage.set({
      text: inGrams ? translate('recipe.page.scaledPoundsParts') : translate('recipe.page.scaledPounds'),
      problem: false
    });
  }

  /** Puts the recipe on a new scale; false, with the reason shown, when it cannot. */
  private rescale(how: Rebase, missing: string): boolean {
    // Scaling around an amount it cannot read would change the proportions.
    const unreadable = this.unreadableLine();
    if (unreadable) {
      this.scaleMessage.set({ text: this.notANumber(unreadable), problem: true });
      return false;
    }
    const result = rebase(
      this.lines().map((l) => l.amount),
      this.additiveLines(),
      how
    );
    if (!result) {
      this.scaleMessage.set({ text: missing, problem: true });
      return false;
    }
    this.lines.update((list) => list.map((line, i) => ({ ...line, amount: result.materials[i] })));
    this.additiveLines.update((list) => list.map((line, i) => ({ ...line, amount: result.additives[i] })));
    this.batchOpen.set(false);
    return true;
  }

  // Saving.

  protected save(): Promise<void> {
    return this.saving.run(async () => {
      const saved = await this.saveAs('save');
      if (saved) this.notices.success(translate('recipe.page.savedNotice', { title: saved.title }), 'save');
    });
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
      includeAdditives: this.includeAdditives()
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
      }
      return { title: recipe.title, stillOpen, changedSince: this.snapshot() !== sent };
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

  // Printing.

  /** Opens the print view for the recipe being edited, saved or not. */
  protected printDraft(): void {
    this.saveProblem.set('');
    if (!this.lines().length) {
      this.saveProblem.set(translate('recipe.page.addMaterialToPrint'));
      return;
    }
    // It would print as 0 g. (Blank amounts are fine to print; they count as 0.)
    const unreadable = this.unreadableField();
    if (unreadable) {
      this.checks.report(unreadable, notANumber());
      return;
    }
    this.openPrint('draft');
  }

  /** Opens the print view: for 'draft', or a saved recipe's id. Back in the browser closes it. */
  protected openPrint(what: string): void {
    this.viewOpenedHere = true;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { print: what },
      queryParamsHandling: 'merge'
    });
  }

  protected closePrint(): void {
    if (!this.viewOpenedHere) return this.leavePrint();
    this.viewOpenedHere = false;
    this.location.back();
  }

  private leavePrint(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { print: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  // Comparing (issue #6).

  /** Compares the recipe being edited with a saved one (the first other, to start with). */
  protected compareDraft(): void {
    this.saveProblem.set('');
    if (!this.lines().length) {
      this.saveProblem.set(translate('recipe.page.addMaterialToCompare'));
      return;
    }
    const unreadable = this.unreadableField();
    if (unreadable) {
      this.checks.report(unreadable, notANumber());
      return;
    }
    const other = this.myRecipes().find((recipe) => recipe._id !== this.savedId());
    this.openCompare('draft', other?._id ?? '', 'compare-draft');
  }

  /** Compares a saved recipe with the one being edited, or with another saved one. */
  protected compareSaved(recipe: Recipe): void {
    const id = recipe._id ?? '';
    const other =
      this.lines().length && this.savedId() !== id ? 'draft' : (this.myRecipes().find((r) => r._id !== id)?._id ?? '');
    this.openCompare(id, other, 'compare-' + id);
  }

  protected chooseCompared(choice: { side: 'left' | 'right'; key: string }): void {
    const keys = { left: '', right: '', ...this.compareKeys(), [choice.side]: choice.key };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { compare: keys.left + ',' + keys.right },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  protected closeCompare(): void {
    if (!this.viewOpenedHere) return this.leaveCompare();
    this.viewOpenedHere = false;
    this.location.back();
  }

  private openCompare(left: string, right: string, opener: string): void {
    this.viewOpenedHere = true;
    this.compareOpener = opener;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { compare: left + ',' + right },
      queryParamsHandling: 'merge'
    });
  }

  private leaveCompare(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { compare: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private recipeFor(key: string | undefined): Recipe | null {
    if (!key) return null;
    if (key === 'draft') return this.lines().length ? this.draft() : null;
    if (key === 'before') return this.beforeSwap();
    return this.myRecipes().find((recipe) => recipe._id === key) ?? null;
  }

  /**
   * Swaps each material that is no longer current for what replaces it, one for
   * one, as a new recipe (the one opened stays as it was), and compares the two.
   */
  protected tryModernMaterials(): void {
    const { materials, swaps } = this.modern();
    if (!swaps.length) return;
    const swapped = swaps.map((s) =>
      s.like
        ? translate('recipe.page.became', { from: s.from, to: s.to })
        : translate('recipe.page.becameNotLike', { from: s.from, to: s.to })
    );
    this.swapIn(
      materials,
      translate('recipe.page.swappedNote', { list: listOf(swapped) }),
      translate('recipe.page.swappedCount', { count: swaps.length }),
      'try-modern'
    );
  }

  /**
   * Suggest amounts: works out the modern materials' amounts, and the rest of
   * the recipe's, to bring its unity formula back while changing it as little
   * as it can. When a swap leaves an oxide well short, it asks first what
   * should bring it back.
   */
  protected suggestModernAmounts(): void {
    this.suggestProblem.set('');
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    const unreadable = this.unreadableLine();
    if (unreadable) {
      this.suggestProblem.set(this.notANumber(unreadable));
      return;
    }
    let plan: Plan;
    try {
      plan = planSuggestion(this.lines(), (name) => this.findMaterial(name), this.standardMaterials(), chosenRegion(), {
        allowLead: !this.leadOff()
      });
    } catch {
      this.suggestProblem.set(translate('recipe.page.cannotSuggest'));
      return;
    }
    if (!plan.shortfalls.length) {
      this.applySuggestion(this.runOf('suggest'));
      return;
    }
    const chosen = Object.fromEntries(plan.shortfalls.map((short) => [short.oxide, short.choices[0]?.name ?? '']));
    this.suggestTries.set([]);
    this.tryingMore.set(false);
    this.suggestQuestion.set({ plan, chosen });
    afterNextRender(() => document.getElementById('suggest-heading')?.focus(), { injector: this.injector });
  }

  protected chooseBringIn(oxide: string, name: string): void {
    this.suggestQuestion.update((question) =>
      question ? { ...question, chosen: { ...question.chosen, [oxide]: name } } : question
    );
  }

  protected cancelSuggestion(): void {
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    afterNextRender(() => document.getElementById('suggest-amounts')?.focus(), { injector: this.injector });
  }

  /** Works the amounts out with what was chosen to bring short oxides back, and compares. */
  protected workOutSuggestion(): void {
    const chosen = Object.values(this.suggestQuestion()?.chosen ?? {}).filter(Boolean);
    const bringIn = [...new Set(chosen)]
      .map((name) => this.standardMaterials().find((material) => material.name === name))
      .filter((material): material is Material => !!material);
    const run = { ...this.runOf('suggest'), bringIn, tries: this.suggestTries() };
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    this.applySuggestion(run);
  }

  /** A run with nothing chosen yet. */
  private runOf(kind: Run['kind']): Run {
    return { kind, bringIn: [], tries: [], avoid: [], uncapped: [], cone: '', mode: 'rebuild', base: '' };
  }

  private applySuggestion(run: Run, compare = true): void {
    const { swaps } = this.modern();
    const suggestion = suggestAmounts(this.lines(), (name) => this.findMaterial(name), run.bringIn, chosenRegion(), {
      allowLead: !this.leadOff(),
      tries: run.tries,
      avoid: run.avoid,
      additives: this.additiveLines()
    });
    const swapped = listOf(swaps.map((s) => translate('recipe.page.became', { from: s.from, to: s.to })));
    const parts = [
      translate('recipe.page.suggestedNote', { list: swapped }),
      this.changedNote(suggestion.changes),
      suggestion.unused.length ? translate('recipe.page.unusedNote', { list: listOf(suggestion.unused) }) : '',
      suggestion.stillShort.length
        ? translate('recipe.page.stillShortNote', { list: listOf(suggestion.stillShort) })
        : '',
      ...suggestion.cautions,
      translate('recipe.page.testFirst')
    ];
    this.swapIn(
      suggestion.materials,
      parts.filter(Boolean).join(' '),
      compare ? translate('recipe.page.suggested') : translate('recipe.page.workedOutAgain'),
      'suggest-amounts',
      'modern',
      { run, report: suggestion.report, cautions: suggestion.cautions },
      compare
    );
  }

  /** What a substitution changed, for the new recipe's notes: "Changed: Whiting 20 → 18.1; Silica 30 → 31.5." */
  private changedNote(changes: string[]): string {
    return changes.length ? translate('recipe.page.changedNote', { changes: changes.join('; ') }) : '';
  }

  private celsiusOf(cone: string): number {
    return CONES.find((c) => c.cone === cone)?.celsius ?? 1060;
  }

  private basesFor(cone: string, mode: LeadMode = 'rebuild'): BaseChoice[] {
    return leadFreeBases(
      this.lines(),
      this.additiveLines(),
      (name) => this.findMaterial(name),
      this.standardMaterials(),
      chosenRegion(),
      this.celsiusOf(cone),
      mode
    );
  }

  /** Replace lead: asks the firing, how, and which lead-free frit to build on. */
  protected askReplaceLead(): void {
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    const cone = '04';
    let bases: BaseChoice[];
    try {
      bases = this.basesFor(cone);
    } catch {
      this.suggestProblem.set(translate('recipe.page.cannotReplaceLead'));
      return;
    }
    this.leadTries.set([]);
    this.tryingMore.set(false);
    this.leadQuestion.set({ cone, mode: 'rebuild', bases, base: bases[0]?.name ?? '' });
    afterNextRender(() => document.getElementById('lead-heading')?.focus(), { injector: this.injector });
  }

  /** A different firing sets different boron, so the frits are ranked again. */
  protected chooseCone(cone: string): void {
    const question = this.leadQuestion();
    if (!question) return;
    const bases = this.basesFor(cone, question.mode);
    const base = bases.some((b) => b.name === question.base) ? question.base : (bases[0]?.name ?? '');
    this.leadQuestion.set({ ...question, cone, bases, base });
  }

  /** Rebuilding and keeping the colour rank the frits differently. */
  protected chooseLeadMode(mode: LeadMode): void {
    const question = this.leadQuestion();
    if (!question) return;
    const bases = this.basesFor(question.cone, mode);
    const base = bases.some((b) => b.name === question.base) ? question.base : (bases[0]?.name ?? '');
    this.leadQuestion.set({ ...question, mode, bases, base });
  }

  protected chooseLeadBase(base: string): void {
    this.leadQuestion.update((question) => (question ? { ...question, base } : question));
  }

  protected cancelReplaceLead(): void {
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    afterNextRender(() => document.getElementById('replace-lead')?.focus(), { injector: this.injector });
  }

  /** Replaces the lead as chosen, as a new recipe compared with the old one. */
  protected workOutReplaceLead(): void {
    const question = this.leadQuestion();
    if (!question?.base) return;
    const { cone, mode, base } = question;
    const run: Run = { ...this.runOf('lead'), cone, mode, base, tries: mode === 'rebuild' ? this.leadTries() : [] };
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    this.applyLead(run);
  }

  private applyLead(run: Run, compare = true): void {
    const replacement = replaceLead(
      this.lines(),
      this.additiveLines(),
      (name) => this.findMaterial(name),
      this.standardMaterials(),
      chosenRegion(),
      {
        base: run.base,
        celsius: this.celsiusOf(run.cone),
        mode: run.mode,
        tries: run.tries,
        avoid: run.avoid,
        uncapped: run.uncapped
      }
    );
    const firing = CONES.find((c) => c.cone === run.cone) ?? { cone: run.cone, celsius: 0 };
    const how =
      run.mode === 'rebuild'
        ? this.byCones()
          ? translate('recipe.page.leadRebuiltCone', { cone: run.cone, base: run.base })
          : translate('recipe.page.leadRebuilt', { firing: this.firingLabel(firing), base: run.base })
        : translate('recipe.page.leadColour', { base: run.base });
    const parts = [
      how,
      this.changedNote(replacement.changes),
      ...replacement.cautions,
      translate('recipe.page.leadGloss'),
      translate('recipe.page.leadSafety')
    ];
    this.swapIn(
      replacement.materials,
      parts.filter(Boolean).join(' '),
      compare ? translate('recipe.page.leadReplaced') : translate('recipe.page.workedOutAgain'),
      'replace-lead',
      'lead',
      { run, report: replacement.report, cautions: replacement.cautions },
      compare
    );
  }

  /** Match with what I have: shows the materials on hand, fetched from the account. */
  protected async askShelf(): Promise<void> {
    if (this.shelfOpen()) return this.closeShelf();
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.suggestProblem.set('');
    this.shelfStatus.set('');
    this.shelfOpen.set(true);
    afterNextRender(() => document.getElementById('shelf-heading')?.focus(), { injector: this.injector });
    await this.loadShelf();
  }

  /** Fetches the materials on hand (again, after a fetch that failed), and lists those this page can use. */
  protected async loadShelf(): Promise<void> {
    await this.shelf.load();
    const kept = this.shelfTries();
    this.shelfTries.set(
      (this.shelf.keys() ?? [])
        .map((key) => this.shelfMaterial(key))
        .filter((material): material is LibraryMaterial => !!material)
        .map((material) => ({
          material,
          must: kept.some((tried) => tried.must && tried.material.name === material.name)
        }))
    );
  }

  /** A material in the standard library or the user's own, by its key (recipe-library.ts libraryKey). */
  private libraryMaterial(key: string): LibraryMaterial | undefined {
    return [...this.standardMaterials(), ...this.myMaterials()].find((material) => libraryKey(material) === key);
  }

  /** A material on hand that a match may use: one that is loaded, and without lead while lead is off. */
  private shelfMaterial(key: string): LibraryMaterial | undefined {
    const material = this.libraryMaterial(key);
    return material && !(this.leadOff() && hasLead(material)) ? material : undefined;
  }

  protected closeShelf(): void {
    this.shelfOpen.set(false);
    afterNextRender(() => document.getElementById('match-shelf')?.focus(), { injector: this.injector });
  }

  /**
   * A change to the materials on hand, saved with the account at once. Those
   * not listed here (not loaded, or with lead while lead is off) stay on it.
   */
  protected async changeShelf(tries: TryMaterial[]): Promise<void> {
    const saved = this.shelf.keys();
    if (saved === null) return;
    this.shelfTries.set(tries);
    const listed = tries.map((tried) => libraryKey(tried.material));
    const keys = [...new Set([...saved.filter((key) => listed.includes(key) || !this.shelfMaterial(key)), ...listed])];
    if (keys.join('\n') === saved.join('\n')) return;
    this.shelfStatus.set('');
    if (await this.shelf.save(keys)) this.shelfStatus.set(translate('recipe.page.shelfSaved'));
  }

  /** Adds the materials this recipe uses to those on hand. */
  protected addRecipeToShelf(): void {
    const have = new Set(this.shelfTries().map((tried) => tried.material.name));
    const adding = this.lines()
      .map((line) => this.findMaterial(line.name))
      .filter((material): material is LibraryMaterial => !!material && !have.has(material.name))
      .filter((material, i, list) => list.findIndex((other) => other.name === material.name) === i)
      .filter((material) => !(this.leadOff() && hasLead(material)));
    void this.changeShelf([...this.shelfTries(), ...adding.map((material) => ({ material, must: false }))]);
  }

  /** Makes the recipe again from what is on hand, as a new recipe compared with the old one. */
  protected matchShelf(): void {
    if (!this.shelfTries().length) return;
    const unreadable = this.unreadableLine();
    if (unreadable) {
      this.suggestProblem.set(this.notANumber(unreadable));
      return;
    }
    const run: Run = { ...this.runOf('shelf'), tries: this.shelfTries() };
    try {
      this.applyShelf(run);
    } catch {
      this.suggestProblem.set(translate('recipe.page.cannotMatch'));
      return;
    }
    this.shelfOpen.set(false);
  }

  private applyShelf(run: Run, compare = true): void {
    const match = matchFromShelf(this.lines(), run.tries, { avoid: run.avoid, additives: this.additiveLines() });
    const parts = [
      translate('recipe.page.shelfNote'),
      this.changedNote(match.changes),
      ...match.cautions,
      translate('recipe.page.testFirst')
    ];
    this.swapIn(
      match.materials,
      parts.filter(Boolean).join(' '),
      compare ? translate('recipe.page.shelfMade') : translate('recipe.page.workedOutAgain'),
      'match-shelf',
      'shelf',
      { run, report: match.report, cautions: match.cautions },
      compare
    );
  }

  /**
   * Works the substitution out again from the recipe as it was, with a change
   * from its report: a material left out or added, or a cap lifted.
   */
  protected rerun(change: Partial<Run>): void {
    const undo = this.swapUndo();
    if (!undo?.result) return;
    const run = { ...undo.result.run, ...change };
    this.restore(undo);
    try {
      if (run.kind === 'suggest') this.applySuggestion(run, false);
      else if (run.kind === 'shelf') this.applyShelf(run, false);
      else this.applyLead(run, false);
    } catch {
      this.suggestProblem.set(translate('recipe.page.cannotRerun'));
      return;
    }
    afterNextRender(() => document.getElementById('swap-report-heading')?.focus(), { injector: this.injector });
  }

  /**
   * Puts the modern materials in as a new recipe (the one opened stays as it
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
    this.scaleMessage.set(null);
    this.saveProblem.set('');
    this.suggestProblem.set('');
    this.announcement.set(announcement);
    if (compare) this.openCompare(before, 'draft', opener);
  }

  /** Puts the recipe back as it was before Try modern materials. */
  protected undoSwap(): void {
    const undo = this.swapUndo();
    if (!undo) return;
    this.restore(undo);
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    this.announcement.set(translate('recipe.page.swapUndone'));
    this.focusTitle();
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
    this.savedId.set(undo.savedId);
    this.savedSnapshot.set(undo.savedSnapshot);
    this.savedAt.set(undo.savedAt);
    this.swapUndo.set(null);
    this.beforeSwap.set(null);
    this.checks.clear();
  }

  /** A material by its name, or else another name: the user's own before a standard one. */
  private findMaterial(name: string): LibraryMaterial | undefined {
    return findNamed([...this.myMaterials(), ...this.standardMaterials()], name);
  }

  // Starting over, and opening saved recipes.

  protected startNew(): void {
    this.leave(() => {
      this.reset();
      this.focusTitle();
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
        this.savedId.set(recipe._id ?? null);
        this.savedSnapshot.set(this.snapshot());
        this.savedAt.set(null);
        this.scaleMessage.set(null);
        this.inPounds.set(false);
        this.saveProblem.set('');
        this.checks.clear();
        this.swapUndo.set(null);
        this.beforeSwap.set(null);
        this.suggestQuestion.set(null);
        this.leadQuestion.set(null);
        this.shelfOpen.set(false);
        this.suggestProblem.set('');
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
    this.savedId.set(null);
    this.savedAt.set(null);
    this.savedSnapshot.set(this.snapshot());
    this.scaleMessage.set(null);
    this.inPounds.set(false);
    this.saveProblem.set('');
    this.checks.clear();
    this.swapUndo.set(null);
    this.beforeSwap.set(null);
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    this.suggestProblem.set('');
    this.batchOpen.set(false);
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
    const wanted = name.trim().toLowerCase();
    const records = [
      ...this.standardAdditives(),
      ...this.myAdditives(),
      ...this.standardMaterials(),
      ...this.myMaterials()
    ];
    return records.find(
      (record) =>
        record.name.toLowerCase() === wanted || (record.aliases ?? []).some((alias) => alias.toLowerCase() === wanted)
    );
  }

  // The saved list.

  /** A saved recipe's notes; "None." is saved for a recipe with none. */
  protected savedNotes(recipe: Recipe): string {
    const notes = firstOf(recipe.notes);
    return notes === 'None.' ? translate('recipe.page.noNotes') : notes;
  }

  protected toggleExpanded(recipe: Recipe): void {
    const id = recipe._id ?? '';
    this.expanded.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

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
   * A list that can be asked for again keeps whether it failed, and says so once.
   */
  private async load<T>(
    request: Promise<T[]>,
    target: { set(value: T[]): void },
    failure: string,
    failed?: WritableSignal<boolean>
  ): Promise<void> {
    try {
      target.set(await request);
      failed?.set(false);
    } catch {
      if (!failed?.()) this.notices.error(translate(failure));
      failed?.set(true);
    }
  }

  private focusAmount(kind: 'material' | 'additive', index: number): void {
    afterNextRender(() => document.getElementById(kind + '-amount-' + index)?.focus(), { injector: this.injector });
  }

  private focusTitle(): void {
    afterNextRender(() => document.getElementById('recipe-name')?.focus(), { injector: this.injector });
  }
}
