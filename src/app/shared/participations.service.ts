// src/app/shared/participations.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

const API_BASE = 'https://fastapi-cultureradar.onrender.com'; // idéalement: centraliser dans app.config.ts

export interface Participation {
  id: number;
  status: 'going' | 'cancelled';
  created_at: string;
  updated_at: string;

  occurrence_id: number;
  occurrence_debut?: string;
  occurrence_fin?: string;
  occurrence_all_day?: boolean;

  evenement_id: number;
  evenement_titre?: string;
  evenement_type?: string;
  evenement_commune?: string;
  evenement_lieu?: string;
  image_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ParticipationsService {
  constructor(private http: HttpClient) {}

  /** Liste des participations de l'utilisateur (futures/passees) */
  getMine(future = true): Observable<Participation[]> {
    return this.http.get<Participation[]>(`${API_BASE}/me/participations?future=${future}`);
  }

  /** Participe à un créneau (occurrence) => renvoie la participation créée/mise à jour */
  join(occurrenceId: number): Observable<Participation> {
    return this.http.post<Participation>(`${API_BASE}/me/participations`, { occurrence_id: occurrenceId });
  }

  /** Annule une participation */
  cancel(participationId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/me/participations/${participationId}`);
  }

  /** Map utile pour savoir rapidement si une occurrence est déjà "going" */
  getMyOccurrenceMap(): Observable<Map<number, number>> {
    return this.getMine(true).pipe(
      map(list => new Map(list.map(p => [p.occurrence_id, p.id])))
    );
    // => Map<occurrence_id, participation_id>
  }
}
