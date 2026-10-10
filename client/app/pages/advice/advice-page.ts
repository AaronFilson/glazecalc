import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { RichText } from '../../i18n/rich-text';
import { Advice } from '../../core/models';
import { Busy } from '../../shared/busy';
import { FieldCheck, FieldChecks, required } from '../../shared/field-checks';
import { listOf } from '../../shared/format';
import { Notices, NoticesList } from '../../shared/notices';
import { PageHeader } from '../../shared/page-header';
import { Removal, RemoveButton } from '../../shared/remove-button';
import { standardText } from '../../shared/library-info';

@Component({
  selector: 'gc-advice-page',
  imports: [FieldCheck, FormsModule, NoticesList, PageHeader, RemoveButton, RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('site.advice.title')" [lead]="t('site.advice.lead')" />
    <gc-notices [notices]="notices" />

    @if (!signedIn()) {
      <p class="help-text">
        <gc-rich [text]="t('site.advice.signUp')" [links]="{ signup: '/signup', signin: '/signin' }" />
      </p>
    }

    <!-- Holds the window's height until the list arrives, so nothing below jumps when it does. -->
    <section class="tech-info" [class.loading]="!standardLoaded()">
      <h2>{{ t('site.advice.generalHeading') }}</h2>
      <ul class="general-advice">
        @for (adv of standardAdvice(); track adv._id) {
          <li>
            <h3>{{ standardText(adv, adv.title) }}</h3>
            <p>{{ standardText(adv, adv.content) }}</p>
            <div class="small muted">{{ t('site.advice.tags', { list: tagsText(adv) }) }}</div>
          </li>
        }
      </ul>
    </section>

    @if (signedIn()) {
      <section class="help-text">
        <h2>{{ t('site.advice.addHeading') }}</h2>
        <form (ngSubmit)="save()">
          <div class="mb-3">
            <label for="advice-title">{{ t('site.advice.titleLabel') }} </label>
            <input
              id="advice-title"
              type="text"
              name="title"
              required
              [(ngModel)]="title"
              [gcField]="checks"
              gcFieldName="title"
            />
          </div>
          <div class="mb-3">
            <label for="advice-tags">{{ t('site.advice.tagsLabel') }} </label>
            <input id="advice-tags" type="text" name="tags" [(ngModel)]="tags" />
          </div>
          <div class="mb-3">
            <label for="advice-content" class="boxlabel">{{ t('site.advice.contentLabel') }} </label>
            <textarea
              id="advice-content"
              name="content"
              rows="4"
              class="form-control"
              required
              [(ngModel)]="content"
              [gcField]="checks"
              gcFieldName="content"
            ></textarea>
          </div>
          <button type="submit" class="btn btn-primary" [disabled]="saving.active()">
            {{ t('site.advice.save') }}
          </button>
        </form>
      </section>

      <section class="tech-info">
        <h2>{{ t('site.advice.mineHeading') }}</h2>
        <ul class="my-advice">
          @for (adv of myAdvice(); track adv._id) {
            <li>
              <h3>{{ adv.title }}</h3>
              <p class="keep-lines">{{ adv.content }}</p>
              <div class="small muted">{{ t('site.advice.tags', { list: tagsText(adv) }) }}</div>
              <gc-remove-button
                [name]="removal.nameOf(adv)"
                [busy]="removal.isPending(adv)"
                [problem]="removal.problemFor(adv)"
                (confirmed)="removal.remove(adv)"
              />
            </li>
          } @empty {
            <li class="muted">{{ t('site.advice.nothingSaved') }}</li>
          }
        </ul>
      </section>
    }
  </ng-container>`,
  styles: `
    .loading {
      min-height: 100vh;
    }
    .general-advice,
    .my-advice {
      list-style: none;
      padding: 0;
    }
    .general-advice li,
    .my-advice li {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--gc-border);
    }
    .general-advice li:last-child,
    .my-advice li:last-child {
      border-bottom: 0;
    }
    h3 {
      font-size: 1.15rem;
      margin-bottom: 0.25rem;
    }
    p {
      margin-bottom: 0.25rem;
    }
  `
})
export class AdvicePage implements OnInit {
  private readonly advice = inject(ApiResourceFactory).for<Advice>('advice');
  private readonly auth = inject(AuthService);

  protected readonly signedIn = computed(() => this.auth.hasSession());

  protected readonly notices = new Notices();
  protected readonly saving = new Busy();
  protected readonly title = signal('');
  protected readonly tags = signal('');
  protected readonly content = signal('');
  protected readonly checks = new FieldChecks(() => ({
    title: required(this.title, translate('site.advice.titleMissing')),
    content: required(this.content, translate('site.advice.contentMissing'))
  }));
  protected readonly myAdvice = signal<Advice[]>([]);
  protected readonly standardAdvice = signal<Advice[]>([]);
  protected readonly standardLoaded = signal(false);
  protected readonly removal = new Removal(this.advice, this.myAdvice, this.notices, (adv) => adv.title);

  ngOnInit(): void {
    // The general advice is public; a visitor who is not signed in has none of their own.
    if (this.signedIn()) {
      this.advice.getAll().then(
        (list) => this.myAdvice.set(list),
        () => this.notices.error(translate('site.advice.fetchFailed'))
      );
    }
    this.advice
      .getStandard()
      .then(
        (list) => this.standardAdvice.set(list),
        () => this.notices.error(translate('site.advice.standardFetchFailed'))
      )
      .finally(() => this.standardLoaded.set(true));
  }

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    if (!this.checks.validate()) return;
    try {
      const saved = await this.advice.create({
        title: this.title(),
        content: this.content(),
        tags: this.tags() || 'none'
      });
      this.myAdvice.update((list) => [...list, saved]);
      this.notices.success(translate('site.advice.saved'));
      this.title.set('');
      this.tags.set('');
      this.content.set('');
    } catch (err) {
      this.notices.error(errorMessage(err, translate('site.advice.saveFailed')));
    }
  }

  protected readonly standardText = standardText;

  protected tagsText(adv: Advice): string {
    const tags = Array.isArray(adv.tags) ? adv.tags : [adv.tags];
    return listOf(
      tags.map((tag) => standardText(adv, tag)),
      'unit'
    );
  }
}
