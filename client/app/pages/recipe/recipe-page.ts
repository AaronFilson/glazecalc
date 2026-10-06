import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { calculateUMF } from '../../../../lib/chemistry';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { Additive, Material, Recipe, RecipeAnalysis, RecipeMaterial } from '../../core/models';
import { Busy } from '../../shared/busy';
import { Notices, NoticesList } from '../../shared/notices';
import { localDate } from '../../shared/dates';
import { firstOf } from '../../shared/options';
import { PageNav } from '../../shared/page-nav';
import { UnityFormula } from './unity-formula';

/** Recipes saved by mongoose hold the analysis in a one-element array. */
export function savedAnalysis(recipe: Recipe): RecipeAnalysis | null {
  const computed = Array.isArray(recipe.computed) ? recipe.computed[0] : recipe.computed;
  return computed && computed.uList ? computed : null;
}

const copy = <T>(value: T): T => structuredClone(value);

@Component({
  selector: 'gc-recipe-page',
  imports: [DatePipe, FormsModule, NoticesList, PageNav, UnityFormula],
  templateUrl: './recipe-page.html'
})
export class RecipePage implements OnInit {
  private readonly resources = inject(ApiResourceFactory);
  private readonly recipes = this.resources.for<Recipe>('recipe');
  private readonly materials = this.resources.for<Material>('materials');
  private readonly additives = this.resources.for<Additive>('additives');

  protected readonly notices = new Notices();
  protected readonly saving = new Busy();
  protected readonly savedAnalysis = savedAnalysis;
  protected readonly firstOf = firstOf;

  protected readonly title = signal('');
  protected readonly date = signal('');
  protected readonly notes = signal('');
  protected readonly recipeMaterials = signal<RecipeMaterial[]>([]);
  protected readonly recipeAdditives = signal<Additive[]>([]);
  protected readonly computed = signal<RecipeAnalysis | null>(null);

  protected readonly myMaterials = signal<Material[]>([]);
  protected readonly standardMaterials = signal<Material[]>([]);
  protected readonly myAdditives = signal<Additive[]>([]);
  protected readonly standardAdditives = signal<Additive[]>([]);
  protected readonly selectedMyMaterial = signal<Material | null>(null);
  protected readonly selectedStandardMaterial = signal<Material | null>(null);
  protected readonly selectedMyAdditive = signal<Additive | null>(null);
  protected readonly selectedStandardAdditive = signal<Additive | null>(null);

  protected readonly myRecipes = signal<Recipe[]>([]);
  protected readonly expanded = signal<ReadonlySet<Recipe>>(new Set());
  protected readonly showRemove = signal(false);

  ngOnInit(): void {
    void this.load(this.materials.getAll(), this.myMaterials, 'There was an error in getting the custom materials information.');
    void this.load(this.materials.getStandard(), this.standardMaterials, 'There was an error in getting the standard materials information.');
    void this.load(this.additives.getAll(), this.myAdditives, 'There was an error in getting the custom additives information.');
    void this.load(this.additives.getStandard(), this.standardAdditives, 'There was an error in getting standard additives information.');
    void this.load(this.recipes.getAll(), this.myRecipes, 'There was an error in getting the recipe information.');
  }

  protected addMaterial(material: Material | null): void {
    if (!material) {
      this.notices.error('Error: please select a material to add.');
      return;
    }
    this.recipeMaterials.update((list) => [...list, copy(material)]);
    this.recipeChanged();
  }

  protected removeMaterial(index: number): void {
    this.recipeMaterials.update((list) => list.filter((_, i) => i !== index));
    this.recipeChanged();
  }

  /** A shown unity formula no longer matches once the materials or amounts change. */
  protected recipeChanged(): void {
    this.computed.set(null);
  }

  protected addAdditive(additive: Additive | null): void {
    if (!additive) {
      this.notices.error('Error: please select an additive to add.');
      return;
    }
    this.recipeAdditives.update((list) => [...list, copy(additive)]);
  }

  protected removeAdditive(index: number): void {
    this.recipeAdditives.update((list) => list.filter((_, i) => i !== index));
  }

  /** Calculates the unity formula; additives are not part of it. */
  protected compute(): RecipeAnalysis | null {
    try {
      const result = calculateUMF(this.recipeMaterials().map((material) => ({ material, amount: material.amount })));
      this.notices.warnings(result.warnings);
      // uList is the key saved recipes and older versions of the app use.
      const analysis: RecipeAnalysis = { ...result, uList: result.umf };
      this.computed.set(analysis);
      return analysis;
    } catch (e) {
      this.notices.warnings([]);
      this.notices.error('Error: ' + (e as Error).message);
      this.computed.set(null);
      return null;
    }
  }

  protected save(): Promise<void> {
    return this.saving.run(() => this.saveNow());
  }

  private async saveNow(): Promise<void> {
    if (!this.title() || !this.recipeMaterials().length) {
      this.notices.error('Error: there was missing info.');
      return;
    }
    // Always recompute so amounts edited after pressing compute are saved correctly.
    const analysis = this.compute();
    if (!analysis) return;

    const recipe: Recipe = {
      title: this.title(),
      date: this.date() || localDate(),
      notes: this.notes() || 'None.',
      materials: this.recipeMaterials(),
      additives: this.recipeAdditives(),
      computed: analysis
    };
    try {
      const saved = await this.recipes.create(recipe);
      this.myRecipes.update((list) => [...list, saved]);
      this.notices.success('Success. Recipe added to database.');
      this.resetForm();
    } catch (err) {
      this.notices.error(errorMessage(err, 'Error: the request to the server failed.'));
    }
  }

  protected toggleExpanded(recipe: Recipe): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (!next.delete(recipe)) next.add(recipe);
      return next;
    });
  }

  protected async remove(recipe: Recipe): Promise<void> {
    try {
      await this.recipes.remove(recipe);
      this.myRecipes.update((list) => list.filter((r) => r !== recipe));
      this.notices.success('Success in removing the recipe from the server.');
    } catch {
      this.notices.error('Error in deleting the recipe from the server.');
    }
  }

  private async load<T>(request: Promise<T[]>, target: { set(value: T[]): void }, failure: string): Promise<void> {
    try {
      target.set(await request);
    } catch {
      this.notices.error(failure);
    }
  }

  private resetForm(): void {
    this.title.set('');
    this.date.set('');
    this.notes.set('');
    this.recipeMaterials.set([]);
    this.recipeAdditives.set([]);
    this.computed.set(null);
  }
}
