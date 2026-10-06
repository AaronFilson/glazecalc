import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { Advice } from '../../core/models';
import { Busy } from '../../shared/busy';
import { Notices, NoticesList } from '../../shared/notices';
import { PageHeader } from '../../shared/page-header';

@Component({
  selector: 'gc-advice-page',
  imports: [FormsModule, NoticesList, PageHeader, RouterLink],
  template: `
    <gc-page-header
      title="Glaze advice"
      lead="Practical tips on mixing, glazing and firing, plus any advice of your own."
    />
    <gc-notices [notices]="notices" />

    @if (!signedIn()) {
      <p class="help-text">
        <a routerLink="/signup">Create a free account</a> or <a routerLink="/signin">sign in</a> to keep advice of your
        own.
      </p>
    }

    <!-- Holds the window's height until the list arrives, so nothing below jumps when it does. -->
    <section class="tech-info" [class.loading]="!standardLoaded()">
      <h2>General advice</h2>
      <ul class="general-advice">
        @for (adv of standardAdvice(); track adv._id) {
          <li>
            <h3>{{ adv.title }}</h3>
            <p>{{ adv.content }}</p>
            <div class="small muted">Tags: {{ tagsText(adv) }}</div>
          </li>
        }
      </ul>
    </section>

    @if (signedIn()) {
      <section class="help-text">
        <h2>Add your own advice</h2>
        <form (ngSubmit)="save()">
          <div class="mb-3">
            <label for="advice-title">Title: </label>
            <input id="advice-title" type="text" name="title" [(ngModel)]="title" />
          </div>
          <div class="mb-3">
            <label for="advice-tags">Tags: </label>
            <input id="advice-tags" type="text" name="tags" [(ngModel)]="tags" />
          </div>
          <div class="mb-3">
            <label for="advice-content" class="boxlabel">Advice Content: </label>
            <textarea id="advice-content" name="content" rows="4" class="form-control" [(ngModel)]="content"></textarea>
          </div>
          <button type="submit" class="btn btn-primary" [disabled]="saving.active()">Save</button>
        </form>
      </section>

      <section class="tech-info">
        <h2>My advice</h2>
        <ul class="my-advice">
          @for (adv of myAdvice(); track adv._id) {
            <li>
              <h3>{{ adv.title }}</h3>
              <p>{{ adv.content }}</p>
              <div class="small muted">Tags: {{ tagsText(adv) }}</div>
              @if (showRemove()) {
                <button type="button" class="btn btn-light border" (click)="remove(adv)">Remove</button>
              }
            </li>
          } @empty {
            <li class="muted">Nothing saved yet.</li>
          }
        </ul>
        <button type="button" class="btn btn-light border" (click)="showRemove.set(!showRemove())">
          Toggle Remove Button
        </button>
      </section>
    }
  `,
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
  protected readonly myAdvice = signal<Advice[]>([]);
  protected readonly standardAdvice = signal<Advice[]>([]);
  protected readonly standardLoaded = signal(false);
  protected readonly showRemove = signal(false);

  ngOnInit(): void {
    // The general advice is public; a visitor who is not signed in has none of their own.
    if (this.signedIn()) {
      this.advice.getAll().then(
        (list) => this.myAdvice.set(list),
        () => this.notices.error('There was an error in getting the advice information.')
      );
    }
    this.advice
      .getStandard()
      .then(
        (list) => this.standardAdvice.set(list),
        () => this.notices.error('There was an error in getting the server advice information.')
      )
      .finally(() => this.standardLoaded.set(true));
  }

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    if (!this.title() || !this.content()) {
      this.notices.error('Error: there was missing information in the form.');
      return;
    }
    try {
      const saved = await this.advice.create({
        title: this.title(),
        content: this.content(),
        tags: this.tags() || 'none'
      });
      this.myAdvice.update((list) => [...list, saved]);
      this.notices.success('Success in adding to the advice records.');
      this.title.set('');
      this.tags.set('');
      this.content.set('');
    } catch (err) {
      this.notices.error(errorMessage(err, 'There was an error in submitting the advice information.'));
    }
  }

  protected async remove(adv: Advice): Promise<void> {
    try {
      await this.advice.remove(adv);
      this.myAdvice.update((list) => list.filter((a) => a !== adv));
      this.notices.success('Success in removing the advice from the server.');
    } catch {
      this.notices.error('Error in deleting the advice from the server.');
    }
  }

  protected tagsText(adv: Advice): string {
    return Array.isArray(adv.tags) ? adv.tags.join(', ') : adv.tags;
  }
}
