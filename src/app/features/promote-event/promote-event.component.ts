import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../shared/auth.service';

@Component({
  selector: 'app-promote-event',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './promote-event.component.html',
  styleUrls: ['./promote-event.component.css'],
})
export class PromoteEventComponent implements OnInit {
  private readonly API_BASE = 'https://fastapi-cultureradar.onrender.com';
  eventId!: number;
  loading = false;
  done = false;
  error = '';

  constructor(private route: ActivatedRoute, private router: Router,
              private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void { this.eventId = Number(this.route.snapshot.paramMap.get('id')); }

  activateBoost30(): void {
    const token = this.auth.getToken?.();
    if (!token) { this.router.navigate(['/login'], { queryParams:{ returnUrl: this.router.url }}); return; }
    this.loading = true; this.error = '';

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.post(`${this.API_BASE}/evenements/${this.eventId}/promote/boost30`, {}, { headers })
      .subscribe({
        next: () => { this.loading = false; this.done = true; },
        error: () => { this.loading = false; this.error = 'Impossible d’activer la mise en avant.'; }
      });
  }
}
