import { PlainPipe } from '../../shared/format-pipes';
import { Component, inject, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
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

/** What Glazecalc does, as keys to the messages shown. */
const FEATURES = [
  { title: marker('site.landing.features.unity.title'), text: marker('site.landing.features.unity.text') },
  { title: marker('site.landing.features.substitute.title'), text: marker('site.landing.features.substitute.text') },
  { title: marker('site.landing.features.notebook.title'), text: marker('site.landing.features.notebook.text') },
  { title: marker('site.landing.features.learn.title'), text: marker('site.landing.features.learn.text') }
];

/** The public start page: what Glazecalc does, shown with a real calculation. */
@Component({
  selector: 'gc-landing-page',
  imports: [PlainPipe, RouterLink, TranslocoDirective, UnityFormula],
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
      this.startError.set(errorMessage(err, translate('site.landing.trialFailed')));
    } finally {
      this.starting.set(false);
    }
  }
}
