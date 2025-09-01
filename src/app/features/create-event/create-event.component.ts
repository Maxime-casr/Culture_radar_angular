import { Component } from '@angular/core';
import { OrganizerService, OrganizerEventPayload } from '../../shared/organizer.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';   // ⬅️
import { Router } from '@angular/router';                               // ⬅️

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css'],
})
export class CreateEventComponent {
  form: OrganizerEventPayload = {
    titre: '',
    description: '',
    longdescription: '',  
    conditions: '', 
    image_url: '',
    image_file: null,
    keywords: [],
    age_min: null,
    age_max: null,
    adresse: '',
    code_postal: '',
    commune: '',
    pays: '',
    latitude: null,
    longitude: null,
    occurrences: []
  };

  keywordDraft = '';
  imagePreview: string | null = null;

  // Éditeur d’occurrences (liaison datetime-local)
  occEdits: Array<{ all_day: boolean; debutLocal: string; finLocal?: string }> = [];

  submitting = false;
  error = '';

  constructor(private organizer: OrganizerService, private http: HttpClient, private router: Router) {}

  addKeyword() {
    const k = (this.keywordDraft || '').trim();
    if (!k) return;
    if (!this.form.keywords) this.form.keywords = [];
    // dédoublonnage simple (insensible à la casse)
    if (!this.form.keywords.some(x => x.toLowerCase() === k.toLowerCase())) {
      this.form.keywords.push(k);
    }
    this.keywordDraft = '';
  }

  removeKeyword(i: number) {
    this.form.keywords?.splice(i, 1);
  }

  // Fichier image
  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.form.image_file = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = String(reader.result || '');
      reader.readAsDataURL(file);
    } else {
      this.imagePreview = null;
    }
  }

  // Occurrences
  addOcc(){
    const now = new Date();
    const plus2h = new Date(now.getTime()+2*3600*1000);
    const toLocal = (d: Date) => new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    this.occEdits.push({ all_day:false, debutLocal: toLocal(now), finLocal: toLocal(plus2h) });
  }
  removeOcc(i: number){ this.occEdits.splice(i,1); }

  // Convertit datetime-local en ISO UTC
  private toISOFromLocal(local: string | undefined, allDay: boolean): string | null {
    if (!local) return null;
    const d = new Date(local);
    if (allDay) {
      // normalise sur minuit UTC du même jour
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth()+1).padStart(2,'0');
      const dd = String(d.getUTCDate()).padStart(2,'0');
      return `${yyyy}-${mm}-${dd}T00:00:00Z`;
    }
    return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().replace('.000',''); // ISO local→UTC
  }

  async geocode(){
    const q = [this.form.adresse, this.form.code_postal, this.form.commune, this.form.pays]
                .filter(Boolean).join(', ');
    if (!q) return;
    this.http.get<{lat:number; lon:number}>(`/api/utils/geocode`, { params: { q }})
      .subscribe({
        next: r => { this.form.latitude = r.lat; this.form.longitude = r.lon; },
        error: () => alert('Géocodage impossible pour cette adresse.')
      });
  }

  async submit(){
    this.error = '';
    if (!this.form.titre || !this.occEdits.length) { this.error = 'Titre et au moins un créneau requis.'; return; }
    this.submitting = true;

    // 1) éventuellement upload image fichier pour obtenir une URL
    let image_url = this.form.image_url?.trim() || '';
    if (!image_url && this.form.image_file) {
      try {
        const fd = new FormData();
        fd.append('file', this.form.image_file);
        const up: any = await this.http.post(`/api/upload/image`, fd).toPromise();
        image_url = up?.url || '';
      } catch { /* pas bloquant */ }
    }

    // 2) construire occurrences ISO
    const occurrences = this.occEdits.map(o => ({
      all_day: !!o.all_day,
      debut: this.toISOFromLocal(o.debutLocal, !!o.all_day)!,
      fin: o.all_day ? null : this.toISOFromLocal(o.finLocal, false)
    }));

    // 3) payload final
    const payload: OrganizerEventPayload = {
      ...this.form,
      image_url,
      image_file: undefined as any, // on n’envoie pas le file brut
      occurrences,
    };

    this.organizer.createEvent(payload).subscribe({
      next: (ev) => { this.submitting = false; this.router.navigate(['/organizer']); },
      error: () => { this.submitting = false; this.error = 'Erreur lors de la création.'; }
    });
  }
}
