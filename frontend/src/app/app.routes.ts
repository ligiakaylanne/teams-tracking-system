import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'mapa',
    loadComponent: () =>
      import('./components/map/map.component').then(m => m.MapComponent),
  },
  { path: '**', redirectTo: '' },
];
