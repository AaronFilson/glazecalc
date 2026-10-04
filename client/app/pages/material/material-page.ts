import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { materialWeights } from '../../../../lib/chemistry';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Material } from '../../core/models';
import { Notices, NoticesList } from '../../shared/notices';
import { optional } from '../../shared/dates';
import { FIRED_OXIDES, firstOf } from '../../shared/options';
import { PageNav } from '../../shared/page-nav';

interface FormulaLine {
  name: string;
  amount: string;
}

const round = (value: number, places: number) => Number(value.toFixed(places));

@Component({
  selector: 'gc-material-page',
  imports: [FormsModule, NoticesList, PageNav],
  templateUrl: './material-page.html'
})
export class MaterialPage implements OnInit {
  private readonly materials = inject(ApiResourceFactory).for<Material>('materials');

  protected readonly oxides = FIRED_OXIDES;
  protected readonly firstOf = firstOf;
  protected readonly notices = new Notices();

  protected readonly name = signal('');
  protected readonly rawformula = signal('');
  protected readonly relatedTo = signal('');
  protected readonly notes = signal('');
  protected readonly loi = signal('');
  protected readonly molecularweight = signal('');
  protected readonly percentmole = signal<'molecular' | 'percent'>('molecular');
  protected readonly selectedOxide = signal('');
  protected readonly formula = signal<FormulaLine[]>([]);

  protected readonly myMaterials = signal<Material[]>([]);
  protected readonly standardMaterials = signal<Material[]>([]);
  protected readonly sortedMyMaterials = computed(() =>
    [...this.myMaterials()].sort((a, b) => a.name.localeCompare(b.name)));
  protected readonly showRemove = signal(false);

  ngOnInit(): void {
    this.materials.getAll().then((list) => this.myMaterials.set(list),
      () => this.notices.error('There was an error in getting the materials information.'));
    this.materials.getStandard().then((list) => this.standardMaterials.set(list),
      () => this.notices.error('There was an error in getting the standard materials information.'));
  }

  protected addOxide(): void {
    const oxide = this.selectedOxide();
    if (!oxide) {
      this.notices.error('Error: please select an oxide.');
      return;
    }
    this.formula.update((lines) => [...lines, { name: oxide, amount: '0' }]);
  }

  protected removeOxide(index: number): void {
    this.formula.update((lines) => lines.filter((_, i) => i !== index));
  }

  protected async save(): Promise<void> {
    if (!this.name() || !this.formula().length) {
      this.notices.error('Error: enter a name and at least one oxide.');
      return;
    }
    const material: Material = {
      name: this.name(),
      rawformula: optional(this.rawformula()),
      relatedTo: optional(this.relatedTo()),
      notes: optional(this.notes()),
      percentmole: this.percentmole(),
      loi: this.loi(),
      molecularweight: this.molecularweight(),
      fields: this.formula().map((line) => ({ ...line }))
    };

    // Derive the unity formula and weights from the formula and LOI so they
    // always agree. Recipes derive them again, so rounding for display is safe.
    let weights;
    try {
      weights = materialWeights(material);
    } catch (e) {
      this.notices.error('Error: ' + (e as Error).message);
      return;
    }
    weights.warnings.forEach((warning) => this.notices.error('Warning: ' + warning));
    material.fields.forEach((field) => field.amountUnity = round(weights.unity[field.name] ?? 0, 4));
    material.equivalent = round(weights.equivalent, 2);
    material.formulaweight = round(weights.firedWeight, 2);
    material.molecularweight = round(weights.molecularWeight, 2);
    material.loi = weights.loi;

    try {
      const saved = await this.materials.create(material);
      this.myMaterials.update((list) => [...list, saved]);
      this.notices.success('Success. Material added to database.');
      this.resetForm();
    } catch (err) {
      this.notices.error(errorMessage(err, 'Error: the request to the server failed.'));
    }
  }

  protected async remove(material: Material): Promise<void> {
    try {
      await this.materials.remove(material);
      this.myMaterials.update((list) => list.filter((m) => m !== material));
      this.notices.success('Success in removing the material from the server.');
    } catch {
      this.notices.error('Error in deleting the material from the server.');
    }
  }

  protected fieldsText(material: Material): string {
    return material.fields.map((field) => field.name + ' : ' + field.amount).join('; ');
  }

  private resetForm(): void {
    for (const field of [this.name, this.rawformula, this.relatedTo, this.notes, this.loi, this.molecularweight]) {
      field.set('');
    }
    this.percentmole.set('molecular');
    this.selectedOxide.set('');
    this.formula.set([]);
  }
}
