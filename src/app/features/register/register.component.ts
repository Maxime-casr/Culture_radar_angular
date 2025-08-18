import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../shared/auth.service';

type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type PreferredSlot = 'morning' | 'afternoon' | 'evening' | 'night';
type TravelMode = 'walk' | 'bike' | 'car';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private API_BASE = 'https://fastapi-cultureradar.onrender.com';

  // Form model
  user: {
    nom: string;
    email: string;
    mot_de_passe: string;
    age?: number | null;
    preferred_slot?: PreferredSlot | null;
    available_days: DayCode[];
    mobility?: TravelMode | null;
  } = {
    nom: '',
    email: '',
    mot_de_passe: '',
    age: null,
    preferred_slot: null,
    available_days: [],
    mobility: null
  };

  // UI state
  emailExists = false;
  passwordError = false;
  emailError = false;
  loading = false;
  showPassword = false;

  // Options
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

  constructor(private http: HttpClient, private router: Router, private auth: AuthService) {}

  toggleDay(code: DayCode, checked: boolean): void {
    const set = new Set(this.user.available_days);
    checked ? set.add(code) : set.delete(code);
    this.user.available_days = Array.from(set);
  }

  get canSubmit(): boolean {
    // validations de base
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((this.user.email || '').trim());
    const hasUppercase = /[A-Z]/.test(this.user.mot_de_passe || '');
    const hasMinLength = (this.user.mot_de_passe || '').length >= 8;
    const nameOk = (this.user.nom || '').trim().length > 0;

    return !this.loading && nameOk && emailOk && hasUppercase && hasMinLength;
  }

  onSubmit(): void {
    this.emailExists = false;
    this.emailError = false;

    // validations simples
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.user.email.trim());
    const hasUppercase = /[A-Z]/.test(this.user.mot_de_passe);
    const hasMinLength = this.user.mot_de_passe.length >= 8;

    this.emailError = !emailOk;
    this.passwordError = !(hasUppercase && hasMinLength);
    if (this.emailError || this.passwordError) return;

    // prépare le payload pour l’API (les champs optionnels restent omis si vides)
    const payload: any = {
      nom: this.user.nom.trim(),
      email: this.user.email.trim().toLowerCase(),
      mot_de_passe: this.user.mot_de_passe,
    };
    if (this.user.age != null && this.user.age !== undefined && this.user.age !== ('' as any)) {
      payload.age = Number(this.user.age);
    }
    if (this.user.preferred_slot) payload.preferred_slot = this.user.preferred_slot;
    if (this.user.available_days.length) payload.available_days = this.user.available_days;
    if (this.user.mobility) payload.mobility = this.user.mobility;

    this.loading = true;

    // 1) créer le compte
    this.http.post<any>(`${this.API_BASE}/utilisateurs`, payload).subscribe({
      next: (createdUser) => {
        localStorage.setItem('user', JSON.stringify(createdUser));

        // 2) auto-login
        this.http.post<any>(`${this.API_BASE}/login`, {
          email: payload.email,
          mot_de_passe: payload.mot_de_passe
        }).subscribe({
          next: (resp) => {
            this.auth.login(resp.access_token, resp.user.id);
            localStorage.setItem('user', JSON.stringify(resp.user));
            this.loading = false;

            this.router.navigate(['/']);
          },
          error: (err) => {
            console.error('Auto-login post-inscription échoué', err);
            this.loading = false;
            this.router.navigate(['/login']);
          }
        });
      },
      error: err => {
        this.loading = false;
        if (err.status === 409) {
          this.emailExists = true; // email déjà utilisé
        } else {
          const msg = err?.error?.detail || err?.message || 'Erreur inconnue';
          alert('❌ Erreur serveur : ' + msg);
        }
      }
    });
  }
}







