import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/register/register.component';
import { DashboardUserComponent } from './features/dashboard-user/dashboard-user.component';
import { UserDashboardComponent } from './features/user-dashboard/user-dashboard.component';
import { CreateEventComponent } from './features/create-event/create-event.component';
import { EventDetailsComponent } from './features/event-details/event-details.component';
import { SubscribeComponent } from './features/subscribe/subscribe.component';
import { PromoteEventComponent } from './features/promote-event/promote-event.component';
import { authGuard } from './shared/auth.guard';
import { organizerGuard } from './shared/organizer.guard';
import { adminGuard } from './shared/admin.guard';
import { ContactComponent } from './features/contact/contact.component';

// ⬇️ AJOUT
import { EventListComponent } from './features/event-list/event-list.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'user', component: UserDashboardComponent },
  { path: 'contact', component: ContactComponent },

  { path: 'mes-participations', component: DashboardUserComponent, canActivate: [authGuard] },
  { path: 'subscribe', component: SubscribeComponent, canActivate: [authGuard] },

  { path: 'event/:id', component: EventDetailsComponent },
  { path: 'organizer/promote/:id', component: PromoteEventComponent },

  { path: 'event-list', component: EventListComponent },
  { path: 'organizer/new', component: CreateEventComponent },
  

  {
    path: 'organizer',
    canActivate: [organizerGuard],
    loadComponent: () =>
      import('./features/dashboard-organizer/dashboard-organizer.component')
        .then(m => m.OrganizerDashboardComponent),
  },

  { path: 'devenir-organisateur',
    loadComponent: () =>
      import('./features/devenir-organisateur/devenir-organisateur.component')
        .then(m => m.DevenirOrganisateurComponent)
  },

  {
    path: 'dashboard-admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/dashboard-admin/dashboard-admin.component')
        .then(m => m.DashboardAdminComponent),
  },
  { path: 'verify-email', loadComponent: () =>
    import('./features/verify-email/verify-email.component')
      .then(m => m.VerifyEmailComponent) },


  { path: '**', redirectTo: '' },
];



