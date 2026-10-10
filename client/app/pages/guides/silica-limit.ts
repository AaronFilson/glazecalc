import { Component, computed } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { textKey } from '../../../../lib/regions/languages';
import { EU_SILICA, SilicaLimit as Limit, workplaceFor } from '../../../../lib/regions/workplace';
import { codedMessage } from '../../i18n/coded';
import { RichText } from '../../i18n/rich-text';
import { upTo } from '../../shared/format';
import { RegionChoice, RegionSelect, SourceLinks, earliest } from './region-select';

/** What kind of limit it is, by the data's code. */
const KIND: Record<Limit['kind'], string> = {
  binding: marker('guides.silica.kind.binding'),
  indicative: marker('guides.silica.kind.indicative'),
  assessment: marker('guides.silica.kind.assessment')
};

/**
 * The workplace limit for respirable crystalline silica in the reader's region
 * (lib/regions/workplace.js): the value for quartz, and cristobalite where it
 * differs, what kind of limit it is and what sets it; in an EU member state,
 * how it compares with the EU's binding limit; and the national body for
 * safety at work, linked.
 */
@Component({
  selector: 'gc-silica-limit',
  imports: [RegionSelect, RichText, SourceLinks, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-region-select [choice]="choice" [label]="t('guides.silica.limitIn')" [prompt]="t('guides.poison.choose')" />
    @if (facts(); as facts) {
      @if (facts.silica; as silica) {
        <div
          class="guide-table-scroll"
          tabindex="0"
          role="region"
          [attr.aria-label]="t('guides.silica.label', { region: regionName() })"
        >
          <table class="guide-table">
            <caption>
              {{
                t('guides.silica.caption', { region: regionName(), date: checked() })
              }}
            </caption>
            <tbody>
              <tr>
                <th scope="row">{{ t(silica.cristobalite ? 'guides.silica.quartz' : 'guides.silica.both') }}</th>
                <td class="num">{{ t('guides.silica.value', { value: number(silica.quartz) }) }}</td>
              </tr>
              @if (silica.cristobalite; as cristobalite) {
                <tr>
                  <th scope="row">{{ t('guides.silica.cristobalite') }}</th>
                  <td class="num">{{ t('guides.silica.value', { value: number(cristobalite) }) }}</td>
                </tr>
              }
              @if (silica.actionLevel; as level) {
                <tr>
                  <th scope="row">{{ t('guides.silica.actionLevel') }}</th>
                  <td class="num">{{ t('guides.silica.value', { value: number(level) }) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p>
          {{ t(kind[silica.kind]) }}
          <gc-rich [text]="t('guides.silica.setBy', { law: silica.law })" [links]="{ link: silica.source }" />
          @if (facts.eu && comparison(); as comparison) {
            {{ t(comparison, { value: number(eu.quartz) }) }}
          }
          @if (silica.note) {
            {{ words(silica.note) }}
          }
        </p>
      } @else {
        <p>{{ t('guides.silica.unknown', { region: regionName(), value: number(eu.quartz) }) }}</p>
      }
      @if (facts.agency; as agency) {
        <p>
          <gc-rich [text]="t('guides.silica.agency', { name: agencyName() })" [links]="{ link: agency.url }" />
          @if (agency.silicaUrl) {
            {{ ' ' }}<gc-rich [text]="t('guides.silica.agencySilica')" [links]="{ link: agency.silicaUrl }" />
          }
        </p>
      }
      @if (sources().length) {
        <gc-source-links [label]="t('guides.poison.checkedOn')" [urls]="sources()" />
      }
    } @else if (region()) {
      <p>{{ t('guides.silica.noData', { region: regionName() }) }}</p>
    } @else {
      <p>{{ t('guides.silica.choosePrompt') }}</p>
    }
  </ng-container>`
})
export class SilicaLimit {
  protected readonly choice = new RegionChoice();
  protected readonly region = this.choice.region;
  protected readonly regionName = this.choice.name;
  protected readonly facts = computed(() => (this.region() ? workplaceFor(this.region()) : null));
  protected readonly eu = EU_SILICA;
  protected readonly kind = KIND;

  protected readonly checked = computed(() => {
    const facts = this.facts();
    return earliest([facts?.silica?.checked, facts?.agency?.checked].filter((day): day is string => !!day));
  });
  protected readonly sources = computed(() => {
    const facts = this.facts();
    return [facts?.silica?.source, facts?.agency?.url].filter((url): url is string => !!url);
  });
  protected readonly agencyName = computed(() => {
    const agency = this.facts()?.agency;
    return agency ? agency.name + (agency.abbr ? ' (' + agency.abbr + ')' : '') : '';
  });

  /** How a member state's limit for quartz compares with the EU's, which none may exceed. */
  protected readonly comparison = computed(() => {
    const quartz = this.facts()?.silica?.quartz;
    if (quartz === undefined) return '';
    if (quartz < this.eu.quartz) return marker('guides.silica.lowerThanEu');
    return quartz === this.eu.quartz ? marker('guides.silica.sameAsEu') : '';
  });

  protected number(value: number): string {
    return upTo(value, 3);
  }

  protected words(text: string): string {
    return codedMessage('regions', textKey(text)) ?? text;
  }
}
