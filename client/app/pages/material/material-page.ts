import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatFormula } from '../../../../lib/chemistry';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Material } from '../../core/models';
import { Busy } from '../../shared/busy';
import { ChemistryForm } from '../../shared/chemistry-form';
import { FieldCheck } from '../../shared/field-checks';
import { Notices, NoticesList } from '../../shared/notices';
import { FIRED_OXIDES, fieldsText, firstOf } from '../../shared/options';
import { PageHeader } from '../../shared/page-header';
import { Removal, RemoveButton } from '../../shared/remove-button';
import { StandardList } from '../../shared/standard-list';

@Component({
  selector: 'gc-material-page',
  imports: [FieldCheck, FormsModule, NoticesList, PageHeader, RemoveButton, StandardList],
  templateUrl: './material-page.html'
})
export class MaterialPage implements OnInit {
  private readonly materials = inject(ApiResourceFactory).for<Material>('materials');

  protected readonly oxides = FIRED_OXIDES;
  protected readonly firstOf = firstOf;
  protected readonly fieldsText = fieldsText;
  protected readonly formatFormula = formatFormula;
  protected readonly notices = new Notices();
  protected readonly saving = new Busy();

  protected readonly form = new ChemistryForm(this.notices);

  protected readonly myMaterials = signal<Material[]>([]);
  protected readonly standardMaterials = signal<Material[]>([]);
  protected readonly sortedMyMaterials = computed(() =>
    [...this.myMaterials()].sort((a, b) => a.name.localeCompare(b.name))
  );
  protected readonly removal = new Removal(this.materials, this.myMaterials, this.notices, (material) => material.name);

  ngOnInit(): void {
    this.materials.getAll().then(
      (list) => this.myMaterials.set(list),
      () => this.notices.error('There was an error in getting the materials information.')
    );
    this.materials.getStandard().then(
      (list) => this.standardMaterials.set(list),
      () => this.notices.error('There was an error in getting the standard materials information.')
    );
  }

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    const material = this.form.build();
    if (!material) return;
    try {
      const saved = await this.materials.create(material);
      this.myMaterials.update((list) => [...list, saved]);
      this.notices.success('Success. Material added to database.');
      this.form.reset();
    } catch (err) {
      this.notices.error(errorMessage(err, 'Error: the request to the server failed.'));
    }
  }
}
