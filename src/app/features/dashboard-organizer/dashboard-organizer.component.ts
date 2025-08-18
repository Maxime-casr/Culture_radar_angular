// src/app/features/dashboard-organizer/dashboard-organizer.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizerService, OrganizerEventPayload } from '../../shared/organizer.service';

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-organizer.component.html',
  styleUrls: ['./dashboard-organizer.component.css'],
})
export class OrganizerDashboardComponent implements OnInit {
  events: any[] = [];
  loading = false;
  error = '';

  newEvent: OrganizerEventPayload = {
    titre: '',
    description: '',
    type: '',
    lieu: '',
    commune: '',
    startDate: '',  // ← obligatoire
    startTime: '',  // ← optionnel
    endDate: '',    // ← optionnel
    endTime: '',    // ← optionnel
    allDay: false,
  };

  constructor(private organizer: OrganizerService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.organizer.getMyEvents().subscribe({
      next: data => { this.events = data; this.loading = false; },
      error: () => { this.error = 'Erreur lors du chargement'; this.loading = false; },
    });
  }

  createEvent(): void {
    if (!this.newEvent.titre || !this.newEvent.type || !this.newEvent.startDate) return;

    this.organizer.createEvent(this.newEvent).subscribe({
      next: ev => {
        this.events.unshift(ev);
        this.newEvent = {
          titre: '', description: '', type: '', lieu: '', commune: '',
          startDate: '', startTime: '', endDate: '', endTime: '', allDay: false
        };
      },
      error: () => this.error = 'Erreur lors de la création',
    });
  }

  deleteEvent(id: number): void {
    if (!confirm('Supprimer cet événement ?')) return;
    this.organizer.deleteEvent(id).subscribe({
      next: () => this.events = this.events.filter(e => e.id !== id),
      error: () => this.error = 'Erreur lors de la suppression',
    });
  }

  /** Petite aide pour afficher la prochaine occurrence */
  nextOccurrence(ev: any): string | null {
    const occs = (ev.occurrences || []).filter((o: any) => new Date(o.debut) >= new Date());
    if (!occs.length) return null;
    const next = occs.sort((a:any,b:any)=>+new Date(a.debut)-+new Date(b.debut))[0];
    return next.debut;
  }
}


