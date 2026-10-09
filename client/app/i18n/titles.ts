import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/**
 * A route's title is the key of its message (titles.recipe): the tab shows
 * "Recipes - Glazecalc" in the page's language.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitles extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    if (key) this.title.setTitle(this.transloco.translate(key));
  }
}
