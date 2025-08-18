import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/auth.service';

interface Me {
  id: number;
  email: string;
  nom?: string | null;

  is_abonne: boolean;
  premium_since?: string | null;

  pref_concert?: number;
  pref_exposition?: number;
  pref_theatre?: number;
  pref_cinema?: number;
  pref_danse?: number;
  pref_conference?: number;
  pref_atelier?: number;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
  me: Me | null = null;
  topPrefs: string[] = [];
  loading = true;
  error = '';

  private API_BASE = 'https://fastapi-cultureradar.onrender.com';

  constructor(private http: HttpClient, private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    const token = this.auth.getToken();
    if (!token) { this.router.navigate(['/login']); return; }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<Me>(`${this.API_BASE}/utilisateurs/me`, { headers }).subscribe({
      next: (me) => {
        this.me = me;
        this.topPrefs = this.computeTopPrefs(me);
        this.loading = false;
      },
      error: () => { this.error = 'Impossible de charger votre compte.'; this.loading = false; }
    });
  }

  private computeTopPrefs(me: Me): string[] {
    const labels: Record<string, string> = {
      concert: 'Concert', exposition: 'Exposition', 'théâtre': 'Théâtre',
      'cinéma': 'Cinéma', danse: 'Danse', 'conférence': 'Conférence', atelier: 'Atelier'
    };
    const arr: [keyof typeof labels, number][] = [
      ['concert', me.pref_concert ?? 0],
      ['exposition', me.pref_exposition ?? 0],
      ['théâtre', me.pref_theatre ?? 0],
      ['cinéma', me.pref_cinema ?? 0],
      ['danse', me.pref_danse ?? 0],
      ['conférence', me.pref_conference ?? 0],
      ['atelier', me.pref_atelier ?? 0],
    ];
    arr.sort((a, b) => b[1] - a[1]);
    return arr.filter(([, v]) => v > 0).slice(0, 3).map(([k]) => labels[k]);
  }

  goPreferences() { this.router.navigate(['/preferences']); }
  manageSubscription() { this.router.navigate(['/subscribe']); }
  logout() { this.auth.logout(); this.router.navigate(['/']); }
}

