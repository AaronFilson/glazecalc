import { Injectable } from '@angular/core';
import { Recipe } from './models';

/**
 * A recipe made on another page to open on the recipe page as a new recipe,
 * not saved yet: Solve for a target's "Open as a new recipe"
 * (docs/adr/0026-target-and-solve.md). Kept in memory for the one move to the
 * recipe page, which takes it once; a reload does not bring it back.
 */
@Injectable({ providedIn: 'root' })
export class PendingRecipeService {
  private pending: Recipe | null = null;

  put(recipe: Recipe): void {
    this.pending = structuredClone(recipe);
  }

  /** The recipe waiting, once: null after it has been taken. */
  take(): Recipe | null {
    const recipe = this.pending;
    this.pending = null;
    return recipe;
  }
}
