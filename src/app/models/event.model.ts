// src/app/models/event.model.ts
export interface Occurrence {
  id: number;
  debut: string;   // ISO
  fin: string | null;
  all_day: boolean;
}

export interface EventData {
  id: number;
  titre: string;
  description?: string;
  longdescription?: string;
  image_url?: string;
  date?: string;   // <- ancien champ, peut être vide
  type?: string;
  lieu?: string;
  commune?: string;
  occurrences?: Occurrence[];
}


