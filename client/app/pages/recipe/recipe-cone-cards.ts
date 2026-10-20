import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import {
  ATMOSPHERES,
  Atmosphere,
  ConeScale,
  FiringBlock,
  SCALES,
  approxCelsius,
  coneBand,
  conesBetween,
  inRange,
  isCone,
  ordinal,
  testedCones
} from '../../../../lib/cones/firing';
import { ConeResult, CONE_RESULTS, resultKey } from '../../../../lib/cones/results';
import { FiringBand, LIMIT_SETS, limitRows } from '../../../../lib/recipe/limits';
import { errorMessage } from '../../core/error-message';
import { FiringLinksService } from '../../core/firing-links.service';
import { LocaleService } from '../../core/locale.service';
import { Firing, FiringLink } from '../../core/models';
import { PreferencesService } from '../../core/preferences.service';
import { DatePipe } from '../../shared/format-pipes';
import { formatTemperature } from '../../shared/format';
import { ATMOSPHERE_NAMES, Reader, coneText } from './firing-text';

// What a recipe came out like at each cone and atmosphere it was fired in
// (docs/adr/0021-recipe-firing.md, "Result cards"): a card for each, with the
// cone's approximate temperature and limits band, how many limit cautions the
// glaze has in that band, the potter's summary, and the firing logs fired
// there with their result notes. Logs not yet placed at a cone have a card of
// their own, where the potter places them.
//
// How the cards are keyed, by the atmospheres the recipe's firing states:
//   - none: one card for each cone, with no atmosphere (a log's own
//     atmosphere, if it has one, is shown on its line);
//   - one: one card for each cone, at that atmosphere; a log or result with
//     none given is taken to be at it;
//   - several: a card for each cone and atmosphere that has a summary or a
//     log, and one for a cone whose logs have no atmosphere given yet.
// With none or one stated, each tested cone has a card from the start, to
// write in; any other cone of the range (and with several, any atmosphere)
// can be added. A summary or log at a cone or atmosphere outside the stated
// firing (stated later) is kept, and its card says it is outside.

/** Where a card is: a cone and maybe an atmosphere; no cone for the logs not placed yet. */
export interface ConePlace {
  cone?: string | null;
  atmosphere?: Atmosphere;
}

export interface ConeCard extends ConePlace {
  key: string;
  /** The scale the cone is read in: the recipe's, or for a cone outside it, the one it is a cone of. */
  scale: ConeScale;
  /** The cone or the atmosphere is outside the firing stated. */
  outside: boolean;
  summary: string;
  links: FiringLink[];
}

const UNPLACED = 'unplaced';

/** The scale a cone is read in: the recipe's, else the first it is a cone of. */
export function scaleFor(block: FiringBlock | null | undefined, cone: string): ConeScale {
  if (block && isCone(block.scale, cone)) return block.scale;
  return SCALES.find((scale) => isCone(scale, cone)) ?? block?.scale ?? 'orton';
}

/** Whether a cone or atmosphere is outside the firing stated (never when none is stated). */
export function isOutside(block: FiringBlock | null | undefined, cone: string, atmosphere?: Atmosphere): boolean {
  const stated = block?.atmospheres ?? [];
  const coneOutside = !!block?.low && !inRange(block, scaleFor(block, cone), cone);
  return coneOutside || (!!atmosphere && stated.length > 0 && !stated.includes(atmosphere));
}

/** The atmosphere a link or result counts at: see the top of this file. */
const atmosphereAt = (
  stated: readonly Atmosphere[],
  atmosphere: Atmosphere | undefined,
  isLink: boolean
): Atmosphere | undefined => {
  if (!stated.length) return isLink ? undefined : atmosphere;
  return atmosphere ?? (stated.length === 1 ? stated[0] : undefined);
};

/**
 * The cards for a recipe: one for each cone and atmosphere (keyed as the top
 * of this file says), in cone order and the atmospheres' order, then the logs
 * not placed. `links` are those to logs that are there; `added` the places
 * the potter has added a card for, not written in yet.
 */
export function coneCards(
  block: FiringBlock | null | undefined,
  links: readonly FiringLink[],
  results: readonly ConeResult[],
  added: readonly ConePlace[] = []
): ConeCard[] {
  const stated = block?.atmospheres ?? [];
  const cards = new Map<string, ConeCard>();
  const cardAt = (cone: string, atmosphere: Atmosphere | undefined): ConeCard => {
    const key = resultKey(cone, atmosphere);
    let card = cards.get(key);
    if (!card) {
      card = {
        key,
        cone,
        ...(atmosphere && { atmosphere }),
        scale: scaleFor(block, cone),
        outside: isOutside(block, cone, atmosphere),
        summary: '',
        links: []
      };
      cards.set(key, card);
    }
    return card;
  };
  if (stated.length <= 1) for (const cone of testedCones(block)) cardAt(cone, stated[0]);
  for (const place of added) if (place.cone) cardAt(place.cone, place.atmosphere);
  for (const result of results)
    cardAt(result.cone, atmosphereAt(stated, result.atmosphere, false)).summary = result.summary;
  const unplaced: FiringLink[] = [];
  for (const link of links) {
    if (link.cone) cardAt(link.cone, atmosphereAt(stated, link.atmosphere, true)).links.push(link);
    else unplaced.push(link);
  }
  const order = (card: ConeCard): number => {
    const at = ordinal(card.scale, card.cone!);
    // A cone of another scale than the recipe's goes after the recipe's own.
    return (card.scale === (block?.scale ?? card.scale) ? 0 : 1e6) + (Number.isNaN(at) ? 0 : at);
  };
  const atmosphereOrder = (card: ConeCard): number => (card.atmosphere ? ATMOSPHERES.indexOf(card.atmosphere) : -1);
  const sorted = [...cards.values()].sort((a, b) => order(a) - order(b) || atmosphereOrder(a) - atmosphereOrder(b));
  if (unplaced.length) {
    sorted.push({
      key: UNPLACED,
      cone: null,
      scale: block?.scale ?? 'orton',
      outside: false,
      summary: '',
      links: unplaced
    });
  }
  return sorted;
}

/** The places a log can be put, and a card added at: each cone of the range, at each atmosphere stated. */
export function placesOf(block: FiringBlock | null | undefined): ConePlace[] {
  if (!block?.low) return [];
  const atmospheres: Array<Atmosphere | undefined> = block.atmospheres?.length ? [...block.atmospheres] : [undefined];
  return conesBetween(block.scale, block.low, block.high).flatMap((cone) =>
    atmospheres.map((atmosphere) => ({ cone, ...(atmosphere && { atmosphere }) }))
  );
}

/**
 * The results with one card's summary set ('' takes it off). A result the card shows is replaced, even one
 * saved with no atmosphere that the card shows at the one atmosphere stated since.
 */
export function withSummary(
  results: readonly ConeResult[],
  place: ConePlace,
  summary: string,
  block?: FiringBlock | null
): ConeResult[] {
  if (!place.cone) return [...results];
  const text = summary.trim().slice(0, CONE_RESULTS.summary);
  const stated = block?.atmospheres ?? [];
  const key = resultKey(place.cone, place.atmosphere);
  const onCard = (r: ConeResult) => resultKey(r.cone, atmosphereAt(stated, r.atmosphere, false)) === key;
  const others = results.filter((r) => !onCard(r));
  if (!text) return others;
  const at = results.findIndex(onCard);
  const result: ConeResult = {
    cone: place.cone,
    ...(place.atmosphere && { atmosphere: place.atmosphere }),
    summary: text
  };
  if (at < 0) return [...others, result];
  return [...others.slice(0, at), result, ...others.slice(at)];
}

/** A place in words: "cone 6 · reduction". */
export function placeText(scale: ConeScale, place: ConePlace, reader: Reader): string {
  if (!place.cone) return translate('recipe.coneCards.unplaced');
  const cone = coneText(scale, place.cone, reader);
  return place.atmosphere ? cone + ' · ' + translate(ATMOSPHERE_NAMES[place.atmosphere]!) : cone;
}

/** A place's cone's approximate temperature in the reader's scale, or '' (none for a temperature, or no figure). */
export function approxText(scale: ConeScale, cone: string, reader: Reader): string {
  if (scale === 'temperature') return '';
  const approx = approxCelsius(scale, cone);
  return approx
    ? translate('recipe.coneCards.approx', { temperature: formatTemperature(approx.celsius, reader.temperature) })
    : '';
}

const placeValue = (place: ConePlace): string => (place.cone ? resultKey(place.cone, place.atmosphere) : '');

@Component({
  selector: 'gc-recipe-cone-cards',
  imports: [DatePipe, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (cards().length || addable().length) {
      <section class="cone-cards" aria-labelledby="cone-cards-heading">
        <h3 id="cone-cards-heading">{{ t('recipe.coneCards.heading') }}</h3>
        @if (saveFailed(); as problem) {
          <p class="text-danger" role="alert">{{ problem }}</p>
        }
        @for (card of cards(); track card.key; let i = $index) {
          <details class="cone-card" [class.cone-card-outside]="card.outside" [open]="cards().length === 1">
            <summary>
              <span class="cone-card-place">{{ placeOf(card) }}</span>
              @for (fact of factsOf(card); track $index) {
                <span class="cone-card-fact"> · {{ fact }}</span>
              }
              @if (card.outside) {
                <span class="cone-card-outside-note"> · {{ t('recipe.coneCards.outside') }}</span>
              }
            </summary>
            <div class="cone-card-body">
              <!-- Slot: the one-line "cone fit" note (how the chemistry looks against this cone), added by another
                   part of the page through the coneFit input. Nothing shows until it gives one. -->
              @if (fitOf(card); as fit) {
                <p class="cone-card-fit">{{ fit }}</p>
              }
              @if (card.cone) {
                <label class="form-label" [for]="'cone-summary-' + i">{{
                  t('recipe.coneCards.summaryLabel', { place: placeOf(card) })
                }}</label>
                <textarea
                  [id]="'cone-summary-' + i"
                  class="form-control form-control-sm cone-card-summary"
                  rows="2"
                  [maxLength]="summaryMax"
                  [placeholder]="t('recipe.coneCards.summaryPlaceholder')"
                  [value]="card.summary"
                  (change)="setSummary(card, $any($event.target).value)"
                ></textarea>
              } @else {
                <p class="muted">{{ t('recipe.coneCards.unplacedNote') }}</p>
              }
              @if (card.links.length) {
                <ul class="cone-card-logs">
                  @for (link of card.links; track link.firing) {
                    <li>
                      <span class="cone-card-log">
                        @if (logOf(link.firing); as log) {
                          <bdi>{{ log.title }}</bdi>
                          @if (log.date) {
                            <span class="muted"> · {{ log.date | gcDate }}</span>
                          }
                        }
                        @if (link.atmosphere) {
                          <span class="muted"> · {{ t(atmosphereNames[link.atmosphere]) }}</span>
                        } @else if (severalAtmospheres()) {
                          <span class="muted"> · {{ t('recipe.coneCards.noAtmosphere') }}</span>
                        }
                        @if (link.result) {
                          <span class="cone-card-result">: {{ link.result }}</span>
                        }
                      </span>
                      <label class="visually-hidden" [for]="'cone-place-' + i + '-' + link.firing">{{
                        t('recipe.coneCards.placeLabel', { title: logOf(link.firing)?.title ?? '' })
                      }}</label>
                      <select
                        [id]="'cone-place-' + i + '-' + link.firing"
                        class="form-select form-select-sm cone-card-place-choice"
                        (change)="place(link, $any($event.target).value)"
                      >
                        <option value="" [selected]="!link.cone">{{ t('recipe.coneCards.notPlaced') }}</option>
                        @for (option of placeChoices(link); track option.value) {
                          <option [value]="option.value" [selected]="option.value === linkValue(link)">
                            {{ option.label }}
                          </option>
                        }
                      </select>
                    </li>
                  }
                </ul>
              }
            </div>
          </details>
        }
        @if (addable().length) {
          <div class="cone-cards-add">
            <label for="cone-card-add" class="form-label">{{ t('recipe.coneCards.add') }}</label>
            <select id="cone-card-add" class="form-select form-select-sm" #choice>
              @for (option of addable(); track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            <button
              id="cone-card-add-button"
              type="button"
              class="btn btn-light border btn-sm"
              (click)="add(choice.value)"
            >
              {{ t('recipe.coneCards.addButton') }}
            </button>
          </div>
        }
      </section>
    }
  </ng-container>`,
  styles: `
    .cone-cards {
      margin-bottom: 1rem;
    }
    .cone-cards h3 {
      font-size: 1.1rem;
      margin: 0 0 0.5rem;
    }
    .cone-card {
      border: 1px solid var(--gc-border);
      border-radius: 0.25rem;
      padding: 0.25rem 0.5rem;
      margin-bottom: 0.5rem;
    }
    .cone-card summary {
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    .cone-card-place {
      font-weight: 600;
    }
    .cone-card-fact,
    .cone-card-outside-note {
      color: var(--gc-muted);
    }
    .cone-card-outside {
      border-style: dashed;
    }
    .cone-card-body {
      padding: 0.5rem 0 0.25rem;
    }
    .cone-card-fit {
      margin: 0 0 0.5rem;
    }
    .cone-card-logs {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0;
    }
    .cone-card-logs li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.5rem;
      padding: 0.25rem 0;
      border-top: 1px solid var(--gc-border);
    }
    .cone-card-log {
      flex: 1 1 14rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .cone-card-place-choice {
      flex: 0 1 14rem;
      width: auto;
    }
    .cone-cards-add {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      max-width: 32rem;
    }
    .cone-cards-add label {
      margin: 0;
    }
    .cone-cards-add select {
      flex: 1 1 10rem;
      width: auto;
    }
  `
})
export class RecipeConeCards {
  /** The recipe's firing block, whose cones and atmospheres key the cards. */
  readonly block = input<FiringBlock | null>(null);
  /** The links to firing logs, saved with the recipe as firings. */
  readonly links = model<FiringLink[]>([]);
  /** The account's firing logs that are there: a link to one not among them (in the Trash) is not shown. */
  readonly logs = input<Firing[]>([]);
  /** The summaries, saved with the recipe as coneResults. */
  readonly results = model<ConeResult[]>([]);
  /** The saved recipe's id, whose links are changed on the server; null for a recipe not saved yet. */
  readonly recipeId = input<string | null>(null);
  /** The recipe's unity formula, for the limit cautions in each card's band; null when it has none. */
  readonly unity = input<Record<string, number> | null>(null);
  /**
   * SLOT for the cone-fit line: given a card's cone (in its scale) and atmosphere, a one-line note on how the
   * chemistry looks against that cone, or null for none. Left empty here; another part of the page fills it.
   */
  readonly coneFit = input<((place: ConePlace & { scale: ConeScale }) => string | null) | null>(null);
  /** A saved recipe's links as the server has them, after one was placed: they are saved already. */
  readonly saved = output<FiringLink[]>();

  private readonly linksApi = inject(FiringLinksService);
  private readonly locale = inject(LocaleService);
  private readonly preferences = inject(PreferencesService);
  protected readonly summaryMax = CONE_RESULTS.summary;
  protected readonly atmosphereNames = ATMOSPHERE_NAMES;
  protected readonly saveFailed = signal('');
  /** Places a card was added at, not written in yet. */
  private readonly added = signal<ConePlace[]>([]);

  private readonly reader = computed<Reader>(() => ({
    cones: this.locale.cones(),
    temperature: this.locale.temperature()
  }));
  protected readonly severalAtmospheres = computed(() => (this.block()?.atmospheres?.length ?? 0) > 1);
  /** The links shown: those to logs that are there. */
  private readonly shownLinks = computed(() => {
    const there = new Set(this.logs().map((log) => log._id));
    return this.links().filter((link) => there.has(link.firing));
  });
  protected readonly cards = computed(() => coneCards(this.block(), this.shownLinks(), this.results(), this.added()));
  private readonly places = computed(() =>
    placesOf(this.block()).map((place) => ({
      ...place,
      value: placeValue(place),
      label: placeText(this.block()!.scale, place, this.reader())
    }))
  );
  /** The places a card can be added at: those of the range with no card yet. */
  protected readonly addable = computed(() => {
    const carded = new Set(this.cards().map((card) => card.key));
    return this.places().filter((place) => !carded.has(place.value));
  });
  /** The limits band of each cone and how many cautions the glaze has there, by the account's limit set. */
  private readonly cautions = computed(() => {
    const unity = this.unity();
    const set = LIMIT_SETS[this.preferences.limitSet()] ?? LIMIT_SETS['hesselberth-roy']!;
    return (band: FiringBand): number | null => {
      if (!unity) return null;
      const rows = limitRows(unity, set, band);
      return rows ? rows.filter((row) => row.past).length : null;
    };
  });

  protected placeOf(card: ConeCard): string {
    return placeText(card.scale, card, this.reader());
  }

  /** The card's facts after its place: the approximate temperature, the band, the cautions there, the logs. */
  protected factsOf(card: ConeCard): string[] {
    const facts: string[] = [];
    if (card.cone) {
      const approx = approxText(card.scale, card.cone, this.reader());
      if (approx) facts.push(approx);
      const band = coneBand(card.scale, card.cone);
      if (band) {
        facts.push(translate('recipe.limits.bands.' + band));
        const count = this.cautions()(band);
        if (count !== null) facts.push(translate('recipe.coneCards.cautions', { count }));
      }
    }
    facts.push(translate('recipe.coneCards.logs', { count: card.links.length }));
    return facts;
  }

  protected fitOf(card: ConeCard): string | null {
    const fit = this.coneFit();
    return fit && card.cone ? fit({ cone: card.cone, atmosphere: card.atmosphere, scale: card.scale }) : null;
  }

  protected logOf(id: string): Firing | undefined {
    return this.logs().find((log) => log._id === id);
  }

  protected linkValue(link: FiringLink): string {
    return link.cone ? resultKey(link.cone, link.atmosphere) : '';
  }

  /** Where a log can be put: the range's places, and where it is now if that is outside them. */
  protected placeChoices(link: FiringLink): Array<{ value: string; label: string }> {
    const choices = this.places().map(({ value, label }) => ({ value, label }));
    const now = this.linkValue(link);
    if (now && !choices.some((choice) => choice.value === now)) {
      const block = this.block();
      const label = placeText(scaleFor(block, link.cone!), link, this.reader());
      choices.push({
        value: now,
        label: isOutside(block, link.cone!, link.atmosphere)
          ? translate('recipe.coneCards.outsideChoice', { place: label })
          : label
      });
    }
    return choices;
  }

  protected setSummary(card: ConeCard, summary: string): void {
    this.results.update((list) => withSummary(list, card, summary, this.block()));
  }

  protected add(value: string): void {
    const place = this.places().find((p) => p.value === value);
    if (place)
      this.added.update((list) => [
        ...list,
        { cone: place.cone, ...(place.atmosphere && { atmosphere: place.atmosphere }) }
      ]);
  }

  /** Puts a log at a place (value '' takes it off): on the server for a saved recipe, else here. */
  protected async place(link: FiringLink, value: string): Promise<void> {
    this.saveFailed.set('');
    const [cone = '', atmosphere = ''] = value.split('|');
    const placed = (list: FiringLink[]) =>
      list.map((l) => {
        if (l.firing !== link.firing) return l;
        return {
          firing: l.firing,
          ...(l.result && { result: l.result }),
          ...(cone && { cone }),
          ...(atmosphere && { atmosphere: atmosphere as Atmosphere })
        };
      });
    const recipeId = this.recipeId();
    if (!recipeId) {
      this.links.update(placed);
      return;
    }
    try {
      const links = await this.linksApi.setPlace(recipeId, link.firing, {
        cone,
        atmosphere: atmosphere as Atmosphere | ''
      });
      if (this.recipeId() === recipeId) this.saved.emit(links);
    } catch (err) {
      this.saveFailed.set(errorMessage(err, translate('recipe.coneCards.saveFailed')));
    }
  }
}

/**
 * The summaries alone, for the print view and the shared page: each cone and
 * atmosphere with its approximate temperature and the potter's words. No logs:
 * they stay the author's (a shared page shows these only with the notes).
 */
@Component({
  selector: 'gc-cone-summaries',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (shown().length) {
      <section class="cone-summaries" [attr.aria-labelledby]="headingId()">
        @if (level() === 2) {
          <h2 [id]="headingId()">{{ t('recipe.coneCards.heading') }}</h2>
        } @else {
          <h3 [id]="headingId()">{{ t('recipe.coneCards.heading') }}</h3>
        }
        <dl>
          @for (item of shown(); track item.key) {
            <dt>
              <span>{{ item.place }}</span>
              @if (item.approx) {
                <span class="cone-summaries-fact"> · {{ item.approx }}</span>
              }
              @if (item.outside) {
                <span class="cone-summaries-fact"> · {{ t('recipe.coneCards.outside') }}</span>
              }
            </dt>
            <dd>{{ item.summary }}</dd>
          }
        </dl>
      </section>
    }
  </ng-container>`,
  styles: `
    .cone-summaries dl {
      margin: 0;
    }
    .cone-summaries dt {
      font-weight: 600;
    }
    .cone-summaries-fact {
      font-weight: normal;
      color: var(--gc-muted);
    }
    .cone-summaries dd {
      white-space: pre-line;
      margin: 0 0 0.5rem;
    }
  `
})
export class ConeSummaries {
  readonly block = input<FiringBlock | null | undefined>(null);
  readonly results = input<ConeResult[] | null | undefined>(null);
  /** How the reader fires: their cone system and temperature scale. */
  readonly reader = input.required<Reader>();
  readonly headingId = input('cone-summaries-heading');
  /** The heading's level: 2 on the shared page, 3 in the print view. */
  readonly level = input<2 | 3>(3);

  protected readonly shown = computed(() => {
    const block = this.block();
    const reader = this.reader();
    return coneCards(block, [], this.results() ?? [])
      .filter((card) => card.cone && card.summary)
      .map((card) => ({
        key: card.key,
        place: placeText(card.scale, card, reader),
        approx: approxText(card.scale, card.cone!, reader),
        outside: card.outside,
        summary: card.summary
      }));
  });
}
