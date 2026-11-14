import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { map } from 'rxjs';
import { OXIDE_GROUPS, formatFormula, materialWeights, oxidesGivenIn } from '../../../../lib/chemistry';
import type { MaterialWeights } from '../../../../lib/chemistry';
import { AuthService } from '../../core/auth.service';
import { Material } from '../../core/models';
import { PendingRecipeService } from '../../core/pending-recipe.service';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { RichText } from '../../i18n/rich-text';
import { fixed, listOf, upTo } from '../../shared/format';
import { CATEGORY_LABELS, hasLead, statusText } from '../../shared/library-info';
import { Breadcrumb } from '../../shared/breadcrumb';
import { PageHeader } from '../../shared/page-header';
import { type Crumb, StructuredData, referencePage } from '../../shared/structured-data';
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

/**
 * Whether a material has a flux among its oxides; if not, its unity is per formula as written, or per 100 g for an
 * analysis in percent.
 */
export const hasFlux = (material: Material): boolean =>
  material.fields.some((field) => ['R2O', 'RO'].includes(OXIDE_GROUPS[field.name] ?? ''));

/**
 * Fluxes under this share of a material's oxides, counted in moles, are little, as in a kaolin, a ball clay,
 * silica or alumina, whose fluxes are impurities; a feldspar, a frit or a flux has more.
 */
export const LITTLE_FLUX = 0.05;

/**
 * What a material's equivalent weight is (lib/chemistry/materials.js materialWeights): the grams that hold 1.0
 * mole of flux ('flux'), which is large where the material has little flux ('little'); with no flux, the weight
 * of its formula as written ('formula'), or 100 g for an analysis in percent ('analysis').
 */
export function equivalentKind(
  material: Material,
  weights: MaterialWeights
): 'flux' | 'little' | 'formula' | 'analysis' {
  let flux = 0;
  let all = 0;
  for (const [oxide, moles] of Object.entries(weights.unity)) {
    all += moles;
    if (['R2O', 'RO'].includes(OXIDE_GROUPS[oxide] ?? '')) flux += moles;
  }
  if (!(flux > 0)) return oxidesGivenIn(material) === 'percent' ? 'analysis' : 'formula';
  return flux < LITTLE_FLUX * all ? 'little' : 'flux';
}

/** The sentence under the weights, for each kind of equivalent weight. */
const WEIGHTS_NOTES = {
  flux: marker('reference.material.weightsNote'),
  little: marker('reference.material.weightsNoteLittleFlux'),
  formula: marker('reference.material.weightsNoteNoFluxFormula'),
  analysis: marker('reference.material.weightsNoteNoFluxAnalysis')
};

/**
 * The sentence on a material with no flux, for each kind (as equivalentKind tells them apart): its unity is per its
 * formula as written ('formula'), or per the 100 g an analysis in percent is given for ('analysis').
 */
const NO_FLUX_NOTES = {
  formula: marker('reference.material.noFlux'),
  analysis: marker('reference.material.noFluxAnalysis')
};

/** The page of a standard material: what its record says, its analysis, and its hazards. */
@Component({
  selector: 'gc-material-info-page',
  imports: [Breadcrumb, PageHeader, RichText, RouterLink, StructuredData, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-structured-data [data]="structured()" />
    <gc-breadcrumb [crumbs]="crumbs()" />
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
                <span>{{ item.name }}</span>
              }
              @if (!last) {
                <span>, </span>
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
                <span>{{ item.name }}</span>
              }
              @if (!last) {
                <span>, </span>
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
            t(inPercent() ? 'reference.material.analysisPercent' : 'reference.material.analysisMolecular', {
              name: material().name
            })
          }}
        </p>
        @if (!flux()) {
          <p>{{ t(noFluxNote(), { name: material().name }) }}</p>
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
                  {{ t(inPercent() ? 'reference.material.amountPercent' : 'reference.material.amountMolecular') }}
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
        <p class="muted">{{ t(weightsNote(), { name: material().name }) }}</p>
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
        <a
          id="material-try"
          class="btn btn-primary"
          [href]="recipeAddress"
          [attr.aria-busy]="starting() || null"
          (click)="useInRecipe($event)"
          >{{ t('reference.material.useLink') }}</a
        >
        <a class="btn btn-light border all-link" routerLink="/materials">{{ t('reference.material.allLink') }}</a>
      </p>
      @if (!auth.shownSession() || auth.shownTrial()) {
        <p>
          <a id="material-signup" class="btn btn-success" routerLink="/signup" [queryParams]="{ next: path() }">{{
            t('nav.createAccount')
          }}</a>
        </p>
      }
      <ul class="guide-links">
        <li>
          <a routerLink="/guides/glazing-basics">{{ guideTitle(t('titles.glazingBasics')) }}</a>
        </li>
        <li>
          <a routerLink="/guides/making-a-glaze">{{ guideTitle(t('titles.makingAGlaze')) }}</a>
        </li>
      </ul>
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
    .guide-links {
      margin: 0;
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
  /** Whether its oxides are weight percent, as the chemistry reads them (a record may keep 'Percent'), or moles. */
  protected readonly inPercent = computed(() => oxidesGivenIn(this.material()) === 'percent');
  /** What the unity of a material with no flux is per, as the sentence on it says: its formula, or 100 g. */
  protected readonly noFluxNote = computed(() => NO_FLUX_NOTES[this.inPercent() ? 'analysis' : 'formula']);
  /** What the equivalent weight is for this material, as the sentence under it says. */
  protected readonly weightsNote = computed(() => {
    const weights = this.analysis().weights;
    return WEIGHTS_NOTES[weights ? equivalentKind(this.material(), weights) : 'flux'];
  });
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

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pending = inject(PendingRecipeService);
  /** This page's address as the router writes it, for sign-up to come back to (?next=, auth-page.ts). */
  protected readonly path = computed(() => materialPath(this.material()));
  /** Whether the main button is starting a trial. */
  protected readonly starting = signal(false);
  /**
   * The main button's address in the page's language (/de/recipe), for a new tab. Not a routerLink, whose own
   * navigation would take a visitor to the sign-in page while their trial starts.
   */
  protected readonly recipeAddress = inject(Location).prepareExternalUrl('/recipe');
  /** A guide's name from its page title: "How to make a glaze - Glazecalc" is "How to make a glaze". */
  protected readonly guideTitle = (title: string): string => title.replace(/ - Glazecalc$/, '');

  /**
   * The main button: a new recipe with this material in it, on the recipe page. A visitor
   * not signed in gets a trial first, without being asked (POST /api/guest), so the first
   * visit from a search ends in the calculator. A trial that cannot start leaves the recipe
   * page to ask for a sign-in, with the recipe still waiting. A click that opens a new tab
   * or window is the link's own.
   */
  protected async useInRecipe(event: MouseEvent): Promise<void> {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (this.starting()) return;
    this.starting.set(true);
    try {
      await this.auth.whenChecked();
      if (!this.auth.hasSession()) await this.auth.startTrial();
    } catch {
      // The recipe page's guard sends the visitor to sign in.
    }
    const material = this.material();
    this.pending.put({ title: material.name, materials: [{ ...material, amount: '' }] });
    try {
      await this.router.navigateByUrl('/recipe');
    } finally {
      this.starting.set(false);
    }
  }

  /** What search engines read about the page (shared/structured-data.ts). */
  protected readonly structured = computed(() => {
    const { name } = this.material();
    const params = { name };
    const description = translate(
      name.length <= SHORT_NAME ? marker('meta.materialInfoLong') : marker('meta.materialInfo'),
      params
    );
    const title = translate('titles.materialInfo', params).replace(/ - Glazecalc$/, '');
    // At the page's own address in a language it is translated into (lib/pages.js); the English in any other.
    return referencePage(
      title,
      description,
      materialPath(this.material()),
      this.crumbs(),
      'WebPage',
      this.translated() ? this.language : 'en'
    );
  });

  /** The trail to the page: what the page shows (gc-breadcrumb) and search engines read (shared/structured-data.ts). */
  protected readonly crumbs = computed<Crumb[]>(() => [
    { name: 'Glazecalc', path: '/' },
    { name: translate('reference.materials.crumb'), path: '/materials' },
    { name: this.material().name, path: materialPath(this.material()) }
  ]);
}
