import { Component, Injector, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import {
  ATMOSPHERES,
  ConeScale,
  PROCESSES,
  compareCones,
  conesBetween,
  inRange,
  testedCones
} from '../../../../lib/cones/firing';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';
import { Recipe } from '../../core/models';
import { DatePipe, PlainPipe } from '../../shared/format-pipes';
import { firstOf } from '../../shared/options';
import { PendingBadge } from '../../shared/pending-badge';
import { Removal, RemoveButton } from '../../shared/remove-button';
import { ATMOSPHERE_NAMES, Reader, coneText, firingLine } from './firing-text';
import { focusWhenDrawn } from './focus';
import { additiveAmount, savedAnalysis } from './recipe-analysis';
import { SharePanel } from './share-panel';
import { UnityFormula } from './unity-formula';

/** More saved recipes than this, and a filter is offered. */
const SAVED_FILTER_FROM = 5;
/** How many saved recipes are listed until all are asked for. */
const SAVED_SHOWN = 8;

/** The set with the id added, or taken out if it was there. */
const toggled = (set: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  const next = new Set(set);
  if (!next.delete(id)) next.add(id);
  return next;
};

/**
 * A potter's saved recipes, first on the recipe page: the newest first, filtered by title, cone and
 * atmosphere. Each name opens the recipe in the editor below; its details show under it, and the rest
 * (Print, Compare, Blend, Duplicate for another cone, Share, Remove) is under More. The page does what
 * each asks.
 */
@Component({
  selector: 'gc-saved-recipes',
  imports: [
    DatePipe,
    FormsModule,
    PendingBadge,
    PlainPipe,
    RemoveButton,
    RouterLink,
    SharePanel,
    TranslocoDirective,
    UnityFormula
  ],
  templateUrl: './saved-recipes.html',
  styles: `
    /* No box of its own: the list's section is laid out as a part of the page. */
    :host {
      display: contents;
    }
    .saved-recipes-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      margin-bottom: 0.5rem;
    }
    .saved-recipes-top h2 {
      margin: 0;
    }
    .saved-count {
      color: var(--gc-muted);
      font-size: 1rem;
      font-weight: 400;
    }
    .saved-filter {
      width: auto;
      flex: 0 1 16rem;
    }
    .saved-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .saved-recipe {
      border-top: 1px solid var(--gc-border);
      padding: 0.35rem 0;
    }
    .saved-recipe-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0.75rem;
    }
    .saved-recipe-name {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.25rem 0.75rem;
      min-width: 0;
    }
    /* The name opens it: a link's look, a heading's weight, and a finger's height on a phone. */
    .saved-recipe-open {
      --bs-btn-padding-x: 0;
      font-weight: 600;
      text-align: start;
      overflow-wrap: anywhere;
    }
    .saved-recipe-date {
      color: var(--gc-muted);
      font-size: 0.9rem;
    }
    .saved-recipe-actions,
    .saved-recipe-more {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }
    .saved-recipe-actions {
      margin-inline-start: auto;
    }
    /* Print, Compare, Share and Remove, on a line of their own under the name, Remove last. */
    .saved-recipe-more {
      flex-basis: 100%;
      justify-content: flex-end;
    }
    .saved-open-mark {
      background: var(--gc-success-bg);
      border-radius: 999px;
      color: var(--gc-success-text);
      font-size: 0.8rem;
      padding: 0.1rem 0.5rem;
    }
    .saved-recipe-details {
      padding: 0.25rem 0 0.5rem;
    }
    .saved-show-all {
      margin-top: 0.5rem;
    }
    .saved-firing {
      color: var(--gc-muted);
      font-size: 0.9rem;
      flex-basis: 100%;
    }
    .saved-firing-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .saved-firing-filters select {
      width: auto;
      flex: 0 1 14rem;
    }
  `
})
export class SavedRecipes {
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly injector = inject(Injector);

  readonly recipes = input.required<Recipe[]>();
  /** The saved recipe the editor shows, if any. */
  readonly openId = input<string | null>(null);
  /** The page's removals, which say how each is getting on (shared/remove-button.ts). */
  readonly removal = input.required<Removal<Recipe>>();
  readonly openRecipe = output<Recipe>();
  readonly printRecipe = output<string>();
  readonly compareRecipe = output<Recipe>();
  readonly duplicateRecipe = output<Recipe>();
  readonly removeRecipe = output<Recipe>();

  protected readonly savedAnalysis = savedAnalysis;
  protected readonly additiveAmount = additiveAmount;
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  /** The saved recipes whose More (Print, Compare, Share, Remove) is open. */
  protected readonly moreOpen = signal<ReadonlySet<string>>(new Set());
  /** The saved recipe whose Share is open, under its More. */
  protected readonly shareOpen = signal<string | null>(null);
  /** A trial cannot share a recipe; its Share says why. */
  protected readonly isTrial = computed(() => !!this.auth.trial());
  /** Whether there are enough saved recipes to offer to filter them by title. */
  protected readonly filterShown = computed(() => this.recipes().length > SAVED_FILTER_FROM);
  /** What the list is filtered by: emptied when the filter box goes, so a list it no longer shows is not filtered. */
  protected readonly recipeFilter = linkedSignal({ source: this.filterShown, computation: () => '' });
  protected readonly showAllRecipes = signal(false);
  /** How the reader fires, for the firing in words. */
  private readonly reader = computed<Reader>(() => ({
    cones: this.locale.cones(),
    temperature: this.locale.temperature()
  }));
  /** The cones the saved recipes' firings cover ("orton:6"), to filter by; offered once two recipes state one. */
  protected readonly coneOptions = computed(() => {
    const keys = new Map<string, { scale: ConeScale; cone: string }>();
    for (const recipe of this.recipes()) {
      const block = recipe.firedAt;
      if (!block?.low) continue;
      for (const cone of conesBetween(block.scale, block.low, block.high)) {
        keys.set(block.scale + ':' + cone, { scale: block.scale, cone });
      }
    }
    const order: ConeScale[] = ['orton', 'sk', 'temperature'];
    return [...keys.entries()]
      .sort(([, a], [, b]) => order.indexOf(a.scale) - order.indexOf(b.scale) || compareCones(a.scale, a.cone, b.cone))
      .map(([key, { scale, cone }]) => ({ key, label: coneText(scale, cone, this.reader()) }));
  });
  /** The atmospheres and processes the saved recipes name, to filter by. */
  protected readonly atmosphereOptions = computed(() => {
    const named = new Set(
      this.recipes().flatMap((r) => [...(r.firedAt?.atmospheres ?? []), ...(r.firedAt?.processes ?? [])])
    );
    return [...ATMOSPHERES, ...PROCESSES]
      .filter((a) => named.has(a as never))
      .map((a) => ({ key: a as string, label: translate(ATMOSPHERE_NAMES[a]) }));
  });
  protected readonly firingFiltersShown = computed(
    () => this.recipes().filter((recipe) => recipe.firedAt?.low || recipe.firedAt?.atmospheres?.length).length > 1
  );
  protected readonly coneFilter = linkedSignal({ source: this.firingFiltersShown, computation: () => '' });
  protected readonly atmosphereFilter = linkedSignal({ source: this.firingFiltersShown, computation: () => '' });
  /** A filter is set: the list shows every match. */
  private readonly filtering = computed(
    () => !!(this.recipeFilter().trim() || this.coneFilter() || this.atmosphereFilter())
  );
  /**
   * The saved recipes as listed: the newest first, those whose titles match the filter and whose firing
   * takes in the cone chosen (a range matches any cone inside it, those tested at it first) and names the
   * atmosphere chosen, the first few until all are asked for.
   */
  private readonly listedRecipes = computed(() => {
    const filter = this.recipeFilter().trim().toLocaleLowerCase();
    let listed = [...this.recipes()].reverse();
    if (filter) listed = listed.filter((recipe) => recipe.title.toLocaleLowerCase().includes(filter));
    const atmosphere = this.atmosphereFilter();
    if (atmosphere) {
      listed = listed.filter((r) =>
        [...(r.firedAt?.atmospheres ?? []), ...(r.firedAt?.processes ?? [])].includes(atmosphere as never)
      );
    }
    const coneKey = this.coneFilter();
    if (coneKey) {
      const [scale, cone] = coneKey.split(':') as [ConeScale, string];
      listed = listed.filter((r) => inRange(r.firedAt, scale, cone));
      const untested = (r: Recipe) => (testedCones(r.firedAt).includes(cone) ? 0 : 1);
      listed = [...listed].sort((a, b) => untested(a) - untested(b));
    }
    return listed;
  });
  protected readonly shownRecipes = computed(() => {
    const listed = this.listedRecipes();
    return this.showAllRecipes() || this.filtering() ? listed : listed.slice(0, SAVED_SHOWN);
  });
  /** How many saved recipes are left out until all are asked for, or 0. */
  protected readonly hiddenRecipes = computed(() => this.listedRecipes().length - this.shownRecipes().length);

  /** A saved recipe's firing on one line. */
  protected savedFiring(recipe: Recipe): string {
    return firingLine(recipe.firedAt, this.reader());
  }

  /** A saved recipe's notes; "None." is saved for a recipe with none. */
  protected savedNotes(recipe: Recipe): string {
    const notes = firstOf(recipe.notes);
    return !notes || notes === 'None.' ? translate('recipe.page.noNotes') : notes;
  }

  protected toggleExpanded(recipe: Recipe): void {
    this.expanded.update((set) => toggled(set, recipe._id ?? ''));
  }

  protected toggleMore(recipe: Recipe): void {
    this.moreOpen.update((set) => toggled(set, recipe._id ?? ''));
    if (!this.moreOpen().has(recipe._id ?? '') && this.shareOpen() === recipe._id) this.shareOpen.set(null);
  }

  /** Opens or closes a saved recipe's Share; the focus goes to its heading when it opens. */
  protected toggleShare(recipe: Recipe): void {
    const id = recipe._id ?? '';
    const opening = this.shareOpen() !== id;
    this.shareOpen.set(opening ? id : null);
    if (opening) {
      focusWhenDrawn(this.injector, 'share-heading-' + id, 'share-heading-' + id, null);
    }
  }

  /** Lists a saved recipe and opens its More, so the focus can go back to its Print or Compare. */
  showMore(id: string): void {
    // Opened from the address, it may be one of those the list leaves out until all are asked for.
    if (!this.shownRecipes().some((recipe) => recipe._id === id)) {
      this.recipeFilter.set('');
      this.showAllRecipes.set(true);
    }
    if (!this.moreOpen().has(id)) this.moreOpen.update((set) => toggled(set, id));
  }
}
