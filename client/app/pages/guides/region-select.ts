import { Component, computed, inject, input, signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { REGIONS } from '../../../../lib/regions';
import { textLanguage } from '../../../../lib/regions/languages';
import { LocaleService } from '../../core/locale.service';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { formatDate, listLocale } from '../../shared/format';
import { Picker } from '../../shared/picker';
import { regionItems } from '../../shared/region-items';

let nextId = 0;

/**
 * The country a part of a guide shows facts for (who to call, the silica
 * limit, the food-contact rules, shops): the reader's region from Settings, or
 * the browser's, until another is chosen here to look at. Settings are not
 * changed. Countries are named in the page's language by the browser
 * (Intl.DisplayNames), in its alphabetical order, listed by continent. Made
 * where a component's fields are (it injects).
 */
export class RegionChoice {
  private readonly locale = inject(LocaleService);
  /** The language of the page's words, for names and sorting. */
  readonly language = textLanguage(inject(PAGE_LANGUAGE));
  private readonly names = new Intl.DisplayNames([this.language], { type: 'region' });

  readonly regions = REGIONS.map((r) => ({ code: r.code, name: this.names.of(r.code) ?? r.name })).sort((a, b) =>
    a.name.localeCompare(b.name, this.language)
  );
  /** The countries as the list shows them: by continent, with their English names beside them. */
  readonly items = regionItems(this.regions, inject(PAGE_LANGUAGE));
  /** A country chosen here, to look at. */
  readonly chosen = signal('');
  readonly region = computed(() => this.chosen() || this.locale.region());
  readonly name = computed(() => this.regions.find((r) => r.code === this.region())?.name ?? '');

  /** A country's name in the page's language. */
  nameOf(code: string): string {
    return this.regions.find((r) => r.code === code)?.name ?? code;
  }
}

/** The list a RegionChoice is changed with, under its label. */
@Component({
  selector: 'gc-region-select',
  imports: [Picker],
  template: `<div class="region-select">
    <label class="form-label" [for]="id">{{ label() }}</label>
    <gc-picker
      [inputId]="id"
      [label]="label()"
      [items]="choice().items"
      [value]="choice().region()"
      [placeholder]="prompt()"
      [showAll]="showAll"
      [noMatch]="noMatch"
      (chosen)="choice().chosen.set($event)"
    />
  </div>`,
  styles: `
    .region-select {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      gc-picker {
        flex: 1 1 16rem;
        max-width: 24rem;
        min-width: 0;
      }
    }
  `
})
export class RegionSelect {
  readonly choice = input.required<RegionChoice>();
  readonly label = input.required<string>();
  /** The first option, while no country is known. */
  readonly prompt = input.required<string>();
  protected readonly id = 'region-' + nextId++;
  protected readonly showAll = translate('picker.regions.showAll');
  protected readonly noMatch = translate('picker.regions.noMatch');
}

/** The earliest of the days facts were checked on, as the reader writes a date: "8 October 2026". */
export function earliest(dates: readonly string[]): string {
  const first = [...dates].sort()[0];
  return first ? formatDate(first, { dateStyle: 'long' }) : '';
}

/** The pages facts were read on, after a label: each a link named by its site, listed as the page's language lists things. */
@Component({
  selector: 'gc-source-links',
  template: `<p class="region-sources">
    {{ label() }}
    @for (part of parts(); track $index) {
      @if (part.url) {
        <a [href]="part.url">{{ part.text }}</a>
      } @else {
        <ng-container>{{ part.text }}</ng-container>
      }
    }
  </p>`,
  styles: `
    .region-sources {
      font-size: 0.9rem;
      overflow-wrap: anywhere;
    }
  `
})
export class SourceLinks {
  readonly label = input.required<string>();
  readonly urls = input.required<readonly string[]>();

  protected readonly parts = computed(() => {
    const urls = [...new Set(this.urls())];
    const hosts = urls.map(host);
    const parts = new Intl.ListFormat(listLocale(), { style: 'short', type: 'unit' }).formatToParts(hosts);
    let next = 0;
    return [
      ...parts.map((part) =>
        part.type === 'element' ? { text: part.value, url: urls[next++] } : { text: part.value, url: '' }
      ),
      { text: '.', url: '' }
    ];
  });
}

/** A page's site, for its link: centres-antipoison.net. */
function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
