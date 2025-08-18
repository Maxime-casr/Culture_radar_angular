import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './subscribe.component.html',
  styleUrls: ['./subscribe.component.css']
})
export class SubscribeComponent implements OnInit {
  isAbonne = false;
  premiumSince: string | null = null;
  loading = true;
  saving = false;
  error = '';

  private API_BASE = 'https://fastapi-cultureradar.onrender.com';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void { this.fetchMe(); }

  private getHeaders(): HttpHeaders | undefined {
    let token: string | null = null;
    try { token = JSON.parse(localStorage.getItem('auth') || '{}')?.token || null; } catch {}
    return token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;
  }

  private fetchMe(): void {
    this.loading = true;
    const headers = this.getHeaders();
    if (!headers) { this.router.navigate(['/login']); return; }

    this.http.get<any>(`${this.API_BASE}/utilisateurs/me`, { headers }).subscribe({
      next: me => {
        this.isAbonne = !!me?.is_abonne;
        this.premiumSince = me?.premium_since || null;
        this.loading = false;
      },
      error: () => { this.loading = false; this.error = 'Impossible de charger votre statut.'; }
    });
  }

  subscribe(): void {
    const headers = this.getHeaders(); if (!headers) { this.router.navigate(['/login']); return; }
    this.saving = true; this.error = '';
    this.http.post(`${this.API_BASE}/utilisateurs/me/subscribe`, {}, { headers }).subscribe({
      next: () => { this.saving = false; this.isAbonne = true; this.fetchMe(); },
      error: () => { this.saving = false; this.error = 'Erreur lors de l’abonnement.'; }
    });
  }

  unsubscribe(): void {
    const headers = this.getHeaders(); if (!headers) { this.router.navigate(['/login']); return; }
    this.saving = true; this.error = '';
    this.http.post(`${this.API_BASE}/utilisateurs/me/unsubscribe`, {}, { headers }).subscribe({
      next: () => { this.saving = false; this.isAbonne = false; this.premiumSince = null; },
      error: () => { this.saving = false; this.error = 'Erreur lors de la désinscription.'; }
    });
  }
}
