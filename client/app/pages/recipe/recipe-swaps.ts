import { Injector, Signal, WritableSignal, afterNextRender, computed, inject, signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { CONES } from '../../../../lib/chemistry';
import { FiringBlock, firingBands } from '../../../../lib/cones/firing';
import { FiringBand, LIMIT_SETS, bandOf } from '../../../../lib/recipe/limits';
import { LocaleService } from '../../core/locale.service';
import { Additive, Material, Recipe, RecipeMaterial } from '../../core/models';
import { ShelfService } from '../../core/shelf.service';
import { formatTemperature, listOf } from '../../shared/format';
import { chosenRegion, findNamed, hasLead } from '../../shared/library-info';
import { LibraryMaterial, modernMaterials } from './compare';
import { focusWhenDrawn } from './focus';
import { BaseChoice, LeadMode, leadFreeBases, leadIn, recipeHasLead, replaceLead } from './lead';
import { TryMaterial } from './pool';
import { libraryKey } from './recipe-library';
import { matchFromShelf } from './shelf';
import { Plan, planSuggestion, suggestAmounts } from './suggest';
// Types apart from the report, which the page and its parts defer (@defer), so its file can be left out until needed.
import type { Run, SwapResult } from './swap-report';

// Swapping a recipe's materials (docs/adr/0010, 0011 and 0012): Try modern materials one for one, Suggest
// amounts for a swap that is not like for like, Replace lead, and Match with what I have; each makes a new
// recipe the page compares with the old, which the swap's report can work out again and Undo puts back.
// The questions each asks, and the working out, are here; the page (recipe-page.ts) holds the recipe.

/** What Undo the swap puts back: the recipe as it was, and whether (and as what) it was saved. */
export interface SwapUndo {
  recipe: Recipe;
  savedId: string | null;
  savedSnapshot: string;
  savedAt: Date | null;
  /** How Suggest amounts or Replace lead made it, to show and to work out again. */
  result?: SwapResult;
}

/** What a swap makes of the recipe, for its new title: "Celadon with modern materials". */
export type SwapKind = 'modern' | 'lead' | 'shelf';

/** The recipe page, as the swaps work on it: its recipe, the lists to choose from, and how it takes a swap. */
export interface SwapPage {
  readonly lines: Signal<RecipeMaterial[]>;
  readonly additiveLines: Signal<Additive[]>;
  /** The firing band for the limits, which a recipe rebuilt without lead takes from its cone when it has none. */
  readonly firing: WritableSignal<FiringBand | ''>;
  readonly firedAt: Signal<FiringBlock | null>;
  readonly myMaterials: Signal<Material[]>;
  readonly standardMaterials: Signal<Material[]>;
  readonly standardAdditives: Signal<Additive[]>;
  /** Lead is off in Settings: materials with lead are not suggested. */
  readonly leadOff: Signal<boolean>;
  /** What Undo the swap puts back, while there is one. */
  readonly undo: Signal<SwapUndo | null>;
  /** Why an amount stops a swap: the first that is not a number, said; '' when each is one. */
  unreadable(): string;
  /** Puts the swapped materials in as a new recipe, keeping the one before for Undo, and compares the two. */
  swapIn(
    materials: RecipeMaterial[],
    note: string,
    announcement: string,
    opener: string,
    kind: SwapKind,
    result?: SwapResult,
    compare?: boolean
  ): void;
  /** Puts the recipe back as it was before a swap. */
  restore(undo: SwapUndo): void;
  /** Tells a screen reader what was done. */
  announce(text: string): void;
  focusTitle(): void;
}

export class RecipeSwaps {
  private readonly injector = inject(Injector);
  private readonly shelf = inject(ShelfService);
  private readonly locale = inject(LocaleService);

  constructor(private readonly page: SwapPage) {}

  readonly hasLines = computed(() => this.page.lines().length > 0);
  /** Materials that are no longer current, with what the library says replaces them. */
  readonly modern = computed(() =>
    modernMaterials(this.page.lines(), (name) => this.findMaterial(name), chosenRegion(), {
      allowLead: !this.page.leadOff(),
      findAdditive: (name) => findNamed(this.page.standardAdditives(), name)
    })
  );
  /** Whether a swap needs its amounts worked out again, so Suggest amounts is offered. */
  readonly notLikeForLike = computed(() => this.modern().swaps.some((swap) => !swap.like));
  /** Why Suggest amounts, Replace lead, the match or working one out again did not go on, or ''. */
  readonly problem = signal('');
  /** Suggest amounts' question: for each oxide a swap leaves short, what brings it back ('' leaves it out). */
  readonly suggestQuestion = signal<{ plan: Plan; chosen: Record<string, string> } | null>(null);
  /** Materials to try, added in Suggest amounts' or Replace lead's question. */
  readonly suggestTries = signal<TryMaterial[]>([]);
  readonly leadTries = signal<TryMaterial[]>([]);
  readonly tryingMore = signal(false);

  // Match with what I have: the recipe made again from only the materials on hand.
  readonly shelfOpen = signal(false);
  readonly shelfTries = signal<TryMaterial[]>([]);
  readonly shelfLoaded = computed(() => this.shelf.keys() !== null);
  readonly shelfProblem = this.shelf.problem;
  /** How many on hand have lead, left out while lead is off. */
  readonly shelfLeadHidden = computed(() =>
    this.page.leadOff()
      ? (this.shelf.keys() ?? []).filter((key) => {
          const material = this.libraryMaterial(key);
          return !!material && hasLead(material);
        }).length
      : 0
  );
  readonly shelfStatus = signal('');

  // Replace lead: the recipe without lead, rebuilt or with its colour carried onto a lead-free base.
  readonly cones = CONES;
  /**
   * Firing to Orton cones (Settings). A recipe's cone is an Orton number, and none is turned into an SK number,
   * so a potter who fires to SK cones sees the temperature.
   */
  readonly byCones = computed(() => this.locale.cones() === 'orton');
  readonly leadAmount = computed(() => (recipeHasLead(this.page.lines()) ? leadIn(this.page.lines()) : null));
  readonly leadQuestion = signal<{
    cone: string;
    mode: LeadMode;
    bases: BaseChoice[];
    base: string;
  } | null>(null);

  /** What Undo the swap puts back, while there is one. */
  readonly undo = computed(() => this.page.undo());
  /** How the last swap was made, while Undo can put it back. */
  readonly result = computed(() => this.page.undo()?.result ?? null);
  /** The materials of the recipe as it was and as it is, marked in the lists to try. */
  readonly keys = computed(
    () => new Set([...(this.page.undo()?.recipe.materials ?? []).map(libraryKey), ...this.page.lines().map(libraryKey)])
  );
  /** What the workbench's "Fix and swap" fold has to offer: modern swaps, lead to replace, a swap to undo. */
  readonly fixCount = computed(
    () =>
      (this.hasLines() ? this.modern().swaps.length + this.modern().colorants.length : 0) +
      (this.leadAmount() ? 1 : 0) +
      (this.page.undo() ? 1 : 0)
  );

  /** A firing as the potter names it: "04 (1060 °C)" to cones, or "1060 °C" by temperature. */
  firingLabel(firing: { cone: string; celsius: number }): string {
    const temperature = formatTemperature(firing.celsius, this.locale.temperature());
    return this.byCones() ? `${firing.cone} (${temperature})` : temperature;
  }

  /** The recipe changed: the questions about it are closed. */
  closeQuestions(): void {
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
  }

  /** Another recipe is on the page: the questions are closed, and what stopped one is said no more. */
  clear(): void {
    this.closeQuestions();
    this.problem.set('');
  }

  /**
   * Swaps each material that is no longer current for what replaces it, one for
   * one, as a new recipe (the one opened stays as it was), and compares the two.
   */
  tryModernMaterials(): void {
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
  suggestModernAmounts(): void {
    this.problem.set('');
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    const unreadable = this.page.unreadable();
    if (unreadable) {
      this.problem.set(unreadable);
      return;
    }
    let plan: Plan;
    try {
      plan = planSuggestion(
        this.page.lines(),
        (name) => this.findMaterial(name),
        this.page.standardMaterials(),
        chosenRegion(),
        { allowLead: !this.page.leadOff() }
      );
    } catch {
      this.problem.set(translate('recipe.page.cannotSuggest'));
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

  chooseBringIn(oxide: string, name: string): void {
    this.suggestQuestion.update((question) =>
      question ? { ...question, chosen: { ...question.chosen, [oxide]: name } } : question
    );
  }

  cancelSuggestion(): void {
    this.closeQuestions();
    afterNextRender(() => document.getElementById('suggest-amounts')?.focus(), { injector: this.injector });
  }

  /** Works the amounts out with what was chosen to bring short oxides back, and compares. */
  workOutSuggestion(): void {
    const chosen = Object.values(this.suggestQuestion()?.chosen ?? {}).filter(Boolean);
    const bringIn = [...new Set(chosen)]
      .map((name) => this.page.standardMaterials().find((material) => material.name === name))
      .filter((material): material is Material => !!material);
    const run = { ...this.runOf('suggest'), bringIn, tries: this.suggestTries() };
    this.closeQuestions();
    this.applySuggestion(run);
  }

  /** Replace lead: asks the firing, how, and which lead-free frit to build on. */
  askReplaceLead(): void {
    this.closeQuestions();
    const cone = '04';
    let bases: BaseChoice[];
    try {
      bases = this.basesFor(cone);
    } catch {
      this.problem.set(translate('recipe.page.cannotReplaceLead'));
      return;
    }
    this.leadTries.set([]);
    this.tryingMore.set(false);
    this.leadQuestion.set({ cone, mode: 'rebuild', bases, base: bases[0]?.name ?? '' });
    afterNextRender(() => document.getElementById('lead-heading')?.focus(), { injector: this.injector });
  }

  /** A different firing sets different boron, so the frits are ranked again. */
  chooseCone(cone: string): void {
    const question = this.leadQuestion();
    if (!question) return;
    const bases = this.basesFor(cone, question.mode);
    const base = bases.some((b) => b.name === question.base) ? question.base : (bases[0]?.name ?? '');
    this.leadQuestion.set({ ...question, cone, bases, base });
  }

  /** Rebuilding and keeping the colour rank the frits differently. */
  chooseLeadMode(mode: LeadMode): void {
    const question = this.leadQuestion();
    if (!question) return;
    const bases = this.basesFor(question.cone, mode);
    const base = bases.some((b) => b.name === question.base) ? question.base : (bases[0]?.name ?? '');
    this.leadQuestion.set({ ...question, mode, bases, base });
  }

  chooseLeadBase(base: string): void {
    this.leadQuestion.update((question) => (question ? { ...question, base } : question));
  }

  cancelReplaceLead(): void {
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    afterNextRender(() => document.getElementById('replace-lead')?.focus(), { injector: this.injector });
  }

  /** Replaces the lead as chosen, as a new recipe compared with the old one. */
  workOutReplaceLead(): void {
    const question = this.leadQuestion();
    if (!question?.base) return;
    const { cone, mode, base } = question;
    const run: Run = { ...this.runOf('lead'), cone, mode, base, tries: mode === 'rebuild' ? this.leadTries() : [] };
    this.leadQuestion.set(null);
    this.shelfOpen.set(false);
    this.applyLead(run);
  }

  /** Match with what I have: shows the materials on hand, fetched from the account. */
  async askShelf(): Promise<void> {
    if (this.shelfOpen()) return this.closeShelf();
    this.suggestQuestion.set(null);
    this.leadQuestion.set(null);
    this.problem.set('');
    this.shelfStatus.set('');
    this.shelfOpen.set(true);
    afterNextRender(() => document.getElementById('shelf-heading')?.focus(), { injector: this.injector });
    await this.loadShelf();
  }

  /** Fetches the materials on hand (again, after a fetch that failed), and lists those this page can use. */
  async loadShelf(): Promise<void> {
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

  closeShelf(): void {
    this.shelfOpen.set(false);
    afterNextRender(() => document.getElementById('match-shelf')?.focus(), { injector: this.injector });
  }

  /**
   * A change to the materials on hand, saved with the account at once. Those
   * not listed here (not loaded, or with lead while lead is off) stay on it.
   */
  async changeShelf(tries: TryMaterial[]): Promise<void> {
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
  addRecipeToShelf(): void {
    const have = new Set(this.shelfTries().map((tried) => tried.material.name));
    const adding = this.page
      .lines()
      .map((line) => this.findMaterial(line.name))
      .filter((material): material is LibraryMaterial => !!material && !have.has(material.name))
      .filter((material, i, list) => list.findIndex((other) => other.name === material.name) === i)
      .filter((material) => !(this.page.leadOff() && hasLead(material)));
    void this.changeShelf([...this.shelfTries(), ...adding.map((material) => ({ material, must: false }))]);
  }

  /** Makes the recipe again from what is on hand, as a new recipe compared with the old one. */
  matchShelf(): void {
    if (!this.shelfTries().length) return;
    const unreadable = this.page.unreadable();
    if (unreadable) {
      this.problem.set(unreadable);
      return;
    }
    const run: Run = { ...this.runOf('shelf'), tries: this.shelfTries() };
    try {
      this.applyShelf(run);
    } catch {
      this.problem.set(translate('recipe.page.cannotMatch'));
      return;
    }
    this.shelfOpen.set(false);
  }

  /**
   * Works the substitution out again from the recipe as it was, with a change
   * from its report: a material left out or added, or a cap lifted.
   */
  rerun(change: Partial<Run>): void {
    const undo = this.page.undo();
    if (!undo?.result) return;
    const run = { ...undo.result.run, ...change };
    this.page.restore(undo);
    try {
      if (run.kind === 'suggest') this.applySuggestion(run, false);
      else if (run.kind === 'shelf') this.applyShelf(run, false);
      else this.applyLead(run, false);
    } catch {
      this.problem.set(translate('recipe.page.cannotRerun'));
      return;
    }
    focusWhenDrawn(this.injector, 'swap-report-heading', 'swap-report-heading', null);
  }

  /** Puts the recipe back as it was before Try modern materials. */
  undoSwap(): void {
    const undo = this.page.undo();
    if (!undo) return;
    this.page.restore(undo);
    this.closeQuestions();
    this.page.announce(translate('recipe.page.swapUndone'));
    this.page.focusTitle();
  }

  /** A run with nothing chosen yet. */
  private runOf(kind: Run['kind']): Run {
    return { kind, bringIn: [], tries: [], avoid: [], uncapped: [], cone: '', mode: 'rebuild', base: '' };
  }

  private applySuggestion(run: Run, compare = true): void {
    const { swaps } = this.modern();
    const suggestion = suggestAmounts(
      this.page.lines(),
      (name) => this.findMaterial(name),
      run.bringIn,
      chosenRegion(),
      {
        allowLead: !this.page.leadOff(),
        tries: run.tries,
        avoid: run.avoid,
        additives: this.page.additiveLines(),
        uncapped: run.uncapped
      }
    );
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
      this.page.lines(),
      this.page.additiveLines(),
      (name) => this.findMaterial(name),
      this.page.standardMaterials(),
      chosenRegion(),
      this.celsiusOf(cone),
      mode
    );
  }

  private applyLead(run: Run, compare = true): void {
    const replacement = replaceLead(
      this.page.lines(),
      this.page.additiveLines(),
      (name) => this.findMaterial(name),
      this.page.standardMaterials(),
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
    // The cone it was rebuilt for tells which firing the recipe is for, when it has none yet.
    if (!this.page.firing() && !firingBands(this.page.firedAt()).length && firing.celsius) {
      this.page.firing.set(bandOf(LIMIT_SETS['hesselberth-roy'], firing.celsius) ?? '');
    }
  }

  private applyShelf(run: Run, compare = true): void {
    const match = matchFromShelf(this.page.lines(), run.tries, {
      avoid: run.avoid,
      additives: this.page.additiveLines(),
      uncapped: run.uncapped
    });
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

  /** Puts a swap on the page; what stopped one before is said no more. */
  private swapIn(
    materials: RecipeMaterial[],
    note: string,
    announcement: string,
    opener: string,
    kind: SwapKind = 'modern',
    result?: SwapResult,
    compare = true
  ): void {
    this.problem.set('');
    this.page.swapIn(materials, note, announcement, opener, kind, result, compare);
  }

  /** A material in the standard library or the user's own, by its key (recipe-library.ts libraryKey). */
  private libraryMaterial(key: string): LibraryMaterial | undefined {
    return [...this.page.standardMaterials(), ...this.page.myMaterials()].find(
      (material) => libraryKey(material) === key
    );
  }

  /** A material on hand that a match may use: one that is loaded, and without lead while lead is off. */
  private shelfMaterial(key: string): LibraryMaterial | undefined {
    const material = this.libraryMaterial(key);
    return material && !(this.page.leadOff() && hasLead(material)) ? material : undefined;
  }

  /** A material by its name, or else another name: the user's own before a standard one. */
  private findMaterial(name: string): LibraryMaterial | undefined {
    return findNamed([...this.page.myMaterials(), ...this.page.standardMaterials()], name);
  }
}
