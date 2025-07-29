import { Routes } from '@angular/router';
import { RegisterComponent } from './components/register-component/register-component';
import { LoginComponent } from './components/login-component/login-component';
import { DashboardComponent } from './components/dashboard-component/dashboard-component';
import { authGuard } from './guards/auth-guard';
import { LayoutComponent } from './components/layout-component/layout-component';
import { ServicesComponent } from './pages/services-component/services-component';
import { ClientsComponent } from './pages/clients-component/clients-component';

export const routes: Routes = [
  // Rutas públicas (sin layout)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Rutas protegidas (dentro del layout)
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      // Aquí irán las futuras rutas protegidas (clientes, servicios, etc.)
      { path: 'services', component: ServicesComponent },
      { path: 'clients', component: ClientsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Redirección para cualquier otra ruta
  { path: '**', redirectTo: 'dashboard' }
];