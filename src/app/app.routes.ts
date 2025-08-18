import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/register/register.component';
import { DashboardUserComponent } from './features/dashboard-user/dashboard-user.component';
import { EventDetailsComponent } from './features/event-details/event-details.component';
import { SubscribeComponent } from './features/subscribe/subscribe.component';
import { authGuard } from './shared/auth.guard';
import { organizerGuard } from './shared/organizer.guard';

// ⬇️ AJOUT
import { EventListComponent } from './features/event-list/event-list.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  { path: 'mes-participations', component: DashboardUserComponent, canActivate: [authGuard] },
  { path: 'subscribe', component: SubscribeComponent, canActivate: [authGuard] },

  { path: 'event/:id', component: EventDetailsComponent },

  // ⬇️ AJOUT
  { path: 'event-list', component: EventListComponent },

  {
    path: 'organizer',
    canActivate: [organizerGuard],
    loadComponent: () =>
      import('./features/dashboard-organizer/dashboard-organizer.component')
        .then(m => m.OrganizerDashboardComponent),
  },
  { path: 'devenir-organisateur', loadComponent: () =>
    import('./features/devenir-organisateur/devenir-organisateur.component')
      .then(m => m.DevenirOrganisateurComponent)
  },


  { path: '**', redirectTo: '' },
];




