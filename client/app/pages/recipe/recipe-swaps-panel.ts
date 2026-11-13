import { Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Material } from '../../core/models';
import { RichText } from '../../i18n/rich-text';
import { listOf } from '../../shared/format';
import { FixedPipe } from '../../shared/format-pipes';
import { CLEAR_OF_PEEK } from './focus';
import { OwnLimitsNote } from './own-limits-note';
import { RecipeSwaps } from './recipe-swaps';
import { oxideLabel } from './suggest';
import { SwapReport } from './swap-report';
import { TryMaterials } from './try-materials';

/**
 * The recipe's swaps, under its materials (in the workbench, its "Fix and swap" fold): materials no longer
 * current with Try modern materials and Suggest amounts, Replace lead, Match with what I have, and Undo the
 * swap with how it was made. What each asks and does is in recipe-swaps.ts.
 */
@Component({
  selector: 'gc-recipe-swaps',
  imports: [FixedPipe, OwnLimitsNote, RichText, SwapReport, TranslocoDirective, TryMaterials],
  templateUrl: './recipe-swaps-panel.html',
  styles: [
    `
      /* No box of its own: its parts are laid out as parts of the editor. */
      :host {
        display: contents;
      }
    `,
    CLEAR_OF_PEEK
  ]
})
export class RecipeSwapsPanel {
  readonly swaps = input.required<RecipeSwaps>();
  /** The lists to try materials from, as the page has them. */
  readonly mine = input.required<Material[]>();
  readonly standard = input.required<Material[]>();
  readonly standardFailed = input(false);
  readonly hideLead = input(false);
  /** Keys of the recipe's own materials, marked in the lists rather than offered. */
  readonly inRecipe = input<ReadonlySet<string>>(new Set());
  /** Whether the swap's report shows here: not while the compare view shows it. */
  readonly reportHere = input(true);
  /** Asks for the standard list again, after it could not be fetched. */
  readonly retry = output<void>();

  protected readonly listOf = listOf;
  protected readonly oxideLabel = oxideLabel;
  protected readonly noKeys: ReadonlySet<string> = new Set();
}
