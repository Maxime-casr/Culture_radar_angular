import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../shared/admin.service';

@Component({
  standalone: true,
  selector: 'app-dashboard-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit {
  // Overview
  loading = true; error = '';
  ov: any = null; series: any = null; top: any = null; quality: any = null;

  // Tabs
  tab: 'overview' | 'users' | 'events' = 'overview';

  // Users
  uLoading = false; uError = ''; uQ = ''; uPage = 1; uPer = 20; users: any[] = [];

  // Events
  eLoading = false; eError = ''; eQ = ''; ePage = 1; ePer = 20; events: any[] = [];

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    Promise.all([
      this.admin.overview().toPromise(),
      this.admin.series(30).toPromise(),
      this.admin.top().toPromise(),
      this.admin.quality().toPromise(),
    ]).then(([ov, s, t, q]) => {
      this.ov = ov; this.series = s; this.top = t; this.quality = q; this.loading = false;
    }).catch(() => { this.error = 'Impossible de charger le dashboard.'; this.loading = false; });
  }

  // Tabs
  setTab(t: 'overview' | 'users' | 'events') {
    this.tab = t;
    if (t === 'users' && !this.users.length) this.loadUsers();
    if (t === 'events' && !this.events.length) this.loadEvents();
  }

  // Helpers
  pct(v:number){ return (v ?? 0).toFixed(1) + '%'; }
  barW(n:number, max:number){ const w = max ? Math.round((n/max)*100) : 0; return {width: w + '%'}; }

  // Users
  loadUsers() {
    this.uLoading = true; this.uError = '';
    this.admin.users(this.uPage, this.uPer, this.uQ).subscribe({
      next: (rows) => { this.users = rows || []; this.uLoading = false; },
      error: () => { this.uError = 'Chargement utilisateurs impossible'; this.uLoading = false; }
    });
  }
  uSearch() { this.uPage = 1; this.loadUsers(); }
  uPrev(){ if (this.uPage>1){ this.uPage--; this.loadUsers(); } }
  uNext(){ this.uPage++; this.loadUsers(); }
  deleteUser(id:number) {
    if (!confirm('Supprimer cet utilisateur ? Cette action est définitive.')) return;
    this.admin.deleteUser(id).subscribe({
      next: () => this.users = this.users.filter(u => u.id !== id),
      error: () => alert('Suppression impossible')
    });
  }

  // Events
  loadEvents() {
    this.eLoading = true; this.eError = '';
    this.admin.events(this.ePage, this.ePer, this.eQ).subscribe({
      next: (rows) => { this.events = rows || []; this.eLoading = false; },
      error: () => { this.eError = 'Chargement événements impossible'; this.eLoading = false; }
    });
  }
  eSearch() { this.ePage = 1; this.loadEvents(); }
  ePrev(){ if (this.ePage>1){ this.ePage--; this.loadEvents(); } }
  eNext(){ this.ePage++; this.loadEvents(); }
  deleteEvent(id:number) {
    if (!confirm('Supprimer cet événement ?')) return;
    this.admin.deleteEvent(id).subscribe({
      next: () => this.events = this.events.filter(e => e.id !== id),
      error: () => alert('Suppression impossible')
    });
  }
}

