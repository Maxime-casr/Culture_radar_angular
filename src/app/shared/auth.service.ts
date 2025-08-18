import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));
  public isLoggedIn$ = this.loggedIn.asObservable();

  // Appelé après /login
  // (⚠️ userId est un number côté API)
  // Après un /login réussi :
  login(token: string, user: any) {
    const userWithToken = { ...user, token };

    // ✅ Ajoute ces 2 lignes :
    localStorage.setItem('token', token);
    localStorage.setItem('user_id', String(user.id));

    localStorage.setItem('user', JSON.stringify(userWithToken));
    localStorage.setItem('auth', JSON.stringify({ token, userId: user.id }));

    this.loggedIn.next(true);
  }



  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user'); // tu stockes aussi l'objet user séparément
    localStorage.removeItem('auth'); // au cas où
    this.loggedIn.next(false);
  }

  // 👉 ce qu’il te manque dans la navbar
  getToken(): string | null {
    // priorité au token “plat”
    const t = localStorage.getItem('token');
    if (t) return t;

    // fallback si jamais seul 'auth' existe
    try {
      const raw = localStorage.getItem('auth');
      return raw ? (JSON.parse(raw).token ?? null) : null;
    } catch {
      return null;
    }
  }

  getUserId(): number | null {
    const v = localStorage.getItem('user_id');
    return v ? Number(v) : null;
  }

  getUser(): any | null {
    const token = this.getToken();
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return null;

    try {
      const user = JSON.parse(userStr);
      return user && user.id ? user : null;
    } catch {
      return null;
    }
  }
}
