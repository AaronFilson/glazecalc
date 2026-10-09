import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LocaleService } from '../../core/locale.service';
import { forConeSystem, readGuide } from './guide-document';
import { GuideText } from './guide-text';
import { GuideView } from './guide-view';

/**
 * One of the guides for new potters, from its Markdown (guide-document.ts).
 * A guide written for both ways of firing shows the reader's (Settings: cones
 * or temperature) and offers the other.
 */
@Component({
  selector: 'gc-guide-page',
  imports: [GuideView, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-guide-view [guide]="guide()" [textLanguage]="source.language">
      @if (source.language) {
        <p class="guide-note">{{ t('guides.notTranslated') }}</p>
      }
      @if (twoWays()) {
        <p class="guide-note guide-version">
          {{ cones() === 'orton' ? t('guides.version.cones') : t('guides.version.temperature') }}
          <button type="button" class="btn btn-link link-inline" (click)="otherWay()">
            {{ cones() === 'orton' ? t('guides.version.showTemperature') : t('guides.version.showCones') }}
          </button>
        </p>
      }
    </gc-guide-view>
  </ng-container>`
})
export class GuidePage {
  private readonly locale = inject(LocaleService);
  protected readonly source: GuideText = inject(ActivatedRoute).snapshot.data['text'];
  /** Cones or temperature: the reader's, until they ask for the other. */
  protected readonly cones = signal(this.locale.cones());
  protected readonly twoWays = computed(() => /^:::(orton|temperature)$/m.test(this.source.text));
  protected readonly guide = computed(() => readGuide(forConeSystem(this.source.text, this.cones())));

  protected otherWay(): void {
    this.cones.update((cones) => (cones === 'orton' ? 'temperature' : 'orton'));
  }
}
