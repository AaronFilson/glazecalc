import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Note } from '../../core/models';
import { Busy } from '../../shared/busy';
import { Notices, NoticesList } from '../../shared/notices';
import { PageHeader } from '../../shared/page-header';

@Component({
  selector: 'gc-notes-page',
  imports: [FormsModule, NoticesList, PageHeader],
  template: `
    <gc-page-header title="Notes" lead="Anything else worth remembering about your glazes." />
    <gc-notices [notices]="notices" />

    <section class="help-text">
      <p>This is the notes page. You can take notes and save them here.</p>
      <form (ngSubmit)="save()">
        <div class="mb-3">
          <label for="title">Title: </label>
          <input id="title" type="text" name="title" [(ngModel)]="title" />
        </div>
        <div class="mb-3">
          <label for="content">Your Note: </label>
          <textarea id="content" name="content" rows="4" class="form-control" [(ngModel)]="content"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="saving.active()">Save</button>
      </form>
    </section>
    <br />

    <section class="tech-info">
      <h3>My saved notes:</h3>
      <ul class="my-notes">
        @for (note of notes(); track note._id) {
          <li>
            <b>{{ note.title }}</b>
            <p>{{ note.content }}</p>
            @if (showRemove()) {
              <button type="button" class="btn btn-light border" (click)="remove(note)">Remove</button>
            }
          </li>
        }
      </ul>
      <button type="button" class="btn btn-light border" (click)="showRemove.set(!showRemove())">
        Toggle Remove button
      </button>
    </section>
  `
})
export class NotesPage implements OnInit {
  private readonly api = inject(ApiResourceFactory).for<Note>('notes');

  protected readonly notices = new Notices();
  protected readonly saving = new Busy();
  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly notes = signal<Note[]>([]);
  protected readonly showRemove = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      this.notes.set(await this.api.getAll());
    } catch {
      this.notices.error('There was an error getting the notes information.');
    }
  }

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    if (!this.title() || !this.content()) {
      this.notices.error('Error: there was missing info on submit.');
      return;
    }
    try {
      const saved = await this.api.create({
        title: this.title(),
        content: this.content(),
        relatedCollection: 'Notes',
        relatedId: 'general notes'
      });
      this.notes.update((list) => [...list, saved]);
      this.notices.success('Success in adding the note to the server.');
      this.title.set('');
      this.content.set('');
    } catch (err) {
      this.notices.error(errorMessage(err, 'Error: the request to the server failed.'));
    }
  }

  protected async remove(note: Note): Promise<void> {
    try {
      await this.api.remove(note);
      this.notes.update((list) => list.filter((n) => n !== note));
      this.notices.success('Success in removing the note from the server.');
    } catch {
      this.notices.error('Error in deleting the note from the server.');
    }
  }
}
