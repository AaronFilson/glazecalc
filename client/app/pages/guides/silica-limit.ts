import { Component, computed, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { textKey } from '../../../../lib/regions/languages';
import { Band, EU_SILICA, Formula, SilicaLimit as Limit, workplaceFor } from '../../../../lib/regions/workplace';
import { NOW, dayOf } from '../../core/clock';
import { codedMessage } from '../../i18n/coded';
import { RichText } from '../../i18n/rich-text';
import { fixed, formatDate, listOf, upTo } from '../../shared/format';
import { RegionChoice, RegionSelect, SourceLinks, earliest } from './region-select';

/** What kind of limit it is, by the data's code. */
const KIND: Record<Limit['kind'], string> = {
  binding: marker('guides.silica.kind.binding'),
  indicative: marker('guides.silica.kind.indicative'),
  assessment: marker('guides.silica.kind.assessment'),
  control: marker('guides.silica.kind.control')
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
                t(silica.kind === 'control' ? 'guides.silica.captionControl' : 'guides.silica.caption', {
                  region: regionName(),
                  date: checked()
                })
              }}
            </caption>
            <tbody>
              @if (silica.formula; as formula) {
                <tr>
                  <th scope="row">{{ t(formulaRow(silica)) }}</th>
                  <td class="num">
                    {{
                      t(formulaKey(formula), {
                        numerator: fixedNumber(formula.numerator, formula.places ?? 1),
                        factor: number(formula.factor),
                        offset: number(formula.offset ?? 1)
                      })
                    }}
                  </td>
                </tr>
              }
              @if (silica.bands; as bands) {
                @for (band of bands; track band.from) {
                  <tr>
                    <th scope="row">
                      {{
                        t(bandRow(band), { from: number(band.from), to: band.to === undefined ? '' : number(band.to) })
                      }}
                    </th>
                    <td class="num">{{ t('guides.silica.value', { value: number(band.value) }) }}</td>
                  </tr>
                }
              } @else {
                <tr>
                  <th scope="row">{{ t(firstRow(silica)) }}</th>
                  <td class="num">{{ t('guides.silica.value', { value: number(silica.quartz) }) }}</td>
                </tr>
              }
              @if (silica.cristobalite; as cristobalite) {
                <tr>
                  <th scope="row">{{ t(cristobaliteRow(silica)) }}</th>
                  <td class="num">{{ t('guides.silica.value', { value: number(cristobalite) }) }}</td>
                </tr>
              }
              @if (silica.actionLevel; as level) {
                <tr>
                  <th scope="row">{{ t('guides.silica.actionLevel') }}</th>
                  <td class="num">{{ t('guides.silica.value', { value: number(level) }) }}</td>
                </tr>
              }
              @if (silica.recommended; as recommended) {
                <tr>
                  <th scope="row">{{ t('guides.silica.recommended', { abbr: recommended.abbr }) }}</th>
                  <td class="num">{{ t('guides.silica.value', { value: number(recommended.value) }) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p>
          {{ t(kind[silica.kind]) }}
          <gc-rich [text]="t('guides.silica.setBy', { law: silica.law })" [links]="{ link: silica.source }" />
          @if (silica.from && !inForce(silica.from)) {
            {{ t('guides.silica.from', { date: date(silica.from) }) }}
          }
          @if (facts.eu && comparison(); as comparison) {
            {{ t(comparison, { value: number(eu.quartz) }) }}
          }
          <!-- Where the limit is a new one, the note says what applies until then: not once it is in force. -->
          @if (silica.note && !(silica.from && inForce(silica.from))) {
            {{ words(silica.note) }}
          }
        </p>
        @if (silica.recommended; as recommended) {
          <p>
            <gc-rich
              [text]="
                t('guides.silica.recommendedBy', {
                  by: recommended.by,
                  abbr: recommended.abbr,
                  title: recommended.title
                })
              "
              [links]="{ link: recommended.source }"
            />
          </p>
        }
      } @else if (facts.eu) {
        <p>{{ t('guides.silica.unknown', { region: regionName(), value: number(eu.quartz) }) }}</p>
      } @else {
        <!-- Outside the EU, with other facts but no limit read (the Philippines): no EU limit to fall back on. -->
        <p>{{ t('guides.silica.noData', { region: regionName() }) }}</p>
      }
      @if (facts.respirators; as respirators) {
        <p>
          <gc-rich
            [text]="
              t('guides.silica.respirators', {
                everyday: listOf(respirators.everyday, 'disjunction'),
                higher: listOf(respirators.higher, 'disjunction')
              })
            "
            [links]="{ link: respirators.source }"
          />
          @if (respirators.note) {
            {{ words(respirators.note) }}
          }
        </p>
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
  private readonly now = inject(NOW);

  protected readonly checked = computed(() => {
    const facts = this.facts();
    return earliest(
      [
        facts?.silica?.checked,
        facts?.silica?.recommended?.checked,
        facts?.respirators?.checked,
        facts?.agency?.checked
      ].filter((day): day is string => !!day)
    );
  });
  protected readonly sources = computed(() => {
    const facts = this.facts();
    return [
      facts?.silica?.source,
      facts?.silica?.recommended?.source,
      facts?.respirators?.source,
      facts?.agency?.url
    ].filter((url): url is string => !!url);
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

  /** A number with the decimals the law writes it with: 3.0. */
  protected fixedNumber(value: number, places: number): string {
    return fixed(value, places);
  }

  protected readonly listOf = listOf;

  /** Whether a limit that applies from this day (YYYY-MM-DD) is in force today. */
  protected inForce(day: string): boolean {
    return day <= dayOf(this.now());
  }

  protected date(day: string): string {
    return formatDate(day, { dateStyle: 'long' });
  }

  /**
   * What the first value is for: all free silica (Japan's formula), all quartz (a formula with
   * its own value for cristobalite, as Türkiye's), quartz alone, or both.
   */
  protected firstRow(silica: Limit): string {
    if (silica.formula)
      return silica.cristobalite ? marker('guides.silica.quartzAll') : marker('guides.silica.allFree');
    if (silica.freeSilica) return marker('guides.silica.freeSilica');
    return silica.cristobalite ? marker('guides.silica.quartz') : marker('guides.silica.both');
  }

  /**
   * A band of free silica content, as the law draws it (China's): from one content to another, both
   * included; above one content and up to another; or above one.
   */
  protected bandRow(band: Band): string {
    if (band.to === undefined) return marker('guides.silica.bandAbove');
    return band.fromIncluded ? marker('guides.silica.bandFromTo') : marker('guides.silica.bandOverTo');
  }

  /** What the formula is: Japan's control concentration, or a limit for quartz (Türkiye's). */
  protected formulaRow(silica: Limit): string {
    return silica.kind === 'control' ? marker('guides.silica.formula') : marker('guides.silica.formulaLimit');
  }

  /** Cristobalite's value: at Q = 100 where the limit is a formula, otherwise its limit. */
  protected cristobaliteRow(silica: Limit): string {
    return silica.formula ? marker('guides.silica.cristobaliteAll') : marker('guides.silica.cristobalite');
  }

  /**
   * The formula as the law writes it: Q alone where its factor is 1 (Türkiye's 10 / (Q + 2)),
   * and Japan's 3.0 / (1.19Q + 1) in its own words.
   */
  protected formulaKey(formula: Formula): string {
    if (formula.factor === 1) return marker('guides.silica.formulaQ');
    return (formula.offset ?? 1) === 1 ? marker('guides.silica.formulaValue') : marker('guides.silica.formulaFull');
  }

  protected words(text: string): string {
    return codedMessage('regions', textKey(text)) ?? text;
  }
}
