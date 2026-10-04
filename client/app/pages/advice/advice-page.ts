import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Advice } from '../../core/models';
import { Notices, NoticesList } from '../../shared/notices';
import { PageNav } from '../../shared/page-nav';

@Component({
  selector: 'gc-advice-page',
  imports: [FormsModule, NoticesList, PageNav],
  template: `
    <gc-page-nav current="advice" />
    <gc-notices [notices]="notices" />

    <section class="help-text">
      <p>
        This is a page to store and view your favorite pieces of advice on glazes and firing.
        Basic advice on glaze formulation and mixing is programmed in.
      </p>
      <form (ngSubmit)="save()">
        <div class="form-group">
          <label for="advice-title">Title: </label>
          <input id="advice-title" type="text" name="title" [(ngModel)]="title">
        </div>
        <div class="form-group">
          <label for="advice-tags">Tags: </label>
          <input id="advice-tags" type="text" name="tags" [(ngModel)]="tags">
        </div>
        <div class="form-group">
          <label for="advice-content" class="boxlabel">Advice Content: </label>
          <textarea id="advice-content" name="content" rows="4" class="form-control" [(ngModel)]="content"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Save</button>
      </form>
    </section>
    <br>

    <section class="tech-info">
      <h4>My advice :</h4>
      <ul class="my-advice">
        @for (adv of myAdvice(); track adv._id) {
          <li>
            <b>{{ adv.title }}</b>
            <p>{{ adv.content }}</p>
            <div class="small">Tags: {{ tagsText(adv) }}</div>
            @if (showRemove()) {
              <button type="button" class="btn btn-default" (click)="remove(adv)">Remove</button>
            }
          </li>
        }
      </ul>
      <button type="button" class="btn btn-default" (click)="showRemove.set(!showRemove())">Toggle Remove Button</button>

      <h4>General advice:</h4>
      <ul class="general-advice">
        @for (adv of standardAdvice(); track adv._id) {
          <li>
            <b>{{ adv.title }}</b>
            <p>{{ adv.content }}</p>
            <div class="small">Tags: {{ tagsText(adv) }}</div>
          </li>
        }
      </ul>
    </section>
  `
})
export class AdvicePage implements OnInit {
  private readonly advice = inject(ApiResourceFactory).for<Advice>('advice');

  protected readonly notices = new Notices();
  protected readonly title = signal('');
  protected readonly tags = signal('');
  protected readonly content = signal('');
  protected readonly myAdvice = signal<Advice[]>([]);
  protected readonly standardAdvice = signal<Advice[]>([]);
  protected readonly showRemove = signal(false);

  ngOnInit(): void {
    this.advice.getAll().then((list) => this.myAdvice.set(list),
      () => this.notices.error('There was an error in getting the advice information.'));
    this.advice.getStandard().then((list) => this.standardAdvice.set(list),
      () => this.notices.error('There was an error in getting the server advice information.'));
  }

  protected async save(): Promise<void> {
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
