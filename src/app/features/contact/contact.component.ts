import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  // TODO: déporter dans environment.ts si tu préfères
  private readonly API_BASE = 'https://fastapi-cultureradar.onrender.com';

  name = '';
  email = '';
  subject = '';
  message = '';
  website = ''; 

  loading = false;
  ok = false;
  error = '';

  constructor(private http: HttpClient) {}

  submit() {
    if (!this.name.trim() || !this.email.trim() || !this.message.trim()) {
      this.error = 'Merci de remplir les champs requis.'; return;
    }
    this.loading = true; this.error = ''; this.ok = false;

    this.http.post(`${this.API_BASE}/utils/contact`, {
      name: this.name.trim(),
      email: this.email.trim(),
      subject: this.subject.trim() || '(Sans objet)',
      message: this.message.trim(),
      website: this.website // doit être vide
    }).subscribe({
      next: () => { this.loading = false; this.ok = true; this.reset(); },
      error: () => { this.loading = false; this.error = 'Envoi impossible pour le moment.'; }
    });
  }

  private reset() {
    this.name = this.email = this.subject = this.message = this.website = '';
  }
}

