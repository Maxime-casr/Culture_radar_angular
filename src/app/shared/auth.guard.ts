import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service'; // ✅ bon chemin

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject<AuthService>(AuthService); // ✅ typé
  const router = inject(Router);

  if (auth.getToken()) return true; // OK si token

  router.navigate(['/login'], { queryParams: { redirect: state.url } });
  return false;
};
