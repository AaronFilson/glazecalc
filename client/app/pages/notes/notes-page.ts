import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Note } from '../../core/models';
import { Busy } from '../../shared/busy';
import { FieldCheck, FieldChecks, required } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';
import { PageHeader } from '../../shared/page-header';
import { Removal, RemoveButton } from '../../shared/remove-button';

@Component({
  selector: 'gc-notes-page',
  imports: [FieldCheck, FormsModule, NoticesList, PageHeader, RemoveButton, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('notebook.notes.title')" [lead]="t('notebook.notes.lead')" />
    <gc-notices [notices]="notices" />

    <section class="help-text">
      <p>{{ t('notebook.notes.intro') }}</p>
      <form (ngSubmit)="save()">
        <div class="mb-3">
          <label for="title">{{ t('notebook.notes.titleLabel') }} </label>
          <input
            id="title"
            type="text"
            name="title"
            required
            [(ngModel)]="title"
            [gcField]="checks"
            gcFieldName="title"
          />
        </div>
        <div class="mb-3">
          <label for="content">{{ t('notebook.notes.content') }} </label>
          <textarea
            id="content"
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
          {{ t('notebook.notes.save') }}
        </button>
      </form>
    </section>
    <br />

    <section class="tech-info">
      <h3>{{ t('notebook.notes.mineHeading') }}</h3>
      <ul class="my-notes">
        @for (note of notes(); track note._id) {
          <li>
            <b>{{ note.title }}</b>
            <p>{{ note.content }}</p>
            <gc-remove-button
              [name]="removal.nameOf(note)"
              [busy]="removal.isPending(note)"
              [problem]="removal.problemFor(note)"
              (confirmed)="removal.remove(note)"
            />
          </li>
        }
      </ul>
    </section>
  </ng-container>`
})
export class NotesPage implements OnInit {
  private readonly api = inject(ApiResourceFactory).for<Note>('notes');

  protected readonly notices = new Notices();
  protected readonly saving = new Busy();
  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly checks = new FieldChecks(() => ({
    title: required(this.title, translate('notebook.notes.titleMissing')),
    content: required(this.content, translate('notebook.notes.contentMissing'))
  }));
  protected readonly notes = signal<Note[]>([]);
  protected readonly removal = new Removal(
    this.api,
    this.notes,
    this.notices,
    (note) => note.title || translate('notebook.notes.untitled')
  );

  async ngOnInit(): Promise<void> {
    try {
      this.notes.set(await this.api.getAll());
    } catch {
      this.notices.error(translate('notebook.notes.fetchFailed'));
    }
  }

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    if (!this.checks.validate()) return;
    try {
      const saved = await this.api.create({
        title: this.title(),
        content: this.content(),
        relatedCollection: 'Notes',
        relatedId: 'general notes'
      });
      this.notes.update((list) => [...list, saved]);
      this.notices.success(translate('notebook.notes.saved'));
      this.title.set('');
      this.content.set('');
    } catch (err) {
      this.notices.error(errorMessage(err, translate('notebook.notes.saveFailed')));
    }
  }
}
