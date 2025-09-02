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

  // NEW
  owner_id?: number | null;
  ratingAvg?: number | null;
  ratingCount?: number;
};

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css'],
})
export class EventListComponent implements OnInit, OnDestroy {
  // ------- Filtres simples -------
  q = '';
  city = '';
  date_from = '';
  date_to = '';

  // ------- Filtres avancés -------
  showAdvanced = false;

  // Heures de début (0-23) en Europe/Paris côté API
  hour_from: number | null = null;
  hour_to: number | null = null;

  // Tranche d’âge
  age_min_lte: number | null = null;
  age_max_gte: number | null = null;

  // Mots-clés (inclure / exclure)
  keywordInput = '';
  kw_include: string[] = []; // -> kw_any
  kw_exclude: string[] = []; // -> kw_none

  // Distance autour d’un centre
  radius_km: number | null = null;
  lat: number | null = null;
  lon: number | null = null;

  // ------- État -------
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

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  // ---------- Utils ----------
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

  private normalizeKw(s: string): string {
    // supprime accents + minuscule + trim
    return s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  // ---------- Actions UI ----------
  onImgError(ev: Event): void {
    const img = ev.target as HTMLImageElement | null;
    if (img) img.src = '/assets/Concert.jpg';
  }

  addKeyword(mode: 'include' | 'exclude' = 'include'): void {
    const raw = this.keywordInput.trim();
    if (!raw) return;
    const k = this.normalizeKw(raw);
    if (!k) return;

    if (mode === 'include') {
      if (!this.kw_include.includes(k)) this.kw_include.push(k);
    } else {
      if (!this.kw_exclude.includes(k)) this.kw_exclude.push(k);
    }
    this.keywordInput = '';
    this.resetAndSearch();
  }

  removeInclude(k: string): void {
    this.kw_include = this.kw_include.filter((x) => x !== k);
    this.resetAndSearch();
  }
  removeExclude(k: string): void {
    this.kw_exclude = this.kw_exclude.filter((x) => x !== k);
    this.resetAndSearch();
  }

  geocodeCity(): void {
    const city = (this.city || '').trim();
    if (!city) return;
    this.http
      .get<{ lat: number; lon: number }>(`${this.API_BASE}/utils/geocode`, {
        params: new HttpParams().set('q', city),
      })
      .subscribe({
        next: (r) => {
          if (r?.lat != null && r?.lon != null) {
            this.lat = r.lat;
            this.lon = r.lon;
            if (this.radius_km == null) this.radius_km = 50; // défaut
            this.resetAndSearch();
          }
        },
        error: () => {
          // pas grave, on ne bloque pas
        },
      });
  }

  useMyLocation(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.lat = pos.coords.latitude;
        this.lon = pos.coords.longitude;
        if (this.radius_km == null) this.radius_km = 30;
        this.resetAndSearch();
      },
      (err) => console.warn('Geoloc refusée', err)
    );
  }

  usePresetLocation(): void {
    // Paris
    this.lat = 48.8566;
    this.lon = 2.3522;
    if (this.radius_km == null) this.radius_km = 30;
    this.resetAndSearch();
  }

  resetAndSearch(): void {
    this.page = 1;
    this.load();
  }
  nextPage(): void {
    this.page++;
    this.load();
  }
  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }

  clearFilters(): void {
    this.q = '';
    this.city = '';
    this.date_from = '';
    this.date_to = '';

    this.hour_from = null;
    this.hour_to = null;

    this.age_min_lte = null;
    this.age_max_gte = null;

    this.keywordInput = '';
    this.kw_include = [];
    this.kw_exclude = [];

    this.radius_km = null;
    this.lat = null;
    this.lon = null;

    this.resetAndSearch();
  }

  // ---------- Chargement ----------
  private load(): void {
    this.loading = true;

    const hasFilters =
      !!this.q.trim() ||
      !!this.city.trim() ||
      !!this.date_from ||
      !!this.date_to ||
      this.hour_from !== null ||
      this.hour_to !== null ||
      this.age_min_lte !== null ||
      this.age_max_gte !== null ||
      this.kw_include.length > 0 ||
      this.kw_exclude.length > 0 ||
      this.lat !== null ||
      this.lon !== null ||
      this.radius_km !== null;

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

    if (this.hour_from != null) params = params.set('hour_from', String(this.hour_from));
    if (this.hour_to != null) params = params.set('hour_to', String(this.hour_to));

    if (this.lat != null && this.lon != null) {
      params = params.set('lat', String(this.lat)).set('lon', String(this.lon));
      if (this.radius_km != null) params = params.set('radius_km', String(this.radius_km));
    }

    if (this.age_min_lte !== null) params = params.set('age_min_lte', String(this.age_min_lte));
    if (this.age_max_gte !== null) params = params.set('age_max_gte', String(this.age_max_gte));

    this.kw_include.forEach((k) => (params = params.append('kw_any', this.normalizeKw(k))));
    this.kw_exclude.forEach((k) => (params = params.append('kw_none', this.normalizeKw(k))));

    this.http.get<any[]>(url, { params }).subscribe({
      next: (d) => this.handle(d),
      error: (e) => this.err(e),
    });
  }

  /** Cas sans filtres => reco si connecté+token, sinon home (limit/offset) */
  private loadDefault(): void {
    const token = this.auth.getToken?.() || null;
    const useReco = this.isLoggedIn && !!token;

    const url = useReco ? `${this.API_BASE}/evenements/reco` : `${this.API_BASE}/evenements/home`;

    const params = new HttpParams()
      .set('limit', String(this.per_page))
      .set('offset', String((this.page - 1) * this.per_page));

    const options: { params: HttpParams; headers?: HttpHeaders; observe: 'body' } = {
      params,
      observe: 'body',
    };
    if (useReco) options.headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>(url, options).subscribe({
      next: (d) => this.handle(d),
      error: (e) => {
        if (useReco && (e.status === 401 || e.status === 403)) {
          this.http
            .get<any[]>(`${this.API_BASE}/evenements/home`, { params, observe: 'body' as const })
            .subscribe({ next: (d2) => this.handle(d2), error: (ee) => this.err(ee) });
        } else {
          this.err(e);
        }
      },
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
      date: this.nextStart(e.occurrences),
      keywords: e.keywords || [],
      latitude: e.latitude,
      longitude: e.longitude,

      // NEW
      owner_id: e.owner_id ?? null,
      ratingAvg: e.rating_average ?? null,
      ratingCount: e.rating_count ?? 0,
    }));
    this.loading = false;
  }

  /** NEW: étoiles pleines/vides (arrondi à l’entier) */
  public makeStars(avg: number | null | undefined): ('full'|'empty')[] {
    if (avg == null) return Array(5).fill('empty');
    const full = Math.round(avg);
    return Array.from({ length: 5 }, (_, i) => (i < full ? 'full' : 'empty'));
  }

  private err(e: any): void {
    console.error('API error', e);
    this.events = [];
    this.loading = false;
  }

}
