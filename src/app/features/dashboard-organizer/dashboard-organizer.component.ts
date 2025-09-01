// src/app/features/dashboard-organizer/dashboard-organizer.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { OrganizerService } from '../../shared/organizer.service';
import { forkJoin } from 'rxjs';

type RatingAverage = { average: number | null; count: number };

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-organizer.component.html',
  styleUrls: ['./dashboard-organizer.component.css'],
})
export class OrganizerDashboardComponent implements OnInit {
  private readonly API_BASE = 'https://fastapi-cultureradar.onrender.com';

  loading = false;
  error = '';
  events: any[] = [];
  avgById = new Map<number, RatingAverage>();

  constructor(
    private organizer: OrganizerService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void { this.loadEvents(); }

  loadEvents(): void {
    this.loading = true;
    this.organizer.getMyEvents().subscribe({
      next: (rows) => {
        this.events = (rows || []).map((e: any) => ({
          ...e,
          // normalisation éventuelle d'image OpenAgenda
          image_url: e?.image_url
            ? (e.image_url.includes('://')
                ? e.image_url
                : `https://img.openagenda.com/u/600x0/main/${e.image_url}`)
            : null,
        }));
        this.loading = false;

        // Charger les moyennes en parallèle (1 requête / event)
        const calls = this.events.map(ev =>
          this.http.get<RatingAverage>(`${this.API_BASE}/evenements/${ev.id}/ratings/avg`)
        );
        if (calls.length) {
          forkJoin(calls).subscribe({
            next: (arr) => arr.forEach((avg, i) => this.avgById.set(this.events[i].id, avg)),
            error: () => {} // pas bloquant
          });
        }
      },
      error: () => { this.error = 'Erreur lors du chargement'; this.loading = false; }
    });
  }

  nextOccurrence(ev: any): string | null {
    const occs = (ev.occurrences || []).filter((o: any) => new Date(o.debut) >= new Date());
    if (!occs.length) return null;
    const next = occs.sort((a: any, b: any) => +new Date(a.debut) - +new Date(b.debut))[0];
    return next.debut;
  }

  onImgError(ev: Event) {
    const img = ev.target as HTMLImageElement | null;
    if (img) img.src = '/assets/Concert.jpg';
  }

  stars(avg: number | null): string {
    if (avg === null) return '☆☆☆☆☆';
    const n = Math.round(avg);
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(n);
  }

  view(evId: number) { this.router.navigate(['/event', evId]); }

  deleteEvent(id: number): void {
    if (!confirm('Supprimer cet événement ?')) return;
    this.organizer.deleteEvent(id).subscribe({
      next: () => this.events = this.events.filter(e => e.id !== id),
      error: () => this.error = 'Erreur lors de la suppression',
    });
  }
}



