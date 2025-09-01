// src/app/shared/footer/footer.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,                      // 👈 indispensable si tu n’as pas de NgModule
  imports: [CommonModule, RouterModule], // 👈 apporte routerLink dans le template
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']  // 👈 au pluriel
})
export class FooterComponent {}

