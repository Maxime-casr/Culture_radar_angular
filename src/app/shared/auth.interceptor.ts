import { HttpInterceptorFn } from '@angular/common/http';

const API_BASE = 'https://fastapi-cultureradar.onrender.com';
const REL_PREFIXES = ['/evenements', '/utilisateurs', '/me', '/organizer'];

function getToken(): string | null {
  const t = localStorage.getItem('token');
  if (t) return t;
  try { return JSON.parse(localStorage.getItem('auth') || '{}')?.token ?? null; }
  catch { return null; }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const needsAuth =
    req.url.startsWith(API_BASE) ||
    REL_PREFIXES.some(p => req.url.startsWith(p));

  if (!needsAuth) return next(req);

  const token = getToken();
  if (!token) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};







