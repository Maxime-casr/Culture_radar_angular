import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth.service';

type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type PreferredSlot = 'morning' | 'afternoon' | 'evening' | 'night';
type TravelMode = 'walk' | 'bike' | 'car';

type Me = {
  id: number;
  email: string;
  nom?: string | null;
  role: string;
  created_at?: string | null;
  age?: number | null;
  preferred_slot?: PreferredSlot | null;
  available_days?: DayCode[] | null;
  mobility?: TravelMode | null;
  is_abonne?: boolean;
  premium_since?: string | null;
};

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
  private API_BASE = 'https://fastapi-cultureradar.onrender.com';

  me: Me | null = null;

  // formulaire (cloné depuis "me" pour éditer sans casser l'original)
  form = {
    nom: '',
    age: null as number | null,
    preferred_slot: null as PreferredSlot | null,
    available_days: [] as DayCode[],
    mobility: null as TravelMode | null,
  };

  // UI state
  loading = false;
  saving = false;
  saveOk = false;
  saveErr: string | null = null;

  days = [
    { code: 'mon', label: 'Lun' },
    { code: 'tue', label: 'Mar' },
    { code: 'wed', label: 'Mer' },
    { code: 'thu', label: 'Jeu' },
    { code: 'fri', label: 'Ven' },
    { code: 'sat', label: 'Sam' },
    { code: 'sun', label: 'Dim' },
  ] as { code: DayCode; label: string }[];

  slotOptions: { value: PreferredSlot; label: string }[] = [
    { value: 'morning',   label: 'Matin' },
    { value: 'afternoon', label: 'Après-midi' },
    { value: 'evening',   label: 'Soir' },
    { value: 'night',     label: 'Nuit' },
  ];

  mobilityOptions: { value: TravelMode; label: string }[] = [
    { value: 'walk', label: 'À pied' },
    { value: 'bike', label: 'Vélo' },
    { value: 'car',  label: 'Voiture' },
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const token = this.auth.getToken?.();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    this.fetchMe();
  }

  private headers(): HttpHeaders {
    const token = this.auth.getToken?.();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private fetchMe(): void {
    this.loading = true;
    this.http.get<Me>(`${this.API_BASE}/utilisateurs/me`, { headers: this.headers() })
      .subscribe({
        next: (me) => {
          this.me = me;
          // remplir le form
          this.form.nom = (me.nom || '').trim();
          this.form.age = me.age ?? null;
          this.form.preferred_slot = me.preferred_slot ?? null;
          this.form.available_days = [...(me.available_days || [])];
          this.form.mobility = me.mobility ?? null;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 401) this.router.navigate(['/login']);
        }
      });
  }

  toggleDay(code: DayCode, checked: boolean): void {
    const set = new Set(this.form.available_days);
    checked ? set.add(code) : set.delete(code);
    this.form.available_days = Array.from(set);
  }

  get disabledSave(): boolean {
    if (!this.me) return true;
    if (this.saving) return true;

    // détecter changements
    const a = {
      nom: (this.form.nom || '').trim(),
      age: this.form.age ?? null,
      preferred_slot: this.form.preferred_slot ?? null,
      available_days: [...this.form.available_days].sort(),
      mobility: this.form.mobility ?? null,
    };
    const b = {
      nom: (this.me.nom || '').trim(),
      age: this.me.age ?? null,
      preferred_slot: this.me.preferred_slot ?? null,
      available_days: [...(this.me.available_days || [])].sort(),
      mobility: this.me.mobility ?? null,
    };
    return JSON.stringify(a) === JSON.stringify(b);
  }

  save(): void {
    if (!this.me) return;
    this.saving = true;
    this.saveOk = false;
    this.saveErr = null;

    const payload: any = {
      nom: (this.form.nom || '').trim(),
      age: this.form.age ?? undefined,
      preferred_slot: this.form.preferred_slot ?? undefined,
      available_days: this.form.available_days?.length ? this.form.available_days : undefined,
      mobility: this.form.mobility ?? undefined,
    };

    this.http.put<Me>(`${this.API_BASE}/utilisateurs/me`, payload, { headers: this.headers() })
      .subscribe({
        next: (updated) => {
          this.me = updated;
          this.saving = false;
          this.saveOk = true;
          // réaligner le form
          this.form.nom = (updated.nom || '').trim();
          this.form.age = updated.age ?? null;
          this.form.preferred_slot = updated.preferred_slot ?? null;
          this.form.available_days = [...(updated.available_days || [])];
          this.form.mobility = updated.mobility ?? null;
          setTimeout(() => (this.saveOk = false), 2000);
        },
        error: (err) => {
          this.saving = false;
          this.saveErr = err?.error?.detail || 'Erreur lors de la sauvegarde.';
        }
      });
  }

  // Bonus : affichage lisible du rôle/abonnement
  get roleLabel(): string {
    return this.me?.role === 'admin' ? 'Administrateur'
         : this.me?.role === 'organizer' ? 'Organisateur'
         : 'Utilisateur';
  }
}

