import { Component } from '@angular/core';
import { PageNav } from '../../shared/page-nav';

@Component({
  selector: 'gc-trash-page',
  imports: [PageNav],
  template: `
    <gc-page-nav current="trash" />
    <p class="help-text">
      The trash functionality is coming soon in the next version of the Glaze Calc app.
      Until then, use the delete / remove with care: once it is gone the info is lost.
    </p>
  `
})
export class TrashPage {}
