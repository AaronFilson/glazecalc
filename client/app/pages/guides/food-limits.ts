import { Component, computed } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { FoodLimit, foodRulesFor } from '../../../../lib/regions/food';
import { textKey } from '../../../../lib/regions/languages';
import { codedMessage } from '../../i18n/coded';
import { RichText } from '../../i18n/rich-text';
import { formatDate, upTo } from '../../shared/format';
import { RegionChoice, RegionSelect, SourceLinks, earliest } from './region-select';

/** The kinds of piece the rules name, by the data's code (lib/regions/food.js). */
const CATEGORY: Record<string, string> = {
  flat: marker('guides.food.category.flat'),
  fillable: marker('guides.food.category.fillable'),
  cooking: marker('guides.food.category.cooking'),
  rimBand: marker('guides.food.category.rimBand'),
  rimArticle: marker('guides.food.category.rimArticle'),
  flatware: marker('guides.food.category.flatware'),
  smallHollow: marker('guides.food.category.smallHollow'),
  cups: marker('guides.food.category.cups'),
  largeHollow: marker('guides.food.category.largeHollow'),
  pitchers: marker('guides.food.category.pitchers'),
  auSmall: marker('guides.food.category.auSmall'),
  auLarge: marker('guides.food.category.auLarge'),
  auPlates: marker('guides.food.category.auPlates'),
  auCooking: marker('guides.food.category.auCooking')
};
/** How a sample is judged. */
const JUDGED: Record<NonNullable<FoodLimit['judged']>, string> = {
  average: marker('guides.food.judged.average'),
  each: marker('guides.food.judged.each')
};

/**
 * The limits on lead and cadmium a fired piece may release, in the reader's
 * region (lib/regions/food.js): its own rules, or in an EU member state
 * without its own, the EU's. Each kind of article with its limits, in the
 * law's own units, and the law, linked.
 */
@Component({
  selector: 'gc-food-limits',
  imports: [RegionSelect, RichText, SourceLinks, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-region-select [choice]="choice" [label]="t('guides.food.rulesIn')" [prompt]="t('guides.poison.choose')" />
    @if (found(); as found) {
      <div
        class="guide-table-scroll"
        tabindex="0"
        role="region"
        [attr.aria-label]="t('guides.food.label', { region: regionName() })"
      >
        <table class="guide-table">
          <caption>
            {{
              t('guides.food.caption', { region: regionName(), date: checked() })
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('guides.food.article') }}</th>
              <th scope="col" class="num">{{ t('guides.food.lead') }}</th>
              @if (hasCadmium()) {
                <th scope="col" class="num">{{ t('guides.food.cadmium') }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (limit of found.rules.limits; track limit.category) {
              <tr>
                <th scope="row">
                  {{ t(category[limit.category]!) }}
                  @if (limit.judged) {
                    <span class="muted">({{ t(judged[limit.judged]) }})</span>
                  }
                </th>
                <td class="num">{{ amount(limit.lead, limit) }}</td>
                @if (hasCadmium()) {
                  <td class="num">{{ limit.cadmium === undefined ? '-' : amount(limit.cadmium, limit) }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p>
        @if (!found.own) {
          {{ t('guides.food.euRules') }}
        }
        <gc-rich
          [text]="t('guides.food.law', { law: words(found.rules.law) })"
          [links]="{ link: found.rules.source }"
        />
        @if (found.rules.inForce; as day) {
          {{ t('guides.food.inForce', { date: date(day) }) }}
        }
        @if (found.rules.note; as note) {
          {{ words(note) }}
        }
      </p>
      <gc-source-links [label]="t('guides.poison.checkedOn')" [urls]="[found.rules.source]" />
    } @else if (region()) {
      <p>{{ t('guides.food.unknown', { region: regionName() }) }}</p>
    } @else {
      <p>{{ t('guides.food.choosePrompt') }}</p>
    }
  </ng-container>`
})
export class FoodLimits {
  protected readonly choice = new RegionChoice();
  protected readonly region = this.choice.region;
  protected readonly regionName = this.choice.name;
  protected readonly category = CATEGORY;
  protected readonly judged = JUDGED;
  protected readonly found = computed(() => (this.region() ? foodRulesFor(this.region()) : null));
  protected readonly checked = computed(() => earliest(this.found() ? [this.found()!.rules.checked] : []));
  protected readonly hasCadmium = computed(() =>
    (this.found()?.rules.limits ?? []).some((limit) => limit.cadmium !== undefined)
  );

  /** A limit in the law's units, as the reader writes numbers: 0,8 mg/dm². */
  protected amount(value: number, limit: FoodLimit): string {
    return upTo(value, 3) + ' ' + limit.unit;
  }

  protected date(day: string): string {
    return formatDate(day, { dateStyle: 'long' });
  }

  protected words(text: string): string {
    return codedMessage('regions', textKey(text)) ?? text;
  }
}
