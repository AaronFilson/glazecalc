import { Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Outbox } from '../core/outbox';

/**
 * "Waiting to save" beside a record (or a setting) that has a change made offline not yet sent
 * (core/outbox.ts). Shows nothing when none waits.
 */
@Component({
  selector: 'gc-pending-badge',
  imports: [TranslocoDirective],
  template: `
    @if (waiting()) {
      <span *transloco="let t" class="pending-badge">{{ t('outbox.waiting') }}</span>
    }
  `,
  styles: `
    .pending-badge {
      display: inline-block;
      margin-inline-start: 0.5rem;
      padding: 0.1rem 0.5rem;
      border-radius: var(--gc-radius, 0.5rem);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--gc-pending-text, #4a3b00);
      background: var(--gc-pending-bg, #ffe9a3);
    }
  `
})
export class PendingBadge {
  /** The collection (recipe, materials, ...). */
  readonly area = input.required<string>();
  /** The record's id; nothing is shown without one. */
  readonly id = input<string | undefined>();

  private readonly outbox = inject(Outbox);
  protected readonly waiting = computed(() => {
    const id = this.id();
    return id !== undefined && this.outbox.pendingFor(this.area(), id);
  });
}
