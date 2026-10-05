import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'gc-root',
  imports: [RouterLink, RouterOutlet],
  template: `
    @if (auth.email(); as email) {
      <header class="header-text">
        Welcome to the Glazecalc App! Hello {{ email }}
        <button type="button" class="btn btn-link p-0 align-baseline" (click)="logout()">logout</button>
        or Go <a routerLink="/home">Home</a>
      </header>
    }
    <main>
      <router-outlet />
    </main>
    <footer>
      MIT License 2023, Aaron Filson, Readme at :
      <a href="https://github.com/AaronFilson/glazecalc/">github</a>.
    </footer>
  `
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.auth.refresh();
  }

  protected logout(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/signin');
  }
}
