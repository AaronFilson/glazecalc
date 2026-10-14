import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { LocaleService } from '../../core/locale.service';
import type { ConeSystem } from '../../core/preferences.service';
import { coneSystemsIn, forConeSystem, readGuide } from './guide-document';
import { GuideText } from './guide-text';
import { GuideView } from './guide-view';

/**
 * One of the guides for new potters, from its Markdown (guide-document.ts).
 * A guide written for more than one way of firing shows the reader's (Settings:
 * Orton cones, SK cones or temperature) and offers the others.
 */
@Component({
  selector: 'gc-guide-page',
  imports: [GuideView, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-guide-view [guide]="guide()" [textLanguage]="source.language">
      @if (source.language) {
        <p class="guide-note">{{ t('guides.notTranslated') }}</p>
      }
      @if (others().length) {
        <p class="guide-note guide-version">
          {{ t(shownKey[shown()]) }}
          @for (other of others(); track other) {
            <button type="button" class="btn btn-link link-inline" (click)="choose(other)">
              {{ t(showKey(other)) }}
            </button>
          }
        </p>
      }
    </gc-guide-view>
  </ng-container>`
})
export class GuidePage {
  private readonly locale = inject(LocaleService);
  protected readonly source: GuideText = inject(ActivatedRoute).snapshot.data['text'];
  /** The way the reader asked for here, instead of their own. */
  private readonly asked = signal<ConeSystem | null>(null);
  /** Orton cones, SK cones or temperature: the reader's (which follows Settings once the page is up), until they ask for another. */
  protected readonly cones = computed(() => this.asked() ?? this.locale.cones());
  /** The ways of firing the guide has parts for. */
  private readonly systems = coneSystemsIn(this.source.text);
  /**
   * The version on the page. A guide with no part for SK cones shows those who fire to them the temperature
   * parts. One found after the first render (the reader's Settings, once the page is up) is drawn in a task
   * of its own: reading and drawing another version of a long guide is the longest part of that switch, and
   * a phone would otherwise be busy with all of it at once.
   */
  protected readonly shown = signal<ConeSystem>(untracked(() => this.versionFor(this.cones())));
  /** The other versions on offer; none, for a guide that has only one. */
  protected readonly others = computed(() =>
    this.systems.length > 1 ? this.systems.filter((s) => s !== this.shown()) : []
  );
  protected readonly guide = computed(() => readGuide(forConeSystem(this.source.text, this.shown())));

  protected readonly shownKey: Record<ConeSystem, string> = {
    orton: marker('guides.version.cones'),
    sk: marker('guides.version.sk'),
    temperature: marker('guides.version.temperature')
  };

  constructor() {
    let pending: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const version = this.versionFor(this.cones());
      clearTimeout(pending);
      if (version !== untracked(() => this.shown())) pending = setTimeout(() => this.shown.set(version));
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(pending));
  }

  /** The version of this guide for a way of firing. */
  private versionFor(cones: ConeSystem): ConeSystem {
    if (this.systems.includes(cones)) return cones;
    return this.systems.includes('temperature') ? 'temperature' : cones;
  }

  protected choose(system: ConeSystem): void {
    this.asked.set(system);
    // Asked for here: drawn at once.
    this.shown.set(this.versionFor(system));
  }

  /** What the button for a version says. With SK cones in the guide, "cones" would be ambiguous, so Orton is named. */
  protected showKey(system: ConeSystem): string {
    if (system === 'temperature') return marker('guides.version.showTemperature');
    if (system === 'sk') return marker('guides.version.showSk');
    return this.systems.includes('sk') ? marker('guides.version.showOrton') : marker('guides.version.showCones');
  }
}
