import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./components/signup/signup').then((m) => m.SignupComponent),
  },
  {
    path: 'cards',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/cards/cards').then((m) => m.CardsComponent),
  },
  {
    path: 'questions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/questions/questions').then(
        (m) => m.QuestionsComponent,
      ),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/settings/settings').then((m) => m.SettingsComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
