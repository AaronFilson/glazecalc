import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Firing } from '../../core/models';
import { Notices, NoticesList } from '../../shared/notices';
import { localDate, optional } from '../../shared/dates';
import { FIRING_FIELDS, firstOf } from '../../shared/options';
import { PageNav } from '../../shared/page-nav';
import { FiringLog } from './firing-log';

@Component({
  selector: 'gc-firing-page',
  imports: [DatePipe, FormsModule, NoticesList, PageNav],
  templateUrl: './firing-page.html'
})
export class FiringPage implements OnInit {
  private readonly firings = inject(ApiResourceFactory).for<Firing>('firing');

  protected readonly fieldOptions = FIRING_FIELDS;
  protected readonly firstOf = firstOf;
  protected readonly notices = new Notices();

  protected readonly title = signal('');
  protected readonly kiln = signal('');
  protected readonly date = signal('');
  protected readonly notes = signal('');
  protected readonly selectedField = signal(FIRING_FIELDS[0]);
  protected readonly log = signal(new FiringLog());

  protected readonly myFirings = signal<Firing[]>([]);
  protected readonly showRemove = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      this.myFirings.set(await this.firings.getAll());
    } catch {
      this.notices.error('There was an error in getting the firing records information.');
    }
  }

  protected addField(): void {
    const field = this.selectedField();
    if (!field) {
      this.notices.error('Error: please select a field.');
      return;
    }
    this.change((log) => log.addField(field));
  }

  protected moveField(index: number, direction: -1 | 1): void {
    this.change((log) => log.moveField(index, direction));
  }

  protected removeField(index: number): void {
    this.change((log) => log.removeField(index));
  }

  protected addRow(): void {
    this.change((log) => log.addRow());
  }

  protected removeRow(index: number): void {
    this.change((log) => log.removeRow(index));
  }

  protected setCell(row: number, column: number, value: string): void {
    // Edits a cell in place; the row arrays are owned by this log.
    this.log().rows[row][column] = value;
  }

  protected async save(): Promise<void> {
    const log = this.log();
    if (!this.title() || !log.fields.length) {
      this.notices.error('Error: enter a title and at least one field.');
      return;
    }
    try {
      const saved = await this.firings.create({
        title: this.title(),
        kiln: optional(this.kiln()),
        date: this.date() || localDate(),
        notes: optional(this.notes()),
        fieldsIncluded: log.fields,
        rows: log.rows
      });
      this.myFirings.update((list) => [...list, saved]);
      this.notices.success('Success in adding the firing record to the server.');
      for (const field of [this.title, this.kiln, this.date, this.notes]) field.set('');
      this.log.set(new FiringLog());
    } catch (err) {
      this.notices.error(errorMessage(err, 'Error: the request to the server failed.'));
    }
  }

  /** Applies a change to a copy of the log so the view sees a new value. */
  private change(edit: (log: FiringLog) => void): void {
    this.log.update((current) => {
      const next = Object.assign(new FiringLog(), current);
      edit(next);
      return next;
    });
  }

  protected async remove(firing: Firing): Promise<void> {
    try {
      await this.firings.remove(firing);
      this.myFirings.update((list) => list.filter((f) => f !== firing));
      this.notices.success('Success in removing the firing from the server.');
    } catch {
      this.notices.error('Error in deleting the firing from the server.');
    }
  }
}
