import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/**
 * A route's title is the key of its message (titles.recipe): the tab shows
 * "Recipes - Glazecalc" in the page's language. A public page may also name
 * its description (data: { description: 'meta.guides' }). The title and
 * description go into the head's tags too, for search results and link
 * previews. The prerender writes them, and in-app navigation keeps them right.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitles extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly transloco = inject(TranslocoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    if (!key) return;
    const title = this.transloco.translate(key);
    this.title.setTitle(title);
    const description = this.description(snapshot);
    // Only tags the page has: the server writes them (server/lib/pages.ts).
    this.set('property="og:title"', title);
    this.set('name="description"', description);
    this.set('property="og:description"', description);
  }

  private set(selector: string, content: string): void {
    if (this.meta.getTag(selector)) this.meta.updateTag({ content }, selector);
  }

  /**
   * The page's own description. A language that has not translated it yet shows
   * its description of the whole site, not the English one.
   */
  private description(snapshot: RouterStateSnapshot): string {
    let route: ActivatedRouteSnapshot | null = snapshot.root;
    let key: string | undefined;
    while (route) {
      key = route.data['description'] ?? key;
      route = route.firstChild;
    }
    const language = this.transloco.getActiveLang();
    const own = !!key && (language === 'en' || !!this.transloco.getTranslation(language)[key]);
    return this.transloco.translate(own ? key! : 'meta.description');
  }
}
