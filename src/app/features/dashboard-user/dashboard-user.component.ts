import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ParticipationsService, Participation } from '../../shared/participations.service';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../shared/auth.service';

type DayCell = {
  date: Date;
  ymd: string;                // 'YYYY-MM-DD'
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  events: Participation[];
};

@Component({
  selector: 'app-dashboard-user',
  standalone: true,
  imports: [CommonModule, RouterLink, HttpClientModule],
  templateUrl: './dashboard-user.component.html',
  styleUrls: ['./dashboard-user.component.css'],
})
export class DashboardUserComponent implements OnInit {
  // état calendrier
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth(); // 0..11
  monthLabel = '';
  days: DayCell[] = [];
  selectedYmd: string | null = null;

  // données
  loading = true;
  mapByYmd = new Map<string, Participation[]>();

  // liste du jour sélectionné
  get selectedEvents(): Participation[] {
    return this.selectedYmd ? (this.mapByYmd.get(this.selectedYmd) || []) : [];
  }

  // --- Rating state ---
  ratingOpen = false;
  ratingTarget: Participation | null = null;
  ratingValue: number | null = null;   // 1..5 choisi par l'utilisateur
  ratingAvg: number | null = null;     // moyenne actuelle
  ratingCount: number | null = null;
  ratingLoading = false;
  ratingSaving = false;

  private readonly API_BASE = 'https://fastapi-cultureradar.onrender.com';

  constructor(
    private parts: ParticipationsService,
    private http: HttpClient,
    private auth: AuthService,                 // +
  ) {}
  private getAuthHeaders(): HttpHeaders | null {
    const token = this.auth.getToken?.();
    return token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : null;
  }

  ngOnInit(): void {
    // charge toutes les participations (futures + passées) puis construit le calendrier
    forkJoin([this.parts.getMine(true), this.parts.getMine(false)]).subscribe({
      next: ([future, past]) => {
        const all = [...future, ...past];
        this.mapByYmd = this.groupByYmd(all);
        this.buildCalendar(this.viewYear, this.viewMonth);
        this.loading = false;
      },
      error: () => {
        this.mapByYmd = new Map();
        this.buildCalendar(this.viewYear, this.viewMonth);
        this.loading = false;
      },
    });
  }

  // ---- actions calendrier ----
  prevMonth(): void {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else { this.viewMonth--; }
    this.buildCalendar(this.viewYear, this.viewMonth);
  }

  nextMonth(): void {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else { this.viewMonth++; }
    this.buildCalendar(this.viewYear, this.viewMonth);
  }

  selectDay(d: DayCell): void {
    this.selectedYmd = d.ymd;
  }

  cancel(p: Participation): void {
    this.parts.cancel(p.id).subscribe({
      next: () => {
        // retire de la map et de la sélection courante
        const ymd = this.dateToYmd(new Date(p.occurrence_debut || ''));
        const list = this.mapByYmd.get(ymd) || [];
        this.mapByYmd.set(ymd, list.filter(x => x.id !== p.id));
        this.days = this.days.map(day =>
          day.ymd === ymd
            ? { ...day, events: (day.events || []).filter(x => x.id !== p.id) }
            : day
        );
      },
    });
  }

  // ---- helpers ----
  private groupByYmd(list: Participation[]): Map<string, Participation[]> {
    const m = new Map<string, Participation[]>();
    for (const p of list) {
      const d = new Date(p.occurrence_debut || '');
      const ymd = this.dateToYmd(d);
      if (!m.has(ymd)) m.set(ymd, []);
      m.get(ymd)!.push(p);
    }
    return m;
  }

  private dateToYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private buildCalendar(year: number, month: number): void {
    // libellé FR
    this.monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
      .format(new Date(year, month, 1));

    // début de grille (lundi comme premier jour)
    const first = new Date(year, month, 1);
    const shift = (first.getDay() + 6) % 7; // 0=lundi ... 6=dim
    const start = new Date(year, month, 1 - shift);

    const todayYmd = this.dateToYmd(new Date());
    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) { // 6 semaines x 7 colonnes
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const ymd = this.dateToYmd(d);
      const isCurrentMonth = d.getMonth() === month;
      const isPast = ymd < todayYmd;
      const isToday = ymd === todayYmd;
      const events = this.mapByYmd.get(ymd) || [];
      cells.push({ date: d, ymd, isCurrentMonth, isPast, isToday, events });
    }
    this.days = cells;

    // sélection par défaut : aujourd'hui si visible sinon 1er jour du mois avec évènements, sinon 1er du mois
    const todayCell = this.days.find(c => c.isToday && c.isCurrentMonth);
    const firstWithEvents = this.days.find(c => c.isCurrentMonth && c.events.length > 0);
    if (todayCell) this.selectedYmd = todayCell.ymd;
    else if (firstWithEvents) this.selectedYmd = firstWithEvents.ymd;
    else this.selectedYmd = this.dateToYmd(new Date(year, month, 1));
  }

  isFuture(p: Participation): boolean {
    return new Date(p.occurrence_debut || '').getTime() >= Date.now();
  }

  // ---------- VOTE ----------
  openRating(p: Participation): void {
    this.ratingTarget = p;
    this.ratingOpen = true;
    this.ratingValue = null;
    this.ratingAvg = null;
    this.ratingCount = null;
    this.ratingLoading = false;
    this.ratingSaving = false;

    this.fetchRatings(p.evenement_id);
  }

  closeRating(): void {
    this.ratingOpen = false;
    this.ratingTarget = null;
    this.ratingValue = null;
    this.ratingAvg = null;
    this.ratingCount = null;
    this.ratingLoading = false;
    this.ratingSaving = false;
  }

  private fetchRatings(eventId: number): void {
    this.ratingLoading = true;

    // moyenne: publique
    this.http
      .get<{ average: number | null; count: number }>(`${this.API_BASE}/evenements/${eventId}/ratings/avg`)
      .subscribe({ next: a => { this.ratingAvg = a?.average ?? null; this.ratingCount = a?.count ?? 0; } });

    // ma note: nécessite auth
    const headers = this.getAuthHeaders();
    if (!headers) {
      // pas connecté → on laisse ratingValue à null
      this.ratingLoading = false;
      return;
    }

    this.http
      .get<{ rating: number }>(`${this.API_BASE}/evenements/${eventId}/ratings/me`, { headers })
      .subscribe({
        next: m => { if (typeof m?.rating === 'number') this.ratingValue = m.rating; },
        error: err => {
          // 404 = pas de note → normal ; 401 = session expirée
          if (err?.status === 401) alert('Session expirée. Connecte-toi pour voir/ajouter ta note.');
        },
        complete: () => { this.ratingLoading = false; }
      });
  }

}
