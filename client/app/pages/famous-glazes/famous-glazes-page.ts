import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { map } from 'rxjs';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { PageHeader } from '../../shared/page-header';
import { StructuredData, referencePage } from '../../shared/structured-data';
import { FamousGlaze, nameIn, proseIn } from './famous-data';

/**
 * The famous glazes (docs/famous-glazes.md): each published one, with its native name and where it comes
 * from. It opens only once one is published (famous-route.ts), and says more are coming.
 */
@Component({
  selector: 'gc-famous-glazes-page',
  imports: [PageHeader, RouterLink, StructuredData, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-structured-data [data]="structured()" />
    <gc-page-header [title]="t('famous.index.title')" [lead]="t('famous.index.lead')" />
    <section class="panel" aria-labelledby="famous-list">
      <h2 id="famous-list">{{ t('famous.index.listHeading') }}</h2>
      <ul class="famous-list">
        @for (item of items(); track item.slug) {
          <li>
            <a [routerLink]="'/famous-glazes/' + item.slug">{{ item.name }}</a>
            <span [attr.lang]="item.nativeLang"> ({{ item.native }})</span>
            <br />
            <span class="muted" [attr.lang]="item.originEnglish ? 'en' : null">{{ item.origin }}</span>
          </li>
        }
      </ul>
      <p>{{ t('famous.index.more') }}</p>
    </section>
  </ng-container>`,
  styles: `
    .famous-list li {
      margin-bottom: 0.75rem;
    }
  `
})
export class FamousGlazesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(PAGE_LANGUAGE);
  protected readonly glazes = toSignal(this.route.data.pipe(map((data) => data['glazes'] as FamousGlaze[])), {
    requireSync: true
  });
  protected readonly items = computed(() =>
    this.glazes().map((glaze) => {
      const origin = proseIn(glaze.origin, this.language);
      return {
        slug: glaze.slug,
        name: nameIn(glaze, this.language),
        native: glaze.native.name,
        nativeLang: glaze.native.lang,
        origin: origin.text,
        originEnglish: origin.english
      };
    })
  );
  protected readonly structured = computed(() =>
    referencePage(
      translate('titles.famousGlazes').replace(/ - Glazecalc$/, ''),
      translate('meta.famousGlazes'),
      '/famous-glazes',
      [
        { name: 'Glazecalc', path: '/' },
        { name: translate('famous.index.crumb'), path: '/famous-glazes' }
      ],
      'CollectionPage',
      this.language
    )
  );
}
