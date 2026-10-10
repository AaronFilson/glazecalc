import { Component, computed } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { SafetyLine, ministryFor, shownFor, textKey } from '../../../../lib/regions/safety';
import { codedMessage } from '../../i18n/coded';
import { RichText } from '../../i18n/rich-text';
import { RegionChoice, RegionSelect, SourceLinks, earliest } from './region-select';

/**
 * Who to call, for the reader's region (lib/regions/safety.js): the emergency
 * number, poison lines and animal lines, each one checked on an official page,
 * with where and when. The region is the one in Settings, or the browser's,
 * and can be changed here to see another country's. Where no public poison
 * line could be confirmed, the health ministry's page is linked instead. The
 * data's words, such as opening hours, show translated where there is a
 * translation of exactly them (client/public/i18n/safety/), and the numbers
 * never change.
 */
@Component({
  selector: 'gc-poison-lines',
  imports: [RegionSelect, RichText, SourceLinks, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <div class="poison-lines">
      <gc-region-select
        [choice]="choice"
        [label]="t('guides.poison.numbersFor')"
        [prompt]="t('guides.poison.choose')"
      />
      @if (shown(); as lines) {
        <div
          class="guide-table-scroll"
          tabindex="0"
          role="region"
          [attr.aria-label]="t('guides.poison.label', { region: regionName() })"
        >
          <table class="guide-table">
            <caption>
              {{
                t('guides.poison.caption', { region: regionName(), date: checked() })
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('guides.poison.for') }}</th>
                <th scope="col">{{ t('guides.poison.call') }}</th>
                <th scope="col">{{ t('guides.poison.notes') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (line of lines.emergency; track line.name) {
                <tr>
                  <th scope="row">{{ t('guides.poison.emergency') }}</th>
                  <td class="num">
                    <a class="phone" dir="ltr" [href]="'tel:' + line.tel">{{ line.number }}</a>
                  </td>
                  <td>{{ words(line.note) }}</td>
                </tr>
              }
              @for (line of lines.poison; track line.name) {
                <tr>
                  <th scope="row">
                    {{ t('guides.poison.poisonAdvice', { name: words(line.name), who: line.who }) }}
                    @if (line.area) {
                      <span class="muted">({{ words(line.area) }})</span>
                    }
                  </th>
                  <td class="num">
                    <a class="phone" dir="ltr" [href]="'tel:' + line.tel">{{ line.number }}</a>
                    @if (line.also) {
                      <br />{{ t('guides.poison.or', { number: line.also }) }}
                    }
                  </td>
                  <td>
                    {{ notes(line) }}
                    @if (line.online; as online) {
                      <gc-rich
                        [text]="t('guides.poison.online', { name: online.name })"
                        [links]="{ link: online.url }"
                      />
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <th scope="row">{{ t('guides.poison.poisonAdviceNone') }}</th>
                  <td class="num">-</td>
                  <td>
                    {{ t('guides.poison.noLine') }}
                    @if (ministry(); as ministry) {
                      <gc-rich
                        [text]="t('guides.poison.ministry', { name: ministry.name })"
                        [links]="{ link: ministry.url }"
                      />
                    }
                  </td>
                </tr>
              }
              @for (line of lines.advice; track line.name) {
                <tr>
                  <th scope="row">{{ t('guides.poison.medicalAdvice', { name: words(line.name) }) }}</th>
                  <td class="num">
                    @if (line.number) {
                      <a class="phone" dir="ltr" [href]="'tel:' + line.tel">{{ line.number }}</a>
                    }
                  </td>
                  <td>{{ words(line.note) }}</td>
                </tr>
              }
              @for (line of lines.animals; track line.name) {
                <tr>
                  <th scope="row">{{ t('guides.poison.animals', { name: words(line.name) }) }}</th>
                  <td class="num">
                    <a class="phone" dir="ltr" [href]="'tel:' + line.tel">{{ line.number }}</a>
                  </td>
                  <td>{{ notes(line) }}</td>
                </tr>
              } @empty {
                <tr>
                  <th scope="row">{{ t('guides.poison.animalsNone') }}</th>
                  <td class="num">-</td>
                  <td>{{ t('guides.poison.vet') }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <gc-source-links [label]="t('guides.poison.checkedOn')" [urls]="sources()" />
      } @else {
        <p>{{ t('guides.poison.choosePrompt') }}</p>
      }
    </div>
  </ng-container>`,
  styles: `
    /* A phone number reads left to right in every language, and stays on one line. */
    .phone {
      white-space: nowrap;
      unicode-bidi: isolate;
    }
  `
})
export class PoisonLines {
  protected readonly choice = new RegionChoice();
  private readonly region = this.choice.region;
  protected readonly regionName = this.choice.name;
  protected readonly shown = computed(() => (this.region() ? shownFor(this.region()) : null));
  /** The health ministry, linked where no public poison line could be confirmed. */
  protected readonly ministry = computed(() => (this.region() ? ministryFor(this.region()) : null));
  private readonly lines = computed(() => {
    const shown = this.shown();
    return shown ? [...shown.emergency, ...shown.poison, ...shown.advice, ...shown.animals] : [];
  });
  protected readonly checked = computed(() => earliest(this.lines().map((line) => line.checked)));
  /** The pages the numbers were checked on. */
  protected readonly sources = computed(() => this.lines().map((line) => line.source));

  /** Words from the data, translated where there is a translation of exactly them. */
  protected words(text: string | undefined): string {
    if (!text) return '';
    return codedMessage('safety', textKey(text)) ?? text;
  }

  protected notes(line: SafetyLine): string {
    return [line.hours, line.note, line.animals, line.fee]
      .filter((part): part is string => !!part)
      .map((part) => this.words(part))
      .join('. ')
      .replace(/\.\./g, '.');
  }
}
