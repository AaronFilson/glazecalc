import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { map } from 'rxjs';
import { formatFormula } from '../../../../lib/chemistry';
import { regionFor } from '../../../../lib/regions';
import { AuthService } from '../../core/auth.service';
import { Material, Recipe } from '../../core/models';
import { PendingRecipeService } from '../../core/pending-recipe.service';
import { PreferencesService } from '../../core/preferences.service';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { fixed, formatPlain } from '../../shared/format';
import { REGIONS, chosenRegion } from '../../shared/library-info';
import { Breadcrumb } from '../../shared/breadcrumb';
import { PageHeader } from '../../shared/page-header';
import { type Crumb, StructuredData, referencePage } from '../../shared/structured-data';
import { RecipeLimits } from '../recipe/recipe-limits';
import {
  FamousGlaze,
  LocalVersion,
  celsiusText,
  localVersion,
  nameIn,
  nativeRecipe,
  nativeUnity,
  offeredIn,
  proseIn
} from './famous-glaze';

/** The atmospheres' names, as the keys of their messages. */
export const ATMOSPHERE_KEYS: Readonly<Record<string, string>> = {
  oxidation: marker('famous.atmospheres.oxidation'),
  reduction: marker('famous.atmospheres.reduction'),
  neutral: marker('famous.atmospheres.neutral'),
  wood: marker('famous.atmospheres.wood'),
  salt: marker('famous.atmospheres.salt'),
  soda: marker('famous.atmospheres.soda')
};

const VERDICT_KEYS: Readonly<Record<LocalVersion['verdict'], string>> = {
  close: marker('famous.local.close'),
  fair: marker('famous.local.fair'),
  poor: marker('famous.local.poor')
};

/** The order of a unity formula's rows: fluxes, then the middle, then the glass formers. */
const unityRows = (unity: Record<string, number>): Array<{ oxide: string; amount: number }> =>
  Object.entries(unity)
    .filter(([, amount]) => amount > 0.0005)
    .map(([oxide, amount]) => ({ oxide, amount }));

/**
 * A famous glaze's page (docs/famous-glazes.md): what it is and where it comes from, its native recipe
 * with its unity formula and limits as the recipe page shows them (or, for a lead glaze, its historic
 * analysis alone), the version from the materials sold where the reader is, its safety notes, and every
 * source. The main button opens the recipe as the material pages' does: a trial first for a visitor.
 */
@Component({
  selector: 'gc-famous-glaze-page',
  imports: [Breadcrumb, PageHeader, RecipeLimits, RouterLink, StructuredData, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-structured-data [data]="structured()" />
    <gc-breadcrumb [crumbs]="crumbs()" />
    <gc-page-header [title]="name()" [lead]="t('famous.glaze.lead', { native: glaze().native.name })" />
    @if (english()) {
      <p class="guide-note">{{ t('famous.notTranslated') }}</p>
    }

    <section class="panel" aria-labelledby="famous-about">
      <h2 id="famous-about">{{ t('famous.glaze.aboutHeading', { name: name() }) }}</h2>
      <p [attr.lang]="summary().english ? 'en' : null">{{ summary().text }}</p>
      <dl class="facts">
        <dt>{{ t('famous.glaze.nativeName') }}</dt>
        <dd>
          <span [attr.lang]="glaze().native.lang">{{ glaze().native.name }}</span>
        </dd>
        <dt>{{ t('famous.glaze.origin') }}</dt>
        <dd [attr.lang]="origin().english ? 'en' : null">{{ origin().text }}</dd>
        <dt>{{ t('famous.glaze.period') }}</dt>
        <dd [attr.lang]="period().english ? 'en' : null">{{ period().text }}</dd>
        <dt>{{ t('famous.glaze.firing') }}</dt>
        <dd>
          {{ firingText() }}
          @if (firingNote().text) {
            <br /><span [attr.lang]="firingNote().english ? 'en' : null">{{ firingNote().text }}</span>
          }
        </dd>
      </dl>
    </section>

    @if (glaze().lead) {
      <p class="guide-warning" role="note" id="famous-history">{{ t('famous.glaze.historyOnly') }}</p>
    }

    @if (glaze().recipe; as recipe) {
      <section class="panel" aria-labelledby="famous-recipe">
        <h2 id="famous-recipe">{{ t('famous.glaze.recipeHeading') }}</h2>
        @if (recipeNote().text) {
          <p [attr.lang]="recipeNote().english ? 'en' : null">{{ recipeNote().text }}</p>
        }
        <table class="table table-sm famous-table">
          <thead>
            <tr>
              <th scope="col">{{ t('famous.glaze.material') }}</th>
              <th scope="col" class="num">{{ t('famous.glaze.amount') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (line of recipe.lines; track line.record.name) {
              <tr>
                <th scope="row">
                  <bdi>{{ line.record.name }}</bdi>
                </th>
                <td class="num">{{ formatPlain(line.amount) }}</td>
              </tr>
            }
            @for (line of recipe.additives; track line.record.name) {
              <tr>
                <th scope="row">
                  <bdi>+ {{ line.record.name }}</bdi>
                </th>
                <td class="num">{{ formatPlain(line.amount) }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (unity(); as unity) {
          <h3 class="h5">{{ t('famous.glaze.unityHeading') }}</h3>
          <table class="table table-sm famous-table" id="famous-unity">
            <tbody>
              @for (row of unityRows(unity); track row.oxide) {
                <tr>
                  <th scope="row" translate="no">{{ formatFormula(row.oxide) }}</th>
                  <td class="num">{{ fixed(row.amount, 3) }}</td>
                </tr>
              }
            </tbody>
          </table>
          <gc-recipe-limits [unity]="unity" [materials]="lineNames()" />
        }
      </section>
    }

    @if (glaze().analysis; as analysis) {
      <section class="panel" aria-labelledby="famous-analysis">
        <h2 id="famous-analysis">{{ t('famous.glaze.analysisHeading') }}</h2>
        @if (analysisNote().text) {
          <p [attr.lang]="analysisNote().english ? 'en' : null">{{ analysisNote().text }}</p>
        }
        <table class="table table-sm famous-table">
          <thead>
            <tr>
              <th scope="col">{{ t('famous.glaze.oxide') }}</th>
              <th scope="col" class="num">{{ t('famous.glaze.percent') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of analysisRows(); track row.oxide) {
              <tr>
                <th scope="row" translate="no">{{ formatFormula(row.oxide) }}</th>
                <td class="num">{{ formatPlain(row.amount) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }

    <section class="panel" aria-labelledby="famous-local">
      <h2 id="famous-local">
        {{ glaze().lead ? t('famous.local.leadFreeHeading') : t('famous.local.heading') }}
      </h2>
      @if (glaze().leadFree; as version) {
        <p [attr.lang]="leadFreeNote().english ? 'en' : null">{{ leadFreeNote().text }}</p>
        @if (!version.tested) {
          <p class="guide-warning" role="note" id="famous-untested">
            <strong>{{ t('famous.local.untested') }}</strong> {{ t('famous.local.testFirst') }}
          </p>
        }
      } @else {
        <p>{{ t('famous.local.intro') }}</p>
        @if (glaze().recipe?.tested === false) {
          <p class="guide-warning" role="note" id="famous-untested">
            <strong>{{ t('famous.local.untested') }}</strong> {{ t('famous.local.testFirst') }}
          </p>
        }
      }
      <label class="form-label" for="famous-region">{{ t('famous.local.region') }}</label>
      <select
        id="famous-region"
        class="form-select famous-region"
        [value]="library()"
        (change)="pickLibrary($any($event.target).value)"
      >
        @for (option of regions; track option.value) {
          <option [value]="option.value">
            {{ option.value ? option.label : glaze().leadFree ? t('famous.local.proposal') : t('famous.local.pick') }}
          </option>
        }
      </select>
      @if (local(); as version) {
        <table class="table table-sm famous-table" id="famous-local-recipe">
          <tbody>
            @for (line of version.materials; track line.name) {
              <tr>
                <th scope="row">
                  <bdi>{{ line.name }}</bdi>
                </th>
                <td class="num">{{ formatPlain(line.amount) }}</td>
              </tr>
            }
            @for (line of version.additives; track line.name) {
              <tr>
                <th scope="row">
                  <bdi>+ {{ line.name }}</bdi>
                </th>
                <td class="num">{{ formatPlain(line.amount) }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="small">{{ t(verdictKeys[version.verdict]) }}</p>
      } @else if (localTried()) {
        <p>{{ library() ? t('famous.local.none') : t('famous.local.choose') }}</p>
      }
    </section>

    <section class="panel" aria-labelledby="famous-use">
      <h2 id="famous-use">{{ t('famous.glaze.useHeading') }}</h2>
      <p>
        <a
          id="famous-open"
          class="btn btn-primary"
          routerLink="/recipe"
          [attr.aria-busy]="starting() || null"
          (click)="open($event)"
          >{{ glaze().lead ? t('famous.glaze.openLeadFree') : t('famous.glaze.open') }}</a
        >
        <a class="btn btn-light border all-link" routerLink="/famous-glazes">{{ t('famous.glaze.allLink') }}</a>
      </p>
      @if (!auth.shownSession() || auth.shownTrial()) {
        <p>
          <a id="famous-signup" class="btn btn-success" routerLink="/signup" [queryParams]="{ next: path() }">{{
            t('nav.createAccount')
          }}</a>
        </p>
      }
    </section>

    <section class="panel" aria-labelledby="famous-safety">
      <h2 id="famous-safety">{{ t('famous.glaze.safetyHeading') }}</h2>
      <p [attr.lang]="safety().english ? 'en' : null">{{ safety().text }}</p>
      <ul class="guide-links">
        <li>
          <a routerLink="/guides/safe-mixing">{{ t('famous.glaze.safeMixing') }}</a>
        </li>
        <li>
          <a routerLink="/guides/firing">{{ t('famous.glaze.firingGuide') }}</a>
        </li>
        <li>
          <a routerLink="/guides/making-a-glaze">{{ t('famous.glaze.makingGuide') }}</a>
        </li>
      </ul>
    </section>

    <section class="panel" aria-labelledby="famous-sources">
      <h2 id="famous-sources">{{ t('famous.glaze.sourcesHeading') }}</h2>
      <ol class="famous-sources">
        @for (source of glaze().sources; track source.id) {
          <li [id]="'source-' + source.id">
            <span lang="und">{{ source.citation }}</span>
            @if (source.url) {
              <a [href]="source.url" rel="noopener">{{ t('famous.glaze.link') }}</a>
            } @else if (source.isbn) {
              ISBN {{ source.isbn }}
            }
            @if (source.opened) {
              <span class="muted">({{ t('famous.glaze.opened', { date: source.opened }) }})</span>
            }
          </li>
        }
      </ol>
    </section>
  </ng-container>`,
  styles: `
    .facts dt {
      font-weight: 600;
    }
    .facts dd {
      margin: 0 0 0.5rem;
    }
    .famous-table {
      max-width: 28rem;
    }
    .famous-table th[scope='row'] {
      font-weight: normal;
    }
    .num {
      text-align: end;
      font-variant-numeric: tabular-nums;
    }
    .famous-region {
      max-width: 20rem;
      margin-bottom: 0.75rem;
    }
    .all-link {
      margin-inline-start: 0.5rem;
    }
  `
})
export class FamousGlazePage {
  private readonly route = inject(ActivatedRoute);
  protected readonly language = inject(PAGE_LANGUAGE);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pending = inject(PendingRecipeService);
  private readonly preferences = inject(PreferencesService);
  protected readonly formatFormula = formatFormula;
  protected readonly formatPlain = formatPlain;
  protected readonly fixed = fixed;
  protected readonly unityRows = unityRows;
  protected readonly regions = REGIONS;
  protected readonly verdictKeys = VERDICT_KEYS;

  protected readonly glaze = toSignal(this.route.data.pipe(map((data) => data['glaze'] as FamousGlaze)), {
    requireSync: true
  });
  protected readonly name = computed(() => nameIn(this.glaze(), this.language));
  private readonly prose = (text: FamousGlaze['summary'] | undefined) => proseIn(text, this.language);
  protected readonly summary = computed(() => this.prose(this.glaze().summary));
  protected readonly origin = computed(() => this.prose(this.glaze().origin));
  protected readonly period = computed(() => this.prose(this.glaze().period));
  protected readonly safety = computed(() => this.prose(this.glaze().safety));
  protected readonly firingNote = computed(() => this.prose(this.glaze().firing.note));
  protected readonly recipeNote = computed(() => this.prose(this.glaze().recipe?.note));
  protected readonly analysisNote = computed(() => this.prose(this.glaze().analysis?.note));
  protected readonly leadFreeNote = computed(() => this.prose(this.glaze().leadFree?.note));
  /** Whether any of the glaze's own words show in English on a page in another language. */
  protected readonly english = computed(() =>
    [this.summary(), this.origin(), this.period(), this.safety()].some((text) => text.english)
  );
  protected readonly firingText = computed(() => {
    const { cone, celsius, atmosphere } = this.glaze().firing;
    const parts = [cone ? translate('famous.glaze.cone', { cone }) : '', celsiusText(celsius)].filter(Boolean);
    const air = ATMOSPHERE_KEYS[atmosphere];
    return [parts.join(', '), air ? translate(air) : atmosphere].filter(Boolean).join('; ');
  });
  protected readonly unity = computed(() => nativeUnity(this.glaze()));
  protected readonly lineNames = computed(() => (this.glaze().recipe?.lines ?? []).map((line) => line.record.name));
  protected readonly analysisRows = computed(() =>
    Object.entries(this.glaze().analysis?.oxides ?? {}).map(([oxide, amount]) => ({ oxide, amount }))
  );

  /** The library's region the version is made for: the reader's from Settings, or as chosen here. */
  protected readonly library = signal<string>(
    regionFor(this.preferences.region())?.library ??
      (REGIONS.some((r) => r.value === chosenRegion()) ? chosenRegion() : '')
  );
  /** The standard materials, which come in with the page's first solve (standard-materials.ts is large). */
  private readonly standard = signal<readonly Material[] | null>(null);
  protected readonly localTried = computed(() => this.standard() !== null);
  protected readonly local = computed(() => {
    const standard = this.standard();
    if (!standard) return null;
    return localVersion(this.glaze(), offeredIn(this.glaze(), this.library(), standard));
  });

  constructor() {
    // In the browser only: the build's render leaves the version to be worked out where the reader is.
    if (isPlatformBrowser(inject(PLATFORM_ID))) void this.loadStandard();
  }

  private async loadStandard(): Promise<void> {
    this.standard.set((await import('../materials/standard-materials')).STANDARD_MATERIALS);
  }

  protected pickLibrary(value: string): void {
    this.library.set(value);
  }

  protected readonly path = computed(() => '/famous-glazes/' + this.glaze().slug);
  protected readonly starting = signal(false);

  /** The recipe the main button opens: the native one, or for a lead glaze its lead-free version. */
  private recipeToOpen(): Recipe | null {
    const glaze = this.glaze();
    const native = nativeRecipe(glaze, this.name());
    if (native) return native;
    const version = this.local();
    if (!version) return null;
    return {
      title: translate('famous.glaze.leadFreeTitle', { name: this.name() }),
      notes: translate('famous.local.untestedNote'),
      materials: version.materials,
      additives: version.additives
    };
  }

  /** As the material pages' main button: a trial first for a visitor, then the recipe page with the recipe. */
  protected async open(event: MouseEvent): Promise<void> {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (this.starting()) return;
    this.starting.set(true);
    try {
      if (!this.standard()) await this.loadStandard();
      const recipe = this.recipeToOpen();
      try {
        await this.auth.whenChecked();
        if (!this.auth.hasSession()) await this.auth.startTrial();
      } catch {
        // The recipe page's guard sends the visitor to sign in.
      }
      if (recipe) this.pending.put(recipe);
      await this.router.navigateByUrl('/recipe');
    } finally {
      this.starting.set(false);
    }
  }

  /** The trail to the page: what the page shows (gc-breadcrumb) and search engines read (shared/structured-data.ts). */
  protected readonly crumbs = computed<Crumb[]>(() => [
    { name: 'Glazecalc', path: '/' },
    { name: translate('famous.index.crumb'), path: '/famous-glazes' },
    { name: this.name(), path: this.path() }
  ]);

  protected readonly structured = computed(() => {
    const params = { name: this.name(), native: this.glaze().native.name };
    return referencePage(
      translate('titles.famousGlaze', params).replace(/ - Glazecalc$/, ''),
      translate('meta.famousGlaze', params),
      this.path(),
      this.crumbs(),
      'WebPage',
      this.english() ? 'en' : this.language
    );
  });
}
