import { Type } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { routes } from './app.routes';
import { askBeforeLeaving } from './core/leave.guard';
import { signInThenBackGuard, signedInGuard, visitorsOnlyGuard } from './core/signed-in.guard';
import { scopeTranslations } from './i18n/provide-i18n';
import { AboutPage } from './pages/about/about-page';
import { AdditivePage } from './pages/additive/additive-page';
import { AdvicePage } from './pages/advice/advice-page';
import { AssistantsPage } from './pages/assistants/assistants-page';
import { AuthPage } from './pages/auth/auth-page';
import { BlendsPage } from './pages/blends/blends-page';
import { ConfirmPage } from './pages/confirm/confirm-page';
import { ConnectPage } from './pages/connect/connect-page';
import { ConnectionsPage } from './pages/connections/connections-page';
import { FamousGlazePage } from './pages/famous-glazes/famous-glaze-page';
import { FamousGlazesPage } from './pages/famous-glazes/famous-glazes-page';
import { FiringPage } from './pages/firing/firing-page';
import { GuidePage } from './pages/guides/guide-page';
import { GuidesPage } from './pages/guides/guides-page';
import { HomePage } from './pages/home/home-page';
import { ImportPage } from './pages/import/import-page';
import { LandingPage } from './pages/landing/landing-page';
import { MaterialPage } from './pages/material/material-page';
import { ConesPage } from './pages/materials/cones-page';
import { MaterialInfoPage } from './pages/materials/material-info-page';
import { MaterialsPage } from './pages/materials/materials-page';
import { NotFoundPage } from './pages/not-found/not-found-page';
import { NotesPage } from './pages/notes/notes-page';
import { AccountPage } from './pages/password/account-page';
import { ConfirmEmailPage } from './pages/password/confirm-email-page';
import { ForgotPage } from './pages/password/forgot-page';
import { ResetPage } from './pages/password/reset-page';
import { PrivacyPage } from './pages/privacy/privacy-page';
import { RecipePage } from './pages/recipe/recipe-page';
import { SharedPage } from './pages/shared/shared-page';
import { SolvePage } from './pages/solve/solve-page';
import { TermsPage } from './pages/terms/terms-page';
import { TrashPage } from './pages/trash/trash-page';

// Every address the app has, in the router's order, and the page it opens. Each page's code is a file of its
// own, loaded the first time the page is opened, so a route that imports the wrong page shows only here or in
// the browser.
const PAGES: ReadonlyArray<[path: string, page: Type<unknown>]> = [
  ['', LandingPage],
  ['advice', AdvicePage],
  ['guides', GuidesPage],
  ['guides/glazing-basics', GuidePage],
  ['guides/making-a-glaze', GuidePage],
  ['guides/safe-mixing', GuidePage],
  ['guides/home-safety', GuidePage],
  ['guides/firing', GuidePage],
  ['guides/learn-with-john-britt', GuidePage],
  ['guides/teaching-glaze-calculation', GuidePage],
  ['cones', ConesPage],
  ['materials', MaterialsPage],
  ['materials/:slug', MaterialInfoPage],
  ['famous-glazes', FamousGlazesPage],
  ['famous-glazes/:slug', FamousGlazePage],
  ['about', AboutPage],
  ['privacy', PrivacyPage],
  ['terms', TermsPage],
  ['assistants', AssistantsPage],
  ['signin', AuthPage],
  ['signup', AuthPage],
  ['forgot', ForgotPage],
  ['reset', ResetPage],
  ['confirm-email', ConfirmEmailPage],
  ['shared', SharedPage],
  ['home', HomePage],
  ['recipe', RecipePage],
  ['import', ImportPage],
  ['blends', BlendsPage],
  ['solve', SolvePage],
  ['material', MaterialPage],
  ['additive', AdditivePage],
  ['firing', FiringPage],
  ['notes', NotesPage],
  ['trash', TrashPage],
  ['account/apps', ConnectionsPage],
  ['connect/:uid', ConnectPage],
  ['confirm/:id', ConfirmPage],
  ['account', AccountPage],
  ['**', NotFoundPage]
];

const route = (path: string) => routes.find((one) => one.path === path)!;

describe('the routes', () => {
  it('load the page each address names, with any other address the not-found page', async () => {
    expect(routes.map((one) => one.path)).toEqual(PAGES.map(([path]) => path));
    for (const [path, page] of PAGES) {
      expect(await route(path).loadComponent!(), path).toBe(page);
    }
  });

  it("load each page's own messages before it opens, and give it a title", () => {
    for (const one of routes) {
      expect(one.resolve?.['messages'], one.path).toBe(scopeTranslations);
      expect(one.providers?.length, one.path).toBeGreaterThan(0);
      expect(one.title, one.path).toMatch(/^titles\.\w+$/);
    }
  });

  it('keep the notebook behind a sign-in, send a visitor from an app’s request to sign in first, and the signed-in past the start page', () => {
    const guarded = (guard: CanActivateFn) =>
      routes.filter((one) => one.canActivate?.includes(guard)).map((one) => one.path);
    expect(guarded(signedInGuard)).toEqual([
      'home',
      'recipe',
      'import',
      'blends',
      'solve',
      'material',
      'additive',
      'firing',
      'notes',
      'trash',
      'account/apps',
      'account'
    ]);
    expect(guarded(signInThenBackGuard)).toEqual(['connect/:uid', 'confirm/:id']);
    expect(guarded(visitorsOnlyGuard)).toEqual(['']);
    // Only the recipe page has changes to lose.
    expect(routes.filter((one) => one.canDeactivate?.includes(askBeforeLeaving)).map((one) => one.path)).toEqual([
      'recipe'
    ]);
  });
});
