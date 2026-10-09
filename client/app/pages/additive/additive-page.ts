import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { formatFormula } from '../../../../lib/chemistry';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Additive } from '../../core/models';
import { Busy } from '../../shared/busy';
import { ChemistryForm } from '../../shared/chemistry-form';
import { FieldCheck } from '../../shared/field-checks';
import { fixed } from '../../shared/format';
import { Notices, NoticesList } from '../../shared/notices';
import { ADDITIVE_OXIDES, fieldsText, firstOf } from '../../shared/options';
import { PageHeader } from '../../shared/page-header';
import { Removal, RemoveButton } from '../../shared/remove-button';
import { StandardList } from '../../shared/standard-list';

@Component({
  selector: 'gc-additive-page',
  imports: [FieldCheck, FormsModule, NoticesList, PageHeader, RemoveButton, StandardList, TranslocoDirective],
  templateUrl: './additive-page.html'
})
export class AdditivePage implements OnInit {
  private readonly additives = inject(ApiResourceFactory).for<Additive>('additives');

  protected readonly oxides = ADDITIVE_OXIDES;
  protected readonly firstOf = firstOf;
  protected readonly fieldsText = fieldsText;
  protected readonly formatFormula = formatFormula;
  protected readonly fixed = fixed;
  protected readonly notices = new Notices();
  protected readonly saving = new Busy();

  // An additive is entered as a material is (fired oxides and LOI), so a recipe can count it in the unity formula.
  protected readonly form = new ChemistryForm(this.notices, 'additive');

  protected readonly myAdditives = signal<Additive[]>([]);
  protected readonly standardAdditives = signal<Additive[]>([]);
  protected readonly removal = new Removal(this.additives, this.myAdditives, this.notices, (additive) => additive.name);

  ngOnInit(): void {
    this.additives.getAll().then(
      (list) => this.myAdditives.set(list),
      () => this.notices.error(translate('library.additive.fetchFailed'))
    );
    this.additives.getStandard().then(
      (list) => this.standardAdditives.set(list),
      () => this.notices.error(translate('library.additive.standardFetchFailed'))
    );
  }

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    const additive = this.form.noChemistry() ? this.form.buildWithoutChemistry() : this.form.build();
    if (!additive) return;
    try {
      const saved = await this.additives.create(additive);
      this.myAdditives.update((list) => [...list, saved]);
      this.notices.success(translate('library.additive.saved'));
      this.form.reset();
    } catch (err) {
      this.notices.error(errorMessage(err, translate('library.common.saveFailed')));
    }
  }
}
