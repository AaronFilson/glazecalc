import { Component, computed, input, model } from '@angular/core';
import { Material } from '../../core/models';
import { TryMaterial } from './pool';
import { RecipeLibrary, libraryKey } from './recipe-library';

let nextId = 0;

/**
 * Materials for a substitution to consider (docs/adr/0012): any number, from
 * the standard library or the potter's own, each perhaps marked "must use".
 * The match uses those that help, fewest first.
 */
@Component({
  selector: 'gc-try-materials',
  imports: [RecipeLibrary],
  template: `
    <div class="try-materials">
      <p class="try-intro">
        {{ intro() }}
      </p>
      @if (tries().length) {
        <ul class="try-list" [attr.aria-label]="listLabel() + ' (' + tries().length + ')'">
          @for (tried of tries(); track tried.material.name; let i = $index) {
            <li>
              <span class="try-name">{{ tried.material.name }}</span>
              <span class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="checkbox"
                  [id]="id + '-must-' + i"
                  [checked]="tried.must"
                  (change)="setMust(i, $any($event.target).checked)"
                />
                <label class="form-check-label" [for]="id + '-must-' + i">Must use</label>
              </span>
              <button
                type="button"
                class="btn btn-link btn-sm try-remove"
                [attr.aria-label]="'Remove ' + tried.material.name + ' from ' + listName()"
                (click)="remove(i)"
              >
                Remove
              </button>
            </li>
          }
        </ul>
      }
      <gc-recipe-library
        heading="Add a material to try"
        noun="materials"
        markLabel="Added"
        [nested]="true"
        [mine]="mine()"
        [standard]="standard()"
        [inRecipe]="marked()"
        [hideLead]="hideLead()"
        (pick)="add($event)"
      />
    </div>
  `
})
export class TryMaterials {
  readonly mine = input.required<Material[]>();
  readonly standard = input.required<Material[]>();
  readonly hideLead = input(false);
  /** Keys of the recipe's own materials, marked rather than offered. */
  readonly inRecipe = input<ReadonlySet<string>>(new Set());
  readonly intro = input(
    'Add any materials you have or would like the match to consider: it uses those that help, as few as it can. Tick "Must use" to keep one in.'
  );
  /** What the list is, for its label and its Remove buttons: "the materials to try". */
  readonly listName = input('the materials to try');
  readonly tries = model<TryMaterial[]>([]);

  protected readonly id = 'try-' + nextId++;
  /** "Your materials on hand": the list's name, as a label. */
  protected readonly listLabel = computed(() => {
    const name = this.listName().replace(/^the /, '');
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
  protected readonly marked = computed(
    () => new Set([...this.inRecipe(), ...this.tries().map((tried) => libraryKey(tried.material))])
  );

  protected add(material: Material): void {
    if (this.tries().some((tried) => tried.material.name === material.name)) return;
    this.tries.update((tries) => [...tries, { material, must: false }]);
  }

  protected setMust(index: number, must: boolean): void {
    this.tries.update((tries) => tries.map((tried, i) => (i === index ? { ...tried, must } : tried)));
  }

  protected remove(index: number): void {
    this.tries.update((tries) => tries.filter((_, i) => i !== index));
  }
}
