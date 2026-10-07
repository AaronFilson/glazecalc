import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface LibraryItem {
  _id?: string;
  name: string;
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
  imports: [RouterLink],
  template: `
    <div class="library">
      <div class="library-top">
        <h3 class="library-heading">{{ heading() }}</h3>
        <div class="library-tabs" role="group" [attr.aria-label]="'Which ' + noun()">
          <button
            type="button"
            class="library-tab"
            [class.active]="tab() === 'mine'"
            [attr.aria-pressed]="tab() === 'mine'"
            (click)="chosenTab.set('mine')"
          >
            My {{ noun() }} ({{ mine().length }})
          </button>
          <button
            type="button"
            class="library-tab"
            [class.active]="tab() === 'standard'"
            [attr.aria-pressed]="tab() === 'standard'"
            (click)="chosenTab.set('standard')"
          >
            Standard ({{ standard().length }})
          </button>
        </div>
      </div>
      <label class="visually-hidden" [for]="filterId"
        >Filter {{ tab() === 'mine' ? 'my' : 'standard' }} {{ noun() }}</label
      >
      <input
        [id]="filterId"
        type="search"
        class="form-control form-control-sm library-filter"
        placeholder="Filter"
        autocomplete="off"
        [value]="filter()"
        (input)="filter.set($any($event.target).value)"
      />
      <ul class="library-list">
        @for (item of shown(); track item._id ?? item.name) {
          <li>
            @if (inRecipe().has(key(item))) {
              <span class="library-item in-recipe">
                <span>{{ item.name }}</span>
                <span class="library-mark">In recipe</span>
              </span>
            } @else {
              <button type="button" class="library-item" [attr.aria-label]="'Add ' + item.name" (click)="choose(item)">
                <span>{{ item.name }}</span>
                <span class="library-mark" aria-hidden="true">+ Add</span>
              </button>
            }
          </li>
        } @empty {
          <li class="library-empty">
            @if (filter()) {
              Nothing matches "{{ filter() }}".
            } @else if (tab() === 'mine') {
              None yet. Add your own on the <a [routerLink]="mineLink()">{{ mineLinkLabel() }}</a
              >.
            } @else {
              Loading...
            }
          </li>
        }
      </ul>
    </div>
  `
})
export class RecipeLibrary<T extends LibraryItem = LibraryItem> {
  readonly heading = input.required<string>();
  /** Plural, lower case: 'materials', 'additives'. */
  readonly noun = input.required<string>();
  readonly mine = input.required<T[]>();
  readonly standard = input.required<T[]>();
  /** Keys (see key()) of what the recipe already holds. */
  readonly inRecipe = input<ReadonlySet<string>>(new Set());
  readonly mineLink = input('/material');
  readonly mineLinkLabel = input('Materials page');
  readonly pick = output<T>();

  protected readonly filterId = 'library-filter-' + nextId++;
  protected readonly filter = signal('');
  protected readonly chosenTab = signal<Tab | null>(null);
  /** Your own list first when you have one. */
  protected readonly tab = computed<Tab>(() => this.chosenTab() ?? (this.mine().length ? 'mine' : 'standard'));
  protected readonly shown = computed(() => {
    const words = this.filter().trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = this.tab() === 'mine' ? this.mine() : this.standard();
    return words.length ? list.filter((item) => words.every((w) => item.name.toLowerCase().includes(w))) : list;
  });

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
