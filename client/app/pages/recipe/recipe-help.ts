import { Component, ElementRef, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { RichText } from '../../i18n/rich-text';

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
  imports: [RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (hidden()) {
      <p class="help-reopen">
        <button #reopen type="button" class="btn btn-link p-0" (click)="setHidden(false)">
          {{ t('recipe.help.reopen') }}
        </button>
      </p>
    } @else {
      <section class="panel recipe-help" aria-labelledby="recipe-help-heading">
        <div class="recipe-help-top">
          <h2 #heading id="recipe-help-heading" tabindex="-1">{{ t('recipe.help.heading') }}</h2>
          <button type="button" class="btn btn-light border btn-sm" (click)="setHidden(true)">
            {{ t('recipe.help.hide') }}
          </button>
        </div>
        <p>{{ t('recipe.help.intro') }}</p>
        <ol class="recipe-help-steps">
          <li>
            <h3>{{ t('recipe.help.name.heading') }}</h3>
            <p>{{ t('recipe.help.name.text') }}</p>
          </li>
          <li>
            <h3>{{ t('recipe.help.materials.heading') }}</h3>
            <p><gc-rich [text]="t('recipe.help.materials.text')" [links]="{ materials: '/material' }" /></p>
          </li>
          <li>
            <h3>{{ t('recipe.help.amounts.heading') }}</h3>
            <p>{{ t('recipe.help.amounts.text') }}</p>
          </li>
          <li>
            <h3>{{ t('recipe.help.unity.heading') }}</h3>
            <p>{{ t('recipe.help.unity.text') }}</p>
            <ul>
              <li><gc-rich [text]="t('recipe.help.unity.fluxes')" /></li>
              <li><gc-rich [text]="t('recipe.help.unity.stabilizers')" /></li>
              <li><gc-rich [text]="t('recipe.help.unity.glassFormers')" /></li>
              <li><gc-rich [text]="t('recipe.help.unity.ratio')" /></li>
            </ul>
            <p>{{ t('recipe.help.unity.problems') }}</p>
          </li>
          <li>
            <h3>{{ t('recipe.help.additives.heading') }}</h3>
            <p>{{ t('recipe.help.additives.text') }}</p>
            <ul>
              <li><gc-rich [text]="t('recipe.help.additives.percent')" /></li>
              <li><gc-rich [text]="t('recipe.help.additives.parts')" /></li>
              <li><gc-rich [text]="t('recipe.help.additives.grams')" /></li>
            </ul>
            <p><gc-rich [text]="t('recipe.help.additives.count')" /></p>
          </li>
          <li>
            <h3>{{ t('recipe.help.scale.heading') }}</h3>
            <ul>
              <li><gc-rich [text]="t('recipe.help.scale.percent')" /></li>
              <li><gc-rich [text]="t('recipe.help.scale.parts')" /></li>
              <li><gc-rich [text]="t('recipe.help.scale.batch')" /></li>
            </ul>
            <p>{{ t('recipe.help.scale.text') }}</p>
          </li>
          <li>
            <h3>{{ t('recipe.help.save.heading') }}</h3>
            <ul>
              <li><gc-rich [text]="t('recipe.help.save.save')" /></li>
              <li><gc-rich [text]="t('recipe.help.save.next')" /></li>
              <li><gc-rich [text]="t('recipe.help.save.copy')" /></li>
              <li><gc-rich [text]="t('recipe.help.save.open')" /></li>
            </ul>
          </li>
          <li>
            <h3>{{ t('recipe.help.compare.heading') }}</h3>
            <p><gc-rich [text]="t('recipe.help.compare.text')" /></p>
            <p><gc-rich [text]="t('recipe.help.compare.modern')" /></p>
            <p><gc-rich [text]="t('recipe.help.compare.lead')" /></p>
            <p><gc-rich [text]="t('recipe.help.compare.shelf')" /></p>
            <p><gc-rich [text]="t('recipe.help.compare.tries')" /></p>
          </li>
          <li>
            <h3>{{ t('recipe.help.print.heading') }}</h3>
            <p><gc-rich [text]="t('recipe.help.print.text')" /></p>
          </li>
        </ol>
        <p class="recipe-help-tips"><gc-rich [text]="t('recipe.help.tips')" [links]="{ materials: '/material' }" /></p>
      </section>
    }
  </ng-container>`
})
export class RecipeHelp {
  protected readonly hidden = signal(readHidden());
  private readonly reopen = viewChild<ElementRef<HTMLElement>>('reopen');
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly injector = inject(Injector);

  protected setHidden(hidden: boolean): void {
    this.hidden.set(hidden);
    // The button pressed is replaced; the focus goes to what replaces it.
    afterNextRender(() => (hidden ? this.reopen() : this.heading())?.nativeElement.focus(), {
      injector: this.injector
    });
    try {
      if (hidden) localStorage.setItem(HIDDEN_KEY, 'hidden');
      else localStorage.removeItem(HIDDEN_KEY);
    } catch {
      // Without storage it is remembered for this visit only.
    }
  }
}
