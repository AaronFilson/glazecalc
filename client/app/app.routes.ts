import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'signin' },
  { path: 'home', title: 'Glazecalc', loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage) },
  {
    path: 'signin', title: 'Sign in - Glazecalc', data: { mode: 'signin' },
    loadComponent: () => import('./pages/auth/auth-page').then((m) => m.AuthPage)
  },
  {
    path: 'signup', title: 'Sign up - Glazecalc', data: { mode: 'signup' },
    loadComponent: () => import('./pages/auth/auth-page').then((m) => m.AuthPage)
  },
  { path: 'recipe', title: 'Recipes - Glazecalc', loadComponent: () => import('./pages/recipe/recipe-page').then((m) => m.RecipePage) },
  { path: 'material', title: 'Materials - Glazecalc', loadComponent: () => import('./pages/material/material-page').then((m) => m.MaterialPage) },
  { path: 'additive', title: 'Additives - Glazecalc', loadComponent: () => import('./pages/additive/additive-page').then((m) => m.AdditivePage) },
  { path: 'advice', title: 'Advice - Glazecalc', loadComponent: () => import('./pages/advice/advice-page').then((m) => m.AdvicePage) },
  { path: 'firing', title: 'Firings - Glazecalc', loadComponent: () => import('./pages/firing/firing-page').then((m) => m.FiringPage) },
  { path: 'notes', title: 'Notes - Glazecalc', loadComponent: () => import('./pages/notes/notes-page').then((m) => m.NotesPage) },
  { path: 'trash', title: 'Trash - Glazecalc', loadComponent: () => import('./pages/trash/trash-page').then((m) => m.TrashPage) },
  { path: '**', title: 'Not found - Glazecalc', loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage) }
];
