import { Component, computed, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { LibraryInfo } from '../../core/models';
import { RichText } from '../../i18n/rich-text';
import {
  REGIONS,
  byName,
  hasLead,
  inRegion,
  matchesWords,
  readRegion,
  saveRegion,
  statusText
} from '../../shared/library-info';

export interface LibraryItem extends LibraryInfo {
  _id?: string;
  name: string;
  fields?: Array<{ name: string; amount: string | number }>;
}

type Tab = 'mine' | 'standard';

let nextId = 0;

/**
 * A list to add materials (or additives) from: "My" and "Standard" kept apart
 * in two tabs, each a whole list to scroll or filter. Clicking a name adds it;
 * names already in the recipe are marked instead.
 */
@Component({
  selector: 'gc-recipe-library',
  imports: [RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <div class="library">
      <div class="library-top">
        @if (nested()) {
          <h5 class="library-heading">{{ heading() }}</h5>
        } @else {
          <h3 class="library-heading">{{ heading() }}</h3>
        }
        <div class="library-tabs" role="group" [attr.aria-label]="t('recipe.library.which', { noun: noun() })">
          <button
            type="button"
            class="library-tab"
            [class.active]="tab() === 'mine'"
            [attr.aria-pressed]="tab() === 'mine'"
            (click)="chosenTab.set('mine')"
          >
            {{ t('recipe.library.mine', { noun: noun(), count: mineShown().length }) }}
          </button>
          <button
            type="button"
            class="library-tab"
            [class.active]="tab() === 'standard'"
            [attr.aria-pressed]="tab() === 'standard'"
            (click)="chosenTab.set('standard')"
          >
            {{ t('recipe.library.standard', { count: standardShown().length }) }}
          </button>
        </div>
      </div>
      <label class="visually-hidden" [for]="filterId">{{
        t('recipe.library.filterLabel', { tab: tab(), noun: noun() })
      }}</label>
      <div class="library-tools">
        <input
          [id]="filterId"
          type="search"
          class="form-control form-control-sm library-filter"
          [placeholder]="t('standard.filter')"
          autocomplete="off"
          [value]="filter()"
          (input)="filter.set($any($event.target).value)"
        />
        @if (tab() === 'standard') {
          <label class="visually-hidden" [for]="filterId + '-region'">{{
            t('recipe.library.soldIn', { noun: noun() })
          }}</label>
          <select
            [id]="filterId + '-region'"
            class="form-select form-select-sm library-region"
            (change)="setRegion($any($event.target).value)"
          >
            @for (option of regions; track option.value) {
              <option [value]="option.value" [selected]="option.value === region()">{{ option.label }}</option>
            }
          </select>
        }
      </div>
      <ul class="library-list">
        @for (item of shown(); track item._id ?? item.name) {
          <li>
            @if (inRecipe().has(key(item))) {
              <span class="library-item in-recipe">
                <span
                  >{{ item.name }}
                  @if (statusText(item); as status) {
                    <span class="library-status">{{ status }}</span>
                  }
                </span>
                <span class="library-mark">{{ markLabel() || t('recipe.library.inRecipe') }}</span>
              </span>
            } @else {
              <button
                type="button"
                class="library-item"
                [attr.aria-label]="
                  statusText(item)
                    ? t('recipe.library.addWithStatus', { name: item.name, status: statusText(item) })
                    : t('recipe.library.add', { name: item.name })
                "
                (click)="choose(item)"
              >
                <span
                  >{{ item.name }}
                  @if (statusText(item); as status) {
                    <span class="library-status">{{ status }}</span>
                  }
                </span>
                <span class="library-mark" aria-hidden="true">{{ t('recipe.library.addMark') }}</span>
              </button>
            }
          </li>
        } @empty {
          <li class="library-empty">
            @if (filter()) {
              {{ t('recipe.library.nothingMatches', { filter: filter() }) }}
            } @else if (tab() === 'mine') {
              <gc-rich [text]="t('recipe.library.noneYet', { noun: noun() })" [links]="{ page: mineLink() }" />
            } @else if (standardFailed()) {
              <gc-rich [text]="t('standard.notFetched')" [links]="{ retry: tryAgain }" />
            } @else {
              {{ t('standard.loading') }}
            }
          </li>
        }
      </ul>
      @if (leadHidden(); as hidden) {
        <p class="library-hidden">
          <gc-rich [text]="t('recipe.library.leadHidden', { count: hidden })" [links]="{ settings: '/account' }" />
        </p>
      }
    </div>
  </ng-container>`
})
export class RecipeLibrary<T extends LibraryItem = LibraryItem> {
  /** In the page's language. */
  readonly heading = input.required<string>();
  /** What the lists hold, for their labels and the page to add your own on. */
  readonly noun = input.required<'materials' | 'additives'>();
  readonly mine = input.required<T[]>();
  readonly standard = input.required<T[]>();
  /** Keys (see key()) of what the recipe already holds. */
  readonly inRecipe = input<ReadonlySet<string>>(new Set());
  /** The page to add your own on: the Materials page, or the Additives page for additives. */
  readonly mineLink = input('/material');
  /** Leave out materials with lead: the account's lead setting is off. */
  readonly hideLead = input(false);
  /** What marks an item in inRecipe, in the page's language: "In recipe" when blank, or "Added" in a list to try. */
  readonly markLabel = input('');
  /** Inside a panel with its own heading: the heading a level below. */
  readonly nested = input(false);
  /** The standard list could not be fetched: it says so, with a button to ask for it again (retry). */
  readonly standardFailed = input(false);
  readonly pick = output<T>();
  readonly retry = output<void>();

  protected readonly filterId = 'library-filter-' + nextId++;
  protected readonly filter = signal('');
  protected readonly regions = REGIONS;
  /** The standard list is narrowed to the region chosen last; general records show everywhere. */
  protected readonly region = signal(readRegion());
  protected readonly statusText = statusText;
  protected readonly chosenTab = signal<Tab | null>(null);
  private readonly addable = (item: T): boolean => !(this.hideLead() && hasLead(item));
  protected readonly mineShown = computed(() => this.mine().filter(this.addable));
  protected readonly standardShown = computed(() => this.standard().filter(this.addable));
  /** Your own list first when you have one. */
  protected readonly tab = computed<Tab>(() => this.chosenTab() ?? (this.mineShown().length ? 'mine' : 'standard'));
  /** Alphabetical; a filter matches names and the other names a material is sold under. */
  protected readonly shown = computed(() => {
    const standard = this.tab() === 'standard';
    const list = standard ? this.standardShown().filter((item) => inRegion(item, this.region())) : this.mineShown();
    return list.filter((item) => matchesWords(item, this.filter())).sort(byName);
  });
  /** How many in this tab are left out for their lead. */
  protected readonly leadHidden = computed(() => {
    const all = this.tab() === 'standard' ? this.standard() : this.mine();
    const shown = this.tab() === 'standard' ? this.standardShown() : this.mineShown();
    return all.length - shown.length;
  });

  protected setRegion(region: string): void {
    this.region.set(region);
    saveRegion(region);
  }

  protected readonly tryAgain = (): void => this.retry.emit();

  protected choose(item: T): void {
    this.pick.emit(item);
    this.filter.set('');
  }

  /** How the recipe page and this list recognize the same item. */
  protected key(item: LibraryItem): string {
    return libraryKey(item);
  }
}

export const libraryKey = (item: LibraryItem): string => item._id ?? 'name:' + item.name;
