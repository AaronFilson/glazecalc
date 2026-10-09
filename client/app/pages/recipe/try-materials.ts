import { Component, computed, input, model } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
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
  imports: [RecipeLibrary, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <div class="try-materials">
      <p class="try-intro">
        {{ intro() || t('recipe.tryMaterials.intro') }}
      </p>
      @if (tries().length) {
        <ul class="try-list" [attr.aria-label]="t('recipe.tryMaterials.list', { list: list(), count: tries().length })">
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
                <label class="form-check-label" [for]="id + '-must-' + i">{{ t('recipe.tryMaterials.mustUse') }}</label>
              </span>
              <button
                type="button"
                class="btn btn-link btn-sm try-remove"
                [attr.aria-label]="t('recipe.tryMaterials.removeFrom', { list: list(), name: tried.material.name })"
                (click)="remove(i)"
              >
                {{ t('recipe.tryMaterials.remove') }}
              </button>
            </li>
          }
        </ul>
      }
      <gc-recipe-library
        [heading]="t('recipe.tryMaterials.heading')"
        noun="materials"
        [markLabel]="t('recipe.tryMaterials.added')"
        [nested]="true"
        [mine]="mine()"
        [standard]="standard()"
        [inRecipe]="marked()"
        [hideLead]="hideLead()"
        (pick)="add($event)"
      />
    </div>
  </ng-container>`
})
export class TryMaterials {
  readonly mine = input.required<Material[]>();
  readonly standard = input.required<Material[]>();
  readonly hideLead = input(false);
  /** Keys of the recipe's own materials, marked rather than offered. */
  readonly inRecipe = input<ReadonlySet<string>>(new Set());
  /** What to say above the list, in the page's language; blank for the usual. */
  readonly intro = input('');
  /** What the list is, for its label and its Remove buttons: the materials to try, or your materials on hand. */
  readonly list = input<'tries' | 'shelf'>('tries');
  readonly tries = model<TryMaterial[]>([]);

  protected readonly id = 'try-' + nextId++;
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
