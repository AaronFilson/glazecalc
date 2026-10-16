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

    <section class="panel" aria-labelledby="notes-new-heading">
      <h2 class="h3" id="notes-new-heading">{{ t('notebook.notes.newHeading') }}</h2>
      <form (ngSubmit)="save()" class="notes-form">
        <div class="mb-3">
          <label for="title" class="form-label">{{ t('notebook.notes.titleLabel') }}</label>
          <input
            id="title"
            type="text"
            name="title"
            class="form-control"
            required
            [(ngModel)]="title"
            [gcField]="checks"
            gcFieldName="title"
          />
        </div>
        <div class="mb-3">
          <label for="content" class="form-label">{{ t('notebook.notes.content') }}</label>
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

    <section class="panel" aria-labelledby="notes-mine-heading">
      <h2 class="h3" id="notes-mine-heading">{{ t('notebook.notes.mineHeading') }}</h2>
      @if (notes().length) {
        <ul class="my-notes">
          @for (note of notes(); track note._id) {
            <li>
              <h3 class="h5">{{ note.title }}</h3>
              <p class="keep-lines">{{ note.content }}</p>
              <gc-remove-button
                [name]="removal.nameOf(note)"
                [busy]="removal.isPending(note)"
                [problem]="removal.problemFor(note)"
                (confirmed)="removal.remove(note)"
              />
            </li>
          }
        </ul>
      } @else if (loaded()) {
        <p class="muted notes-empty">{{ t('notebook.notes.noneSaved') }}</p>
      }
    </section>
  </ng-container>`,
  styles: `
    .notes-form {
      max-width: 40rem;
    }
    .my-notes {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .my-notes > li + li {
      border-top: 1px solid var(--gc-border);
      padding-top: 1rem;
    }
    .my-notes h3 {
      margin: 0 0 0.25rem;
    }
  `
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
  /** The saved notes have been asked for: until then, "None yet" would be premature. */
  protected readonly loaded = signal(false);
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
    } finally {
      this.loaded.set(true);
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
