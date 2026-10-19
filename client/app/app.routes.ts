import { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { askBeforeLeaving } from './core/leave.guard';
import { signedInGuard, visitorsOnlyGuard } from './core/signed-in.guard';
import { scopeTranslations } from './i18n/provide-i18n';
import { guideText } from './pages/guides/guide-text';

// Each title is the key of its message (i18n/titles.ts), and a public page's
// data.description the key of its description. Each route names the
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
    data: { description: marker('meta.advice') },
    // advice/ is the standard advice's words alone (scripts/advice-i18n.mjs), not all of records/.
    providers: [provideTranslocoScope('site', 'advice')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/advice/advice-page').then((m) => m.AdvicePage)
  },
  {
    path: 'guides',
    title: marker('titles.guides'),
    data: { description: marker('meta.guides') },
    providers: [provideTranslocoScope('guides')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/guides/guides-page').then((m) => m.GuidesPage)
  },
  {
    path: 'guides/glazing-basics',
    title: marker('titles.glazingBasics'),
    providers: [provideTranslocoScope('guides', 'regions')],
    data: { description: marker('meta.glazingBasics'), guide: 'glazing-basics' },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'guides/making-a-glaze',
    title: marker('titles.makingAGlaze'),
    providers: [provideTranslocoScope('guides', 'regions')],
    data: { description: marker('meta.makingAGlaze'), guide: 'making-a-glaze' },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'guides/safe-mixing',
    title: marker('titles.safeMixing'),
    providers: [provideTranslocoScope('guides', 'regions')],
    data: { description: marker('meta.safeMixing'), guide: 'safe-mixing', safety: true },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'guides/home-safety',
    title: marker('titles.homeSafety'),
    providers: [provideTranslocoScope('guides', 'safety')],
    data: { description: marker('meta.homeSafety'), guide: 'home-safety', safety: true },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'guides/firing',
    title: marker('titles.firing'),
    providers: [provideTranslocoScope('guides')],
    data: { description: marker('meta.firing'), guide: 'firing' },
    resolve: { messages: scopeTranslations, text: guideText },
    loadComponent: () => import('./pages/guides/guide-page').then((m) => m.GuidePage)
  },
  {
    path: 'about',
    title: marker('titles.about'),
    data: { description: marker('meta.about') },
    providers: [provideTranslocoScope('site')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/about/about-page').then((m) => m.AboutPage)
  },
  {
    path: 'privacy',
    title: marker('titles.privacy'),
    data: { description: marker('meta.privacy') },
    providers: [provideTranslocoScope('site')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/privacy/privacy-page').then((m) => m.PrivacyPage)
  },
  {
    path: 'terms',
    title: marker('titles.terms'),
    data: { description: marker('meta.terms') },
    providers: [provideTranslocoScope('site')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/terms/terms-page').then((m) => m.TermsPage)
  },
  {
    // Public since round 4 (the owner, 2026-10-19): prerendered, in the sitemap, linked from the footer.
    path: 'assistants',
    title: marker('titles.assistants'),
    data: { description: marker('meta.assistants') },
    providers: [provideTranslocoScope('site')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/assistants/assistants-page').then((m) => m.AssistantsPage)
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
    data: { description: marker('meta.signup'), mode: 'signup' },
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

  {
    path: 'confirm-email',
    title: marker('titles.confirmEmail'),
    providers: [provideTranslocoScope('account')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/password/confirm-email-page').then((m) => m.ConfirmEmailPage)
  },
  // A recipe shared by link, for anyone: never indexed (server/lib/pages.ts, PRIVATE_PAGES).
  {
    path: 'shared',
    title: marker('titles.shared'),
    providers: [provideTranslocoScope('recipe', 'records')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/shared/shared-page').then((m) => m.SharedPage)
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
    // Changes not saved are asked about first.
    canDeactivate: [askBeforeLeaving],
    providers: [provideTranslocoScope('recipe', 'records')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/recipe/recipe-page').then((m) => m.RecipePage)
  },
  {
    path: 'import',
    title: marker('titles.import'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('recipe', 'records')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/import/import-page').then((m) => m.ImportPage)
  },
  {
    path: 'blends',
    title: marker('titles.blends'),
    canActivate: [signedInGuard],
    providers: [provideTranslocoScope('recipe', 'records')],
    resolve: { messages: scopeTranslations },
    loadComponent: () => import('./pages/blends/blends-page').then((m) => m.BlendsPage)
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
