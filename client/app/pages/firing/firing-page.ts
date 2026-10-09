import { DatePipe } from '../../shared/format-pipes';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Firing } from '../../core/models';
import { Busy } from '../../shared/busy';
import { FieldCheck, FieldChecks, required } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';
import { localDate, optional } from '../../shared/dates';
import { FIRING_FIELDS, firingFieldLabel, firstOf } from '../../shared/options';
import { PageHeader } from '../../shared/page-header';
import { Removal, RemoveButton } from '../../shared/remove-button';
import { FiringLog } from './firing-log';

@Component({
  selector: 'gc-firing-page',
  imports: [DatePipe, FieldCheck, FormsModule, NoticesList, PageHeader, RemoveButton, TranslocoDirective],
  templateUrl: './firing-page.html'
})
export class FiringPage implements OnInit {
  private readonly firings = inject(ApiResourceFactory).for<Firing>('firing');

  protected readonly fieldOptions = FIRING_FIELDS;
  /** A column as the reader reads it; the log keeps its English name. */
  protected readonly fieldLabel = firingFieldLabel;
  protected readonly firstOf = firstOf;
  protected readonly notices = new Notices();
  protected readonly saving = new Busy();

  protected readonly title = signal('');
  protected readonly kiln = signal('');
  protected readonly date = signal('');
  protected readonly notes = signal('');
  protected readonly selectedField = signal(FIRING_FIELDS[0]);
  protected readonly log = signal(new FiringLog());
  protected readonly checks = new FieldChecks(
    () => ({
      title: required(this.title, translate('notebook.firing.titleMissing')),
      fields: () =>
        this.log().fields.length
          ? null
          : translate('notebook.firing.fieldsMissing', { example: firingFieldLabel('Time') })
    }),
    { sendOnly: ['fields'] }
  );

  protected readonly myFirings = signal<Firing[]>([]);
  protected readonly removal = new Removal(this.firings, this.myFirings, this.notices, (firing) => firing.title);

  async ngOnInit(): Promise<void> {
    try {
      this.myFirings.set(await this.firings.getAll());
    } catch {
      this.notices.error(translate('notebook.firing.fetchFailed'));
    }
  }

  protected addField(): void {
    const field = this.selectedField();
    if (!field) {
      this.checks.report('fields', translate('notebook.firing.chooseField'));
      return;
    }
    this.change((log) => log.addField(field));
    this.checks.recheck('fields');
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

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    const log = this.log();
    if (!this.checks.validate()) return;
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
      this.notices.success(translate('notebook.firing.saved'));
      for (const field of [this.title, this.kiln, this.date, this.notes]) field.set('');
      this.log.set(new FiringLog());
    } catch (err) {
      this.notices.error(errorMessage(err, translate('notebook.firing.saveFailed')));
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
}
