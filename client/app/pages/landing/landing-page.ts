import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { calculateUMF } from '../../../../lib/chemistry';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { RecipeAnalysis } from '../../core/models';
import { UnityFormula } from '../recipe/unity-formula';

/** Bernard Leach's "4321" celadon base, in parts by weight. */
export const EXAMPLE_RECIPE = [
  { material: 'Potash Feldspar', amount: 40 },
  { material: 'Silica', amount: 30 },
  { material: 'Whiting', amount: 20 },
  { material: 'Kaolin', amount: 10 }
];

const FEATURES = [
  {
    title: 'Instant unity formula',
    text: 'See fluxes, alumina and silica in unity, the way glaze chemists compare recipes, as soon as you enter a recipe.'
  },
  {
    title: 'Fix and substitute',
    text: 'A material discontinued? Compare formulas to find a replacement that melts the same way.'
  },
  {
    title: 'Your studio notebook',
    text: 'Keep recipes, your own materials, colorants, notes and firing logs together in one place.'
  },
  {
    title: 'Learn as you go',
    text: 'Plain-language advice on mixing, glazing and firing sits next to the numbers.'
  }
];

/** The public start page: what Glazecalc does, shown with a real calculation. */
@Component({
  selector: 'gc-landing-page',
  imports: [RouterLink, UnityFormula],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss'
})
export class LandingPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly starting = signal(false);
  protected readonly startError = signal('');
  protected readonly example = EXAMPLE_RECIPE;
  protected readonly features = FEATURES;
  // Worked out in the browser by the same chemistry code the calculator uses.
  protected readonly analysis: RecipeAnalysis = (() => {
    const result = calculateUMF(EXAMPLE_RECIPE);
    return { ...result, uList: result.umf };
  })();

  /** Starts a trial (no email or password) and opens the calculator. */
  protected async tryIt(): Promise<void> {
    if (this.starting()) return;
    this.starting.set(true);
    this.startError.set('');
    try {
      await this.auth.startTrial();
      await this.router.navigateByUrl('/recipe');
    } catch (err) {
      this.startError.set(errorMessage(err, 'Could not start a trial just now. Please try again.'));
    } finally {
      this.starting.set(false);
    }
  }
}
