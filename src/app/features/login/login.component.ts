import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../shared/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  user = { email: '', password: '' };
  emailError = false;
  passwordError = false;
  serverError = '';

  private API_BASE = 'https://fastapi-cultureradar.onrender.com';

  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

  onSubmit(): void {
    this.emailError = false;
    this.passwordError = false;
    this.serverError = '';

    this.http.post<any>(`${this.API_BASE}/login`, {
      email: this.user.email,
      mot_de_passe: this.user.password
    }).subscribe({
      next: (response) => {
        // stocker token + user + userId
        localStorage.setItem('user', JSON.stringify(response.user));
        this.authService.login(response.access_token, response.user.id);

        // 👉 redirection simple: home
        this.router.navigate(['/']);
      },
      error: (err) => {
      if (err.status === 401) {
        this.passwordError = true;
      } else if (err.status === 403 && err.error?.detail === 'Email non vérifié') {
        this.serverError = 'Ton e-mail n’est pas vérifié. Clique sur le lien reçu par e-mail.';
      } else {
        this.serverError = 'Erreur serveur. Veuillez réessayer plus tard.';
      }
    }
    });
  }


}


