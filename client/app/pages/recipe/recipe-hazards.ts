import { Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { hazardsOf } from '../../../../lib/recipe/hazards';
import { Owned } from '../../core/models';
import { RichText } from '../../i18n/rich-text';
import { listOf } from '../../shared/format';
import { standardText } from '../../shared/library-info';

/** A material or additive as its hazards are read: its name, and the hazards its record gives. */
export interface HazardSource extends Owned {
  name: string;
  hazards?: string;
}

/**
 * The records to read a recipe's hazards from: for a standard material, the
 * library's current record (its safety data sheet may have changed since the
 * recipe was saved), else the line as it is; a potter's own material, the
 * record as it is now (what they have written since), else the copy saved in
 * the line if that material has been deleted; what they wrote, or nothing.
 */
export function hazardSources(
  lines: readonly HazardSource[],
  standard: readonly HazardSource[],
  own: readonly HazardSource[] = []
): HazardSource[] {
  return lines.map((line) => {
    const records = line.ownedBy === 'Standard' ? standard : own;
    const current = line._id ? records.find((record) => record._id === line._id) : null;
    return current ? { ...current, name: line.name } : line;
  });
}

/** The safety guides the line links to. */
const GUIDES = { mixing: '/guides/safe-mixing', home: '/guides/home-safety' };

/**
 * A recipe's hazards, as its materials' and additives' records give them
 * (lib/recipe/hazards.js): each statement once, after the names it is for,
 * in the page's language where the library's words are translated; the
 * materials with none named, so no hazard is claimed or denied for them; and
 * a line to the safety guides. On the recipe page and on the print.
 */
@Component({
  selector: 'gc-recipe-hazards',
  imports: [RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @let found = hazards();
    <section class="recipe-hazards" [attr.aria-labelledby]="headingId()">
      <h3 [id]="headingId()">{{ t('recipe.hazards.heading') }}</h3>
      @if (found.hazards.length) {
        <p class="recipe-hazards-intro">{{ t('recipe.hazards.intro') }}</p>
        <ul class="recipe-hazards-list">
          @for (hazard of found.hazards; track hazard.text) {
            <li>
              <gc-rich [text]="t('recipe.hazards.line', { names: listOf(hazard.names), hazards: words(hazard) })" />
            </li>
          }
        </ul>
      }
      @if (found.unknown.length) {
        <p>{{ t('recipe.hazards.unknown', { count: found.unknown.length, list: listOf(found.unknown) }) }}</p>
      }
      <p class="recipe-safety-line"><gc-rich [text]="t('recipe.hazards.safety')" [links]="guides" /></p>
    </section>
  </ng-container>`,
  styles: `
    .recipe-hazards h3 {
      font-size: 1.1rem;
    }
    .recipe-hazards-intro {
      color: var(--gc-muted);
      margin-bottom: 0.25rem;
    }
    .recipe-hazards-list {
      padding-inline-start: 1.25rem;
      margin-bottom: 0.5rem;
    }
    .recipe-hazards-list li + li {
      margin-top: 0.25rem;
    }
    .recipe-safety-line {
      border-inline-start: 3px solid var(--gc-border);
      padding-inline-start: 0.75rem;
      margin: 0;
    }
    /* On paper, run together and no smaller than 8.5pt: a batch ticket with its hazards fits one page, A4 or Letter; the whole recipe may flow onto a second. */
    @media print {
      .recipe-hazards {
        break-inside: avoid;
        font-size: 8.5pt;
        line-height: 1.25;
      }
      .recipe-hazards h3 {
        font-size: 10pt;
        margin: 0 0 0.1rem;
      }
      .recipe-hazards-intro {
        display: none;
      }
      .recipe-hazards p,
      .recipe-hazards-list {
        margin-bottom: 0.1rem;
      }
      .recipe-hazards-list {
        padding: 0;
      }
      .recipe-hazards-list li {
        display: inline;
      }
      .recipe-hazards-list li + li::before {
        content: ' · ';
      }
      .recipe-safety-line {
        border: 0;
        padding: 0;
      }
    }
  `
})
export class RecipeHazards {
  readonly sources = input.required<HazardSource[]>();
  /** Its heading's id: one on the recipe page, another on the print. */
  readonly headingId = input('hazards-heading');

  protected readonly guides = GUIDES;
  protected readonly listOf = listOf;
  protected readonly hazards = computed(() => hazardsOf(this.sources()));

  protected words(hazard: { text: string; record: HazardSource }): string {
    return standardText(hazard.record, hazard.text);
  }
}
