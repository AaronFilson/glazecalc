import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/**
 * A route's title is the key of its message (titles.recipe): the tab shows
 * "Recipes - Glazecalc" in the page's language. A public page may also name
 * its description (data: { description: 'meta.guides' }), and the values both
 * have in them (data: { titleParams: { name: 'Silica' } }). The title and
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
    const params = this.dataOf(snapshot, 'titleParams') as Record<string, string | number> | undefined;
    const title = this.transloco.translate(key, params);
    this.title.setTitle(title);
    const description = this.description(snapshot, params);
    // Only tags the page has: the server writes them (server/lib/pages.ts).
    this.set('property="og:title"', title);
    this.set('name="description"', description);
    this.set('property="og:description"', description);
  }

  private set(selector: string, content: string): void {
    if (this.meta.getTag(selector)) this.meta.updateTag({ content }, selector);
  }

  /** What the deepest route that has it gives under a name of its data (a page's values, such as a material's name). */
  private dataOf(snapshot: RouterStateSnapshot, name: string): unknown {
    let route: ActivatedRouteSnapshot | null = snapshot.root;
    let value: unknown;
    while (route) {
      value = route.data[name] ?? value;
      route = route.firstChild;
    }
    return value;
  }

  /**
   * The page's own description. A language that has not translated it yet shows
   * its description of the whole site, not the English one. `params` are the
   * page's values, as for its title (data: { titleParams }).
   */
  private description(snapshot: RouterStateSnapshot, params?: Record<string, string | number>): string {
    const key = this.dataOf(snapshot, 'description') as string | undefined;
    const language = this.transloco.getActiveLang();
    const own = !!key && (language === 'en' || !!this.transloco.getTranslation(language)[key]);
    return this.transloco.translate(own ? key! : 'meta.description', own ? params : undefined);
  }
}
