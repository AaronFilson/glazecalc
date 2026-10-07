import { DatePipe } from '@angular/common';
import { Component, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialInput, RecipeLine, calculateUMF, materialWeights } from '../../../../lib/chemistry';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Additive, AdditiveUnit, Material, Recipe, RecipeAnalysis, RecipeMaterial } from '../../core/models';
import { Busy } from '../../shared/busy';
import { localDate } from '../../shared/dates';
import { Notices, NoticesList } from '../../shared/notices';
import { firstOf } from '../../shared/options';
import { PageHeader } from '../../shared/page-header';
import { Removal, RemoveButton } from '../../shared/remove-button';
import { Rebase, amountOf, formatAmount, isAmount, rebase, totalOf, unitOf } from './rebase';
import { RecipeHelp } from './recipe-help';
import { RecipeLibrary, libraryKey } from './recipe-library';
import { UnityFormula, silicaAluminaRatio, unityColumns } from './unity-formula';

/** Recipes saved by mongoose hold the analysis in a one-element array. */
export function savedAnalysis(recipe: Recipe): RecipeAnalysis | null {
  const computed = Array.isArray(recipe.computed) ? recipe.computed[0] : recipe.computed;
  return computed && computed.uList ? computed : null;
}

export interface Evaluation {
  analysis: RecipeAnalysis | null;
  /** Why there is no unity formula, such as a recipe with no flux. */
  problem: string | null;
  warnings: string[];
}

export interface EvaluateOptions {
  /** Count the colorants and additives in the unity formula too. */
  includeAdditives?: boolean;
  /** The chemistry an additive borrows by name, as Veegum borrows bentonite's. */
  chemistryOf?: (name: string) => MaterialInput | undefined;
}

/** Whether the unity formula can read a material's or additive's chemistry. */
function hasChemistry(record: MaterialInput): boolean {
  try {
    materialWeights(record);
    return true;
  } catch {
    return false;
  }
}

/**
 * The unity formula of a recipe. Blank amounts count as 0. Additives are left
 * out unless they are included; then each counts at its weight in the base's
 * unit: a percent of the base's total, or its parts or grams as they are.
 * Stains and other additives with no chemistry add nothing, and an additive
 * whose analysis the unity formula cannot read is left out, with a warning.
 */
export function evaluate(
  materials: RecipeMaterial[],
  additives: Additive[] = [],
  options: EvaluateOptions = {}
): Evaluation {
  if (!materials.some((m) => amountOf(m.amount) > 0 || (m.amount ?? '').trim() !== '')) {
    return { analysis: null, problem: null, warnings: [] };
  }
  const lines: RecipeLine[] = materials.map((material) => ({ material, amount: material.amount ?? '' }));
  const leftOut: string[] = [];
  if (options.includeAdditives) {
    const baseTotal = totalOf(materials.map((m) => m.amount));
    for (const additive of additives) {
      const amount = amountOf(additive.amount);
      if (!amount || additive.noChemistry) continue;
      const chemistry = additive.chemistryOf ? options.chemistryOf?.(additive.chemistryOf) : additive;
      if (!chemistry || !hasChemistry(chemistry)) {
        leftOut.push(additive.name + ' has no oxide analysis the unity formula can use, so it is left out.');
        continue;
      }
      const weight = unitOf(additive) === 'percent' ? (amount * baseTotal) / 100 : amount;
      lines.push({ material: { ...chemistry, name: additive.name }, amount: weight });
    }
  }
  try {
    const result = calculateUMF(lines);
    // uList is the key saved recipes and older versions of the app use.
    return { analysis: { ...result, uList: result.umf }, problem: null, warnings: [...result.warnings, ...leftOut] };
  } catch (e) {
    return { analysis: null, problem: (e as Error).message, warnings: [] };
  }
}

const INCLUDE_KEY = 'includeAdditives';

/** Whether new recipes count their additives: the choice made last on this browser. */
const includeByDefault = (): boolean => {
  try {
    return localStorage.getItem(INCLUDE_KEY) === 'yes';
  } catch {
    return false;
  }
};

/** A colorant's amount with its unit: 2%, 3 parts, 5 g. */
export function additiveAmount(additive: Additive): string {
  const amount = (additive.amount ?? '').trim();
  if (!amount) return '';
  const unit = unitOf(additive);
  if (unit === 'percent') return amount + '%';
  if (unit === 'grams') return amount + ' g';
  return amount + (amount === '1' ? ' part' : ' parts');
}

const ADDITIVE_UNITS: ReadonlyArray<{ value: AdditiveUnit; label: string }> = [
  { value: 'percent', label: '% of base' },
  { value: 'parts', label: 'parts' },
  { value: 'grams', label: 'grams' }
];

const copy = <T>(value: T): T => structuredClone(value);
const SCALE_NOTES: Record<Rebase['to'], string> = {
  percent: 'Now in percent: the materials add up to 100.',
  parts: 'Now in parts: whole numbers where they fit.',
  batch: 'Now in grams for the batch.'
};

type SaveMode = 'save' | 'next' | 'copy';

interface Saved {
  title: string;
  /** The page still shows this recipe: nothing cleared it or opened another meanwhile. */
  stillOpen: boolean;
  /** It was changed while it saved, so the page has changes that are not saved. */
  changedSince: boolean;
}

/** Waiting on a decision about unsaved changes, before starting a new recipe or opening another. */
interface PendingLeave {
  next: () => void;
  /** The saved recipe it would open. */
  recipeId?: string;
  /** What had the focus, to go back to on Keep editing. */
  from: HTMLElement | null;
}

@Component({
  selector: 'gc-recipe-page',
  imports: [DatePipe, FormsModule, NoticesList, PageHeader, RecipeHelp, RecipeLibrary, RemoveButton, UnityFormula],
  templateUrl: './recipe-page.html'
})
export class RecipePage implements OnInit {
  private readonly resources = inject(ApiResourceFactory);
  private readonly injector = inject(Injector);
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
  protected readonly pendingLeave = signal<PendingLeave | null>(null);
  /** Why the last save did not happen, shown beside the save buttons. */
  protected readonly saveProblem = signal('');
  /**
   * Which recipe the page shows: a new number each time it is cleared or
   * another is opened. A save that comes back after that is not this page's.
   */
  private showing = 0;

  // Scale changes.
  protected readonly batchOpen = signal(false);
  protected readonly batchGrams = signal('500');
  protected readonly scaleMessage = signal<{ text: string; problem: boolean } | null>(null);
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
      column.oxides.map((oxide) => oxide.label + ' ' + oxide.value.toFixed(3))
    );
    const ratio = silicaAluminaRatio(analysis);
    return [...oxides, ...(ratio === null ? [] : ['Si:Al ' + ratio.toFixed(2)])].join(' · ');
  });
  protected readonly materialKeys = computed(() => new Set(this.lines().map(libraryKey)));
  protected readonly additiveKeys = computed(() => new Set(this.additiveLines().map(libraryKey)));
  protected readonly status = computed(() => {
    if (this.saving.active()) return 'Saving...';
    if (this.savedId()) {
      if (this.dirty()) return 'Changes not saved yet';
      const at = this.savedAt();
      return at ? 'Saved at ' + at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Saved';
    }
    return this.hasContent() ? 'Not saved yet' : '';
  });

  ngOnInit(): void {
    void this.load(this.materials.getAll(), this.myMaterials, 'There was an error in getting your materials.');
    void this.load(
      this.materials.getStandard(),
      this.standardMaterials,
      'There was an error in getting the standard materials.'
    );
    void this.load(this.additives.getAll(), this.myAdditives, 'There was an error in getting your additives.');
    void this.load(
      this.additives.getStandard(),
      this.standardAdditives,
      'There was an error in getting the standard additives.'
    );
    void this.load(this.recipes.getAll(), this.myRecipes, 'There was an error in getting your recipes.');
  }

  // Materials and additives.

  protected addMaterial(material: Material): void {
    this.lines.update((list) => [...list, { ...copy(material), amount: '' }]);
    this.scaleMessage.set(null);
    this.focusAmount('material', this.lines().length - 1);
  }

  protected setAmount(index: number, amount: string): void {
    this.lines.update((list) => list.map((line, i) => (i === index ? { ...line, amount } : line)));
    this.scaleMessage.set(null);
  }

  protected removeMaterial(index: number): void {
    const name = this.lines()[index]?.name;
    this.lines.update((list) => list.filter((_, i) => i !== index));
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
    this.afterTakingOut('additive', name, index, this.additiveLines().length);
  }

  /**
   * Says what was taken out, and keeps the focus in the list: on the ✕ now in
   * the same place, or the one before, or the list's heading once it is empty.
   */
  private afterTakingOut(kind: 'material' | 'additive', name: string | undefined, index: number, left: number): void {
    this.announcement.set((name ?? 'It') + ' taken out of the recipe.');
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
    return total && amountOf(amount) ? formatAmount((amountOf(amount) / total) * 100, 1) + '%' : '';
  }

  protected formatTotal(): string {
    return formatAmount(this.total(), 3);
  }

  protected scale(how: Rebase): void {
    // Scaling around an amount it cannot read would change the proportions.
    const unreadable = this.unreadableLine();
    if (unreadable) {
      this.scaleMessage.set({
        text: `The amount for ${unreadable.name} is not a number ("${unreadable.amount}"). Please fix it first.`,
        problem: true
      });
      return;
    }
    const result = rebase(
      this.lines().map((l) => l.amount),
      this.additiveLines(),
      how
    );
    if (!result) {
      const text =
        how.to === 'batch' ? 'Please enter the weight of the batch, in grams.' : 'Please enter the amounts first.';
      this.scaleMessage.set({ text, problem: true });
      return;
    }
    this.lines.update((list) => list.map((line, i) => ({ ...line, amount: result.materials[i] })));
    this.additiveLines.update((list) => list.map((line, i) => ({ ...line, amount: result.additives[i] })));
    this.batchOpen.set(false);
    this.scaleMessage.set({ text: SCALE_NOTES[how.to], problem: false });
  }

  protected scaleToBatch(): void {
    this.scale({ to: 'batch', grams: amountOf(this.batchGrams()) });
  }

  // Saving.

  protected save(): Promise<void> {
    return this.saving.run(async () => {
      const saved = await this.saveAs('save');
      if (saved) this.notices.success(`Saved "${saved.title}".`, 'save');
    });
  }

  /** Saves, then clears the page for the next recipe. */
  protected saveAndNext(): Promise<void> {
    return this.saving.run(async () => {
      const saved = await this.saveAs('next');
      if (!saved) return;
      // Nothing is cleared that is not saved: changes made while it saved, or another recipe opened meanwhile.
      if (!saved.stillOpen || saved.changedSince) {
        this.notices.success(`Saved "${saved.title}".`, 'save');
        return;
      }
      this.reset();
      this.notices.success(`Saved "${saved.title}". Ready for the next recipe.`, 'save');
      this.focusTitle();
    });
  }

  /** Saves the changes as a new recipe, leaving the one opened as it was. */
  protected saveAsCopy(): Promise<void> {
    return this.saving.run(async () => {
      const saved = await this.saveAs('copy');
      if (saved) this.notices.success(`Saved as a new recipe: "${saved.title}".`, 'save');
    });
  }

  private async saveAs(mode: SaveMode): Promise<Saved | null> {
    this.saveProblem.set('');
    const problem = this.problemBeforeSave();
    if (problem) {
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
        this.savedId.set(savedId);
        // Changes made while it saved are not in it, so they still count as not saved.
        this.savedSnapshot.set(sent);
        this.savedAt.set(new Date());
      }
      return { title: recipe.title, stillOpen, changedSince: this.snapshot() !== sent };
    } catch (err) {
      const message = errorMessage(err, 'It could not be saved. Please try again.');
      if (showing === this.showing) this.saveProblem.set(message);
      else this.notices.error(`"${recipe.title}" was not saved: ${message}`);
      return null;
    }
  }

  /** What stops this recipe being saved, if anything. */
  private problemBeforeSave(): string | null {
    if (!this.title().trim()) return 'Please give the recipe a title.';
    if (!this.lines().length) return 'Please add at least one material.';
    const blank = [...this.lines(), ...this.additiveLines()].find((line) => (line.amount ?? '').trim() === '');
    if (blank) return 'Please enter an amount for ' + blank.name + ' (0 is fine).';
    const unreadable = this.unreadableLine();
    if (unreadable) {
      return `The amount for ${unreadable.name} is not a number ("${unreadable.amount}"). Use a point for decimals, such as 12.5.`;
    }
    const { analysis, problem } = this.evaluation();
    if (!analysis) return 'Not saved: ' + (problem ?? 'the unity formula could not be worked out.');
    return null;
  }

  /** The first material or colorant whose amount is not blank and not a number of 0 or more. */
  private unreadableLine(): Additive | RecipeMaterial | undefined {
    return [...this.lines(), ...this.additiveLines()].find((line) => !isAmount(line.amount));
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
    this.leave(() => {
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
      this.saveProblem.set('');
      this.focusTitle();
    }, recipe._id);
  }

  /**
   * Does `next` now, or asks first when there are unsaved changes: the
   * question shows at the top of the editor, starting on Keep editing.
   */
  private leave(next: () => void, recipeId?: string): void {
    if (!(this.dirty() && this.hasContent())) {
      next();
      return;
    }
    const from = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.pendingLeave.set({ next, recipeId, from });
    afterNextRender(() => document.getElementById('unsaved-keep')?.focus(), { injector: this.injector });
  }

  protected discardAndLeave(): void {
    const pending = this.pendingLeave();
    this.pendingLeave.set(null);
    pending?.next();
  }

  protected keepEditing(): void {
    const from = this.pendingLeave()?.from;
    this.pendingLeave.set(null);
    afterNextRender(() => (from?.isConnected ? from : document.getElementById('recipe-name'))?.focus(), {
      injector: this.injector
    });
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
    this.saveProblem.set('');
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
  }

  private async load<T>(request: Promise<T[]>, target: { set(value: T[]): void }, failure: string): Promise<void> {
    try {
      target.set(await request);
    } catch {
      this.notices.error(failure);
    }
  }

  private focusAmount(kind: 'material' | 'additive', index: number): void {
    afterNextRender(() => document.getElementById(kind + '-amount-' + index)?.focus(), { injector: this.injector });
  }

  private focusTitle(): void {
    afterNextRender(() => document.getElementById('recipe-name')?.focus(), { injector: this.injector });
  }
}
