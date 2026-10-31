import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { ORTON, SK } from '../../../../lib/cones';
import { coneChoices, coneLabel } from '../../../../lib/cones/firing';
import { fahrenheit, inScale } from '../../../../lib/recipe/temperature';
import { LocaleService } from '../../core/locale.service';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { RichText } from '../../i18n/rich-text';
import { upTo } from '../../shared/format';
import { PageHeader } from '../../shared/page-header';
import { StructuredData, referencePage } from '../../shared/structured-data';
import { REFERENCE_LANGUAGE_LIST, referenceText } from './reference-text';

/** A cone's temperature in °C and °F, whole degrees: 1305 and 2381. */
const bothScales = (celsius: number): { c: string; f: string } => ({
  c: upTo(celsius, 0),
  f: upTo(Math.round(fahrenheit(celsius)), 0)
});

/**
 * The cone chart: Orton's cones and the SK cones with the temperatures Glazecalc's data gives them
 * (lib/cones/index.js), each chart with its heating rate and where it was read. The reader's cones come
 * first, and the temperatures are in both scales, the reader's first.
 */
@Component({
  selector: 'gc-cones-page',
  imports: [NgTemplateOutlet, PageHeader, RichText, StructuredData, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-structured-data [data]="structured()" />
    <gc-page-header [title]="t('reference.cones.heading')" [lead]="t('reference.cones.lead')" />
    @if (!translated) {
      <p class="guide-note">{{ t('reference.notTranslated') }}</p>
    }
    <p><gc-rich [text]="t('reference.cones.intro')" [links]="{ firing: '/guides/firing#cones' }" /></p>

    <ng-template #chart let-id="id" let-caption="caption" let-rows="rows">
      <div class="guide-table-scroll" tabindex="0" role="region" [attr.aria-label]="caption">
        <table class="guide-table">
          <caption>
            {{
              caption
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('reference.cones.cone') }}</th>
              <th scope="col" class="num">
                {{ fahrenheitFirst() ? t('reference.cones.fahrenheit') : t('reference.cones.celsius') }}
              </th>
              <th scope="col" class="num">
                {{ fahrenheitFirst() ? t('reference.cones.celsius') : t('reference.cones.fahrenheit') }}
              </th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row.cone) {
              <tr>
                <th scope="row">{{ row.cone }}</th>
                <td class="num">{{ fahrenheitFirst() ? row.f : row.c }}</td>
                <td class="num">{{ fahrenheitFirst() ? row.c : row.f }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </ng-template>

    @for (system of order(); track system) {
      @if (system === 'orton') {
        <section class="panel" aria-labelledby="orton">
          <h2 id="orton">{{ t('reference.cones.ortonHeading') }}</h2>
          <ng-container
            *ngTemplateOutlet="
              chart;
              context: {
                caption: t('reference.cones.ortonCaption', { rate: orton.rate, rateF: ortonRateF }),
                rows: ortonRows
              }
            "
          />
          <p class="muted" [attr.lang]="ortonNote.english ? 'en' : null">{{ ortonNote.text }}</p>
          <p>
            {{ t('reference.cones.ortonSource', { title: orton.title, reprinted: orton.reprintedBy }) }}
            <a [href]="orton.source" rel="noopener">{{ t('reference.cones.ortonSourceLink') }}</a>
          </p>
          <p>{{ t('reference.cones.above', { list: ortonAbove }) }}</p>

          <h3>{{ t('reference.cones.publishedHeading') }}</h3>
          <p>{{ t('reference.cones.publishedIntro', { year: published.year }) }}</p>
          <div
            class="guide-table-scroll"
            tabindex="0"
            role="region"
            [attr.aria-label]="t('reference.cones.publishedCaption', { unit: scale() })"
          >
            <table class="guide-table">
              <caption>
                {{
                  t('reference.cones.publishedCaption', { unit: scale() })
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ t('reference.cones.cone') }}</th>
                  @for (heading of publishedHeadings(); track $index) {
                    <th scope="col" class="num">{{ heading }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of publishedRows(); track row.cone) {
                  <tr>
                    <th scope="row">{{ row.cone }}</th>
                    @for (value of row.values; track $index) {
                      <td class="num">{{ value }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="muted">
            {{ t('reference.cones.largeDiffers') }}
            <span [attr.lang]="publishedNote.english ? 'en' : null">{{ publishedNote.text }}</span>
          </p>
          <p>
            {{
              t('reference.cones.publishedSource', {
                title: published.title,
                publisher: published.publisher,
                year: published.year
              })
            }}
            <a [href]="published.source" rel="noopener">{{ t('reference.cones.publishedSourceLink') }}</a>
          </p>
        </section>
      } @else {
        <section class="panel" aria-labelledby="sk">
          <h2 id="sk">{{ t('reference.cones.skHeading') }}</h2>
          <p>{{ t('reference.cones.skIntro', { standard: sk.standard }) }}</p>
          <ng-container *ngTemplateOutlet="chart; context: { caption: t('reference.cones.skCaption'), rows: skRows }" />
          <p class="muted" [attr.lang]="skNote.english ? 'en' : null">{{ skNote.text }}</p>
          <p>
            {{ t('reference.cones.skSource', { seller: sk.seller }) }}
            <a [href]="sk.source" rel="noopener">{{ t('reference.cones.skSourceLink') }}</a>
          </p>
        </section>
      }
    }
  </ng-container>`
})
export class ConesPage {
  private readonly locale = inject(LocaleService);
  protected readonly language = inject(PAGE_LANGUAGE);
  private readonly referenceLanguages = inject(REFERENCE_LANGUAGE_LIST);
  /** Whether the page is in a language the reference pages are translated into (English is). */
  protected readonly translated = this.referenceLanguages.includes(this.language);
  protected readonly orton = ORTON.chart;
  protected readonly published = ORTON.published;
  protected readonly sk = SK;
  /** The charts' notes, which carry the advice to set a witness cone, in the page's language (cones/). */
  private readonly noteOf = (text: string) => referenceText(text, 'cones', this.language, this.referenceLanguages);
  protected readonly ortonNote = this.noteOf(ORTON.chart.note);
  protected readonly publishedNote = this.noteOf(ORTON.published.note);
  protected readonly skNote = this.noteOf(SK.note);
  /** The heating rate in °F an hour: a difference, not a temperature. */
  protected readonly ortonRateF = Math.round((ORTON.chart.rate * 9) / 5);

  protected readonly ortonRows = ORTON.chart.cones.map((cone) => ({
    cone: coneLabel(cone.cone),
    ...bothScales(cone.celsius)
  }));
  protected readonly skRows = SK.cones.map((cone) => ({ cone: coneLabel(cone.cone), ...bothScales(cone.celsius) }));
  /** The Orton cones with no temperature: the ones the chart does not reach. */
  protected readonly ortonAbove = coneChoices('orton')
    .find((group) => group.group === 'above')!
    .cones.filter((cone) => !ORTON.chart.cones.some((known) => known.cone === cone))
    .join(', ');

  /** Fahrenheit first for a reader who uses it. */
  protected readonly fahrenheitFirst = computed(() => this.locale.temperature() === 'F');
  /** The reader's cones first: SK for a reader who fires to them. */
  protected readonly order = computed<Array<'orton' | 'sk'>>(() =>
    this.locale.cones() === 'sk' ? ['sk', 'orton'] : ['orton', 'sk']
  );

  /** Orton's published figures in the reader's scale only, with the rates in it as well. */
  protected readonly scale = computed(() => (this.locale.temperature() === 'F' ? 'F' : 'C'));
  /** The columns: self-supporting cones at 15, 60 and 150 °C an hour, large cones at 60 and 150. */
  protected readonly publishedHeadings = computed(() => {
    const rate = (perHour: number) =>
      translate('reference.cones.rate', {
        rate: this.scale() === 'F' ? `${upTo(Math.round((perHour * 9) / 5), 0)} °F` : `${perHour} °C`
      });
    return [
      translate('reference.cones.selfSupporting', { rate: rate(15) }),
      translate('reference.cones.selfSupporting', { rate: rate(60) }),
      translate('reference.cones.selfSupporting', { rate: rate(150) }),
      translate('reference.cones.large', { rate: rate(60) }),
      translate('reference.cones.large', { rate: rate(150) })
    ];
  });
  protected readonly publishedRows = computed(() =>
    ORTON.published.cones.map((cone) => ({
      cone: coneLabel(cone.cone),
      values: [
        cone.selfSupporting[15],
        cone.selfSupporting[60],
        cone.selfSupporting[150],
        cone.large?.[60],
        cone.large?.[150]
      ].map((celsius) => (celsius === undefined ? '–' : upTo(inScale(celsius, this.scale()), 0)))
    }))
  );

  /** What search engines read about the page (shared/structured-data.ts). */
  protected readonly structured = computed(() =>
    referencePage(
      translate('titles.cones').replace(/ - Glazecalc$/, ''),
      translate('meta.cones'),
      '/cones',
      [
        { name: 'Glazecalc', path: '/' },
        { name: translate('reference.cones.crumb'), path: '/cones' }
      ],
      'WebPage',
      this.translated ? this.language : 'en'
    )
  );
}
