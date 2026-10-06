import { DatePipe } from '@angular/common';
import { Component, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { calculateUMF } from '../../../../lib/chemistry';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Additive, Material, Recipe, RecipeAnalysis, RecipeMaterial } from '../../core/models';
import { Busy } from '../../shared/busy';
import { localDate } from '../../shared/dates';
import { Notices, NoticesList } from '../../shared/notices';
import { firstOf } from '../../shared/options';
import { PageHeader } from '../../shared/page-header';
import { Rebase, amountOf, formatAmount, rebase, totalOf } from './rebase';
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

/** The unity formula of the materials; additives are not part of it. Blank amounts count as 0. */
export function evaluate(materials: RecipeMaterial[]): Evaluation {
  if (!materials.some((m) => amountOf(m.amount) > 0 || (m.amount ?? '').trim() !== '')) {
    return { analysis: null, problem: null, warnings: [] };
  }
  try {
    const result = calculateUMF(materials.map((material) => ({ material, amount: material.amount ?? '' })));
    // uList is the key saved recipes and older versions of the app use.
    return { analysis: { ...result, uList: result.umf }, problem: null, warnings: result.warnings };
  } catch (e) {
    return { analysis: null, problem: (e as Error).message, warnings: [] };
  }
}

const copy = <T>(value: T): T => structuredClone(value);
const SCALE_NOTES: Record<Rebase['to'], string> = {
  percent: 'Now in percent: the materials add up to 100.',
  parts: 'Now in parts: whole numbers where they fit.',
  batch: 'Now in grams for the batch.'
};

type SaveMode = 'save' | 'next' | 'copy';

@Component({
  selector: 'gc-recipe-page',
  imports: [DatePipe, FormsModule, NoticesList, PageHeader, RecipeHelp, RecipeLibrary, UnityFormula],
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
  protected readonly showRemove = signal(false);

  // Saving: the saved recipe this is (if any), and whether it has changed since.
  protected readonly savedId = signal<string | null>(null);
  protected readonly savedAt = signal<Date | null>(null);
  private readonly snapshot = computed(() =>
    JSON.stringify({
      title: this.title(),
      date: this.date(),
      notes: this.notes(),
      materials: this.lines().map((l) => [libraryKey(l), l.amount ?? '']),
      additives: this.additiveLines().map((a) => [libraryKey(a), a.amount ?? ''])
    })
  );
  private readonly savedSnapshot = signal(this.snapshot());
  protected readonly dirty = computed(() => this.snapshot() !== this.savedSnapshot());
  protected readonly hasContent = computed(
    () => !!(this.title() || this.notes() || this.lines().length || this.additiveLines().length)
  );
  /** Something waiting on a decision about unsaved changes (start new, or open another). */
  protected readonly pendingLeave = signal<(() => void) | null>(null);

  // Scale changes.
  protected readonly batchOpen = signal(false);
  protected readonly batchGrams = signal('500');
  protected readonly scaleNote = signal('');

  protected readonly evaluation = computed(() => evaluate(this.lines()));
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
    this.scaleNote.set('');
    this.focusAmount('material', this.lines().length - 1);
  }

  protected setAmount(index: number, amount: string): void {
    this.lines.update((list) => list.map((line, i) => (i === index ? { ...line, amount } : line)));
    this.scaleNote.set('');
  }

  protected removeMaterial(index: number): void {
    this.lines.update((list) => list.filter((_, i) => i !== index));
  }

  protected addAdditive(additive: Additive): void {
    this.additiveLines.update((list) => [...list, { ...copy(additive), amount: '' }]);
    this.focusAmount('additive', this.additiveLines().length - 1);
  }

  protected setAdditiveAmount(index: number, amount: string): void {
    this.additiveLines.update((list) => list.map((line, i) => (i === index ? { ...line, amount } : line)));
  }

  protected removeAdditive(index: number): void {
    this.additiveLines.update((list) => list.filter((_, i) => i !== index));
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
    const result = rebase(
      this.lines().map((l) => l.amount),
      this.additiveLines().map((a) => a.amount),
      how
    );
    if (!result) {
      this.notices.error(
        how.to === 'batch' ? 'Please enter the weight of the batch.' : 'Please enter the amounts first.'
      );
      return;
    }
    this.lines.update((list) => list.map((line, i) => ({ ...line, amount: result.materials[i] })));
    this.additiveLines.update((list) => list.map((line, i) => ({ ...line, amount: result.additives[i] })));
    this.batchOpen.set(false);
    this.scaleNote.set(SCALE_NOTES[how.to]);
  }

  protected scaleToBatch(): void {
    this.scale({ to: 'batch', grams: amountOf(this.batchGrams()) });
  }

  // Saving.

  protected save(): Promise<void> {
    return this.saving.run(async () => {
      if (await this.saveAs('save')) this.notices.success('Saved "' + this.title() + '".');
    });
  }

  /** Saves, then clears the page for the next recipe. */
  protected saveAndNext(): Promise<void> {
    return this.saving.run(async () => {
      const title = this.title();
      if (!(await this.saveAs('next'))) return;
      this.reset();
      this.notices.success('Saved "' + title + '". Ready for the next recipe.');
      this.focusTitle();
    });
  }

  /** Saves the changes as a new recipe, leaving the one opened as it was. */
  protected saveAsCopy(): Promise<void> {
    return this.saving.run(async () => {
      if (await this.saveAs('copy')) this.notices.success('Saved as a new recipe: "' + this.title() + '".');
    });
  }

  private async saveAs(mode: SaveMode): Promise<boolean> {
    // Only the outcome of this save shows, not a pile of earlier ones.
    this.notices.clear();
    const problem = this.problemBeforeSave();
    if (problem) {
      this.notices.error(problem);
      return false;
    }
    const analysis = this.evaluation().analysis!;
    if (!this.date()) this.date.set(localDate());
    const recipe: Recipe = {
      title: this.title(),
      date: this.date(),
      notes: this.notes() || 'None.',
      materials: this.lines(),
      additives: this.additiveLines(),
      computed: analysis
    };
    const id = mode === 'copy' ? null : this.savedId();
    try {
      if (id) {
        await this.recipes.change(id, { recipe });
        this.myRecipes.update((list) => list.map((r) => (r._id === id ? { ...r, ...recipe } : r)));
      } else {
        const saved = await this.recipes.create(recipe);
        this.myRecipes.update((list) => [...list, saved]);
        this.savedId.set(saved._id ?? null);
      }
      this.savedSnapshot.set(this.snapshot());
      this.savedAt.set(new Date());
      return true;
    } catch (err) {
      this.notices.error(errorMessage(err, 'Error: the request to the server failed.'));
      return false;
    }
  }

  /** What stops this recipe being saved, if anything. */
  private problemBeforeSave(): string | null {
    if (!this.title().trim()) return 'Please give the recipe a title.';
    if (!this.lines().length) return 'Please add at least one material.';
    const blank = [...this.lines(), ...this.additiveLines()].find((line) => (line.amount ?? '').trim() === '');
    if (blank) return 'Please enter an amount for ' + blank.name + ' (0 is fine).';
    const { analysis, problem } = this.evaluation();
    if (!analysis) return 'Error: ' + (problem ?? 'the unity formula could not be worked out.');
    return null;
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
      const notes = firstOf(recipe.notes);
      this.title.set(recipe.title);
      this.date.set(recipe.date ?? '');
      this.notes.set(notes === 'None.' ? '' : notes);
      this.lines.set(copy(recipe.materials ?? []));
      this.additiveLines.set(copy(recipe.additives ?? []));
      this.savedId.set(recipe._id ?? null);
      this.savedSnapshot.set(this.snapshot());
      this.savedAt.set(null);
      this.scaleNote.set('');
      this.notices.clear();
      this.focusTitle();
    });
  }

  /** Does `next` now, or after the user agrees to drop unsaved changes. */
  private leave(next: () => void): void {
    if (this.dirty() && this.hasContent()) this.pendingLeave.set(next);
    else next();
  }

  protected discardAndLeave(): void {
    const next = this.pendingLeave();
    this.pendingLeave.set(null);
    next?.();
  }

  private reset(): void {
    this.title.set('');
    this.date.set('');
    this.notes.set('');
    this.lines.set([]);
    this.additiveLines.set([]);
    this.savedId.set(null);
    this.savedAt.set(null);
    this.savedSnapshot.set(this.snapshot());
    this.scaleNote.set('');
    this.batchOpen.set(false);
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
    try {
      await this.recipes.remove(recipe);
      this.myRecipes.update((list) => list.filter((r) => r !== recipe));
      // The recipe on the page stays, but as one not saved yet.
      if (recipe._id && recipe._id === this.savedId()) {
        this.savedId.set(null);
        this.savedSnapshot.set('');
      }
      this.notices.success('Success in removing the recipe from the server.');
    } catch {
      this.notices.error('Error in deleting the recipe from the server.');
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
