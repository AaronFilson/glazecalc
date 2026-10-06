import { Routes } from '@angular/router';
import { signedInGuard, visitorsOnlyGuard } from './core/signed-in.guard';

const SITE = 'Glazecalc';

export const routes: Routes = [
  // Public pages.
  {
    path: '',
    pathMatch: 'full',
    title: 'Glazecalc: a free glaze chemistry calculator for potters',
    canActivate: [visitorsOnlyGuard],
    loadComponent: () => import('./pages/landing/landing-page').then((m) => m.LandingPage)
  },
  {
    path: 'advice',
    title: 'Glaze advice - ' + SITE,
    loadComponent: () => import('./pages/advice/advice-page').then((m) => m.AdvicePage)
  },
  {
    path: 'about',
    title: 'About - ' + SITE,
    loadComponent: () => import('./pages/about/about-page').then((m) => m.AboutPage)
  },
  {
    path: 'privacy',
    title: 'Privacy - ' + SITE,
    loadComponent: () => import('./pages/privacy/privacy-page').then((m) => m.PrivacyPage)
  },
  {
    path: 'signin',
    title: 'Sign in - ' + SITE,
    data: { mode: 'signin' },
    loadComponent: () => import('./pages/auth/auth-page').then((m) => m.AuthPage)
  },
  {
    path: 'signup',
    title: 'Create an account - ' + SITE,
    data: { mode: 'signup' },
    loadComponent: () => import('./pages/auth/auth-page').then((m) => m.AuthPage)
  },
  {
    path: 'forgot',
    title: 'Reset your password - ' + SITE,
    loadComponent: () => import('./pages/password/forgot-page').then((m) => m.ForgotPage)
  },
  {
    path: 'reset',
    title: 'Choose a new password - ' + SITE,
    loadComponent: () => import('./pages/password/reset-page').then((m) => m.ResetPage)
  },

  // The app itself, once signed in.
  {
    path: 'home',
    title: 'Your studio notebook - ' + SITE,
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage)
  },
  {
    path: 'recipe',
    title: 'Recipes - ' + SITE,
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/recipe/recipe-page').then((m) => m.RecipePage)
  },
  {
    path: 'material',
    title: 'Materials - ' + SITE,
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/material/material-page').then((m) => m.MaterialPage)
  },
  {
    path: 'additive',
    title: 'Additives - ' + SITE,
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/additive/additive-page').then((m) => m.AdditivePage)
  },
  {
    path: 'firing',
    title: 'Firing logs - ' + SITE,
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/firing/firing-page').then((m) => m.FiringPage)
  },
  {
    path: 'notes',
    title: 'Notes - ' + SITE,
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/notes/notes-page').then((m) => m.NotesPage)
  },
  {
    path: 'trash',
    title: 'Trash - ' + SITE,
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/trash/trash-page').then((m) => m.TrashPage)
  },
  {
    path: 'account',
    title: 'Your account - ' + SITE,
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/password/account-page').then((m) => m.AccountPage)
  },
  {
    path: '**',
    title: 'Not found - ' + SITE,
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage)
  }
];
