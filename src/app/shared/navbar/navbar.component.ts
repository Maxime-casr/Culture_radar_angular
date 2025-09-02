import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';

import { AuthService } from '../../shared/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  isLoggedIn = false;
  isHomePage = false;

  isEventList = false;
  showCenterCTA = true;

  // état premium & rôle
  isAbonne = false;
  userRole: string | null = null;
  isOrganizer = false; // true si role === 'organizer' (ou admin si tu veux)
  isAdmin = false;

  private API_BASE = 'https://fastapi-cultureradar.onrender.com';

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn$.subscribe((status) => {
      this.isLoggedIn = status;
      if (status) {
        this.loadMe(); // récupère role + premium
      } else {
        this.isAbonne = false;
        this.userRole = null;
        this.isOrganizer = false;
        this.isAdmin = false;
      }
    });

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const url = e.urlAfterRedirects || e.url;
        this.isHomePage = url === '/';
        this.isEventList = url.startsWith('/event-list');
        this.showCenterCTA = !this.isEventList;
      });

    // état initial
    const url = this.router.url;
    this.isHomePage = url === '/';
    this.isEventList = url.startsWith('/event-list');
    this.showCenterCTA = !this.isEventList;

    if (this.authService.getUser()) {
      this.isLoggedIn = true;
      this.loadMe();
    }
  }

  private loadMe(): void {
    const token = this.authService.getToken();
    if (!token) { this.isAbonne = false; this.userRole = null; this.isOrganizer = false; this.isAdmin = false; return; }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    // 1) récupérer rôle comme avant (si tu veux garder)
    this.http.get<any>(`${this.API_BASE}/utilisateurs/me`, { headers }).subscribe({
      next: (me) => { this.userRole = me?.role || 'user'; this.isOrganizer = this.userRole === 'organizer'; this.isAdmin = this.userRole === 'admin'; },
      error: () => { this.userRole = null; this.isOrganizer = false; this.isAdmin = false; }
    });

    // 2) statut abonnement ACTIF
    this.http.get<any>(`${this.API_BASE}/utilisateurs/me/subscription`, { headers }).subscribe({
      next: (s) => { this.isAbonne = !!s?.is_active; },
      error: () => { this.isAbonne = false; }
    });
  }

  private checkPremiumAndThen(navigateTo: string) {
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: navigateTo } });
      return;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<any>(`${this.API_BASE}/utilisateurs/me/subscription`, { headers })
      .subscribe({
        next: s => {
          const active = !!s?.is_active;
          this.isAbonne = active; // mets à jour le cache local
          if (active) this.router.navigate([navigateTo]);
          else this.router.navigate(['/subscribe'], { queryParams: { returnUrl: navigateTo } });
        },
        error: () => {
          this.router.navigate(['/subscribe'], { queryParams: { returnUrl: navigateTo } });
        }
      });
  }

  goAgenda(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/mes-participations' } });
      return;
    }
    if (this.isAbonne) { 
      this.router.navigate(['/mes-participations']);
      return;
    }
    
    this.checkPremiumAndThen('/mes-participations');
  }

  goHome(): void { this.router.navigate(['/']); }

  // bouton “Devenir organisateur”
  goBecomeOrganizer(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/devenir-organisateur' } });
      return;
    }
    this.router.navigate(['/devenir-organisateur']);
  }

  goOrganize(): void {
  this.router.navigate(['/organizer']); // ✅ route existante
  }


  logout(): void {
    this.authService.logout();
    this.isAbonne = false;
    this.userRole = null;
    this.isOrganizer = false;
    this.router.navigate(['/']);
  }
  goAdmin(): void {
  this.router.navigate(['/dashboard-admin']);
}

}
