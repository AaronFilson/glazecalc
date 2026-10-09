import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { REGIONS } from '../../../../lib/regions';
import { textLanguage } from '../../../../lib/regions/languages';
import { SafetyLine, shownFor, textKey } from '../../../../lib/regions/safety';
import { LocaleService } from '../../core/locale.service';
import { codedMessage } from '../../i18n/coded';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { RichText } from '../../i18n/rich-text';
import { formatDate, formatLocale } from '../../shared/format';

let nextId = 0;

/**
 * Who to call, for the reader's region (lib/regions/safety.js): the emergency
 * number, poison lines and animal lines, each one checked on an official page,
 * with where and when. The region is the one in Settings, or the browser's,
 * and can be changed here to see another country's. Countries are named in the
 * page's language by the browser (Intl.DisplayNames); the data's words, such as
 * opening hours, show translated where there is a translation of exactly them
 * (client/public/i18n/safety/), and the numbers never change.
 */
@Component({
  selector: 'gc-poison-lines',
  imports: [RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <div class="poison-lines">
      <div class="poison-region">
        <label class="form-label" [for]="id">{{ t('guides.poison.numbersFor') }}</label>
        <select class="form-select" [id]="id" (change)="chosen.set($any($event.target).value)">
          @if (!region()) {
            <option value="" selected>{{ t('guides.poison.choose') }}</option>
          }
          @for (r of regions; track r.code) {
            <option [value]="r.code" [selected]="r.code === region()">{{ r.name }}</option>
          }
        </select>
      </div>
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
                  <td>{{ t('guides.poison.noLine') }}</td>
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
        <p class="poison-sources">
          {{ t('guides.poison.checkedOn') }}
          @for (part of sourceParts(); track $index) {
            @if (part.url) {
              <a [href]="part.url">{{ part.text }}</a>
            } @else {
              <ng-container>{{ part.text }}</ng-container>
            }
          }
        </p>
      } @else {
        <p>{{ t('guides.poison.choosePrompt') }}</p>
      }
    </div>
  </ng-container>`,
  styles: `
    .poison-region {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      select {
        width: auto;
        max-width: 100%;
      }
    }
    /* A phone number reads left to right in every language, and stays on one line. */
    .phone {
      white-space: nowrap;
      unicode-bidi: isolate;
    }
    .poison-sources {
      font-size: 0.9rem;
      overflow-wrap: anywhere;
    }
  `
})
export class PoisonLines {
  private readonly locale = inject(LocaleService);
  private readonly language = textLanguage(inject(PAGE_LANGUAGE));
  private readonly regionNames = new Intl.DisplayNames([this.language], { type: 'region' });

  protected readonly id = 'poison-region-' + nextId++;
  protected readonly regions = REGIONS.map((r) => ({ code: r.code, name: this.regionNames.of(r.code) ?? r.name })).sort(
    (a, b) => a.name.localeCompare(b.name, this.language)
  );
  /** A country chosen here, to look at; Settings are not changed. */
  protected readonly chosen = signal('');
  protected readonly region = computed(() => this.chosen() || this.locale.region());
  protected readonly regionName = computed(() => this.regions.find((r) => r.code === this.region())?.name ?? '');
  protected readonly shown = computed(() => (this.region() ? shownFor(this.region()) : null));
  private readonly lines = computed(() => {
    const shown = this.shown();
    return shown ? [...shown.emergency, ...shown.poison, ...shown.advice, ...shown.animals] : [];
  });
  protected readonly checked = computed(() => {
    const dates = this.lines()
      .map((line) => line.checked)
      .sort();
    return dates.length ? formatDate(dates[0], { dateStyle: 'long' }) : '';
  });

  /** The pages the numbers were checked on, listed as the page's language lists things, each a link. */
  protected readonly sourceParts = computed(() => {
    const urls = [...new Set(this.lines().map((line) => line.source))];
    const hosts = urls.map(host);
    const parts = new Intl.ListFormat(formatLocale(), { style: 'short', type: 'unit' }).formatToParts(hosts);
    let next = 0;
    return [
      ...parts.map((part) =>
        part.type === 'element' ? { text: part.value, url: urls[next++] } : { text: part.value, url: '' }
      ),
      { text: '.', url: '' }
    ];
  });

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

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
