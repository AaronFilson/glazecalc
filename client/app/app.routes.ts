import { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { signedInGuard, visitorsOnlyGuard } from './core/signed-in.guard';
import { scopeTranslations } from './i18n/provide-i18n';
import { guideText } from './pages/guides/guide-text';

// Each title is the key of its message (i18n/titles.ts). Each route names the
// part of the app whose messages it needs (client/public/i18n/<scope>/), which
// load before it opens.

export const routes: Routes = [
  // Public pages.
  {
    path: '',
    pathMatch: 'full',
    title: marker('titles.landing'),
    canActivate: [visitorsOnlyGuard],
    providers: [provideTranslocoScope('site')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/landing/landing-page').then((m) => m.LandingPage)
  },
  {
    path: 'advice',
    title: marker('titles.advice'),
    providers: [provideTranslocoScope('site', 'records')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/advice/advice-page').then((m) => m.AdvicePage)
  },
  {
    path: 'guides',
    title: marker('titles.guides'),
    providers: [provideTranslocoScope('guides')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/guides/guides-page').then((m) => m.GuidesPage)
  },
  {
    path: 'guides/glazing-basics',
    title: marker('titles.glazingBasics'),
    providers: [provideTranslocoScope('guides')],
    data: { guide: 'glazing-basics' },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'guides/making-a-glaze',
    title: marker('titles.makingAGlaze'),
    providers: [provideTranslocoScope('guides')],
    data: { guide: 'making-a-glaze' },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'guides/safe-mixing',
    title: marker('titles.safeMixing'),
    providers: [provideTranslocoScope('guides')],
    data: { guide: 'safe-mixing', safety: true },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'guides/home-safety',
    title: marker('titles.homeSafety'),
    providers: [provideTranslocoScope('guides', 'safety')],
    data: { guide: 'home-safety', safety: true },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'guides/firing',
    title: marker('titles.firing'),
    providers: [provideTranslocoScope('guides')],
    data: { guide: 'firing' },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'about',
    title: marker('titles.about'),
    providers: [provideTranslocoScope('site')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/about/about-page').then((m) => m.AboutPage)
  },
  {
    path: 'privacy',
    title: marker('titles.privacy'),
    providers: [provideTranslocoScope('site')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/privacy/privacy-page').then((m) => m.PrivacyPage)
  },
  {
    path: 'signin',
    title: marker('titles.signin'),
    data: { mode: 'signin' },
    providers: [provideTranslocoScope('account')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/auth/auth-page').then((m) => m.AuthPage)
  },
  {
    path: 'signup',
    title: marker('titles.signup'),
    data: { mode: 'signup' },
    providers: [provideTranslocoScope('account')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/auth/auth-page').then((m) => m.AuthPage)
  },
  {
    path: 'forgot',
    title: marker('titles.forgot'),
    providers: [provideTranslocoScope('account')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/password/forgot-page').then((m) => m.ForgotPage)
  },
  {
    path: 'reset',
    title: marker('titles.reset'),
    providers: [provideTranslocoScope('account')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/password/reset-page').then((m) => m.ResetPage)
  },

  // The app itself, once signed in.
  {
    path: 'home',
    title: marker('titles.home'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('notebook')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage)
  },
  {
    path: 'recipe',
    title: marker('titles.recipe'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('recipe', 'records')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/recipe/recipe-page').then((m) => m.RecipePage)
  },
  {
    path: 'material',
    title: marker('titles.material'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('library', 'records')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/material/material-page').then((m) => m.MaterialPage)
  },
  {
    path: 'additive',
    title: marker('titles.additive'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('library', 'records')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/additive/additive-page').then((m) => m.AdditivePage)
  },
  {
    path: 'firing',
    title: marker('titles.firingLogs'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('notebook')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/firing/firing-page').then((m) => m.FiringPage)
  },
  {
    path: 'notes',
    title: marker('titles.notes'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('notebook')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/notes/notes-page').then((m) => m.NotesPage)
  },
  {
    path: 'trash',
    title: marker('titles.trash'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('notebook')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/trash/trash-page').then((m) => m.TrashPage)
  },
  {
    path: 'account',
    title: marker('titles.account'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('account')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/password/account-page').then((m) => m.AccountPage)
  },
  {
    path: '**',
    title: marker('titles.notFound'),
    providers: [provideTranslocoScope('site')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage)
  }
];
