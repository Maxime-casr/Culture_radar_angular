import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class adminGuard implements CanActivate {
  private API = 'https://fastapi-cultureradar.onrender.com';
  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}
  canActivate(): Observable<boolean> {
    const token = this.auth.getToken?.();
    if (!token) { this.router.navigate(['/login']); return of(false); }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any>(`${this.API}/utilisateurs/me`, { headers }).pipe(
      map(me => {
        if (me?.role === 'admin') return true;
        this.router.navigate(['/']); return false;
      }),
      catchError(() => { this.router.navigate(['/']); return of(false); })
    );
  }
}
