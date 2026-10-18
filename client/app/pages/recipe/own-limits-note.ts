import { Component, computed, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { PreferencesService } from '../../core/preferences.service';

// The substitution, suggestion and lead-replacement checks always use Glazecalc's
// own graded limits (lib/recipe/limits.js, docs/adr/0019-shared-recipe-tools.md).
// When the limits the recipe page shows are another set, this says so in a line,
// so a suggestion that disagrees with the table above is not a surprise.

const SET_NAMES: Record<string, string> = {
  'hesselberth-roy': marker('recipe.limits.sets.hesselberth-roy')
};

@Component({
  selector: 'gc-own-limits-note',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (other(); as name) {
      <p class="own-limits-note">{{ t('recipe.limits.ownLimits', { name: t(name) }) }}</p>
    }
  </ng-container>`,
  styles: `
    .own-limits-note {
      font-size: 0.9rem;
      color: var(--gc-muted);
    }
  `
})
export class OwnLimitsNote {
  private readonly preferences = inject(PreferencesService);
  /** The key of the other set's name when the limits shown are not Glazecalc's own; '' when they are. */
  protected readonly other = computed(() => SET_NAMES[this.preferences.limitSet()] ?? '');
}
