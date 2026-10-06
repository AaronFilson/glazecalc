import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

const HIDDEN_KEY = 'recipeHelp';

const readHidden = (): boolean => {
  try {
    return localStorage.getItem(HIDDEN_KEY) === 'hidden';
  } catch {
    return false;
  }
};

/**
 * How to use the recipe page. Shown until hidden; the browser remembers that,
 * and a link brings it back.
 */
@Component({
  selector: 'gc-recipe-help',
  imports: [RouterLink],
  template: `
    @if (hidden()) {
      <p class="help-reopen">
        <button type="button" class="btn btn-link p-0" (click)="setHidden(false)">How to use this page</button>
      </p>
    } @else {
      <section class="panel recipe-help" aria-labelledby="recipe-help-heading">
        <div class="recipe-help-top">
          <h2 id="recipe-help-heading">How to use the recipe calculator</h2>
          <button type="button" class="btn btn-light border btn-sm" (click)="setHidden(true)">
            Hide these instructions
          </button>
        </div>
        <p>
          The calculator turns a glaze recipe, the weights of the raw materials you mix, into its unity molecular
          formula: the oxides the glaze becomes in the kiln, scaled so the fluxes add up to 1. It updates as you type.
        </p>
        <ol class="recipe-help-steps">
          <li>
            <h3>Name the recipe</h3>
            <p>
              Give it a title. The date and notes are optional; notes are a good place for the cone, the atmosphere and
              how the test came out.
            </p>
          </li>
          <li>
            <h3>Add the materials</h3>
            <p>
              Under <b>Add materials</b>, choose <b>My materials</b> (the ones you entered on the
              <a routerLink="/material">Materials page</a>, such as your own analysis of a feldspar) or
              <b>Standard</b> (the built-in list). Type part of a name in the filter to narrow a long list, then click a
              material to add it. The cursor moves to its amount.
            </p>
          </li>
          <li>
            <h3>Enter the amounts</h3>
            <p>
              Use any unit: percent, parts or grams. Only the proportions matter to the chemistry. The share column
              shows each material's percent of the batch, and the total is under the list.
            </p>
          </li>
          <li>
            <h3>Read the unity formula</h3>
            <p>It sits beside the recipe (below it on a phone) and changes with every amount you type:</p>
            <ul>
              <li><b>Fluxes</b> (R₂O and RO) add up to 1.000; they make the glaze melt.</li>
              <li><b>Stabilizers</b> (R₂O₃), mainly alumina, stiffen the melt so it stays on the pot.</li>
              <li><b>Glass formers</b> (RO₂), mainly silica, make the glass.</li>
              <li>
                The <b>silica to alumina ratio</b> hints at the surface: higher ratios tend to be glossier, lower ones
                more matte, though the fluxes and the firing matter too.
              </li>
            </ul>
            <p>If a material is unknown, an amount is not a number, or nothing in the recipe is a flux, it says so.</p>
          </li>
          <li>
            <h3>Add colorants and additives</h3>
            <p>
              These go on top of the base, as a percent of it, such as 2 for 2% red iron oxide. They are saved with the
              recipe but are not part of the unity formula.
            </p>
          </li>
          <li>
            <h3>Change the scale when you need to</h3>
            <ul>
              <li><b>To percent</b>: the materials add up to 100; additives keep their proportion.</li>
              <li>
                <b>To parts</b>: the smallest whole numbers that fit, such as 3 flint and 2 dolomite; a material that
                does not divide evenly keeps its exact amount, such as 1.477.
              </li>
              <li><b>Scale to a batch</b>: enter a weight, such as 500 g, to get the grams to weigh out.</li>
            </ul>
            <p>Every amount changes at once, and the unity formula stays the same.</p>
          </li>
          <li>
            <h3>Save</h3>
            <ul>
              <li>
                <b>Save</b> keeps the recipe here and adds it to My saved recipes. Saving again updates that same
                recipe.
              </li>
              <li><b>Save and add next recipe</b> saves, then clears the page for the next one.</li>
              <li>
                <b>Save as a copy</b> saves your changes as a new recipe and leaves the original as it was: good for
                variations on a recipe.
              </li>
              <li><b>Open</b>, in My saved recipes, brings a saved recipe back here to change it.</li>
            </ul>
          </li>
        </ol>
        <p class="recipe-help-tips">
          <b>Tips:</b> a material that is not in the standard list can be added on the
          <a routerLink="/material">Materials page</a> from its chemical formula or the supplier's analysis. And test
          before you trust: the numbers show tendencies, not what your kiln will do.
        </p>
      </section>
    }
  `
})
export class RecipeHelp {
  protected readonly hidden = signal(readHidden());

  protected setHidden(hidden: boolean): void {
    this.hidden.set(hidden);
    try {
      if (hidden) localStorage.setItem(HIDDEN_KEY, 'hidden');
      else localStorage.removeItem(HIDDEN_KEY);
    } catch {
      // Without storage it is remembered for this visit only.
    }
  }
}
