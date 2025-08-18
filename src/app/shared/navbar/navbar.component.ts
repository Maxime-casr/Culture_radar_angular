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

  /** Récupère /utilisateurs/me → { is_abonne, role, ... } */
  private loadMe(): void {
    const token = this.authService.getToken();
    if (!token) { 
      this.isAbonne = false; 
      this.userRole = null; 
      this.isOrganizer = false; 
      return; 
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<any>(`${this.API_BASE}/utilisateurs/me`, { headers }).subscribe({
      next: (me) => {
        this.isAbonne = !!me?.is_abonne;
        this.userRole = me?.role || 'user';
        // 👉 règle d’orga : ici on considère 'organizer' (tu peux aussi inclure admin si tu veux)
        this.isOrganizer = this.userRole === 'organizer';
      },
      error: () => {
        this.isAbonne = false;
        this.userRole = null;
        this.isOrganizer = false;
      },
    });
  }

  goAgenda(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/mes-participations' } });
      return;
    }
    this.router.navigate(['/mes-participations']);
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
}
