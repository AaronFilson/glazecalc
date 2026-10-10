import { NgTemplateOutlet } from '@angular/common';
import { Component, computed } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { Sells, Shop, shopsFor } from '../../../../lib/regions/suppliers';
import { textKey } from '../../../../lib/regions/languages';
import { codedMessage } from '../../i18n/coded';
import { formatLocale, listOf } from '../../shared/format';
import { RegionChoice, RegionSelect, SourceLinks, earliest } from './region-select';

/** What a shop sells, by the data's code. */
const SELLS: Record<Sells, string> = {
  materials: marker('guides.shops.what.materials'),
  frits: marker('guides.shops.what.frits'),
  oxides: marker('guides.shops.what.oxides'),
  stains: marker('guides.shops.what.stains'),
  clays: marker('guides.shops.what.clays'),
  glazes: marker('guides.shops.what.glazes'),
  kilns: marker('guides.shops.what.kilns')
};

/**
 * Where to buy raw glaze materials, for the reader's region
 * (lib/regions/suppliers.js): a few shops, each checked on its own site, with
 * what it sells, the packs seen, and some materials as the shop names them.
 * Where none was found, shops elsewhere that say they deliver there.
 */
@Component({
  selector: 'gc-shops',
  imports: [NgTemplateOutlet, RegionSelect, SourceLinks, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-region-select [choice]="choice" [label]="t('guides.shops.shopsIn')" [prompt]="t('guides.poison.choose')" />
    @if (entry(); as entry) {
      @if (entry.shops.length) {
        <ng-container *ngTemplateOutlet="table; context: { $implicit: entry.shops, nearby: false }" />
      } @else {
        <p>{{ t('guides.shops.none', { region: regionName() }) }}</p>
        @if (entry.nearby.length) {
          <ng-container *ngTemplateOutlet="table; context: { $implicit: entry.nearby, nearby: true }" />
        }
      }
      <gc-source-links [label]="t('guides.poison.checkedOn')" [urls]="sources()" />
    } @else if (region()) {
      <p>{{ t('guides.shops.unknown', { region: regionName() }) }}</p>
    } @else {
      <p>{{ t('guides.shops.choosePrompt') }}</p>
    }

    <ng-template #table let-shops let-nearby="nearby">
      <div
        class="guide-table-scroll"
        tabindex="0"
        role="region"
        [attr.aria-label]="t('guides.shops.label', { region: regionName() })"
      >
        <table class="guide-table shop-table">
          <caption>
            {{
              t(nearby ? 'guides.shops.nearbyCaption' : 'guides.shops.caption', {
                region: regionName(),
                date: checked()
              })
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('guides.shops.shop') }}</th>
              <th scope="col">{{ t('guides.shops.sells') }}</th>
              <th scope="col">{{ t('guides.shops.packs') }}</th>
              <th scope="col">{{ t('guides.shops.seen') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (shop of asShops(shops); track shop.url) {
              <tr>
                <th scope="row">
                  <a [href]="shop.url" translate="no">{{ shop.name }}</a>
                  @if (placeOf(shop); as place) {
                    <br /><span class="muted" translate="no">{{ place }}</span>
                  }
                </th>
                <td [attr.data-label]="t('guides.shops.sells')">{{ sellsText(shop) }}</td>
                <td [attr.data-label]="t('guides.shops.packs')">{{ packsText(shop) }}</td>
                <td [attr.data-label]="t('guides.shops.seen')">
                  <span translate="no">{{ shop.examples?.join('; ') }}</span>
                  @if (shop.note) {
                    @if (shop.examples?.length) {
                      <br />
                    }
                    {{ noteText(shop) }}
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </ng-template>
  </ng-container>`,
  styles: `
    /* On a phone, a block per shop, each value after its column's name. */
    @media (max-width: 575.98px) {
      .shop-table thead {
        display: none;
      }
      .shop-table tr,
      .shop-table th,
      .shop-table td {
        display: block;
      }
      .shop-table tr {
        border-bottom: 1px solid var(--gc-border);
        padding: 0.4rem 0;
      }
      .shop-table th,
      .shop-table td {
        border: 0;
        padding: 0.1rem 0;
      }
      .shop-table td::before {
        content: attr(data-label) ': ';
        font-weight: 600;
      }
    }
  `
})
export class ShopList {
  protected readonly choice = new RegionChoice();
  protected readonly region = this.choice.region;
  protected readonly regionName = this.choice.name;
  protected readonly entry = computed(() => (this.region() ? shopsFor(this.region()) : null));
  private readonly shown = computed(() => {
    const entry = this.entry();
    return entry ? [...entry.shops, ...(entry.shops.length ? [] : entry.nearby)] : [];
  });
  protected readonly checked = computed(() => earliest(this.shown().map((shop) => shop.checked)));
  /** Each shop's page, and for a shop elsewhere the page that says it delivers here. */
  protected readonly sources = computed(() =>
    this.shown().flatMap((shop) => [shop.url, (shop as { shipping?: string }).shipping ?? ''].filter(Boolean))
  );

  protected asShops(shops: unknown): Array<Shop & { region?: string }> {
    return shops as Array<Shop & { region?: string }>;
  }

  /** Its town, and for a shop elsewhere its country. */
  protected placeOf(shop: Shop & { region?: string }): string {
    const country = shop.region ? this.choice.nameOf(shop.region) : '';
    return [shop.place, country].filter(Boolean).join(', ');
  }

  protected sellsText(shop: Shop): string {
    return listOf(shop.sells.map((code) => translate(SELLS[code])));
  }

  /** "100 g, 1 kg and 25 kg", as the reader writes them: under a kilogram, in grams. */
  protected packsText(shop: Shop): string {
    if (!shop.packs) return '';
    const unit = shop.packs.unit;
    const as = (name: string) => new Intl.NumberFormat(formatLocale(), { style: 'unit', unit: name });
    return listOf(
      shop.packs.sizes.map((size) =>
        unit === 'kilogram' && size < 1 ? as('gram').format(Math.round(size * 1000)) : as(unit).format(size)
      )
    );
  }

  /** The data's note, translated where there is a translation of exactly it. */
  protected noteText(shop: Shop): string {
    return shop.note ? (codedMessage('regions', textKey(shop.note)) ?? shop.note) : '';
  }
}
