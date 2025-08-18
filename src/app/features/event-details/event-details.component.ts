import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../shared/auth.service';

type Occ = { id: number; debut: string; fin?: string | null; all_day?: boolean };
type Ev = {
  id: number;
  titre: string;
  description?: string | null;
  longdescription?: string | null;
  image_url?: string | null;
  lieu?: string | null;
  commune?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  pays?: string | null;
  prix?: number | null;
  conditions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  keywords?: string[] | null;
  occurrences: Occ[];
};

// Leaflet chargé par CDN
declare const L: any;

/** === NEW: groupe mensuel === */
type MonthGroup = { key: string; label: string; items: Occ[] };

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './event-details.component.html',
  styleUrls: ['./event-details.component.css'],
})
export class EventDetailsComponent implements OnInit, OnDestroy {
  private readonly API_BASE = 'https://fastapi-cultureradar.onrender.com';

  loading = true;
  event: Ev | null = null;

  /** état auth */
  isLoggedIn = false;

  /** sélection et mapping occurrence -> participationId */
  selectedOccIds = new Set<number>();
  partByOcc = new Map<number, number>();     // occId -> participationId
  pendingOccIds = new Set<number>();         // occ en requête

  /** carte / trajet */
  map: any;
  eventMarker: any;
  userMarker: any;
  routeLine: any;

  userLoc: { lat: number; lon: number } | null = null;
  distanceKm: number | null = null;
  travelMode: 'walk' | 'bike' | 'car' = 'walk';
  estimatedMinutes: number | null = null;

  /** === NEW: occurrences groupées par mois === */
  monthGroups: MonthGroup[] = [];
  currentMonthIdx = 0;

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private auth: AuthService
  ) {}

  

  ngOnInit(): void {
    // état login
    this.isLoggedIn = !!(this.auth.getToken?.() || this.auth.getUser?.());
    const s = (this.auth as any).isLoggedIn$?.subscribe?.((v: boolean) => {
      this.isLoggedIn = v;
      if (!v) {
        this.selectedOccIds.clear();
        this.partByOcc.clear();
      } else if (this.event) {
        this.loadMyParticipationsForEvent(this.event.id);
      }
    });
    if (s) this.subs.push(s);

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/']); return; }
    this.fetchEvent(id);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    try { this.map?.remove(); } catch {}
  }

  // -------------------- DATA --------------------
  private fetchEvent(id: number): void {
    this.loading = true;
    this.http.get<Ev>(`${this.API_BASE}/evenements/${id}`).subscribe({
      next: (ev) => {
        if (ev?.image_url) ev.image_url = `https://img.openagenda.com/u/1200x0/main/${ev.image_url}`;
        ev.occurrences = (ev.occurrences || [])
          .slice()
          .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
        this.event = ev;

        /** === NEW: construire les groupes mensuels === */
        this.buildMonthGroups(ev.occurrences);
        this.setInitialMonthIndex();

        this.loading = false;

        // pré-cocher les créneaux déjà dans l’agenda
        if (this.isLoggedIn) this.loadMyParticipationsForEvent(ev.id);

        // init carte si coords
        if (ev.latitude && ev.longitude) setTimeout(() => this.initMap(ev.latitude!, ev.longitude!), 0);
      },
      error: () => { this.loading = false; this.router.navigate(['/']); }
    });
  }

  private loadMyParticipationsForEvent(eventId: number): void {
  const token = this.auth.getToken?.();
  if (!token) return;

  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  const params = new HttpParams().set('future', 'true'); // on ne pré-coche que les créneaux à venir

  this.http.get<any[]>(`${this.API_BASE}/me/participations`, { headers, params })
    .subscribe({
      next: rows => {
        // reset
        this.selectedOccIds.clear();
        this.partByOcc.clear();

        (rows || []).forEach(r => {
          if (r?.evenement_id === eventId && r?.status === 'going') {
            this.selectedOccIds.add(r.occurrence_id); // pour [checked]
            this.partByOcc.set(r.occurrence_id, r.id); // pour DELETE
          }
        });
      },
      error: (err) => {
        if (err?.status === 401) {
          // utilisateur non connecté / token expiré -> on laisse la page mais sans pré-cocher
          return;
        }
      }
    });
}


  
  onOccClick(o: Occ, event: Event): void {
  // (optionnel) bloquer les créneaux avant aujourd’hui
  if (this.isBeforeToday(o)) {
    event.preventDefault();
    return;
  }

  const token = this.auth.getToken?.();
  if (!token) {
    event.preventDefault();
    this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
    return;
  }
  if (this.pendingOccIds.has(o.id)) { event.preventDefault(); return; }

  const headers = new HttpHeaders()
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json');

  const wasSelected = this.selectedOccIds.has(o.id);
  this.pendingOccIds.add(o.id);

  if (wasSelected) {
    // ----- DECOCHER -> DELETE
    const pid = this.partByOcc.get(o.id);
    if (!pid) { this.pendingOccIds.delete(o.id); return; }

    this.http.delete(`${this.API_BASE}/me/participations/${pid}`, { headers })
      .subscribe({
        next: () => {
          // maj état local
          this.selectedOccIds.delete(o.id);
          this.partByOcc.delete(o.id);
          this.pendingOccIds.delete(o.id);
          // (facultatif) forcer la case à se décocher immédiatement
          (event.target as HTMLInputElement).checked = false;
        },
        error: (err) => {
          this.pendingOccIds.delete(o.id);
          if (err?.status === 401) {
            alert('Session expirée. Connecte-toi à nouveau.');
            this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
            return;
          }
          // revert UI
          (event.target as HTMLInputElement).checked = true;
          alert('❌ Impossible de retirer ce créneau de votre agenda.');
        }
      });

  } else {
    // ----- COCHER -> POST
    this.http.post<any>(`${this.API_BASE}/me/participations`, { occurrence_id: o.id }, { headers })
      .subscribe({
        next: (p) => {
          this.selectedOccIds.add(o.id);
          if (p?.id) this.partByOcc.set(o.id, p.id); // stocker l'id pour un futur DELETE
          this.pendingOccIds.delete(o.id);
          (event.target as HTMLInputElement).checked = true;
        },
        error: (err) => {
          this.pendingOccIds.delete(o.id);
          if (err?.status === 401) {
            alert('Session expirée. Connecte-toi à nouveau.');
            this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
            return;
          }
          (event.target as HTMLInputElement).checked = false;
          alert('❌ Impossible d’ajouter ce créneau à votre agenda.');
        }
      });
  }
}

isBeforeToday(occ: { debut: string | Date }): boolean {
    const d = new Date(occ.debut);
    const today = new Date();
    // on compare à minuit (heure locale) du jour courant
    today.setHours(0, 0, 0, 0);
    return d < today;
  }
  
  

  isSelected(id: number): boolean { return this.selectedOccIds.has(id); }

  // ------------------- MAP
  useMyLocation(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        this.updateRouteAndStats();
      },
      () => alert('Impossible d’obtenir votre position.')
    );
  }

  onModeChange(mode: 'walk'|'bike'|'car'): void {
    this.travelMode = mode;
    this.updateRouteAndStats();
  }

  private initMap(lat: number, lon: number): void {
    if (typeof L === 'undefined') {
      console.warn('Leaflet non chargé. Ajoute les liens CDN dans index.html.');
      return;
    }
    this.map = L.map('map', { zoomControl: true }).setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    this.eventMarker = L.marker([lat, lon], { icon: defaultIcon })
      .addTo(this.map).bindPopup('Lieu de l’événement');

    if (this.userLoc) this.updateRouteAndStats();
  }

  private updateRouteAndStats(): void {
    if (!this.event?.latitude || !this.event?.longitude || !this.map || !this.userLoc) return;

    const evLat = this.event.latitude!;
    const evLon = this.event.longitude!;
    const { lat: uLat, lon: uLon } = this.userLoc;

    const userIcon = L.divIcon({
      className: 'user-marker',
      html: '<div class="user-dot"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    if (!this.userMarker) {
      this.userMarker = L.marker([uLat, uLon], { icon: userIcon }).addTo(this.map).bindPopup('Vous');
    } else {
      this.userMarker.setLatLng([uLat, uLon]);
    }

    const points = [[uLat, uLon], [evLat, evLon]];
    if (!this.routeLine) {
      this.routeLine = L.polyline(points, { weight: 4, opacity: 0.75 }).addTo(this.map);
    } else {
      this.routeLine.setLatLngs(points);
    }
    this.map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });

    this.distanceKm = this.haversineKm(uLat, uLon, evLat, evLon);
    const speedKmH = this.travelMode === 'walk' ? 5 : this.travelMode === 'bike' ? 15 : 30;
    this.estimatedMinutes = Math.round((this.distanceKm / speedKmH) * 60);
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }
  private toRad(deg: number) { return (deg * Math.PI) / 180; }

  get gmapsLink(): string | null {
    if (!this.event?.latitude || !this.event?.longitude) return null;
    const d = `${this.event.latitude},${this.event.longitude}`;
    if (this.userLoc) {
      const s = `${this.userLoc.lat},${this.userLoc.lon}`;
      return `https://www.google.com/maps/dir/?api=1&origin=${s}&destination=${d}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${d}`;
  }

 
  onImgError(ev: Event) {
    const img = ev.target as HTMLImageElement | null;
    if (img) img.src = '/assets/Concert.jpg';
  }
  formatDesc(text?: string | null): string {
    const base = (text ?? '').trim();
    const safe = base.length ? base : 'Aucune description.';
    return safe.replace(/\n/g, '<br>');
  }
  trackByOcc(_i: number, o: Occ) { return o.id; }


  private buildMonthGroups(occ: Occ[]) {
    const byKey = new Map<string, MonthGroup>();
    for (const o of occ) {
      const d = new Date(o.debut);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!byKey.has(key)) {
        const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        byKey.set(key, { key, label, items: [] });
      }
      byKey.get(key)!.items.push(o);
    }
    this.monthGroups = Array.from(byKey.values()).sort((a,b) => a.key.localeCompare(b.key));
  }

  private setInitialMonthIndex() {
    if (!this.monthGroups.length) { this.currentMonthIdx = 0; return; }
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const idx = this.monthGroups.findIndex(g => g.key >= curKey);
    this.currentMonthIdx = idx >= 0 ? idx : this.monthGroups.length - 1;
  }

  prevMonth(){ if (this.canPrev) this.currentMonthIdx--; }
  nextMonth(){ if (this.canNext) this.currentMonthIdx++; }
  get canPrev(){ return this.currentMonthIdx > 0; }
  get canNext(){ return this.currentMonthIdx < this.monthGroups.length - 1; }
  get currentGroup(): MonthGroup | null {
    return this.monthGroups[this.currentMonthIdx] ?? null;
  }
}

