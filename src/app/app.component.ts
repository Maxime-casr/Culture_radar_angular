import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AuthService } from './shared/auth.service';

// Déclare gtag pour TypeScript (fourni par index.html)
declare function gtag(cmd: string, event: string, params?: Record<string, any>): void;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  showNavbar = true;
  isLoggedIn = false;

  constructor(private router: Router, private authService: AuthService) {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        // ta logique existante
        this.showNavbar = (e.urlAfterRedirects || e.url) !== '/';

        // 👉 GA4: page_view à chaque navigation (y compris la première)
        try {
          gtag('event', 'page_view', {
            page_path: e.urlAfterRedirects || e.url
          });
        } catch {}
      });
  }

  ngOnInit(): void {
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
  }

  logout(): void {
    this.authService.logout();
    this.isLoggedIn = false;
    this.router.navigate(['/']);
  }
}



