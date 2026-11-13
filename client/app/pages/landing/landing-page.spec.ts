import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { LandingPage } from './landing-page';

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
