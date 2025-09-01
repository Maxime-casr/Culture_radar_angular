import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private API = 'https://fastapi-cultureradar.onrender.com';
  constructor(private http: HttpClient, private auth: AuthService) {}
  private headers(): HttpHeaders {
    const t = this.auth.getToken?.();
    return t ? new HttpHeaders().set('Authorization', `Bearer ${t}`) : new HttpHeaders();
  }
  overview(): Observable<any> { return this.http.get(`${this.API}/admin/stats/overview`, { headers: this.headers() }); }
  series(days=30): Observable<any> { 
    const params = new HttpParams().set('days', String(days));
    return this.http.get(`${this.API}/admin/stats/time-series`, { headers: this.headers(), params });
  }
  top(): Observable<any> { return this.http.get(`${this.API}/admin/top/events`, { headers: this.headers() }); }
  quality(): Observable<any> { return this.http.get(`${this.API}/admin/content/quality`, { headers: this.headers() }); }

   // 👇 nouveaux
  users(page=1, per_page=20, q=''): Observable<any[]> {
    let params = new HttpParams().set('page', page).set('per_page', per_page);
    if (q) params = params.set('q', q);
    return this.http.get<any[]>(`${this.API}/admin/users`, { params });
  }
  deleteUser(id: number) { return this.http.delete(`${this.API}/admin/users/${id}`); }

  events(page=1, per_page=20, q=''): Observable<any[]> {
    let params = new HttpParams().set('page', page).set('per_page', per_page);
    if (q) params = params.set('q', q);
    return this.http.get<any[]>(`${this.API}/admin/events`, { params });
  }
  deleteEvent(id: number) { return this.http.delete(`${this.API}/admin/events/${id}`); }
}
