import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { RichText } from '../../i18n/rich-text';
import { CATEGORY_LABELS, byNameIn, statusText } from '../../shared/library-info';
import { PageHeader } from '../../shared/page-header';
import { StructuredData, referencePage } from '../../shared/structured-data';
import { STANDARD_MATERIALS, materialPath } from './standard-materials';

/** The standard materials, each linking to its own page (material-info-page.ts), by kind. */
@Component({
  selector: 'gc-materials-page',
  imports: [PageHeader, RichText, RouterLink, StructuredData, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-structured-data [data]="structured()" />
    <gc-page-header
      [title]="t('reference.materials.heading')"
      [lead]="t('reference.materials.lead', { count: count })"
    />
    @if (language !== 'en') {
      <p class="guide-note">{{ t('reference.notTranslated') }}</p>
    }
    <p>{{ t('reference.materials.intro') }}</p>
    <p>
      <gc-rich
        [text]="t('reference.materials.careAbout')"
        [links]="{ mixing: '/guides/safe-mixing', home: '/guides/home-safety' }"
      />
    </p>
    @for (group of groups(); track group.category) {
      <section class="panel" [attr.aria-labelledby]="'kind-' + group.category">
        <h2 [id]="'kind-' + group.category">{{ group.label }}</h2>
        <ul class="material-list">
          @for (item of group.materials; track item.path) {
            <li>
              <a [routerLink]="item.path">{{ item.name }}</a>
              @if (item.status) {
                <span class="status-badge">{{ item.status }}</span>
              }
            </li>
          }
        </ul>
      </section>
    }
    <p>
      <gc-rich [text]="t('reference.materials.own')" [links]="{ own: '/material', cones: '/cones' }" />
    </p>
  </ng-container>`,
  styles: `
    .material-list {
      columns: 16rem;
      column-gap: 1.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .material-list li {
      break-inside: avoid;
      overflow-wrap: anywhere;
      padding: 0.15rem 0;
    }
  `
})
export class MaterialsPage {
  protected readonly language = inject(PAGE_LANGUAGE);
  protected readonly count = STANDARD_MATERIALS.length;

  /** The materials by kind, in the order of CATEGORY_LABELS, each kind's by name. */
  protected readonly groups = computed(() => {
    const byName = byNameIn('en');
    return Object.entries(CATEGORY_LABELS)
      .map(([category, label]) => ({
        category,
        label,
        materials: STANDARD_MATERIALS.filter((material) => (material.category ?? 'other') === category)
          .sort(byName)
          .map((material) => ({ name: material.name, path: materialPath(material), status: statusText(material) }))
      }))
      .filter((group) => group.materials.length);
  });

  /** What search engines read about the page (shared/structured-data.ts). */
  protected readonly structured = computed(() =>
    referencePage(
      translate('titles.materials').replace(/ - Glazecalc$/, ''),
      translate('meta.materials'),
      '/materials',
      [
        { name: 'Glazecalc', path: '/' },
        { name: translate('reference.materials.crumb'), path: '/materials' }
      ],
      'CollectionPage'
    )
  );
}
