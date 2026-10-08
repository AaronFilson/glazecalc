import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LibraryInfo } from '../../core/models';
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
  imports: [RouterLink],
  template: `
    <div class="library">
      <div class="library-top">
        @if (nested()) {
          <h5 class="library-heading">{{ heading() }}</h5>
        } @else {
          <h3 class="library-heading">{{ heading() }}</h3>
        }
        <div class="library-tabs" role="group" [attr.aria-label]="'Which ' + noun()">
          <button
            type="button"
            class="library-tab"
            [class.active]="tab() === 'mine'"
            [attr.aria-pressed]="tab() === 'mine'"
            (click)="chosenTab.set('mine')"
          >
            My {{ noun() }} ({{ mineShown().length }})
          </button>
          <button
            type="button"
            class="library-tab"
            [class.active]="tab() === 'standard'"
            [attr.aria-pressed]="tab() === 'standard'"
            (click)="chosenTab.set('standard')"
          >
            Standard ({{ standardShown().length }})
          </button>
        </div>
      </div>
      <label class="visually-hidden" [for]="filterId"
        >Filter {{ tab() === 'mine' ? 'my' : 'standard' }} {{ noun() }}</label
      >
      <div class="library-tools">
        <input
          [id]="filterId"
          type="search"
          class="form-control form-control-sm library-filter"
          placeholder="Filter"
          autocomplete="off"
          [value]="filter()"
          (input)="filter.set($any($event.target).value)"
        />
        @if (tab() === 'standard') {
          <label class="visually-hidden" [for]="filterId + '-region'">Standard {{ noun() }} sold in</label>
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
                <span class="library-mark">{{ markLabel() }}</span>
              </span>
            } @else {
              <button
                type="button"
                class="library-item"
                [attr.aria-label]="'Add ' + item.name + (statusText(item) ? ', ' + statusText(item) : '')"
                (click)="choose(item)"
              >
                <span
                  >{{ item.name }}
                  @if (statusText(item); as status) {
                    <span class="library-status">{{ status }}</span>
                  }
                </span>
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
      @if (leadHidden(); as hidden) {
        <p class="library-hidden">
          {{ hidden }} with lead {{ hidden === 1 ? 'is' : 'are' }} not listed: lead is off in
          <a routerLink="/account">Settings</a>.
        </p>
      }
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
  /** Leave out materials with lead: the account's lead setting is off. */
  readonly hideLead = input(false);
  /** What marks an item in inRecipe: "In recipe", or "Added" in a list to try. */
  readonly markLabel = input('In recipe');
  /** Inside a panel with its own heading: the heading a level below. */
  readonly nested = input(false);
  readonly pick = output<T>();

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
