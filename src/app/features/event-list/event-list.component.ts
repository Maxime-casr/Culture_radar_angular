import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpParams, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../shared/auth.service';

type Ev = {
  id: number;
  title: string;
  description?: string;
  image_url?: string;
  lieu?: string;
  commune?: string;
  date?: string | null;
  keywords?: string[];
  latitude?: number;
  longitude?: number;
};

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css'],
})
export class EventListComponent implements OnInit, OnDestroy {
  // -------- Filtres simples --------
  q = '';
  city = '';
  date_from = '';
  date_to = '';

  // -------- Filtres avancés --------
  showAdvanced = false;
  online: 'all' | 'yes' | 'no' = 'all';
  age_min_lte: number | null = null;
  age_max_gte: number | null = null;

  // chips mots-clés
  keywordInput = '';
  keywords: string[] = [];

  // accessibilité
  accessOptions = [
    { code: 'vi', label: 'Visuel' },
    { code: 'hi', label: 'Auditif' },
    { code: 'mi', label: 'Moteur' },
    { code: 'ii', label: 'Intellectuel' },
    { code: 'pi', label: 'Psychique' },
  ];
  accessible: string[] = [];

  // -------- État --------
  loading = false;
  events: Ev[] = [];
  page = 1;
  per_page = 20;
  isLoggedIn = false;

  private readonly API_BASE = 'https://fastapi-cultureradar.onrender.com';
  private subs: Subscription[] = [];

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.isLoggedIn = !!this.auth.getUser();
    this.subs.push(
      this.auth.isLoggedIn$.subscribe((v) => {
        this.isLoggedIn = v;
        this.page = 1;
        this.load();
      })
    );
    this.load();
  }
  private nextStart(occurrences: any[] | undefined): string | null {
  if (!Array.isArray(occurrences)) return null;
  const now = Date.now();
  let bestTs = Number.POSITIVE_INFINITY;
  let best: string | null = null;

  for (const o of occurrences) {
    const ts = o?.debut ? Date.parse(o.debut) : NaN;
    if (!Number.isNaN(ts) && ts >= now && ts < bestTs) {
      bestTs = ts;
      best = o.debut;
    }
  }
  return best;
}


  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  // ---- Actions UI ----
  onImgError(ev: Event): void {
    const img = ev.target as HTMLImageElement | null;
    if (img) img.src = '/assets/Concert.jpg';
  }

  addKeyword(): void {
    const k = this.keywordInput.trim();
    if (!k) return;
    if (!this.keywords.includes(k)) this.keywords.push(k);
    this.keywordInput = '';
    this.resetAndSearch();
  }
  removeKeyword(k: string): void {
    this.keywords = this.keywords.filter(x => x !== k);
    this.resetAndSearch();
  }
  toggleAccessible(code: string): void {
    if (this.accessible.includes(code)) {
      this.accessible = this.accessible.filter(c => c !== code);
    } else {
      this.accessible = [...this.accessible, code];
    }
    this.resetAndSearch();
  }

  resetAndSearch(): void { this.page = 1; this.load(); }
  nextPage(): void { this.page++; this.load(); }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }

  clearFilters(): void {
    this.q = ''; this.city = ''; this.date_from = ''; this.date_to = '';
    this.online = 'all'; this.age_min_lte = null; this.age_max_gte = null;
    this.keywords = []; this.keywordInput = '';
    this.accessible = [];
    this.resetAndSearch();
  }

  // ---- Chargement principal ----
  private load(): void {
    this.loading = true;

    const hasFilters =
      !!this.q.trim() ||
      !!this.city.trim() ||
      !!this.date_from ||
      !!this.date_to ||
      this.online !== 'all' ||
      this.age_min_lte !== null ||
      this.age_max_gte !== null ||
      this.keywords.length > 0 ||
      this.accessible.length > 0;

    if (hasFilters) this.loadWithFilters();
    else this.loadDefault();
  }

  /** Cas avec filtres => /evenements (page/per_page + filtres) */
  private loadWithFilters(): void {
    const url = `${this.API_BASE}/evenements`;
    let params = new HttpParams()
      .set('page', String(this.page))
      .set('per_page', String(this.per_page))
      .set('future_only', 'true')
      .set('order', 'date_asc');

    if (this.q.trim()) params = params.set('q', this.q.trim());
    if (this.city.trim()) params = params.set('city', this.city.trim());
    if (this.date_from) params = params.set('date_from', this.date_from);
    if (this.date_to) params = params.set('date_to', this.date_to);

    // online
    if (this.online === 'yes') params = params.set('online', 'true');
    if (this.online === 'no')  params = params.set('online', 'false');

    // âge
    if (this.age_min_lte !== null) params = params.set('age_min_lte', String(this.age_min_lte));
    if (this.age_max_gte !== null) params = params.set('age_max_gte', String(this.age_max_gte));

    // keywords
    this.keywords.forEach(k => params = params.append('keyword', k));

    // accessibilité
    this.accessible.forEach(code => params = params.append('accessible', code));

    this.http.get<any[]>(url, { params }).subscribe({
      next: d => this.handle(d),
      error: e => this.err(e),
    });
  }

  /** Cas sans filtres => reco si connecté+token, sinon home (limit/offset) */
  private loadDefault(): void {
    const token = this.auth.getToken?.() || null;
    const useReco = this.isLoggedIn && !!token;

    const url = useReco
      ? `${this.API_BASE}/evenements/reco`
      : `${this.API_BASE}/evenements/home`;

    const params = new HttpParams()
      .set('limit', String(this.per_page))
      .set('offset', String((this.page - 1) * this.per_page));

    const options: { params: HttpParams; headers?: HttpHeaders; observe: 'body' } = {
      params, observe: 'body',
    };
    if (useReco) options.headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>(url, options).subscribe({
      next: d => this.handle(d),
      error: e => {
        if (useReco && (e.status === 401 || e.status === 403)) {
          this.http.get<any[]>(`${this.API_BASE}/evenements/home`, { params, observe: 'body' as const })
            .subscribe({ next: d2 => this.handle(d2), error: ee => this.err(ee) });
        } else {
          this.err(e);
        }
      },
    });
  }

  // ---- Reco contextuelle (météo + proximité) ----
  private fetchContextReco(lat: number, lon: number): void {
    const token = this.auth.getToken?.() || null;
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    this.loading = true;
    this.http.get<any[]>(`${this.API_BASE}/evenements/reco/context`, {
      params: new HttpParams()
        .set('lat', String(lat))
        .set('lon', String(lon))
        .set('limit', String(this.per_page)),
      headers,
      observe: 'body'
    }).subscribe({
      next: d => this.handle(d),
      error: e => {
        // non connecté → fallback: événements à Paris
        if (e.status === 401 || e.status === 403) {
          const params = new HttpParams()
            .set('future_only', 'true')
            .set('order', 'date_asc')
            .set('limit', String(this.per_page))
            .set('city', 'Paris');
          this.http.get<any[]>(`${this.API_BASE}/evenements`, { params, observe: 'body' as const })
            .subscribe({ next: d2 => this.handle(d2), error: ee => this.err(ee) });
        } else {
          this.err(e);
        }
      }
    });
  }

  private handle(data: any[] | null): void {
    this.events = (data || []).map((e) => ({
      id: e.id,
      title: e.titre,
      description: e.description,
      image_url: e.image_url
        ? `https://img.openagenda.com/u/500x0/main/${e.image_url}`
        : '/assets/Concert.jpg',
      lieu: e.lieu,
      commune: e.commune,
      // ⬇️ avant: e.occurrences[0].debut
      date: this.nextStart(e.occurrences),   // prochaine occurrence à venir
      keywords: e.keywords || [],
      latitude: e.latitude,
      longitude: e.longitude,
    }));
    this.loading = false;
  }


  private err(e: any): void {
    console.error('API error', e);
    this.events = [];
    this.loading = false;
  }

  // ---- Boutons "Autour de moi / Paris" ----
  useMyLocation(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => this.fetchContextReco(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn('Geoloc refusée', err)
    );
  }
  usePresetLocation(): void {
    this.fetchContextReco(48.8566, 2.3522); // Paris
  }
}
