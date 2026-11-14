import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { calculateUMF } from '../../../../lib/chemistry';
import { matchName } from '../../../../lib/recipe/paste';
import { AuthService } from '../../core/auth.service';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { STANDARD_MATERIALS } from '../materials/standard-materials';
import { EXAMPLE_RECIPE, LandingPage } from './landing-page';

// The start page for a visitor. (simple-pages.spec.ts has its worked example, trial.spec.ts its trials.)

describe('LandingPage', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  it('says whose changes were lost when the session ended before they were saved', async () => {
    TestBed.inject(AuthService).lostRecipe.set('Celadon');
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    expect(text(fixture, '.hero-text .errors-section')).toBe(
      'You were signed out before your changes to "Celadon" were saved, so they were lost.'
    );
  });

  // One name, one material: "Potash Feldspar" here was K₂O•Al₂O₃•6SiO₂, and in the calculator Potclays 3426.
  it('names each material of the example as the calculator does, so copied there it gives the same formula', () => {
    const read = EXAMPLE_RECIPE.map((line) => {
      const match = matchName(line.material, STANDARD_MATERIALS);
      expect(['name', 'alias'], line.material).toContain(match.how);
      return { material: match.record!, amount: line.amount };
    });
    const here = calculateUMF(EXAMPLE_RECIPE).umf;
    const there = calculateUMF(read).umf;
    for (const oxide of new Set([...Object.keys(here), ...Object.keys(there)])) {
      expect(there[oxide] ?? 0, oxide).toBeCloseTo(here[oxide] ?? 0, 3);
    }
  });

  it('starts one trial however quickly Try it now is pressed twice', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LandingPage);
    await fixture.whenStable();
    const tryIt = (fixture.nativeElement as HTMLElement).querySelector('.hero-actions button') as HTMLButtonElement;
    tryIt.click();
    tryIt.click();
    httpMock()
      .expectOne({ method: 'POST', url: API + '/guest' })
      .flush({ guest: true, name: 'quiet kilns', expiresAt: '2099-01-01T00:00:00.000Z' });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/recipe');
  });
});
