// src/app/shared/organizer.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'https://fastapi-cultureradar.onrender.com';

export interface OrganizerEventPayload {
  titre: string;
  description?: string;
  type: string;        // 'concert' | 'exposition' | ...
  lieu?: string;
  commune?: string;
  image_url?: string;

  // champs de saisie (UI) pour créer AU MOINS un créneau
  startDate: string;   // 'YYYY-MM-DD'
  startTime?: string;  // 'HH:mm' optionnel
  endDate?: string;    // 'YYYY-MM-DD' optionnel
  endTime?: string;    // 'HH:mm' optionnel
  allDay?: boolean;    // défaut false
}

@Injectable({ providedIn: 'root' })
export class OrganizerService {
  constructor(private http: HttpClient) {}

  /** Liste des événements de l’organisateur connecté */
  getMyEvents(): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE}/organizer/evenements`);
  }

  /** Créer un événement avec une occurrence (minimale) */
  createEvent(ev: OrganizerEventPayload): Observable<any> {
    const debutISO = this.toISO(ev.startDate, ev.startTime); // ex: '2025-08-20T18:00:00Z'
    const finISO   = (ev.endDate || ev.endTime)
      ? this.toISO(ev.endDate || ev.startDate, ev.endTime)   // fin par défaut = même jour que début
      : null;

    const body = {
      titre: ev.titre,
      description: ev.description ?? '',
      type: ev.type,
      lieu: ev.lieu ?? null,
      commune: ev.commune ?? null,
      image_url: ev.image_url ?? null,
      // 👇 nouveau contrat avec l’API
      occurrences: [
        {
          debut: debutISO,
          fin: finISO,
          all_day: !!ev.allDay
        }
      ]
    };

    return this.http.post<any>(`${API_BASE}/organizer/evenements`, body);
  }

  /** Supprimer un événement (appartient à l’organisateur) */
  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/organizer/evenements/${id}`);
  }

  /** Utilitaire : compose un ISO UTC à partir de date + heure (optionnelle) */
  private toISO(d: string, t?: string): string {
    // si pas d’heure => 00:00
    const hhmm = t && t.trim().length ? t : '00:00';
    // on envoie en UTC pour le backend (simple et robuste)
    return new Date(`${d}T${hhmm}:00Z`).toISOString();
  }
}


