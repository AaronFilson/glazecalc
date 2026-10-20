import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild
} from '@angular/core';
import { translate } from '@jsverse/transloco';
import { PickerItem, PickerSection, searcher, sectionsOf } from './picker-search';

export type { PickerItem } from './picker-search';

let nextId = 0;

/**
 * A list to choose from by typing or by looking: a combobox with a listbox (the WAI-ARIA pattern
 * "editable combobox with list autocomplete"), for lists too long to scroll through, as the languages
 * and the regions are. The field shows the choice; focusing it selects that, so typing replaces it. What
 * is typed narrows the list to the items it begins a word of (or is in the middle of, if none), by label
 * or by the English name. The items are in groups, each with its heading. The arrow keys move through
 * them, Enter chooses, Escape closes and puts the choice back. Its names are set apart (bdi), so a name in
 * another script reads in its own direction in a page that reads the other way.
 *
 * The label belongs to the host (a <label> for the field's id), which gives its words too. The host says
 * what was chosen, by the value it passes back; until it does, the field shows the choice, as a select does.
 */
@Component({
  selector: 'gc-picker',
  imports: [NgTemplateOutlet],
  template: `
    <div class="picker-field">
      <input
        #field
        type="text"
        class="form-control"
        role="combobox"
        aria-autocomplete="list"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        dir="auto"
        [id]="inputId()"
        [attr.aria-expanded]="listed()"
        [attr.aria-controls]="listed() ? listId : null"
        [attr.aria-activedescendant]="activeId()"
        [attr.lang]="query() === null ? (selectedItem()?.lang ?? null) : null"
        [placeholder]="placeholder()"
        [value]="text()"
        (input)="typed($event)"
        (keydown)="pressed($event)"
        (focus)="field.select()"
        (click)="clicked(field)"
        (blur)="close()"
      />
      <!-- For the pointer: the keyboard has the arrow keys, and a screen reader the field. -->
      <button
        type="button"
        class="btn btn-light border picker-toggle"
        tabindex="-1"
        [attr.aria-label]="showAll()"
        [attr.aria-expanded]="listed()"
        (mousedown)="$event.preventDefault()"
        (click)="toggle(field)"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
          <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      </button>
    </div>
    @if (listed()) {
      <!-- A press on the list must not take the focus from the field, or the list would close before the click. -->
      <div
        class="picker-list"
        role="listbox"
        [id]="listId"
        [attr.aria-label]="label()"
        (mousedown)="$event.preventDefault()"
      >
        @for (section of sections(); track $index) {
          @if (section.heading) {
            <div role="group" class="picker-group" [attr.aria-labelledby]="groupId($index)">
              <div role="presentation" class="picker-heading" [id]="groupId($index)">{{ section.heading }}</div>
              <ng-container [ngTemplateOutlet]="options" [ngTemplateOutletContext]="{ $implicit: section.items }" />
            </div>
          } @else {
            <ng-container [ngTemplateOutlet]="options" [ngTemplateOutletContext]="{ $implicit: section.items }" />
          }
        }
      </div>
    }
    <ng-template #options let-items>
      @for (item of items; track item.value) {
        <!-- The keys are the field's (aria-activedescendant); an option is never focused itself. -->
        <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
        <div
          role="option"
          class="picker-option"
          [id]="optionId(item)"
          [class.active]="item === active()"
          [attr.aria-selected]="item.value === selected()"
          (click)="choose(item)"
        >
          <span class="picker-name">
            <bdi [attr.lang]="item.lang ?? null" dir="auto">{{ item.label }}</bdi>
            @if (item.note) {
              &ngsp;<bdi lang="en" dir="auto" class="picker-note">{{ item.note }}</bdi>
            }
          </span>
          @if (item.value === selected()) {
            <svg class="picker-check" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
              <path d="M3 8.5l3.5 3.5L13 5" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
          }
        </div>
      }
    </ng-template>
    <!-- Says how many match as one types, and when none do; seen only then. -->
    <div class="picker-status" role="status" [class.picker-none]="none()" [class.visually-hidden]="!none()">
      {{ status() }}
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }
    .picker-field {
      display: flex;
    }
    .form-control {
      flex: 1;
      min-width: 0;
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }
    .picker-toggle {
      border-start-start-radius: 0;
      border-end-start-radius: 0;
      margin-inline-start: -1px;
      padding-inline: 0.75rem;
      display: flex;
      align-items: center;
    }
    .picker-list,
    .picker-status.picker-none {
      position: absolute;
      inset-inline: 0;
      top: 100%;
      z-index: 30;
      margin-top: 2px;
      background: var(--gc-surface);
      border: 1px solid var(--gc-border);
      border-radius: 8px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
    }
    .picker-list {
      max-height: min(20rem, 55vh);
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .picker-heading {
      padding: 0.4rem 0.75rem 0.2rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--gc-muted);
      background: var(--gc-surface-2);
    }
    .picker-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      /* A finger's height (44px). */
      min-height: 2.75rem;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
      /* Each name in its own script, in the device's serif (the footer's list does likewise, styles.scss). */
      font-family: Georgia, 'Noto Serif', serif;
    }
    .picker-option:hover,
    .picker-option.active {
      background: var(--gc-surface-2);
    }
    .picker-option.active {
      outline: 2px solid var(--gc-primary);
      outline-offset: -2px;
    }
    .picker-option[aria-selected='true'] {
      font-weight: 700;
    }
    .picker-name {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .picker-note {
      color: var(--gc-muted);
      font-size: 0.9rem;
      font-weight: 400;
    }
    .picker-check {
      flex: none;
      color: var(--gc-primary);
    }
    .picker-status.picker-none {
      padding: 0.6rem 0.75rem;
      color: var(--gc-muted);
    }
  `
})
export class Picker {
  /** The field's id, for the host's <label for>. */
  readonly inputId = input.required<string>();
  /** The label's words, which the list is named by. */
  readonly label = input.required<string>();
  readonly items = input.required<readonly PickerItem[]>();
  /** The value chosen; none of the items has it while nothing is. */
  readonly value = input.required<string>();
  /** Shown while the field is empty. */
  readonly placeholder = input('');
  /** The button that opens the whole list: "Show all languages". */
  readonly showAll = input.required<string>();
  /** Said when nothing matches what was typed: "No language matches". */
  readonly noMatch = input.required<string>();
  /** The value of the item chosen, when it is not the one already chosen. */
  readonly chosen = output<string>();

  private readonly fieldElement = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly uid = 'picker-' + nextId++;
  protected readonly listId = this.uid + '-list';

  /** The value shown as chosen: the one chosen here until the host passes another. */
  protected readonly selected = linkedSignal(() => this.value());
  protected readonly selectedItem = computed(() => this.items().find((i) => i.value === this.selected()));
  protected readonly open = signal(false);
  /** What was typed; null while nothing has been, when the field holds the choice. */
  protected readonly query = signal<string | null>(null);
  private readonly search = computed(() => searcher(this.items()));
  private readonly matches = computed(() => {
    const query = this.query();
    return query === null ? this.items() : this.search()(query);
  });
  protected readonly sections = computed<PickerSection[]>(() => sectionsOf(this.matches()));
  /** The item with the visual focus, which the field names by aria-activedescendant. */
  protected readonly active = signal<PickerItem | null>(null);
  /** Open with something in it; with nothing to show, the list is not there. */
  protected readonly listed = computed(() => this.open() && this.matches().length > 0);
  protected readonly none = computed(() => this.open() && this.matches().length === 0);
  protected readonly text = computed(() => this.query() ?? this.selectedItem()?.label ?? '');
  protected readonly activeId = computed(() => {
    const item = this.active();
    return this.listed() && item ? this.optionId(item) : null;
  });
  protected readonly status = computed(() => {
    if (this.none()) return this.noMatch();
    const typed = this.query();
    if (!this.open() || !typed) return '';
    return translate('picker.results', { count: this.matches().length });
  });

  constructor() {
    // An opened list is brought into the window, as far as it fits, where a phone's keyboard may have left it
    // under the edge; and the item with the focus stays in view in the list as the arrow keys move it.
    afterRenderEffect(() => {
      if (this.listed())
        this.element.nativeElement.querySelector('.picker-list')?.scrollIntoView?.({ block: 'nearest' });
    });
    afterRenderEffect(() => {
      const id = this.activeId();
      if (id) this.element.nativeElement.querySelector('#' + id)?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  protected optionId(item: PickerItem): string {
    return this.uid + '-o' + this.items().indexOf(item);
  }

  protected groupId(index: number): string {
    return this.uid + '-g' + index;
  }

  /** Opens the list with the choice (or the first item) in focus. */
  private show(last = false): void {
    this.open.set(true);
    const all = this.matches();
    this.active.set(all.find((i) => i.value === this.selected()) ?? (last ? all[all.length - 1] : all[0]) ?? null);
  }

  protected close(): void {
    this.open.set(false);
    this.query.set(null);
    this.active.set(null);
  }

  protected toggle(field: HTMLInputElement): void {
    field.focus();
    if (this.open()) this.close();
    else this.show();
  }

  protected clicked(field: HTMLInputElement): void {
    if (this.open()) return;
    this.show();
    // The click leaves the caret in the choice; selected, typing replaces it.
    field.select();
  }

  protected typed(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.open.set(true);
    this.active.set(this.matches()[0] ?? null);
  }

  protected choose(item: PickerItem): void {
    const changed = item.value !== this.selected();
    this.selected.set(item.value);
    this.close();
    // The field keeps the focus, for the next thing a keyboard user does.
    this.fieldElement().nativeElement.focus();
    if (changed) this.chosen.emit(item.value);
  }

  private move(by: number, clamp = false): void {
    const all = this.matches();
    if (!all.length) return;
    const at = this.active() ? all.indexOf(this.active()!) : -1;
    const next =
      at < 0
        ? by > 0
          ? 0
          : all.length - 1
        : clamp
          ? Math.min(all.length - 1, Math.max(0, at + by))
          : (at + by + all.length) % all.length;
    this.active.set(all[next]!);
  }

  protected pressed(event: KeyboardEvent): void {
    // Keys of a composition (Chinese, Japanese, Korean) belong to it, Enter's among them.
    if (event.isComposing || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) this.show();
        else if (!event.altKey) this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) this.show(true);
        else this.move(-1);
        break;
      case 'PageDown':
      case 'PageUp':
        if (!this.listed()) return;
        event.preventDefault();
        this.move(event.key === 'PageDown' ? 10 : -10, true);
        break;
      case 'Enter':
        if (this.listed() && this.active()) {
          event.preventDefault();
          this.choose(this.active()!);
        }
        break;
      case 'Escape':
        // Closing is all it does; the page's own Escape (the phone menu) is not for this.
        if (this.open()) {
          event.preventDefault();
          event.stopPropagation();
          this.close();
        }
        break;
    }
  }
}
