import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'gc-not-found-page',
  imports: [RouterLink],
  template: `
    <div class="help-text">
      <h1>Page Not Found.</h1>
      Go to <a routerLink="/home" class="btn btn-light border">home</a>
      or <a routerLink="/signin" class="btn btn-light border">sign in</a>.
    </div>
  `
})
export class NotFoundPage {}
