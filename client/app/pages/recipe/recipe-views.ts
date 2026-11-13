import { Location } from '@angular/common';
import { Injector, Signal, WritableSignal, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { translate } from '@jsverse/transloco';
import { map } from 'rxjs';
import { Additive, Material, Recipe, RecipeMaterial } from '../../core/models';
import { notANumber } from '../../shared/format';
import { focusWhenDrawn } from './focus';
// A type apart from the compare view, which recipe-page.html defers (@defer), so its file can be left out until needed.
import type { CompareChoice } from './recipe-compare';
import { hazardSources } from './recipe-hazards';

// The recipe page's print and compare views, which the address opens: ?print=draft prints the recipe being
// edited and ?print=<id> a saved one (?sheet=worked on its working); ?compare=<first>,<second> compares two,
// each 'draft' (the recipe being edited), 'before' (it before a swap) or a saved recipe's id. While one is
// open the page hides the editor; Back in the browser closes it, and the focus goes back where it was.

/** The recipe page, as its views read it. */
export interface ViewsPage {
  readonly lines: Signal<RecipeMaterial[]>;
  readonly title: Signal<string>;
  /** The recipe being edited, as it would be saved. */
  readonly draft: Signal<Recipe>;
  readonly savedId: Signal<string | null>;
  readonly recipes: Signal<Recipe[]>;
  /** Whether the saved recipes are in: a view of one waits for them. */
  readonly recipesLoaded: Signal<boolean>;
  /** The recipe being edited as it was before a swap, to compare with. */
  readonly beforeSwap: Signal<Recipe | null>;
  readonly myMaterials: Signal<Material[]>;
  readonly standardMaterials: Signal<Material[]>;
  readonly myAdditives: Signal<Additive[]>;
  readonly standardAdditives: Signal<Additive[]>;
  /** What stops a print or comparison that is not about one field, said beside the save buttons. */
  readonly saveProblem: WritableSignal<string>;
  /** The field of an amount that is not a number, such as material-amount-2; null when each is one. */
  unreadableField(): string | null;
  /** Marks a field with a problem, and sends the focus there. */
  report(field: string, problem: string): void;
  /** Lists a saved recipe and opens its More, so the focus can go back to its Print or Compare. */
  showMore(id: string): void;
}

export class RecipeViews {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly injector = inject(Injector);

  // Printing.
  private readonly printParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('print'))), {
    initialValue: null
  });
  /** ?sheet=worked opens the print view on the worked calculation (Show the working). */
  readonly printSheet = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('sheet') === 'worked' ? ('worked' as const) : null))),
    { initialValue: null }
  );
  /** The recipe in the print view, while it is open. */
  readonly printRecipe = computed<Recipe | null>(() => {
    const wanted = this.printParam();
    if (!wanted) return null;
    if (wanted === 'draft') return this.page.lines().length ? this.page.draft() : null;
    return this.page.recipes().find((recipe) => recipe._id === wanted) ?? null;
  });
  /** Asked to print a saved recipe, before the saved recipes are in. */
  readonly printWaiting = computed(
    () => !!this.printParam() && this.printParam() !== 'draft' && !this.page.recipesLoaded()
  );
  /** What the hazards of the recipe being printed are read from: the library's current records. */
  readonly printHazards = computed(() => {
    const recipe = this.printRecipe();
    return recipe
      ? hazardSources(
          [...(recipe.materials ?? []), ...(recipe.additives ?? [])],
          [...this.page.standardMaterials(), ...this.page.standardAdditives()],
          [...this.page.myMaterials(), ...this.page.myAdditives()]
        )
      : [];
  });
  /** Whether this page opened the print or compare view, so closing it can go back in the history. */
  private openedHere = false;

  // Comparing (issue #6).
  private readonly compareParam = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('compare'))), {
    initialValue: null
  });
  readonly compareKeys = computed(() => {
    const param = this.compareParam();
    if (param === null) return null;
    const [left = '', right = ''] = param.split(',');
    return { left, right };
  });
  readonly compareLeft = computed(() => this.recipeFor(this.compareKeys()?.left));
  readonly compareRight = computed(() => this.recipeFor(this.compareKeys()?.right));
  /** Whether the compare view is open: asked for, and at least one of the two is there. */
  readonly comparing = computed(() => !!this.compareKeys() && !!(this.compareLeft() || this.compareRight()));
  readonly compareWaiting = computed(() => !!this.compareKeys() && !this.page.recipesLoaded());
  readonly compareChoices = computed<CompareChoice[]>(() => {
    const before = this.page.beforeSwap();
    return [
      ...(this.page.lines().length
        ? [
            {
              key: 'draft',
              label: translate('recipe.page.beingEdited', {
                title: this.page.title().trim() || translate('recipe.page.untitled')
              })
            }
          ]
        : []),
      ...(before ? [{ key: 'before', label: translate('recipe.page.beforeSwap', { title: before.title }) }] : []),
      ...this.page.recipes().map((recipe) => ({ key: recipe._id ?? '', label: recipe.title }))
    ];
  });
  /** The report of a swap goes with the compare view while it shows the new recipe, and under Materials otherwise. */
  readonly reportInCompare = computed(() => this.comparing() && this.compareKeys()?.right === 'draft');
  /** The button that opened the compare view, for the focus to go back to. */
  private compareOpener = '';

  /** Whether a view is open, or coming: the editor is hidden meanwhile, just as it was. */
  readonly open = computed(
    () => !!this.printRecipe() || this.printWaiting() || this.comparing() || this.compareWaiting()
  );

  constructor(private readonly page: ViewsPage) {
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
      if (!comparing && target.startsWith('compare-') && target !== 'compare-draft') {
        untracked(() => this.page.showMore(target.slice('compare-'.length)));
      }
      untracked(() => focusWhenDrawn(this.injector, target, comparing ? 'compare-heading' : null));
    });
    // The focus goes to the print options when they open, and back to the Print button that opened them.
    // Show the working opened it from its own button, in the unity formula's panel.
    let printed: string | null = null;
    let sheet: string | null = null;
    effect(() => {
      const printing = this.printRecipe() ? this.printParam() : null;
      if (printing === printed) return;
      const opener = printed === 'draft' && sheet === 'worked' ? 'worked-draft' : 'print-' + printed;
      const target = printing ? 'print-heading' : opener;
      if (!printing && printed && printed !== 'draft') untracked(() => this.page.showMore(printed!));
      printed = printing;
      sheet = untracked(this.printSheet);
      untracked(() => focusWhenDrawn(this.injector, target, printing ? 'print-heading' : null, null));
    });
  }

  /** Opens the print view for the recipe being edited, saved or not; on the worked calculation for Show the working. */
  printDraft(sheet?: 'worked'): void {
    this.page.saveProblem.set('');
    if (!this.page.lines().length) {
      this.page.saveProblem.set(translate('recipe.page.addMaterialToPrint'));
      return;
    }
    // It would print as 0 g. (Blank amounts are fine to print; they count as 0.)
    const unreadable = this.page.unreadableField();
    if (unreadable) {
      this.page.report(unreadable, notANumber());
      return;
    }
    this.openPrint('draft', sheet);
  }

  /** Opens the print view: for 'draft', or a saved recipe's id. Back in the browser closes it. */
  openPrint(what: string, sheet?: 'worked'): void {
    this.openedHere = true;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { print: what, sheet: sheet ?? null },
      queryParamsHandling: 'merge'
    });
  }

  closePrint(): void {
    if (!this.openedHere) return this.leavePrint();
    this.openedHere = false;
    this.location.back();
  }

  /** Compares the recipe being edited with a saved one (the first other, to start with). */
  compareDraft(): void {
    this.page.saveProblem.set('');
    if (!this.page.lines().length) {
      this.page.saveProblem.set(translate('recipe.page.addMaterialToCompare'));
      return;
    }
    const unreadable = this.page.unreadableField();
    if (unreadable) {
      this.page.report(unreadable, notANumber());
      return;
    }
    const other = this.page.recipes().find((recipe) => recipe._id !== this.page.savedId());
    this.openCompare('draft', other?._id ?? '', 'compare-draft');
  }

  /** Compares a saved recipe with the one being edited, or with another saved one. */
  compareSaved(recipe: Recipe): void {
    const id = recipe._id ?? '';
    const other =
      this.page.lines().length && this.page.savedId() !== id
        ? 'draft'
        : (this.page.recipes().find((r) => r._id !== id)?._id ?? '');
    this.openCompare(id, other, 'compare-' + id);
  }

  chooseCompared(choice: { side: 'left' | 'right'; key: string }): void {
    const keys = { left: '', right: '', ...this.compareKeys(), [choice.side]: choice.key };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { compare: keys.left + ',' + keys.right },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  closeCompare(): void {
    if (!this.openedHere) return this.leaveCompare();
    this.openedHere = false;
    this.location.back();
  }

  /** Opens the compare view on two recipes; the focus comes back to the opener when it closes. */
  openCompare(left: string, right: string, opener: string): void {
    this.openedHere = true;
    this.compareOpener = opener;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { compare: left + ',' + right },
      queryParamsHandling: 'merge'
    });
  }

  private leavePrint(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { print: null, sheet: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
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
    if (key === 'draft') return this.page.lines().length ? this.page.draft() : null;
    if (key === 'before') return this.page.beforeSwap();
    return this.page.recipes().find((recipe) => recipe._id === key) ?? null;
  }
}
