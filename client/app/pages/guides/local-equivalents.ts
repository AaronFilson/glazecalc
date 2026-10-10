import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { regionFor } from '../../../../lib/regions';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { LibraryInfo, Material } from '../../core/models';
import { LIKE_FOR_LIKE_GRAMS, gramsApart } from '../../shared/alike';
import { CATEGORY_LABELS, byName, inRegion, statusText } from '../../shared/library-info';
import { listOf, upTo } from '../../shared/format';
import { RegionChoice, RegionSelect } from './region-select';

type Standard = Material & LibraryInfo;

/** Kinds of material a recipe names that one sold elsewhere can stand in for, in this order. */
const KINDS = ['feldspar', 'clay', 'frit', 'boron', 'flux', 'silica', 'alumina'];
/** The library's regions (shared/library-info.ts). */
const LIBRARY_REGIONS = ['US', 'UK', 'EU', 'AU'];
/** The closest ones shown for each. */
const SHOWN = 2;

/**
 * The library's materials not sold where the reader buys (the region's
 * library: US, UK, EU or AU), each with the closest of its kind sold there,
 * by the library's own analyses (gramsApart): within 15 g per 100 g, one can
 * usually stand in for the other as a start. Names are the library's, which
 * carry the makers' and shops' own codes.
 */
@Component({
  selector: 'gc-local-equivalents',
  imports: [RegionSelect, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-region-select
      [choice]="choice"
      [label]="t('guides.equivalents.buyingIn')"
      [prompt]="t('guides.poison.choose')"
    />
    @if (library(); as library) {
      @if (failed()) {
        <p>{{ t('guides.equivalents.failed') }}</p>
      } @else if (!records()) {
        <p>{{ t('guides.equivalents.loading') }}</p>
      } @else {
        <div
          class="guide-table-scroll"
          tabindex="0"
          role="region"
          [attr.aria-label]="t('guides.equivalents.label', { library })"
        >
          <table class="guide-table">
            <caption>
              {{
                t('guides.equivalents.caption', { library })
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('guides.equivalents.material') }}</th>
                <th scope="col">{{ t('guides.equivalents.soldIn') }}</th>
                <th scope="col">{{ t('guides.equivalents.closest', { library }) }}</th>
              </tr>
            </thead>
            @for (group of rows(); track group.kind) {
              <tbody>
                <tr>
                  <th scope="colgroup" colspan="3" class="equivalents-kind">{{ group.label }}</th>
                </tr>
                @for (row of group.rows; track row.record.name) {
                  <tr>
                    <th scope="row">
                      <span translate="no">{{ row.record.name }}</span>
                      @if (row.status) {
                        <span class="muted"> ({{ row.status }})</span>
                      }
                    </th>
                    <td>{{ row.soldIn }}</td>
                    <td>
                      @for (near of row.near; track near.record.name) {
                        <span translate="no">{{ near.record.name }}</span>
                        <span class="muted"> ({{ t('guides.equivalents.apart', { grams: grams(near.grams) }) }})</span>
                        @if (!$last) {
                          <br />
                        }
                      } @empty {
                        {{ t('guides.equivalents.noneClose') }}
                      }
                    </td>
                  </tr>
                }
              </tbody>
            }
          </table>
        </div>
      }
    } @else {
      <p>{{ t('guides.equivalents.choosePrompt') }}</p>
    }
  </ng-container>`,
  styles: `
    .equivalents-kind {
      padding-top: 0.75rem;
    }
  `
})
export class LocalEquivalents {
  protected readonly choice = new RegionChoice();
  protected readonly region = this.choice.region;
  protected readonly regionName = this.choice.name;
  /** The library's region for where the reader buys: US, UK, EU or AU. */
  protected readonly library = computed(() => regionFor(this.region())?.library ?? '');
  private readonly countries = new Intl.DisplayNames([this.choice.language], { type: 'region' });

  protected readonly records = signal<Standard[] | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    inject(ApiResourceFactory)
      .for<Standard>('materials')
      .getStandard()
      .then(
        (records) => this.records.set(records),
        () => this.failed.set(true)
      );
  }

  protected readonly rows = computed(() => {
    const library = this.library();
    const records = this.records() ?? [];
    const here = records.filter((record) => inRegion(record, library));
    return KINDS.map((kind) => ({
      kind,
      label: CATEGORY_LABELS[kind] ?? kind,
      rows: records
        .filter((record) => record.category === kind && !inRegion(record, library))
        .sort(byName)
        .map((record) => ({
          record,
          status: statusText(record),
          soldIn: listOf((record.region ?? []).map((code) => this.regionLabel(code))),
          near: here
            .filter((other) => other.category === kind && (!other.status || other.status === 'current'))
            .map((other) => ({ record: other, grams: gramsApart(record, other) }))
            .filter(
              (near): near is { record: Standard; grams: number } =>
                near.grams !== null && near.grams <= LIKE_FOR_LIKE_GRAMS
            )
            .sort((a, b) => a.grams - b.grams)
            .slice(0, SHOWN)
        }))
    })).filter((group) => group.rows.length);
  });

  /** A library region as the filters name it (US, UK, EU, AU and NZ); another country by its name. */
  private regionLabel(code: string): string {
    return LIBRARY_REGIONS.includes(code) ? translate('libraryRegions.' + code) : (this.countries.of(code) ?? code);
  }

  protected grams(value: number): string {
    return upTo(value, 1);
  }
}
