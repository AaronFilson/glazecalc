import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Additive } from '../../core/models';
import { Busy } from '../../shared/busy';
import { Notices, NoticesList } from '../../shared/notices';
import { optional } from '../../shared/dates';
import { ADDITIVE_COMPONENTS, ELEMENTS, firstOf } from '../../shared/options';
import { PageHeader } from '../../shared/page-header';

interface FormulaLine {
  name: string;
  amount: string;
}

@Component({
  selector: 'gc-additive-page',
  imports: [FormsModule, NoticesList, PageHeader],
  templateUrl: './additive-page.html'
})
export class AdditivePage implements OnInit {
  private readonly additives = inject(ApiResourceFactory).for<Additive>('additives');

  protected readonly components = ADDITIVE_COMPONENTS;
  protected readonly elements = ELEMENTS;
  protected readonly firstOf = firstOf;
  protected readonly notices = new Notices();
  protected readonly saving = new Busy();

  protected readonly name = signal('');
  protected readonly rawformula = signal('');
  protected readonly relatedTo = signal('');
  protected readonly notes = signal('');
  protected readonly selectedComponent = signal('');
  protected readonly selectedElement = signal('');
  protected readonly formula = signal<FormulaLine[]>([]);

  protected readonly myAdditives = signal<Additive[]>([]);
  protected readonly standardAdditives = signal<Additive[]>([]);
  protected readonly showRemove = signal(false);

  ngOnInit(): void {
    this.additives.getAll().then(
      (list) => this.myAdditives.set(list),
      () => this.notices.error('There was an error in getting the additives information.')
    );
    this.additives.getStandard().then(
      (list) => this.standardAdditives.set(list),
      () => this.notices.error('There was an error in getting the standard additives information.')
    );
  }

  protected addToFormula(part: string, kind: 'component' | 'element'): void {
    if (!part) {
      this.notices.error('Error: please select an ' + kind + '.');
      return;
    }
    this.formula.update((lines) => [...lines, { name: part, amount: '0' }]);
  }

  protected removeFromFormula(index: number): void {
    this.formula.update((lines) => lines.filter((_, i) => i !== index));
  }

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    if (!this.name() || !this.formula().length) {
      this.notices.error('Error: enter a name and at least one component or element.');
      return;
    }
    const additive: Additive = {
      name: this.name(),
      rawformula: optional(this.rawformula()),
      relatedTo: optional(this.relatedTo()),
      notes: optional(this.notes()),
      fields: this.formula().map((line) => ({ ...line }))
    };
    try {
      const saved = await this.additives.create(additive);
      this.myAdditives.update((list) => [...list, saved]);
      this.notices.success('Success. Additive added to database.');
      for (const field of [this.name, this.rawformula, this.relatedTo, this.notes]) field.set('');
      this.formula.set([]);
    } catch (err) {
      this.notices.error(errorMessage(err, 'Error: the request to the server failed.'));
    }
  }

  protected async remove(additive: Additive): Promise<void> {
    try {
      await this.additives.remove(additive);
      this.myAdditives.update((list) => list.filter((a) => a !== additive));
      this.notices.success('Success in removing the additive from the server.');
    } catch {
      this.notices.error('Error in deleting the additive from the server.');
    }
  }

  protected fieldsText(additive: Additive): string {
    return additive.fields.map((field) => field.name + ' : ' + field.amount).join('; ');
  }
}
