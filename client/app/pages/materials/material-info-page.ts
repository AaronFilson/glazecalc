import { toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { map } from 'rxjs';
import { OXIDE_GROUPS, formatFormula, materialWeights } from '../../../../lib/chemistry';
import type { MaterialWeights } from '../../../../lib/chemistry';
import { Material } from '../../core/models';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { RichText } from '../../i18n/rich-text';
import { fixed, listOf, upTo } from '../../shared/format';
import { CATEGORY_LABELS, hasLead, statusText } from '../../shared/library-info';
import { PageHeader } from '../../shared/page-header';
import { StructuredData, referencePage } from '../../shared/structured-data';
import { SHORT_NAME } from './material-route';
import { REFERENCE_LANGUAGE_LIST, referenceText } from './reference-text';
import { materialNamed, materialPath } from './standard-materials';

/** One oxide of a material: what its record gives, and what it adds to a recipe's unity formula. */
export interface OxideRow {
  oxide: string;
  amount: string;
  unity: number | null;
}

/** A material's analysis as Glazecalc works it out (lib/chemistry): the rows, and the weights; null if it cannot. */
export function analysisOf(material: Material): { rows: OxideRow[]; weights: MaterialWeights | null } {
  let weights: MaterialWeights | null = null;
  try {
    weights = materialWeights(material);
  } catch {
    weights = null;
  }
  return {
    rows: material.fields.map((field) => ({
      oxide: field.name,
      amount: String(field.amount),
      unity: weights?.unity[field.name] ?? null
    })),
    weights
  };
}

/** Whether a material has a flux among its oxides; if not, its unity is per formula as written. */
export const hasFlux = (material: Material): boolean =>
  material.fields.some((field) => ['R2O', 'RO'].includes(OXIDE_GROUPS[field.name] ?? ''));

/** The page of a standard material: what its record says, its analysis, and its hazards. */
@Component({
  selector: 'gc-material-info-page',
  imports: [PageHeader, RichText, RouterLink, StructuredData, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-structured-data [data]="structured()" />
    <gc-page-header [title]="material().name" [lead]="t('reference.material.lead')" />
    @if (!translated()) {
      <p class="guide-note">{{ t('reference.notTranslated') }}</p>
    }

    <section class="panel" aria-labelledby="about">
      <h2 id="about">{{ t('reference.material.aboutHeading') }}</h2>
      <dl class="facts">
        <dt>{{ t('reference.material.kind') }}</dt>
        <dd>{{ kind() }}</dd>
        @if (status()) {
          <dt>{{ t('reference.material.status') }}</dt>
          <dd>{{ status() }}</dd>
        }
        @if (material().rawformula) {
          <dt>{{ t('reference.material.formula') }}</dt>
          <dd translate="no">{{ formula() }}</dd>
        }
        @if (material().aliases?.length) {
          <dt>{{ t('reference.material.alsoCalled') }}</dt>
          <dd>{{ aliases() }}</dd>
        }
        @if (material().manufacturer) {
          <dt>{{ t('reference.material.madeBy') }}</dt>
          <dd>{{ material().manufacturer }}</dd>
        }
        @if (material().region?.length) {
          <dt>{{ t('reference.material.soldIn') }}</dt>
          <dd>{{ regions() }}</dd>
        }
        @if (similar().length) {
          <dt>{{ t('reference.material.similar') }}</dt>
          <dd>
            @for (item of similar(); track item.name; let last = $last) {
              @if (item.path) {
                <a [routerLink]="item.path">{{ item.name }}</a>
              } @else {
                {{ item.name }}
              }
              @if (!last) {
                {{ ', ' }}
              }
            }
          </dd>
        }
        @if (replaces().length) {
          <dt>{{ t('reference.material.replaces') }}</dt>
          <dd>
            @for (item of replaces(); track item.name; let last = $last) {
              @if (item.path) {
                <a [routerLink]="item.path">{{ item.name }}</a>
              } @else {
                {{ item.name }}
              }
              @if (!last) {
                {{ ', ' }}
              }
            }
          </dd>
        }
        @if (material().source; as source) {
          <dt>{{ t('reference.material.source') }}</dt>
          <dd>
            @if (source.url) {
              <a [href]="source.url" rel="noopener">{{ sourceName() }}</a>
            } @else {
              {{ sourceName() }}
            }
            @if (source.date) {
              ({{ source.date }})
            }
          </dd>
        }
      </dl>
      @for (note of notes(); track $index) {
        <p [attr.lang]="note.english ? 'en' : null">{{ note.text }}</p>
      }
    </section>

    <section class="panel" aria-labelledby="analysis">
      <h2 id="analysis">{{ t('reference.material.analysisHeading') }}</h2>
      @if (analysis().weights) {
        <p>
          {{
            t(
              material().percentmole === 'percent'
                ? 'reference.material.analysisPercent'
                : 'reference.material.analysisMolecular',
              {
                name: material().name
              }
            )
          }}
        </p>
        @if (!flux()) {
          <p>{{ t('reference.material.noFlux', { name: material().name }) }}</p>
        }
        <div
          class="guide-table-scroll"
          tabindex="0"
          role="region"
          [attr.aria-label]="t('reference.material.tableCaption', { name: material().name })"
        >
          <table class="guide-table">
            <caption>
              {{
                t('reference.material.tableCaption', { name: material().name })
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('reference.material.oxide') }}</th>
                <th scope="col" class="num">
                  {{
                    t(
                      material().percentmole === 'percent'
                        ? 'reference.material.amountPercent'
                        : 'reference.material.amountMolecular'
                    )
                  }}
                </th>
                <th scope="col" class="num">{{ t('reference.material.unity') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of analysis().rows; track row.oxide) {
                <tr>
                  <th scope="row" translate="no">{{ formatFormula(row.oxide) }}</th>
                  <td class="num">{{ row.amount }}</td>
                  <td class="num">{{ row.unity === null ? '' : fixed(row.unity, 3) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <dl class="facts">
          <dt>{{ t('reference.material.equivalent') }}</dt>
          <dd>{{ upTo(analysis().weights!.equivalent, 2) }}</dd>
          <dt>{{ t('reference.material.fired') }}</dt>
          <dd>{{ upTo(analysis().weights!.firedWeight, 2) }}</dd>
          <dt>{{ t('reference.material.loi') }}</dt>
          <dd>{{ t('reference.material.loiValue', { value: upTo(analysis().weights!.loi, 2) }) }}</dd>
        </dl>
        <p class="muted">{{ t('reference.material.weightsNote', { name: material().name }) }}</p>
      } @else {
        <p>{{ t('reference.material.noAnalysis') }}</p>
      }
    </section>

    <section class="panel" aria-labelledby="hazards">
      <h2 id="hazards">{{ t('reference.material.hazardsHeading') }}</h2>
      @if (lead()) {
        <p class="guide-warning" role="note">{{ t('reference.material.hasLead') }}</p>
      }
      @if (hazards(); as hazards) {
        <p>{{ t('reference.material.hazards', { hazards: hazards }) }}</p>
      } @else {
        <p>{{ t('reference.material.noHazards') }}</p>
      }
      <p>
        <gc-rich
          [text]="t('reference.material.care')"
          [links]="{ mixing: '/guides/safe-mixing', home: '/guides/home-safety' }"
        />
      </p>
    </section>

    <section class="panel" aria-labelledby="use">
      <h2 id="use">{{ t('reference.material.useHeading') }}</h2>
      <p>{{ t('reference.material.use', { name: material().name }) }}</p>
      <p>
        <a class="btn btn-primary" routerLink="/recipe">{{ t('reference.material.useLink') }}</a>
        <a class="btn btn-light border all-link" routerLink="/materials">{{ t('reference.material.allLink') }}</a>
      </p>
    </section>
  </ng-container>`,
  styles: `
    .facts dt {
      font-weight: 600;
    }
    .facts dd {
      margin: 0 0 0.5rem;
    }
    .all-link {
      margin-inline-start: 0.5rem;
    }
  `
})
export class MaterialInfoPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly language = inject(PAGE_LANGUAGE);
  private readonly referenceLanguages = inject(REFERENCE_LANGUAGE_LIST);
  protected readonly formatFormula = formatFormula;
  protected readonly fixed = fixed;
  protected readonly upTo = upTo;

  protected readonly material = toSignal(this.route.data.pipe(map((data) => data['material'] as Material)), {
    requireSync: true
  });
  protected readonly analysis = computed(() => analysisOf(this.material()));
  protected readonly flux = computed(() => hasFlux(this.material()));
  protected readonly lead = computed(() => hasLead(this.material()));
  protected readonly formula = computed(() => formatFormula(this.material().rawformula));
  protected readonly kind = computed(() => CATEGORY_LABELS[this.material().category ?? 'other'] ?? '');
  protected readonly status = computed(() => statusText(this.material()));
  protected readonly aliases = computed(() => listOf(this.material().aliases ?? [], 'unit'));
  protected readonly regions = computed(() => listOf(this.material().region ?? [], 'unit'));
  /** Whether the page is in a language the reference pages are translated into (English is). */
  protected readonly translated = computed(() => this.referenceLanguages.includes(this.language));
  private readonly textOf = (text: string) => referenceText(text, 'materials', this.language, this.referenceLanguages);
  protected readonly notes = computed(() => {
    const notes = this.material().notes;
    return (Array.isArray(notes) ? notes : notes ? [notes] : []).map(this.textOf);
  });
  /** The hazards in the page's language; '' for none. */
  protected readonly hazards = computed(() => {
    const { hazards } = this.material();
    return hazards ? this.textOf(hazards).text : '';
  });
  /** "Theoretical formula" is translated; the other sources are citations, as printed. */
  protected readonly sourceName = computed(() => {
    const name = this.material().source?.name;
    return name ? this.textOf(name).text : '';
  });
  /** Other names that have a page of their own are links. */
  private readonly named = (names: readonly string[] | undefined) =>
    (names ?? []).map((name) => {
      const found = materialNamed(name);
      return { name, path: found ? materialPath(found) : null };
    });
  protected readonly similar = computed(() => this.named(this.material().substitutes));
  protected readonly replaces = computed(() => this.named(this.material().replaces));

  /** What search engines read about the page (shared/structured-data.ts). */
  protected readonly structured = computed(() => {
    const { name } = this.material();
    const params = { name };
    const description = translate(
      name.length <= SHORT_NAME ? marker('meta.materialInfoLong') : marker('meta.materialInfo'),
      params
    );
    const title = translate('titles.materialInfo', params).replace(/ - Glazecalc$/, '');
    return referencePage(title, description, materialPath(this.material()), [
      { name: 'Glazecalc', path: '/' },
      { name: translate('reference.materials.crumb'), path: '/materials' },
      { name, path: materialPath(this.material()) }
    ]);
  });
}
