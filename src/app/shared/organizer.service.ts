// src/app/shared/organizer.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'https://fastapi-cultureradar.onrender.com';

export interface OrganizerEventPayload {
  titre: string;
  description?: string;

  longdescription?: string;   
  conditions?: string;       

  image_url?: string;  
  image_file?: File | null; 

  keywords?: string[]; 
  age_min?: number | null;
  age_max?: number | null;

  // Adresse
  adresse?: string | null;
  code_postal?: string | null;
  commune?: string | null;
  pays?: string | null;

  latitude?: number | null;  
  longitude?: number | null;

  // Occurrences multiples
  occurrences: Array<{
    debut: string;   
    fin?: string | null;
    all_day?: boolean;
  }>;
}


@Injectable({ providedIn: 'root' })
export class OrganizerService {
  constructor(private http: HttpClient) {}

  
  getMyEvents(): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE}/organizer/events`);
  }

  createEvent(ev: OrganizerEventPayload): Observable<any> {
    const body = {
      titre: ev.titre,
      description: ev.description ?? '',
      longdescription: ev.longdescription ?? '', 
      conditions: ev.conditions ?? null, 
      image_url: ev.image_url || null,
      keywords: ev.keywords || [],
      age_min: ev.age_min ?? null,
      age_max: ev.age_max ?? null,

      adresse: ev.adresse ?? null,
      code_postal: ev.code_postal ?? null,
      commune: ev.commune ?? null,
      pays: ev.pays ?? null,

      latitude: ev.latitude ?? null,
      longitude: ev.longitude ?? null,

      occurrences: ev.occurrences?.length ? ev.occurrences : []
    };
    return this.http.post<any>(`${API_BASE}/organizer/events`, body);
  }


  
  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/organizer/events/${id}`);
  }

 
  private toISO(d: string, t?: string): string {
    
    const hhmm = t && t.trim().length ? t : '00:00';
    
    return new Date(`${d}T${hhmm}:00Z`).toISOString();
  }
}


