import { Routes } from '@angular/router';
import { signedInGuard, startPage } from './core/signed-in.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: startPage },
  { path: 'home', title: 'Glazecalc', loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage) },
  {
    path: 'signin', title: 'Sign in - Glazecalc', data: { mode: 'signin' },
    loadComponent: () => import('./pages/auth/auth-page').then((m) => m.AuthPage)
  },
  {
    path: 'signup', title: 'Sign up - Glazecalc', data: { mode: 'signup' },
    loadComponent: () => import('./pages/auth/auth-page').then((m) => m.AuthPage)
  },
  { path: 'forgot', title: 'Reset your password - Glazecalc', loadComponent: () => import('./pages/password/forgot-page').then((m) => m.ForgotPage) },
  { path: 'reset', title: 'Choose a new password - Glazecalc', loadComponent: () => import('./pages/password/reset-page').then((m) => m.ResetPage) },
  { path: 'account', title: 'Your account - Glazecalc', canActivate: [signedInGuard], loadComponent: () => import('./pages/password/account-page').then((m) => m.AccountPage) },
  { path: 'recipe', title: 'Recipes - Glazecalc', canActivate: [signedInGuard], loadComponent: () => import('./pages/recipe/recipe-page').then((m) => m.RecipePage) },
  { path: 'material', title: 'Materials - Glazecalc', canActivate: [signedInGuard], loadComponent: () => import('./pages/material/material-page').then((m) => m.MaterialPage) },
  { path: 'additive', title: 'Additives - Glazecalc', canActivate: [signedInGuard], loadComponent: () => import('./pages/additive/additive-page').then((m) => m.AdditivePage) },
  { path: 'advice', title: 'Advice - Glazecalc', canActivate: [signedInGuard], loadComponent: () => import('./pages/advice/advice-page').then((m) => m.AdvicePage) },
  { path: 'firing', title: 'Firings - Glazecalc', canActivate: [signedInGuard], loadComponent: () => import('./pages/firing/firing-page').then((m) => m.FiringPage) },
  { path: 'notes', title: 'Notes - Glazecalc', canActivate: [signedInGuard], loadComponent: () => import('./pages/notes/notes-page').then((m) => m.NotesPage) },
  { path: 'trash', title: 'Trash - Glazecalc', canActivate: [signedInGuard], loadComponent: () => import('./pages/trash/trash-page').then((m) => m.TrashPage) },
  { path: '**', title: 'Not found - Glazecalc', loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage) }
];
