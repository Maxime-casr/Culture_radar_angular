import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpParams, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { AuthService } from '../../shared/auth.service';
import { SearchService } from '../../shared/search.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  events: any[] = [];
  isLoggedIn = false;
  userId: number | null = null;

  searchTerm = '';
  location = '';
  loading = false;

  private subs: Subscription[] = [];

  // TODO: déporter ça dans environment.ts
  private API_BASE = 'https://fastapi-cultureradar.onrender.com';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    public  searchService: SearchService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.isLoggedIn = !!user;
    this.userId = user?.id ?? null;

    this.subs.push(
      this.authService.isLoggedIn$.subscribe(v => {
        this.isLoggedIn = v;
        this.loadEvents();
      })
    );

    this.subs.push(
      this.searchService.searchTerm$.subscribe(term => {
        this.searchTerm = term || '';
        this.loadEvents();
      }),
      this.searchService.location$.subscribe(loc => {
        this.location = loc || '';
        this.loadEvents();
      })
    );

    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get showHero(): boolean {
    return !this.isLoggedIn && this.searchTerm.trim().length === 0;
  }

  get sectionTitle(): string {
    return this.isLoggedIn ? 'Événements sélectionnés pour vous' : 'Événements pour vous';
  }

  private loadEvents(): void {
    this.loading = true;

    const hasFilters =
      this.searchTerm.trim().length > 0 || this.location.trim().length > 0;

    let url: string;
    let params = new HttpParams();

    if (hasFilters) {
      // --- Recherche filtrée ---
      url = `${this.API_BASE}/evenements`;
      params = params
        .set('limit', '20')
        .set('future_only', 'true')
        .set('order', 'date_asc');

      if (this.searchTerm.trim()) params = params.set('q', this.searchTerm.trim());
      if (this.location.trim())   params = params.set('city', this.location.trim());

      this.http.get<any[]>(url, { params }).subscribe({
        next: d => this.handleEvents(d),
        error: e => this.handleError(e),
      });
      return;
    }

    // --- Pas de filtres : reco si connecté+token, sinon home ---
    const token = this.authService.getToken?.() || null;
    const useReco = this.isLoggedIn && !!token;

    url = useReco
      ? `${this.API_BASE}/evenements/reco`
      : `${this.API_BASE}/evenements/home`;

    params = params.set('limit', '20');

    const options: {
      params: HttpParams;
      observe: 'body';
      headers?: HttpHeaders;
    } = { params, observe: 'body' };

    if (useReco) {
      options.headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    this.http.get<any[]>(url, options).subscribe({
      next: d => this.handleEvents(d),
      error: err => {
        if (useReco && (err.status === 401 || err.status === 403)) {
          this.http
            .get<any[]>(`${this.API_BASE}/evenements/home`, { params, observe: 'body' as const })
            .subscribe({
              next: d => this.handleEvents(d),
              error: e2 => this.handleError(e2),
            });
        } else {
          this.handleError(err);
        }
      },
    });
  }

  private handleEvents(data: any[] | null) {
    this.events = (data || []).map(e => {
      const { start, end } = this.computeRangeFromOccurrences(e?.occurrences ?? []);

      return {
        id: e.id,
        title: e.titre,
        description: e.description,
        image_url: e.image_url
          ? `https://img.openagenda.com/u/500x0/main/${e.image_url}`
          : '/assets/Concert.jpg',
        lieu: e.lieu,

        // 👉 plage globale (1ère occurrence -> dernière occurrence)
        rangeStart: start,   // ISO string ou null
        rangeEnd: end,       // ISO string ou null

        commune: e.commune,
      };
    });

    this.loading = false;
  }

  /** 1er début parmi toutes les occurrences + dernière fin (ou dernier début si pas de fin) */
  private computeRangeFromOccurrences(occs: Array<{ debut: string; fin?: string | null }>): { start: string | null; end: string | null } {
    if (!occs?.length) return { start: null, end: null };

    let minStart: Date | null = null;
    let maxEnd: Date | null = null;

    for (const o of occs) {
      const s = new Date(o.debut);
      const e = o.fin ? new Date(o.fin) : new Date(o.debut); // si fin absente, on prend le jour du début

      if (!minStart || s < minStart) minStart = s;
      if (!maxEnd   || e > maxEnd)   maxEnd   = e;
    }

    return {
      start: minStart ? minStart.toISOString() : null,
      end:   maxEnd   ? maxEnd.toISOString()   : null,
    };
  }

  /** Affiche uniquement les jours (jamais l’heure) */
  public formatDateRange(start?: string | null, end?: string | null): string {
    if (!start) return '';
    const d1 = new Date(start);
    if (!end) return this.dateLabel(d1);

    const d2 = new Date(end);

    const sameDay =
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
    if (sameDay) return this.dateLabel(d1);

    const sameMonthYear =
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth();

    if (sameMonthYear) {
      const monthYear = d1.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      return `${d1.getDate()}–${d2.getDate()} ${monthYear}`;
    }

    // mois/années différents
    return `${this.dateLabel(d1)} → ${this.dateLabel(d2)}`;
  }

  private dateLabel(d: Date): string {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }



  private handleError(err: any) {
    console.error('Erreur API', err);
    this.events = [];
    this.loading = false;
  }

  get filteredEvents() {
    if (!this.searchTerm.trim()) return this.events;
    const q = this.searchTerm.toLowerCase();
    return this.events.filter(e => (e.title || '').toLowerCase().includes(q));
  }

  onImgError(target: EventTarget | null) {
    const img = target as HTMLImageElement;
    if (img) img.src = '/assets/Concert.jpg';
  }

  trackByIndex(index: number, _item: unknown): number {
    return index;
  }

  trackById(index: number, item: { id?: number }): number {
    return item?.id ?? index;
  }
}







